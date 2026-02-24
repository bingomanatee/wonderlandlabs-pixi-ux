import { TickerForest } from '@wonderlandlabs-pixi-ux/ticker-forest';
import { Container, Graphics, TilingSprite, Texture } from 'pixi.js';
import type { Application } from 'pixi.js';
import type { GridStoreValue, GridManagerValue } from './types';

export interface GridManagerConfig {
  gridSpec: GridStoreValue;
  application: Application;
  zoomPanContainer: Container;
}

/**
 * Forestry-based grid manager that listens to zoom/pan events
 * and efficiently redraws the grid using the TickerForest pattern.
 * Uses lazy getters for container, sprites, and textures.
 */
export class GridManager extends TickerForest<GridManagerValue> {
  #zoomPanContainer: Container;
  #_gridContainer?: Container;
  #_gridTexture?: Texture;
  #_gridSprite?: TilingSprite;
  #_gridMajorTexture?: Texture;
  #_gridMajorSprite?: TilingSprite;
  #_artboard?: Graphics;
  #currentZoom: number = 1;

  constructor(config: GridManagerConfig) {
    super(
      {
        value: {
          gridSpec: config.gridSpec,
          dirty: false,
        },
      },
      { app: config.application, container: config.zoomPanContainer }
    );

    // Store PixiJS references as private properties (not in Forestry state)
    this.#zoomPanContainer = config.zoomPanContainer;

    this.#initialize();
  }

  /**
   * TickerForest abstract method - check if dirty
   */
  protected isDirty(): boolean {
    return this.value.dirty;
  }

  /**
   * TickerForest abstract method - clear dirty flag
   */
  protected clearDirty(): void {
    this.mutate(draft => {
      draft.dirty = false;
    });
  }

  /**
   * TickerForest abstract method - mark as dirty
   */
  protected markDirty(): void {
    this.mutate(draft => {
      draft.dirty = true;
    });
  }

  /**
   * TickerForest abstract method - resolve (redraw grid)
   */
  protected resolve(): void {
    this.#redrawGrid();
  }

