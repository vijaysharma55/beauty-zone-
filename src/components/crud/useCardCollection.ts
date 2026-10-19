import { useCallback, useEffect, useState } from 'react';

export interface CardEditorState<T> {
  mode: 'create' | 'edit';
  item?: T;
  /** Scroll the editor to the image field (used by the Replace action). */
  focusImage?: boolean;
}

/**
 * Shared state machine for the five editable card sections. It keeps the
 * "manage mode" flag, the open editor and a short confirmation toast, and
 * funnels every mutation into the parent's state + localStorage handler.
 */
export function useCardCollection<T extends { id: string }>(
  items: T[],
  onChange: ((next: T[]) => void) | undefined,
  entityLabel: string
) {
  const [isManaging, setIsManaging] = useState(false);
  const [editorState, setEditorState] = useState<CardEditorState<T> | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 2800);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const canManage = typeof onChange === 'function';

  const toggleManaging = useCallback(() => setIsManaging((value) => !value), []);

  const openCreate = useCallback(() => {
    if (!canManage) return;
    setEditorState({ mode: 'create' });
  }, [canManage]);

  const openEdit = useCallback(
    (item: T) => {
      if (!canManage) return;
      setEditorState({ mode: 'edit', item });
    },
    [canManage]
  );

  const openReplace = useCallback(
    (item: T) => {
      if (!canManage) return;
      setEditorState({ mode: 'edit', item, focusImage: true });
    },
    [canManage]
  );

  const closeEditor = useCallback(() => setEditorState(null), []);

  const saveItem = useCallback(
    (nextItem: T) => {
      if (!onChange) return;
      const exists = items.some((item) => item.id === nextItem.id);
      const next = exists
        ? items.map((item) => (item.id === nextItem.id ? nextItem : item))
        : [nextItem, ...items];
      onChange(next);
      setNotice(`${entityLabel} ${exists ? 'updated' : 'added'} successfully.`);
      setEditorState(null);
    },
    [entityLabel, items, onChange]
  );

  const removeItem = useCallback(
    (id: string) => {
      if (!onChange) return;
      onChange(items.filter((item) => item.id !== id));
      setNotice(`${entityLabel} deleted.`);
      setEditorState(null);
    },
    [entityLabel, items, onChange]
  );

  return {
    canManage,
    isManaging,
    setIsManaging,
    toggleManaging,
    editorState,
    openCreate,
    openEdit,
    openReplace,
    closeEditor,
    saveItem,
    removeItem,
    notice,
  };
}
