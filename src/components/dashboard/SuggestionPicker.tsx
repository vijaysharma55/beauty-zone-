import React, { useId, useRef, useState } from 'react';
import { Check, RefreshCw, Sparkles, Undo2 } from 'lucide-react';
import type { AiResult } from '../../lib/ai';
import { Button, Spinner, cn } from '../ui';

export interface SuggestionOption {
  text: string;
  /** Short caption shown above the text, e.g. the tone of a description. */
  label?: string;
}

/** One answer from the assistant: the options and where they came from. */
export interface SuggestionRound {
  options: SuggestionOption[];
  source: AiResult<unknown>['source'];
}

/** How many already-offered options are remembered for "more ideas". */
const HISTORY_LIMIT = 60;

interface ShownRound extends SuggestionRound {
  /** The `basisKey` and `basis` these ideas were written for. */
  basisKey: string;
  basis: string;
}

/** What the picker last put in the field, and the owner's text it replaced. */
interface Applied {
  text: string;
  replaced: string | null;
}

/**
 * "Suggest …" helper shown under a form field: a button that asks the AI
 * assistant for a few options, and a list that applies one with a click.
 *
 * The owner stays in control: nothing is written until an option is chosen,
 * the chosen text remains editable in the field, and text of their own that an
 * option replaced can be brought back with Undo.
 */
export const SuggestionPicker: React.FC<{
  /** Identifies what the ideas are based on, e.g. the salon name. A change starts a new series. */
  basisKey: string;
  /** How the panel names that basis, e.g. `“Velvet Rose Atelier”`. */
  basis: string;
  /** Why ideas cannot be requested yet, or `null` when they can. */
  missing: string | null;
  /** Button label before the first round, e.g. "Suggest taglines". */
  action: string;
  /** What the options are called, e.g. "tagline ideas". */
  noun: string;
  /** Shown beside the button, e.g. "Three AI ideas based on your salon name." */
  hint: string;
  /** The same hint for a round that came from the curated set instead of the model. */
  curatedHint: string;
  /** Current value of the field the ideas are for. */
  value: string;
  onSelect: (text: string) => void;
  /** Loads one round. `page` counts the "more ideas" requests; `shown` lists every option already offered. */
  load: (page: number, shown: string[]) => Promise<SuggestionRound>;
}> = ({ basisKey, basis, missing, action, noun, hint, curatedHint, value, onSelect, load }) => {
  const [round, setRound] = useState<ShownRound | null>(null);
  const [loading, setLoading] = useState(false);
  const [applied, setApplied] = useState<Applied | null>(null);
  const [failed, setFailed] = useState(false);
  /** Announced to screen readers. */
  const [status, setStatus] = useState('');
  /** "More ideas" progress for the current basis. */
  const history = useRef<{ page: number; shown: string[] }>({ page: 0, shown: [] });
  const root = useRef<HTMLDivElement>(null);
  const hintId = useId();

  const current = value.trim();
  const canSuggest = missing === null;
  const hasIdeasForBasis = round?.basisKey === basisKey;
  /** The model had nothing new to offer, so the list is the curated set. */
  const curatedOnly = round?.source === 'fallback';
  /** Undo is offered until the owner edits the text the picker applied. */
  const canUndo = applied !== null && applied.replaced !== null && value === applied.text;

  const suggest = async () => {
    if (!canSuggest || loading) return;
    // A new basis (e.g. a renamed salon) starts again from the first page.
    const page = hasIdeasForBasis ? history.current.page + 1 : 0;
    const shown = hasIdeasForBasis ? history.current.shown : [];
    setLoading(true);
    setFailed(false);
    setStatus(`Finding ${noun}…`);
    try {
      const result = await load(page, shown);
      if (result.options.length === 0) throw new Error('no suggestions');
      history.current = {
        page,
        shown: [...shown, ...result.options.map((option) => option.text)].slice(-HISTORY_LIMIT),
      };
      setRound({ ...result, basisKey, basis });
      setStatus(`${result.options.length} ${noun} ready.`);
    } catch {
      // The loaders fall back to curated ideas themselves, so this is a last resort.
      setFailed(true);
      setStatus('');
    } finally {
      setLoading(false);
    }
  };

  const apply = (text: string) => {
    // Anything the picker did not put there is the owner's own text: keep it recoverable.
    const replaced = !current ? null : value !== applied?.text ? value : (applied?.replaced ?? null);
    setApplied({ text, replaced });
    onSelect(text);
    setStatus(replaced === null ? 'Applied.' : 'Applied. Undo brings back your previous text.');
  };

  const undo = () => {
    if (applied === null || applied.replaced === null) return;
    onSelect(applied.replaced);
    setApplied(null);
    setStatus('Your previous text is back.');
    // The Undo button is about to disappear; keep keyboard focus in the helper.
    root.current?.querySelector('button')?.focus();
  };

  return (
    <div ref={root} className="space-y-2">
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
          ) : hasIdeasForBasis ? (
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
          ) : (
            <Sparkles className="h-3.5 w-3.5 text-[#D09A40]" aria-hidden="true" />
          )}
          {loading ? 'Finding ideas…' : hasIdeasForBasis ? 'More ideas' : action}
        </Button>
        <p id={hintId} className="text-xs text-slate-500">
          {missing ?? (curatedOnly ? curatedHint : hint)}
        </p>
      </div>

      <p role="status" className="sr-only">
        {status}
      </p>
      {failed && (
        <p role="alert" className="text-xs text-red-600">
          Could not load ideas. Please try again.
        </p>
      )}

      {round && (
        <div
          role="group"
          aria-label={`${noun.charAt(0).toUpperCase()}${noun.slice(1)} for ${round.basis}`}
          className="rounded-xl border border-slate-200 bg-slate-50 p-2.5"
        >
          <p className="px-1 pb-2 text-xs text-slate-500">
            Ideas for {round.basis}. Pick one, then edit it to make it yours.
          </p>
          <ul className="space-y-1.5">
            {round.options.map((option) => {
              const selected = option.text === current;
              return (
                <li key={option.text}>
                  <button
                    type="button"
                    onClick={() => apply(option.text)}
                    aria-pressed={selected}
                    className={cn(
                      'flex w-full justify-between gap-3 rounded-lg border px-3 py-2 text-left text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D09A40]',
                      option.label ? 'items-start' : 'items-center',
                      selected
                        ? 'border-[#D09A40] bg-[#D09A40]/10 text-slate-900'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-[#D09A40]/60'
                    )}
                  >
                    <span className="min-w-0">
                      {option.label && (
                        <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[#8a641f]">
                          {option.label}
                        </span>
                      )}
                      <span className="block">{option.text}</span>
                    </span>
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
          {canUndo && (
            <p className="flex flex-wrap items-center gap-x-2 px-1 pt-2 text-xs text-slate-500">
              This replaced the text you had.
              <button
                type="button"
                onClick={undo}
                className="inline-flex items-center gap-1 rounded font-semibold text-slate-700 underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D09A40]"
              >
                <Undo2 className="h-3.5 w-3.5" aria-hidden="true" />
                Undo
              </button>
            </p>
          )}
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
