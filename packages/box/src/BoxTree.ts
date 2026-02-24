import { Forest, type StoreParams } from '@wonderlandlabs/forestry4';
import { z } from 'zod';
import { AxisConstraintSchema, PxValueSchema, type PxValue } from './types';
import { applyAxisConstraints, resolveConstraintValuePx, resolveMeasurement } from './sizeUtils';
import { pathToString } from './pathUtils';
import {
  AlignInputSchema,
  AreaPivotInputSchema,
  BoxContentSchema,
  BoxAlignSchema,
  BoxAreaSchema,
  BoxTreeNodeConfigSchema,
  BoxTreeNodeStateSchema,
  BoxTreeStateSchema,
  type AlignInput,
  type AlignKeyword,
  type AreaPivotInput,
  type AreaPivotKeyword,
  type Axis,
  type AxisConstrain,
  type BoxContent,
  type BoxTreeConfig,
  type BoxTreeState,
  type Direction,
  type ResolvedArea,
  type ResolvedRect,
} from './types.boxtree';

export * from './types.boxtree';

function zodMessage(error: unknown): string {
  if (error instanceof z.ZodError) {
    return error.issues.map((issue) => issue.message).join('; ');
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'invalid value';
}

function normalizeConstraintValue(
  value: unknown,
  axis: Axis,
  identity: string,
  kind: 'min' | 'max',
): PxValue | undefined {
  if (!value) {
    return undefined;
  }
  try {
    return PxValueSchema.parse(value);
  } catch (error) {
    throw new Error(`${identity}.${axis}.${kind}: ${zodMessage(error)}`);
  }
}

function normalizeAxisConstrain(
  input: { min?: unknown; max?: unknown } | undefined,
  axis: Axis,
  identity: string,
): AxisConstrain | undefined {
  const min = normalizeConstraintValue(input?.min, axis, identity, 'min');
  const max = normalizeConstraintValue(input?.max, axis, identity, 'max');
  if (!min && !max) {
    return undefined;
  }
  return AxisConstraintSchema.parse({ min, max });
}

function normalizeAlignValue(value: AlignInput | undefined, axis: Axis, identity: string): AlignKeyword {
  let next: AlignInput;
  try {
    next = AlignInputSchema.parse(value ?? 's');
  } catch {
    throw new Error(`${identity}.${axis}: unsupported align "${String(value)}"`);
  }

  switch (next) {
    case '<':
      return 's';
    case '|':
      return 'c';
    case '>':
      return 'e';
    case '<>':
      return 'f';
    default:
      return next;
  }
}

function normalizePivotValue(value: AreaPivotInput | undefined, axis: Axis, identity: string): AreaPivotKeyword {
  let next: AreaPivotInput;
  try {
    next = AreaPivotInputSchema.parse(value ?? 's');
  } catch {
    throw new Error(`${identity}.area.p${axis}: unsupported pivot "${String(value)}"`);
  }

  switch (next) {
    case '<':
      return 's';
    case '|':
      return 'c';
    case '>':
      return 'e';
    default:
      return next;
  }
}

function mappifyChildren(
  children: BoxTreeConfig['children'],
  identity: string,
): Map<string, BoxTreeConfig> | undefined {
  if (!children) {
    return undefined;
  }
  if (children instanceof Map) {
    return new Map(children);
  }
  if (typeof children === 'object' && !Array.isArray(children)) {
    return new Map(Object.entries(children as Record<string, BoxTreeConfig>));
  }
  throw new Error(`${identity}.children: expected Map or Record`);
}

export function createBoxTreeState(config: BoxTreeConfig = {}, inferredId?: string): BoxTreeState {
  const parsedConfig = BoxTreeNodeConfigSchema.parse(config);
  const identity = parsedConfig.id ?? inferredId ?? 'root';
  const isRoot = inferredId === undefined;

  if (isRoot) {
    const hasExplicitX = parsedConfig.area?.x !== undefined;
    const hasExplicitY = parsedConfig.area?.y !== undefined;
    if (!hasExplicitX || !hasExplicitY) {
      throw new Error(`${identity}.area: root requires explicit x and y`);
    }
  }

  const nextArea = BoxAreaSchema.parse({
    ...(parsedConfig.area ?? {}),
    px: normalizePivotValue(parsedConfig.area?.px, 'x', identity),
    py: normalizePivotValue(parsedConfig.area?.py, 'y', identity),
  });

  const nextAlign = BoxAlignSchema.parse({
    x: normalizeAlignValue(parsedConfig.align?.x, 'x', identity),
    y: normalizeAlignValue(parsedConfig.align?.y, 'y', identity),
    direction: parsedConfig.align?.direction,
  });

  const nextConstrainX = normalizeAxisConstrain(parsedConfig.constrain?.x, 'x', identity);
  const nextConstrainY = normalizeAxisConstrain(parsedConfig.constrain?.y, 'y', identity);
  const nextConstrain = nextConstrainX || nextConstrainY ? { x: nextConstrainX, y: nextConstrainY } : undefined;

  const preparedChildren = mappifyChildren(config.children, identity);
  const children = preparedChildren && preparedChildren.size
    ? new Map([...preparedChildren.entries()].map(([key, childConfig]) => [key, createBoxTreeState(childConfig, key)]))
    : undefined;

  const nodeState = BoxTreeNodeStateSchema.parse({
    area: nextArea,
    align: nextAlign,
    content: parsedConfig.content,
    order: parsedConfig.order,
    absolute: parsedConfig.absolute,
    constrain: nextConstrain,
    style: parsedConfig.style,
    id: parsedConfig.id ?? inferredId,
  });

  return BoxTreeStateSchema.parse({
    ...nodeState,
    children,
  });
}

function withWildcardBranchParams(params: StoreParams<BoxTreeState>): StoreParams<BoxTreeState> {
  const nextBranchParams = new Map(params.branchParams ?? []);

  if (!nextBranchParams.has('*')) {
    nextBranchParams.set('*', { subclass: BoxTree });
  }

  return {
    ...params,
    branchParams: nextBranchParams,
  };
}

export class BoxTree extends Forest<BoxTreeState> {
  constructor(configOrParams: BoxTreeConfig | StoreParams<BoxTreeState>) {
    const baseParams: StoreParams<BoxTreeState> = BoxTree.isStoreParams(configOrParams)
      ? {
        ...configOrParams,
        // StoreParams represents state-level input; children must already be a Map.
        value: BoxTreeStateSchema.parse(configOrParams.value),
      }
      : { value: createBoxTreeState(configOrParams) };

    super(withWildcardBranchParams(baseParams));
  }

  static isStoreParams(value: unknown): value is StoreParams<BoxTreeState> {
    if (!value || typeof value !== 'object') return false;
    if (!Object.prototype.hasOwnProperty.call(value, 'value')) return false;
    const obj = value as Record<string, unknown>;
    return 'path' in obj || 'parent' in obj || 'schema' in obj || 'branchParams' in obj;
  }

  #childKey(): string | undefined {
    const path = this.$path;
    if (!path || path.length !== 2) {
      return undefined;
    }
    if (path[0] !== 'children') {
      return undefined;
    }
    const key = path[1];
    return typeof key === 'string' ? key : undefined;
  }

  get id(): string | undefined {
    return this.value.id;
  }

  get name(): string {
    return this.#childKey() ?? this.value.id ?? 'root';
  }

  get identityPath(): string {
    if (this.$parent && this.$parent instanceof BoxTree) {
      return `${this.$parent.identityPath}/${this.name}`;
    }
    return this.name;
  }

  get parentTree(): BoxTree | undefined {
    return this.$parent instanceof BoxTree ? this.$parent : undefined;
  }

  #parentAxisPixels(axis: Axis): number | undefined {
    const parent = this.parentTree;
    if (!parent) {
      return undefined;
    }
    return axis === 'x' ? parent.width : parent.height;
  }

  #axisConstrain(axis: Axis): AxisConstrain | undefined {
    return axis === 'x' ? this.value.constrain?.x : this.value.constrain?.y;
  }

  #axisAlign(axis: Axis): AlignKeyword {
    return axis === 'x' ? this.value.align.x : this.value.align.y;
  }

  #axisPivot(axis: Axis): AreaPivotKeyword {
    return axis === 'x' ? this.value.area.px : this.value.area.py;
  }

  get order(): number {
    return this.value.order;
  }

  get absolute(): boolean {
    return this.value.absolute;
  }

  get content(): BoxContent | undefined {
    return this.value.content;
  }

  get direction(): Direction {
    return this.value.align.direction;
  }

  #isFlowAxis(axis: Axis, parent: BoxTree): boolean {
    return (parent.direction === 'row' && axis === 'x')
      || (parent.direction === 'column' && axis === 'y');
  }

  #flowOffset(axis: Axis): number {
    const parent = this.parentTree;
    if (!parent || this.absolute || !this.#isFlowAxis(axis, parent)) {
      return 0;
    }

    let offset = 0;
    for (const sibling of parent.children) {
      if (sibling === this) {
        break;
      }
      offset += axis === 'x' ? sibling.width : sibling.height;
    }

    return offset;
  }

  #resolveAxis(axis: Axis, parentPixels?: number): number {
    const inheritedParent = parentPixels ?? this.#parentAxisPixels(axis);
    const align = this.#axisAlign(axis);
    const sizeDef = axis === 'x' ? this.value.area.width : this.value.area.height;
    const shouldFillParent = !this.absolute && align === 'f' && inheritedParent !== undefined;
    const base = shouldFillParent
      ? inheritedParent
      : resolveMeasurement(sizeDef, { axis, parentPixels: inheritedParent });

    const constrain = this.#axisConstrain(axis);
    const min = resolveConstraintValuePx(constrain?.min);
    const max = resolveConstraintValuePx(constrain?.max);

    return applyAxisConstraints(base, { min, max });
  }

  #anchorAxis(axis: Axis): number {
    const axisAnchor = axis === 'x' ? this.value.area.x : this.value.area.y;
    const parent = this.parentTree;
    if (!parent || this.absolute) {
      return axisAnchor;
    }

    const align = this.#axisAlign(axis);
    const parentAxis = axis === 'x' ? parent.width : parent.height;
    const ownAxis = axis === 'x' ? this.width : this.height;
    let alignedAnchor = axisAnchor;
    switch (align) {
      case 'c':
        alignedAnchor = (parentAxis - ownAxis) / 2 + axisAnchor;
        break;
      case 'e':
        alignedAnchor = (parentAxis - ownAxis) - axisAnchor;
        break;
      case 's':
      case 'f':
      default:
        alignedAnchor = axisAnchor;
        break;
    }

    if (this.#isFlowAxis(axis, parent)) {
      return alignedAnchor + this.#flowOffset(axis);
    }

    return alignedAnchor;
  }

  #pivotOffset(axis: Axis): number {
    const size = axis === 'x' ? this.width : this.height;
    const pivot = this.#axisPivot(axis);
    switch (pivot) {
      case 'c':
        return size / 2;
      case 'e':
        return size;
      case 's':
      default:
        return 0;
    }
  }

  get anchorX(): number {
    return this.#anchorAxis('x');
  }

  get anchorY(): number {
    return this.#anchorAxis('y');
  }

  get x(): number {
    return this.anchorX - this.#pivotOffset('x');
  }

  get y(): number {
    return this.anchorY - this.#pivotOffset('y');
  }

  get absAnchorX(): number {
    if (!this.parentTree) {
      return this.anchorX;
    }
    return this.parentTree.absX + this.anchorX;
  }

  get absAnchorY(): number {
    if (!this.parentTree) {
      return this.anchorY;
    }
    return this.parentTree.absY + this.anchorY;
  }

  get absX(): number {
    const parent = this.parentTree;
    if (!parent) {
      return this.x;
    }
    return parent.absX + this.x;
  }

  get absY(): number {
    const parent = this.parentTree;
    if (!parent) {
      return this.y;
    }
    return parent.absY + this.y;
  }

  get width(): number {
    return this.#resolveAxis('x');
  }

  get height(): number {
    return this.#resolveAxis('y');
  }

  get area(): ResolvedArea {
    return {
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
    };
  }

  get rect(): ResolvedRect {
    return this.area;
  }

  get childrenMap(): ReadonlyMap<string, BoxTree> {
    const branches: Array<[string, BoxTree]> = [];
    const children = this.value.children;
    if (!children) {
      return new Map<string, BoxTree>();
    }

    for (const key of children.keys()) {
      const branch = this.$br.$get<BoxTreeState, BoxTree>(['children', key]);
      if (branch) {
        branches.push([key, branch]);
      }
    }

    branches.sort((a, b) => {
      const orderDelta = a[1].order - b[1].order;
      if (orderDelta !== 0) {
        return orderDelta;
      }
      return a[0].localeCompare(b[0]);
    });

    return new Map(branches);
  }

  get children(): readonly BoxTree[] {
    return [...this.childrenMap.values()];
  }

  getChild(key: string): BoxTree | undefined {
    if (!this.value.children?.has(key)) {
      return undefined;
    }
    return this.$br.$get<BoxTreeState, BoxTree>(['children', key]);
  }

  addChild(key: string, config: BoxTreeConfig = {}): BoxTree {
    if (this.value.children?.has(key)) {
      throw new Error(`${this.identityPath}: child ${key} already exists`);
    }

    const childState = createBoxTreeState(config, key);

    this.mutate((draft) => {
      const nextChildren = new Map(draft.children ?? []);
      nextChildren.set(key, childState);
      draft.children = nextChildren;
    });

    const branch = this.$br.$get<BoxTreeState, BoxTree>(['children', key]);
    if (!branch) {
      throw new Error(`${this.identityPath}: could not create branch for child ${key}`);
    }

    return branch;
  }

  removeChild(key: string): void {
    if (!this.value.children?.has(key)) {
      return;
    }

    this.$br.delete(pathToString(['children', key]));

    this.mutate((draft) => {
      if (!draft.children?.has(key)) {
        return;
      }
      const nextChildren = new Map(draft.children);
      nextChildren.delete(key);
      draft.children = nextChildren.size ? nextChildren : undefined;
    });
  }

  setPosition(x: number, y: number): void {
    this.mutate((draft) => {
      draft.area.x = x;
      draft.area.y = y;
    });
  }

  setOrder(order: number): void {
    if (!Number.isFinite(order)) {
      throw new Error(`${this.identityPath}.order: order must be finite`);
    }

    this.mutate((draft) => {
      draft.order = order;
    });
  }

  setAbsolute(absolute: boolean): void {
    this.mutate((draft) => {
      draft.absolute = absolute;
    });
  }

  setDirection(direction: Direction): void {
    this.mutate((draft) => {
      draft.align.direction = direction;
    });
  }

  setContent(content: BoxContent): void {
    const nextContent = BoxContentSchema.parse(content);
    this.mutate((draft) => {
      draft.content = nextContent;
    });
  }

  clearContent(): void {
    this.mutate((draft) => {
      draft.content = undefined;
    });
  }

  setWidthPx(width: number): void {
    if (!Number.isFinite(width) || width < 0) {
      throw new Error(`${this.identityPath}.x: px must be finite and >= 0`);
    }

    this.mutate((draft) => {
      draft.area.width = { mode: 'px', value: width };
    });
  }

  setHeightPx(height: number): void {
    if (!Number.isFinite(height) || height < 0) {
      throw new Error(`${this.identityPath}.y: px must be finite and >= 0`);
    }

    this.mutate((draft) => {
      draft.area.height = { mode: 'px', value: height };
    });
  }

  setWidthPercent(percent: number): void {
    if (!Number.isFinite(percent) || percent < 0 || percent > 1) {
      throw new Error(`${this.identityPath}.x: percent must be between 0 and 1`);
    }

    this.mutate((draft) => {
      draft.area.width = { mode: '%', value: percent };
    });
  }

  setHeightPercent(percent: number): void {
    if (!Number.isFinite(percent) || percent < 0 || percent > 1) {
      throw new Error(`${this.identityPath}.y: percent must be between 0 and 1`);
    }

    this.mutate((draft) => {
      draft.area.height = { mode: '%', value: percent };
    });
  }

  resolveWidth(parentWidth?: number): number {
    return this.#resolveAxis('x', parentWidth);
  }

  resolveHeight(parentHeight?: number): number {
    return this.#resolveAxis('y', parentHeight);
  }

  resolveArea(parentWidth?: number, parentHeight?: number): ResolvedArea {
    return {
      x: this.x,
      y: this.y,
      width: this.resolveWidth(parentWidth),
      height: this.resolveHeight(parentHeight),
    };
  }

  resolveRect(parentWidth?: number, parentHeight?: number): ResolvedRect {
    return this.resolveArea(parentWidth, parentHeight);
  }
}
