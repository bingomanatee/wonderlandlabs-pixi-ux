import {Forest, StoreParams} from '@wonderlandlabs/forestry4';
import type {Application} from 'pixi.js';

/**
 * Abstract base class for Forestry state management that synchronizes
 * state changes with PixiJS rendering via the ticker pattern.
 *
 * This class solves the problem of PixiJS artifacts that occur when
 * PixiJS operations are performed outside of ticker handlers. While
 * Forestry state changes are synchronous, PixiJS-centric effects must
 * be encapsulated inside ticker handlers to work correctly.
 *
 * Pattern:
 * 1. Subclass manages its own state (including dirty flags)
 * 2. Subclass calls `this.queueResolve()` when PixiJS updates are needed
 * 3. Base class schedules a ticker callback for the next frame (manages resolveQueued internally)
 * 4. Ticker calls `isDirty()`, then `resolve()`, then `clearDirty()`
 *
 * Subclasses must implement:
 * - `isDirty()` - Return true if PixiJS operations are needed
 * - `clearDirty()` - Clear the dirty flag after resolve
 * - `resolve()` - Perform PixiJS operations
 *
 * @example
 * ```typescript
 * interface MyState {
 *   position: { x: number; y: number };
 *   dirty: boolean;
 * }
 *
 * class MyStore extends TickerForest<MyState> {
 *   constructor(app: Application) {
 *     super({ value: { position: { x: 0, y: 0 }, dirty: false } }, app);
 *   }
 *
 *   updatePosition(x: number, y: number) {
 *     this.mutate(draft => {
 *       draft.position.x = x;
 *       draft.position.y = y;
 *       draft.dirty = true;
 *     });
 *     this.queueResolve();
 *   }
 *
 *   protected isDirty(): boolean {
 *     return this.value.dirty;
 *   }
 *
 *   protected clearDirty(): void {
 *     this.mutate(draft => { draft.dirty = false; });
 *   }
 *
 *   protected resolve(): void {
 *     // Perform PixiJS operations here
 *     const { position } = this.value;
 *     this.sprite.position.set(position.x, position.y);
 *   }
 * }
 * ```
 */
export abstract class TickerForest<T> extends Forest<T> {
    protected application: Application;

    /**
     * @param args - The Forestry configuration object (includes {value: ..., res: ...} and other Forest options)
     * @param application - The PixiJS Application instance (ticker accessed via app.ticker)
     */
    constructor(args: StoreParams<T>, application: Application) {
        super(args);
        this.application = application;
    }

    /**
     * Check if the state is dirty and needs PixiJS updates.
     * Subclasses implement this to return their dirty flag.
     *
     * the reason this is abstract is that there may be a singular lag
     * or multiple flags that collectively create a dirty condition
     * in the state. All we care about is that the selector here
     * is an accurate reflection of work needed in the resolver.
     *
     * @abstract
     */
    protected abstract isDirty(): boolean;

    /**
     * Clear the dirty flag after resolve. Subclasses implement this.
     * @abstract
     */
    protected abstract clearDirty(): void;

    #resolveQueued = false;

    /**
     * Queue a resolve operation for the next ticker frame.
     * Uses `ticker.addOnce()` to ensure the resolve happens once on the next frame.
     * Subclasses should call this after calling markDirty().
     */
    protected queueResolve(): void {
        if (!this.#resolveQueued) {
            this.application.ticker.addOnce(this.$.onTick, this);
            this.#resolveQueued = true;
        }
    }

    /**
     * Internal ticker callback that calls resolve and clears dirty flags.
     * @private
     */
    private onTick (){
        this.resolve();
        this.clearDirty();
        this.#resolveQueued = false;
    };

    /**
     * Abstract method that subclasses must implement to perform PixiJS operations.
     * This method is called inside a ticker handler, ensuring that PixiJS operations
     * are synchronized with the rendering loop.
     *
     * @abstract
     */
    protected abstract resolve(): void;

    /**
     * Cleanup method to remove ticker listeners.
     * Subclasses should call `super.cleanup()` in their cleanup/destroy methods.
     */
    public cleanup(): void {
        this.application.ticker.remove(this.$.onTick, this);
    }
}

