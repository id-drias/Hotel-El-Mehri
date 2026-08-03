import { cn } from '@/lib/utils/cn';

type Props = {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: 'start' | 'center';
  tone?: 'dark' | 'light';
  className?: string;
};

export function SectionTitle({
  eyebrow,
  title,
  description,
  align = 'start',
  tone = 'dark',
  className,
}: Props) {
  return (
    <div
      className={cn(
        'max-w-2xl',
        align === 'center' && 'mx-auto text-center',
        tone === 'light' && 'text-sand-50',
        className,
      )}
    >
      {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
      <h2
        className={cn(
          'rule-gold mt-4 text-4xl sm:text-5xl',
          align === 'center' && 'rule-gold-center',
          tone === 'light' ? 'text-sand-50' : 'text-ink-900',
        )}
      >
        {title}
      </h2>
      {description ? (
        <p className={cn('mt-8 text-[0.95rem]', tone === 'light' ? 'text-sand-200' : 'text-ink-500')}>
          {description}
        </p>
      ) : null}
    </div>
  );
}
