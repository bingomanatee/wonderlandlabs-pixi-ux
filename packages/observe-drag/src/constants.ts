export const POINTER_EVT_DOWN = 'pointerdown';
export const POINTER_EVT_MOVE = 'pointermove';
export const POINTER_EVT_UP = 'pointerup';
export const POINTER_EVT_UP_OUTSIDE = 'pointerupoutside';
export const POINTER_EVT_CANCEL = 'pointercancel';
export const DRAG_INACTIVITY_TIMEOUT_MS = 1000;
export const RENDER_THROTTLE_MS = 30;
export const WATCHDOG_STOP = 'stop' as const;
export const WATCHDOG_PULSE = 'pulse' as const;
export const DEBUG_SOURCE = 'observe-drag';

export const POINTER_EVENT_NAMES = [
    POINTER_EVT_DOWN,
    POINTER_EVT_MOVE,
    POINTER_EVT_UP,
    POINTER_EVT_UP_OUTSIDE,
    POINTER_EVT_CANCEL,
] as const;

export type PixiEventName = (typeof POINTER_EVENT_NAMES)[number];
export type WatchdogSignal = typeof WATCHDOG_STOP | typeof WATCHDOG_PULSE;
