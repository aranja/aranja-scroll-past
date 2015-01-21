var browserify = require('browserify');
var connect = require('gulp-connect');
var gulp = require('gulp');
var notify = require('gulp-notify');
var source = require('vinyl-source-stream');


gulp.task('build', function() {
  function handleErrors() {
    notify.onError({
      title: "Compile Error",
      message: "<%= error.message %>"
    }).apply(this, arguments);
    this.emit('end');
  }

  return browserify({
    entries: ['./index.js'],
    debug: process.env.DEV
  })
    .bundle()
    .on('error', handleErrors)
    .pipe(source('auto-hide.js'))
    .pipe(gulp.dest('dist'))
    .pipe(connect.reload());
});


gulp.task('examples', ['build', 'watch'], function() {
  connect.server({
    root: ['.'],
    port: 12345,
    livereload: true
  });
});


gulp.task('watch', function() {
  gulp.watch([
      '*.js',
      'lib/*'
  ], ['build']);
});
