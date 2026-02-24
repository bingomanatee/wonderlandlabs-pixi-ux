import { z } from 'zod';
import type { Sprite, Container } from 'pixi.js';

// ==================== Button Mode ====================

/**
 * Button display modes:
 * - icon: sprite/graphic centered, no label (icon-only button)
 * - iconVertical: sprite/graphic with label below (vertical layout)
 * - text: text only, centered
 * - inline: icon + text side-by-side horizontally
 */
export const ButtonModeSchema = z.enum(['icon', 'iconVertical', 'text', 'inline']);
export type ButtonMode = z.infer<typeof ButtonModeSchema>;

// ==================== Button Config ====================

/**
 * ButtonConfig - configuration for creating a button
 */
export const ButtonConfigSchema = z.object({
    id: z.string(),

    // Content - left icon (optional)
    sprite: z.custom<Sprite>().optional(),
    icon: z.custom<Container>().optional(),  // Alternative to sprite - any Container (Graphics, etc)
    iconUrl: z.string().optional(),

    // Content - right icon (optional, inline mode only)
    rightSprite: z.custom<Sprite>().optional(),
    rightIcon: z.custom<Container>().optional(),
    rightIconUrl: z.string().optional(),

    // Label
    label: z.string().optional(),

    // Mode (auto-detected if not specified)
    mode: ButtonModeSchema.optional(),

    // State
    isDisabled: z.boolean().optional().default(false),

    // Events
    onClick: z.function().optional(),

    // Variant for StyleTree matching (e.g., 'primary', 'secondary', 'danger')
    variant: z.string().optional(),

    // Optional bitmap font name for labels
    bitmapFont: z.string().optional(),
});
export type ButtonConfig = z.input<typeof ButtonConfigSchema>;

// ==================== Style Nouns ====================

/**
 * Default style noun paths for button styling via StyleTree
 *
 * Icon button (icon only, no label):
 *   button.icon.size.x, button.icon.size.y
 *   button.icon.alpha
 *   button.padding.x, button.padding.y
 *   button.stroke.color, button.stroke.alpha, button.stroke.width
 *   button.fill.color, button.fill.alpha
 *   button.borderRadius
 *
 * IconVertical button (icon with label below):
 *   button.iconVertical.icon.size.x, button.iconVertical.icon.size.y
 *   button.iconVertical.icon.alpha
 *   button.iconVertical.padding.x, button.iconVertical.padding.y
 *   button.iconVertical.stroke.color, button.iconVertical.stroke.alpha, button.iconVertical.stroke.width
 *   button.iconVertical.fill.color, button.iconVertical.fill.alpha
 *   button.iconVertical.borderRadius
 *   button.iconVertical.label.fontSize, button.iconVertical.label.color, button.iconVertical.label.alpha
 *   button.iconVertical.iconGap (gap between icon and label)
 *
 * Text button:
 *   button.text.padding.x, button.text.padding.y
 *   button.text.fill.color, button.text.fill.alpha
 *   button.text.stroke.color, button.text.stroke.alpha, button.text.stroke.width
 *   button.text.borderRadius
 *   button.text.label.fontSize, button.text.label.color, button.text.label.alpha
 *
 * Inline button (icon + text side-by-side):
 *   button.inline.icon.size.x, button.inline.icon.size.y
 *   button.inline.icon.alpha
 *   button.inline.iconGap (gap between left icon and label)
 *   button.inline.rightIcon.size.x, button.inline.rightIcon.size.y
 *   button.inline.rightIcon.alpha
 *   button.inline.rightIconGap (gap between label and right icon)
 *   button.inline.padding.x, button.inline.padding.y
 *   button.inline.fill.color, button.inline.fill.alpha
 *   button.inline.stroke.color, button.inline.stroke.alpha, button.inline.stroke.width
 *   button.inline.borderRadius
 *   button.inline.label.fontSize, button.inline.label.color, button.inline.label.alpha
 *
 * States: hover, disabled
 * Variants: primary, secondary, danger, etc. (inserted after button)
 *
 * Example with variant and state:
 *   button.primary.fill.color:hover
 */

// ==================== RGB Color (re-export from box for convenience) ====================

export const RgbColorSchema = z.object({
    r: z.number().min(0).max(1),
    g: z.number().min(0).max(1),
    b: z.number().min(0).max(1),
});
export type RgbColor = z.infer<typeof RgbColorSchema>;

/**
 * Convert RGB color (0-1 range) to hex number
 */
export function rgbToHex(rgb: RgbColor): number {
    const r = Math.round(rgb.r * 255);
    const g = Math.round(rgb.g * 255);
    const b = Math.round(rgb.b * 255);
    return (r << 16) | (g << 8) | b;
}
