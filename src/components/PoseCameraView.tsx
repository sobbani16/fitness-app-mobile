import React, { useEffect, useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, AppState } from 'react-native';
import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';
import { isPoseDetectorAvailable } from '../detection/pose/poseDetectorLoader';
import { getRealEngine } from '../detection/realEngine';
import { mapLandmarks } from '../detection/pose/mapLandmarks';
import type { PoseDetectionResultBundle } from 'react-native-mediapipe-posedetection';
interface Props { onError?: (message:string)=>void; facing?:'front'|'back' }
function NativePoseCamera({onError,facing='back'}:Props) {
  // Lazy import prevents a missing native plugin from crashing ordinary screens.
  const {usePoseDetection,RunningMode,Delegate}=require('react-native-mediapipe-posedetection') as typeof import('react-native-mediapipe-posedetection');
  const {hasPermission,requestPermission}=useCameraPermission();
  const device=useCameraDevice(facing);
  const [error,setError]=useState(''),[active,setActive]=useState(AppState.currentState==='active');
  const handleError=useCallback((e:{message:string})=>{setError(e.message);onError?.(e.message);},[onError]);
  const callbacks=useMemo(()=>({onResults:(result:PoseDetectionResultBundle)=>{getRealEngine().noteRawFrame();
    // Bindings differ: landmarks may be NormalizedLandmark[][] (per pose) or a
    // flat NormalizedLandmark[] for pose 0. Accept both.
    const lms=result.results?.[0]?.landmarks;
    const points=Array.isArray(lms?.[0])?lms[0]:(lms as unknown as any[]|undefined);
    if(Array.isArray(points)&&points.length>=29)getRealEngine().pushPoseFrame(mapLandmarks(points));
    else getRealEngine().noteNoPerson();},onError:handleError}),[handleError]);
  const detection=usePoseDetection(callbacks,RunningMode.LIVE_STREAM,'pose_landmarker_lite.task',{numPoses:1,delegate:Delegate.CPU,minPoseDetectionConfidence:0.6,minPosePresenceConfidence:0.6,minTrackingConfidence:0.6,fpsMode:15});
  useEffect(()=>{if(!hasPermission)requestPermission().then(ok=>{if(!ok)setError('Camera permission is required.');}).catch(e=>setError(e.message));},[hasPermission,requestPermission]);
  useEffect(()=>{const sub=AppState.addEventListener('change',s=>setActive(s==='active'));return ()=>sub.remove();},[]);
  useEffect(()=>{if(device)detection.cameraDeviceChangeHandler(device);},[device,detection.cameraDeviceChangeHandler]);
  if(error||!hasPermission||!device)return <View style={styles.message}><Text style={{color:'white'}}>{error||'Preparing camera…'}</Text></View>;
  return <Camera style={StyleSheet.absoluteFill} device={device} isActive={active} frameProcessor={detection.frameProcessor} onLayout={detection.cameraViewLayoutChangeHandler} onOutputOrientationChanged={detection.cameraOrientationChangedHandler} onError={handleError} />;
}
export default function PoseCameraView(props:Props) {
  if(!isPoseDetectorAvailable())return <View style={styles.message}><Text style={{color:'white'}}>Camera coaching is unavailable in this build. You can log sets manually.</Text></View>;
  return <NativePoseCamera {...props} />;
}
const styles=StyleSheet.create({message:{...StyleSheet.absoluteFillObject,backgroundColor:'#000',justifyContent:'center',alignItems:'center',padding:24}});
