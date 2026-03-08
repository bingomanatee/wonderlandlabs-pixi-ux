import {BehaviorSubject, debounceTime, Subject, Subscription} from 'rxjs';
import type {
    ActivePointerLike,
    DragOwner,
    ObserveDragFactoryOptions,
    ObserveDragListeners,
    ObserveDragPhase,
    ObserveDragSubscriptionOptions,
    PixiApplicationLike,
    PixiEventLike,
    PixiEventTargetLike,
} from './type';
import {
    POINTER_EVT_CANCEL,
    POINTER_EVT_DOWN,
    POINTER_EVT_MOVE,
    POINTER_EVT_UP,
    POINTER_EVT_UP_OUTSIDE,
    type PixiEventName,
} from './constants';

const DRAG_INACTIVITY_TIMEOUT_MS = 1000;
const WATCHDOG_STOP = 'stop' as const;
const WATCHDOG_PULSE = 'pulse' as const;
const DEBUG_SOURCE = 'observe-drag';
type WatchdogSignal = typeof WATCHDOG_STOP | typeof WATCHDOG_PULSE;

function resolveActivePointer(
    configuredActivePointer$?: ActivePointerLike,
): ActivePointerLike {
    if (configuredActivePointer$) {
        return configuredActivePointer$;
    }
    return new BehaviorSubject<DragOwner>(null);
}

function addListener<PtrEvent extends PixiEventLike = PixiEventLike>(
    target: PixiEventTargetLike<PtrEvent>,
    eventName: PixiEventName,
    listener: (event: PtrEvent) => void,
): void {
    if (target.on) {
        target.on(eventName, listener);
        return;
    }
    if (target.addEventListener) {
        target.addEventListener(eventName, listener);
        return;
    }
    throw new Error('observeDrag: event target must support addEventListener/removeEventListener or on/off');
}

function removeListener<PtrEvent extends PixiEventLike = PixiEventLike>(
    target: PixiEventTargetLike<PtrEvent>,
    eventName: PixiEventName,
    listener: (event: PtrEvent) => void,
): void {
    if (target.off) {
        target.off(eventName, listener);
        return;
    }
    if (target.removeEventListener) {
        target.removeEventListener(eventName, listener);
        return;
    }
    throw new Error('observeDrag: event target must support addEventListener/removeEventListener or on/off');
}

