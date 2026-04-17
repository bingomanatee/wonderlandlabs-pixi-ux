import { z } from 'zod';
import {
  DIR_HORIZ,
  DIR_HORIZ_S,
  DIR_VERT,
  DIR_VERT_S,
  POS_BOTTOM,
  POS_CENTER,
  POS_CENTER_S,
  POS_END,
  POS_END_S,
  POS_FILL,
  POS_KEY_X,
  POS_KEY_Y,
  POS_LEFT,
  POS_RIGHT,
  POS_START,
  POS_START_S,
  POS_TOP,
  SIZE_FRACTION,
  SIZE_PCT,
  SIZE_PX,
  AXIS_Y, AXIS_X
} from './constants.js';
import { DIM_HORIZ_S, DIM_VERT_S } from './constants.js';

const DIR = z.enum([
  DIR_VERT,
  DIR_HORIZ,
  DIR_HORIZ_S,
  DIR_VERT_S,
]);

export const SIZE_UNIT = z.enum([SIZE_PX, SIZE_PCT, SIZE_FRACTION]);

export const BoxSizeObj = z.object({
  value: z.number(),
  unit: SIZE_UNIT.optional(),
  base: z.number().optional()
});
export type BoxSizeObjType = z.infer<typeof BoxSizeObj>;

export const BoxSize = z.union([
  BoxSizeObj,
  z.number(),
]);

export type BoxSizeType = z.infer<typeof BoxSize>;

export const Direction = z.enum([
  DIR_HORIZ,
  DIR_VERT,
  DIR_HORIZ_S,
  DIR_VERT_S,
]);

export type DirectionType = z.infer<typeof Direction>;
export const Position = z.enum([
  POS_START,
  POS_END,
  POS_LEFT,
  POS_RIGHT,
  POS_BOTTOM,
  POS_END_S,
  POS_START_S,
  POS_CENTER,
  POS_CENTER_S,
  POS_TOP,
  POS_FILL,
]);

export const BoxAlign = z.object({
  direction: Direction,
  [POS_KEY_X]: Position.optional(),
  [POS_KEY_Y]: Position.optional(),
});
export type BoxAlignType = z.infer<typeof BoxAlign>;

export const BoxPoint = z.object({
  x: BoxSize,
  y: BoxSize,
});

export const RectTemplate = z.object({
  x: BoxSize,
  y: BoxSize,
  w: BoxSize,
  h: BoxSize,
});

export const RectStatic = z.object({
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
});

export type RectStaticType = z.infer<typeof RectStatic>;
export type RectPXType = RectStaticType;
export type RectType = z.infer<typeof RectTemplate>;

export const RectPartial = RectTemplate.partial({
  x: true,
  y: true,
});

export type RectPartialType = z.infer<typeof RectPartial>;

export const BoxCell: z.ZodType<{
  dim: RectPartialType; // the "configured" width; generally static 
  location?: RectStaticType; // the absolute / 'dynamic' rectangle 
  absolute: boolean;
  name: string;
  variant?: string;
  align: z.infer<typeof BoxAlign>;
  children?: any[];
}> = z.lazy(() =>
  z.object({
    dim: RectPartial,
    location: RectStatic.optional(),
    absolute: z.boolean(),
    variant: z.string().optional(),
    name: z.string(),
    align: BoxAlign,
    children: z.array(z.lazy(() => BoxCell)).optional(),
  }),
);

export type BoxCellType = z.infer<typeof BoxCell>;

export const Axes = z.enum([AXIS_Y, AXIS_X]);
export type AxesType = z.infer<typeof Axes>;

export const DimensionDirections = z.enum([DIM_HORIZ_S, DIM_VERT_S]);
export type DimensionDirectionType = z.infer<typeof DimensionDirections>;
