(function() {
  var module = QUnit.module;
  var test = QUnit.test;

  module("Storage");

  test("get a value", function(_) {
    Crafty.storage("name", "test");
    var name = Crafty.storage("name");

    _.strictEqual(name, "test", "the values should be equal");

    Crafty.storage.remove("name");
  });

  test("get null when a value does not exist", function(_) {
    var name = Crafty.storage("notexisting");
    _.strictEqual(name, null, "should be null");
  });

  test("remove an value", function(_) {
    Crafty.storage("person", "test");
    _.strictEqual(Crafty.storage("person"), "test", "person should be defined");

    Crafty.storage.remove("person");

    var savedperson = Crafty.storage("person");
    _.strictEqual(
      savedperson,
      null,
      "should be null because we just removed the value"
    );
  });

  test("storage.js has no duplicate var declarations", function(_) {
    var fs = require("fs");
    var path = require("path");
    var src = fs.readFileSync(
      path.join(__dirname, "..", "..", "..", "src", "core", "storage.js"),
      "utf8"
    );

    // The try/catch block should NOT have duplicate var declarations.
    // Look for the pattern: var storage inside try block followed by var storage inside catch.
    var tryCatchBlock = src.match(/try\s*\{[\s\S]*?\}\s*catch[\s\S]*?\}/);
    _.ok(tryCatchBlock, "try/catch block exists");

    // Count var declarations of 'storage' inside the try/catch block
    var varDecls = (tryCatchBlock[0].match(/\bvar\s+storage\b/g) || []).length;
    _.strictEqual(
      varDecls,
      0,
      "No 'var storage' declarations inside try/catch (should use outer var)"
    );

    // Verify there is exactly one 'var storage' at the top level
    var topLevelVars = (src.match(/\bvar\s+storage\b/g) || []).length;
    _.strictEqual(
      topLevelVars,
      1,
      "Exactly one 'var storage' declaration in the file"
    );
  });
})();
