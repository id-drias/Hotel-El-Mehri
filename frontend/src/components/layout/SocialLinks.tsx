import { contact } from '@/content/hotel';
import { cn } from '@/lib/utils/cn';

const items = [
  {
    href: contact.facebook,
    label: 'Facebook',
    path: 'M13.5 21v-8h2.7l.4-3.1h-3.1V7.9c0-.9.25-1.5 1.55-1.5H16.7V3.6A22 22 0 0 0 14.3 3.5c-2.35 0-3.95 1.45-3.95 4.1v2.3H7.65V13h2.7v8z',
  },
  {
    href: contact.instagram,
    label: 'Instagram',
    path: 'M12 7.4a4.6 4.6 0 1 0 0 9.2 4.6 4.6 0 0 0 0-9.2m0 7.6a3 3 0 1 1 0-6 3 3 0 0 1 0 6m5.9-7.8a1.07 1.07 0 1 1-2.15 0 1.07 1.07 0 0 1 2.15 0M21 8.1c-.05-1.45-.4-2.75-1.45-3.8S17.2 3.1 15.75 3c-1.5-.1-6-.1-7.5 0-1.45.05-2.75.4-3.8 1.45S3.1 6.8 3 8.25c-.1 1.5-.1 6 0 7.5.05 1.45.4 2.75 1.45 3.8s2.35 1.4 3.8 1.45c1.5.1 6 .1 7.5 0 1.45-.05 2.75-.4 3.8-1.45s1.4-2.35 1.45-3.8c.1-1.5.1-6 0-7.5m-1.9 9.1a3 3 0 0 1-1.7 1.7c-1.2.5-4 .35-5.4.35s-4.2.1-5.4-.35a3 3 0 0 1-1.7-1.7c-.5-1.2-.35-4-.35-5.4s-.1-4.2.35-5.4a3 3 0 0 1 1.7-1.7c1.2-.5 4-.35 5.4-.35s4.2-.1 5.4.35a3 3 0 0 1 1.7 1.7c.5 1.2.35 4 .35 5.4s.15 4.2-.35 5.4',
  },
];

export function SocialLinks({ tone = 'dark', className }: { tone?: 'dark' | 'light'; className?: string }) {
  // A network the hotel has no account on is blank in hotel.config.json; drop it
  // rather than shipping an <a> that navigates nowhere.
  const linked = items.filter((item) => item.href);
  if (linked.length === 0) return null;

  return (
    <div className={cn('flex items-center gap-5', className)}>
      {linked.map((item) => (
        <a
          key={item.label}
          href={item.href}
          target="_blank"
          rel="noreferrer noopener"
          aria-label={item.label}
          className={cn(
            'transition-colors duration-500',
            tone === 'light' ? 'text-white/60 hover:text-gold-300' : 'text-ink-400 hover:text-gold-600',
          )}
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
            <path d={item.path} />
          </svg>
        </a>
      ))}
    </div>
  );
}
