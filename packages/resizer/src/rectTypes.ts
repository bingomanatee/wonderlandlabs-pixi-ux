import { z } from 'zod';

/**
 * Rectangle type compatible with Immer and Forestry state management.
 *
 * This is a simplified version of PixiJS Rectangle that only includes the basic
 * properties needed for resize operations. Plain objects work with Immer by default.
 */
export const RectSchema = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
});

export type Rect = z.infer<typeof RectSchema>;

