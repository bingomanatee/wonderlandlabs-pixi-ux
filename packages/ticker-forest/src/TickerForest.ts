import {Forest, StoreParams} from '@wonderlandlabs/forestry4';
import type {Application, Container, Ticker} from 'pixi.js';
import {Observable, Subscription, distinctUntilChanged, filter} from 'rxjs';

export interface DirtyOnScaleConfig {
    enabled?: boolean;
    watchX?: boolean;
    watchY?: boolean;
    epsilon?: number;
    relativeToRootParent?: boolean;
}

export interface TickerForestConfig {
    app?: Application;
    ticker?: Ticker;
    container?: Container;
    dirtyOnScale?: boolean | DirtyOnScaleConfig;
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
 * - `makeDirty(data?)` - Mark the store as dirty without assuming field names/shape
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
 *   protected makeDirty(): void {
 *     this.mutate(draft => { draft.dirty = true; });
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
    #scaleDirtyConfig?: Required<DirtyOnScaleConfig>;
    #scaleDirtySubscription?: Subscription;

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
        this.#scaleDirtyConfig = TickerForest.resolveDirtyOnScaleConfig(config.dirtyOnScale);
    }

    static isApplicationConfig(value: TickerForestConfig | Application): value is Application {
        return !!value && typeof value === 'object' && 'ticker' in value && 'renderer' in value;
    }

    static resolveDirtyOnScaleConfig(config?: boolean | DirtyOnScaleConfig): Required<DirtyOnScaleConfig> | undefined {
        if (!config) {
            return undefined;
        }
        if (config === true) {
            return {
                enabled: true,
                watchX: true,
                watchY: true,
                epsilon: 0.0001,
                relativeToRootParent: true,
            };
        }
        if (!config.enabled) {
            return undefined;
        }
        return {
            enabled: true,
            watchX: config.watchX ?? true,
            watchY: config.watchY ?? true,
            epsilon: config.epsilon ?? 0.0001,
            relativeToRootParent: config.relativeToRootParent ?? true,
        };
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
     * Mark this store dirty. Subclasses decide which internal flags/state represent "dirty".
     * Optional payload can provide trigger context (for example scale changes).
     */
    protected abstract makeDirty(data?: unknown): void;

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
     * Subclasses should call this after calling their dirtifier (`makeDirty` or wrapper methods).
     */
    queueResolve(): void {
        this.#ensureScaleDirtyObserver();
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
        this.#ensureScaleDirtyObserver();
        this.queueResolve();
    }

    #ensureScaleDirtyObserver(): void {
        const config = this.#scaleDirtyConfig;
        if (!config || this.#scaleDirtySubscription || (!config.watchX && !config.watchY)) {
            return;
        }
        const self = this;

        const scale$ = new Observable<readonly [number, number]>((subscriber) => {
            const onScaleTick = () => {
                const scale = self.#readContainerScale(config.relativeToRootParent);
                if (!scale) {
                    return;
                }
                subscriber.next(scale);
            };
            self.ticker.add(onScaleTick, self);
            return () => {
                self.ticker.remove(onScaleTick, self);
            };
        });

        self.#scaleDirtySubscription = scale$
            .pipe(
                filter(() => !self.isDirty()),
                distinctUntilChanged((prev, next) => {
                    const xStable = !config.watchX || Math.abs(prev[0] - next[0]) <= config.epsilon;
                    const yStable = !config.watchY || Math.abs(prev[1] - next[1]) <= config.epsilon;
                    return xStable && yStable;
                })
            )
            .subscribe(() => {
                self.#markDirtyFromScaleObserver();
            });
    }

    #markDirtyFromScaleObserver(): void {
        this.makeDirty({reason: 'scale'});
        this.queueResolve();
    }

    protected getScale(): {x: number; y: number} {
        const scale = this.#readContainerScale(true);
        if (!scale) {
            return {x: 1, y: 1};
        }
        return {x: scale[0], y: scale[1]};
    }

    protected getInverseScale(): {x: number; y: number} {
        const scale = this.getScale();
        return {
            x: Number.isFinite(scale.x) && scale.x > 0 ? 1 / scale.x : 1,
            y: Number.isFinite(scale.y) && scale.y > 0 ? 1 / scale.y : 1,
        };
    }

    #readContainerScale(relativeToRootParent: boolean): readonly [number, number] | undefined {
        const container = this.container;
        if (!container) {
            return undefined;
        }
        if (!relativeToRootParent) {
            return [Math.abs(container.scale.x) || 1, Math.abs(container.scale.y) || 1];
        }
        const rootParent = this.#resolveRootParent(container);
        if (!rootParent) {
            return undefined;
        }

        const origin = rootParent.toLocal(container.toGlobal({x: 0, y: 0}));
        const xAxis = rootParent.toLocal(container.toGlobal({x: 1, y: 0}));
        const yAxis = rootParent.toLocal(container.toGlobal({x: 0, y: 1}));

        const scaleX = Math.hypot(xAxis.x - origin.x, xAxis.y - origin.y);
        const scaleY = Math.hypot(yAxis.x - origin.x, yAxis.y - origin.y);
        return [scaleX || 1, scaleY || 1];
    }

    #resolveRootParent(container: Container): Container | undefined {
        let root = container.parent ?? undefined;
        while (root?.parent) {
            root = root.parent;
        }
        return root;
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
        this.#scaleDirtySubscription?.unsubscribe();
        this.#scaleDirtySubscription = undefined;
        this.#queuedOnTicker?.remove(this.$.onTick, this);
        this.ticker?.remove(this.$.onTick, this);
        this.#queuedOnTicker = undefined;
        this.#resolveQueued = false;
        this.#requeueAfterTick = false;
    }
}
