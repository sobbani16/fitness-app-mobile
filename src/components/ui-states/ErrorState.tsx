import React from 'react';
import { Copy } from '../../design/components';
import StateView from './StateView';
import { UIStateBaseProps } from './types';

export interface ErrorStateProps extends UIStateBaseProps {
  /** Optional technical detail for support — rendered small and muted. */
  detail?: string;
}

/**
 * Something broke. Plain language about what went wrong, an explicit "your
 * stuff is safe" reassurance when data is involved, and an obvious retry.
 * Announced politely to screen readers.
 */
export default function ErrorState({
  title = 'Something went wrong',
  description = "We couldn't finish that. Your data is safe — this is on our side, not something you did.",
  icon = '⚠️',
  primaryCTA = 'Try again',
  detail,
  ...props
}: ErrorStateProps) {
  return (
    <StateView title={title} description={description} icon={icon} primaryCTA={primaryCTA} {...props}>
      {!!detail && <Copy size="caption" tone="muted" accessibilityLiveRegion="polite"
        style={{ textAlign: 'center' }}>{detail}</Copy>}
    </StateView>
  );
}
