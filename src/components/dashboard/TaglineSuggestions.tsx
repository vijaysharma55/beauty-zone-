import React, { useId, useRef, useState } from 'react';
import { Check, RefreshCw, Sparkles } from 'lucide-react';
import { suggestSalonTaglines, type AiResult } from '../../lib/ai';
import { SALON_NAME_MIN_LENGTH, SALON_TAGLINE_EXCLUDE_LIMIT, normalizeSalonName } from '../../lib/salonTaglines.js';
import { Button, Spinner, cn } from '../ui';

interface Suggestions {
  /** The salon name these ideas were written for. */
  salonName: string;
  options: string[];
  source: AiResult<string[]>['source'];
}

/**
 * "Suggest taglines" helper for a salon Tagline field.
 *
 * Asks the AI brand strategist (`POST /api/ai/salon-taglines`) for three
 * options based on the salon name and lets the owner apply one with a click.
 * The owner stays in control: nothing is written until an option is chosen,
 * and the chosen text remains editable in the field above.
 */
export const TaglineSuggestions: React.FC<{
  /** Current value of the salon name field. */
  salonName: string;
  /** Current tagline: marks the option in use and is never suggested again. */
  value: string;
  onSelect: (tagline: string) => void;
}> = ({ salonName, value, onSelect }) => {
  const [suggestions, setSuggestions] = useState<Suggestions | null>(null);
  const [loading, setLoading] = useState(false);
  /** "More ideas" progress for the current salon name. */
  const history = useRef<{ page: number; shown: string[] }>({ page: 0, shown: [] });
  const hintId = useId();

  const name = normalizeSalonName(salonName);
  const tagline = value.trim();
  const canSuggest = name.length >= SALON_NAME_MIN_LENGTH;
  const hasIdeasForName = suggestions?.salonName === name;
  /** The model had nothing new to offer, so the list is the curated set. */
  const curatedOnly = suggestions?.source === 'fallback';

  const suggest = async () => {
    if (!canSuggest || loading) return;
    // A renamed salon starts again from the first page of ideas.
    const page = hasIdeasForName ? history.current.page + 1 : 0;
    const shown = hasIdeasForName ? history.current.shown : [];
    setLoading(true);
    try {
      const result = await suggestSalonTaglines(name, page, tagline ? [...shown, tagline] : shown);
      history.current = { page, shown: [...shown, ...result.value].slice(-SALON_TAGLINE_EXCLUDE_LIMIT) };
      setSuggestions(result.value.length > 0 ? { salonName: name, options: result.value, source: result.source } : null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        {/* Busy is `aria-disabled`, not `disabled`: a natively disabled button
            drops keyboard focus, and the ideas appear right after this one. */}
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={suggest}
          disabled={!canSuggest}
          aria-disabled={loading || undefined}
          aria-busy={loading || undefined}
          aria-describedby={hintId}
          className={loading ? 'cursor-progress opacity-60' : undefined}
        >
          {loading ? (
            <Spinner className="h-3.5 w-3.5" />
          ) : hasIdeasForName ? (
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
          ) : (
            <Sparkles className="h-3.5 w-3.5 text-[#D09A40]" aria-hidden="true" />
          )}
          {loading ? 'Finding ideas…' : hasIdeasForName ? 'More ideas' : 'Suggest taglines'}
        </Button>
        <p id={hintId} className="text-xs text-slate-500">
          {!canSuggest
            ? 'Enter your salon name to get tagline ideas.'
            : curatedOnly
              ? 'Three ideas based on your salon name.'
              : 'Three AI ideas based on your salon name.'}
        </p>
      </div>

      <p role="status" className="sr-only">
        {loading ? 'Finding tagline ideas…' : suggestions ? `${suggestions.options.length} tagline ideas ready.` : ''}
      </p>

      {suggestions && (
        <div
          role="group"
          aria-label={`Tagline ideas for ${suggestions.salonName}`}
          className="rounded-xl border border-slate-200 bg-slate-50 p-2.5"
        >
          <p className="px-1 pb-2 text-xs text-slate-500">
            Ideas for “{suggestions.salonName}”. Pick one, then edit it to make it yours.
          </p>
          <ul className="space-y-1.5">
            {suggestions.options.map((option) => {
              const selected = option === tagline;
              return (
                <li key={option}>
                  <button
                    type="button"
                    onClick={() => onSelect(option)}
                    aria-pressed={selected}
                    className={cn(
                      'flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D09A40]',
                      selected
                        ? 'border-[#D09A40] bg-[#D09A40]/10 text-slate-900'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-[#D09A40]/60'
                    )}
                  >
                    <span>{option}</span>
                    {selected ? (
                      <Check className="h-4 w-4 shrink-0 text-[#8a641f]" aria-hidden="true" />
                    ) : (
                      <span className="shrink-0 text-xs font-medium text-slate-500" aria-hidden="true">
                        Use
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
          {curatedOnly && (
            <p className="px-1 pt-2 text-xs text-slate-500">
              No new AI suggestions right now, so these are curated ideas.
            </p>
          )}
        </div>
      )}
    </div>
  );
};
