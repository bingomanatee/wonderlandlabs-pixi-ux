import type {BoxCellType} from '@wonderlandlabs-pixi-ux/box';
import {
    DIR_HORIZ,
    DIR_VERT,
    INSET_SCOPE_ALL,
    POS_CENTER,
} from '@wonderlandlabs-pixi-ux/box';
import type {ButtonOptionsType, ButtonStateType} from "./types.js";
import {BTYPE_AVATAR, BTYPE_BUTTON, BTYPE_ICON_VERT, BTYPE_TEXT} from "./constants.js";
import {fromJSON, StyleTree} from '@wonderlandlabs-pixi-ux/style-tree';
import defaultStyleJSON from './defaultStyles.json' with {type: 'json'};

type BoxStoreConfig = {
    value: BoxCellType;
};

export function makeStoreConfig(value: ButtonStateType, styleTree: StyleTree): BoxStoreConfig {

    switch (value.variant) {
        case BTYPE_TEXT: {
            return makeStoreConfigText(value, styleTree);
        }
        case BTYPE_AVATAR: {
            return makeStoreConfigAvatar(value, styleTree);
        }
        case BTYPE_ICON_VERT: {
            return makeStoreConfigIconVert(value, styleTree);
        }
        case BTYPE_BUTTON:
        default: {
            return makeStoreConfigButton(value, styleTree);
        }
    }
}

function makeStoreConfigButton(value: ButtonStateType, styleTree: StyleTree): BoxStoreConfig {
    return makeRowContainer(value, styleTree);
}

function makeStoreConfigIconVert(value: ButtonStateType, styleTree: StyleTree): BoxStoreConfig {
    return makeColumnContainer(value, styleTree);
}

function makeStoreConfigAvatar(value: ButtonStateType, styleTree: StyleTree): BoxStoreConfig {
    const avatarSize = resolveAvatarInnerSize(value, styleTree);
    const child = value.icon
        ? makeIconCell(value, styleTree, avatarSize, avatarSize)
        : makeLabelCell(value, styleTree, avatarSize, avatarSize);

    return {
        value: makeContainerCell(value, styleTree, {
            direction: DIR_HORIZ,
            children: child ? [child] : [],
        }),
    };
}

function makeStoreConfigText(value: ButtonStateType, styleTree: StyleTree): BoxStoreConfig {
    const contentWidth = resolveContentWidth(value, styleTree);
    const gap = value.icon && value.label ? resolveGap(value, styleTree) : 0;
    const labelWidth = value.icon
        ? Math.max(0, contentWidth - resolveIconWidth(value, styleTree) - gap)
        : contentWidth;

    return {
        value: makeContainerCell(value, styleTree, {
            direction: DIR_HORIZ,
            children: [
                makeIconCell(value, styleTree),
                makeLabelCell(value, styleTree, labelWidth),
            ].filter(Boolean) as BoxCellType[],
            gap,
        }),
    };
}

const defaultStyle = fromJSON(defaultStyleJSON);

export function getStyleTree(variant: string, options: ButtonOptionsType) {
    const {styleTree, styleDef} = options;
    if (styleTree) {
        return styleTree as unknown as StyleTree;
    }
    if (styleDef) {
        return fromJSON(styleDef);
    }


    return defaultStyle;
}

function makeRowContainer(value: ButtonStateType, styleTree: StyleTree): BoxStoreConfig {
    const contentWidth = resolveContentWidth(value, styleTree);
    const children = [
        makeIconCell(value, styleTree),
        makeLabelCell(value, styleTree, value.icon ? Math.max(0, contentWidth - resolveIconWidth(value, styleTree) - resolveGap(value, styleTree)) : contentWidth),
    ].filter(Boolean) as BoxCellType[];

    return {
        value: makeContainerCell(value, styleTree, {
            direction: DIR_HORIZ,
            children,
            gap: value.icon && value.label ? resolveGap(value, styleTree) : 0,
        }),
    };
}

function makeColumnContainer(value: ButtonStateType, styleTree: StyleTree): BoxStoreConfig {
    const contentWidth = resolveContentWidth(value, styleTree);
    const children = [
        makeIconCell(value, styleTree),
        makeLabelCell(value, styleTree, contentWidth),
    ].filter(Boolean) as BoxCellType[];

    return {
        value: makeContainerCell(value, styleTree, {
            direction: DIR_VERT,
            children,
            gap: value.icon && value.label ? resolveGap(value, styleTree) : 0,
        }),
    };
}

function makeContainerCell(
    value: ButtonStateType,
    styleTree: StyleTree,
    input: { direction: typeof DIR_HORIZ | typeof DIR_VERT; children: BoxCellType[]; gap?: number }
): BoxCellType {
    const width = value.size?.width ?? resolveContainerWidth(value, styleTree);
    const height = value.size?.height ?? resolveContainerHeight(value, styleTree);
    const padding = resolvePadding(value, styleTree);

    return {
        id: 'button-background',
        name: 'container',
        absolute: true,
        variant: value.variant,
        states: styleStates(value),
        dim: {
            x: 0,
            y: 0,
            w: width,
            h: height,
        },
        align: {
            direction: input.direction,
            xPosition: POS_CENTER,
            yPosition: POS_CENTER,
        },
        insets: padding > 0 ? [{
            role: 'padding',
            inset: [{scope: INSET_SCOPE_ALL, value: padding}],
        }] : undefined,
        gap: input.gap && input.gap > 0 ? input.gap : undefined,
        children: input.children,
    };
}

