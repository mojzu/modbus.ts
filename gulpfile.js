"use strict";
const path = require("path");
const gulp = require("gulp");
const gutil = require("gulp-util");
const clean = require("./gulp/clean.js");
const shell = require("./gulp/shell.js");

// Library package path and file.
const packagePath = path.resolve(__dirname);
const packageJson = require("./package.json");

// Delete compiled files.
gulp.task("clean", (done) => {
  clean.run(packagePath, [
    "coverage",
    "*.tgz",
    "*.log",
    "test.d.ts",
    "test.js.map",
    "test.js",
    "index.d.ts",
    "index.js.map",
    "index.js",
    "examples/**/*.d.ts",
    "examples/**/*.js",
    "examples/**/*.js.map",
    "src/**/*.d.ts",
    "src/**/*.js",
    "src/**/*.js.map",
  ], done);
});

// Clean and delete modules generated documentation.
gulp.task("distclean", ["clean"], (done) => {
  clean.run(packagePath, ["node_modules"], done);
});

// Run TypeScript compiler.
gulp.task("tsc", ["clean"], (done) => {
  shell.run("tsc", packagePath, done);
});

// Run tests with coverage reporting.
gulp.task("test", ["tsc"], (done) => {
  shell.run("istanbul cover test.js -x \"**/*.spec.js\"", packagePath, done);
});

// Run linter.
gulp.task("lint", (done) => {
  shell.run("tslint -c tslint.json -p tsconfig.json", packagePath, done);
});

// Run example.
gulp.task("example", ["tsc"], (done) => {
  const file = gutil.env.f || gutil.env.file;
  const port = gutil.env.p || gutil.env.port;
  shell.run(`node ./examples/${file}.js ${port}`, packagePath, done);
});

// Build library.
gulp.task("build", ["test", "lint"], (done) => {
  shell.run("npm pack", packagePath, done);
});
