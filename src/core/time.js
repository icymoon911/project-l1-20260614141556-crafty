/**@
 * #Delay
 * @category Utilities
 * @kind Component
 *
 * A component for triggering functions after a given amount of time.
 *
 * This syncs with Crafty's internal clock, and so should generally be preferred to using methods such as `setTimeout`.
 */
module.exports = {
    /**@
     * #.delaySpeed
     * @comp Delay
     *
     * The rate of the delay. This property defaults to 1.
     * When setting delaySpeed to 0.5, delays will take twice as long,
     * setting it to 2.0 will make them twice as short
     */
    delaySpeed: 1,

    required: "FrameUpdater",

    init: function() {
        // Use the unified update-item queue provided by FrameUpdater.
        // `_delays` is kept as a public alias for backward compatibility
        // (existing code and tests access _delays.length directly).
        this._delays = this._updateItems;
    },

    /**
     * tick – called every UpdateFrame by the FrameUpdater component.
     * Iterates the managed delay queue, accumulates elapsed time, fires
     * callbacks, and removes finished or cancelled delays.
     */
    tick: function(frameData) {
        var self = this;
        this._iterateUpdateItems(function(item) {
            item.accumulator += frameData.dt * self.delaySpeed;
            // The while loop handles the (pathological) case where dt>delay
            while (item.accumulator >= item.delay && item.repeat >= 0) {
                item.accumulator -= item.delay;
                item.repeat--;
                item.callback.call(self);
            }
            // remove finished item from array
            if (item.repeat < 0) {
                if (typeof item.callbackOff === "function")
                    item.callbackOff.call(self);
                return true; // remove from queue
            }
        });
    },

    /**@
     * #.delay
     * @comp Delay
     * @kind Method
     * @sign public this.delay(Function callback, Number delay[, Number repeat[, Function callbackOff]])
     * @param callback - Method to execute after given amount of milliseconds. If reference of a
     * method is passed, there's possibility to cancel the delay.
     * @param delay - Amount of milliseconds to execute the method.
     * @param repeat - (optional) How often to repeat the delayed function. A value of 0 triggers the delayed
     * function exactly once. A value n > 0 triggers the delayed function exactly n+1 times. A
     * value of -1 triggers the delayed function indefinitely. Defaults to one execution.
     * @param callbackOff - (optional) Method to execute after delay ends(after all iterations are executed).
     * If repeat value equals -1, callbackOff will never be triggered.
     *
     * The delay method will execute a function after a given amount of time in milliseconds.
     *
     * It is not a wrapper for `setTimeout`.
     *
     * If Crafty is paused, the delay is interrupted with the pause and then resume when unpaused
     *
     * If the entity is destroyed, the delay is also destroyed and will not have effect.
     *
     * @example
     *
     * The simplest delay
     * ~~~
     * Crafty.log("start");
     * Crafty.e("Delay").delay(function() {
     *   Crafty.log("100ms later");
     * }, 100, 0);
     * ~~~
     *
     * Delay with callbackOff to be executed after all delay iterations
     * ~~~
     * Crafty.log("start");
     * Crafty.e("Delay").delay(function() {
     *   Crafty.log("100ms later");
     * }, 100, 3, function() {
     *   Crafty.log("delay finished");
     * });
     * ~~~
     *
     */
    delay: function(callback, delay, repeat, callbackOff) {
        this._delays.push({
            accumulator: 0,
            callback: callback,
            callbackOff: callbackOff,
            delay: delay,
            repeat: (repeat < 0 ? Infinity : repeat) || 0
        });
        return this;
    },
    /**@
     * #.cancelDelay
     * @comp Delay
     * @kind Method
     *
     * @sign public this.cancelDelay(Function callback)
     * @param callback - Method reference passed to .delay
     *
     * The cancelDelay method will cancel a delay set previously.
     *
     * @example
     * ~~~
     * var doSomething = function(){
     *   Crafty.log("doing something");
     * };
     *
     * // execute doSomething each 100 miliseconds indefinetely
     * var ent = Crafty.e("Delay").delay(doSomething, 100, -1);
     *
     * // and some time later, cancel further execution of doSomething
     * ent.cancelDelay(doSomething);
     * ~~~
     */
    cancelDelay: function(callback) {
        this.cancelUpdateItems(function(item) {
            return item.callback === callback;
        });
        return this;
    },
    /**@
     * #.pauseDelays
     * @comp Delay
     * @kind Method
     *
     * @sign public this.pauseDelays()
     *
     * The pauseDelays method will pause all delays of this
     * entity until resumed.
     *
     * @example
     * ~~~
     * var doSomething = function(){
     *   Crafty.log("doing something");
     * };
     *
     * // execute doSomething each 100 miliseconds indefinetely
     * var ent = Crafty.e("Delay").delay(doSomething, 100, -1);
     *
     * // and some time later, the gameplay is paused
     * ent.pauseDelays();
     * ~~~
     */
    pauseDelays: function() {
        this.pauseFrameUpdates();
    },
    /**@
     * #.resumeDelays
     * @comp Delay
     * @kind Method
     *
     * @sign public this.resumeDelays()
     *
     * The resumeDelays method will resume earlier paused delays for this
     * entity
     *
     * @example
     * ~~~
     * var doSomething = function(){
     *   Crafty.log("doing something");
     * };
     *
     * // execute doSomething each 100 miliseconds indefinetely
     * var ent = Crafty.e("Delay").delay(doSomething, 100, -1);
     *
     * // and some time later, the gameplay is paused (or only
     * // a part of it is frozen)
     * ent.pauseDelays();
     *
     * // the player resumes gameplay
     * ent.resumeDelays();
     * ~~~
     */
    resumeDelays: function() {
        this.resumeFrameUpdates();
    }
};
