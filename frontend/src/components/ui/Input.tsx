import { cn } from '@/lib/utils/cn';

type Props = {
  label: string;
  name: string;
  error?: string;
} & React.InputHTMLAttributes<HTMLInputElement>;

/**
 * Focus is expressed three ways at once: the border warms to gold, a beam
 * scales out along the baseline, and a soft warm backdrop rises behind the
 * field. All three hang off `:focus-within` on the label, so they fire
 * identically for pointer and keyboard — the design skill rates a state only a
 * mouse can reach a High-severity failure, and a form is the last place to make
 * that trade.
 *
 * The visible `<span>` label stays. A placeholder is not a label: it disappears
 * the moment someone types, taking the field's meaning with it.
 */
export function Input({ label, name, error, className, ...rest }: Props) {
  return (
    <label className={cn('lyn-field-lite block', className)}>
      <span className="block text-[0.625rem] tracking-[0.22em] text-ink-500 uppercase">
        {label}
      </span>

      <span className="lyn-beam mt-2">
        <input
          name={name}
          aria-invalid={error ? true : undefined}
          className={cn(
            'w-full border-b bg-transparent py-3 text-ink-900 outline-none transition-colors duration-500',
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
