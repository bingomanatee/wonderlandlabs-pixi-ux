import {STYLE_VARIANT, type StyleVariant} from './constants';
import type {RgbColor, WindowStyle, PartialWindowStyle} from './types';

// Default style (dark theme)
export const DEFAULT_STYLE: WindowStyle = {
    backgroundColor: {r: 0.1, g: 0.1, b: 0.1},
    titlebarBackgroundColor: {r: 0.2, g: 0.2, b: 0.2},
    titlebarTextColor: {r: 1, g: 1, b: 1},
    borderWidth: 0,
    selectedBorderColor: {r: 1, g: 0.6, b: 0}, // Orange
    selectedBorderWidth: 2,
};

// Style variants
export const STYLE_VARIANTS: Record<StyleVariant, WindowStyle> = {
    [STYLE_VARIANT.DEFAULT]: DEFAULT_STYLE,
    
    [STYLE_VARIANT.LIGHT_GRAYSCALE]: {
        backgroundColor: {r: 0.9, g: 0.9, b: 0.9},
        titlebarBackgroundColor: {r: 0.7, g: 0.7, b: 0.7},
        titlebarTextColor: {r: 0.1, g: 0.1, b: 0.1},
        borderColor: {r: 0.5, g: 0.5, b: 0.5},
        borderWidth: 1,
        selectedBorderColor: {r: 1, g: 0.5, b: 0}, // Orange
        selectedBorderWidth: 2,
    },
    
    [STYLE_VARIANT.INVERTED]: {
        backgroundColor: {r: 0.95, g: 0.95, b: 0.95},
        titlebarBackgroundColor: {r: 0.1, g: 0.1, b: 0.1},
        titlebarTextColor: {r: 1, g: 1, b: 1},
        borderColor: {r: 0.2, g: 0.2, b: 0.2},
        borderWidth: 1,
        selectedBorderColor: {r: 1, g: 0.4, b: 0}, // Darker orange
        selectedBorderWidth: 2,
    },
    
    [STYLE_VARIANT.BLUE]: {
        backgroundColor: {r: 0.1, g: 0.15, b: 0.25},
        titlebarBackgroundColor: {r: 0.2, g: 0.3, b: 0.5},
        titlebarTextColor: {r: 0.9, g: 0.95, b: 1},
        borderColor: {r: 0.3, g: 0.4, b: 0.6},
        borderWidth: 1,
        selectedBorderColor: {r: 0.4, g: 0.8, b: 1}, // Light blue
        selectedBorderWidth: 2,
    },
    
    [STYLE_VARIANT.ALERT_INFO]: {
        backgroundColor: {r: 0.85, g: 0.93, b: 1},
        titlebarBackgroundColor: {r: 0.2, g: 0.5, b: 0.8},
        titlebarTextColor: {r: 1, g: 1, b: 1},
        borderColor: {r: 0.2, g: 0.5, b: 0.8},
        borderWidth: 2,
        selectedBorderColor: {r: 0, g: 0.4, b: 0.8},
        selectedBorderWidth: 3,
    },
    
    [STYLE_VARIANT.ALERT_DANGER]: {
        backgroundColor: {r: 1, g: 0.9, b: 0.9},
        titlebarBackgroundColor: {r: 0.8, g: 0.2, b: 0.2},
        titlebarTextColor: {r: 1, g: 1, b: 1},
        borderColor: {r: 0.8, g: 0.2, b: 0.2},
        borderWidth: 2,
        selectedBorderColor: {r: 0.6, g: 0, b: 0},
        selectedBorderWidth: 3,
    },
    
    [STYLE_VARIANT.ALERT_WARNING]: {
        backgroundColor: {r: 1, g: 0.97, b: 0.88},
        titlebarBackgroundColor: {r: 0.9, g: 0.6, b: 0.1},
        titlebarTextColor: {r: 0.2, g: 0.15, b: 0},
        borderColor: {r: 0.9, g: 0.6, b: 0.1},
        borderWidth: 2,
        selectedBorderColor: {r: 0.7, g: 0.4, b: 0},
        selectedBorderWidth: 3,
    },
};

/**
 * Deep merge two RGB colors - user color takes precedence
 */
function mergeColor(base: RgbColor, override?: RgbColor): RgbColor {
    if (!override) return base;
    return override;
}

/**
 * Blend user styles with a base style (variant or default).
 * User styles take precedence over base styles.
 */
export function blendStyles(
    baseStyle: WindowStyle,
    userStyle?: PartialWindowStyle
): WindowStyle {
    if (!userStyle) return baseStyle;
    
    return {
        backgroundColor: mergeColor(baseStyle.backgroundColor, userStyle.backgroundColor),
        titlebarBackgroundColor: mergeColor(baseStyle.titlebarBackgroundColor, userStyle.titlebarBackgroundColor),
        titlebarTextColor: mergeColor(baseStyle.titlebarTextColor, userStyle.titlebarTextColor),
        borderColor: userStyle.borderColor ?? baseStyle.borderColor,
        borderWidth: userStyle.borderWidth ?? baseStyle.borderWidth,
        selectedBorderColor: mergeColor(baseStyle.selectedBorderColor, userStyle.selectedBorderColor),
        selectedBorderWidth: userStyle.selectedBorderWidth ?? baseStyle.selectedBorderWidth,
        hoverBorderColor: userStyle.hoverBorderColor ?? baseStyle.hoverBorderColor,
        hoverBorderWidth: userStyle.hoverBorderWidth ?? baseStyle.hoverBorderWidth,
    };
}

/**
 * Get the resolved style for a window based on variant and user overrides.
 */
export function resolveWindowStyle(
    variant: StyleVariant = STYLE_VARIANT.DEFAULT,
    userStyle?: PartialWindowStyle
): WindowStyle {
    const baseStyle = STYLE_VARIANTS[variant] ?? DEFAULT_STYLE;
    return blendStyles(baseStyle, userStyle);
}

