
// Polyfill rAF
var rAF = window.requestAnimationFrame || window.mozRequestAnimationFrame ||
  window.webkitRequestAnimationFrame || window.msRequestAnimationFrame ||
  function(render) { setTimeout(render, 16); };

// In Edge, rAF needs to be bound to window, or it throws "Invalid calling object".
rAF = rAF.bind(window);

// Only one change allowed per frame.
var currentChange = null;

/**
 * Utility to delay dom change until next rendering frame, to avoid redundant
 * changes and reflow between scroll events.
 */
module.exports = function(change) {
  var newFrame = currentChange === null;

  // Store the newest change.
  currentChange = change;

  // Only schedule one rAF to run the change.
  if (newFrame) {
    rAF(function() {
      currentChange();
      currentChange = null;
    });
  }
};
