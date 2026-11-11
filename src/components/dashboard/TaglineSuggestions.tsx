import React from 'react';
import { suggestSalonTaglines } from '../../lib/ai';
import { SALON_NAME_MIN_LENGTH, SALON_TAGLINE_EXCLUDE_LIMIT, normalizeSalonName } from '../../lib/salonTaglines.js';
import { SuggestionPicker } from './SuggestionPicker';

/**
 * "Suggest taglines" helper for a salon Tagline field.
 *
 * Asks the AI brand strategist (`POST /api/ai/salon-taglines`) for three
 * options based on the salon name and lets the owner apply one with a click.
 */
export const TaglineSuggestions: React.FC<{
  /** Current value of the salon name field. */
  salonName: string;
  /** Current tagline: marks the option in use and is never suggested again. */
  value: string;
  onSelect: (tagline: string) => void;
}> = ({ salonName, value, onSelect }) => {
  const name = normalizeSalonName(salonName);
  const tagline = value.trim();

  return (
    <SuggestionPicker
      basisKey={name}
      basis={`“${name}”`}
      missing={name.length >= SALON_NAME_MIN_LENGTH ? null : 'Enter your salon name to get tagline ideas.'}
      action="Suggest taglines"
      noun="tagline ideas"
      hint="Three AI ideas based on your salon name."
      curatedHint="Three ideas based on your salon name."
      value={value}
      onSelect={onSelect}
      load={async (page, shown) => {
        const exclude = (tagline ? [...shown, tagline] : shown).slice(-SALON_TAGLINE_EXCLUDE_LIMIT);
        const result = await suggestSalonTaglines(name, page, exclude);
        return { options: result.value.map((text) => ({ text })), source: result.source };
      }}
    />
  );
};
