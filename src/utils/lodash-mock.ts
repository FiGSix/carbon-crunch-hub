// Temporary mock for lodash to prevent import errors
// This handles any dependencies that might be importing lodash internally

const get = (obj: any, path: string | string[] | number, defaultValue?: any) => {
  if (!obj || (!path && path !== 0)) return defaultValue;
  
  const pathArray = Array.isArray(path) ? path : path.toString().split('.');
  let result = obj;
  
  for (const key of pathArray) {
    if (result == null) return defaultValue;
    result = result[key];
  }
  
  return result !== undefined ? result : defaultValue;
};

// Export both named and default exports to handle different import styles
export { get };
export default {
  get
};