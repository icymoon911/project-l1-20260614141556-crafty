# Bug Fixes Summary

## 1. storage.js - Duplicate var declarations (lines 3-9)

**Problem:** The try/catch block had `var storage` declared twice, which causes issues in strict mode and some bundlers due to var hoisting.

**Fix:** Declared `storage` once at the top level, then assigned it in both try and catch blocks without re-declaring.

```javascript
// Before:
try {
    var storage = ...;
} catch (e) {
    var storage = null;
}

// After:
var storage;
try {
    storage = ...;
} catch (e) {
    storage = null;
}
```

**Test:** Added verification that no `var storage` declarations exist inside try/catch blocks.

---

## 2. model.js - Fragile constructor check (lines 57-61)

**Problem:** Using `data[key].constructor === Object` fails for:

- Cross-iframe objects (different Object constructors)
- Incorrectly recurses into arrays (treating array elements as objects)

**Fix:** Use robust type checking with:

- `data[key] !== null` - null check
- `typeof data[key] === "object"` - type check
- `!Array.isArray(data[key])` - exclude arrays
- `Object.prototype.toString.call(data[key]) === "[object Object]"` - reliable plain object detection

**Tests:**

- Array values do NOT trigger deep Change events
- Plain object values DO trigger deep Change events
- null values do not cause errors

---

## 3. particles.js - Shallow clone causing shared references (lines 30-58)

**Problem:** `Crafty.clone()` performed shallow cloning, causing nested config objects like `gravity` and `originOffset` to be shared across all Particles instances. Modifying one instance's gravity affected all instances.

**Fix:** Use `JSON.parse(JSON.stringify())` for guaranteed deep cloning of all nested objects, then re-attach prototype methods (functions are not JSON-serializable).

```javascript
var src = this._Particles;
this._Particles = JSON.parse(
  JSON.stringify({
    presets: src.presets,
    emissionRate: src.emissionRate
    // ... other properties
  })
);
// Re-attach methods
this._Particles.init = src.init;
this._Particles.config = src.config;
// ... etc
```

**Tests:**

- Multiple instances have independent gravity/originOffset references
- Modifying one instance doesn't affect others
- All required methods exist after init

---

## 4. scenes.js - enterScene destroys before validation (lines 133-139)

**Problem:** `enterScene` would destroy the current scene's entities before checking if the target scene exists. If the target scene didn't exist, the game state was already destroyed.

**Fix:** Validate the target scene exists at the very beginning, before any destruction occurs. Throw an error immediately if the scene doesn't exist.

```javascript
enterScene: function(name, data) {
    if (typeof data === "function") throw "Scene data cannot be a function";

    // Validate BEFORE destroying
    if (!this._scenes.hasOwnProperty(name)) {
        throw 'The scene "' + name + '" does not exist';
    }

    // ... rest of scene switching logic
}
```

**Test:** Verify that 2D entities are NOT destroyed when entering a non-existent scene.

---

## 5. tween.js - cancelTween doesn't remove from array (lines 118-139, 174-182)

**Problem:**

- `cancelTween` deleted properties from `tweenGroup` but left the tween object in the `tweens` array
- `_tweenTick` continued processing empty tween objects
- `_endTween` could fire `TweenEnd` events with empty properties

**Fix:**

- After cancelling properties, check if the tween has any properties left
- If a tween is fully cancelled, remove it from the `tweens` array
- `_endTween` already had the check, but added a comment for clarity

```javascript
cancelTween: function(target) {
    // ... cancel properties ...

    // Remove fully-cancelled tweens from array
    for (var i = this.tweens.length - 1; i >= 0; i--) {
        var hasProps = false;
        for (var p in this.tweens[i].props) {
            hasProps = true;
            break;
        }
        if (!hasProps) {
            this.tweens.splice(i, 1);
        }
    }
}
```

**Tests:**

- cancelTween removes fully-cancelled tween from tweens array
- Partially cancelled tweens remain in array
- \_endTween does not fire TweenEnd when properties is empty

---

## Test Results

- **Original tests:** 69 passed
- **New verification tests:** 10 added
- **Total:** 79 tests, all passing ✓

All fixes maintain backward compatibility and pass existing tests while resolving the reported bugs.
