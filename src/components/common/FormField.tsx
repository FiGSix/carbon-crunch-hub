
import { ChangeEvent } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface FormFieldProps {
  id: string;
  name: string;
  label: string;
  type?: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  description?: string;
  error?: string;
  className?: string;
}

export function FormField({
  id,
  name,
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  required = false,
  disabled = false,
  description,
  error,
  className = ''
}: FormFieldProps) {
  const descriptionId = description ? `${id}-description` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const ariaDescribedBy = [descriptionId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={className}>
      <Label htmlFor={id}>
        {label}
        {required && (
          <span 
            className="text-red-500 ml-1" 
            aria-label="required"
          >
            *
          </span>
        )}
      </Label>
      <Input
        id={id}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        aria-describedby={ariaDescribedBy}
        aria-invalid={error ? 'true' : 'false'}
        className={error ? 'border-red-500' : ''}
      />
      {description && (
        <p 
          id={descriptionId}
          className="text-sm text-muted-foreground mt-1"
          role="description"
        >
          {description}
        </p>
      )}
      {error && (
        <p 
          id={errorId}
          className="text-sm text-destructive mt-1"
          role="alert"
          aria-live="polite"
        >
          {error}
        </p>
      )}
    </div>
  );
}
