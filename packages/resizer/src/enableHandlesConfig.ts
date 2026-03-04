import { Application, Container, Rectangle } from "pixi.js";
import { Color, HandleMode, RectTransform, TransformedRectCallback } from "./types";

/**
 * Configuration for enableHandles
 */
export interface EnableHandlesConfig {
    /** PixiJS Application instance (required for ticker integration) */
    app: Application;
    /** Optional callback to render content based on new rectangle size */
    drawRect?: (rect: Rectangle, container: Container) => void;
    /** Callback when drag is released */
    onRelease?: (rect: Rectangle) => void;
    /** Size of handles in pixels (default: 12) */
    size?: number;
    /** Handle color (default: blue) */
    color?: Color;
    /** Constrain aspect ratio (default: false) */
    constrain?: boolean;
    /** Handle mode: corner only, edge only, or both (default: ONLY_CORNER) */
    mode?: HandleMode;
    /** Optional rectangle transform (e.g., snapping) */
    rectTransform?: RectTransform;
    /** Optional callback for transformed-rectangle preview */
    onTransformedRect?: TransformedRectCallback;
    /** Coordinate space used for pointer deltas and rect math (defaults to handles container space) */
    deltaSpace?: Container;
}
