'use strict';
var $ = require('jquery');
var transition = require('./transition');
var domChange = require('./domchange');

/**
 * Hide and show fixed elements when scrolling.
 * @param el
 * @param options
 * @constructor
 */
function AutoHide(el, options) {
  this.el = $(el);

  // Option processing.
  options = $.extend({}, AutoHide.DEFAULTS, options, this.el.data());
  this.appearOffset = parseInt(options.appearOffset, 10);
  this.direction = this._findDirection(options.edge);
  this.multiplier = parseFloat(options.multiplier);
  this.scrollTimeout = parseInt(options.scrollTimeout, 10);
  this.scrollOffsetThreshold = options.scrollOffsetThreshold;
  this.transitionDuration = parseInt(options.transitionDuration, 10);
  this.transitionEasing = options.transitionEasing;
  this.viewportEl = this._findViewport(options.viewport);

  // Instance variables
  this.scrollSessionTimeout = null;
  this.isAnimating = false;
  this.visibility = 1;
  this.elHeight = null;
  this.maxScroll = null;
  this.scrollRangeVisible = 0;
  this.scrollRangeHidden = 0;
  this.scrollRangeOffset = 0;

  // Prebind callback handlers.
  this._onScroll = this._onScroll.bind(this);
  this._endScrollSession = this._endScrollSession.bind(this);

  // Start the plugin
  this.init();
}

/**
 * Default Options
 * @type {Object}
 */
AutoHide.DEFAULTS = {
  appearOffset: 0,
  edge: 'auto',
  multiplier: 1,
  scrollTimeout: 500,
  scrollOffsetThreshold: 0,
  transitionDuration: 300,
  transitionEasing: 'ease',
  viewport: 'closest'
};

/**
 * Find the specified viewport to monitor scrolling in.
 * @private
 */
AutoHide.prototype._findViewport = function(viewportSel) {
  if (viewportSel === 'window') {
    return $(window);
  } else if (viewportSel === 'closest') {
    var parents = this.el.parents();
    for (var i = 0, el; (el = parents.eq(i)).length; i++) {
      var overflow = el.css('overflow'),
        overflowY = el.css('overflow-y');

      if (overflow === 'scroll' || overflow === 'auto' ||
        overflowY === 'scroll' || overflowY === 'auto') {
        return el;
      }
    }
    return $(window);
  } else {
    return $(viewportSel);
  }
};

AutoHide.prototype._findDirection = function(edge) {
  if (edge === 'top') {
    return -1;
  } else if (edge === 'bottom') {
    return 1;
  } else {
    return -1;
  }
};

AutoHide.prototype.init = function() {
  this.viewportEl.on('scroll.aranja.autohide', this._onScroll);

  this._onScroll();
};

AutoHide.prototype.dispose = function() {
  this.viewportEl.off('.aranja.autohide');
  this.el.css('transform', '');
};

/**
 * Sets the desired visibility with or without animation.
 */
AutoHide.prototype.setVisibility = function(visibility, animate) {
  // Check if the visibility is valid.
  var elHidden = (1 - visibility) * this.elHeight / this.multiplier;
  var scrollPosition = this.viewportEl.scrollTop();
  if (elHidden > scrollPosition) {
    visibility = 1 - scrollPosition / (this.elHeight / this.multiplier);
  }

  // Update the visibility
  this.visibility = visibility;
  this._updateVisibility(animate);
};

/**
 * Calculates visibility based on a new scroll position.
 * @private
 */
AutoHide.prototype._visibilityFromScroll = function(scrollPosition) {
  // Snap the scroll range if we cross it.
  if (scrollPosition < this.scrollRangeVisible) {
    this._resetScrollRange(scrollPosition, false);
  } else if (scrollPosition > this.scrollRangeOffset) {
    this._resetScrollRange(scrollPosition, true);
  }

  // Calculate where the scroll falls in the visibility range.
  return 1 - Math.min(1, Math.max(0, (scrollPosition - this.scrollRangeVisible) / (this.elHeight / this.multiplier)));
};

/**
 * Calculates a new range of visibility and offset for scrolling inside based on a
 * specified scroll position. 
 * If `isPastOffset` is false, the new range will be fully visible based on the
 * scroll position, otherwise it will be fully hidden with offset.
 * on 
 * @private
 */
