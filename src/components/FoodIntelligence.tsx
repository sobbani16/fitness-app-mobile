import React, { useEffect, useRef, useState } from 'react';
import { Linking } from 'react-native';
import { api } from '../api/client';
import { getSession } from '../storage/session';
import { Action, Card, Copy } from '../design/components';
export interface FoodFinding {
 id:string;conditionNames:string[];nutrientName:string|null;action:string;severity:string;status:string;explanation:string;confidence:string;
 actualAmount:{value:string;unit:string;servingGrams:string}|null;
 applicableThreshold:{value:string;unit:string;basis:string}|null;
 evidenceSource:{guidelineTitle:string;sourceUrl:string}|null;labelEvidence?:{evidence:string}|null;
}
export interface FoodIntelligenceResult {
 foodId:string|null;evaluationVersion:string;dataQuality:string;servingSize:{value:number;unit:string}|null;
 nutritionSummary:{code:string;name:string;unit:string;value:string|null;origin:string}[];
 warnings:FoodFinding[];missingData:string[];requiresPersonalization:boolean;conflicts?:{reason:string}[];
}
function Finding({finding:f}:{finding:FoodFinding}) {
 const [expanded,setExpanded]=useState(false),[error,setError]=useState(false);
 return <Card>
  <Copy size="title">{f.severity==='HIGH'?'Review carefully':'Review'}: {f.nutrientName||'Ingredient'}{f.conditionNames.length?` · ${f.conditionNames.join(', ')}`:''}</Copy>
  {f.actualAmount&&<Copy>This portion contains {Number(f.actualAmount.value).toFixed(2)} {f.actualAmount.unit}.</Copy>}
  <Copy>{f.status==='PERSONALIZATION_REQUIRED'?'Your care team’s individual guidance is needed.':f.status==='INSUFFICIENT_DATA'?'There is not enough verified information to apply this guidance.':f.explanation}</Copy>
  <Action secondary label="Why was this flagged?" selected={expanded} onPress={()=>setExpanded(v=>!v)} />
  {expanded&&<>
   <Copy>{f.explanation}</Copy><Copy>Data: {f.confidence.replace(/_/g,' ').toLowerCase()}</Copy>
   {f.labelEvidence&&<Copy selectable>Label evidence: {f.labelEvidence.evidence}</Copy>}
   {f.applicableThreshold&&<Copy>Referenced target: {f.applicableThreshold.value} {f.applicableThreshold.unit} ({f.applicableThreshold.basis.replace(/_/g,' ').toLowerCase()}). A daily target is not a per-meal allowance.</Copy>}
   {f.evidenceSource&&<><Copy selectable>{f.evidenceSource.guidelineTitle}{'\n'}{f.evidenceSource.sourceUrl}</Copy><Action secondary label="View evidence source" onPress={()=>{setError(false);void Linking.openURL(f.evidenceSource!.sourceUrl).catch(()=>setError(true));}} /></>}
   {error&&<Copy>Could not open the source. Its address is selectable above.</Copy>}
  </>}
 </Card>;
}
export default function FoodIntelligence({result}:{result:FoodIntelligenceResult}) {
 const codes=['ENERGY_KCAL','CARBOHYDRATE_TOTAL','SODIUM','SUGAR_ADDED','FAT_SATURATED','FAT_TRANS','FIBER'];
 return <>
  <Copy size="heading" accessibilityRole="header">Your food insights</Copy>
  <Copy>{result.servingSize?`For your ${Number(result.servingSize.value.toFixed(2))} ${result.servingSize.unit} portion`:'Serving quantity needs review'} · {result.dataQuality.replace(/_/g,' ').toLowerCase()}</Copy>
  <Card>{result.nutritionSummary.filter(n=>codes.includes(n.code)).map(n=><Copy key={n.code}>{n.name}: {n.value==null?'Unknown':`${Number(Number(n.value).toFixed(2))} ${n.unit}`}</Copy>)}</Card>
  {result.requiresPersonalization&&<Copy>Personalization required. Review your individual plan with your care team.</Copy>}
  {!!result.conflicts?.length&&<Copy>Some recommendations conflict. Humai has not selected one over another.</Copy>}
  {result.warnings.map(f=><Finding key={f.id} finding={f} />)}
  {result.missingData.map((m,i)=><Copy key={i}>{m}</Copy>)}
  {!result.warnings.length&&<Copy>No approved personalized finding is available. This does not mean the food is suitable for every condition.</Copy>}
  <Copy tone="muted">Educational information, not a diagnosis or treatment plan. Food logging remains available.</Copy>
 </>;
}
type Profile={id:string;preparationType:string;preparationMethod:string|null;source:string};
export function FoodIntelligenceReview({ingredientId,recipeId,grams,onProfile}:{ingredientId?:string;recipeId?:string;grams:number;onProfile:(id:string)=>void}) {
 const [profiles,setProfiles]=useState<Profile[]>([]),[selected,setSelected]=useState<string>(),[result,setResult]=useState<FoodIntelligenceResult|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const generation=useRef(0);
 useEffect(()=>{generation.current++;setResult(null);setBusy(false);setError('');return()=>{generation.current++;};},[ingredientId,recipeId,grams]);
 async function inspect(profileId?:string){
  const request=++generation.current,account=getSession()?.user.id;setBusy(true);setError('');
  const current=()=>request===generation.current&&account===getSession()?.user.id;
  try{
   if(ingredientId&&!profileId){const response=await api.get<{profiles:Profile[]}>(`/food-logs/profiles/${encodeURIComponent(ingredientId)}`);if(!current())return;setProfiles(response.data.profiles);if(response.data.profiles.length){setResult(null);return;}}
   const response=recipeId?await api.get<FoodIntelligenceResult>(`/recipes/${encodeURIComponent(recipeId)}/intelligence`,{params:{grams}}):await api.post<FoodIntelligenceResult>('/food-logs/intelligence',{ingredientId,profileId,grams});
   if(current())setResult(response.data);
  }catch{if(current())setError('Personalized analysis is unavailable. You can still save this meal.');}
  finally{if(current())setBusy(false);}
 }
 if(!ingredientId&&!recipeId)return null;
 return <Card>
  <Copy>Optional: use your saved conditions to review this portion. Analysis stays on Humai’s server and is not sent to AI.</Copy>
  <Action secondary label={busy?'Checking portion…':'Review with my health profile'} disabled={busy||!Number.isFinite(grams)||grams<=0} onPress={()=>void inspect(selected)} />
  {profiles.length>0&&<Copy>Select the preparation that matches your food. This analysis does not replace your edited macro values.</Copy>}
  {profiles.map(p=><Action secondary key={p.id} label={`${p.preparationMethod||p.preparationType} · ${p.source}`} selected={selected===p.id} disabled={busy} onPress={()=>{setSelected(p.id);onProfile(p.id);void inspect(p.id);}} />)}
  {error!==''&&<Copy>{error}</Copy>}{result&&<FoodIntelligence result={result} />}
 </Card>;
}
