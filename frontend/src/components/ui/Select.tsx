import { cn } from '@/lib/utils/cn';

type Props = {
  label: string;
  name: string;
  options: { value: string; label: string }[];
} & React.SelectHTMLAttributes<HTMLSelectElement>;

/** Same focus treatment as <Input>; see the note there. */
export function Select({ label, name, options, className, ...rest }: Props) {
  return (
    <label className={cn('lyn-field-lite block', className)}>
      <span className="block text-[0.625rem] tracking-[0.22em] text-ink-500 uppercase">
        {label}
      </span>
      {/* The beam lives on a wrapper, not on the control: `<select>` is a
          replaced element and browsers do not render its pseudo-elements. */}
      <span className="lyn-beam mt-2">
        <select
          name={name}
          className="block w-full border-b border-ink-800/20 bg-transparent py-3 text-ink-900 outline-none transition-colors duration-500 focus:border-gold-500"
          {...rest}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </span>
    </label>
  );
}
