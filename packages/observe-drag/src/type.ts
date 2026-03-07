import type {PixiEventName} from './constants';

export type {PixiEventName} from './constants';

export interface PixiEventLike {
    pointerId: number;
}

export interface PixiEventTargetLike<TEvent extends PixiEventLike = PixiEventLike> {
    addEventListener?(type: PixiEventName, listener: (event: TEvent) => void): void;
    removeEventListener?(type: PixiEventName, listener: (event: TEvent) => void): void;
    on?(type: PixiEventName, listener: (event: TEvent) => void): void;
    off?(type: PixiEventName, listener: (event: TEvent) => void): void;
}

export interface PixiApplicationLike<TEvent extends PixiEventLike = PixiEventLike> {
    stage: PixiEventTargetLike<TEvent>;
}

export type DragOwner = number | null;
export type VoidFn = (...args: unknown[]) => void;
export type DebugListener = (context: unknown) => void;

export type ObserveDragPhase = 'onDown' | 'onDrag' | 'onUp' | 'onBlocked' | 'internal';

export interface ObserveDragListeners<PtrEvent extends PixiEventLike = PixiEventLike, DragContext = unknown> {
    onDown?(downEvent: PtrEvent): DragContext;
    onDrag?(moveEvent: PtrEvent, context: DragContext): void;
    onUp?(terminalEvent: PtrEvent, context: DragContext): void;
    onBlocked?(downEvent: PtrEvent): void;
    onError?(error: unknown, phase: ObserveDragPhase, event?: PtrEvent): void;
}