export default function dragObserverFactory<PtrEvent extends PixiEventLike = PixiEventLike>(
    app: PixiApplicationLike<PtrEvent>,
    factoryOptions: ObserveDragFactoryOptions = {},
) {
    const activePointer$ = resolveActivePointer(factoryOptions.activePointer$);

    function observeDragSubscriber<DragContext = undefined, DragTarget = undefined>(
        target: PixiEventTargetLike<PtrEvent>,
        listeners: ObserveDragListeners<PtrEvent, DragContext, DragTarget> =
            {} as ObserveDragListeners<PtrEvent, DragContext, DragTarget>,
        options?: ObserveDragSubscriptionOptions<PtrEvent, DragContext, DragTarget>,
    ) {
        const subscriptionOptions = options ?? {};
        const debug = subscriptionOptions.debug;
        const logDebug = (message: string, data?: unknown): void => {
            debug?.(DEBUG_SOURCE, message, data);
        };
        const abortTimeMs = Math.max(0, subscriptionOptions.abortTime ?? DRAG_INACTIVITY_TIMEOUT_MS);
        let activeSession:
            | {
                pointerId: number;
                moveHandler: (event: PtrEvent) => void;
                endHandler: (event: PtrEvent) => void;
            }
            | undefined;
        let inactivityPulse$: Subject<WatchdogSignal> | undefined;
        let inactivitySub: Subscription | undefined;

        const stopInactivityWatchdog = (): void => {
            inactivityPulse$?.next(WATCHDOG_STOP);
            inactivitySub?.unsubscribe();
            inactivitySub = undefined;
            inactivityPulse$?.complete();
            inactivityPulse$ = undefined;
        };

        const pulseInactivityWatchdog = (): void => {
            inactivityPulse$?.next(WATCHDOG_PULSE);
        };

        function reportListenerError(
            error: unknown,
            phase: ObserveDragPhase,
            event?: PtrEvent,
            dragTarget?: DragTarget,
        ): void {
            logDebug('listener.error', {error, phase, event, dragTarget});
            if (listeners.onError) {
                listeners.onError(error, phase, event, dragTarget);
                return;
            }
            if (error instanceof Error) {
                throw error;
            }
            throw new Error(String(error));
        }

        const releaseSession = (reason?: unknown): void => {
            if (!activeSession) {
                stopInactivityWatchdog();
                return;
            }

            stopInactivityWatchdog();
            removeListener(app.stage, POINTER_EVT_MOVE, activeSession.moveHandler);
            removeListener(app.stage, POINTER_EVT_UP, activeSession.endHandler);
            removeListener(app.stage, POINTER_EVT_UP_OUTSIDE, activeSession.endHandler);
            removeListener(app.stage, POINTER_EVT_CANCEL, activeSession.endHandler);

            if (activePointer$.value === activeSession.pointerId) {
                activePointer$.next(null);
            }

            activeSession = undefined;
            logDebug('terminate', reason);
        };

        const startInactivityWatchdog = (pointerId: number): void => {
            stopInactivityWatchdog();
            inactivityPulse$ = new Subject<WatchdogSignal>();

            const terminate = (): void => {
                logDebug('pointer.timeout', {
                    pointerId,
                    timeoutMs: abortTimeMs,
                });
                releaseSession('pointer inactivity timeout');
            };

            inactivitySub = inactivityPulse$
                .pipe(debounceTime(abortTimeMs))
                .subscribe({
                    next: (value) => value !== WATCHDOG_STOP ? terminate() : null,
                    complete: () => null,
                    error: terminate,
                });

            // Start "no-move" timeout from accepted pointerdown.
            inactivityPulse$.next(WATCHDOG_PULSE);
        };

        const handlePointerDown = (downEvent: PtrEvent): void => {
            if (activePointer$.value !== null) {
                logDebug('pointer.busy', downEvent);
                try {
                    listeners.onBlocked?.(downEvent, subscriptionOptions.dragTarget);
                } catch (error) {
                    reportListenerError(error, 'onBlocked', downEvent, subscriptionOptions.dragTarget);
                }
                return;
            }

            let dragContext: DragContext | undefined = undefined;
            let resolvedDragTarget: DragTarget | undefined = subscriptionOptions.dragTarget;

            try {
                const preStartDragTarget = subscriptionOptions.getDragTarget?.(downEvent, undefined);
                if (preStartDragTarget !== undefined) {
                    resolvedDragTarget = preStartDragTarget;
                }
                dragContext = listeners.onStart?.(downEvent, resolvedDragTarget);
            } catch (error) {
                reportListenerError(error, 'onStart', downEvent, resolvedDragTarget);
                return;
            }

            try {
                const contextDragTarget = subscriptionOptions.getDragTarget?.(downEvent, dragContext);
                if (contextDragTarget !== undefined) {
                    resolvedDragTarget = contextDragTarget;
                }
            } catch (error) {
                reportListenerError(error, 'onStart', downEvent, resolvedDragTarget);
                return;
            }

            const pointerId = downEvent.pointerId;
            activePointer$.next(pointerId);
            logDebug('down.accepted', downEvent);

            const moveHandler = (moveEvent: PtrEvent): void => {
                if (moveEvent.pointerId !== pointerId) {
                    return;
                }
                pulseInactivityWatchdog();
                logDebug('pointer.move', moveEvent);
                try {
                    listeners.onMove?.(moveEvent, dragContext as DragContext, resolvedDragTarget);
                } catch (error) {
                    releaseSession('onMove error');
                    reportListenerError(error, 'onMove', moveEvent, resolvedDragTarget);
                }
            };

            const endHandler = (terminalEvent: PtrEvent): void => {
                if (terminalEvent.pointerId !== pointerId) {
                    return;
                }
                logDebug('pointer.terminal', terminalEvent);
                try {
                    listeners.onUp?.(terminalEvent, dragContext as DragContext, resolvedDragTarget);
                } catch (error) {
                    reportListenerError(error, 'onUp', terminalEvent, resolvedDragTarget);
                } finally {
                    releaseSession('pointer terminal');
                }
            };

            activeSession = {
                pointerId,
                moveHandler,
                endHandler,
            };

            // Attach terminal/move listeners only after a successful onStart.
            addListener(app.stage, POINTER_EVT_MOVE, moveHandler);
            addListener(app.stage, POINTER_EVT_UP, endHandler);
            addListener(app.stage, POINTER_EVT_UP_OUTSIDE, endHandler);
            addListener(app.stage, POINTER_EVT_CANCEL, endHandler);
            if (abortTimeMs > 0) {
                startInactivityWatchdog(pointerId);
            }
        };

        addListener(target, POINTER_EVT_DOWN, handlePointerDown);

        return {
            unsubscribe() {
                releaseSession('unsubscribe');
                removeListener(target, POINTER_EVT_DOWN, handlePointerDown);
            }
        };
    }

    return observeDragSubscriber;
}

export const observeDrag = dragObserverFactory;
