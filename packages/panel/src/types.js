"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PanelStoreSchema = exports.PanelDataSchema = exports.PanelStyleSchema = exports.StrokeSchema = exports.BackgroundSchema = exports.ColorSchema = exports.PanelStatusSchema = void 0;
var zod_1 = require("zod");
var constants_1 = require("./constants");
// ============================================================================
// Panel Status Types
// ============================================================================
exports.PanelStatusSchema = zod_1.z.enum([
    constants_1.PANEL_STATUS.CLEAN,
    constants_1.PANEL_STATUS.DIRTY,
    constants_1.PANEL_STATUS.DELETED,
]);
// ============================================================================
// Color Types
// ============================================================================
// Reusable Color schema (PixiJS format: RGB values 0..1)
exports.ColorSchema = zod_1.z.object({
    r: zod_1.z.number().min(0).max(1).default(1),
    g: zod_1.z.number().min(0).max(1).default(1),
    b: zod_1.z.number().min(0).max(1).default(1),
});
// ============================================================================
// Panel Style Schema
// ============================================================================
// Background schema - can be an object or false
exports.BackgroundSchema = zod_1.z.union([
    zod_1.z.object({
        isVisible: zod_1.z.boolean().default(true),
        fill: exports.ColorSchema.default({ r: 1, g: 1, b: 1 }),
        opacity: zod_1.z.number().min(0).max(1).default(1),
    }),
    zod_1.z.literal(false),
]).transform(function (val) {
    if (val === false) {
        return { isVisible: false, fill: { r: 1, g: 1, b: 1 }, opacity: 1 };
    }
    return val;
});
// Stroke schema - can be an object or false
exports.StrokeSchema = zod_1.z.union([
    zod_1.z.object({
        isVisible: zod_1.z.boolean().default(true),
        color: exports.ColorSchema.default({ r: 0.8, g: 0.8, b: 0.8 }),
        width: zod_1.z.number().min(0).default(1),
        opacity: zod_1.z.number().min(0).max(1).default(1),
    }),
    zod_1.z.literal(false),
]).transform(function (val) {
    if (val === false) {
        return { isVisible: false, color: { r: 0.8, g: 0.8, b: 0.8 }, width: 1, opacity: 1 };
    }
    return val;
});
// Schema for individual panel style
exports.PanelStyleSchema = zod_1.z.object({
    background: exports.BackgroundSchema.default({
        isVisible: true,
        fill: { r: 1, g: 1, b: 1 },
        opacity: 1,
    }),
    stroke: exports.StrokeSchema.default({
        isVisible: true,
        color: { r: 0.8, g: 0.8, b: 0.8 },
        width: 1,
        opacity: 1,
    }),
});
// ============================================================================
// Panel Data Schema
// ============================================================================
// Schema for individual panel
exports.PanelDataSchema = zod_1.z.object({
    id: zod_1.z.string(),
    order: zod_1.z.number().default(0),
    x: zod_1.z.number().default(0),
    y: zod_1.z.number().default(0),
    width: zod_1.z.number().min(0).default(100),
    height: zod_1.z.number().min(0).default(100),
    style: exports.PanelStyleSchema.default({
        background: {
            isVisible: true,
            fill: { r: 1, g: 1, b: 1 },
            opacity: 1,
        },
        stroke: {
            isVisible: true,
            color: { r: 0.8, g: 0.8, b: 0.8 },
            width: 1,
            opacity: 1,
        },
    }),
    title: zod_1.z.string().optional(),
    isVisible: zod_1.z.boolean().default(true),
    data: zod_1.z.map(zod_1.z.string(), zod_1.z.any()).optional(),
    status: exports.PanelStatusSchema.default(constants_1.PANEL_STATUS.CLEAN),
});
// ============================================================================
// Panel Store Schema
// ============================================================================
// Schema for the panel store value
exports.PanelStoreSchema = zod_1.z.object({
    panels: zod_1.z.map(zod_1.z.string(), exports.PanelDataSchema).default(new Map()),
});
