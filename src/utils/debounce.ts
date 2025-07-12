/**
 * Simple debounce utility to replace lodash dependency
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): T & { cancel: () => void } {
  let timeoutId: ReturnType<typeof setTimeout>;
  let cancelled = false;

  const debounced = (...args: Parameters<T>) => {
    if (cancelled) return;
    
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      if (!cancelled) {
        func.apply(this, args);
      }
    }, delay);
  };

  debounced.cancel = () => {
    cancelled = true;
    clearTimeout(timeoutId);
  };

  return debounced as T & { cancel: () => void };
}