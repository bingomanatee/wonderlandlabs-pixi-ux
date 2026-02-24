import { Container, Graphics } from 'pixi.js';
import type { BoxTree } from './BoxTree';

export const BOX_UX_CONTENT_ORDER = {
  BACKGROUND: 0,
  CHILDREN: 50,
  OVERLAY: 100,
} as const;
export const BOX_RENDER_CONTENT_ORDER = BOX_UX_CONTENT_ORDER;

export type BoxUxContent = Container | Graphics;

export type BoxUxContextFactories = {
  createBackgroundGraphic: () => Graphics;
  createChildrenContainer: () => Container;
  createOverlayContainer: () => Container;
  createStrokeGraphic: () => Graphics;
};

function isContentEmpty(content: BoxUxContent): boolean {
  if (!content.visible) {
    return true;
  }
  if (content instanceof Graphics) {
    return false;
  }
  if (content instanceof Container) {
    return !content.children.some((child) => child.visible);
  }
  return true;
}

export class BoxUxContextMap extends Map<number, BoxUxContent> {
  readonly $box: BoxTree;
  readonly #factories: BoxUxContextFactories;

  constructor(box: BoxTree, factories: BoxUxContextFactories) {
    super();
    this.$box = box;
    this.#factories = factories;
  }

  $background(): Graphics {
    const existing = this.get(BOX_UX_CONTENT_ORDER.BACKGROUND);
    if (existing instanceof Graphics) {
      return existing;
    }
    const next = this.#factories.createBackgroundGraphic();
    this.set(BOX_UX_CONTENT_ORDER.BACKGROUND, next);
    return next;
  }

  $children(): Container {
    const existing = this.get(BOX_UX_CONTENT_ORDER.CHILDREN);
    if (existing instanceof Container) {
      return existing;
    }
    const next = this.#factories.createChildrenContainer();
    this.set(BOX_UX_CONTENT_ORDER.CHILDREN, next);
    return next;
  }

  $overlay(): Container {
    const existing = this.get(BOX_UX_CONTENT_ORDER.OVERLAY);
    if (existing instanceof Container) {
      return existing;
    }
    const next = this.#factories.createOverlayContainer();
    this.set(BOX_UX_CONTENT_ORDER.OVERLAY, next);
    return next;
  }

  $stroke(): Graphics {
    const overlay = this.$overlay();
    const existing = overlay.children.find((child) => child instanceof Graphics);
    if (existing instanceof Graphics) {
      return existing;
    }
    const next = this.#factories.createStrokeGraphic();
    overlay.addChild(next);
    return next;
  }

  $ensureDefaults(): void {
    this.$background();
    this.$children();
    this.$overlay();
    this.$stroke();
  }

  $render(parent: Container): void {
    const ordered = [...this.entries()].sort((a, b) => a[0] - b[0]);
    for (const [order, content] of ordered) {
      content.zIndex = order;
      if (isContentEmpty(content)) {
        if (content.parent === parent) {
          parent.removeChild(content);
        }
        continue;
      }
      if (content.parent !== parent) {
        parent.addChild(content);
      }
    }
  }
}

export class BoxUxPixiContentMap extends BoxUxContextMap {
  constructor(box: BoxTree) {
    super(box, {
      createBackgroundGraphic: () => {
        const background = new Graphics();
        background.label = `${box.identityPath}-background`;
        background.eventMode = 'none';
        return background;
      },
      createChildrenContainer: () => {
        const children = new Container({ label: `${box.identityPath}-children` });
        children.sortableChildren = true;
        return children;
      },
      createOverlayContainer: () => {
        const overlay = new Container({ label: `${box.identityPath}-overlay` });
        overlay.sortableChildren = true;
        overlay.eventMode = 'none';
        return overlay;
      },
      createStrokeGraphic: () => {
        const stroke = new Graphics();
        stroke.label = `${box.identityPath}-stroke`;
        stroke.eventMode = 'none';
        return stroke;
      },
    });
  }
}

export const BoxRenderContentMap = BoxUxContextMap;
export type BoxRenderContentMap = BoxUxContextMap;
