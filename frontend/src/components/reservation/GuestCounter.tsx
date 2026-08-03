'use client';

type Props = {
  label: string;
  value: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
};

export function GuestCounter({ label, value, min = 0, max = 12, onChange }: Props) {
  return (
    <div>
      <span className="block text-[0.625rem] uppercase tracking-[0.22em] text-ink-400">
        {label}
      </span>
      <div className="mt-2 flex items-center justify-between border-b border-ink-800/20 py-2">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          aria-label={`${label} -`}
          className="flex h-8 w-8 items-center justify-center border border-ink-800/20 text-ink-500 transition-colors hover:border-gold-500 hover:text-gold-600 disabled:opacity-30"
        >
          &minus;
        </button>
        <span className="font-display text-2xl text-ink-900" aria-live="polite">
          {value}
        </span>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          aria-label={`${label} +`}
          className="flex h-8 w-8 items-center justify-center border border-ink-800/20 text-ink-500 transition-colors hover:border-gold-500 hover:text-gold-600 disabled:opacity-30"
        >
          +
        </button>
      </div>
    </div>
  );
}
