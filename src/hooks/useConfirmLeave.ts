import { useRef } from 'react';
import { Alert } from 'react-native';
import { useNavigation, usePreventRemove } from '@react-navigation/native';

/** Protect stack removal and in-place resets with the same explicit discard choice. */
export function useConfirmLeave(dirty: boolean, busy = false) {
  const navigation = useNavigation();
  const prompting = useRef(false);
  const confirmLeave = (leave: () => void) => {
    if (busy) {
      Alert.alert('Please wait', 'An operation is still in progress. Wait for its result before leaving.');
      return;
    }
    if (!dirty) { leave(); return; }
    if (prompting.current) return;
    prompting.current = true;
    const finish = (discard: boolean) => {
      prompting.current = false;
      if (discard) leave();
    };
    Alert.alert('Discard unsaved changes?', 'Your changes on this screen have not been saved.', [
      { text: 'Keep editing', style: 'cancel', onPress: () => finish(false) },
      { text: 'Discard', style: 'destructive', onPress: () => finish(true) },
    ], { cancelable: true, onDismiss: () => { prompting.current = false; } });
  };
  usePreventRemove(dirty || busy, ({ data }) => confirmLeave(() => navigation.dispatch(data.action)));
  return confirmLeave;
}
