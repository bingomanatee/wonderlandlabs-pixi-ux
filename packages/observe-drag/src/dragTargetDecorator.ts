import type {
    DragPoint,
    DragTargetDecoratorOptions,
    DragTargetLike,
    ObserveDragListeners,
    PixiEventLike,
} from './type';

type DecoratedContext<DragContext> = {
    userContext: DragContext | undefined;
    startPointer: DragPoint | undefined;
    startTarget: DragPoint | undefined;
};

function defaultPointFromEvent<PtrEvent extends PixiEventLike, DragTarget extends DragTargetLike>(
    event: PtrEvent,
    dragTarget?: DragTarget,
): DragPoint | undefined {
    const anyEvent = event as unknown as {
        global?: {x?: unknown; y?: unknown};
        x?: unknown;
        y?: unknown;
    };
    if (anyEvent.global && typeof anyEvent.global.x === 'number' && typeof anyEvent.global.y === 'number') {
        if (dragTarget?.parent?.toLocal) {
            const local = dragTarget.parent.toLocal({x: anyEvent.global.x, y: anyEvent.global.y});
            return {x: local.x, y: local.y};
        }
        return {x: anyEvent.global.x, y: anyEvent.global.y};
    }
    if (typeof anyEvent.x === 'number' && typeof anyEvent.y === 'number') {
        return {x: anyEvent.x, y: anyEvent.y};
    }
    return undefined;
}

function setTargetPosition<DragTarget extends DragTargetLike>(dragTarget: DragTarget, point: DragPoint): void {
    if (typeof dragTarget.position.set === 'function') {
        dragTarget.position.set(point.x, point.y);
        return;
    }
    dragTarget.position.x = point.x;
    dragTarget.position.y = point.y;
}

export function dragTargetDecorator<
    PtrEvent extends PixiEventLike = PixiEventLike,
    DragContext = unknown,
    DragTarget extends DragTargetLike = DragTargetLike,
>(
    options: DragTargetDecoratorOptions<PtrEvent, DragContext, DragTarget> = {},
): ObserveDragListeners<PtrEvent, DecoratedContext<DragContext>, DragTarget> {
    const listeners = options.listeners ?? {};
    const transformPoint = options.transformPoint;

    return {
        onStart(downEvent: PtrEvent, dragTarget?: DragTarget) {
            const userContext = listeners.onStart?.(downEvent, dragTarget);
            const startPointer = defaultPointFromEvent(downEvent, dragTarget);
            const startTarget = dragTarget
                ? {x: dragTarget.position.x, y: dragTarget.position.y}
                : undefined;

            return {
                userContext,
                startPointer,
                startTarget,
            };
        },
        onMove(moveEvent: PtrEvent, context: DecoratedContext<DragContext>, dragTarget?: DragTarget) {
            if (dragTarget && context.startPointer && context.startTarget) {
                const point = defaultPointFromEvent(moveEvent, dragTarget);
                if (point) {
                    const rawPoint = {
                        x: context.startTarget.x + (point.x - context.startPointer.x),
                        y: context.startTarget.y + (point.y - context.startPointer.y),
                    };
                    const nextPoint = transformPoint
                        ? transformPoint(rawPoint, moveEvent, context.userContext, dragTarget)
                        : rawPoint;
                    setTargetPosition(dragTarget, nextPoint);
                }
            }
            listeners.onMove?.(moveEvent, context.userContext as DragContext, dragTarget);
        },
        onUp(upEvent: PtrEvent, context: DecoratedContext<DragContext>, dragTarget?: DragTarget) {
            listeners.onUp?.(upEvent, context.userContext as DragContext, dragTarget);
        },
        onBlocked(blockedEvent: PtrEvent, dragTarget?: DragTarget) {
            listeners.onBlocked?.(blockedEvent, dragTarget);
        },
        onError(error: unknown, phase, event, dragTarget?: DragTarget) {
            listeners.onError?.(error, phase, event, dragTarget);
        },
    };
}

export const dragTarget = dragTargetDecorator;
export default dragTargetDecorator;
