import {describe, expect, it, vi} from 'vitest';
import {BehaviorSubject} from 'rxjs';
import observeDrag from '../src/observe-drag';
import {dragTargetDecorator} from '../src/dragTargetDecorator';
import type {DragOwner, PixiEventLike} from '../src/type';
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
type TestPixiEventWithGlobal = TestPixiEvent & {global: {x: number; y: number}};
type DragEventLogEntry =
    | ['down', string, number, number]
    | ['move', string, number, number]
    | ['up', string, number, number]
    | ['blocked', string, number, number];

describe('observeDrag', () => {
    it('uses independent pointer locks per stage by default', () => {
        const appA = createMockPointerApp<TestPixiEvent>();
        const appB = createMockPointerApp<TestPixiEvent>();
        const subA = observeDrag<TestPixiEvent>(appA);
        const subB = observeDrag<TestPixiEvent>(appB);

        const targetA = createMockPixiEventTarget<TestPixiEvent>();
        const targetB = createMockPixiEventTarget<TestPixiEvent>();

        const movesA: number[] = [];
        const movesB: number[] = [];
        const blockedB: number[] = [];

        const dragA = subA(targetA, {
            onMove(event) {
                movesA.push(event.pointerId);
            },
        });

        const dragB = subB(targetB, {
            onMove(event) {
                movesB.push(event.pointerId);
            },
            onBlocked(event) {
                blockedB.push(event.pointerId);
            },
        });

        targetA.emit(POINTER_EVT_DOWN, {pointerId: 1});
        appA.stage.emit(POINTER_EVT_MOVE, {pointerId: 1});

        // Different stage: should not be blocked while appA still owns its stage.
        targetB.emit(POINTER_EVT_DOWN, {pointerId: 2});
        appB.stage.emit(POINTER_EVT_MOVE, {pointerId: 2});
        appB.stage.emit(POINTER_EVT_UP, {pointerId: 2});

        appA.stage.emit(POINTER_EVT_UP, {pointerId: 1});

        expect(movesA).toEqual([1]);
        expect(blockedB).toEqual([]);
        expect(movesB).toEqual([2]);

        dragA.unsubscribe();
        dragB.unsubscribe();
    });

    it('supports shared lock injection across factories', () => {
        const sharedLock$ = new BehaviorSubject<DragOwner>(null);
        const appA = createMockPointerApp<TestPixiEvent>();
        const appB = createMockPointerApp<TestPixiEvent>();
        const subA = observeDrag<TestPixiEvent>(appA, {activePointer$: sharedLock$});
        const subB = observeDrag<TestPixiEvent>(appB, {activePointer$: sharedLock$});

        const targetA = createMockPixiEventTarget<TestPixiEvent>();
        const targetB = createMockPixiEventTarget<TestPixiEvent>();

        const movesA: number[] = [];
        const movesB: number[] = [];
        const blockedB: number[] = [];

        const dragA = subA(targetA, {
            onMove(event) {
                movesA.push(event.pointerId);
            },
        });
        const dragB = subB(targetB, {
            onMove(event) {
                movesB.push(event.pointerId);
            },
            onBlocked(event) {
                blockedB.push(event.pointerId);
            },
        });

        targetA.emit(POINTER_EVT_DOWN, {pointerId: 11});
        appA.stage.emit(POINTER_EVT_MOVE, {pointerId: 11});

        targetB.emit(POINTER_EVT_DOWN, {pointerId: 12});
        appB.stage.emit(POINTER_EVT_MOVE, {pointerId: 12});
        expect(blockedB).toEqual([12]);
        expect(movesB).toEqual([]);

        appA.stage.emit(POINTER_EVT_UP, {pointerId: 11});
        targetB.emit(POINTER_EVT_DOWN, {pointerId: 12});
        appB.stage.emit(POINTER_EVT_MOVE, {pointerId: 12});
        appB.stage.emit(POINTER_EVT_UP, {pointerId: 12});

        expect(movesA).toEqual([11]);
        expect(movesB).toEqual([12]);

        dragA.unsubscribe();
        dragB.unsubscribe();
    });

    it('locks to first pointerdown and calls onBlocked for contenders until released', () => {
        const app = createMockPointerApp<TestPixiEvent>();
        const {stage} = app;
        const subscribeToDown = observeDrag<TestPixiEvent>(app);

        const targetA = createMockPixiEventTarget<TestPixiEvent>();
        const targetB = createMockPixiEventTarget<TestPixiEvent>();

        let downCount = 0;
        const eventLog: DragEventLogEntry[] = [];

        const subA = subscribeToDown<{targetName: string; moveCount: number; downCount: number}>(targetA, {
            onStart() {
                const context = {targetName: 'A', moveCount: 0, downCount: ++downCount};
                eventLog.push(['down', context.targetName, context.moveCount, context.downCount]);
                return context;
            },
            onMove(_event, context) {
                context.moveCount += 1;
                eventLog.push(['move', context.targetName, context.moveCount, context.downCount]);
            },
            onUp(_event, context) {
                eventLog.push(['up', context.targetName, context.moveCount, context.downCount]);
            },
        });
        const subB = subscribeToDown<{targetName: string; moveCount: number; downCount: number}>(targetB, {
            onStart() {
                const context = {targetName: 'B', moveCount: 0, downCount: ++downCount};
                eventLog.push(['down', context.targetName, context.moveCount, context.downCount]);
                return context;
            },
            onMove(_event, context) {
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
        const subA = subscribeToDown(targetA, {onMove: (event) => seenA.push(event.pointerId)});
        const subB = subscribeToDown(targetB, {onMove: (event) => seenB.push(event.pointerId)});
        const subC = subscribeToDown(targetC, {onMove: (event) => seenC.push(event.pointerId)});

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

        const subA = subscribeToDown(targetA, {onMove: (event) => seenA.push(event.pointerId)});
        const subB = subscribeToDown(targetB, {onMove: (event) => seenB.push(event.pointerId)});

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

    it('dragTargetDecorator works with no parameters', () => {
        const app = createMockPointerApp<TestPixiEventWithGlobal>();
        const {stage} = app;
        const subscribeToDown = observeDrag<TestPixiEventWithGlobal>(app);
        const target = createMockPixiEventTarget<TestPixiEventWithGlobal>();
        const dragTarget = {
            position: {
                x: 5,
                y: 7,
                set(x: number, y: number) {
                    this.x = x;
                    this.y = y;
                },
            },
            parent: {
                toLocal(point: {x: number; y: number}) {
                    return {x: point.x / 2, y: point.y / 2};
                },
            },
        };

        const sub = subscribeToDown(target, dragTargetDecorator(), {dragTarget});

        target.emit(POINTER_EVT_DOWN, {pointerId: 51, global: {x: 20, y: 20}});
        stage.emit(POINTER_EVT_MOVE, {pointerId: 51, global: {x: 30, y: 40}});
        stage.emit(POINTER_EVT_UP, {pointerId: 51, global: {x: 30, y: 40}});

        expect(dragTarget.position.x).toBe(10);
        expect(dragTarget.position.y).toBe(17);
        sub.unsubscribe();
    });

    it('passes direct dragTarget from subscription options to callbacks', () => {
        const app = createMockPointerApp<TestPixiEvent>();
        const {stage} = app;
        const subscribeToDown = observeDrag<TestPixiEvent>(app);
        const target = createMockPixiEventTarget<TestPixiEvent>();
        const dragTarget = {id: 'target-A'};
        const seenTargetIds: string[] = [];

        const sub = subscribeToDown<{moves: number}, {id: string}>(
            target,
            {
                onStart(_event, dragTargetFromOptions) {
                    seenTargetIds.push(`start:${dragTargetFromOptions?.id ?? 'none'}`);
                    return {moves: 0};
                },
                onMove(_event, context, dragTargetFromOptions) {
                    context.moves += 1;
                    seenTargetIds.push(`move${context.moves}:${dragTargetFromOptions?.id ?? 'none'}`);
                },
                onUp(_event, _context, dragTargetFromOptions) {
                    seenTargetIds.push(`up:${dragTargetFromOptions?.id ?? 'none'}`);
                },
            },
            {dragTarget},
        );

        target.emit(POINTER_EVT_DOWN, {pointerId: 51});
        stage.emit(POINTER_EVT_MOVE, {pointerId: 51});
        stage.emit(POINTER_EVT_UP, {pointerId: 51});

        expect(seenTargetIds).toEqual(['start:target-A', 'move1:target-A', 'up:target-A']);
        sub.unsubscribe();
    });

    it('supports getDragTarget resolver functions from subscription options', () => {
        const app = createMockPointerApp<TestPixiEvent>();
        const {stage} = app;
        const subscribeToDown = observeDrag<TestPixiEvent>(app);
        const target = createMockPixiEventTarget<TestPixiEvent>();
        const targetA = {id: 'A'};
        const targetB = {id: 'B'};
        const seenTargetIds: string[] = [];

        const sub = subscribeToDown<{useB: boolean}, {id: string}>(
            target,
            {
                onStart(event) {
                    return {useB: event.pointerId === 62};
                },
                onMove(_event, _context, dragTargetFromOptions) {
                    seenTargetIds.push(dragTargetFromOptions?.id ?? 'none');
                },
            },
            {
                getDragTarget(_downEvent, context) {
                    return context?.useB ? targetB : targetA;
                },
            },
        );

        target.emit(POINTER_EVT_DOWN, {pointerId: 61});
        stage.emit(POINTER_EVT_MOVE, {pointerId: 61});
        stage.emit(POINTER_EVT_UP, {pointerId: 61});

        target.emit(POINTER_EVT_DOWN, {pointerId: 62});
        stage.emit(POINTER_EVT_MOVE, {pointerId: 62});
        stage.emit(POINTER_EVT_UP, {pointerId: 62});

        expect(seenTargetIds).toEqual(['A', 'B']);

        sub.unsubscribe();
    });

    it('passes onStart context to onMove/onUp and routes listener throws to onError', () => {
        const app = createMockPointerApp<TestPixiEvent>();
        const {stage} = app;
        const subscribeToDown = observeDrag<TestPixiEvent>(app);

        const target = createMockPixiEventTarget<TestPixiEvent>();
        const throwTarget = createMockPixiEventTarget<TestPixiEvent>();
        let downCount = 0;
        const eventLog: DragEventLogEntry[] = [];
        const onErrorPhases: string[] = [];

        const sub = subscribeToDown<{targetName: string; moveCount: number; downCount: number}>(target, {
            onStart() {
                const context = {targetName: 'main', moveCount: 0, downCount: ++downCount};
                eventLog.push(['down', context.targetName, context.moveCount, context.downCount]);
                return context;
            },
            onMove(_, context) {
                context.moveCount += 1;
                eventLog.push(['move', context.targetName, context.moveCount, context.downCount]);
            },
            onUp(_, context) {
                eventLog.push(['up', context.targetName, context.moveCount, context.downCount]);
            },
        });

        const throwSub = subscribeToDown(throwTarget, {
            onStart() {
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
        expect(onErrorPhases).toEqual(['onStart:down boom']);

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

    it('releases blocked drag after 1s with no move activity', async () => {
        vi.useFakeTimers();
        try {
            const app = createMockPointerApp<TestPixiEvent>();
            const {stage} = app;
            const subscribeToDown = observeDrag<TestPixiEvent>(app);
            const targetA = createMockPixiEventTarget<TestPixiEvent>();
            const targetB = createMockPixiEventTarget<TestPixiEvent>();
            const movesB: number[] = [];
            const blockedB: number[] = [];

            const subA = subscribeToDown(targetA, {});
            const subB = subscribeToDown(targetB, {
                onMove(event) {
                    movesB.push(event.pointerId);
                },
                onBlocked(event) {
                    blockedB.push(event.pointerId);
                },
            });

            targetA.emit(POINTER_EVT_DOWN, {pointerId: 81});
            targetB.emit(POINTER_EVT_DOWN, {pointerId: 82});
            expect(blockedB).toEqual([82]);

            await vi.advanceTimersByTimeAsync(1000);

            targetB.emit(POINTER_EVT_DOWN, {pointerId: 82});
            stage.emit(POINTER_EVT_MOVE, {pointerId: 82});
            stage.emit(POINTER_EVT_UP, {pointerId: 82});

            expect(movesB).toEqual([82]);

            subA.unsubscribe();
            subB.unsubscribe();
        } finally {
            vi.useRealTimers();
        }
    });

    it('resets inactivity timeout on move and releases after 1s from last move', async () => {
        vi.useFakeTimers();
        try {
            const app = createMockPointerApp<TestPixiEvent>();
            const {stage} = app;
            const subscribeToDown = observeDrag<TestPixiEvent>(app);
            const targetA = createMockPixiEventTarget<TestPixiEvent>();
            const targetB = createMockPixiEventTarget<TestPixiEvent>();
            const blockedB: number[] = [];
            const movesB: number[] = [];

            const subA = subscribeToDown(targetA, {});
            const subB = subscribeToDown(targetB, {
                onBlocked(event) {
                    blockedB.push(event.pointerId);
                },
                onMove(event) {
                    movesB.push(event.pointerId);
                },
            });

            targetA.emit(POINTER_EVT_DOWN, {pointerId: 91});
            await vi.advanceTimersByTimeAsync(500);
            stage.emit(POINTER_EVT_MOVE, {pointerId: 91});

            await vi.advanceTimersByTimeAsync(900);
            targetB.emit(POINTER_EVT_DOWN, {pointerId: 92});
            expect(blockedB).toEqual([92]);

            await vi.advanceTimersByTimeAsync(100);
            targetB.emit(POINTER_EVT_DOWN, {pointerId: 92});
            stage.emit(POINTER_EVT_MOVE, {pointerId: 92});
            stage.emit(POINTER_EVT_UP, {pointerId: 92});

            expect(movesB).toEqual([92]);

            subA.unsubscribe();
            subB.unsubscribe();
        } finally {
            vi.useRealTimers();
        }
    });

    it('supports custom abortTime in subscription options', async () => {
        vi.useFakeTimers();
        try {
            const app = createMockPointerApp<TestPixiEvent>();
            const {stage} = app;
            const subscribeToDown = observeDrag<TestPixiEvent>(app);
            const targetA = createMockPixiEventTarget<TestPixiEvent>();
            const targetB = createMockPixiEventTarget<TestPixiEvent>();
            const blockedB: number[] = [];
            const movesB: number[] = [];

            const subA = subscribeToDown(targetA, {}, {abortTime: 200});
            const subB = subscribeToDown(targetB, {
                onBlocked(event) {
                    blockedB.push(event.pointerId);
                },
                onMove(event) {
                    movesB.push(event.pointerId);
                },
            });

            targetA.emit(POINTER_EVT_DOWN, {pointerId: 101});
            targetB.emit(POINTER_EVT_DOWN, {pointerId: 102});
            expect(blockedB).toEqual([102]);

            await vi.advanceTimersByTimeAsync(200);

            targetB.emit(POINTER_EVT_DOWN, {pointerId: 102});
            stage.emit(POINTER_EVT_MOVE, {pointerId: 102});
            stage.emit(POINTER_EVT_UP, {pointerId: 102});

            expect(movesB).toEqual([102]);

            subA.unsubscribe();
            subB.unsubscribe();
        } finally {
            vi.useRealTimers();
        }
    });

    it('disables inactivity watchdog when abortTime is 0', async () => {
        vi.useFakeTimers();
        try {
            const app = createMockPointerApp<TestPixiEvent>();
            const {stage} = app;
            const subscribeToDown = observeDrag<TestPixiEvent>(app);
            const targetA = createMockPixiEventTarget<TestPixiEvent>();
            const targetB = createMockPixiEventTarget<TestPixiEvent>();
            const blockedB: number[] = [];
            const movesB: number[] = [];

            const subA = subscribeToDown(targetA, {}, {abortTime: 0});
            const subB = subscribeToDown(targetB, {
                onBlocked(event) {
                    blockedB.push(event.pointerId);
                },
                onMove(event) {
                    movesB.push(event.pointerId);
                },
            });

            targetA.emit(POINTER_EVT_DOWN, {pointerId: 111});
            await vi.advanceTimersByTimeAsync(5000);

            targetB.emit(POINTER_EVT_DOWN, {pointerId: 112});
            expect(blockedB).toEqual([112]);

            stage.emit(POINTER_EVT_UP, {pointerId: 111});
            targetB.emit(POINTER_EVT_DOWN, {pointerId: 112});
            stage.emit(POINTER_EVT_MOVE, {pointerId: 112});
            stage.emit(POINTER_EVT_UP, {pointerId: 112});

            expect(movesB).toEqual([112]);

            subA.unsubscribe();
            subB.unsubscribe();
        } finally {
            vi.useRealTimers();
        }
    });
});
