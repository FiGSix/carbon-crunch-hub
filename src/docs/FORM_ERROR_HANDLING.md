# Unified Form Error Handling System

## Overview

This system provides consistent error handling patterns across all forms in the application, ensuring better user feedback and reduced form abandonment.

## Key Components

### 1. `useUnifiedFormHandler` Hook

The core hook that provides centralized error handling for forms.

```typescript
import { useUnifiedFormHandler } from '@/hooks/useUnifiedFormHandler';

const { 
  submissionState, 
  submitForm, 
  submitFormWithValidation 
} = useUnifiedFormHandler({
  formName: 'My Form',
  enableToast: true,
  retryAttempts: 2
});
```

### 2. `UnifiedFormWrapper` Component

A wrapper component that automatically handles form submission and error display.

```typescript
import { UnifiedFormWrapper } from '@/components/forms/UnifiedFormWrapper';

<UnifiedFormWrapper
  formName="Login Form"
  onSubmit={handleSubmit}
  successMessage="Login successful!"
  retryAttempts={2}
>
  {/* Your form fields */}
</UnifiedFormWrapper>
```

### 3. Error Display Components

- `FormErrorDisplay`: Shows all form errors with appropriate icons and retry options
- `FieldErrorDisplay`: Shows field-specific errors (for react-hook-form integration)

## Error Types

The system categorizes errors into four types:

1. **Validation**: Client-side validation errors
2. **Network**: Connection issues, timeouts
3. **Server**: API errors, server failures
4. **Authentication**: Auth-related errors requiring re-login

## Usage Patterns

### Simple Forms (without react-hook-form)

```typescript
import { SimpleFormWrapper } from '@/components/forms/UnifiedFormWrapper';

function MyForm() {
  const [email, setEmail] = useState('');

  const handleSubmit = async () => {
    if (!email) throw new Error('Email is required');
    
    const response = await api.submitForm({ email });
    return response;
  };

  return (
    <SimpleFormWrapper
      formName="Newsletter Signup"
      onSubmit={handleSubmit}
      successMessage="Successfully subscribed!"
    >
      <Input value={email} onChange={(e) => setEmail(e.target.value)} />
      <Button type="submit">Subscribe</Button>
    </SimpleFormWrapper>
  );
}
```

### React Hook Form Integration

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { UnifiedFormWrapper } from '@/components/forms/UnifiedFormWrapper';
import { formSchemas } from '@/utils/formValidation';

function LoginForm() {
  const form = useForm({
    resolver: zodResolver(formSchemas.login),
    defaultValues: { email: '', password: '' }
  });

  const handleSubmit = async (data: any) => {
    const response = await authApi.login(data);
    return response;
  };

  return (
    <UnifiedFormWrapper
      formName="Login"
      form={form}
      onSubmit={() => handleSubmit(form.getValues())}
      successMessage="Login successful!"
    >
      <FormField
        control={form.control}
        name="email"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Email</FormLabel>
            <FormControl>
              <Input {...field} type="email" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      {/* More fields */}
      <Button type="submit">Login</Button>
    </UnifiedFormWrapper>
  );
}
```

### Advanced Error Handling

```typescript
function CustomForm() {
  const {
    submissionState,
    submitForm,
    clearErrors,
    addError
  } = useUnifiedFormHandler({
    formName: 'Custom Form',
    retryAttempts: 3,
    networkTimeout: 15000
  });

  const handleSubmit = async () => {
    // Custom validation
    if (!customValidation()) {
      addError({
        message: 'Custom validation failed',
        type: 'validation'
      });
      return;
    }

    const result = await submitForm(async () => {
      return await api.submitComplexForm(formData);
    }, {
      successMessage: 'Form submitted successfully!',
      onSuccess: (result) => {
        // Handle success
        navigate('/success');
      },
      onError: (error) => {
        // Handle specific errors
        if (error.type === 'authentication') {
          navigate('/login');
        }
      }
    });

    return result;
  };

  return (
    <form onSubmit={handleSubmit}>
      <FormErrorDisplay 
        errors={submissionState.errors}
        onRetry={() => handleSubmit()}
        onDismiss={(index) => clearErrors()}
      />
      {/* Form fields */}
    </form>
  );
}
```

## Validation System

Use the standardized validation schemas:

```typescript
import { formSchemas, validationRules } from '@/utils/formValidation';

// Pre-built schemas
const loginSchema = formSchemas.login;

// Custom schemas
const customSchema = z.object({
  username: validationRules.name,
  email: validationRules.email,
  customField: z.string().min(5, 'Custom field is too short')
});
```

## Error Messages

The system provides user-friendly error messages automatically:

- **Network errors**: "Network connection failed. Please check your internet connection and try again."
- **Authentication errors**: "Your session has expired. Please sign in again."
- **Server errors**: "Server error occurred. Please try again later."
- **Validation errors**: Field-specific messages based on validation rules

## Best Practices

1. **Always use the unified system** for new forms
2. **Provide meaningful success messages** to confirm actions
3. **Use appropriate retry attempts** (1-3 for most forms)
4. **Enable logging** in development for debugging
5. **Handle authentication errors** by redirecting to login
6. **Use loading overlays** for forms that take time to submit
7. **Categorize errors correctly** for better user experience

## Migration Guide

To migrate existing forms:

1. Import the unified form handler or wrapper
2. Replace custom error handling with the unified system
3. Update validation to use standardized schemas
4. Remove custom loading states and error displays
5. Test error scenarios thoroughly

## Error Retry Logic

The system includes automatic retry with exponential backoff:

- First retry: Immediate
- Second retry: After 2 seconds
- Third retry: After 4 seconds
- Configurable via `retryAttempts` option

## Accessibility

The error handling system includes:

- ARIA labels for error regions
- Screen reader announcements for errors
- Keyboard navigation support
- Color contrast compliance
- Focus management during error states

## Testing

Test forms with various error scenarios:

1. Network disconnection
2. Server errors (500, 503)
3. Authentication failures
4. Validation errors
5. Timeout scenarios
6. Success states

Use the browser dev tools to simulate network conditions and test error handling robustness.