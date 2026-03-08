import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    const variants = {
      primary: 'bg-zinc-900 text-white hover:bg-zinc-800 shadow-sm shadow-zinc-900/20 active:scale-[0.98]',
      secondary: 'bg-white text-zinc-900 border border-zinc-200 hover:bg-zinc-50 shadow-sm active:scale-[0.98]',
      outline: 'border border-zinc-200 bg-transparent hover:bg-zinc-50 text-zinc-900 active:scale-[0.98]',
      ghost: 'bg-transparent hover:bg-zinc-100 text-zinc-900 active:scale-[0.98]',
      danger: 'bg-red-500 text-white hover:bg-red-600 shadow-sm shadow-red-500/20 active:scale-[0.98]',
    };

    const sizes = {
      sm: 'h-8 px-3 text-xs rounded-md',
      md: 'h-10 px-4 py-2 text-sm rounded-lg',
      lg: 'h-11 px-8 text-base rounded-xl',
    };

    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';
