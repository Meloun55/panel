const babel = require('gulp-babel');
const concat = require('gulp-concat');
const cssmin = require('gulp-cssmin');
const del = require('del');
const exec = require('child_process').exec;
const gulp = require('gulp');
const gulpif = require('gulp-if');
const postcss = require('gulp-postcss');
const rev = require('gulp-rev');
const uglify = require('gulp-uglify-es').default;
const webpackStream = require('webpack-stream');
const webpackConfig = require('./webpack.config.js');

const argv = require('yargs')
    .default('production', false)
    .argv;

const paths = {
    manifest: './public/assets',
    assets: './public/assets/{css,scripts}/*.{css,js}',
    styles: {
        src: './resources/assets/styles/main.css',
        dest: './public/assets/css',
    },
    scripts: {
        src: './resources/assets/scripts/**/*.{js,vue}',
        watch: ['./resources/assets/scripts/**/*.{js,vue}', './resources/lang/locales.js'],
        dest: './public/assets/scripts',
    },
};

/**
 * Build un-compiled CSS into a minified version.
 */
function styles() {
    return gulp.src(paths.styles.src)
        .pipe(postcss([
            require('postcss-import'),
            require('tailwindcss')('./tailwind.js'),
            require('postcss-preset-env')({stage: 0}),
            require('autoprefixer'),
        ]))
        .pipe(gulpif(argv.production, cssmin()))
        .pipe(concat('bundle.css'))
        .pipe(rev())
        .pipe(gulp.dest(paths.styles.dest))
        .pipe(rev.manifest(paths.manifest + '/manifest.json', {merge: true, base: paths.manifest}))
        .pipe(gulp.dest(paths.manifest));
}

/**
 * Provides watchers.
 */
function watch() {
    gulp.watch(['./resources/assets/styles/**/*.css'], gulp.series(function cleanStyles() {
        return del(['./public/assets/css/**/*.css']);
    }, styles));
}

/**
 * Generate the language files to be consumed by front end.
 *
 * @returns {Promise<any>}
 */
function i18n() {
    return new Promise((resolve, reject) => {
        exec('php artisan vue-i18n:generate', {}, (err, stdout, stderr) => {
            return err ? reject(err) : resolve({ stdout, stderr });
        })
    })
}

/**
 * Generate the routes file to be used in Vue files.
 *
 * @returns {Promise<any>}
 */
function routes() {
    return new Promise((resolve, reject) => {
        exec('php artisan ziggy:generate resources/assets/scripts/helpers/ziggy.js', {}, (err, stdout, stderr) => {
            return err ? reject(err) : resolve({ stdout, stderr });
        });
    })
}

/**
 * Cleanup unused versions of hashed assets.
 */
function clean() {
    return del([paths.assets]);
}

exports.clean = clean;
exports.i18n = i18n;
exports.routes = routes;
exports.styles = styles;
exports.watch = watch;

gulp.task('components', gulp.parallel(i18n, routes));
gulp.task('default', gulp.series(clean, i18n, routes, styles));
