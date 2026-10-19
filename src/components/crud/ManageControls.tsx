import React from 'react';
import { Check, Pencil, Plus, Settings2 } from 'lucide-react';

interface ManageControlsProps {
  isManaging: boolean;
  onToggle: () => void;
  onAdd: () => void;
  addLabel: string;
  disabled?: boolean;
}

/**
 * Header control pair used by every editable section: a Manage / Done toggle
 * plus an Add button that is only exposed while editing.
 */
export const ManageControls: React.FC<ManageControlsProps> = ({
  isManaging,
  onToggle,
  onAdd,
  addLabel,
  disabled = false,
}) => {
  if (disabled) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={isManaging}
        className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition-all cursor-pointer ${
          isManaging
            ? 'border-[#D09A40] bg-[#D09A40] text-[#0F172A] shadow-sm'
            : 'border-[#0F172A]/15 bg-white text-[#0F172A] hover:border-[#D09A40] hover:bg-[#FAF5E5]'
        }`}
        title={isManaging ? 'Finish editing cards' : 'Edit, replace or delete cards'}
      >
        {isManaging ? <Check className="h-3.5 w-3.5" /> : <Settings2 className="h-3.5 w-3.5 text-[#D09A40]" />}
        <span>{isManaging ? 'Done Editing' : 'Manage'}</span>
      </button>

      {isManaging && (
        <button
          type="button"
          onClick={onAdd}
          className="inline-flex items-center gap-1.5 rounded-xl bg-[#0F172A] px-3.5 py-2 text-xs font-bold text-white shadow-sm transition-colors hover:bg-[#D09A40] hover:text-[#0F172A] cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>{addLabel}</span>
        </button>
      )}
    </div>
  );
};

export const ManageHint: React.FC<{ isManaging: boolean; noun: string }> = ({
  isManaging,
  noun,
}) => {
  if (!isManaging) return null;
  return (
    <div
      role="status"
      className="mt-4 flex items-start gap-2 rounded-xl border border-[#D09A40]/35 bg-[#FAF5E5] px-3.5 py-2.5 text-[11px] font-medium text-[#4A4A4A]"
    >
      <Pencil className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#D09A40]" />
      <span>
        Edit mode is on. Use the <strong className="text-[#0F172A]">•••</strong> menu on any {noun} to edit its
        details, replace its image, or delete it.
      </span>
    </div>
  );
};

export const CrudToast: React.FC<{ message: string | null }> = ({ message }) => {
  if (!message) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed bottom-24 right-4 z-[90] flex max-w-xs items-center gap-2 rounded-xl border border-[#D09A40]/40 bg-[#0F172A] px-4 py-3 text-xs font-semibold text-[#FAF5E5] shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-200 sm:bottom-6"
    >
      <Check className="h-4 w-4 shrink-0 text-[#D09A40]" />
      <span>{message}</span>
    </div>
  );
};
