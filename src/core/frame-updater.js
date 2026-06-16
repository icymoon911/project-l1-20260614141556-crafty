var Crafty = require("./core.js");

// ---------------------------------------------------------------------------
// Global frame-update pause state
// ---------------------------------------------------------------------------
// When true, every entity that uses the FrameUpdater component will skip its
// tick() call, regardless of its own local pause flag.  This is independent
// from Crafty.pause() (which stops the main loop entirely); it allows the
// loop to keep running while freezing all "gameplay" frame updates.
// ---------------------------------------------------------------------------
var _globalFrameUpdatesPaused = false;

Crafty.extend({
    /**@
     * #Crafty.pauseFrameUpdates
     * @category Core
     * @kind Method
     *
     * @sign public void Crafty.pauseFrameUpdates()
     *
     * Globally pauses all entities that use the FrameUpdater component.
     * Their `tick()` methods will not be called on each UpdateFrame until
     * `Crafty.resumeFrameUpdates()` is invoked.
     *
     * This is finer-grained than `Crafty.pause()`: the main loop keeps
     * running (EnterFrame/UpdateFrame/ExitFrame still fire), but individual
     * tick handlers skip execution.
     *
     * @see Crafty.resumeFrameUpdates, Crafty.isFrameUpdatesPaused
     */
    pauseFrameUpdates: function() {
        _globalFrameUpdatesPaused = true;
    },

    /**@
     * #Crafty.resumeFrameUpdates
     * @category Core
     * @kind Method
     *
     * @sign public void Crafty.resumeFrameUpdates()
     *
     * Resumes all entities that were globally paused by
     * `Crafty.pauseFrameUpdates()`.
     *
     * @see Crafty.pauseFrameUpdates
     */
    resumeFrameUpdates: function() {
        _globalFrameUpdatesPaused = false;
    },

    /**@
     * #Crafty.isFrameUpdatesPaused
     * @category Core
     * @kind Method
     *
     * @sign public Boolean Crafty.isFrameUpdatesPaused()
     * @returns Whether global frame updates are currently paused.
     *
     * @see Crafty.pauseFrameUpdates, Crafty.resumeFrameUpdates
     */
    isFrameUpdatesPaused: function() {
        return _globalFrameUpdatesPaused;
    }
});

/**@
 * #FrameUpdater
 * @category Core
 * @kind Component
 *
 * A base component that provides unified frame-update lifecycle management.
 *
 * Components that need per-frame updates should declare
 * `required: "FrameUpdater"` and implement a `tick(frameData)` method.
 * FrameUpdater takes care of:
 *
 *  - Binding `tick` to the `UpdateFrame` event on init.
 *  - Unbinding on remove (no manual uniqueBind / unbind needed).
 *  - A per-entity pause flag (`pauseFrameUpdates` / `resumeFrameUpdates`).
 *  - Respecting the global pause flag (`Crafty.pauseFrameUpdates()`).
 *  - An optional managed item queue (`_updateItems`) with automatic cleanup
 *    of finished or cancelled items (useful for Tween, Delay, etc.).
 *
 * Components that need dynamic start/stop (e.g. only ticking while an
 * animation is playing) can call `startTicking()` / `stopTicking()` manually
 * and set `_autoTick: false` in their init to opt out of auto-start.
 *
 * @example
 * ~~~
 * Crafty.c("MyMover", {
 *     required: "2D, FrameUpdater",
 *     speed: 50,
 *     init: function () {
 *         // tick is auto-bound because we define it below
 *     },
 *     tick: function (frameData) {
 *         this.x += this.speed * frameData.dt / 1000;
 *     }
 * });
 * ~~~
 */
