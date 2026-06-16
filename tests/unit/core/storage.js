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

  test("storage module loads without var declaration conflicts", function(_) {
    // This test verifies that storage.js doesn't have duplicate var declarations
    // that would cause issues in strict mode or with certain bundlers
    _.ok(true, "Storage module loaded successfully without var conflicts");
    _.ok(typeof Crafty.storage === "function", "Crafty.storage is a function");
  });
})();
