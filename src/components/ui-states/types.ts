/**
 * Shared contract for every UI state. Copy is part of the API: titles say what
 * happened, descriptions say why and what to do next — never who's at fault.
 */
export interface UIStateBaseProps {
  /** Short headline describing the situation ("No meals logged yet"). */
  title?: string;
  /** One or two sentences: why this state exists and what to do next. */
  description?: string;
  /** Decorative glyph shown in a tinted circle (emoji or short string). */
  icon?: string;
  /** Label of the primary action — the single most obvious next step. */
  primaryCTA?: string;
  /** Label of the secondary action (dismissal, alternative path). */
  secondaryCTA?: string;
  /** Handler for `primaryCTA`. */
  onAction?: () => void;
  /** Handler for `secondaryCTA`. */
  onSecondaryAction?: () => void;
}
