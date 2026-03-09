import {Forest} from '@wonderlandlabs/forestry4';

export type PointerTraceToken = number;

interface ActivePointerTrace {
    token: PointerTraceToken;
    owner: string;
    pointerId: number | null;
    startedAt: number;
}

interface PointerManagerValue {
    activeTrace: ActivePointerTrace | null;
    nextToken: number;
}

/**
 * Global pointer ownership guard.
 * Ensures only one drag/trace flow owns pointer move/up processing at a time.
 */
export class PointerManager extends Forest<PointerManagerValue> {
    static readonly MAX_TRACE_AGE_MS = 5000;
    static #singleton?: PointerManager;

    static get singleton(): PointerManager {
        if (!this.#singleton) {
            this.#singleton = new PointerManager();
        }
        return this.#singleton;
    }

    private constructor() {
        super({
            value: {
                activeTrace: null,
                nextToken: 1,
            },
        });
    }

    #expireStaleTrace(now = Date.now()): void {
        const activeTrace = this.value.activeTrace;
        if (!activeTrace) {
            return;
        }
        if ((now - activeTrace.startedAt) > PointerManager.MAX_TRACE_AGE_MS) {
            this.set('activeTrace', null);
        }
    }

    beginTrace(owner: string, pointerId?: number | null): PointerTraceToken | null {
        this.#expireStaleTrace();
        if (this.value.activeTrace) {
            return null;
        }
        const token = this.value.nextToken;
        this.mutate((draft) => {
            draft.activeTrace = {
                token,
                owner,
                pointerId: pointerId ?? null,
                startedAt: Date.now(),
            };
            draft.nextToken += 1;
        });
        return token;
    }

    isOwner(token: PointerTraceToken | null | undefined): boolean {
        this.#expireStaleTrace();
        return typeof token === 'number' && this.value.activeTrace?.token === token;
    }

    acceptsPointer(token: PointerTraceToken | null | undefined, pointerId?: number | null): boolean {
        if (!this.isOwner(token)) {
            return false;
        }
        const activePointerId = this.value.activeTrace?.pointerId ?? null;
        if (activePointerId === null || pointerId == null) {
            return true;
        }
        return activePointerId === pointerId;
    }

    endTrace(token: PointerTraceToken | null | undefined): boolean {
        this.#expireStaleTrace();
        if (typeof token !== 'number' || this.value.activeTrace?.token !== token) {
            return false;
        }
        this.set('activeTrace', null);
        return true;
    }

    clear(): void {
        this.set('activeTrace', null);
    }

    get hasActiveTrace(): boolean {
        this.#expireStaleTrace();
        return !!this.value.activeTrace;
    }

    get activeOwner(): string | null {
        this.#expireStaleTrace();
        return this.value.activeTrace?.owner ?? null;
    }

    get activePointerId(): number | null {
        this.#expireStaleTrace();
        return this.value.activeTrace?.pointerId ?? null;
    }

    get activeStartedAt(): number | null {
        this.#expireStaleTrace();
        return this.value.activeTrace?.startedAt ?? null;
    }

    get activeAgeMs(): number | null {
        this.#expireStaleTrace();
        const startedAt = this.value.activeTrace?.startedAt;
        if (typeof startedAt !== 'number') {
            return null;
        }
        return Date.now() - startedAt;
    }
}
