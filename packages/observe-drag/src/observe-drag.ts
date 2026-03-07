import {BehaviorSubject} from 'rxjs';
import type {
    DebugListener,
    DragOwner,
    ObserveDragListeners,
    ObserveDragPhase,
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

    function observeDragSubscriber<DragContext = undefined>(
        target: PixiEventTargetLike<PtrEvent>,
        listeners: ObserveDragListeners<PtrEvent, DragContext> = {} as ObserveDragListeners<PtrEvent, DragContext>,
        debug?: Map<string, DebugListener>,
    ) {
        let terminate: VoidFn | undefined = undefined;

        function reportListenerError(error: unknown, phase: ObserveDragPhase, event?: PtrEvent) {
            debug?.get('listener.error')?.({error, phase, event});
            if (listeners.onError) {
                listeners.onError(error, phase, event);
                return;
            }
            if (error instanceof Error) {
                throw error;
            }
            throw new Error(String(error));
        }

        /**
         * The "Main Trigger": for each down, dynamically add listeners for move and up
         * @param downEvent
         */
        function handlePointerDown(downEvent: PtrEvent) {
            if (downPointerId$.value !== null) {
                debug?.get('pid$.terminate-early')?.(downPointerId$.value);
                debug?.get('pointer.busy')?.(downEvent);
                try {
                    listeners.onBlocked?.(downEvent);
                } catch (error) {
                    reportListenerError(error, 'onBlocked', downEvent);
                }
                return;
            }

            const activePointerId = downEvent.pointerId;
            downPointerId$.next(activePointerId);
            debug?.get('down.accepted')?.(downEvent);

            let dragContext: DragContext | undefined = undefined;

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
                dragContext = listeners.onDown?.(downEvent);
            } catch (error) {
                terminate('onDown error');
                reportListenerError(error, 'onDown', downEvent);
                return;
            }

            function handlePointerMove(onMoveEvent: PtrEvent) {
                if (onMoveEvent.pointerId !== downEvent.pointerId) {
                    return;
                }
                try {
                    listeners.onDrag?.(onMoveEvent, dragContext as DragContext);
                } catch (error) {
                    terminate?.('onDrag error');
                    reportListenerError(error, 'onDrag', onMoveEvent);
                }
            }

            function handlePointerTerminal(terminalEvent: PtrEvent) {
                if (terminalEvent.pointerId === downEvent.pointerId) {
                    debug?.get('pointer.terminal')?.(terminalEvent);
                    try {
                        listeners.onUp?.(terminalEvent, dragContext as DragContext);
                    } catch (error) {
                        reportListenerError(error, 'onUp', terminalEvent);
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
