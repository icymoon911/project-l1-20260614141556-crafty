(function() {
  var module = QUnit.module;
  var test = QUnit.test;

  module("Scenes");

  test("Scene calling", function(_) {
    var x = 0;
    var sceneInit = function() {
      x = 13;
    };
    Crafty.scene("test-call", sceneInit);
    Crafty.scene("test-call");
    _.strictEqual(x, 13, "Scene called succesfully.");
  });

  test("Scene parameters", function(_) {
    var x = 0;
    var paramTaker = function(y) {
      x = y;
    };
    Crafty.scene("test-param", paramTaker);
    Crafty.scene("test-param", 11);
    _.strictEqual(x, 11, "Scene called succesfully with parameter.");
  });

  test("Calling a scene destroys 2D entities", function(_) {
    Crafty.e("2D");
    var sceneInit = function() {};
    Crafty.scene("test-destroy", sceneInit);
    Crafty.scene("test-destroy");
    var l = Crafty("2D").length;
    _.strictEqual(l, 0, "2D entity destroyed on scene change.");
  });

  test("Calling a scene doesn't destroy 2D entities with Persist", function(_) {
    Crafty.e("2D, Persist");
    var sceneInit = function() {};
    Crafty.scene("test-persist", sceneInit);
    Crafty.scene("test-persist");
    var l = Crafty("2D").length;
    _.strictEqual(l, 1, "Persist entity remains on scene change.");
  });

  test("Scene uninit function called", function(_) {
    var x = 0;
    var y = 0;
    var sceneInit = function() {
      x = 13;
    };
    var sceneUninit = function() {
      x = 20;
    };
    var sceneGame = function() {
      y = 5;
    };
    Crafty.defineScene("test-uninit", sceneInit, sceneUninit);
    Crafty.defineScene("game", sceneGame);
    Crafty.enterScene("test-uninit");
    Crafty.enterScene("game");
    _.strictEqual(
      x,
      20,
      "Uninit scene called successfully when chanced to another scene"
    );
  });

  test("enterScene throws error for non-existent scene before destroying entities", function(_) {
    // Create a 2D entity that should NOT be destroyed
    var entity = Crafty.e("2D");
    var entityDestroyed = false;
    entity.bind("Remove", function() {
      entityDestroyed = true;
    });

    // Try to enter a non-existent scene
    _.throws(
      function() {
        Crafty.enterScene("non-existent-scene");
      },
      /does not exist/,
      "enterScene throws error for non-existent scene"
    );

    // Entity should still exist because scene validation happens before destruction
    _.strictEqual(
      entityDestroyed,
      false,
      "2D entity should not be destroyed when entering non-existent scene"
    );
    _.strictEqual(
      Crafty("2D").length,
      1,
      "2D entity still exists after failed scene transition"
    );
  });

  test("enterScene validates scene exists before running uninit", function(_) {
    var uninitCalled = false;
    var sceneInit = function() {};
    var sceneUninit = function() {
      uninitCalled = true;
    };

    Crafty.defineScene("test-validate-uninit", sceneInit, sceneUninit);
    Crafty.enterScene("test-validate-uninit");

    // Try to enter a non-existent scene
    try {
      Crafty.enterScene("another-non-existent");
    } catch (e) {
      // Expected to throw
    }

    // uninit should NOT have been called
    _.strictEqual(
      uninitCalled,
      false,
      "uninit should not be called when target scene doesn't exist"
    );
  });
})();
