var Crafty = require("../core/core.js");

module.exports = {
    _scenes: {},
    _current: null,
    _transitionInProgress: false,
    _transitionQueue: [],

    /**@
     * #Crafty.scene
     * @category Scenes, Stage
     * @kind Method
     *
     * @trigger SceneChange - just before a new scene is initialized - { oldScene:String, newScene:String }
     * @trigger SceneDestroy - just before the current scene is destroyed - { newScene:String  }
     * @trigger SceneTransitionComplete - when a scene transition animation finishes - { scene:String }
     *
     * @sign public void Crafty.scene(String sceneName, Function init[, Function uninit])
     * @param sceneName - Name of the scene to add
     * @param init - Function to execute when scene is played
     * @param uninit - Function to execute before next scene is played, after entities with `2D` are destroyed
     *
     * This is equivalent to calling `Crafty.defineScene`.
     *
     * @sign public void Crafty.scene(String sceneName[, Data][, Object options])
     * @param sceneName - Name of scene to play
     * @param Data - The init function of the scene will be called with this data as its parameter.  Can be of any type other than a function.
     * @param options - Optional transition options object. Properties:
     *   - `transition` (String): Type of transition. Supported values: "fade", "slide". Default: none (instant switch).
     *   - `duration` (Number): Duration of the transition in milliseconds. Default: 500.
     *   - `direction` (String): Direction for slide transitions. Supported values: "left", "right", "up", "down". Default: "left".
     *
     * This is equivalent to calling `Crafty.enterScene`.
     *
     * Method to create scenes on the stage. Pass an ID and function to register a scene.
     *
     * To play a scene, just pass the ID. When a scene is played, all
     * previously-created entities with the `2D` component are destroyed. The
     * viewport is also reset.
     *
     * You can optionally specify an argument that will be passed to the scene's init function.
     *
     * If you want some entities to persist over scenes (as in, not be destroyed)
     * simply add the component `Persist`.
     *
     * @example
     * ~~~
     * Crafty.defineScene("loading", function() {
     *     Crafty.background("#000");
     *     Crafty.e("2D, DOM, Text")
     *           .attr({ w: 100, h: 20, x: 150, y: 120 })
     *           .text("Loading")
     *           .textAlign("center")
     *           .textColor("#FFFFFF");
     * });
     *
     * Crafty.defineScene("UFO_dance",
     *              function() {Crafty.background("#444"); Crafty.e("UFO");},
     *              function() {...send message to server...});
     *
     * // An example of an init function which accepts arguments, in this case an object.
     * Crafty.defineScene("square", function(attributes) {
     *     Crafty.background("#000");
     *     Crafty.e("2D, DOM, Color")
     *           .attr(attributes)
     *           .color("red");
     *
     * });
     *
     * ~~~
     * This defines (but does not play) two scenes as discussed below.
     * ~~~
     * Crafty.enterScene("loading");
     * ~~~
     * This command will clear the stage by destroying all `2D` entities (except
     * those with the `Persist` component). Then it will set the background to
     * black and display the text "Loading".
     * ~~~
     * Crafty.enterScene("UFO_dance");
     * ~~~
     * This command will clear the stage by destroying all `2D` entities (except
     * those with the `Persist` component). Then it will set the background to
     * gray and create a UFO entity. Finally, the next time the game encounters
     * another command of the form `Crafty.scene(scene_name)` (if ever), then the
     * game will send a message to the server.
     * ~~~
     * Crafty.enterScene("square", {x:10, y:10, w:20, h:20});
     * ~~~
     * This will clear the stage, set the background black, and create a red square with the specified position and dimensions.
     * ~~~
     * Crafty.enterScene("game", null, {transition: "fade", duration: 1000});
     * ~~~
     * This will fade to the game scene over 1 second.
     * ~~~
     * Crafty.enterScene("level2", data, {transition: "slide", duration: 500, direction: "left"});
     * ~~~
     * This will slide to level2 with the old scene sliding out to the left.
     * ~~~
     */
    scene: function(name, intro, outro) {
        // If there's one argument, or the second argument isn't a function, play the scene
        if (arguments.length === 1 || typeof arguments[1] !== "function") {
            var data, options;

            // Parse arguments - check for options object
            if (arguments.length >= 2) {
                // Check if second argument looks like options (has transition/duration/direction keys)
                if (
                    typeof intro === "object" &&
                    intro !== null &&
                    !Array.isArray(intro) &&
                    (intro.transition !== undefined ||
                        intro.duration !== undefined ||
                        intro.direction !== undefined)
                ) {
                    options = intro;
                } else {
                    data = intro;
                }
            }
            if (arguments.length >= 3) {
                if (
                    typeof arguments[2] === "object" &&
                    arguments[2] !== null &&
                    !Array.isArray(arguments[2])
                ) {
                    options = arguments[2];
                }
            }

            Crafty.enterScene(name, data, options);
            return;
        }
        // Otherwise, this is a call to create a scene
        Crafty.defineScene(name, intro, outro);
    },

    /*
     * #Crafty.defineScene
     * @category Scenes, Stage
     * @kind Method
     *
     * @sign public void Crafty.enterScene(String name[, Data])
     * @param name - Name of the scene to run.
     * @param Data - The init function of the scene will be called with this data as its parameter.  Can be of any type other than a function.
     *
     * @see Crafty.enterScene
     * @see Crafty.scene
     */
    defineScene: function(name, init, uninit) {
        if (typeof init !== "function")
            throw "Init function is the wrong type.";
        this._scenes[name] = {};
        this._scenes[name].initialize = init;
        if (typeof uninit !== "undefined") {
            this._scenes[name].uninitialize = uninit;
        }
        return;
    },

    /*
     * #Crafty.enterScene
     * @category Scenes, Stage
     * @kind Method
     *
     * @trigger SceneChange - just before a new scene is initialized - { oldScene:String, newScene:String }
     * @trigger SceneDestroy - just before the current scene is destroyed - { newScene:String  }
     * @trigger SceneTransitionComplete - when a scene transition animation finishes - { scene:String }
     *
     * @sign public void Crafty.enterScene(String name[, Data][, Object options])
     * @param name - Name of the scene to run.
     * @param Data - The init function of the scene will be called with this data as its parameter.  Can be of any type other than a function.
     * @param options - Optional transition options object.
     *
     * @see Crafty.defineScene
     * @see Crafty.scene
     */
    enterScene: function(name, data, options) {
        if (typeof data === "function") throw "Scene data cannot be a function";

        // ---FYI---
        // this._current is the name (ID) of the scene in progress.
        // this._scenes is an object like the following:
        // {'Opening scene': {'initialize': fnA, 'uninitialize': fnB},
        //  'Another scene': {'initialize': fnC, 'uninitialize': fnD}}

        options = options || {};

        // If a transition is currently in progress, queue this scene change
        // (replacing any previously queued transitions - only keep the latest)
        if (this._transitionInProgress) {
            this._transitionQueue = [{name: name, data: data, options: options}];
            return;
        }

        // Check if we need to perform a transition
        if (options.transition) {
            this._performTransition(name, data, options);
        } else {
            this._doEnterScene(name, data);
        }
    },

    /**
     * Internal: Perform a transition animation before entering the scene.
     */
    _performTransition: function(name, data, options) {
        this._transitionInProgress = true;

        var transition = options.transition || "fade";
        var duration = options.duration || 500;
        var direction = options.direction || "left";

        switch (transition) {
            case "fade":
                this._fadeTransition(name, data, duration);
                break;
            case "slide":
                this._slideTransition(name, data, duration, direction);
                break;
            default:
                Crafty.error('Unknown transition type: "' + transition + '"');
                this._doEnterScene(name, data);
                this._transitionInProgress = false;
                Crafty.trigger("SceneTransitionComplete", {scene: name});
                this._processTransitionQueue();
                break;
        }
    },

    /**
     * Internal: Fade transition - fade to black, switch scene, fade from black.
     */
    _fadeTransition: function(name, data, duration) {
        var self = this;
        var w =
            Crafty.viewport._width ||
            (typeof window !== "undefined" ? window.innerWidth : 800);
        var h =
            Crafty.viewport._height ||
            (typeof window !== "undefined" ? window.innerHeight : 600);

        // Create overlay entity that covers the entire screen
        // Use very high z-index to be on top of everything
        // Persist component ensures it survives the scene change
        var overlay = Crafty.e("2D, DOM, Color, Tween, Persist")
            .attr({
                x: 0,
                y: 0,
                w: w,
                h: h,
                z: 999999
            })
            .color("black")
            .attr({alpha: 0});

        // Fade in overlay (first half of transition duration)
        overlay.tween({alpha: 1}, duration / 2);

        // When fade-in completes, switch scene while screen is covered
        var fadeInHandler = function(props) {
            if (props.alpha !== undefined && props.alpha === 1) {
                overlay.unbind("TweenEnd", fadeInHandler);

                // Perform the actual scene change
                self._doEnterScene(name, data);

                // Fade out overlay (second half of transition duration)
                overlay.tween({alpha: 0}, duration / 2);

                var fadeOutHandler = function(props) {
                    if (props.alpha !== undefined && props.alpha === 0) {
                        overlay.unbind("TweenEnd", fadeOutHandler);
                        overlay.destroy();
                        self._transitionInProgress = false;
                        Crafty.trigger("SceneTransitionComplete", {scene: name});
                        self._processTransitionQueue();
                    }
                };

                overlay.bind("TweenEnd", fadeOutHandler);
            }
        };

        overlay.bind("TweenEnd", fadeInHandler);
    },

    /**
     * Internal: Slide transition - slide overlay in from direction, switch scene, slide out.
     */
    _slideTransition: function(name, data, duration, direction) {
        var self = this;
        var w =
            Crafty.viewport._width ||
            (typeof window !== "undefined" ? window.innerWidth : 800);
        var h =
            Crafty.viewport._height ||
            (typeof window !== "undefined" ? window.innerHeight : 600);

        // Calculate start position (off-screen) based on direction
        var startX, startY, endX, endY, exitX, exitY;
        switch (direction) {
            case "right":
                startX = -w;
                startY = 0;
                endX = 0;
                endY = 0;
                exitX = w;
                exitY = 0;
                break;
            case "up":
                startX = 0;
                startY = h;
                endX = 0;
                endY = 0;
                exitX = 0;
                exitY = -h;
                break;
            case "down":
                startX = 0;
                startY = -h;
                endX = 0;
                endY = 0;
                exitX = 0;
                exitY = h;
                break;
            case "left":
            default:
                startX = w;
                startY = 0;
                endX = 0;
                endY = 0;
                exitX = -w;
                exitY = 0;
                break;
        }

        // Create overlay entity starting off-screen
        var overlay = Crafty.e("2D, DOM, Color, Tween, Persist")
            .attr({
                x: startX,
                y: startY,
                w: w,
                h: h,
                z: 999999
            })
            .color("black");

        // Slide in overlay (first half of transition)
        overlay.tween({x: endX, y: endY}, duration / 2);

        var slideInHandler = function(props) {
            if (
                (props.x !== undefined && props.x === endX) ||
                (props.y !== undefined && props.y === endY)
            ) {
                overlay.unbind("TweenEnd", slideInHandler);

                // Perform the actual scene change while screen is covered
                self._doEnterScene(name, data);

                // Slide out overlay (second half of transition)
                overlay.tween({x: exitX, y: exitY}, duration / 2);

                var slideOutHandler = function(props) {
                    if (
                        (props.x !== undefined && props.x === exitX) ||
                        (props.y !== undefined && props.y === exitY)
                    ) {
                        overlay.unbind("TweenEnd", slideOutHandler);
                        overlay.destroy();
                        self._transitionInProgress = false;
                        Crafty.trigger("SceneTransitionComplete", {scene: name});
                        self._processTransitionQueue();
                    }
                };

                overlay.bind("TweenEnd", slideOutHandler);
            }
        };

        overlay.bind("TweenEnd", slideInHandler);
    },

    /**
     * Internal: Actually perform the scene switch (destroy entities, reset viewport, run init).
     */
    _doEnterScene: function(name, data) {
        Crafty.trigger("SceneDestroy", {
            newScene: name
        });
        Crafty.viewport.reset();

        Crafty("2D").each(function() {
            if (!this.has("Persist")) this.destroy();
        });

        // uninitialize previous scene
        if (
            this._current !== null &&
            "uninitialize" in this._scenes[this._current]
        ) {
            this._scenes[this._current].uninitialize.call(this);
        }

        // initialize next scene
        var oldScene = this._current;
        this._current = name;
        Crafty.trigger("SceneChange", {
            oldScene: oldScene,
            newScene: name
        });

        if (this._scenes.hasOwnProperty(name)) {
            this._scenes[name].initialize.call(this, data);
        } else {
            Crafty.error('The scene "' + name + '" does not exist');
        }
    },

    /**
     * Internal: Process the next queued transition if any.
     */
    _processTransitionQueue: function() {
        if (this._transitionQueue.length > 0 && !this._transitionInProgress) {
            var next = this._transitionQueue.shift();
            this.enterScene(next.name, next.data, next.options);
        }
    }
};
