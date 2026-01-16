"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.makePanelDraggable = makePanelDraggable;
var pixi_js_1 = require("pixi.js");
/**
 * Makes a panel draggable via pointer events on its container.
 * Emits 'panel-drag' events to the application's event stream.
 * All position updates happen in ticker handlers for clean PixiJS updates.
 * Updates the PanelStore position on drag.
 *
 * @param app - The PixiJS Application instance
 * @param panelStore - The PanelStore instance
 * @param panelId - The ID of the panel to make draggable
 * @param panelContainer - The PixiJS container representing the panel
 * @returns Object with destroy function
 */
function makePanelDraggable(app, panelStore, panelId, panelContainer) {
    var isDragging = false;
    var dragStart = new pixi_js_1.Point();
    var dragOffset = new pixi_js_1.Point();
    // Pending updates to apply in ticker
    var pendingPosition = null;
    var onDragMove = function (event) {
        var position = event.global;
        var dx = position.x - dragStart.x;
        var dy = position.y - dragStart.y;
        // Queue position update for next ticker
        pendingPosition = {
            x: dragOffset.x + dx,
            y: dragOffset.y + dy,
        };
        // Schedule ticker update
        app.ticker.addOnce(function () {
            if (pendingPosition) {
                panelContainer.position.set(pendingPosition.x, pendingPosition.y);
                // Update panel store
                panelStore.updatePanelPosition(panelId, pendingPosition.x, pendingPosition.y);
                // Emit drag-move event
                app.stage.emit('panel-drag', {
                    type: 'drag-move',
                    panelId: panelId,
                    position: { x: pendingPosition.x, y: pendingPosition.y },
                });
                pendingPosition = null;
            }
        });
    };
    var onDragEnd = function () {
        isDragging = false;
        panelContainer.cursor = 'grab';
        pendingPosition = null;
        // Remove move/up listeners
        panelContainer.off('pointermove', onDragMove);
        panelContainer.off('pointerup', onDragEnd);
        panelContainer.off('pointerupoutside', onDragEnd);
        // Emit drag-end event
        app.stage.emit('panel-drag', {
            type: 'drag-end',
            panelId: panelId,
            position: { x: panelContainer.position.x, y: panelContainer.position.y },
        });
    };
    var onDragStart = function (event) {
        // Prevent multiple simultaneous drags
        if (isDragging)
            return;
        isDragging = true;
        panelContainer.cursor = 'grabbing';
        var position = event.global;
        dragStart.set(position.x, position.y);
        dragOffset.set(panelContainer.position.x, panelContainer.position.y);
        // Attach move/up listeners only when dragging starts
        panelContainer.on('pointermove', onDragMove);
        panelContainer.on('pointerup', onDragEnd);
        panelContainer.on('pointerupoutside', onDragEnd);
        // Emit drag-start event
        app.stage.emit('panel-drag', {
            type: 'drag-start',
            panelId: panelId,
            position: { x: panelContainer.position.x, y: panelContainer.position.y },
        });
    };
    // Make panel container interactive and attach pointerdown listener
    panelContainer.eventMode = 'static';
    panelContainer.cursor = 'grab';
    panelContainer.on('pointerdown', onDragStart);
    // Cleanup function
    var destroy = function () {
        panelContainer.off('pointerdown', onDragStart);
        // Also remove move/up listeners in case they're still attached
        panelContainer.off('pointermove', onDragMove);
        panelContainer.off('pointerup', onDragEnd);
        panelContainer.off('pointerupoutside', onDragEnd);
        pendingPosition = null;
        isDragging = false;
    };
    return {
        destroy: destroy,
    };
}
