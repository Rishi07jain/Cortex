import { cn } from '@/lib/utils';

export default function Input({ label, id, error, hint, className, ...props }) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={id} className="block text-[13px] font-medium text-ink-700">
          {label}
        </label>
      )}

      <input
        id={id}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        className={cn(
          'h-10 w-full rounded-xl border bg-white px-3 text-sm text-ink-900 placeholder:text-ink-400',
          'transition-colors focus:outline-none focus:ring-2 focus:ring-melon-400/60',
          error ? 'border-melon-400' : 'border-ink-200 focus:border-melon-400',
          className
        )}
        {...props}
      />

      {hint && !error && (
        <p id={`${id}-hint`} className="text-xs text-ink-400">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-xs text-melon-600">
          {error}
        </p>
      )}
    </div>
  );
}
