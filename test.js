const Jasmine = require("jasmine");
const jasmine = new Jasmine();

// Run tests for `*.spec.js` files
jasmine.loadConfig({
  spec_dir: "dist",
  spec_files: [
    // // Run individual tests by specifying file paths here.
    // "pdu/client.spec.js",

    // Run all tests.
    "**/*[spec].js",
  ],
});
jasmine.configureDefaultReporter({
  showColors: true,
});
jasmine.execute();
