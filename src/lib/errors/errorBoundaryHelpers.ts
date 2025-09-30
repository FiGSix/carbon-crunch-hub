import { type ComponentType, createElement } from 'react';
import { PageErrorBoundary } from '@/components/error/PageErrorBoundary';
import { FormErrorBoundary } from '@/components/error/FormErrorBoundary';
import { ComponentErrorBoundary } from '@/components/error/ComponentErrorBoundary';

/**
 * Higher-order component to wrap pages with error boundaries
 */
export function withPageErrorBoundary<P extends object>(
  Component: ComponentType<P>,
  pageName?: string
) {
  const WrappedComponent = (props: P) => {
    return createElement(
      PageErrorBoundary,
      { pageName, children: createElement(Component, props) }
    );
  };

  WrappedComponent.displayName = `withPageErrorBoundary(${Component.displayName || Component.name})`;
  return WrappedComponent;
}

/**
 * Higher-order component to wrap forms with error boundaries
 */
export function withFormErrorBoundary<P extends object>(
  Component: ComponentType<P>,
  formName?: string
) {
  const WrappedComponent = (props: P) => {
    return createElement(
      FormErrorBoundary,
      { formName, children: createElement(Component, props) }
    );
  };

  WrappedComponent.displayName = `withFormErrorBoundary(${Component.displayName || Component.name})`;
  return WrappedComponent;
}

/**
 * Higher-order component to wrap components with error boundaries
 */
export function withComponentErrorBoundary<P extends object>(
  Component: ComponentType<P>,
  componentName?: string
) {
  const WrappedComponent = (props: P) => {
    return createElement(
      ComponentErrorBoundary,
      { componentName, children: createElement(Component, props) }
    );
  };

  WrappedComponent.displayName = `withComponentErrorBoundary(${Component.displayName || Component.name})`;
  return WrappedComponent;
}

/**
 * Convenience exports for direct use in JSX
 */
export { PageErrorBoundary, FormErrorBoundary, ComponentErrorBoundary };