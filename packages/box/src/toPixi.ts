import { Container, Graphics, TextStyle } from 'pixi.js';
import { z } from 'zod';
import { cellLayers } from './helpers.js';
import { resolveStyleValue, styleContextForCell, type BoxStyleContext } from './styleHelpers.js';
import {
  attachToParent,
  cleanupChildren,
  createContainer,
  drawBorderBands,
  ensureGraphics,
  ensureText,
  findContainerById,
  resolveNumericStyle,
  resolvePixiColor,
  toLocalRect,
} from './toPixi.helpers.js';
import type {
  BoxPreparedCellType,
  BoxPixiNodeContext,
  BoxPixiOptions,
  BoxPixiRenderInput,
  BoxPixiRendererManifest,
  BoxPixiRendererOverride,
  BoxStyleManagerLike,
} from './types.js';
const PixiContainerResult = z.custom<Container>((value) => value instanceof Container);
const PixiOverrideSchema = z.object({
  renderer: z.unknown(),
}).passthrough();

export function boxTreeToPixi(options: BoxPixiOptions): Container {
  return renderPixiNode({
    cell: options.root,
    parentContainer: options.parentContainer ?? options.app?.stage,
  }, options);
}

function renderPixiNode(
  { cell, parentContext, parentContainer, parentCell }: BoxPixiNodeContext,
  options: BoxPixiOptions,
): Container {
  if (!cell.location) {
    throw new Error(`boxTreeToPixi requires location data on "${cell.name}"`);
  }

  const context = styleContextForCell(cell, parentContext);
  const pathString = context.nouns.join('.');
  const hostParentContainer = parentContainer ?? options.app?.stage;
  const currentContainer = findContainerById(hostParentContainer, cell.id) ?? createContainer(cell.id);
  currentContainer.isRenderGroup = !!cell.renderGroup;

  const layers = cellLayers(cell);
  const localLocation = toLocalRect(cell.location, parentCell?.location);
  const renderInput: BoxPixiRenderInput = {
    options,
    context: {
      cell,
      parentContext,
      parentContainer,
      parentCell,
    },
    local: {
      layers,
      path: context.nouns,
      pathString,
      currentContainer,
      location: cell.location,
      localLocation,
    },
  };
  const override = resolvePixiRendererOverride(options.renderers, options.styleTree, context, cell.id);

  if (override && !override.post) {
    const result = validateRendererResult(override.renderer(renderInput), cell.name, pathString);
    if (result !== false) {
      const rendered = attachToParent(result ?? currentContainer, hostParentContainer, cell.id);
      renderChildren(rendered, cell, options, context);
      return rendered;
    }
  }

  const rendered = renderDefaultPixiNode(renderInput, context);
  attachToParent(rendered, hostParentContainer, cell.id);
  renderChildren(rendered, cell, options, context);

  if (override?.post) {
    const result = validateRendererResult(override.renderer({
      ...renderInput,
      local: {
        ...renderInput.local,
        currentContainer: rendered,
      },
    }), cell.name, pathString);
    if (result && result !== rendered) {
      if (result.parent === hostParentContainer) {
        return result;
      }
      return attachToParent(result, hostParentContainer, cell.id);
    }
  }

  return rendered;
}

function renderChildren(
  container: Container,
  cell: BoxPreparedCellType,
  options: BoxPixiOptions,
  context: BoxStyleContext,
): void {
  const desired = new Set<string>();

  for (const child of cell.children ?? []) {
    const childContainer = renderPixiNode({
      cell: child,
      parentContainer: container,
      parentContext: context,
      parentCell: cell,
    }, options);
    desired.add(childContainer.label ?? '');
  }

  cleanupChildren(container, desired);
}

