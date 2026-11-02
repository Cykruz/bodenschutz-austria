import Link from 'next/link';
import type { ComponentProps, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'light';
type Size = 'md' | 'lg' | 'sm';

const base =
  'btn-grow inline-flex items-center justify-center gap-2 rounded-full font-heading font-bold transition-colors touch select-none disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-3 focus-visible:outline-terracotta';

const variants: Record<Variant, string> = {
  primary: 'bg-terracotta text-white hover:bg-terracotta-dunkel',
  secondary: 'bg-gruen text-white hover:bg-gruen-hell',
  ghost: 'bg-transparent text-gruen border-2 border-gruen/30 hover:border-gruen hover:bg-salbei',
  danger: 'bg-fehler text-white hover:bg-[#931f18]',
  light: 'bg-white text-gruen border-2 border-white hover:bg-sand',
};

const sizes: Record<Size, string> = {
  sm: 'px-4 py-2 text-sm min-h-[44px]',
  md: 'px-6 py-3 text-base min-h-[48px]',
  lg: 'px-8 py-4 text-lg min-h-[56px]',
};

export function buttonClasses(variant: Variant = 'primary', size: Size = 'md', extra = '') {
  return `${base} ${variants[variant]} ${sizes[size]} ${extra}`;
}

type ButtonProps = ComponentProps<'button'> & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
};

export function Button({ variant = 'primary', size = 'md', loading, icon, className = '', children, disabled, type = 'button', ...rest }: ButtonProps) {
  return (
    <button type={type} className={buttonClasses(variant, size, className)} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {loading ? <Loader2 className="size-5 animate-spin" aria-hidden /> : icon}
      {children}
    </button>
  );
}

type ButtonLinkProps = ComponentProps<typeof Link> & {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
};

export function ButtonLink({ variant = 'primary', size = 'md', icon, className = '', children, ...rest }: ButtonLinkProps) {
  return (
    <Link className={buttonClasses(variant, size, className)} {...rest}>
      {icon}
      {children}
    </Link>
  );
}
