import { Subject, throttleTime } from 'rxjs';

export interface AppRenderLike {
  render?(): void;
  destroy?(...args: unknown[]): unknown;
}

export interface RenderHelper {
  request(): void;
  now(): void;
  destroy(): void;
}

export interface CreateRenderHelperOptions {
  throttleMs?: number;
  leading?: boolean;
  trailing?: boolean;
}

const NOOP_RENDER_HELPER: RenderHelper = {
  request(): void {},
  now(): void {},
  destroy(): void {},
};

const sharedRenderHelpers = new WeakMap<AppRenderLike, RenderHelper>();
const appDestroyCleanup = new WeakMap<AppRenderLike, Set<() => void>>();

function runDestroyCleanup(app: AppRenderLike): void {
  const cleanupSet = appDestroyCleanup.get(app);
  if (!cleanupSet) {
    return;
  }

  for (const cleanup of cleanupSet) {
    cleanup();
  }
  cleanupSet.clear();
  appDestroyCleanup.delete(app);
}

function registerAppDestroyCleanup(app: AppRenderLike, cleanup: () => void): void {
  let cleanupSet = appDestroyCleanup.get(app);
  if (!cleanupSet) {
    cleanupSet = new Set();
    appDestroyCleanup.set(app, cleanupSet);
  }
  cleanupSet.add(cleanup);

  if (cleanupSet.size > 1) {
    return;
  }

  const originalDestroy = app.destroy;
  if (typeof originalDestroy !== 'function') {
    return;
  }

  const wrappedDestroy = (...args: unknown[]): unknown => {
    try {
      return originalDestroy.apply(app, args);
    } finally {
      runDestroyCleanup(app);
    }
  };

  try {
    app.destroy = wrappedDestroy;
  } catch {
    // If destroy is non-writable, shared helper cleanup falls back to GC-only behavior.
  }
}

export function createRenderHelper(
  app?: AppRenderLike,
  options: CreateRenderHelperOptions = {},
): RenderHelper {
  const render = app?.render?.bind(app);
  if (!render) {
    return NOOP_RENDER_HELPER;
  }

  const throttleMs = Math.max(0, options.throttleMs ?? 30);
  if (throttleMs <= 0) {
    return {
      request: () => render(),
      now: () => render(),
      destroy: () => undefined,
    };
  }

  const leading = options.leading ?? true;
  const trailing = options.trailing ?? false;
  const renderPulse$ = new Subject<void>();
  const renderSub = renderPulse$
    .pipe(throttleTime(throttleMs, undefined, { leading, trailing }))
    .subscribe(() => {
      render();
    });

  return {
    request(): void {
      renderPulse$.next();
    },
    now(): void {
      render();
    },
    destroy(): void {
      renderSub.unsubscribe();
      renderPulse$.complete();
    },
  };
}

export function getSharedRenderHelper(
  app?: AppRenderLike,
  options: CreateRenderHelperOptions = {},
): RenderHelper {
  if (!app?.render) {
    return NOOP_RENDER_HELPER;
  }

  const cachedHelper = sharedRenderHelpers.get(app);
  if (cachedHelper) {
    return cachedHelper;
  }

  // First caller config wins for each app key.
  const baseHelper = createRenderHelper(app, options);
  const sharedHelper: RenderHelper = {
    request(): void {
      baseHelper.request();
    },
    now(): void {
      baseHelper.now();
    },
    destroy(): void {
      // Shared helpers are app-scoped; individual consumers should not tear them down.
    },
  };

  registerAppDestroyCleanup(app, () => {
    baseHelper.destroy();
    sharedRenderHelpers.delete(app);
  });

  sharedRenderHelpers.set(app, sharedHelper);
  return sharedHelper;
}
