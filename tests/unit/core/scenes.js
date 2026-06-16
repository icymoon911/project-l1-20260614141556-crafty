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

  test("Scene transition - fade options accepted", function(_) {
    var done = _.async();
    var sceneRan = false;
    Crafty.defineScene("test-fade", function() {
      sceneRan = true;
    });
    Crafty.enterScene("test-fade", null, {transition: "fade", duration: 100});
    _.ok(Crafty._transitionInProgress, "Transition in progress flag set");
    setTimeout(function() {
      _.ok(sceneRan, "Scene ran after fade transition");
      _.ok(!Crafty._transitionInProgress, "Transition in progress flag cleared");
      done();
    }, 300);
  });

  test("Scene transition - slide options accepted", function(_) {
    var done = _.async();
    var sceneRan = false;
    Crafty.defineScene("test-slide", function() {
      sceneRan = true;
    });
    Crafty.enterScene("test-slide", null, {transition: "slide", duration: 100, direction: "left"});
    _.ok(Crafty._transitionInProgress, "Transition in progress flag set");
    setTimeout(function() {
      _.ok(sceneRan, "Scene ran after slide transition");
      _.ok(!Crafty._transitionInProgress, "Transition in progress flag cleared");
      done();
    }, 300);
  });

  test("Scene transition - queueing on rapid switches", function(_) {
    var done = _.async();
    var scenesRan = {a: false, b: false, c: false};
    Crafty.defineScene("queue-a", function() { scenesRan.a = true; });
    Crafty.defineScene("queue-b", function() { scenesRan.b = true; });
    Crafty.defineScene("queue-c", function() { scenesRan.c = true; });

    Crafty.enterScene("queue-a", null, {transition: "fade", duration: 100});
    Crafty.enterScene("queue-b", null, {transition: "fade", duration: 100});
    Crafty.enterScene("queue-c", null, {transition: "fade", duration: 100});

    setTimeout(function() {
      _.ok(scenesRan.a, "First scene in rapid sequence ran");
      _.ok(!scenesRan.b, "Middle scene was skipped (replaced by latest)");
      _.ok(scenesRan.c, "Last scene in rapid sequence ran");
      done();
    }, 500);
  });

  test("Scene transition - SceneTransitionComplete event fires", function(_) {
    var done = _.async();
    var completed = false;
    Crafty.defineScene("test-event", function() {});
    Crafty.one("SceneTransitionComplete", function(data) {
      completed = true;
      _.strictEqual(data.scene, "test-event", "Event data contains correct scene name");
    });
    Crafty.enterScene("test-event", null, {transition: "fade", duration: 50});
    setTimeout(function() {
      _.ok(completed, "SceneTransitionComplete event fired");
      done();
    }, 200);
  });

  test("Scene transition - Persist entities survive", function(_) {
    var done = _.async();
    var persistEntity = Crafty.e("2D, Persist");
    Crafty.defineScene("test-persist-transition", function() {});
    Crafty.enterScene("test-persist-transition", null, {transition: "fade", duration: 50});
    setTimeout(function() {
      _.ok(Crafty("Persist").length >= 1, "Persist entity survived transition");
      done();
    }, 200);
  });
})();
