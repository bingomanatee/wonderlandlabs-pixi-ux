import type {Application, Container, Ticker} from 'pixi.js';
import type {BehaviorSubject, Observable} from 'rxjs';
import type {DirtyOnScale} from './DirtyOnScale.js';

export interface DirtyOnScaleOptions {
    watchX?: boolean;
    watchY?: boolean;
    epsilon?: number;
}

export type DirtyOnScaleInput = boolean | DirtyOnScaleOptions | DirtyOnScale;

export interface TickerForestConfig {
    app?: Application;
    ticker?: Ticker;
    container?: Container;
    dirtyOnScale?: DirtyOnScaleInput;
}

export type ScalePoint = {
    x: number;
    y: number;
};

export type DirtyProps = {
    state$: BehaviorSubject<boolean>;
    stream$: Observable<boolean>;
};

export type MaybeScaleBinding = {
    container: Container | undefined;
    ticker: ScaleTickerLike | undefined;
};

export type ScaleBinding = {
    container: Container;
    ticker: ScaleTickerLike;
};

export type ScaleTickerLike = Pick<Ticker, 'add' | 'remove'>;
