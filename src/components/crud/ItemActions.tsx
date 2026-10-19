import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Check,
  ImagePlus,
  MoreVertical,
  Pencil,
  Trash2,
  X,
} from 'lucide-react';

interface ItemActionsProps {
  itemLabel: string;
  onEdit: () => void;
  onReplace?: () => void;
  onDelete: () => void;
  /** When the section is in manage mode the rail stays visible. */
  alwaysVisible?: boolean;
  className?: string;
}

/**
 * Card-level management rail: Edit, Replace media and Delete (with an inline
 * confirmation step). Clicks never bubble to the card's own lightbox / booking
 * handlers.
 */
export const ItemActions: React.FC<ItemActionsProps> = ({
  itemLabel,
  onEdit,
  onReplace,
  onDelete,
  alwaysVisible = false,
  className = '',
}) => {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
        setConfirming(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        setConfirming(false);
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const close = () => {
    setOpen(false);
    setConfirming(false);
  };

  const menuItem =
    'flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-semibold transition-colors cursor-pointer';

  return (
    <div
      ref={rootRef}
      className={`absolute right-2 top-2 z-40 flex flex-col items-end ${
        alwaysVisible
          ? 'opacity-100'
          : 'opacity-0 group-hover:opacity-100 focus-within:opacity-100'
      } transition-opacity duration-200 ${className}`}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        onClick={() => {
          setOpen((value) => !value);
          setConfirming(false);
        }}
        aria-label={`Manage ${itemLabel}`}
        aria-haspopup="menu"
        aria-expanded={open}
        title={`Edit, replace or delete ${itemLabel}`}
        className="flex h-8 w-8 items-center justify-center rounded-full border border-[#0F172A]/15 bg-white/95 text-[#0F172A] shadow-md backdrop-blur-sm transition-colors hover:border-[#D09A40] hover:bg-white hover:text-[#D09A40] cursor-pointer"
      >
        {open ? <X className="h-4 w-4" /> : <MoreVertical className="h-4 w-4" />}
      </button>

      {open && (
        <div
          role="menu"
          aria-label={`${itemLabel} actions`}
          className="mt-1.5 w-48 rounded-2xl border border-[#0F172A]/12 bg-white p-1.5 text-left shadow-2xl animate-in fade-in slide-in-from-top-1 duration-150"
        >
          {confirming ? (
            <div className="rounded-xl bg-red-50 p-2.5">
              <div className="flex items-start gap-1.5">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-600" />
                <div>
                  <p className="text-[11px] font-bold text-red-800">
                    Remove this {itemLabel}?
                  </p>
                  <p className="mt-0.5 text-[10px] leading-snug text-red-700/80">
                    It will disappear from the site and the saved catalog.
                  </p>
                </div>
              </div>
              <div className="mt-2 flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    onDelete();
                    close();
                  }}
                  className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-red-600 px-2 py-1.5 text-[10px] font-bold text-white transition-colors hover:bg-red-700 cursor-pointer"
                >
                  <Check className="h-3 w-3" />
                  Yes, remove
                </button>
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  className="rounded-lg border border-red-200 bg-white px-2 py-1.5 text-[10px] font-bold text-red-700 transition-colors hover:bg-red-50 cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  onEdit();
                  close();
                }}
                className={`${menuItem} text-[#0F172A] hover:bg-[#FAF5E5]`}
              >
                <Pencil className="h-3.5 w-3.5 text-[#D09A40]" />
                Edit details
              </button>

              {onReplace && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    onReplace();
                    close();
                  }}
                  className={`${menuItem} text-[#0F172A] hover:bg-[#FAF5E5]`}
                >
                  <ImagePlus className="h-3.5 w-3.5 text-[#D09A40]" />
                  Replace image
                </button>
              )}

              <div className="my-1 h-px bg-[#0F172A]/8" />

              <button
                type="button"
                role="menuitem"
                onClick={() => setConfirming(true)}
                className={`${menuItem} text-red-700 hover:bg-red-50`}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete {itemLabel}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};
