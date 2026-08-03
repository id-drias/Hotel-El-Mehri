import { cn } from '@/lib/utils/cn';

type Props = {
  label: string;
  name: string;
  error?: string;
} & React.TextareaHTMLAttributes<HTMLTextAreaElement>;

/** Same focus treatment as <Input>; see the note there. */
export function Textarea({ label, name, error, className, rows = 5, ...rest }: Props) {
  return (
    <label className={cn('lyn-field-lite block', className)}>
      <span className="block text-[0.625rem] tracking-[0.22em] text-ink-500 uppercase">
        {label}
      </span>

      <span className="lyn-beam mt-2">
        <textarea
          name={name}
          rows={rows}
          aria-invalid={error ? true : undefined}
          className={cn(
            'block w-full resize-none border-b bg-transparent py-3 text-ink-900 outline-none transition-colors duration-500',
            'placeholder:text-ink-450 focus:border-gold-500',
            error ? 'border-red-700/60' : 'border-ink-800/20',
          )}
          {...rest}
        />
      </span>

      {error ? <span className="mt-1.5 block text-xs text-red-700">{error}</span> : null}
    </label>
  );
}