  /**
   * Lazy getter for grid container
   */
  get #gridContainer(): Container {
    if (!this.#_gridContainer) {
      this.#_gridContainer = this.#createGridContainer();
    }
    return this.#_gridContainer;
  }

  /**
   * Lazy getter for grid texture
   */
  get #gridTexture(): Texture {
    if (!this.#_gridTexture) {
      const { gridSpec } = this.value;
      this.#_gridTexture = this.#createGridTexture(
        400,
        gridSpec.grid.x,
        gridSpec.grid.y,
        gridSpec.grid.color,
        gridSpec.grid.alpha
      );
    }
    return this.#_gridTexture;
  }

  /**
   * Lazy getter for grid sprite
   */
  get #gridSprite(): TilingSprite {
    if (!this.#_gridSprite) {
      this.#_gridSprite = this.#createGridSprite();
    }
    return this.#_gridSprite;
  }

  /**
   * Lazy getter for major grid texture
   */
  get #gridMajorTexture(): Texture | undefined {
    const { gridSpec } = this.value;
    if (!gridSpec.gridMajor) return undefined;

    if (!this.#_gridMajorTexture) {
      this.#_gridMajorTexture = this.#createGridMajorTexture();
    }
    return this.#_gridMajorTexture;
  }

  /**
   * Lazy getter for major grid sprite
   */
  get #gridMajorSprite(): TilingSprite | undefined {
    const { gridSpec } = this.value;
    if (!gridSpec.gridMajor) return undefined;

    if (!this.#_gridMajorSprite && this.#gridMajorTexture) {
      this.#_gridMajorSprite = this.#createGridMajorSprite();
    }
    return this.#_gridMajorSprite;
  }

  /**
   * Lazy getter for artboard
   */
  get #artboard(): Graphics | undefined {
    const { gridSpec } = this.value;
    if (!gridSpec.artboard) return undefined;

    if (!this.#_artboard) {
      this.#_artboard = this.#createArtboard();
    }
    return this.#_artboard;
  }

  /**
   * Create grid container
   */
  #createGridContainer(): Container {
    const container = new Container();
    container.label = 'GridContainer';

    // Add to zoom/pan container at bottom
    this.#zoomPanContainer.addChildAt(container, 0);

    return container;
  }

  /**
   * Create grid sprite
   */
  #createGridSprite(): TilingSprite {
    const sprite = new TilingSprite({
      texture: this.#gridTexture,
      width: 10000,
      height: 10000,
    });
    sprite.anchor.set(0.5);
    sprite.label = 'GridSprite';
    this.#gridContainer!.addChild(sprite);

    return sprite;
  }

  /**
   * Create major grid texture
   */
  #createGridMajorTexture(): Texture {
    const { gridSpec } = this.value;
    if (!gridSpec.gridMajor) throw new Error('gridMajor not defined');

    return this.#createGridTexture(
      400,
      gridSpec.gridMajor.x,
      gridSpec.gridMajor.y,
      gridSpec.gridMajor.color,
      gridSpec.gridMajor.alpha
    );
  }

  /**
   * Create major grid sprite
   */
  #createGridMajorSprite(): TilingSprite {
    if (!this.#gridMajorTexture) throw new Error('gridMajorTexture not available');

    const sprite = new TilingSprite({
      texture: this.#gridMajorTexture,
      width: 10000,
      height: 10000,
    });
    sprite.anchor.set(0.5);
    sprite.label = 'GridMajorSprite';
    this.#gridContainer.addChild(sprite);

    return sprite;
  }

  /**
   * Create artboard
   */
  #createArtboard(): Graphics {
    const { gridSpec } = this.value;
    if (!gridSpec.artboard) throw new Error('artboard not defined');

    const { x, y, width, height, color, alpha } = gridSpec.artboard;
    const artboard = new Graphics();
    artboard.rect(x, y, width, height);
    artboard.stroke({ color, width: 1, alpha });
    artboard.label = 'Artboard';
    this.#gridContainer.addChild(artboard);

    return artboard;
  }

  /**
   * Initialize the grid and set up event listeners
   */
  #initialize(): void {
    // Trigger lazy creation of container and sprites
    this.#gridContainer;
    this.#gridSprite;
    this.#gridMajorSprite;
    this.#artboard;

    // Listen to stage zoom events - mark dirty
    this.application?.stage.on('stage-zoom', () => {
      this.markDirty();
      this.queueResolve();
    });

    // Listen to stage drag events - mark dirty
    this.application?.stage.on('stage-drag', () => {
      this.markDirty();
      this.queueResolve();
    });

    // Initial draw
    this.markDirty();
    this.kickoff();
  }

  /**
   * Ticker handler - recreates textures if dirty
   */
  #onTick = (): void => {
    if (this.value.dirty) {
      this.#redrawGrid();
      this.mutate(draft => {
        draft.dirty = false;
      });
    }
  };

  /**
   * Create a grid texture with lines using canvas
   */
  #createGridTexture(
    size: number,
    spacingX: number,
    spacingY: number,
    color: number,
    alpha: number,
    lineWidth: number = 1
  ): Texture {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // Convert hex color to rgba
    const r = (color >> 16) & 0xFF;
    const g = (color >> 8) & 0xFF;
    const b = color & 0xFF;
    ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
    ctx.lineWidth = lineWidth;

    // Draw vertical lines
    for (let x = 0; x <= size; x += spacingX) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, size);
      ctx.stroke();
    }

    // Draw horizontal lines
    for (let y = 0; y <= size; y += spacingY) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(size, y);
      ctx.stroke();
    }

    return Texture.from(canvas);
  }

  /**
   * Redraw grid - recreate textures with adjusted line thickness
   */
  #redrawGrid(): void {
    const { gridSpec } = this.value;
    const zoom = this.#zoomPanContainer.scale.x;

    // Calculate line width to maintain 1px visual thickness
    // When zoomed in (zoom > 1), lines need to be thinner in world space
    // When zoomed out (zoom < 1), lines need to be thicker in world space
    const lineWidth = 1 / zoom;

    // Calculate what the visual spacing would be in screen pixels
    let visualSpacingX = gridSpec.grid.x * zoom;
    let visualSpacingY = gridSpec.grid.y * zoom;

    // If visual spacing < 16px, double the spacing to avoid overly dense gridlines
    let multiplier = 1;
    while (visualSpacingX * multiplier < 16 || visualSpacingY * multiplier < 16) {
      multiplier *= 2;
    }

    // Recreate grid texture with adjusted line width and multiplied spacing
    if (this.#_gridTexture) {
      this.#_gridTexture.destroy();
    }
    this.#_gridTexture = this.#createGridTexture(
      400,
      gridSpec.grid.x * multiplier,
      gridSpec.grid.y * multiplier,
      gridSpec.grid.color,
      gridSpec.grid.alpha,
      lineWidth
    );

    // No scaling needed - texture is in world coordinates
    if (this.#_gridSprite) {
      this.#_gridSprite.texture = this.#_gridTexture;
      this.#_gridSprite.scale.set(1);
    }

    // Update major grid if it exists
    if (gridSpec.gridMajor && this.#_gridMajorSprite) {
      let majorVisualSpacingX = gridSpec.gridMajor.x * zoom;
      let majorVisualSpacingY = gridSpec.gridMajor.y * zoom;

      let majorMultiplier = 1;
      while (majorVisualSpacingX * majorMultiplier < 16 || majorVisualSpacingY * majorMultiplier < 16) {
        majorMultiplier *= 2;
      }

      // Recreate major grid texture with adjusted line width and multiplied spacing
      if (this.#_gridMajorTexture) {
        this.#_gridMajorTexture.destroy();
      }
      this.#_gridMajorTexture = this.#createGridTexture(
        400,
        gridSpec.gridMajor.x * majorMultiplier,
        gridSpec.gridMajor.y * majorMultiplier,
        gridSpec.gridMajor.color,
        gridSpec.gridMajor.alpha,
        lineWidth
      );

      // No scaling needed
      this.#_gridMajorSprite.texture = this.#_gridMajorTexture;
      this.#_gridMajorSprite.scale.set(1);
    }

    this.#currentZoom = zoom;
  }

  /**
   * Update the grid specification
   */
  updateGridSpec(gridSpec: Partial<GridStoreValue>): void {
    this.mutate((draft) => {
      if (gridSpec.grid) {
        draft.gridSpec.grid = { ...draft.gridSpec.grid, ...gridSpec.grid };
      }
      if (gridSpec.gridMajor !== undefined) {
        draft.gridSpec.gridMajor = gridSpec.gridMajor;
      }
      if (gridSpec.artboard !== undefined) {
        draft.gridSpec.artboard = gridSpec.artboard;
      }
      draft.dirty = true;
    });

    // Clear cached resources to force recreation
    if (this.#_gridTexture) {
      this.#_gridTexture.destroy();
      this.#_gridTexture = undefined;
    }
    if (this.#_gridMajorTexture) {
      this.#_gridMajorTexture.destroy();
      this.#_gridMajorTexture = undefined;
    }
    if (this.#_artboard) {
      this.#_artboard.destroy();
      this.#_artboard = undefined;
    }
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    // Call parent cleanup to remove ticker listener
    super.cleanup();

    // Remove event listeners
    this.application?.stage.off('stage-zoom');
    this.application?.stage.off('stage-drag');

    // Destroy textures
    if (this.#_gridTexture) {
      this.#_gridTexture.destroy();
      this.#_gridTexture = undefined;
    }
    if (this.#_gridMajorTexture) {
      this.#_gridMajorTexture.destroy();
      this.#_gridMajorTexture = undefined;
    }

    // Remove and destroy container
    if (this.#_gridContainer) {
      this.#zoomPanContainer.removeChild(this.#_gridContainer);
      this.#_gridContainer.destroy({ children: true });
      this.#_gridContainer = undefined;
    }
  }
}