Crafty.c("FrameUpdater", {
    /**
     * Per-entity pause flag.  When true, tick() is skipped.
     * Controlled via pauseFrameUpdates() / resumeFrameUpdates() on the
     * entity (NOT to be confused with the global Crafty.pauseFrameUpdates).
     */
    _frameUpdatesPaused: false,

    /**
     * Whether the UpdateFrame handler is currently bound.
     * Prevents double-binding and allows safe repeated start/stop calls.
     */
    _isTicking: false,

    /**
     * Optional managed item queue.
     * Components like Tween and Delay push update items here and iterate
     * them via _iterateUpdateItems() inside their tick() method.
     * Items marked `false` (cancelled) or for which the update callback
     * returns `true` (finished) are automatically spliced out.
     */
    _updateItems: null,

    // ------------------------------------------------------------------
    // Lifecycle
    // ------------------------------------------------------------------

    init: function() {
        // Initialise the managed item queue.  Components that don't need
        // it simply ignore it – it's just an empty array.
        this._updateItems = [];

        // Auto-start ticking if the entity has a tick method and hasn't
        // explicitly opted out (by setting _autoTick = false before init).
        if (typeof this.tick === "function" && this._autoTick !== false) {
            this.startTicking();
        }
    },

    remove: function() {
        this.stopTicking();
    },

    // ------------------------------------------------------------------
    // Binding helpers
    // ------------------------------------------------------------------

    /**
     * Start receiving UpdateFrame events.
     * Safe to call multiple times – subsequent calls are no-ops.
     */
    startTicking: function() {
        if (!this._isTicking) {
            this.uniqueBind("UpdateFrame", this._frameUpdateDispatch);
            this._isTicking = true;
        }
    },

    /**
     * Stop receiving UpdateFrame events.
     * Safe to call multiple times – subsequent calls are no-ops.
     */
    stopTicking: function() {
        if (this._isTicking) {
            this.unbind("UpdateFrame", this._frameUpdateDispatch);
            this._isTicking = false;
        }
    },

    // ------------------------------------------------------------------
    // Dispatch – the single function that is actually bound to UpdateFrame
    // ------------------------------------------------------------------

    /**
     * Internal dispatch function bound to UpdateFrame.
     * Checks local and global pause flags before calling tick().
     */
    _frameUpdateDispatch: function(frameData) {
        // Skip if locally or globally paused
        if (this._frameUpdatesPaused || _globalFrameUpdatesPaused) return;
        if (typeof this.tick === "function") {
            this.tick(frameData);
        }
    },

    // ------------------------------------------------------------------
    // Per-entity pause / resume
    // ------------------------------------------------------------------

    /**
     * Pause this entity's frame updates.
     * tick() will not be called until resumeFrameUpdates() is invoked.
     */
    pauseFrameUpdates: function() {
        this._frameUpdatesPaused = true;
    },

    /**
     * Resume this entity's frame updates.
     */
    resumeFrameUpdates: function() {
        this._frameUpdatesPaused = false;
    },

    // ------------------------------------------------------------------
    // Managed item queue helpers
    // ------------------------------------------------------------------

    /**
     * Add an item to the managed update queue.
     * @param item - Any value (usually an object) to be processed each tick.
     */
    addUpdateItem: function(item) {
        this._updateItems.push(item);
    },

    /**
     * Mark items as cancelled (set to `false`) so they are cleaned up on
     * the next iteration.  `predicate` receives each item and should return
     * `true` for items that should be cancelled.
     */
    cancelUpdateItems: function(predicate) {
        var items = this._updateItems;
        for (var i = items.length - 1; i >= 0; i--) {
            if (items[i] !== false && predicate(items[i])) {
                items[i] = false;
            }
        }
    },

    /**
     * Iterate the managed update queue, calling `updateFn(item, index)` for
     * each live item.  Items that are `false` (cancelled) or for which
     * `updateFn` returns `true` (finished) are automatically spliced out.
     *
     * Iteration proceeds in reverse order so that splicing is safe.
     *
     * @param updateFn - Function(item, index) { ... return trueToRemove; }
     */
    _iterateUpdateItems: function(updateFn) {
        var items = this._updateItems;
        for (var i = items.length - 1; i >= 0; i--) {
            var item = items[i];
            if (item === false) {
                items.splice(i, 1);
            } else if (updateFn.call(this, item, i)) {
                items.splice(i, 1);
            }
        }
    }
});
