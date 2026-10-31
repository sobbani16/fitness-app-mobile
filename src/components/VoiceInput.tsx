import React, { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { Action, Copy, Field, IconAction, ListRow, Sheet } from '../design/components';
import { useTheme } from '../design/theme';
import { executeVoice, interpretVoice, newCommandId, transcribeVoice, undoVoice, VoiceAction, VoiceContext } from '../api/voice';
import { AudioModule, RecordingPresets, setAudioModeAsync, useAudioRecorder, useAudioRecorderState } from 'expo-audio';
import { File } from 'expo-file-system';

const MAX_RECORD_MS = 30_000; // keep clips short — bounded upload size and cost

// Push-to-talk MVP: the OS keyboard microphone does on-device dictation into
// the text field (no mic permission, no audio upload). Parsed actions are
// previewed and confirmed before anything is written.
export default function VoiceInput({ context, onDone, icon = '🎤', label = 'Voice log', open: controlledOpen, onClose }: {
  context?: VoiceContext;
  onDone?: () => void;
  icon?: string; label?: string;
  open?: boolean; onClose?: () => void; // controlled mode: parent owns the trigger
}) {
  const { colors } = useTheme();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const [text, setText] = useState('');
  const [actions, setActions] = useState<VoiceAction[] | null>(null);
  const [commandId, setCommandId] = useState<string | null>(null);
  const [results, setResults] = useState<{ intent: string; status: string; detail?: string; reason?: string }[] | null>(null);
  const [undone, setUndone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const rec = useAudioRecorderState(recorder);
  const cancelled = useRef(false);

  // Auto-stop at the duration cap.
  useEffect(() => {
    if (rec.isRecording && rec.durationMillis >= MAX_RECORD_MS) void stopRecording(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rec.durationMillis]);

  const startRecording = async () => {
    setError('');
    try {
      const perm = await AudioModule.requestRecordingPermissionsAsync();
      if (!perm.granted) { setError('Microphone access is off. Enable it in Settings, or type below.'); return; }
      cancelled.current = false;
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
    } catch { setError('Couldn’t start the microphone. You can still type below.'); }
  };

  const stopRecording = async (cancel: boolean) => {
    cancelled.current = cancel;
    try { await recorder.stop(); } catch { /* not recording */ }
    await setAudioModeAsync({ allowsRecording: false }).catch(() => {});
    const uri = recorder.uri;
    if (cancel || !uri) { if (uri) new File(uri).delete(); return; }
    setBusy(true);
    try {
      const audio = await new File(uri).base64();
      new File(uri).delete(); // clip is uploaded, never kept on device
      const { transcript } = await transcribeVoice(audio);
      setText(transcript);
      if (transcript.trim()) {
        const r = await interpretVoice(transcript, context);
        setActions(r.actions);
      }
    } catch (e: any) { setError(e?.response?.status === 503 ? 'Transcription isn’t configured on the backend — type below.' : describe(e)); }
    finally { setBusy(false); }
  };

  const reset = () => { setText(''); setActions(null); setCommandId(null); setResults(null); setUndone(false); setError(''); };
  const close = () => {
    if (rec.isRecording) void stopRecording(true);
    if (controlledOpen === undefined) setInternalOpen(false); onClose?.(); reset();
  };

  const describe = (e: any) => {
    const s = e?.response?.status;
    if (s === 401) return 'Sign in required to use voice logging.';
    if (s === 404) return 'Voice service not found — update or restart the backend.';
    if (s === 503) return 'Voice service isn’t configured on the backend yet.';
    if (!s) return 'Server unreachable — check that the backend is running.';
    return `Voice request failed (${s}). Try again.`;
  };

  const interpret = async () => {
    setBusy(true); setError('');
    try {
      const r = await interpretVoice(text, context);
      setActions(r.actions);
    } catch (e: any) { setError(describe(e)); }
    finally { setBusy(false); }
  };

  const confirm = async () => {
    if (!actions) return;
    setBusy(true); setError('');
    const id = newCommandId();
    try {
      const r = await executeVoice(id, text, actions);
      setCommandId(id); setResults(r.result); onDone?.();
    } catch { setError('Couldn’t save. Try again.'); }
    finally { setBusy(false); }
  };

  const undo = async () => {
    if (!commandId) return;
    setBusy(true);
    try { await undoVoice(commandId); setUndone(true); onDone?.(); }
    catch { setError('Couldn’t undo — the undo window may have expired.'); }
    finally { setBusy(false); }
  };

  const summary = (a: VoiceAction) => {
    const e = a.entities || {};
    switch (a.intent) {
      case 'LOG_WATER': return `${e.amountMl} ml water${e.estimated ? ' (estimated)' : ''}`;
      case 'LOG_EXERCISE_SET': return `${e.sets ?? 1} set(s) of ${e.exerciseName ?? '?'}${e.reps ? ` × ${e.reps}` : ''}${e.weight != null ? ` @ ${e.weight} ${e.weightUnit}` : ''}`;
      case 'LOG_FOOD': return (e.items || []).map((i: any) => `${i.grams ? `${i.grams}g ` : ''}${i.matchedName || i.name}`).join(', ') + ` → ${e.mealType}`;
      case 'MARK_SUPPLEMENT_TAKEN': return `Mark ${e.name || 'supplement'} taken`;
      case 'START_WORKOUT': return `Start ${e.name || 'workout'}`;
      case 'UPDATE_EXERCISE_SET': return `Change last set to ${e.reps} reps`;
      case 'UNDO_ACTION': return 'Undo last action';
      case 'COMPLETE_WORKOUT': return 'Finish workout';
      default: return a.intent;
    }
  };

  return (
    <>
      {controlledOpen === undefined && <IconAction icon={icon} label={label} onPress={() => setInternalOpen(true)} />}
      {open && <Sheet visible title="Voice log" onClose={close}>
        <View style={{ gap: 10 }}>
          <Copy size="caption" tone="muted">Record a short command or use your keyboard’s microphone. Example: “3 sets of bench press, 10 reps at 135 pounds, and log 500 ml water.”</Copy>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {!rec.isRecording ? (
              <IconAction icon="🎙️" label="Start recording" onPress={() => void startRecording()} />
            ) : (
              <>
                <IconAction icon="⏹️" label={`Stop (${Math.ceil(rec.durationMillis / 1000)}s)`} onPress={() => void stopRecording(false)} />
                <IconAction icon="✕" label="Cancel recording" onPress={() => void stopRecording(true)} />
              </>
            )}
            {rec.isRecording && <Copy size="caption" style={{ color: colors.danger }}>● Recording…</Copy>}
            {busy && <Copy size="caption" tone="muted">Transcribing…</Copy>}
          </View>
          <Field label="What did you do?" value={text} onChangeText={setText} multiline autoFocus />
          {!!error && <Copy size="caption" style={{ color: colors.danger }}>{error}</Copy>}

          {!actions && !results && (
            <Action label={busy ? 'Interpreting…' : 'Interpret'} disabled={busy || !text.trim()} onPress={() => void interpret()} />
          )}

          {actions && !results && (
            <>
              {actions.map((a, i) => (
                <ListRow key={i} title={summary(a)}
                  subtitle={`${(a as any).source === 'ai' ? 'AI suggestion · ' : ''}${a.status === 'ready' ? 'Ready to save' : `Needs review${a.missing?.length ? ` — missing ${a.missing.join(', ')}` : ''}${a.matches && a.matches.length > 1 ? ` — matches: ${a.matches.map(m => m.name).join(', ')}` : ''}`}`} />
              ))}
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <View style={{ flex: 1 }}><Action secondary label="Edit text" onPress={() => setActions(null)} /></View>
                <View style={{ flex: 1 }}><Action label={busy ? 'Saving…' : 'Confirm'} disabled={busy || !actions.some(a => a.status === 'ready')} onPress={() => void confirm()} /></View>
              </View>
            </>
          )}

          {results && (
            <>
              {results.map((r, i) => <ListRow key={i} title={r.detail || r.intent} subtitle={r.status === 'saved' ? 'Saved' : r.reason || r.status} />)}
              {!undone ? (
                <Action secondary label="Undo" disabled={busy} onPress={() => void undo()} />
              ) : <Copy size="caption" tone="muted">Undone.</Copy>}
              <Action label="Done" onPress={close} />
            </>
          )}
        </View>
      </Sheet>}
    </>
  );
}
