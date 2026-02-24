import './pixiEnvironment';
import type { Application } from 'pixi.js';
import { Container, Graphics } from 'pixi.js';
import type { BoxRenderer, BoxTree } from './BoxTree';
import { BOX_UX_CONTENT_ORDER, BoxUxContextMap, BoxUxPixiContentMap } from './BoxUxContextMap';
import {
  BACKGROUND_CONTAINER,
  BOX_UX_ENV,
  CHILD_CONTAINER,
  OVERLAY_CONTAINER,
  ROOT_CONTAINER,
  STROKE_CONTAINER,
} from './constants.ux';
import { asColorNumber, asNonNegativeNumber, resolveStyleProp } from './utils.ux';
import type {
  BoxTreeFillStyle,
  BoxTreeStrokeStyle,
  BoxTreeStyleMap,
  BoxTreeUxStyleManagerLike,
} from './types.ux';

export { BOX_UX_CONTENT_ORDER, BOX_RENDER_CONTENT_ORDER } from './BoxUxContextMap';
export {
  BACKGROUND_CONTAINER,
  BOX_UX_ENV,
  CHILD_CONTAINER,
  OVERLAY_CONTAINER,
  ROOT_CONTAINER,
  STROKE_CONTAINER,
} from './constants.ux';
export type {
  BoxTreeFillStyle,
  BoxTreeStrokeStyle,
  BoxTreeStyleMap,
  BoxTreeUxStyleManagerLike,
} from './types.ux';

function isBoxTreeUx(value: unknown): value is BoxTreeUx {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const candidate = value as Partial<BoxTreeUx>;
  return candidate.container instanceof Container
    && typeof candidate.env === 'string';
}

/**
 * Default BoxTree UX implementation for Pixi containers.
 *
 * Exposes `content` as an ordered layer map:
 * - 0: BACKGROUND
 * - 50: CHILDREN
 * - 100: OVERLAY
 */
export class BoxTreeUx implements BoxRenderer {
  static readonly DEFAULT_STYLES: BoxTreeUxStyleManagerLike = {
    match: () => undefined,
  };

  readonly env = BOX_UX_ENV.PIXI;
  readonly box: BoxTree;
  readonly container: Container;
  readonly contentMap: BoxUxContextMap;

  isInitialized = false;

  constructor(box: BoxTree) {
    this.box = box;

    this.container = new Container({
      label: `${this.box.identityPath}-container`,
      sortableChildren: true,
    });

    this.contentMap = new BoxUxPixiContentMap(this.box);
  }

  get styles(): BoxTreeUxStyleManagerLike {
    return this.box.styles ?? BoxTreeUx.DEFAULT_STYLES;
  }

  get app(): Application | undefined {
    return this.box.app;
  }

  get background(): Graphics {
    return this.contentMap.$background();
  }

  get childContainer(): Container {
    return this.contentMap.$children();
  }

  get overlayContainer(): Container {
    return this.contentMap.$overlay();
  }

  get strokeGraphic(): Graphics {
    return this.contentMap.$stroke();
  }

  // Back-compat alias for older call sites.
  get content(): BoxUxContextMap {
    return this.contentMap;
  }

  get childUxs(): ReadonlyMap<string, BoxTreeUx> {
    return this.#getChildUxs();
  }

  get childRenderers(): ReadonlyMap<string, BoxTreeUx> {
    return this.#getChildUxs();
  }

  generateStyleMap(targetBox: BoxTree): BoxTreeStyleMap {
    const styleContext = {
      styles: this.styles,
      inlineStyle: targetBox.style,
      styleNouns: targetBox.styleNouns,
      styleName: targetBox.styleName,
      states: targetBox.resolvedVerb,
    } as const;

    const fillColor = asColorNumber(resolveStyleProp('bgColor', styleContext));
    const fillAlpha = asNonNegativeNumber(resolveStyleProp(
      'bgAlpha',
      styleContext,
      fillColor !== undefined ? 1 : undefined,
    ));
    const strokeColor = asColorNumber(resolveStyleProp('bgStrokeColor', styleContext));
    const strokeAlpha = asNonNegativeNumber(resolveStyleProp(
      'bgStrokeAlpha',
      styleContext,
      strokeColor !== undefined ? 1 : undefined,
    ));
    const strokeWidth = asNonNegativeNumber(resolveStyleProp('bgStrokeSize', styleContext, 0));

    return {
      fill: {
        color: fillColor,
        alpha: fillAlpha,
      },
      stroke: {
        color: strokeColor,
        alpha: strokeAlpha,
        width: strokeWidth,
      },
    };
  }

