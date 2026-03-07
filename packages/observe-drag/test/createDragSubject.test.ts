import {describe, expect, it} from 'vitest';
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
type DragEventLogEntry =
    | ['down', string, number, number]
    | ['move', string, number, number]
    | ['up', string, number, number]
    | ['blocked', string, number, number];

describe('observeDrag', () => {
    it('locks to first pointerdown and calls onBlocked for contenders until released', () => {
        const app = createMockPointerApp<TestPixiEvent>();
        const {stage} = app;
        const subscribeToDown = observeDrag<TestPixiEvent>(app);

        const targetA = createMockPixiEventTarget<TestPixiEvent>();
        const targetB = createMockPixiEventTarget<TestPixiEvent>();

        let downCount = 0;
        const eventLog: DragEventLogEntry[] = [];

        const subA = subscribeToDown<{targetName: string; moveCount: number; downCount: number}>(targetA, {
            onDown() {
                const context = {targetName: 'A', moveCount: 0, downCount: ++downCount};
                eventLog.push(['down', context.targetName, context.moveCount, context.downCount]);
                return context;
            },
            onDrag(_event, context) {
                context.moveCount += 1;
                eventLog.push(['move', context.targetName, context.moveCount, context.downCount]);
            },
            onUp(_event, context) {
                eventLog.push(['up', context.targetName, context.moveCount, context.downCount]);
            },
        });
        const subB = subscribeToDown<{targetName: string; moveCount: number; downCount: number}>(targetB, {
            onDown() {
                const context = {targetName: 'B', moveCount: 0, downCount: ++downCount};
                eventLog.push(['down', context.targetName, context.moveCount, context.downCount]);
                return context;
            },
            onDrag(_event, context) {
                context.moveCount += 1;
                eventLog.push(['move', context.targetName, context.moveCount, context.downCount]);
            },
            onBlocked() {
                eventLog.push(['blocked', 'B', 0, downCount]);
            },
            onUp(_event, context) {
                eventLog.push(['up', context.targetName, context.moveCount, context.downCount]);
            },
        });

        targetA.emit(POINTER_EVT_DOWN, {pointerId: 1});
        stage.emit(POINTER_EVT_MOVE, {pointerId: 1});
        stage.emit(POINTER_EVT_MOVE, {pointerId: 1});
        stage.emit(POINTER_EVT_MOVE, {pointerId: 1});

        targetB.emit(POINTER_EVT_DOWN, {pointerId: 2});
        stage.emit(POINTER_EVT_MOVE, {pointerId: 2});

        stage.emit(POINTER_EVT_UP, {pointerId: 1});

        targetB.emit(POINTER_EVT_DOWN, {pointerId: 2});
        stage.emit(POINTER_EVT_MOVE, {pointerId: 2});
        stage.emit(POINTER_EVT_MOVE, {pointerId: 2});
        stage.emit(POINTER_EVT_MOVE, {pointerId: 2});
        stage.emit(POINTER_EVT_UP, {pointerId: 2});

        targetA.emit(POINTER_EVT_DOWN, {pointerId: 1});
        stage.emit(POINTER_EVT_MOVE, {pointerId: 1});
        stage.emit(POINTER_EVT_MOVE, {pointerId: 1});

        targetB.emit(POINTER_EVT_DOWN, {pointerId: 2});
        stage.emit(POINTER_EVT_MOVE, {pointerId: 2});
        stage.emit(POINTER_EVT_MOVE, {pointerId: 2});

        stage.emit(POINTER_EVT_UP, {pointerId: 1});

        targetB.emit(POINTER_EVT_DOWN, {pointerId: 2});
        stage.emit(POINTER_EVT_MOVE, {pointerId: 2});
        stage.emit(POINTER_EVT_MOVE, {pointerId: 2});
        stage.emit(POINTER_EVT_UP, {pointerId: 2});

        expect(eventLog).toEqual([
            ['down', 'A', 0, 1],
            ['move', 'A', 1, 1],
            ['move', 'A', 2, 1],
            ['move', 'A', 3, 1],
            ['blocked', 'B', 0, 1],
            ['up', 'A', 3, 1],
            ['down', 'B', 0, 2],
            ['move', 'B', 1, 2],
            ['move', 'B', 2, 2],
            ['move', 'B', 3, 2],
            ['up', 'B', 3, 2],
            ['down', 'A', 0, 3],
            ['move', 'A', 1, 3],
            ['move', 'A', 2, 3],
            ['blocked', 'B', 0, 3],
            ['up', 'A', 2, 3],
            ['down', 'B', 0, 4],
            ['move', 'B', 1, 4],
            ['move', 'B', 2, 4],
            ['up', 'B', 2, 4],
        ]);

        subA.unsubscribe();
        subB.unsubscribe();
    });

    it('releases active pointer on pointerupoutside and pointercancel', () => {
        const app = createMockPointerApp<TestPixiEvent>();
        const {stage} = app;
        const subscribeToDown = observeDrag<TestPixiEvent>(app);

        const targetA = createMockPixiEventTarget<TestPixiEvent>();
        const targetB = createMockPixiEventTarget<TestPixiEvent>();
        const targetC = createMockPixiEventTarget<TestPixiEvent>();
        const seenA: number[] = [];
        const seenB: number[] = [];
        const seenC: number[] = [];
        const subA = subscribeToDown(targetA, {onDrag: (event) => seenA.push(event.pointerId)});
        const subB = subscribeToDown(targetB, {onDrag: (event) => seenB.push(event.pointerId)});
        const subC = subscribeToDown(targetC, {onDrag: (event) => seenC.push(event.pointerId)});

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
        const seenA: number[] = [];
        const seenB: number[] = [];

        const subA = subscribeToDown(targetA, {onDrag: (event) => seenA.push(event.pointerId)});
        const subB = subscribeToDown(targetB, {onDrag: (event) => seenB.push(event.pointerId)});

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

    it('passes onDown context to onDrag/onUp and routes listener throws to onError', () => {
        const app = createMockPointerApp<TestPixiEvent>();
        const {stage} = app;
        const subscribeToDown = observeDrag<TestPixiEvent>(app);

        const target = createMockPixiEventTarget<TestPixiEvent>();
        const throwTarget = createMockPixiEventTarget<TestPixiEvent>();
        let downCount = 0;
        const eventLog: DragEventLogEntry[] = [];
        const onErrorPhases: string[] = [];

        const sub = subscribeToDown<{targetName: string; moveCount: number; downCount: number}>(target, {
            onDown() {
                const context = {targetName: 'main', moveCount: 0, downCount: ++downCount};
                eventLog.push(['down', context.targetName, context.moveCount, context.downCount]);
                return context;
            },
            onDrag(_, context) {
                context.moveCount += 1;
                eventLog.push(['move', context.targetName, context.moveCount, context.downCount]);
            },
            onUp(_, context) {
                eventLog.push(['up', context.targetName, context.moveCount, context.downCount]);
            },
        });

        const throwSub = subscribeToDown(throwTarget, {
            onDown() {
                throw new Error('down boom');
            },
            onError(error, phase) {
                const message = error instanceof Error ? error.message : String(error);
                onErrorPhases.push(`${phase}:${message}`);
            },
        });

        target.emit(POINTER_EVT_DOWN, {pointerId: 31});
        stage.emit(POINTER_EVT_MOVE, {pointerId: 31});
        stage.emit(POINTER_EVT_MOVE, {pointerId: 31});
        stage.emit(POINTER_EVT_MOVE, {pointerId: 31});
        stage.emit(POINTER_EVT_UP, {pointerId: 31});
        expect(eventLog).toEqual([
            ['down', 'main', 0, 1],
            ['move', 'main', 1, 1],
            ['move', 'main', 2, 1],
            ['move', 'main', 3, 1],
            ['up', 'main', 3, 1],
        ]);

        throwTarget.emit(POINTER_EVT_DOWN, {pointerId: 41});
        expect(onErrorPhases).toEqual(['onDown:down boom']);

        target.emit(POINTER_EVT_DOWN, {pointerId: 42});
        stage.emit(POINTER_EVT_MOVE, {pointerId: 42});
        stage.emit(POINTER_EVT_MOVE, {pointerId: 42});
        stage.emit(POINTER_EVT_MOVE, {pointerId: 42});
        stage.emit(POINTER_EVT_UP, {pointerId: 42});
        expect(eventLog).toEqual([
            ['down', 'main', 0, 1],
            ['move', 'main', 1, 1],
            ['move', 'main', 2, 1],
            ['move', 'main', 3, 1],
            ['up', 'main', 3, 1],
            ['down', 'main', 0, 2],
            ['move', 'main', 1, 2],
            ['move', 'main', 2, 2],
            ['move', 'main', 3, 2],
            ['up', 'main', 3, 2],
        ]);

        sub.unsubscribe();
        throwSub.unsubscribe();
    });
});
