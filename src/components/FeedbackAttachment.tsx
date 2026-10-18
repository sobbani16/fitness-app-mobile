import React, { useEffect, useRef, useState } from 'react';
import { Image, View, useWindowDimensions } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { captureRef, releaseCapture } from 'react-native-view-shot';
import { File, Paths } from 'expo-file-system';
import { Action, Copy, Notice } from '../design/components';
function discardPickerCopy(uri?: string) {
  if (uri?.startsWith(`${Paths.cache.uri}ImagePicker/`)) { try { new File(uri).delete(); } catch { /* System cache eviction is the fallback. */ } }
}
export default function FeedbackAttachment({ onChange, disabled }: { onChange: (uri: string | null) => void; disabled: boolean }) {
  const [asset, setAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [masked, setMasked] = useState<number[]>([0, 15]);
  const [preview, setPreview] = useState<string | null>(null), [loaded, setLoaded] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const view = useRef<View>(null), current = useRef<{ source?: string; flattened?: string }>({});
  const active = useRef(true), lock = useRef(false);
  const { width: screenWidth } = useWindowDimensions();
  const width = Math.max(1, Math.min(320, screenWidth - 80, asset ? 520 * asset.width / asset.height : 320)), height = asset ? width * asset.height / asset.width : 0;
  const remove = () => {
    onChange(null);
    if (current.current.flattened) releaseCapture(current.current.flattened);
    const source = current.current.source;
    if (source?.startsWith(`${Paths.cache.uri}ImagePicker/`)) { try { new File(source).delete(); } catch { /* System cache eviction is the fallback. */ } }
    current.current = {}; setAsset(null); setPreview(null); setLoaded(false);
  };
  useEffect(() => { active.current = true; return () => {
    active.current = false;
    if (current.current.flattened) releaseCapture(current.current.flattened);
    const source = current.current.source;
    if (source?.startsWith(`${Paths.cache.uri}ImagePicker/`)) { try { new File(source).delete(); } catch { /* Best effort cache cleanup. */ } }
  }; }, []);
  const choose = async () => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: false, quality: 1, exif: false });
      if (result.canceled) return;
      const picked = result.assets[0];
      if (!active.current) { discardPickerCopy(picked?.uri); return; }
      if (!picked?.width || !picked.height || picked.width * picked.height > 24000000 || (picked.fileSize || 0) > 15000000) { discardPickerCopy(picked?.uri); throw new Error('Choose a screenshot under 15 MB and 24 megapixels.'); }
      remove(); current.current.source = picked.uri; setAsset(picked); setMasked([0, 15]);
    } catch (e: any) { if (active.current) setError(e.message || 'Could not open the photo picker.'); }
    finally { lock.current = false; if (active.current) setBusy(false); }
  };
  const flatten = async () => {
    if (lock.current || !loaded) return;
    lock.current = true; setBusy(true); setError('');
    try {
      const uri = await captureRef(view, { format: 'png', result: 'tmpfile', width: Math.round(width * 2), height: Math.round(height * 2) });
      if (!active.current) { releaseCapture(uri); return; }
      current.current.flattened = uri; setPreview(uri);
    } catch { if (active.current) setError('Could not prepare the redacted image. No attachment was added.'); }
    finally { lock.current = false; if (active.current) setBusy(false); }
  };
  return <View style={{ gap: 12 }}>
    <Copy>Optional screenshot</Copy><Copy tone="muted">Choose an image yourself. No app screen is captured automatically. Hide names, health details and messages before attaching.</Copy>
    {!asset && <Action secondary label="Choose screenshot to redact" disabled={disabled || busy} onPress={() => void choose()} />}
    {asset && !preview && <>
      <View ref={view} collapsable={false} style={{ width, height, backgroundColor: '#fff', alignSelf: 'center' }}>
        <Image source={{ uri: asset.uri }} style={{ width, height }} resizeMode="stretch" onLoad={() => setLoaded(true)} onError={() => { setLoaded(false); setError('Image could not load. Remove it and choose another.'); }} accessibilityLabel="Selected screenshot for redaction" />
        {masked.map(i => <View key={i} pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: height * i / 16, height: height / 16 + 1, backgroundColor: '#000' }} />)}
      </View>
      <Copy tone="muted">Hide horizontal strips from top (1) to bottom (16). Black areas will be permanently flattened into the attachment.</Copy>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{Array.from({ length: 16 }, (_, i) => <Action key={i} secondary selected={masked.includes(i)} label={`${masked.includes(i) ? 'Show' : 'Hide'} strip ${i + 1}`} disabled={disabled || busy} onPress={() => setMasked(v => v.includes(i) ? v.filter(n => n !== i) : [...v, i])} />)}</View>
      <Action label="Preview redacted screenshot" disabled={disabled || busy || !loaded} onPress={() => void flatten()} />
    </>}
    {preview && <><Image source={{ uri: preview }} style={{ width, height, alignSelf: 'center' }} resizeMode="contain" accessibilityLabel="Final redacted attachment preview" />
      <Copy tone="muted">Review the entire preview. Automatic detection of private text is not provided.</Copy>
      <Action secondary label="I reviewed this image; attach it" disabled={disabled || busy} onPress={() => onChange(preview)} />
    </>}
    {asset && <Action secondary label="Remove screenshot" disabled={disabled || busy} onPress={remove} />}
    {!!error && <Notice title="Attachment unavailable" message={error} error />}
  </View>;
}
