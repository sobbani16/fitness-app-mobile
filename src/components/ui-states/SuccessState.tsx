import React from 'react';
import { Copy } from '../../design/components';
import StateView from './StateView';
import { UIStateBaseProps } from './types';

export interface SuccessStateProps extends UIStateBaseProps {
  /** What happens next ("You'll get a confirmation email within a minute"). */
  nextStep?: string;
}

/**
 * It worked. The check pops in with a spring, the copy confirms what happened
 * and what's next, and the primary CTA takes the user to the natural
 * follow-up ("Track your order →").
 */
export default function SuccessState({
  title = 'Done!',
  description = 'That worked.',
  nextStep,
  icon = '✓',
  ...props
}: SuccessStateProps) {
  return (
    <StateView title={title} description={description} icon={icon} iconTone="primary" {...props}>
      {!!nextStep && <Copy size="caption" tone="muted" style={{ textAlign: 'center' }}>{nextStep}</Copy>}
    </StateView>
  );
}
