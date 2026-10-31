import React from 'react';
import StateView from './StateView';
import { UIStateBaseProps } from './types';

/**
 * Nothing here — yet. Say why it's empty and offer exactly one obvious next
 * step. Example:
 *   <EmptyState title="No items in cart" description="Add products to start shopping"
 *     primaryCTA="Browse Products" onAction={navigateToShop} />
 */
export default function EmptyState(props: UIStateBaseProps) {
  return <StateView icon="📭" {...props} />;
}
