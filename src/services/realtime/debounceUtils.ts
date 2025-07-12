/**
 * Debouncing utilities for realtime updates
 */
export class DebounceUtils {
  private static updateTimeouts = new Map<string, NodeJS.Timeout>();
  
  /**
   * Debounce updates to prevent excessive re-renders
   */
  static debounceUpdate(
    key: string, 
    callback: (payload: any) => void, 
    payload: any, 
    delay = 500
  ) {
    // Clear existing timeout
    const existingTimeout = this.updateTimeouts.get(key);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Set new timeout
    const timeout = setTimeout(() => {
      callback(payload);
      this.updateTimeouts.delete(key);
    }, delay);

    this.updateTimeouts.set(key, timeout);
  }

  /**
   * Clear all pending debounced updates
   */
  static clearAllDebounces() {
    for (const timeout of this.updateTimeouts.values()) {
      clearTimeout(timeout);
    }
    this.updateTimeouts.clear();
  }
}