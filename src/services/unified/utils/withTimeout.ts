/**
 * Wraps a promise with a timeout to prevent hanging indefinitely
 * @param promise - The promise to wrap
 * @param ms - Timeout in milliseconds (default: 12000)
 * @returns The promise result or throws timeout error
 */
export async function withTimeout<T>(
  promise: Promise<T>, 
  ms = 12000
): Promise<T> {
  return await Promise.race([
    promise,
    new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error('Request timed out')), ms)
    )
  ]);
}
