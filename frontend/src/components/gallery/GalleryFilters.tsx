'use client';

import { cn } from '@/lib/utils/cn';

export type FilterOption = { slug: string; label: string };

type Props = {
  options: FilterOption[];
  active: string;
  onChange: (slug: string) => void;
};

export function GalleryFilters({ options, active, onChange }: Props) {
  return (
    <div className="flex flex-wrap justify-center gap-x-9 gap-y-4">
      {options.map((option) => (
        <button
          key={option.slug}
          type="button"
          onClick={() => onChange(option.slug)}
          aria-pressed={option.slug === active}
          className={cn(
            'relative pb-2 text-[0.6875rem] uppercase tracking-[0.22em] transition-colors duration-500',
            'after:absolute after:bottom-0 after:left-0 after:h-px after:bg-gold-500 after:transition-all after:duration-500',
            option.slug === active
              ? 'text-ink-900 after:w-full'
              : 'text-ink-400 after:w-0 hover:text-ink-800 hover:after:w-full',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
