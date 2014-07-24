'use strict';
var $ = require('jquery');

/**
 * Hide and show fixed elements when scrolling.
 * @param el
 * @param options
 * @constructor
 */
function ScrollPast(el, options) {
  this.el = $(el);
  this.target = $(el.hash);

  this.timer = null;
  this.isScrolling = false;
  this.onScroll = this.onScroll.bind(this);
  this._endScroll = this._endScroll.bind(this);

  this.elPosition = 0;
  this.elHeight = this.el.height();


  options = $.extend({}, ScrollPast.DEFAULTS, options, this.el.data());
  this.appearOffset = parseInt(options.appearOffset, 10);
  this.multiplier = parseFloat(options.multiplier);
  this.scrollTimeout = parseInt(options.scrollTimeout, 10);
  this._findViewport(options.viewport);
  this.init();
}

/**
 * Default Options
 * @type {Object}
 */
ScrollPast.DEFAULTS = {
  multiplier: 1,
  appearOffset: 0,
  scrollTimeout: 300,
  viewport: 'closest'
};

ScrollPast.prototype._findViewport = function(viewportSel) {
  if (viewportSel === 'window') {
    this.viewportEl = $(window);
  } else if (viewportSel === 'closest') {
    var parents = this.el.parents();
    for (var i = 0, el; (el = parents.eq(i)).length; i++) {
      var overflow = el.css('overflow'),
          overflowY = el.css('overflow-y');

      if (overflow === 'scroll' || overflow === 'auto' ||
          overflowY === 'scroll' || overflowY === 'auto') {
        this.viewportEl = el;
        break;
      }
    }

    if (!this.viewportEl) {
      this.viewportEl = $(window);
    }
  } else {
    this.viewportEl = $(viewportSel);
  }
};

ScrollPast.prototype.init = function() {
  this.viewportEl.on('scroll.aranja.scrollpast', this.onScroll);
};

ScrollPast.prototype._beginScroll = function() {
  // Stop animations and record current position.
  this.el.stop();
  this.scrollStart = this.viewportEl.scrollTop();
  this.elHeight = this.el.height();
  this.elStart = this.elPosition;
  if (this.elPosition >= this.elHeight) {
    this.elStart += this.appearOffset;
  }

  this.isScrolling = true;
};

ScrollPast.prototype._endScroll = function() {
  this.isScrolling = false;
  this.timer = null;

  if (this.elPosition < this.elHeight / 2) {
    this.elPosition = 0;
  } else {
    this.elPosition = this.elHeight;
  }
  this.el.css('transform', 'translate3d(0, ' + (-this.elPosition) + 'px, 0)');
};

/**
 * Scroll Event Handler
 */
ScrollPast.prototype.onScroll = function() {
  if (!this.isScrolling) {
    this._beginScroll();
  } else {
    var scrollPosition = this.viewportEl.scrollTop();
    var scrollDelta = scrollPosition - this.scrollStart;
    this.elPosition = Math.max(0, Math.min(this.elHeight, this.elStart + scrollDelta * this.multiplier));
    this.el.css('transform', 'translate3d(0, ' + (-this.elPosition) + 'px, 0)');
  }

  if (this.timer) {
    clearTimeout(this.timer);
  }
  this.timer = setTimeout(this._endScroll, this.scrollTimeout);
};


// jQuery plugin
$.fn.scrollPast = function(options) {
  return this.each(function() {
    var el = $(this);
    var data = el.data('aranja.scrollpast');
    var opts = typeof options === 'object' && options;

    if (!data) { el.data('aranja.scrollpast', (data = new ScrollPast(el, opts))); }
    if (typeof options == 'string') { data[options](); }
  });
};


// Data attributes
$(function() {
  $('[data-scroll-past]').scrollPast();
});
