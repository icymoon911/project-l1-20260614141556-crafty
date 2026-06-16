var Crafty = require("../core/core.js");

/**@
 * #Crafty.pauseFrameUpdates
 * @category Core
 * @kind Method
 *
 * @sign public void Crafty.pauseFrameUpdates()
 *
 * Globally pauses all frame-update handlers registered via the Tickable
 * component.  Unlike `Crafty.pause()`, which stops the entire main loop
 * (including rendering and the internal clock), this only freezes the
 * per-entity `UpdateFrame` logic of Tickable-aware components (Tween,
 * Delay, Particles, etc.).  Rendering and the clock keep running.
 *
 * @see Crafty.resumeFrameUpdates
 */

/**@
 * #Crafty.resumeFrameUpdates
 * @category Core
 * @kind Method
 *
 * @sign public void Crafty.resumeFrameUpdates()
 *
 * Resumes frame-update handlers that were globally paused by
 * `Crafty.pauseFrameUpdates()`.
 *
 * @see Crafty.pauseFrameUpdates
 */
Crafty.extend({
    _frameUpdatesPaused: false,

    pauseFrameUpdates: function() {
        this._frameUpdatesPaused = true;
    },

    resumeFrameUpdates: function() {
        this._frameUpdatesPaused = false;
    }
});

/**@
 * #Tickable
 * @category Core
 * @kind Component
 *
 * A mixin component that provides pausable per-frame tick infrastructure.
 *
 * Components that need to run logic every frame should require `Tickable`
 * and define a `tick(frameData)` method.  The framework automatically
 * binds `tick` to the `UpdateFrame` event on `init` and unbinds it on
 * `remove`, so consuming components no longer need to write their own
 * `uniqueBind` / `unbind` boilerplate.
 *
 * The tick is automatically skipped when:
 * - The entity's `_tickPaused` flag is `true` (component-level pause).
 * - `Crafty._frameUpdatesPaused` is `true` (global pause).
 *
 * Consuming components should call `this._pauseTick()` /
 * `this._resumeTick()` (or their own wrappers) to control the local
 * pause state.
 *
 * @example
 * ~~~
 * Crafty.c("MyUpdater", {
 *     required: "Tickable",
 *     tick: function(frameData) {
 *         // business logic here; pause guards are handled by Tickable
 *         this.x += 1 * frameData.dt / 1000;
 *     }
 * });
 * ~~~
 */
Crafty.c("Tickable", {
    _tickPaused: false,

    init: function() {
        this.uniqueBind("UpdateFrame", this._tickableHandler);
    },

    remove: function() {
        this.unbind("UpdateFrame", this._tickableHandler);
    },

    /**
     * Internal handler bound to UpdateFrame.  Checks the local and
     * global pause flags, plus the optional `_shouldTick()` hook,
     * before delegating to the consumer's `tick`.
     */
    _tickableHandler: function(frameData) {
        if (this._tickPaused || Crafty._frameUpdatesPaused) return;
        if (typeof this._shouldTick === "function" && !this._shouldTick())
            return;
        if (typeof this.tick === "function") {
            this.tick(frameData);
        }
    },

    /**@
     * #._pauseTick
     * @comp Tickable
     * @kind Method
     *
     * @sign private this ._pauseTick()
     *
     * Pauses this entity's tick.  The `UpdateFrame` handler remains
     * bound but becomes a no-op until `_resumeTick()` is called.
     */
    _pauseTick: function() {
        this._tickPaused = true;
        return this;
    },

    /**@
     * #._resumeTick
     * @comp Tickable
     * @kind Method
     *
     * @sign private this ._resumeTick()
     *
     * Resumes a tick that was paused by `_pauseTick()`.
     */
    _resumeTick: function() {
        this._tickPaused = false;
        return this;
    }
});

/**@
 * #TickableQueue
 * @category Core
 * @kind Component
 *
 * Extends `Tickable` with a managed item queue.  Each frame the queue
 * is traversed; the consumer's `_processItem(item, frameData)` decides
 * whether an item is finished.  Finished or cancelled items are
 * automatically spliced out and `_onItemFinished(item)` is called (if
 * defined).
 *
 * Cancelling an item is done by setting its slot to `false`; it will be
 * removed on the next tick.
 *
 * Consuming components must define `_processItem(item, frameData)` and
 * may optionally define `_onItemFinished(item)`.
 */
Crafty.c("TickableQueue", {
    required: "Tickable",

    init: function() {
        this._queue = [];
    },

    tick: function(frameData) {
        for (var i = this._queue.length - 1; i >= 0; i--) {
            var item = this._queue[i];
            if (item === false) {
                // Cancelled slot – sweep it away
                this._queue.splice(i, 1);
                continue;
            }
            var finished = this._processItem(item, frameData);
            if (finished) {
                this._queue.splice(i, 1);
                if (typeof this._onItemFinished === "function") {
                    this._onItemFinished(item);
                }
            }
        }
    },

    /**
     * @sign private this ._queueAdd(item)
     * @param item - The item to append to the queue.
     */
    _queueAdd: function(item) {
        this._queue.push(item);
        return this;
    },

    /**
     * @sign private Boolean ._queueRemove(item)
     * @param item - The item to remove.
     * @returns true if the item was found and removed.
     */
    _queueRemove: function(item) {
        var idx = this._queue.indexOf(item);
        if (idx >= 0) {
            this._queue.splice(idx, 1);
            return true;
        }
        return false;
    },

    /**
     * @sign private this ._queueCancel(item)
     * @param item - The item to cancel.  It will be removed on the next tick.
     */
    _queueCancel: function(item) {
        var idx = this._queue.indexOf(item);
        if (idx >= 0) {
            this._queue[idx] = false;
        }
        return this;
    }
});

module.exports = {
    // Re-export for direct require() consumers that want to mix in
    // without going through the Crafty.c component system.
    _frameUpdatesPaused: function() {
        return Crafty._frameUpdatesPaused;
    }
};
