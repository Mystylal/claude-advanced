'use client';

import { useId, useState } from 'react';
import { FieldError, Input, Label, TextField } from '@heroui/react';

interface PasswordFieldProps {
  label: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  isDisabled?: boolean;
  isRequired?: boolean;
  minLength?: number;
  autoComplete: 'new-password' | 'current-password';
}

export function PasswordField({
  label,
  placeholder,
  value,
  onChange,
  isDisabled,
  isRequired,
  minLength,
  autoComplete,
}: PasswordFieldProps) {
  const [isVisible, setIsVisible] = useState(false);
  const toggleId = useId();

  return (
    <TextField
      name="password"
      type={isVisible ? 'text' : 'password'}
      autoComplete={autoComplete}
      isRequired={isRequired}
      minLength={minLength}
      value={value}
      onChange={onChange}
      isDisabled={isDisabled}
    >
      <Label>{label}</Label>
      <div className="relative">
        <Input fullWidth className="pr-11" placeholder={placeholder} />
        <button
          type="button"
          id={toggleId}
          onClick={() => setIsVisible((prev) => !prev)}
          disabled={isDisabled}
          aria-label={isVisible ? 'Hide password' : 'Show password'}
          aria-pressed={isVisible}
          className="absolute top-1/2 right-1 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-foreground/60 transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current disabled:pointer-events-none disabled:opacity-50"
        >
          {isVisible ? (
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5"
              aria-hidden="true"
            >
              <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
              <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
              <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
              <line x1="2" y1="2" x2="22" y2="22" />
            </svg>
          ) : (
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5"
              aria-hidden="true"
            >
              <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          )}
        </button>
      </div>
      <FieldError />
    </TextField>
  );
}
