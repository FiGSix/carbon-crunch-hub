# Standardized Loading Component System

This document outlines the unified loading component system designed to provide consistent loading states throughout the application.

## Overview

The loading system consists of several specialized components and utilities that work together to provide a cohesive user experience. All loading states now follow the same design patterns and animations.

## Core Components

### Basic Loading Components

#### `LoadingSpinner`
The most common loading indicator with optional text.

```tsx
import { LoadingSpinner } from '@/components/ui/loading';

// Basic usage
<LoadingSpinner />

// With custom size and text
<LoadingSpinner size="lg" text="Processing..." />
```

#### `LoadingDots`
Subtle animated dots for minimal UI elements.

```tsx
import { LoadingDots } from '@/components/ui/loading';

<LoadingDots size="sm" text="Syncing..." />
```

### Page-Level Components

#### `PageLoading`
Full-page loading state for route transitions.

```tsx
import { PageLoading } from '@/components/ui/loading-states';

// Full page loader
<PageLoading title="Loading dashboard..." description="Setting up your workspace" />

// Minimal version for smaller areas
<PageLoading minimal />
```

#### `SectionLoading`
Loading state for sections within a page.

```tsx
import { SectionLoading } from '@/components/ui/loading-states';

<SectionLoading title="Loading data..." rows={5} />
```

### Table and List Loading

#### `TableLoading`
Skeleton loader specifically designed for table structures.

```tsx
import { TableLoading } from '@/components/ui/loading-states';

<TableLoading 
  title="Loading client data..."
  columns={4}
  rows={5}
/>
```

#### `LoadingList`
Skeleton for list-based content.

```tsx
import { LoadingList } from '@/components/ui/loading-skeletons';

<LoadingList items={5} showHeader={true} />
```

### Interactive Components

#### `ButtonLoading`
Integrated loading state for buttons.

```tsx
import { ButtonLoading } from '@/components/ui/loading-states';

<Button disabled={isSubmitting}>
  <ButtonLoading 
    loading={isSubmitting}
    loadingText="Saving..."
  >
    Save Changes
  </ButtonLoading>
</Button>
```

#### `LoadingOverlay`
Overlay loading state for existing content.

```tsx
import { LoadingOverlay } from '@/components/ui/loading-wrapper';

<LoadingOverlay 
  isLoading={isProcessing}
  overlay="blur"
  text="Processing data..."
>
  <MyContent />
</LoadingOverlay>
```

### Smart Loading Wrapper

#### `LoadingState`
Comprehensive state manager that handles loading, error, and empty states.

```tsx
import { LoadingState } from '@/components/ui/loading-wrapper';

<LoadingState
  loading={isLoading}
  error={error}
  empty={!data?.length}
  loadingComponent={<TableLoading />}
  errorComponent={<MyErrorComponent />}
  emptyComponent={<MyEmptyState />}
>
  <MyDataComponent data={data} />
</LoadingState>
```

## Skeleton Components

### Structural Skeletons

#### `LoadingCard`
```tsx
import { LoadingCard } from '@/components/ui/loading-skeletons';

<LoadingCard hasHeader hasFooter rows={3} />
```

#### `LoadingGrid`
```tsx
import { LoadingGrid } from '@/components/ui/loading-skeletons';

<LoadingGrid items={6} columns={3} />
```

#### `LoadingForm`
```tsx
import { LoadingForm } from '@/components/ui/loading-skeletons';

<LoadingForm fields={4} hasSubmit />
```

## Migration Guide

### Replacing Existing Loading States

#### Old Pattern:
```tsx
// ❌ Inconsistent custom loading
{isLoading && (
  <div className="flex items-center justify-center p-4">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    <span className="ml-2">Loading...</span>
  </div>
)}
```

#### New Pattern:
```tsx
// ✅ Standardized loading component
<LoadingState loading={isLoading}>
  <MyContent />
</LoadingState>

// Or for inline loading
{isLoading && <LoadingSpinner text="Loading..." />}
```

### Button Loading States

#### Old Pattern:
```tsx
// ❌ Manual loading implementation
<Button disabled={isSubmitting}>
  {isSubmitting ? (
    <>
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      Saving...
    </>
  ) : (
    'Save'
  )}
</Button>
```

#### New Pattern:
```tsx
// ✅ Integrated button loading
<Button disabled={isSubmitting}>
  <ButtonLoading loading={isSubmitting} loadingText="Saving...">
    Save
  </ButtonLoading>
</Button>
```

### Page Loading

#### Old Pattern:
```tsx
// ❌ Custom page loader
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
      <p className="text-muted-foreground">Loading page...</p>
    </div>
  </div>
);
```

#### New Pattern:
```tsx
// ✅ Standardized page loading
const PageLoader = () => <PageLoading minimal />;

// Or with custom messaging
<PageLoading 
  title="Loading dashboard..."
  description="Setting up your workspace"
/>
```

## Component Props Reference

### Common Props

- `size`: `'xs' | 'sm' | 'md' | 'lg' | 'xl'` - Controls the size of loading indicators
- `className`: `string` - Additional CSS classes
- `text`: `string` - Optional text to display alongside loading indicator

### LoadingOverlay Props

- `isLoading`: `boolean` - Whether to show the overlay
- `overlay`: `'blur' | 'dim' | 'solid'` - Type of overlay effect
- `spinnerSize`: `'sm' | 'md' | 'lg'` - Size of the loading spinner

### LoadingState Props

- `loading`: `boolean` - Loading state
- `error`: `string | null` - Error message
- `empty`: `boolean` - Whether data is empty
- `loadingComponent`: `ReactNode` - Custom loading component
- `errorComponent`: `ReactNode` - Custom error component
- `emptyComponent`: `ReactNode` - Custom empty state component

## Best Practices

### 1. Choose the Right Component

- **Page transitions**: Use `PageLoading`
- **Section updates**: Use `SectionLoading`
- **Table data**: Use `TableLoading`
- **Button actions**: Use `ButtonLoading`
- **General content**: Use `LoadingState`

### 2. Consistent Sizing

- Use `size="sm"` for compact UI elements
- Use `size="md"` (default) for standard components
- Use `size="lg"` for prominent loading states

### 3. Meaningful Text

Always provide context-appropriate loading text:
```tsx
// ✅ Good - specific and helpful
<LoadingSpinner text="Saving your changes..." />

// ❌ Avoid - generic and unhelpful
<LoadingSpinner text="Loading..." />
```

### 4. Skeleton Matching

When using skeleton loaders, match the structure of your actual content:
```tsx
// For a card with header and 3 content rows
<LoadingCard hasHeader rows={3} />

// For a 4-column table with 5 data rows
<TableLoading columns={4} rows={5} />
```

## Animation Guidelines

All loading components use consistent animations:

- **Spinners**: Smooth 1-second rotation
- **Dots**: 450ms staggered pulse animation
- **Skeletons**: 2-second pulse animation
- **Overlays**: 200ms fade transition

These animations are optimized for performance and accessibility, respecting `prefers-reduced-motion` settings.

## Accessibility

All loading components include proper accessibility features:

- Screen reader announcements for state changes
- Respect for reduced motion preferences
- Proper ARIA labels and roles
- Focus management during loading states

## Performance Considerations

- Loading components are lightweight and optimized
- Skeleton loaders prevent layout shift
- Animations use CSS transforms for optimal performance
- Components are tree-shakeable for smaller bundle sizes