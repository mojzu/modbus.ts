import * as fuseBox from "fuse-box";
import * as path from "path";
import { clean } from "./fuse-tools/clean";
import { shell } from "./fuse-tools/shell";

// Current working directory.
const CWD = path.resolve(__dirname);

// Clean compiled files.
fuseBox.Sparky.task("clean", () => {
  return clean(CWD, [
    ".fusebox",
    "coverage",
    "*.tgz",
    "*.log",
    "index.d.ts",
    "index.js.map",
    "index.js",
    "adu",
    "pdu",
    "rtu",
    "tcp"
  ]);
});

// Clean and remove Node modules.
fuseBox.Sparky.task("distclean", ["clean"], () => {
  return clean(CWD, ["node_modules"]);
});

// Run TypeScript compiler.
fuseBox.Sparky.task("tsc", ["clean"], () => {
  return shell("tsc", CWD);
});

// Run TSLint linter.
fuseBox.Sparky.task("lint", () => {
  return shell("tslint -c tslint.json -p tsconfig.json", CWD);
});

// Run Jest tests with coverage.
fuseBox.Sparky.task("test", ["clean"], () => {
  return shell("jest --coverage", CWD);
});

// Build library for distribution.
fuseBox.Sparky.task("dist", ["lint", "test", "tsc"], () => {
  return shell("npm pack", CWD);
});
