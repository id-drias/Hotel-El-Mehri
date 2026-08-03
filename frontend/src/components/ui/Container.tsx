import { cn } from '@/lib/utils/cn';

type Props = {
  children: React.ReactNode;
  className?: string;
  size?: 'default' | 'narrow' | 'wide';
};

const sizes = {
  narrow: 'max-w-3xl',
  default: 'max-w-6xl',
  wide: 'max-w-7xl',
};

export function Container({ children, className, size = 'default' }: Props) {
  return <div className={cn('mx-auto w-full px-6 sm:px-8', sizes[size], className)}>{children}</div>;
}
