import React from 'react';
import { Linking } from 'react-native';
import StateView from './StateView';
import { UIStateBaseProps } from './types';

export interface PermissionDeniedStateProps extends UIStateBaseProps {
  /** Human name of the permission, used in the copy ("Camera"). */
  permission: string;
  /** What the user loses without it ("scanning nutrition labels instantly"). */
  benefit?: string;
  /** When false, the "Continue without" escape is hidden. Default true. */
  canSkip?: boolean;
}

/**
 * OS permission was denied. Sell the benefit in one sentence, own the ask,
 * and give a straight path to Settings. `onAction` defaults to
 * Linking.openSettings() so the primary button works out of the box.
 */
export default function PermissionDeniedState({
  permission,
  benefit,
  canSkip = true,
  title,
  description,
  icon = '🔒',
  primaryCTA = 'Open Settings',
  secondaryCTA = 'Continue without',
  onAction,
  ...props
}: PermissionDeniedStateProps) {
  return (
    <StateView
      title={title ?? `${permission} access is off`}
      description={description ?? `${permission} access is needed for ${benefit || 'this feature'} — that's all it's used for. You can turn it on in Settings in a few seconds, and everything else keeps working without it.`}
      icon={icon}
      primaryCTA={primaryCTA}
      onAction={onAction ?? (() => { Linking.openSettings().catch(() => {}); })}
      secondaryCTA={canSkip ? secondaryCTA : undefined}
      {...props}
    />
  );
}
