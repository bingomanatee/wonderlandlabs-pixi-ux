import {BehaviorSubject, filter, Subject, Subscription} from 'rxjs';
import type {DebugListener, DragOwner, PixiApplicationLike, PixiEventLike, PixiEventTargetLike, VoidFn,} from './type';
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

    /**
     *
     * @param target
     * @param dragSubject
     * @param debug
     */
    function observeDragSubscriber(
        target: PixiEventTargetLike<PtrEvent>,
        dragSubject: Subject<PtrEvent>, debug?: Map<string, DebugListener>
    ) {
        let terminate: VoidFn | undefined = undefined;

        /**
         * The "Main Trigger": for each down, dynaically add listeners for move and up
         * and use subscribe to pipe them
         * @param downEvent
         */
        function handlePointerDown(downEvent: PtrEvent) {
            let watchPointerIdSub: Subscription | undefined = undefined;

            if (downPointerId$.value !== null) {
                debug?.get('pid$.terminate-early')?.(downPointerId$.value)
                dragSubject.error(new Error('drag busy'));
                return;
            }
            downPointerId$.next(downEvent.pointerId);

            const move$: Subject<PtrEvent> = new Subject();
            if (debug?.has('move$')) {
                move$.subscribe(debug.get('move$'));
            }
            move$.pipe(filter(
                (moveEvent: PtrEvent) => moveEvent.pointerId === downEvent.pointerId)
            ).subscribe(dragSubject);

            function handlePointerMove(onMoveEvent: PtrEvent) {
                move$.next(onMoveEvent);
            }

            function handlePointerTerminal(terminalEvent: PtrEvent) {
                if (terminalEvent.pointerId === downEvent.pointerId) {
                    move$.complete();
                }
            }

            terminate = (...args: unknown[]) => {
                const reason = args[0];
                removeListener(app.stage, POINTER_EVT_MOVE, handlePointerMove);
                removeListener(app.stage, POINTER_EVT_UP, handlePointerTerminal);
                removeListener(app.stage, POINTER_EVT_UP_OUTSIDE, handlePointerTerminal);
                removeListener(app.stage, POINTER_EVT_CANCEL, handlePointerTerminal);
                terminate = undefined;
                watchPointerIdSub?.unsubscribe();
                watchPointerIdSub = undefined;
                downPointerId$.next(null);
                debug?.get('terminate')?.(reason);
            }

            /**
             * crazy-time borderline condition -
             * if for any reason the pointerId strays from the seed event,
             * terminate
             */
            watchPointerIdSub = downPointerId$.pipe(filter((pid) => pid !== downEvent.pointerId)).subscribe({
                next() {
                    terminate?.('pointerId changed');
                }
            });

            move$.subscribe({
                complete() {
                    terminate?.('move$ complete');
                }
            });

            addListener(app.stage, POINTER_EVT_MOVE, handlePointerMove);
            addListener(app.stage, POINTER_EVT_UP, handlePointerTerminal);
            addListener(app.stage, POINTER_EVT_UP_OUTSIDE, handlePointerTerminal);
            addListener(app.stage, POINTER_EVT_CANCEL, handlePointerTerminal);

        }

        addListener(target, POINTER_EVT_DOWN, handlePointerDown);

        return {
            unsubscribe() {
                terminate?.();
                removeListener(target, POINTER_EVT_DOWN, handlePointerDown);
            }
        }
    }

    return observeDragSubscriber;
}
