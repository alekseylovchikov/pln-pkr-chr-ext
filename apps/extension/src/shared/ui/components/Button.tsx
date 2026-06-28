import { type ButtonHTMLAttributes, type ReactNode } from 'react';
import { clsx } from 'clsx';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  children: ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  className,
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={clsx(
        'inline-flex items-center justify-center font-medium rounded-lg transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1',
        {
          'bg-indigo-600 text-white hover:bg-indigo-700 active:bg-indigo-800 focus-visible:ring-indigo-500':
            variant === 'primary',
          'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 active:bg-gray-100 focus-visible:ring-gray-400':
            variant === 'secondary',
          'text-gray-600 hover:bg-gray-100 active:bg-gray-200 focus-visible:ring-gray-400':
            variant === 'ghost',
          'bg-red-600 text-white hover:bg-red-700 active:bg-red-800 focus-visible:ring-red-500':
            variant === 'danger',
          'px-2.5 py-1.5 text-xs': size === 'sm',
          'px-4 py-2 text-sm': size === 'md',
          'px-5 py-2.5 text-base': size === 'lg',
          'opacity-50 cursor-not-allowed': disabled || loading,
        },
        className
      )}
    >
      {loading ? (
        <span className="flex items-center gap-2">
          <Spinner size={size === 'lg' ? 18 : 14} />
          {children}
        </span>
      ) : (
        children
      )}
    </button>
  );
}

function Spinner({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      className="animate-spin"
    >
      <path
        strokeLinecap="round"
        d="M12 2a10 10 0 0 1 10 10"
        strokeOpacity="0.3"
      />
      <path
        strokeLinecap="round"
        d="M12 2a10 10 0 0 0-10 10"
      />
    </svg>
  );
}
