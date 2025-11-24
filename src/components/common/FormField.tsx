
import { ChangeEvent, useId, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useFormAccessibility } from '@/hooks/useAccessibility';
import { cn } from '@/lib/utils';

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
  readOnly?: boolean;
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
  readOnly = false,
  description,
  error,
  className = ''
}: FormFieldProps) {
  const generatedId = useId();
  const fieldId = id || `field-${generatedId}`;
  const descriptionId = description ? `${fieldId}-description` : undefined;
  const errorId = error ? `${fieldId}-error` : undefined;
  const helpTextId = `${fieldId}-help`;
  const ariaDescribedBy = [descriptionId, errorId, helpTextId].filter(Boolean).join(' ') || undefined;
  
  const { announceFormError } = useFormAccessibility();

  // Announce errors when they appear
  useEffect(() => {
    if (error) {
      announceFormError(label, error);
    }
  }, [error, label, announceFormError]);

  return (
    <div className={cn("space-y-2", className)}>
      <Label 
        htmlFor={fieldId}
        required={required}
        className="block"
      >
        <span className="sr-only">{required ? `${label}, required field` : label}</span>
        <span aria-hidden="true">{label}</span>
      </Label>
      
      <div className="relative">
        <Input
          id={fieldId}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          readOnly={readOnly}
          aria-describedby={ariaDescribedBy}
          aria-invalid={error ? 'true' : 'false'}
          aria-label={`${label}${required ? ' (required)' : ''}`}
          className={cn(
            "transition-all duration-200",
            error && "border-destructive focus-visible:ring-destructive",
            readOnly && "bg-muted cursor-not-allowed"
          )}
        />
        
        {required && (
          <span 
            className="absolute right-3 top-1/2 -translate-y-1/2 text-destructive text-sm font-bold"
            aria-hidden="true"
          >
            *
          </span>
        )}
      </div>

      {/* Help text */}
      <div id={helpTextId} className="sr-only">
        {`${label} field. ${required ? 'Required.' : 'Optional.'} ${type === 'email' ? 'Enter a valid email address.' : ''} ${type === 'password' ? 'Enter your password.' : ''}`}
      </div>

      {description && (
        <p 
          id={descriptionId}
          className="text-sm text-muted-foreground"
          role="description"
        >
          {description}
        </p>
      )}
      
      {error && (
        <div
          id={errorId}
          className="flex items-start gap-2 text-sm text-destructive"
          role="alert"
          aria-live="assertive"
          aria-atomic="true"
        >
          <span className="mt-0.5 flex-shrink-0" aria-hidden="true">⚠</span>
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