  #readChildUx(child: BoxTree): BoxTreeUx | undefined {
    if (isBoxTreeUx(child.ux)) {
      return child.ux;
    }
    return isBoxTreeUx(child.renderer) ? child.renderer : undefined;
  }

  getChildUx(key: string): BoxTreeUx | undefined {
    const child = this.box.getChild(key);
    return child ? this.#readChildUx(child) : undefined;
  }

  getChildRenderer(key: string): BoxTreeUx | undefined {
    return this.getChildUx(key);
  }

  getContainer(key: unknown): unknown {
    if (key === ROOT_CONTAINER) {
      return this.container;
    }
    if (key === BACKGROUND_CONTAINER) {
      return this.background;
    }
    if (key === CHILD_CONTAINER) {
      return this.childContainer;
    }
    if (key === OVERLAY_CONTAINER) {
      return this.overlayContainer;
    }
    if (key === STROKE_CONTAINER) {
      return this.strokeGraphic;
    }
    return undefined;
  }

  attach(targetContainer?: Container): Container {
    const target = targetContainer ?? this.app?.stage;
    if (!target) {
      throw new Error(`${this.box.identityPath}: attach requires targetContainer or ux.app`);
    }
    target.addChild(this.container);
    return this.container;
  }

  #getChildUxs(): ReadonlyMap<string, BoxTreeUx> {
    const out = new Map<string, BoxTreeUx>();
    for (const child of this.box.children) {
      const childUx = this.#readChildUx(child);
      if (childUx) {
        out.set(child.name, childUx);
      }
    }
    return out;
  }

  #syncChildren(childrenMap: ReadonlyMap<string, BoxTree>): void {
    const childContainer = this.childContainer;

    // Rebuild child container content every cycle for deterministic ordering.
    childContainer.removeChildren();
    for (const child of childrenMap.values()) {
      child.render();
      const childUx = this.#readChildUx(child);
      if (childUx) {
        childContainer.addChild(childUx.container);
      }
    }
  }

  #renderBackground(): void {
    const background = this.background;
    const overlay = this.overlayContainer;
    const strokeGraphic = this.strokeGraphic;

    const styleMap = this.generateStyleMap(this.box);
    const bgColor = styleMap.fill.color;
    const bgAlpha = styleMap.fill.alpha ?? 1;
    const bgStrokeColor = styleMap.stroke.color;
    const bgStrokeAlpha = styleMap.stroke.alpha ?? 1;
    const bgStrokeSize = styleMap.stroke.width ?? 0;

    background.clear();
    strokeGraphic.clear();

    const { width, height } = this.box.rect;
    const hasFill = bgColor !== undefined;
    const hasStroke = bgStrokeColor !== undefined && bgStrokeSize > 0;

    background.visible = hasFill;
    strokeGraphic.visible = hasStroke;
    overlay.visible = hasStroke;

    if (hasFill) {
      background.rect(0, 0, width, height);
      background.fill({ color: bgColor, alpha: bgAlpha });
    }

    if (hasStroke) {
      strokeGraphic.rect(0, 0, width, height);
      strokeGraphic.stroke({
        color: bgStrokeColor,
        alpha: bgStrokeAlpha,
        width: bgStrokeSize,
      });
    }
  }

  #destroyContent(): void {
    const childLayer = this.contentMap.get(BOX_UX_CONTENT_ORDER.CHILDREN);
    if (childLayer instanceof Container) {
      childLayer.removeChildren();
    }

    for (const layerContent of this.contentMap.values()) {
      if (layerContent.parent === this.container) {
        this.container.removeChild(layerContent);
      }
      layerContent.destroy({ children: true });
    }
    this.contentMap.clear();
  }

  init(): void {
    if (this.isInitialized) {
      return;
    }
    this.isInitialized = true;
  }

  private renderUp(): void {
    if (!this.isInitialized) {
      this.init();
    }

    this.container.position.set(this.box.x, this.box.y);
    this.container.zIndex = this.box.order;
    this.container.sortableChildren = true;

    this.container.visible = true;

    const childrenMap = this.box.getChildBoxes();
    this.contentMap.$ensureDefaults();
    this.#syncChildren(childrenMap);
    this.#renderBackground();
    this.contentMap.$render(this.container);
  }

  private renderDown(): void {
    this.container.visible = false;
    if (!this.isInitialized) {
      return;
    }
    this.#destroyContent();
    this.isInitialized = false;
  }

  render(): void {
    if (this.box.value.isVisible) {
      this.renderUp();
      return;
    }
    this.renderDown();
  }

  clear(): void {
    this.#destroyContent();
    this.isInitialized = false;
  }
}

export const BoxTreeRenderer = BoxTreeUx;
export type BoxTreeRenderer = BoxTreeUx;
export type BoxTreeStyleManagerLike = BoxTreeUxStyleManagerLike;
export const BoxUx = BoxTreeUx;
