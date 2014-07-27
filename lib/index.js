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
  this.target = $(el.hash);

  // Instance variables
  this.timer = null;
  this.isAnimating = false;
  this.isScrolling = false;
  this.scrollStart = 0;
  this.elStart = 0;
  this.elPosition = 0;
  this.elHeight = this.el.height();

  // Prebind callback handlers.
  this.onScroll = this.onScroll.bind(this);
  this._endScroll = this._endScroll.bind(this);
  this._finishedTransition = this._finishedTransition.bind(this);

  // Option processing.
  options = $.extend({}, ScrollPast.DEFAULTS, options, this.el.data());
  this.appearOffset = parseInt(options.appearOffset, 10);
  this.direction = this._findDirection(options.edge);
  this.multiplier = parseFloat(options.multiplier);
  this.scrollTimeout = parseInt(options.scrollTimeout, 10);
  this.transitionDuration = parseInt(options.transitionDuration, 10);
  this.transitionEasing = options.transitionEasing;
  this.viewportEl = this._findViewport(options.viewport);

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
  this.viewportEl.on('scroll.aranja.scrollpast', this.onScroll);
};

ScrollPast.prototype._beginScroll = function() {
  // Record current position.
  this.scrollStart = this.viewportEl.scrollTop();
  this.elHeight = this.el.height();
  this.elStart = this.elPosition;
  if (this.elPosition >= this.elHeight) {
    this.elStart += this.appearOffset;
  }

  this.isScrolling = true;
};

/**
 * When a scroll session is finished, push the el to appear or disappear.
 * @private
 */
ScrollPast.prototype._endScroll = function() {
  // Reset state.
  this.isScrolling = false;
  this.timer = null;

  // No more processing required if we're already fully hidden or visible.
  if (this.elPosition <= 0 || this.elPosition >= this.elHeight) {
    return;
  }

  // Snap to whichever state is closer.
  if (this.elPosition < this.elHeight / 2) {
    this.elPosition = 0;
  } else {
    this.elPosition = this.elHeight;
  }

  // Transition
  this.isAnimating = true;
  this._updateAppearance();
  transition(this.el[0], this.transitionDuration, this.transitionEasing, this._finishedTransition);
};

/**
 * After transition, reset state to accept user actions.
 * @private
 */
ScrollPast.prototype._finishedTransition = function() {
  this.isAnimating = false;
};

/**
 * Updates the visibility of the element. Makes sure that it is always visible at top of the
 * viewport.
 * @private
 */
ScrollPast.prototype._updateAppearance = function() {
  // Validate that we're visible at top of page.
  var scrollPosition = this.viewportEl.scrollTop();
  if (scrollPosition < this.elPosition / this.multiplier) {
    this.elPosition = Math.max(0, scrollPosition) * this.multiplier;
  }

  this.el.css('transform', 'translate3d(0, ' + (this.direction * this.elPosition) + 'px, 0)');
};

/**
 * Scroll Event Handler
 */
ScrollPast.prototype.onScroll = function() {
  // Don't process scrolling when animating.
  if (this.isAnimating) {
    return;
  }

  if (!this.isScrolling) {
    this._beginScroll();
  } else {
    var scrollPosition = this.viewportEl.scrollTop();
    var scrollDelta = scrollPosition - this.scrollStart;

    this.elPosition = this.elStart + scrollDelta * this.multiplier;
    if (this.elPosition < 0) {
      this.elPosition = 0;
      this.elStart = 0;
      this.scrollStart = scrollPosition;
    }
    if (this.elPosition > this.elHeight + this.appearOffset) {
      this.elPosition = this.elHeight;
      this.elStart = this.elPosition + this.appearOffset;
      this.scrollStart = scrollPosition;
    }
    this._updateAppearance();
  }

  // Reset scroll timeout.
  if (this.timer) {
    clearTimeout(this.timer);
  }
  this.timer = setTimeout(this._endScroll, this.scrollTimeout);
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
