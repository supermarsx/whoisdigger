// jshint esversion: 8

// Default object
const defaultValue = {};

/*
  resetObj
    Resets an object to its default state
  parameters
    defaultObject (object) - default object
 */
function resetObj(defaultObject = defaultValue) {
  return JSON.parse(JSON.stringify(defaultObject));
}

module.exports = {
    resetObj: resetObj,
    resetObject: resetObj // extended function alias
};
