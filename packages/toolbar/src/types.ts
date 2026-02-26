import { z } from 'zod';
import {
  ButtonConfigSchema,
  RgbColorSchema,
  type RgbColor,
} from '@wonderlandlabs-pixi-ux/button';
import type { StyleTree } from '@wonderlandlabs-pixi-ux/style-tree';

export { RgbColorSchema, type RgbColor };

export const ToolbarButtonConfigSchema = ButtonConfigSchema;
export type ToolbarButtonConfig = z.input<typeof ToolbarButtonConfigSchema>;

export const FillStyleSchema = z.object({
  color: RgbColorSchema,
  alpha: z.number().min(0).max(1).optional(),
});

export const StrokeStyleSchema = z.object({
  color: RgbColorSchema,
  width: z.number().min(0),
  alpha: z.number().min(0).max(1).optional(),
});

export const BackgroundStyleSchema = z.object({
  fill: FillStyleSchema.optional(),
  stroke: StrokeStyleSchema.optional(),
  borderRadius: z.number().min(0).optional(),
});

export type FillStyle = z.infer<typeof FillStyleSchema>;
export type StrokeStyle = z.infer<typeof StrokeStyleSchema>;
export type BackgroundStyle = z.infer<typeof BackgroundStyleSchema>;

export type ToolbarPadding = {
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
};

export const ToolbarPaddingSchema = z.object({
  top: z.number().optional(),
  right: z.number().optional(),
  bottom: z.number().optional(),
  left: z.number().optional(),
});

export const ToolbarConfigSchema = z.object({
  id: z.string().optional(),
  order: z.number().finite().optional(),
  buttons: z.array(ToolbarButtonConfigSchema).default([]),
  spacing: z.number().min(0).default(8),
  orientation: z.enum(['horizontal', 'vertical']).default('horizontal'),
  fillButtons: z.boolean().optional(),
  width: z.number().min(0).optional(),
  height: z.number().min(0).optional(),
  fixedSize: z.boolean().optional(),
  padding: z.union([z.number(), ToolbarPaddingSchema]).optional(),
  background: BackgroundStyleSchema.optional(),
  style: z.custom<StyleTree>().optional(),
  bitmapFont: z.string().optional(),
});

export type ToolbarConfig = z.input<typeof ToolbarConfigSchema>;
