/**
 *
 * @param {...any} args
 */
export function debug(...args) {
  if (process.env.DEBUG || process.env.NODE_ENV === 'development') {
    console.log(...args);
  }
}

/**
 *
 * @param {...any} args
 */
export function info(...args) {
  console.log(...args);
}

/**
 *
 * @param {...any} args
 */
export function error(...args) {
  console.error(...args);
}