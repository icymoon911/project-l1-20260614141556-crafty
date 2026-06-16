var Crafty = require("../core/core.js");

module.exports = {
    _scenes: {},
    _current: null,

    // --- Transition state ---
    _transitioning: false,
    _transitionOverlay: null,
    _transitionViewportAnim: null, // { startX, startY, endX, endY, easing, startTime, duration }
    _transitionCleanup: null, // cleanup fn to call if interrupted
    _pendingTransition: null, // queued transition when one is already running

    /**@
     * #Crafty.scene
     * @category Scenes, Stage
     * @kind Method
     *
     * @trigger SceneChange - just before a new scene is initialized - { oldScene:String, newScene:String }
     * @trigger SceneDestroy - just before the current scene is destroyed - { newScene:String  }
     * @trigger SceneTransitionComplete - when a scene transition animation finishes - { scene:String, transition:String }
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
     * @param options - An options object for scene transition. Supports `transition` (String: "fade" or "slide"), `duration` (Number: ms, default 500), `direction` (String for slide: "left", "right", "up", "down", default "left"), and `color` (String: overlay color, default "#000").
     *
     * This is equivalent to calling `Crafty.enterScene`.
     *
     * Method to create scenes on the stage. Pass an ID and function to register a scene.
     *
     * To play a scene, just pass the ID. When a scene is played, all
     * previously-created entities with the `2D` component are destroyed. The
     * viewport is also reset.
     *
     * You can optionally specify an arugment that will be passed to the scene's init function.
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
     * // Play a scene with a fade transition
     * Crafty.scene("loading", null, {transition: "fade", duration: 600});
     *
     * // Play a scene with a slide transition (old scene slides left, new slides in from right)
     * Crafty.scene("UFO_dance", null, {transition: "slide", duration: 800, direction: "left"});
     * ~~~
     */
    scene: function(name, intro, outro) {
        // If there's one argument, or the second argument isn't a function, play the scene
        if (arguments.length === 1 || typeof arguments[1] !== "function") {
            // Determine data and options from 2nd and 3rd arguments
            // API: Crafty.scene(name) / Crafty.scene(name, data) / Crafty.scene(name, data, options)
            // Also: Crafty.scene(name, null, options) for options without data
            // Also: Crafty.scene(name, {transition: "fade"}) - if 2nd arg looks like options, treat as options
            var data, options;
            if (arguments.length >= 3) {
                data = arguments[1];
                options = (typeof arguments[2] === "object") ? arguments[2] : null;
            } else if (arguments.length === 2) {
                // Check if the 2nd arg looks like transition options (plain object with "transition" key)
                var arg2 = arguments[1];
                if (arg2 !== null && typeof arg2 === "object" &&
                    !Array.isArray(arg2) &&
                    "transition" in arg2) {
                    data = undefined;
                    options = arg2;
                } else {
                    data = arg2;
                    options = null;
                }
            } else {
                data = undefined;
                options = null;
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
     * @trigger SceneTransitionComplete - when a scene transition animation finishes - { scene:String, transition:String }
     *
     * @sign public void Crafty.enterScene(String name[, Data][, Object options])
     * @param name - Name of the scene to run.
     * @param Data - The init function of the scene will be called with this data as its parameter.  Can be of any type other than a function.
     * @param options - Transition options: `transition` ("fade"|"slide), `duration` (Number ms), `direction` ("left"|"right"|"up"|"down"), `color` (String overlay color).
     *
     * @see Crafty.defineScene
     * @see Crafty.scene
     */
    enterScene: function(name, data, options) {
        if (typeof data === "function") throw "Scene data cannot be a function";

        // Parse options
        options = options || {};
        var transition = options.transition || null;
        var duration = typeof options.duration === "number" ? options.duration : 500;
        var direction = options.direction || "left";
        var color = options.color || "#000";

        // If a transition is already in progress, handle interruption
        if (this._transitioning) {
            // Interrupt: immediately finalize the current transition (perform pending scene change if needed, cleanup)
            this._interruptTransition();

            // If another transition was already queued (pending), discard it - latest wins
            this._pendingTransition = {
                name: name,
                data: data,
                transition: transition,
                duration: duration,
                direction: direction,
                color: color
            };

            // If we're no longer transitioning after interrupt, start immediately
            if (!this._transitioning) {
                this._startQueuedTransition();
            }
            return;
        }

        if (!transition) {
            // No transition - do immediate switch
            this._performSceneChange(name, data, false);
            return;
        }

        // Start transition
        this._transitioning = true;

        if (transition === "fade") {
            this._fadeTransition(name, data, duration, color);
        } else if (transition === "slide") {
            this._slideTransition(name, data, duration, direction, color);
        } else {
            // Unknown transition - fall back to immediate switch
            Crafty.error('Unknown scene transition: "' + transition + '"');
            this._transitioning = false;
            this._performSceneChange(name, data, false);
        }
    },

    /**
     * Internal: perform the actual scene change (destroy old, init new).
     * @param {String} name - scene name
     * @param {*} data - data to pass to init
     * @param {Boolean} skipViewportReset - if true, don't reset viewport (used during slide transition)
     */
    _performSceneChange: function(name, data, skipViewportReset) {
        Crafty.trigger("SceneDestroy", {
            newScene: name
        });

        if (!skipViewportReset) {
            Crafty.viewport.reset();
        }

        Crafty("2D").each(function() {
            if (!this.has("Persist")) this.destroy();
        });

        // uninitialize previous scene
        if (
            this._current !== null &&
            this._scenes[this._current] &&
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
     * Internal: get viewport dimensions, falling back to safe defaults.
     */
    _getViewportSize: function() {
        var vw = Crafty.viewport._width;
        var vh = Crafty.viewport._height;
        if (!vw) {
            vw = (typeof window !== "undefined") ? window.innerWidth : 640;
        }
        if (!vh) {
            vh = (typeof window !== "undefined") ? window.innerHeight : 480;
        }
        return {
            width: vw || 640,
            height: vh || 480,
            scale: Crafty.viewport._scale || 1
        };
    },

    /**
     * Internal: create the transition overlay entity.
     * Returns the overlay entity.
     */
    _createOverlay: function(color, alpha) {
        var size = this._getViewportSize();

        // Build the component list dynamically based on what's available
        var comps = "2D, Persist, Tween";
        var hasDOM = Crafty.isComp("DOM");
        var hasColor = Crafty.isComp("Color");
        if (hasDOM) comps = "2D, DOM, Persist, Tween";

        var overlay = Crafty.e(comps)
            .attr({
                x: 0,
                y: 0,
                w: size.width,
                h: size.height,
                z: 99999,
                alpha: alpha
            });

        if (hasColor) {
            overlay.color(color);
        }

        // Add input blocking: Mouse + AreaMap so this entity captures pointer events
        // and prevents them from reaching entities below
        if (Crafty.isComp("Mouse")) {
            overlay.addComponent("Mouse");
        }
        if (Crafty.isComp("Touch")) {
            overlay.addComponent("Touch");
        }

        return overlay;
    },

    /**
     * Internal: fade transition implementation.
     * Phase 1: overlay fades from alpha 0 to 1 (covers screen).
     * At midpoint: scene change occurs behind opaque overlay.
     * Phase 2: overlay fades from alpha 1 to 0 (reveals new scene).
     */
    _fadeTransition: function(name, data, duration, color) {
        var self = this;
        var halfDuration = Math.max(duration / 2, 1);

        var overlay = this._createOverlay(color, 0);
        this._transitionOverlay = overlay;

        // Keep overlay covering the visible viewport area
        var updateOverlayPosition = function() {
            var s = self._getViewportSize();
            overlay.attr({
                x: -Crafty.viewport._x,
                y: -Crafty.viewport._y,
                w: s.width / s.scale,
                h: s.height / s.scale
            });
        };
        updateOverlayPosition();
        overlay.uniqueBind("ViewportScroll", updateOverlayPosition);

        // Set up cleanup function (used for interruption too)
        this._transitionCleanup = function() {
            if (overlay) {
                overlay.unbind("ViewportScroll", updateOverlayPosition);
                overlay.destroy();
            }
            self._transitionOverlay = null;
            self._transitionCleanup = null;
            self._transitioning = false;
        };

        // Phase 1: fade in overlay (alpha 0 -> 1)
        overlay.tween({ alpha: 1 }, halfDuration);
        overlay.one("TweenEnd", function onPhase1End() {
            if (!self._transitioning) return; // interrupted

            // Midpoint: do scene change behind the opaque overlay
            self._performSceneChange(name, data, false);

            // Phase 2: fade out overlay (alpha 1 -> 0)
            overlay.tween({ alpha: 0 }, halfDuration);
            overlay.one("TweenEnd", function onPhase2End() {
                if (!self._transitioning) return; // interrupted

                // Cleanup
                overlay.unbind("ViewportScroll", updateOverlayPosition);
                overlay.destroy();
                self._transitionOverlay = null;
                self._transitionCleanup = null;
                self._transitioning = false;

                Crafty.trigger("SceneTransitionComplete", {
                    scene: name,
                    transition: "fade"
                });

                // Process any queued transition
                self._startQueuedTransition();
            });
        });
    },

    /**
     * Internal: slide transition implementation using viewport pan.
     * Phase 1: viewport pans so old scene slides off-screen in the given direction.
     * At midpoint: scene change occurs (viewport is at offset, scenes are off-screen).
     * Phase 2: viewport pans back so new scene slides in from the opposite direction.
     *
     * An invisible overlay with Mouse/Touch components blocks input during the transition.
     */
    _slideTransition: function(name, data, duration, direction, color) {
        var self = this;
        var halfDuration = Math.max(duration / 2, 1);
        var size = this._getViewportSize();
        var vw = size.width;
        var vh = size.height;
        var scale = size.scale;

        // Calculate viewport offsets for the slide
        var startX, startY, midX, midY, endX, endY;
        startX = Crafty.viewport._x;
        startY = Crafty.viewport._y;
        endX = startX;
        endY = startY;

        switch (direction) {
            case "right":
                // Old scene slides right (viewport moves left), new scene enters from left
                midX = startX - vw / scale;
                midY = startY;
                break;
            case "up":
                // Old scene slides up (viewport moves down), new scene enters from bottom
                midX = startX;
                midY = startY - vh / scale;
                break;
            case "down":
                // Old scene slides down (viewport moves up), new scene enters from top
                midX = startX;
                midY = startY + vh / scale;
                break;
            case "left":
            default:
                // Old scene slides left (viewport moves right), new scene enters from right
                midX = startX + vw / scale;
                midY = startY;
                break;
        }

        // For phase 2: new scene starts off-screen on the opposite side and slides in
        // After scene change at midpoint (viewport at midX, midY), we jump viewport to the
        // "entry" position. For "left": new scene enters from right, so viewport starts at
        // startX - vw/scale (entities at [0,w] are off-screen right) and tweens to startX.
        var entryX, entryY;
        switch (direction) {
            case "right":
                entryX = startX + vw / scale;
                entryY = startY;
                break;
            case "up":
                entryX = startX;
                entryY = startY + vh / scale;
                break;
            case "down":
                entryX = startX;
                entryY = startY - vh / scale;
                break;
            case "left":
            default:
                entryX = startX - vw / scale;
                entryY = startY;
                break;
        }

        // Create transparent input-blocking overlay (invisible but blocks pointer events)
        var overlay = this._createOverlay(color, 0);
        // Make it follow viewport so it always covers the visible area
        // We'll update its position each frame to match viewport offset
        this._transitionOverlay = overlay;

        // Custom viewport animation state
        var anim = {
            fromX: startX, fromY: startY,
            toX: midX, toY: midY,
            elapsed: 0,
            duration: halfDuration,
            phase: 1
        };
        this._transitionViewportAnim = anim;

        // Disable viewport clamp during transition so we can pan freely
        var origClamp = Crafty.viewport.clampToEntities;
        Crafty.viewport.clampToEntities = false;

        // Position overlay to cover the viewport regardless of pan
        var updateOverlayPosition = function() {
            var s = self._getViewportSize();
            overlay.attr({
                x: -Crafty.viewport._x,
                y: -Crafty.viewport._y,
                w: s.width / s.scale,
                h: s.height / s.scale
            });
        };
        updateOverlayPosition();
        overlay.uniqueBind("ViewportScroll", updateOverlayPosition);

        // Easing object for smooth animation
        var easing = new Crafty.easing(halfDuration);

        var self_ref = this;
        this._transitionCleanup = function() {
            // Reset viewport to safe position
            Crafty.viewport._x = startX;
            Crafty.viewport._y = startY;
            Crafty.viewport.clampToEntities = origClamp;
            Crafty.trigger("ViewportScroll");
            Crafty.trigger("InvalidateViewport");
            if (overlay) {
                overlay.unbind("ViewportScroll", updateOverlayPosition);
                overlay.destroy();
            }
            self_ref._transitionOverlay = null;
            self_ref._transitionViewportAnim = null;
            self_ref._transitionCleanup = null;
            self_ref._transitioning = false;
        };

        // Phase 1 animation: pan viewport from start to mid
        function phase1Tick(frameData) {
            if (!self._transitioning || !self._transitionViewportAnim || self._transitionViewportAnim.phase !== 1) {
                Crafty.unbind("UpdateFrame", phase1Tick);
                return;
            }

            easing.tick(frameData.dt);
            var v = easing.value();
            Crafty.viewport._x = (1 - v) * anim.fromX + v * anim.toX;
            Crafty.viewport._y = (1 - v) * anim.fromY + v * anim.toY;
            Crafty.trigger("ViewportScroll");
            Crafty.trigger("InvalidateViewport");
            updateOverlayPosition();

            if (easing.complete) {
                Crafty.unbind("UpdateFrame", phase1Tick);

                if (!self._transitioning) return; // interrupted

                // Midpoint: scene change (skip viewport reset, we manage viewport ourselves)
                self._performSceneChange(name, data, true);

                // Jump viewport to entry position for phase 2
                Crafty.viewport._x = entryX;
                Crafty.viewport._y = entryY;
                Crafty.trigger("ViewportScroll");
                Crafty.trigger("InvalidateViewport");
                updateOverlayPosition();

                // Phase 2 animation: pan viewport from entry back to start
                var easing2 = new Crafty.easing(halfDuration);
                var p2FromX = entryX, p2FromY = entryY;

                // Update cleanup to handle phase 2 state
                self._transitionViewportAnim.phase = 2;

                function phase2Tick(frameData2) {
                    if (!self._transitioning) {
                        Crafty.unbind("UpdateFrame", phase2Tick);
                        return;
                    }

                    easing2.tick(frameData2.dt);
                    var v2 = easing2.value();
                    Crafty.viewport._x = (1 - v2) * p2FromX + v2 * endX;
                    Crafty.viewport._y = (1 - v2) * p2FromY + v2 * endY;
                    Crafty.trigger("ViewportScroll");
                    Crafty.trigger("InvalidateViewport");
                    updateOverlayPosition();

                    if (easing2.complete) {
                        Crafty.unbind("UpdateFrame", phase2Tick);

                        if (!self._transitioning) return; // interrupted

                        // Restore viewport clamp
                        Crafty.viewport.clampToEntities = origClamp;

                        // Cleanup overlay
                        overlay.unbind("ViewportScroll", updateOverlayPosition);
                        overlay.destroy();
                        self._transitionOverlay = null;
                        self._transitionViewportAnim = null;
                        self._transitionCleanup = null;
                        self._transitioning = false;

                        Crafty.trigger("SceneTransitionComplete", {
                            scene: name,
                            transition: "slide"
                        });

                        // Process any queued transition
                        self._startQueuedTransition();
                    }
                }

                Crafty.uniqueBind("UpdateFrame", phase2Tick);
            }
        }

        Crafty.uniqueBind("UpdateFrame", phase1Tick);
    },

    /**
     * Internal: interrupt an in-progress transition.
     * Immediately finalizes the transition state (performs pending scene change if needed,
     * resets viewport, destroys overlay).
     */
    _interruptTransition: function() {
        if (!this._transitioning) return;

        // Unbind any UpdateFrame handlers used by viewport animation
        // (they check self._transitioning flag and will bail out)
        this._transitioning = false;

        // Call cleanup if available (resets viewport, destroys overlay)
        if (this._transitionCleanup) {
            this._transitionCleanup();
        }

        // Clear pending queue since we're about to start a new transition
        this._pendingTransition = null;
    },

    /**
     * Internal: start a queued transition if one is pending.
     */
    _startQueuedTransition: function() {
        if (this._pendingTransition) {
            var pending = this._pendingTransition;
            this._pendingTransition = null;
            this.enterScene(pending.name, pending.data, {
                transition: pending.transition,
                duration: pending.duration,
                direction: pending.direction,
                color: pending.color
            });
        }
    }
};
