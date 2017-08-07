/// <reference types="node" />
const JASMINE = require("jasmine");
const SPECS = new JASMINE();

// Run tests for compiled `*.spec.js` files
SPECS.loadConfig({
  spec_files: [
    "pdu/**/*[spec].js",
    "rtu/**/*[spec].js",
    "tcp/**/*[spec].js",
  ],
});
SPECS.configureDefaultReporter({ showColors: true });
SPECS.execute();
