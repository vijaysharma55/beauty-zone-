import React from 'react';
import { suggestSalonDescriptions } from '../../lib/ai';
import { SALON_DESCRIPTION_TAGLINE_MIN_LENGTH, SALON_DESCRIPTION_TONES } from '../../lib/salonDescriptions.js';
import { SALON_NAME_MIN_LENGTH, normalizeSalonName, normalizeSalonTagline } from '../../lib/salonTaglines.js';
import { SuggestionPicker } from './SuggestionPicker';

/**
 * "Suggest descriptions" helper for an "About your salon" field.
 *
 * Asks the AI copywriter (`POST /api/ai/salon-descriptions`) for three "About
 * Us" drafts based on the salon name and its tagline, one per tone, and lets
 * the owner apply one with a click.
 */
export const DescriptionSuggestions: React.FC<{
  /** Current value of the salon name field. */
  salonName: string;
  /** Current value of the Tagline field: the drafts are written around it. */
  tagline: string;
  /** Current description: marks the draft in use. */
  value: string;
  onSelect: (description: string) => void;
}> = ({ salonName, tagline, value, onSelect }) => {
  const name = normalizeSalonName(salonName);
  const line = normalizeSalonTagline(tagline);
  const missing =
    name.length < SALON_NAME_MIN_LENGTH
      ? 'Enter your salon name to get description ideas.'
      : line.length < SALON_DESCRIPTION_TAGLINE_MIN_LENGTH
        ? 'Add a tagline above to get description ideas.'
        : null;

  return (
    <SuggestionPicker
      // A new name or tagline is a new brief.
      basisKey={`${name}\n${line}`}
      basis={`“${name}” with the tagline “${line}”`}
      missing={missing}
      action="Suggest descriptions"
      noun="description ideas"
      hint="Three AI drafts in different tones, based on your salon name and tagline."
      curatedHint="Three drafts in different tones, based on your salon name and tagline."
      value={value}
      onSelect={onSelect}
      load={async (page) => {
        const result = await suggestSalonDescriptions(name, line, page);
        return {
          options: result.value.map((text, index) => ({ text, label: SALON_DESCRIPTION_TONES[index] })),
          source: result.source,
        };
      }}
    />
  );
};