function makeIconCell(
    value: ButtonStateType,
    styleTree: StyleTree,
    widthOverride?: number,
    heightOverride?: number,
): BoxCellType | undefined {
    if (!value.icon) {
        return undefined;
    }

    const width = widthOverride ?? resolveIconWidth(value, styleTree);
    const height = heightOverride ?? resolveIconHeight(value, styleTree);
    return {
        id: 'button-icon',
        name: 'icon',
        absolute: false,
        dim: {
            w: width,
            h: height,
        },
        align: {
            direction: DIR_HORIZ,
            xPosition: POS_CENTER,
            yPosition: POS_CENTER,
        },
        content: {
            type: 'url',
            value: value.icon,
        },
    };
}

function makeLabelCell(
    value: ButtonStateType,
    styleTree: StyleTree,
    width: number,
    height = resolveLabelHeight(value, styleTree),
): BoxCellType | undefined {
    if (!value.label) {
        return undefined;
    }

    return {
        id: 'button-label',
        name: 'label',
        absolute: false,
        dim: {
            w: Math.max(0, width),
            h: Math.max(0, height),
        },
        align: {
            direction: DIR_HORIZ,
            xPosition: POS_CENTER,
            yPosition: POS_CENTER,
        },
        content: {
            type: 'text',
            value: value.label,
        },
    };
}

function resolveContentWidth(value: ButtonStateType, styleTree: StyleTree): number {
    return Math.max(0, (value.size?.width ?? resolveContainerWidth(value, styleTree)) - resolvePadding(value, styleTree) * 2);
}

function resolveContainerWidth(value: ButtonStateType, styleTree: StyleTree): number {
    return resolveStyleNumber(styleTree, 'container.background.width', styleStates(value), 200);
}

function resolveContainerHeight(value: ButtonStateType, styleTree: StyleTree): number {
    return resolveStyleNumber(styleTree, 'container.background.height', styleStates(value), value.variant === BTYPE_AVATAR ? 150 : 40);
}

function resolvePadding(value: ButtonStateType, styleTree: StyleTree): number {
    return resolveStyleNumber(styleTree, 'container.background.padding', styleStates(value), value.variant === BTYPE_AVATAR ? 15 : 4);
}

function resolveGap(value: ButtonStateType, styleTree: StyleTree): number {
    if (value.variant === BTYPE_ICON_VERT || value.variant === BTYPE_AVATAR) {
        return resolveStyleNumber(styleTree, 'container.content.gap', styleStates(value), 8);
    }
    return resolveStyleNumber(styleTree, 'container.content.gap', styleStates(value), 6);
}

function resolveIconWidth(value: ButtonStateType, styleTree: StyleTree): number {
    return resolveStyleNumber(styleTree, 'icon.size.width', styleStates(value), resolveStyleNumber(styleTree, 'icon.size.size', styleStates(value), value.variant === BTYPE_AVATAR ? 24 : 16));
}

function resolveIconHeight(value: ButtonStateType, styleTree: StyleTree): number {
    return resolveStyleNumber(styleTree, 'icon.size.height', styleStates(value), resolveStyleNumber(styleTree, 'icon.size.size', styleStates(value), value.variant === BTYPE_AVATAR ? 24 : 16));
}

function resolveLabelHeight(value: ButtonStateType, styleTree: StyleTree): number {
    return resolveStyleNumber(styleTree, 'label.size', styleStates(value), value.variant === BTYPE_AVATAR ? 24 : 14);
}

function resolveAvatarInnerSize(value: ButtonStateType, styleTree: StyleTree): number {
    const contentSize = Math.max(
        resolveIconWidth(value, styleTree),
        resolveIconHeight(value, styleTree),
        resolveLabelHeight(value, styleTree),
    );
    const containerSize = Math.min(
        value.size?.width ?? resolveContainerWidth(value, styleTree),
        value.size?.height ?? resolveContainerHeight(value, styleTree),
    );
    const padding = resolvePadding(value, styleTree) * 2;
    return Math.max(0, Math.min(contentSize, containerSize - padding));
}

function resolveStyleNumber(
    styleTree: StyleTree,
    nouns: string,
    states: string[],
    fallback: number,
): number {
    const value = styleTree.matchHierarchy
        ? styleTree.matchHierarchy({nouns: nouns.split('.'), states})
        : styleTree.get(nouns, states);
    return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function styleStates(value: ButtonStateType): string[] {
    const states: string[] = [];
    if (value.variant !== BTYPE_BUTTON) {
        states.push(value.variant);
    }
    if (value.isDisabled) {
        states.push('disabled');
    }
    if (value.isHovered) {
        states.push('hover');
    }
    return states;
}