function renderDefaultPixiNode(
  input: BoxPixiRenderInput,
  context: BoxStyleContext,
): Container {
  const {
    currentContainer,
    layers,
    localLocation,
    location,
  } = input.local;

  const fillColor = resolvePixiColor(
    resolveStyleValue(input.options.styleTree, context, ['background', 'color'])
  );
  const fillAlpha = resolveNumericStyle(resolveStyleValue(input.options.styleTree, context, ['background', 'alpha'])) ?? 1;

  currentContainer!.position.set(localLocation.x, localLocation.y);

  if (fillColor !== undefined) {
    const background = ensureGraphics(currentContainer!);
    background.clear();
    background.roundRect(0, 0, localLocation.w, localLocation.h, 6).fill({
      color: fillColor,
      alpha: fillAlpha,
    });
  } else {
    const background = currentContainer!.children.find((child) => child.label === '$$background');
    if (background instanceof Graphics) {
      background.clear();
    }
  }

  let hasBorders = false;
  for (const layer of layers) {
    if (layer.role !== 'border') {
      continue;
    }

    const borderColor = resolvePixiColor(
      resolveStyleValue(input.options.styleTree, context, ['border', 'color'], { extraNouns: [layer.role] })
      ?? resolveStyleValue(input.options.styleTree, context, ['border', 'color'])
    );

    if (borderColor === undefined) {
      continue;
    }

    hasBorders = true;
    const borderAlpha = resolveNumericStyle(
      resolveStyleValue(input.options.styleTree, context, ['border', 'alpha'], { extraNouns: [layer.role] })
      ?? resolveStyleValue(input.options.styleTree, context, ['border', 'alpha'])
    ) ?? 1;

    const background = ensureGraphics(currentContainer!);
    drawBorderBands(background, toLocalRect(layer.rect, location), toLocalRect(layer.insets, location), borderColor, borderAlpha);
  }

  if (!fillColor && !hasBorders) {
    const background = currentContainer!.children.find((child) => child.label === '$$background');
    if (background instanceof Graphics) {
      background.clear();
    }
  }

  renderDefaultContent(input, context);

  return currentContainer!;
}

function renderDefaultContent(
  input: BoxPixiRenderInput,
  context: BoxStyleContext,
): void {
  const { currentContainer, localLocation } = input.local;
  const content = input.context.cell.content;

  if (!currentContainer || !content || content.type !== 'text') {
    return;
  }

  const fill = resolvePixiColor(
    resolveStyleValue(input.options.styleTree, context, ['font', 'color'])
      ?? resolveStyleValue(input.options.styleTree, context, ['color'])
  ) ?? 0x111111;
  const alpha = resolveNumericStyle(
    resolveStyleValue(input.options.styleTree, context, ['font', 'alpha'])
      ?? resolveStyleValue(input.options.styleTree, context, ['alpha'])
  ) ?? 1;
  const fontSize = resolveNumericStyle(
    resolveStyleValue(input.options.styleTree, context, ['font', 'size'])
      ?? resolveStyleValue(input.options.styleTree, context, ['size'])
  ) ?? 14;
  const fontFamilyValue = resolveStyleValue<unknown>(input.options.styleTree, context, ['font', 'family'])
    ?? resolveStyleValue<unknown>(input.options.styleTree, context, ['font']);
  const fontFamily = Array.isArray(fontFamilyValue)
    ? fontFamilyValue.join(', ')
    : typeof fontFamilyValue === 'string'
      ? fontFamilyValue
      : 'Arial';
  const fontWeightValue = resolveStyleValue<unknown>(input.options.styleTree, context, ['font', 'weight']);
  const fontStyleValue = resolveStyleValue<unknown>(input.options.styleTree, context, ['font', 'style']);
  const alignValue = resolveStyleValue<unknown>(input.options.styleTree, context, ['font', 'align']);
  const letterSpacing = resolveNumericStyle(
    resolveStyleValue(input.options.styleTree, context, ['font', 'letterSpacing'])
  );
  const lineHeight = resolveNumericStyle(
    resolveStyleValue(input.options.styleTree, context, ['font', 'lineHeight'])
  );
  const wordWrap = resolveStyleValue<unknown>(input.options.styleTree, context, ['font', 'wordWrap']);
  const wordWrapWidth = resolveNumericStyle(
    resolveStyleValue(input.options.styleTree, context, ['font', 'wordWrapWidth'])
  ) ?? Math.max(1, localLocation.w);

  const textNode = ensureText(currentContainer);
  textNode.text = content.value;
  textNode.alpha = alpha;
  textNode.style = new TextStyle({
    fontFamily,
    fontSize,
    fill,
    fontWeight: typeof fontWeightValue === 'string' ? fontWeightValue : undefined,
    fontStyle: typeof fontStyleValue === 'string' ? fontStyleValue : undefined,
    align: alignValue === 'center' || alignValue === 'right' ? alignValue : 'left',
    letterSpacing: letterSpacing ?? 0,
    lineHeight: lineHeight ?? undefined,
    wordWrap: wordWrap === true,
    wordWrapWidth,
  });

  const bounds = textNode.getLocalBounds();
  textNode.position.set(
    resolveAlignedOffset(localLocation.w, bounds.width, input.context.cell.align.xPosition),
    resolveAlignedOffset(localLocation.h, bounds.height, input.context.cell.align.yPosition),
  );
}

