// Default object
const defaultValue = {};

/*
  resetObj
    Resets an object to its default state
  parameters
    defaultObject (object) - default object
 */
export function resetObj<T>(defaultObject: T = defaultValue as T): T {
  return structuredClone(defaultObject);
}

export const resetObject = resetObj; // extended function alias

export default resetObj;
