import { z } from 'zod';
import type { Container, ContainerOptions, FederatedPointerEvent } from 'pixi.js';

// ==================== Size Mode ====================

/**
 * Input size mode (what users specify):
 * - px: explicit pixel size, ignores parent
 * - percent: fraction of parent's total size (0-1)
 * - percentFree: weighted share of remaining space after px siblings (like CSS grid fr)
 * - fill: shorthand for percentFree with weight 1
 * - hug: shrink to fit content (container only, cannot have percent/percentFree children)
 */
export const SizeModeInputSchema = z.enum(['px', 'percent', 'percentFree', 'fill', 'hug']);
export type SizeModeInput = z.infer<typeof SizeModeInputSchema>;

/**
 * Internal size mode (fill normalized to percentFree):
 * - px: explicit pixel size
 * - percent: fraction of parent's total size (0-1)
 * - percentFree: weighted share of remaining space (arbitrary positive numbers)
 * - hug: shrink to fit content
 */
export const SizeModeSchema = z.enum(['px', 'percent', 'percentFree', 'hug']);
export type SizeMode = z.infer<typeof SizeModeSchema>;

// ==================== Alignment ====================

/**
 * Alignment for content within the box on each axis: start, center, end
 */
export const AlignSchema = z.enum(['start', 'center', 'end']);
export type Align = z.infer<typeof AlignSchema>;

// ==================== Gap Mode ====================

/**
 * Gap mode controls where gaps are applied in a list layout:
 * - between: gaps only between children (default)
 * - before: gap before first child + between children
 * - after: gaps between children + gap after last child
 * - all: gap before first, between all, and after last
 */
export const GapModeSchema = z.enum(['between', 'before', 'after', 'all']);
export type GapMode = z.infer<typeof GapModeSchema>;

// ==================== Axis Definition ====================

/**
 * Input axis definition (what users specify)
 */
export const AxisDefInputSchema = z.object({
    size: z.number().default(0),           // for px: pixels, for percent: 0-1, for percentFree: weight
    min: z.number().optional(),            // minimum size constraint
    max: z.number().optional(),            // maximum size constraint
    align: AlignSchema.default('start'),   // how content aligns within this axis
    sizeMode: SizeModeInputSchema.default('px'),
});
export type AxisDefInput = z.input<typeof AxisDefInputSchema>;

/**
 * Internal axis definition (fill normalized to percentFree)
 *
 * Size calculation:
 * 1. px children: fixed pixels
 * 2. percent children: parentSize * size
 * 3. percentFree children: freeSpace * (size / sumOfAllPercentFreeWeights)
 *    where freeSpace = parentSize - sum(px siblings)
 * 4. hug: sum of children sizes + gaps + padding
 */
export const AxisDefSchema = z.object({
    size: z.number().default(0),
    min: z.number().optional(),
    max: z.number().optional(),
    align: AlignSchema.default('start'),
    sizeMode: SizeModeSchema.default('px'),
});
export type AxisDef = z.infer<typeof AxisDefSchema>;

/**
 * Normalize an input axis def to internal format (fill -> percentFree: 1)
 */
export function normalizeAxisDef(input: AxisDefInput): AxisDef {
    const parsed = AxisDefInputSchema.parse(input);
    if (parsed.sizeMode === 'fill') {
        return { ...parsed, sizeMode: 'percentFree', size: 1 };
    }
    return parsed as AxisDef;
}

// ==================== Direction ====================

export const DirectionSchema = z.enum(['horizontal', 'vertical']);
export type Direction = z.infer<typeof DirectionSchema>;

// Legacy alignment types (for backward compatibility during transition)
export const HorizontalAlignSchema = z.enum(['left', 'center', 'right']);
export type HorizontalAlign = z.infer<typeof HorizontalAlignSchema>;

export const VerticalAlignSchema = z.enum(['top', 'center', 'bottom']);
export type VerticalAlign = z.infer<typeof VerticalAlignSchema>;

// ==================== Measurements ====================

/**
 * Unit for measurements
 */
export const UnitSchema = z.enum(['px', '%']);
export type Unit = z.infer<typeof UnitSchema>;

