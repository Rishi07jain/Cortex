'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Trash2 } from 'lucide-react';
import Button from '@/components/ui/Button';
import { DIRECTIONS, RELATIONSHIP_TYPES } from '@/lib/graph';

/**
 * The small relationship editor from PRD 19 - appears after you draw a
 * connection, and again when you click an existing label.
 *
 * Mounted only while open, so initial state can come straight from props.
 */
export default function RelationshipEditor({
  initial,
  mode = 'create',
  onCancel,
  onSave,
  onDelete,
}) {
  const [relationshipType, setRelationshipType] = useState(
    initial?.relationshipType || 'related-to'
  );
  const [label, setLabel] = useState(initial?.label || '');
  const [direction, setDirection] = useState(initial?.direction || 'forward');

  const customRef = useRef(null);
  const isCustom = relationshipType === 'custom';

  // Jump to the text field the moment "Custom…" is chosen.
  useEffect(() => {
    if (isCustom) customRef.current?.focus();
  }, [isCustom]);

  // Escape closes without saving, anywhere in the dialog.
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onCancel]);

  const canSave = !isCustom || label.trim().length > 0;

  const submit = (event) => {
    event.preventDefault();
    if (!canSave) return;
    onSave({
      relationshipType,
      // A named type renders its own label; only custom needs stored text.
      label: isCustom ? label.trim() : '',
      direction,
    });
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink-900/15 p-4 backdrop-blur-[2px]">
      <motion.form
        initial={{ opacity: 0, scale: 0.97, y: 6 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
        onSubmit={submit}
        className="w-full max-w-[320px] rounded-2xl border border-ink-100 bg-surface p-5 shadow-float"
      >
        <h2 className="font-display text-[15px] font-semibold tracking-tight text-ink-900">
          Relationship
        </h2>

        <label className="mt-4 block text-[11px] font-medium uppercase tracking-wide text-ink-400">
          Type
          <select
            autoFocus
            value={relationshipType}
            onChange={(event) => setRelationshipType(event.target.value)}
            className="mt-1.5 h-10 w-full rounded-lg border border-ink-200 bg-white px-2.5 text-sm font-normal normal-case tracking-normal text-ink-800 outline-none focus:border-melon-400 focus:ring-2 focus:ring-melon-100"
          >
            {RELATIONSHIP_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </label>

        {isCustom ? (
          <label className="mt-3 block text-[11px] font-medium uppercase tracking-wide text-ink-400">
            Label
            <input
              ref={customRef}
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              placeholder="works at"
              maxLength={120}
              className="mt-1.5 h-10 w-full rounded-lg border border-ink-200 bg-white px-2.5 text-sm font-normal normal-case tracking-normal text-ink-800 outline-none placeholder:text-ink-300 focus:border-melon-400 focus:ring-2 focus:ring-melon-100"
            />
          </label>
        ) : null}

        <label className="mt-3 block text-[11px] font-medium uppercase tracking-wide text-ink-400">
          Direction
          <select
            value={direction}
            onChange={(event) => setDirection(event.target.value)}
            className="mt-1.5 h-10 w-full rounded-lg border border-ink-200 bg-white px-2.5 text-sm font-normal normal-case tracking-normal text-ink-800 outline-none focus:border-melon-400 focus:ring-2 focus:ring-melon-100"
          >
            {DIRECTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <div className="mt-5 flex items-center gap-2">
          {mode === 'edit' && onDelete ? (
            <button
              type="button"
              onClick={onDelete}
              aria-label="Delete connection"
              className="mr-auto inline-flex h-8 w-8 items-center justify-center rounded-lg text-ink-400 transition-colors hover:bg-melon-50 hover:text-melon-600"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          ) : null}

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className={mode === 'edit' && onDelete ? '' : 'ml-auto'}
          >
            Cancel
          </Button>
          <Button type="submit" size="sm" disabled={!canSave}>
            Save
          </Button>
        </div>
      </motion.form>
    </div>
  );
}