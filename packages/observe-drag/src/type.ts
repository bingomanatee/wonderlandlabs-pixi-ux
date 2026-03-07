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
export type DragPoint = {x: number; y: number};
export type PositionLike = DragPoint & {set?(x: number, y: number): void};
export type ParentLocalSpaceLike = {toLocal?(point: DragPoint): DragPoint};
export type DragTargetLike = {position: PositionLike; parent?: ParentLocalSpaceLike | null};

export type ObserveDragPhase = 'onStart' | 'onMove' | 'onUp' | 'onBlocked' | 'internal';

export interface ObserveDragListeners<
    PtrEvent extends PixiEventLike = PixiEventLike,
    DragContext = unknown,
    DragTarget = unknown,
> {
    onStart?(downEvent: PtrEvent, dragTarget?: DragTarget): DragContext;
    onMove?(moveEvent: PtrEvent, context: DragContext, dragTarget?: DragTarget): void;
    onUp?(terminalEvent: PtrEvent, context: DragContext, dragTarget?: DragTarget): void;
    onBlocked?(downEvent: PtrEvent, dragTarget?: DragTarget): void;
    onError?(error: unknown, phase: ObserveDragPhase, event?: PtrEvent, dragTarget?: DragTarget): void;
}

export interface ObserveDragSubscriptionOptions<
    PtrEvent extends PixiEventLike = PixiEventLike,
    DragContext = unknown,
    DragTarget = unknown,
> {
    dragTarget?: DragTarget;
    getDragTarget?(downEvent: PtrEvent, context: DragContext | undefined): DragTarget | undefined;
    debug?: Map<string, DebugListener>;
}

export interface DragTargetDecoratorOptions<
    PtrEvent extends PixiEventLike = PixiEventLike,
    DragContext = unknown,
    DragTarget extends DragTargetLike = DragTargetLike,
> {
    listeners?: ObserveDragListeners<PtrEvent, DragContext, DragTarget>;
    transformPoint?(point: DragPoint, event: PtrEvent, context: DragContext | undefined, dragTarget?: DragTarget): DragPoint;
}