AutoHide.prototype._resetScrollRange = function(scrollPosition, isPastOffset) {
  // Start by calculating a scroll position where the el is fully visible.
  this.scrollRangeVisible = scrollPosition;
  if (isPastOffset) {
    this.scrollRangeVisible -= this.elHeight / this.multiplier + this.appearOffset;
  }

  // Make sure visibility is reachable
  if (this.scrollRangeVisible < 0) {
    this.scrollRangeVisible = 0;
  }

  // Calculate the range.
  this.scrollRangeHidden = this.scrollRangeVisible + this.elHeight / this.multiplier;
  this.scrollRangeOffset = this.scrollRangeHidden + this.appearOffset;
};

/**
 * Cache some useful DOM properties for a new scroll session.
 */
AutoHide.prototype._startScrollSession = function() {
  // Cache some useful DOM properties for each scroll session.
  this.elHeight = this.el.outerHeight();
  this.maxScroll = this._getViewportMaxScroll();

  // Recalculate scroll range based on updated height. Expect
  // previous scroll range to be otherwise correct.
  var isHidden = this.visibility < 0.5;
  this._resetScrollRange(isHidden ? this.scrollRangeOffset : this.scrollRangeVisible, isHidden);
};

/**
 * When a scroll session is finished, push the el to appear or disappear.
 * @private
 */
AutoHide.prototype._endScrollSession = function() {
  // Not scrolling anymore.
  this.scrollSessionTimeout = null;

  // Are we more visible than not?
  var isVisible = this.visibility > 0.5;

  // Only animate if we're not fully visible or hidden.
  var needsChange = this.visibility > 0 && this.visibility < 1;

  // Update the scroll range.
  this._resetScrollRange(this.viewportEl.scrollTop(), !isVisible);

  // Snap visibility.
  if (needsChange) {
    if (isVisible) {
      this.setVisibility(1, true);
    } else {
      this.setVisibility(0, true);
    }
  }
};

/**
 * Scroll Event Handler
 * @private
 */
AutoHide.prototype._onScroll = function() {
  // Don't process scroll during animation.
  if (this.isAnimating) {
    return;
  }

  // Conditionally start scroll session.
  var isNewScrollSession = !this.scrollSessionTimeout;
  if (isNewScrollSession) {
    this._startScrollSession();
  }

  // Get scroll position.
  var scrollPosition = Math.max(0, Math.min(this.maxScroll, this.viewportEl.scrollTop()));

  // Only proceed if past certain scroll threshold
  if (this.scrollOffsetThreshold >= this.elHeight && scrollPosition <= this.scrollOffsetThreshold) {
    return;
  }

  // Calculate visibility
  var oldVisibility = this.visibility;
  this.visibility = this._visibilityFromScroll(scrollPosition);

  // Special case when visibility is fully changed in a single scroll event. Useful for iOS and page load pre-scrolled.
  var shouldAnimate = this.visibility === 0 && oldVisibility === 1 || this.visibility === 1 && oldVisibility === 0;

  // Update visuals in next rAF.
  var that = this;
  domChange(function() {
    that._updateVisibility(shouldAnimate);
  });

  // Reset scroll timeout.
  clearTimeout(this.scrollSessionTimeout);
  this.scrollSessionTimeout = setTimeout(this._endScrollSession, this.scrollTimeout);
};

/**
 * Updates visibility in the DOM, with or without animation.
 * @private
 */
AutoHide.prototype._updateVisibility = function(animate) {
  var elMoved = this.elHeight * (1 - this.visibility);
  this.el.css('transform', 'translate3d(0, ' + (this.direction * elMoved) + 'px, 0)');

  if (animate) {
    var that = this;

    this.isAnimating = true;
    transition(this.el[0], this.transitionDuration, this.transitionEasing, function() {
      that.isAnimating = false;
    });
  }
};

/**
 * Returns the maximum scrollTop value that should be returned for the viewport.
 * @private
 */
AutoHide.prototype._getViewportMaxScroll = function() {
  var viewportHeight = this.viewportEl.height();
  var contentHeight = this.viewportEl[0] === window ?
      document.body.scrollHeight :
      this.viewportEl[0].scrollHeight;
  return contentHeight - viewportHeight;
};


/**
 * jQuery plugin
 */
$.fn.autoHide = function(options) {
  return this.each(function() {
    var el = $(this);
    var data = el.data('aranja.autohide');
    var opts = typeof options === 'object' && options;

    if (!data) { el.data('aranja.autohide', (data = new AutoHide(el, opts))); }
    if (typeof options == 'string') { data[options](); }
  });
};


/**
 * Data API
 */
$(function() {
  $('[tux-autohide]').autoHide();
});


/**
 * CommonJS export
 */
module.exports = AutoHide;
