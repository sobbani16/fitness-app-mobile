import React from 'react';
import StateView from './StateView';
import { UIStateBaseProps } from './types';

export interface SessionExpiredStateProps extends UIStateBaseProps {
  /** What was preserved ("Your cart and checkout form are saved"). */
  savedNote?: string;
  /** Where the user lands after logging back in. */
  returnNote?: string;
}

/**
 * Signed out after inactivity. Lead with reassurance — work was saved, the
 * destination is remembered — then offer one clear way back in.
 */
export default function SessionExpiredState({
  title = 'You’ve been signed out',
  description,
  savedNote = 'Your work is saved on this device',
  returnNote = 'You’ll come right back to where you were',
  icon = '🔑',
  primaryCTA = 'Log back in',
  ...props
}: SessionExpiredStateProps) {
  return (
    <StateView
      title={title}
      description={description ?? `For your security we sign you out after a break. ${savedNote}. ${returnNote}.`}
      icon={icon}
      primaryCTA={primaryCTA}
      {...props}
    />
  );
}
