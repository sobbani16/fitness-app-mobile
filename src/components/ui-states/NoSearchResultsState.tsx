import React from 'react';
import { Pressable } from 'react-native';
import { Copy } from '../../design/components';
import { radius, useTheme } from '../../design/theme';
import StateView from './StateView';
import { UIStateBaseProps } from './types';

export interface NoSearchResultsStateProps extends UIStateBaseProps {
  /** What the user typed — echoed back so the miss is obvious. */
  query: string;
  /** Best-guess correction ("bread" when they typed "bred"). */
  suggestion?: string;
  /** Run a new search with `suggestion`. */
  onSuggestion?: () => void;
}

/**
 * Search came back empty. Never a dead end: offer a did-you-mean correction
 * when one exists and a browse path (`secondaryCTA`) when it doesn't.
 */
export default function NoSearchResultsState({
  query,
  suggestion,
  onSuggestion,
  title,
  description = 'Check the spelling, or try fewer and more general words.',
  icon = '🔍',
  secondaryCTA = 'Browse categories',
  ...props
}: NoSearchResultsStateProps) {
  const { colors } = useTheme();
  return (
    <StateView title={title ?? `No matches for “${query}”`} description={description} icon={icon}
      secondaryCTA={secondaryCTA} {...props}>
      {!!suggestion && !!onSuggestion && (
        <Pressable accessibilityRole="button" accessibilityLabel={`Search for ${suggestion} instead`}
          onPress={onSuggestion}
          style={({ pressed }) => ({ minHeight: 48, justifyContent: 'center', paddingHorizontal: 18, borderRadius: radius.control,
            borderWidth: 1, borderColor: colors.primary, backgroundColor: colors.surface, opacity: pressed ? 0.7 : 1 })}>
          <Copy style={{ color: colors.primary, fontWeight: '600' }}>Did you mean “{suggestion}”?</Copy>
        </Pressable>
      )}
    </StateView>
  );
}
