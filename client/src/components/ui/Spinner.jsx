import { cn } from '@/lib/utils';

export default function Spinner({ className }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn(
        'inline-block h-4 w-4 animate-spin rounded-full border-2 border-ink-300 border-t-melon-500',
        className
      )}
    />
  );
}
