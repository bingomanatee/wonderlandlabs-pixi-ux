import {BehaviorSubject} from 'rxjs';
import type {
    DebugListener,
    DragOwner,
    ObserveDragListeners,
    ObserveDragPhase,
    ObserveDragSubscriptionOptions,
    PixiApplicationLike,
    PixiEventLike,
    PixiEventTargetLike,
    VoidFn,
} from './type';
import {
    POINTER_EVT_CANCEL,
    POINTER_EVT_DOWN,
    POINTER_EVT_MOVE,
    POINTER_EVT_UP,
    POINTER_EVT_UP_OUTSIDE,
    type PixiEventName,
} from './constants';

const appPointerSubject: WeakMap<object, BehaviorSubject<DragOwner>> = new WeakMap();

function addListener<PtrEvent extends PixiEventLike = PixiEventLike>(
    target: PixiEventTargetLike<PtrEvent>,
    eventName: PixiEventName,
    listener: (event: PtrEvent) => void,
): void {
    if (target.addEventListener) {
        target.addEventListener(eventName, listener);
        return;
    }
    if (target.on) {
        target.on(eventName, listener);
        return;
    }
    throw new Error('observeDrag: event target must support addEventListener/removeEventListener or on/off');
}

function removeListener<PtrEvent extends PixiEventLike = PixiEventLike>(
    target: PixiEventTargetLike<PtrEvent>,
    eventName: PixiEventName,
    listener: (event: PtrEvent) => void,
): void {
    if (target.removeEventListener) {
        target.removeEventListener(eventName, listener);
        return;
    }
    if (target.off) {
        target.off(eventName, listener);
        return;
    }
    throw new Error('observeDrag: event target must support addEventListener/removeEventListener or on/off');
}

export default function observeDrag<PtrEvent extends PixiEventLike = PixiEventLike>(
    app: PixiApplicationLike<PtrEvent>
) {
    if (!appPointerSubject.has(app)) {
        appPointerSubject.set(app, new BehaviorSubject<DragOwner>(null));
    }
    const downPointerId$ = appPointerSubject.get(app)!;

    function observeDragSubscriber<DragContext = undefined, DragTarget = undefined>(
        target: PixiEventTargetLike<PtrEvent>,
        listeners: ObserveDragListeners<PtrEvent, DragContext, DragTarget> =
            {} as ObserveDragListeners<PtrEvent, DragContext, DragTarget>,
        options?: ObserveDragSubscriptionOptions<PtrEvent, DragContext, DragTarget>,
    ) {
        const subscriptionOptions = options ?? {};
        const debug = options?.debug;
        let terminate: VoidFn | undefined = undefined;

        function reportListenerError(error: unknown, phase: ObserveDragPhase, event?: PtrEvent, dragTarget?: DragTarget) {
            debug?.get('listener.error')?.({error, phase, event});
            if (listeners.onError) {
                listeners.onError(error, phase, event, dragTarget);
                return;
            }
            if (error instanceof Error) {
                throw error;
            }
            throw new Error(String(error));
        }

        /**
         * The main trigger: for each down, dynamically add listeners for move and up.
         * @param downEvent
         */
        function handlePointerDown(downEvent: PtrEvent) {
            if (downPointerId$.value !== null) {
                debug?.get('pid$.terminate-early')?.(downPointerId$.value);
                debug?.get('pointer.busy')?.(downEvent);
                try {
                    listeners.onBlocked?.(downEvent, subscriptionOptions.dragTarget);
                } catch (error) {
                    reportListenerError(error, 'onBlocked', downEvent, subscriptionOptions.dragTarget);
                }
                return;
            }

            const activePointerId = downEvent.pointerId;
            downPointerId$.next(activePointerId);
            debug?.get('down.accepted')?.(downEvent);

            let dragContext: DragContext | undefined = undefined;
            let resolvedDragTarget: DragTarget | undefined = subscriptionOptions.dragTarget;

            terminate = (reason?: unknown) => {
                removeListener(app.stage, POINTER_EVT_MOVE, handlePointerMove);
                removeListener(app.stage, POINTER_EVT_UP, handlePointerTerminal);
                removeListener(app.stage, POINTER_EVT_UP_OUTSIDE, handlePointerTerminal);
                removeListener(app.stage, POINTER_EVT_CANCEL, handlePointerTerminal);
                terminate = undefined;
                if (downPointerId$.value === activePointerId) {
                    downPointerId$.next(null);
                }
                debug?.get('terminate')?.(reason);
            };

            try {
                const preStartDragTarget = subscriptionOptions.getDragTarget?.(downEvent, undefined);
                if (preStartDragTarget !== undefined) {
                    resolvedDragTarget = preStartDragTarget;
                }
                dragContext = listeners.onStart?.(downEvent, resolvedDragTarget);
            } catch (error) {
                terminate('onStart error');
                reportListenerError(error, 'onStart', downEvent, resolvedDragTarget);
                return;
            }

            try {
                const contextDragTarget = subscriptionOptions.getDragTarget?.(downEvent, dragContext);
                if (contextDragTarget !== undefined) {
                    resolvedDragTarget = contextDragTarget;
                }
            } catch (error) {
                terminate('dragTarget setup error');
                reportListenerError(error, 'onStart', downEvent, resolvedDragTarget);
                return;
            }

            function handlePointerMove(onMoveEvent: PtrEvent) {
                if (onMoveEvent.pointerId !== downEvent.pointerId) {
                    return;
                }
                try {
                    listeners.onMove?.(onMoveEvent, dragContext as DragContext, resolvedDragTarget);
                } catch (error) {
                    terminate?.('onMove error');
                    reportListenerError(error, 'onMove', onMoveEvent, resolvedDragTarget);
                }
            }

            function handlePointerTerminal(terminalEvent: PtrEvent) {
                if (terminalEvent.pointerId === downEvent.pointerId) {
                    debug?.get('pointer.terminal')?.(terminalEvent);
                    try {
                        listeners.onUp?.(terminalEvent, dragContext as DragContext, resolvedDragTarget);
                    } catch (error) {
                        reportListenerError(error, 'onUp', terminalEvent, resolvedDragTarget);
                    } finally {
                        terminate?.('pointer terminal');
                    }
                }
            }

            addListener(app.stage, POINTER_EVT_MOVE, handlePointerMove);
            addListener(app.stage, POINTER_EVT_UP, handlePointerTerminal);
            addListener(app.stage, POINTER_EVT_UP_OUTSIDE, handlePointerTerminal);
            addListener(app.stage, POINTER_EVT_CANCEL, handlePointerTerminal);

        }

        addListener(target, POINTER_EVT_DOWN, handlePointerDown);

        return {
            unsubscribe() {
                terminate?.('unsubscribe');
                removeListener(target, POINTER_EVT_DOWN, handlePointerDown);
            }
        };
    }

    return observeDragSubscriber;
}
