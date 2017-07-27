"use strict";
const path = require("path");
const gutil = require("gulp-util");
const del = require("del");

module.exports = {
  /** Delete relative paths to absolute root. */
  run: (root, paths, done) => {
    const absolutePaths = paths.map((p) => path.join(root, p));

    del(absolutePaths).then(() => {
      gutil.log("[clean]", paths.join(", "));
      done();
    });
  },
};
