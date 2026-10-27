import { createNavigationContainerRef } from '@react-navigation/native';
import { RootStackParamList } from './RootNavigator';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

export function navigate(name: keyof RootStackParamList, params?: Record<string, unknown>) {
  if (navigationRef.isReady()) (navigationRef as any).navigate(name, params);
}
