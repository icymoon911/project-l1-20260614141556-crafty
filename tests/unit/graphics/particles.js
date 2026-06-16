(function() {
  var module = QUnit.module;
  var test = QUnit.test;

  module("Particles");

  test("deep clone: multiple Particles instances do not share nested config", function(_) {
    // Load Particles component manually for headless testing
    require("../../../src/graphics/renderable.js");
    require("../../../src/graphics/particles.js");

    // Create first entity with Particles
    var e1 = Crafty.e("2D, Particles");
    // Create second entity with Particles
    var e2 = Crafty.e("2D, Particles");

    // Verify gravity objects are not the same reference
    _.notStrictEqual(
      e1._Particles.gravity,
      e2._Particles.gravity,
      "gravity objects should be different references"
    );

    // Verify originOffset objects are not the same reference
    _.notStrictEqual(
      e1._Particles.originOffset,
      e2._Particles.originOffset,
      "originOffset objects should be different references"
    );

    // Verify startColour arrays are not the same reference
    _.notStrictEqual(
      e1._Particles.startColour,
      e2._Particles.startColour,
      "startColour arrays should be different references"
    );

    // Modify e1's gravity and verify e2 is unaffected
    e1._Particles.gravity.x = 999;
    _.strictEqual(
      e2._Particles.gravity.x,
      0,
      "e2 gravity.x should be unchanged when e1 gravity.x is modified"
    );

    // Modify e1's originOffset and verify e2 is unaffected
    e1._Particles.originOffset.y = 42;
    _.strictEqual(
      e2._Particles.originOffset.y,
      0,
      "e2 originOffset.y should be unchanged when e1 originOffset.y is modified"
    );

    // Verify presets are also independent
    _.notStrictEqual(
      e1._Particles.presets,
      e2._Particles.presets,
      "presets objects should be different references"
    );

    _.notStrictEqual(
      e1._Particles.presets.gravity,
      e2._Particles.presets.gravity,
      "presets.gravity should be different references"
    );
  });

  test("Particles instance has all required methods after init", function(_) {
    require("../../../src/graphics/renderable.js");
    require("../../../src/graphics/particles.js");

    var e = Crafty.e("2D, Particles");

    _.strictEqual(typeof e._Particles.init, "function", "init method exists");
    _.strictEqual(
      typeof e._Particles.config,
      "function",
      "config method exists"
    );
    _.strictEqual(typeof e._Particles.start, "function", "start method exists");
    _.strictEqual(typeof e._Particles.stop, "function", "stop method exists");
    _.strictEqual(
      typeof e._Particles.update,
      "function",
      "update method exists"
    );
    _.strictEqual(
      typeof e._Particles.render,
      "function",
      "render method exists"
    );
    _.strictEqual(
      typeof e._Particles.Particle,
      "function",
      "Particle constructor exists"
    );
    _.strictEqual(
      typeof e._Particles.RANDM1TO1,
      "function",
      "RANDM1TO1 method exists"
    );
  });
})();
