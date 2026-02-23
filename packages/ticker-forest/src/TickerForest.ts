import {Forest, StoreParams} from '@wonderlandlabs/forestry4';
import type {Application, Container, Ticker} from 'pixi.js';

export interface TickerForestConfig {
    app?: Application;
    ticker?: Ticker;
    container?: Container;
}

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
 *     super(
 *       { value: { position: { x: 0, y: 0 }, dirty: false } },
 *       { app },
 *     );
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
    #app?: Application;
    #ticker?: Ticker;
    #container?: Container;
    #queuedOnTicker?: Ticker;

    /**
     * @param args - The Forestry configuration object (includes {value: ..., res: ...} and other Forest options)
     * @param config - Flexible ticker config ({ app?, ticker?, container? })
     */
    constructor(args: StoreParams<T>, config: TickerForestConfig | Application = {}) {
        super(args);
        if (TickerForest.isApplicationConfig(config)) {
            this.#app = config;
            return;
        }
        this.#app = config.app;
        this.#ticker = config.ticker;
        this.#container = config.container;
    }

    static isApplicationConfig(value: TickerForestConfig | Application): value is Application {
        return !!value && typeof value === 'object' && 'ticker' in value && 'renderer' in value;
    }

    get application(): Application | undefined {
        return this.#app
            ?? (this.$parent as unknown as { application?: Application } | undefined)?.application;
    }

    set application(app: Application | undefined) {
        this.#app = app;
    }

    get app(): Application | undefined {
        return this.application;
    }

    set app(app: Application | undefined) {
        this.application = app;
    }

    get container(): Container | undefined {
        return this.#container
            ?? (this.$parent as unknown as { container?: Container } | undefined)?.container;
    }

    get tickerContainer(): Container | undefined {
        return this.container;
    }

    set tickerContainer(container: Container | undefined) {
        this.#container = container;
    }

    get ticker(): Ticker {
        if (this.#ticker) {
            return this.#ticker;
        }
        if (this.#app?.ticker) {
            return this.#app.ticker;
        }
        const parentTicker = (this.$parent as unknown as { ticker?: Ticker } | undefined)?.ticker;
        if (parentTicker) {
            return parentTicker;
        }
        throw new Error(
            `${this.constructor.name}: ticker is unavailable (expected config.ticker, config.app.ticker, or parent.ticker)`,
        );
    }

    set ticker(ticker: Ticker | undefined) {
        this.#ticker = ticker;
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
    #requeueAfterTick = false;

    /**
     * Queue a resolve operation for the next ticker frame.
     * Uses `ticker.addOnce()` to ensure the resolve happens once on the next frame.
     * Subclasses should call this after calling markDirty().
     */
    queueResolve(): void {
        const ticker = this.ticker;
        if (this.#resolveQueued) {
            // A resolve is already queued or currently executing; request one more pass.
            this.#requeueAfterTick = true;
            return;
        }
        ticker.addOnce(this.$.onTick, this);
        this.#queuedOnTicker = ticker;
        this.#resolveQueued = true;
    }

    /**
     * Trigger an initial resolve on the next ticker frame.
     * Subclasses should call this in their constructor after initialization
     * to ensure initial PixiJS operations are performed.
     */
    kickoff(): void {
        this.queueResolve();
    }

    /**
     * Internal ticker callback that calls resolve and clears dirty flags.
     * @private
     */
    private onTick (){
        if (this.isDirty()) {
            this.resolve();
            this.clearDirty();
        }
        this.#resolveQueued = false;
        this.#queuedOnTicker = undefined;
        if (this.#requeueAfterTick) {
            this.#requeueAfterTick = false;
            this.queueResolve();
        }
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
        this.#queuedOnTicker?.remove(this.$.onTick, this);
        this.ticker?.remove(this.$.onTick, this);
        this.#queuedOnTicker = undefined;
        this.#resolveQueued = false;
        this.#requeueAfterTick = false;
    }
}
