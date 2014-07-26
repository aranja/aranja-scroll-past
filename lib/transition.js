// Test div
var div = document.createElement('div');


/**
 * Helper function to get the proper vendor property name.
 * (`transition` => `WebkitTransition`)
 */
function getVendorPropertyName(prop) {
  // Handle unprefixed versions (FF16+, for example)
  if (prop in div.style) return prop;

  var prefixes = ['Moz', 'Webkit', 'O', 'ms'];
  var propCapped = prop.charAt(0).toUpperCase() + prop.substr(1);

  for (var i = 0; i < prefixes.length; i++) {
    var vendorProp = prefixes[i] + propCapped;
    if (vendorProp in div.style) { return vendorProp; }
  }
}

// Prepare vendor prefixed property names.
var transitionProp = getVendorPropertyName('transition');
var transformProp = getVendorPropertyName('transform');

/**
 *
 */
function getTransition(duration, easing) {
  return transformProp + ' ' + duration + 'ms ' + easing;
}

/**
 * A super simple transition helper for transitioning the transform property.
 * Handles browser prefixes for transition and transform property names.
 * Uses a setTimeout for the cb.
 * @param {Element} el DOM element to transition
 * @param {number} duration of transition in milliseconds
 * @param {string} easing any valid CSS easing
 * @param {function} callback when transition is done
 */
module.exports = function doTransition(el, duration, easing, callback) {
  // Backup any existing transition.
  var oldValue = el.style[transitionProp];

  // Apply the transition.
  el.style[transitionProp] = getTransition(duration, easing);

  // Wait until the transition finishes.
  // transitionend is unreliable (reference?), setTimeout is easier.
  setTimeout(function() {
    // Reset the old value.
    el.style[transitionProp] = oldValue;

    // Call the callback.
    callback();
  }, duration);
};
