'use strict';
var $ = require('jquery');
var transition = require('./transition');

/**
 * Hide and show fixed elements when scrolling.
 * @param el
 * @param options
 * @constructor
 */
function ScrollPast(el, options) {
  this.el = $(el);

  // Option processing.
  options = $.extend({}, ScrollPast.DEFAULTS, options, this.el.data());
  this.appearOffset = parseInt(options.appearOffset, 10);
  this.direction = this._findDirection(options.edge);
  this.multiplier = parseFloat(options.multiplier);
  this.scrollTimeout = parseInt(options.scrollTimeout, 10);
  this.transitionDuration = parseInt(options.transitionDuration, 10);
  this.transitionEasing = options.transitionEasing;
  this.viewportEl = this._findViewport(options.viewport);

  // Instance variables
  this.scrollSessionTimeout = null;
  this.isAnimating = false;
  this.elPosition = 0;
  this.visibility = 1;
  this.elHeight = null;
  this.maxScroll = null;
  this._resetScrollRange(0, false);
  this.scrollStart = 0;

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
ScrollPast.DEFAULTS = {
  appearOffset: 0,
  edge: 'auto',
  multiplier: 1,
  scrollTimeout: 500,
  transitionDuration: 300,
  transitionEasing: 'ease',
  viewport: 'closest'
};

/**
 * Find the specified viewport to monitor scrolling in.
 * @private
 */
ScrollPast.prototype._findViewport = function(viewportSel) {
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

ScrollPast.prototype._findDirection = function(edge) {
  if (edge === 'top') {
    return -1;
  } else if (edge === 'bottom') {
    return 1;
  } else if (this.el.css('bottom') !== 'auto') {
    return 1;
  } else {
    return -1;
  }
};

ScrollPast.prototype.init = function() {
  this.viewportEl.on('scroll.aranja.scrollpast', this._onScroll);

  this._onScroll();
};

/**
 * Sets the desired visibility with or without animation.
 */
ScrollPast.prototype.setVisibility = function(visibility, animate) {
  // Check if the visibility is valid.
  var elHidden = (1 - visibility) * this.elHeight / this.multiplier;
  var scrollPosition = this.viewportEl.scrollTop();
  if (elHidden > scrollPosition) {
    visibility = 1 - scrollPosition / (this.elHeight / this.multilier);
  }

  // Update the visibility
  this.visibility = visibility;
  this._updateVisibility(animate);
};

/**
 * Calculates visibility based on a new scroll position.
 * @private
 */
ScrollPast.prototype._visibilityFromScroll = function(scrollPosition) {
  // Snap the scroll range if we cross it.
  if (scrollPosition < this.scrollRangeVisible) {
    this._resetScrollRange(scrollPosition, false);
  } else if (scrollPosition > this.scrollRangeOffset) {
    this._resetScrollRange(scrollPosition, true);
  }

  // Calculate where the scroll falls in the visibility range.
  return 1 - Math.min(1, Math.max(0, (scrollPosition - this.scrollRangeVisible) / this.elHeight));
};

/**
 * Calculates a new range of visibility and offset for scrolling inside based on a
 * specified scroll position. 
 * If `isPastOffset` is false, the new range will be fully visible based on the
 * scroll position, otherwise it will be fully hidden with offset.
 * on 
 * @private
 */
ScrollPast.prototype._resetScrollRange = function(scrollPosition, isPastOffset) {
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
ScrollPast.prototype._startScrollSession = function() {
  // Cache some useful DOM properties for each scroll session.
  this.elHeight = this.el.height();
  this.maxScroll = this._getViewportMaxScroll();
};

/**
 * When a scroll session is finished, push the el to appear or disappear.
 * @private
 */
ScrollPast.prototype._endScrollSession = function() {
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
ScrollPast.prototype._onScroll = function() {
  // Don't process scroll during animation.
  if (this.isAnimating) {
    return;
  }

  // Conditionally start scroll session.
  var isNewScrollSession = !this.scrollSessionTimeout;
  if (isNewScrollSession) {
    this._startScrollSession();
  }

  // Update scroll position.
  var scrollPosition = Math.max(0, Math.min(this.maxScroll, this.viewportEl.scrollTop()));

  // Calculate visibility
  var oldVisibility = this.visibility;
  this.visibility = this._visibilityFromScroll(scrollPosition);

  // Special case when visibility is fully changed in a single scroll event. Useful for iOS and page load pre-scrolled.
  var shouldAnimate = this.visibility === 0 && oldVisibility === 1 || this.visibility === 1 && oldVisibility === 0;

  // Update visuals.
  this._updateVisibility(shouldAnimate);

  // Reset scroll timeout.
  clearTimeout(this.scrollSessionTimeout);
  this.scrollSessionTimeout = setTimeout(this._endScrollSession, this.scrollTimeout);
};

/**
 * Updates visibility in the DOM, with or without animation.
 * @private
 */
ScrollPast.prototype._updateVisibility = function(animate) {
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

ScrollPast.prototype._getViewportMaxScroll = function() {
  var viewportHeight = this.viewportEl.height();
  var contentHeight = this.viewportEl[0] === window ?
      document.body.scrollHeight :
      this.viewportEl[0].scrollHeight;
  return contentHeight - viewportHeight;
};


/**
 * jQuery plugin
 */
$.fn.scrollPast = function(options) {
  return this.each(function() {
    var el = $(this);
    var data = el.data('aranja.scrollpast');
    var opts = typeof options === 'object' && options;

    if (!data) { el.data('aranja.scrollpast', (data = new ScrollPast(el, opts))); }
    if (typeof options == 'string') { data[options](); }
  });
};


/**
 * Data API
 */
$(function() {
  $('[data-scroll-past]').scrollPast();
});