/**
 * Measurement with explicit unit
 */
export const MeasurementWithUnitSchema = z.object({
    value: z.number(),
    unit: UnitSchema,
});
export type MeasurementWithUnit = z.infer<typeof MeasurementWithUnitSchema>;

/**
 * Measurement: number (px) or { value, unit }
 */
export const MeasurementSchema = z.union([
    z.number(),
    MeasurementWithUnitSchema,
]);
export type Measurement = z.infer<typeof MeasurementSchema>;

/**
 * Size with constraints: { base, min?, max? }
 */
export const SizeConstraintSchema = z.object({
    base: MeasurementSchema,
    min: MeasurementSchema.optional(),
    max: MeasurementSchema.optional(),
});
export type SizeConstraint = z.infer<typeof SizeConstraintSchema>;

/**
 * Size value: number (simple px) or constraint object
 */
export const SizeValueSchema = z.union([
    z.number(),
    MeasurementWithUnitSchema,
    SizeConstraintSchema,
]);
export type SizeValue = z.infer<typeof SizeValueSchema>;

// ==================== Rect (legacy) ====================

export const RectSchema = z.object({
    x: z.number().default(0),
    y: z.number().default(0),
    width: z.number(),
    height: z.number(),
});
export type Rect = z.infer<typeof RectSchema>;

// ==================== Colors & Styles ====================

export const RgbColorSchema = z.object({
    r: z.number().min(0).max(1),
    g: z.number().min(0).max(1),
    b: z.number().min(0).max(1),
});
export type RgbColor = z.infer<typeof RgbColorSchema>;

export const FillStyleSchema = z.object({
    color: RgbColorSchema.optional(),
    alpha: z.number().min(0).max(1).optional(),
});
export type FillStyle = z.infer<typeof FillStyleSchema>;

export const StrokeStyleSchema = z.object({
    color: RgbColorSchema.optional(),
    alpha: z.number().min(0).max(1).optional(),
    width: z.number().optional(),
});
export type StrokeStyle = z.infer<typeof StrokeStyleSchema>;

export const BoxStyleSchema = z.object({
    fill: FillStyleSchema.optional(),
    stroke: StrokeStyleSchema.optional(),
    borderRadius: z.number().optional(),
});
export type BoxStyle = z.infer<typeof BoxStyleSchema>;

// ==================== Box Props (non-state config) ====================

export interface BoxProps {
    style?: BoxStyle;
    render?: (store: any) => void;
    onPointerDown?: (event: FederatedPointerEvent, store: any) => void;
}

// ==================== Padding ====================

export const PaddingSchema = z.object({
    top: z.number().default(0),
    right: z.number().default(0),
    bottom: z.number().default(0),
    left: z.number().default(0),
});
export type Padding = z.infer<typeof PaddingSchema>;

/**
 * Helper to create uniform padding
 */
export function uniformPadding(value: number): Padding {
    return { top: value, right: value, bottom: value, left: value };
}

/**
 * Helper to create symmetric padding (vertical, horizontal)
 */
export function symmetricPadding(vertical: number, horizontal: number): Padding {
    return { top: vertical, right: horizontal, bottom: vertical, left: horizontal };
}

// ==================== Base Box Config ====================

/**
 * BaseBoxConfig - common configuration for all box types
 * Uses input schemas so users can specify 'fill' which gets normalized internally
 */
export const BaseBoxConfigSchema = z.object({
    id: z.string(),

    // Position (optional for child boxes - parent sets position)
    x: z.number().optional().default(0),
    y: z.number().optional().default(0),

    // Axis definitions (size, align, sizeMode per axis) - uses input schema
    xDef: AxisDefInputSchema.optional(),
    yDef: AxisDefInputSchema.optional(),

    // Styling
    padding: PaddingSchema.optional(),
    style: BoxStyleSchema.optional(),
    noMask: z.boolean().optional(),
});
// Use z.input for config types (what user provides) - allows optional fields with defaults
export type BaseBoxConfig = z.input<typeof BaseBoxConfigSchema>;

// ==================== Leaf Box Config ====================

