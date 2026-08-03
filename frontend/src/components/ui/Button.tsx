import { Link } from '@/lib/i18n/navigation';
import { cn } from '@/lib/utils/cn';

type Variant = 'primary' | 'outline' | 'ghost' | 'light';

/* `lyn-sheen` adds the light sweep on hover and focus. It is a class rather
   than a motion wrapper on purpose: this component is used on nearly every
   page, and turning it into a client component to add a hover flourish would
   ship a JS bundle to routes that are otherwise fully static. */
const base =
  'lyn-sheen inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 px-8 py-3.5 text-[0.6875rem] font-normal uppercase tracking-[0.22em] transition-all duration-500 disabled:cursor-not-allowed disabled:opacity-50';

/* Gold text sits at 11px here, so it takes gold-700 (5.07:1) rather than
   gold-600 (3.57:1); gold-600 stays as the lighter hover partner. */
const variants: Record<Variant, string> = {
  primary: 'bg-gold-500 text-ink-950 hover:bg-gold-400',
  outline: 'border border-ink-800/25 text-ink-800 hover:border-gold-500 hover:text-gold-700',
  light: 'border border-white/35 text-white hover:border-gold-400 hover:text-gold-300',
  ghost: 'text-gold-700 hover:text-gold-600',
};

type Props = {
  children: React.ReactNode;
  variant?: Variant;
  className?: string;
  href?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>;

export function Button({ children, variant = 'primary', className, href, ...rest }: Props) {
  const classes = cn(base, variants[variant], className);

  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <button className={classes} {...rest}>
      {children}
    </button>
  );
}
