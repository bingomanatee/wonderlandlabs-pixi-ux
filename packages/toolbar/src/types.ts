import { z } from 'zod';
import type { StyleTree } from '@wonderlandlabs-pixi-ux/style-tree';
import { ButtonConfigSchema } from '@wonderlandlabs-pixi-ux/button';
import { BoxStyleSchema, type BoxStyle } from '@wonderlandlabs-pixi-ux/box';
export { RgbColorSchema, type RgbColor } from '@wonderlandlabs-pixi-ux/box';

export const ToolbarButtonConfigSchema = ButtonConfigSchema;
export type ToolbarButtonConfig = z.input<typeof ToolbarButtonConfigSchema>;

// Toolbar container style (background/stroke/borderRadius)
export const BackgroundStyleSchema = BoxStyleSchema;
export type BackgroundStyle = BoxStyle;

// Toolbar configuration schema
export const ToolbarConfigSchema = z.object({
  // Unique identifier for the toolbar
  id: z.string().optional(),
  buttons: z.array(ToolbarButtonConfigSchema).default([]),
  spacing: z.number().min(0).default(8),
  orientation: z.enum(['horizontal', 'vertical']).default('horizontal'),
  // Toolbar dimensions
  width: z.number().min(0).optional(),
  height: z.number().min(0).optional(),
  // Fixed size: when true, toolbar keeps specified width/height and doesn't auto-resize
  // When false (default), toolbar resizes to fit buttons + gaps + padding + border
  // width/height become minimum values when fixedSize is false
  fixedSize: z.boolean().optional(),
  // Padding inside the toolbar
  padding: z.union([
    z.number(),
    z.object({
      top: z.number().optional(),
      right: z.number().optional(),
      bottom: z.number().optional(),
      left: z.number().optional(),
    }),
  ]).optional(),
  // Background style for the toolbar
  background: BackgroundStyleSchema.optional(),
  // Optional StyleTree for custom styling - if provided, replaces default styles entirely
  style: z.custom<StyleTree>().optional(),
  // Optional bitmap font name for labels (must be pre-loaded via Assets.load)
  bitmapFont: z.string().optional(),
});

export type ToolbarConfig = z.input<typeof ToolbarConfigSchema>;