/**
 * BoxLeafConfig - for boxes containing a single graphic element
 */
export const BoxLeafConfigSchema = BaseBoxConfigSchema.extend({
    // Content is set programmatically, not in config
});
// Use z.input for config types (what user provides)
export type BoxLeafConfig = z.input<typeof BoxLeafConfigSchema>;

// ==================== List Box Config ====================

/**
 * BoxListConfig - for boxes containing child boxes with layout
 */
export const BoxListConfigSchema = BaseBoxConfigSchema.extend({
    direction: DirectionSchema.default('horizontal'),
    gap: z.number().default(0),
    gapMode: GapModeSchema.default('between'),
});
// Use z.input for config types (what user provides)
export type BoxListConfig = z.input<typeof BoxListConfigSchema>;

// Alias for backward compatibility
export type BoxConfig = BaseBoxConfig;

// ==================== Box State (internal) ====================

/**
 * Base state for all box types
 * - x, y: position (absolute for root, set by parent for children)
 * - width, height: computed from xDef.size/yDef.size
 * - xDef, yDef: axis definitions (size, align, sizeMode)
 */
export interface BoxState {
    id: string;

    // Position (absolute for root, parent-controlled for children)
    x: number;
    y: number;

    // Size (derived from xDef.size, yDef.size)
    width: number;
    height: number;

    // Axis definitions
    xDef: AxisDef;
    yDef: AxisDef;

    // Styling
    padding: Padding;
    noMask: boolean;

    // Dirty flag for re-render
    isDirty: boolean;
}

/**
 * State for BoxListStore (adds direction and gap)
 */
export interface BoxListState extends BoxState {
    direction: Direction;
    gap: number;
}

// ==================== Legacy types (for backward compatibility) ====================

export const ForestryPropsSchema = z.object({
    rect: RectSchema,
    align: z.object({
        horizontal: HorizontalAlignSchema.default('left'),
        vertical: VerticalAlignSchema.default('top'),
    }).optional(),
    padding: PaddingSchema.optional(),
    noMask: z.boolean().optional(),
});
export type ForestryProps = z.infer<typeof ForestryPropsSchema>;

export interface LegacyBoxConfig {
    id: string;
    forestryProps: ForestryProps;
    boxProps?: BoxProps;
    rootProps?: ContainerOptions;
}

// ==================== Computed Content Area ====================

/**
 * The inner content area after padding
 */
export interface ContentArea {
    x: number;      // Left edge of content area
    y: number;      // Top edge of content area
    width: number;  // Available width for content
    height: number; // Available height for content
}

// ==================== Measurement Helpers ====================

/**
 * Resolve a measurement to pixels
 * @param measurement - number (px) or { value, unit }
 * @param parentSize - parent size for % calculations
 */
export function resolveMeasurement(measurement: Measurement | undefined, parentSize: number): number {
    if (measurement === undefined) return 0;
    if (typeof measurement === 'number') return measurement;
    if (measurement.unit === 'px') return measurement.value;
    if (measurement.unit === '%') return (measurement.value / 100) * parentSize;
    return 0;
}

/**
 * Resolve a size value to pixels, applying constraints
 * @param size - number, { value, unit }, or { base, min?, max? }
 * @param parentSize - parent size for % calculations
 */
export function resolveSizeValue(size: SizeValue | undefined, parentSize: number): number {
    if (size === undefined) return 0;
    if (typeof size === 'number') return size;

    // Check if it's a MeasurementWithUnit (has 'unit' property)
    if ('unit' in size) {
        return resolveMeasurement(size as MeasurementWithUnit, parentSize);
    }

    // It's a SizeConstraint with base, min?, max?
    const constraint = size as SizeConstraint;
    let resolved = resolveMeasurement(constraint.base, parentSize);

    if (constraint.min !== undefined) {
        const min = resolveMeasurement(constraint.min, parentSize);
        resolved = Math.max(resolved, min);
    }
    if (constraint.max !== undefined) {
        const max = resolveMeasurement(constraint.max, parentSize);
        resolved = Math.min(resolved, max);
    }

    return resolved;
}
