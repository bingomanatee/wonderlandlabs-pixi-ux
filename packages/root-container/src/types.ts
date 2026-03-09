import type { Container, FederatedPointerEvent } from 'pixi.js';

export interface RootContainerResult {
  stage: Container;
  root: Container;
  destroy: () => void;
}

export interface ZoomPanResult {
  zoomPan: Container;
  destroy: () => void;
}

export interface StageDraggableResult {
  destroy: () => void;
}

export interface StageDraggableOptions {
  dragTarget?: Container;
  getDragTarget?: (event: FederatedPointerEvent) => Container | undefined;
  targetPointTransform?: (
    point: { x: number; y: number },
    event: FederatedPointerEvent
  ) => { x: number; y: number };
}

export interface StageDragEvent {
  type: 'drag-start' | 'drag-move' | 'drag-end';
  position: { x: number; y: number };
}

export interface ZoomOptions {
  minZoom?: number;
  maxZoom?: number;
  zoomSpeed?: number;
}

export interface StageZoomableResult {
  setZoom: (zoom: number) => void;
  getZoom: () => number;
  destroy: () => void;
}

export interface StageZoomEvent {
  type: 'zoom';
  zoom: number;
  mousePosition: { x: number; y: number };
}
