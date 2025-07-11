import React, { useRef, useEffect } from 'react';

interface RenderTrackerProps {
  name: string;
  props?: Record<string, any>;
  enabled?: boolean;
}

/**
 * Development utility component to track component re-renders
 * Use this to identify performance bottlenecks during development
 * 
 * @example
 * function MyComponent({ data }) {
 *   return (
 *     <>
 *       <RenderTracker name="MyComponent" props={{ dataLength: data.length }} />
 *       <div>Component content...</div>
 *     </>
 *   );
 * }
 */
export const RenderTracker: React.FC<RenderTrackerProps> = ({ 
  name, 
  props, 
  enabled = process.env.NODE_ENV === 'development' 
}) => {
  const renderCount = useRef(0);
  const prevProps = useRef(props);

  useEffect(() => {
    if (!enabled) return;
    
    renderCount.current += 1;
    
    const propsChanged = JSON.stringify(prevProps.current) !== JSON.stringify(props);
    const logStyle = propsChanged ? 'color: orange; font-weight: bold;' : 'color: gray;';
    
    console.log(
      `%c🔄 ${name} rendered (${renderCount.current}x)`,
      logStyle,
      {
        propsChanged,
        currentProps: props,
        previousProps: prevProps.current
      }
    );
    
    prevProps.current = props;
  });

  // Don't render anything in production
  return enabled ? null : null;
};

/**
 * Higher-order component to automatically track renders
 * 
 * @example
 * const MyComponent = withRenderTracking('MyComponent', ({ data }) => (
 *   <div>Component content...</div>
 * ));
 */
export function withRenderTracking<P extends Record<string, any>>(
  componentName: string,
  Component: React.ComponentType<P>
) {
  const TrackedComponent = React.memo((props: P) => {
    return (
      <>
        <RenderTracker name={componentName} props={props} />
        <Component {...props} />
      </>
    );
  });

  TrackedComponent.displayName = `RenderTracked(${componentName})`;
  return TrackedComponent as React.ComponentType<P>;
}