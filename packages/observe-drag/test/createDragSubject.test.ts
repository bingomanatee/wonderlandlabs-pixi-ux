import {describe, expect, it} from 'vitest';
import {Subject} from 'rxjs';
import observeDrag from '../src/observe-drag';
import type {PixiEventLike} from '../src/type';
import {
    POINTER_EVT_CANCEL,
    POINTER_EVT_DOWN,
    POINTER_EVT_MOVE,
    POINTER_EVT_UP,
    POINTER_EVT_UP_OUTSIDE,
} from '../src/constants';
import {
    createMockOnOffPointerApp,
    createMockPixiEventTarget,
    createMockPointerApp,
    MockPixiOnOffTarget,
} from './mocks';

type TestPixiEvent = PixiEventLike;

describe('observeDrag', () => {
    it('locks to first pointerdown; busy subscribers receive error and must resubscribe', () => {
        const app = createMockPointerApp<TestPixiEvent>();
        const {stage} = app;
        const subscribeToDown = observeDrag<TestPixiEvent>(app);

        const targetA = createMockPixiEventTarget<TestPixiEvent>();
        const targetB = createMockPixiEventTarget<TestPixiEvent>();

        const moveA$ = new Subject<TestPixiEvent>();
        const moveB$ = new Subject<TestPixiEvent>();
        let moveBBusyErrors = 0;

        const seenA: number[] = [];
        const seenB: number[] = [];
        // Also validate the reusable fromEventPattern adapter on mocks.
        const seenStageMoves: number[] = [];
        const stageMoveSub = stage.event$(POINTER_EVT_MOVE).subscribe((event) => seenStageMoves.push(event.pointerId));
        moveA$.subscribe((event) => seenA.push(event.pointerId));
        moveB$.subscribe({
            next(event) {
                seenB.push(event.pointerId);
            },
            error() {
                moveBBusyErrors += 1;
            },
        });

        const subA = subscribeToDown(targetA, moveA$);
        const subB = subscribeToDown(targetB, moveB$);

        targetA.emit(POINTER_EVT_DOWN, {pointerId: 1});
        stage.emit(POINTER_EVT_MOVE, {pointerId: 1});
        expect(seenA).toEqual([1]);

        targetB.emit(POINTER_EVT_DOWN, {pointerId: 2});
        stage.emit(POINTER_EVT_MOVE, {pointerId: 2});
        expect(seenB).toEqual([]);
        expect(moveBBusyErrors).toBe(1);

        // Busy errors terminate that subject; create a fresh one for the next down.
        subB.unsubscribe();
        const moveB2$ = new Subject<TestPixiEvent>();
        moveB2$.subscribe((event) => seenB.push(event.pointerId));
        const subB2 = subscribeToDown(targetB, moveB2$);

        stage.emit(POINTER_EVT_UP, {pointerId: 1});

        targetB.emit(POINTER_EVT_DOWN, {pointerId: 2});
        stage.emit(POINTER_EVT_MOVE, {pointerId: 2});
        expect(seenB).toEqual([2]);
        expect(seenStageMoves).toEqual([1, 2, 2]);

        subA.unsubscribe();
        subB2.unsubscribe();
        stageMoveSub.unsubscribe();
    });

    it('releases active pointer on pointerupoutside and pointercancel', () => {
        const app = createMockPointerApp<TestPixiEvent>();
        const {stage} = app;
        const subscribeToDown = observeDrag<TestPixiEvent>(app);

        const targetA = createMockPixiEventTarget<TestPixiEvent>();
        const targetB = createMockPixiEventTarget<TestPixiEvent>();
        const targetC = createMockPixiEventTarget<TestPixiEvent>();
        const movesA$ = new Subject<TestPixiEvent>();
        const movesB$ = new Subject<TestPixiEvent>();
        const movesC$ = new Subject<TestPixiEvent>();
        const seenA: number[] = [];
        const seenB: number[] = [];
        const seenC: number[] = [];
        movesA$.subscribe((event) => seenA.push(event.pointerId));
        movesB$.subscribe((event) => seenB.push(event.pointerId));
        movesC$.subscribe((event) => seenC.push(event.pointerId));

        const subA = subscribeToDown(targetA, movesA$);
        const subB = subscribeToDown(targetB, movesB$);
        const subC = subscribeToDown(targetC, movesC$);

        targetA.emit(POINTER_EVT_DOWN, {pointerId: 10});
        stage.emit(POINTER_EVT_MOVE, {pointerId: 10});
        stage.emit(POINTER_EVT_UP_OUTSIDE, {pointerId: 10});

        targetB.emit(POINTER_EVT_DOWN, {pointerId: 11});
        stage.emit(POINTER_EVT_MOVE, {pointerId: 11});
        stage.emit(POINTER_EVT_CANCEL, {pointerId: 11});

        targetC.emit(POINTER_EVT_DOWN, {pointerId: 12});
        stage.emit(POINTER_EVT_MOVE, {pointerId: 12});

        expect(seenA).toEqual([10]);
        expect(seenB).toEqual([11]);
        expect(seenC).toEqual([12]);

        subA.unsubscribe();
        subB.unsubscribe();
        subC.unsubscribe();
    });

    it('supports on/off-only stage and target event APIs', () => {
        const app = createMockOnOffPointerApp<TestPixiEvent>();
        const {stage} = app;
        const subscribeToDown = observeDrag<TestPixiEvent>(app);

        const targetA = new MockPixiOnOffTarget<TestPixiEvent>();
        const targetB = new MockPixiOnOffTarget<TestPixiEvent>();
        const movesA$ = new Subject<TestPixiEvent>();
        const movesB$ = new Subject<TestPixiEvent>();
        const seenA: number[] = [];
        const seenB: number[] = [];
        movesA$.subscribe((event) => seenA.push(event.pointerId));
        movesB$.subscribe((event) => seenB.push(event.pointerId));

        const subA = subscribeToDown(targetA, movesA$);
        const subB = subscribeToDown(targetB, movesB$);

        targetA.emit(POINTER_EVT_DOWN, {pointerId: 21});
        stage.emit(POINTER_EVT_MOVE, {pointerId: 21});
        stage.emit(POINTER_EVT_UP, {pointerId: 21});

        targetB.emit(POINTER_EVT_DOWN, {pointerId: 22});
        stage.emit(POINTER_EVT_MOVE, {pointerId: 22});

        expect(seenA).toEqual([21]);
        expect(seenB).toEqual([22]);

        subA.unsubscribe();
        subB.unsubscribe();
    });
});
