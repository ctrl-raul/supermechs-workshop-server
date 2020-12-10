/**
 * @param {string} name          Name of environment variable.
 * @param {string} default_value Default value (if not provided throws an error in the absence of the variable).
 */
function env (name: string, default_value?: string): string {

  // @ts-ignore
  const value = process.env[name];

  if (typeof value === 'string') {
    return value;
  }

  if (typeof default_value === 'string') {
    return default_value;
  }

  throw new Error(`Missing: process.env['${name}']`);
}

export default env;
