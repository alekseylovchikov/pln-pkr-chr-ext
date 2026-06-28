import { type InputHTMLAttributes, forwardRef } from 'react';
import { clsx } from 'clsx';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={inputId} className="text-xs font-medium text-gray-600">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          {...props}
          className={clsx(
            'w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors',
            'placeholder:text-gray-400',
            error
              ? 'border-red-400 bg-red-50 focus:border-red-500 focus:ring-2 focus:ring-red-200'
              : 'border-gray-300 bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100',
            props.disabled && 'opacity-50 cursor-not-allowed bg-gray-50',
            className
          )}
        />
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    );
  }
);
Input.displayName = 'Input';
