var QUnit = require("qunitjs");
global.QUnit = QUnit;
global.craftyFactory = require("./src/crafty-headless.js");
global.Crafty = global.craftyFactory();

// Load tests
require("./tests/unit/common.js");
require("./tests/unit/core/core.js");
require("./tests/unit/core/events.js");
require("./tests/unit/core/model.js");
require("./tests/unit/core/scenes.js");
require("./tests/unit/core/storage.js");
require("./tests/unit/core/time.js");
require("./tests/unit/core/tween.js");
require("./tests/unit/core/animation.js");
require("./tests/unit/graphics/particles.js");

QUnit.on("runEnd", function(results) {
  console.log("\n=== Test Results ===");
  console.log("Tests: " + results.testCounts.total);
  console.log("Passed: " + results.testCounts.passed);
  console.log("Failed: " + results.testCounts.failed);
  process.exit(results.testCounts.failed > 0 ? 1 : 0);
});

QUnit.on("testEnd", function(testEnd) {
  if (testEnd.status === "failed") {
    console.log("\nFAILED: " + testEnd.name);
    testEnd.errors.forEach(function(error) {
      console.log("  " + error.message);
      if (error.expected !== undefined)
        console.log("  Expected: " + JSON.stringify(error.expected));
      if (error.actual !== undefined)
        console.log("  Actual: " + JSON.stringify(error.actual));
    });
  }
});

QUnit.start();
