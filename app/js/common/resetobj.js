/*
 Object resetter helper function
 */


const defaultValue = {}; // default clean object

// Resets object to input parameter object
function resetObj(defaultObject = defaultValue) {
  return JSON.parse(JSON.stringify(defaultObject));;
}

module.exports = {
    resetObj: resetObj,
    resetObject: resetObj // extended function alias
}
