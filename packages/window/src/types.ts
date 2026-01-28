import {z} from 'zod';
import {TITLEBAR_MODE, WINDOW_STATUS} from './constants';
import type {HandleMode} from '@forestry-pixi/resizer';

// Color schema for RGB values (0..1)
export const RgbColorSchema = z.object({
    r: z.number().min(0).max(1).default(1),
    g: z.number().min(0).max(1).default(1),
    b: z.number().min(0).max(1).default(1),
});

export type RgbColor = z.infer<typeof RgbColorSchema>;

// Titlebar configuration
export const TitlebarConfigSchema = z.object({
    mode: z.enum([TITLEBAR_MODE.PERSISTENT, TITLEBAR_MODE.ON_HOVER]).default(TITLEBAR_MODE.PERSISTENT),
    height: z.number().min(0).default(30),
    backgroundColor: RgbColorSchema.default({r: 0.2, g: 0.2, b: 0.2}),
    title: z.string().default('Window'),
    isVisible: z.boolean().default(true),
    padding: z.number().default(2),
    showCloseButton: z.boolean().default(false),
    fontSize: z.number().min(0).default(14),
    textColor: RgbColorSchema.default({r: 0, g: 0, b: 0}),
});

export type TitlebarConfig = z.infer<typeof TitlebarConfigSchema>;

// Window status schema
export const WindowStatusSchema = z.enum([
    WINDOW_STATUS.CLEAN,
    WINDOW_STATUS.DIRTY,
    WINDOW_STATUS.DELETED,
]);

// Window definition schema
export const WindowDefSchema = z.object({
    id: z.string(),
    x: z.number().default(0),
    y: z.number().default(0),
    width: z.number().min(0).default(200),
    height: z.number().min(0).default(200),
    minWidth: z.number().min(0).optional(),
    minHeight: z.number().min(0).optional(),
    backgroundColor: RgbColorSchema.default({r: 0.1, g: 0.1, b: 0.1}),
    titlebar: TitlebarConfigSchema.default({
        mode: TITLEBAR_MODE.PERSISTENT,
        height: 30,
        backgroundColor: {r: 0.2, g: 0.2, b: 0.2},
        title: 'Window',
        showCloseButton: false,
        isVisible: true
    }),
    isResizeable: z.boolean().default(false),
    isDraggable: z.boolean().default(false),
    resizeMode: z.string().optional() as z.ZodType<HandleMode | undefined>,
    status: WindowStatusSchema.default(WINDOW_STATUS.CLEAN),
    zIndex: z.number().default(0),
    isDirty: z.boolean().default(true)
});

export type WindowDef = z.infer<typeof WindowDefSchema>;

// WindowsManager state schema
export const WindowStoreSchema = z.object({
    windows: z.map(z.string(), WindowDefSchema).default(new Map()),
});

export type WindowStoreValue = z.infer<typeof WindowStoreSchema>;

export const ZIndexDataSchema = z.object({
    zIndex: z.number(),
    id: z.string(),
    zIndexFlat: z.number(),
    branch: z.unknown()
})

export type ZIndexData = z.infer<typeof ZIndexDataSchema>;