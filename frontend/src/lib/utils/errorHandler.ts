/**
 * Extract error message from various API response formats
 * Handles: strings, objects with error property, objects with errors property, and other objects
 */
export function extractErrorMessage(error: any, defaultMessage: string = 'An error occurred'): string {
  if (!error.response?.data) {
    return defaultMessage;
  }

  const data = error.response.data;

  // If data is a string, use it directly
  if (typeof data === 'string') {
    return data;
  }

  // If data has an error property
  if (data.error) {
    return typeof data.error === 'string' ? data.error : JSON.stringify(data.error);
  }

  // If data has an errors property (some endpoints use this)
  if (data.errors) {
    return typeof data.errors === 'string' ? data.errors : JSON.stringify(data.errors);
  }

  // Otherwise stringify the entire object
  return JSON.stringify(data);
}