function resolveAlignedOffset(
  outerSize: number,
  innerSize: number,
  position: string | undefined,
): number {
  if (position === 'center') {
    return Math.max(0, (outerSize - innerSize) / 2);
  }
  if (position === 'end' || position === 'right' || position === 'bottom') {
    return Math.max(0, outerSize - innerSize);
  }
  return 0;
}

function resolvePixiRendererOverride(
  renderers: BoxPixiRendererManifest | undefined,
  styles: BoxStyleManagerLike | undefined,
  context: BoxStyleContext,
  id?: string,
): BoxPixiRendererOverride | undefined {
  const manifestOverride = resolveRendererManifestOverride(renderers, context, id);
  if (manifestOverride) {
    return manifestOverride;
  }

  if (!styles) {
    return undefined;
  }

  const rendererValue = resolveStyleValue<unknown>(styles, context, ['renderer']);
  if (isPixiRendererOverride(rendererValue)) {
    return rendererValue;
  }

  const directValue = resolveStyleValue<unknown>(styles, context, []);
  if (isPixiRendererOverride(directValue)) {
    return directValue;
  }

  return undefined;
}

function resolveRendererManifestOverride(
  renderers: BoxPixiRendererManifest | undefined,
  context: BoxStyleContext,
  id?: string,
): BoxPixiRendererOverride | undefined {
  if (!renderers) {
    return undefined;
  }

  if (id) {
    const byId = renderers.byId?.[id];
    if (byId) {
      return byId;
    }
  }

  const path = context.nouns.join('.');
  const exact = renderers.byPath?.[path];
  if (exact) {
    return exact;
  }

  if (!renderers.byPath) {
    return undefined;
  }

  const nouns = context.nouns;
  for (let index = 1; index < nouns.length; index += 1) {
    const suffix = nouns.slice(index).join('.');
    const match = renderers.byPath[suffix];
    if (match) {
      return match;
    }
  }

  return undefined;
}

function isPixiRendererOverride(value: unknown): value is BoxPixiRendererOverride {
  return PixiOverrideSchema.safeParse(value).success;
}

function validateRendererResult(
  result: Container | false | void | unknown,
  cellName: string,
  pathString: string,
): Container | false | undefined {
  if (result === undefined || result === false) {
    return result;
  }

  const parsed = PixiContainerResult.safeParse(result);
  if (parsed.success) {
    return parsed.data;
  }

  console.error(`[boxTreeToPixi] Custom renderer for "${cellName}" at "${pathString}" returned a non-Container value. Falling back to the default renderer.`, result);
  return false;
}
