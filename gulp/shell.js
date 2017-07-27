"use strict";
const process = require("process");
const path = require("path");
const childProcess = require("child_process");
const gutil = require("gulp-util");

module.exports = {
  /**
   * Execute command as child process.
   * Adds Node binaries directory to PATH for usability.
   */
  run: (command, cwd, done) => {
    process.env.PATH += ";" + path.resolve("./node_modules/.bin");
    gutil.log("[shell]", command);

    childProcess.execSync(command, {
      stdio: [null, process.stdout, process.stderr],
      cwd: cwd,
    });

    done();
  },
};
