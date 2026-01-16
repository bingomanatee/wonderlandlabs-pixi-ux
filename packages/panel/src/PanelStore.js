"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PanelStore = void 0;
var forestry4_1 = require("@wonderlandlabs/forestry4");
var types_1 = require("./types");
var constants_1 = require("./constants");
var PanelStore = /** @class */ (function (_super) {
    __extends(PanelStore, _super);
    function PanelStore(panels) {
        // Validate all panels if provided
        var validatedPanels = new Map();
        panels === null || panels === void 0 ? void 0 : panels.forEach(function (panel, id) {
            validatedPanels.set(id, types_1.PanelDataSchema.parse(panel));
        });
        return _super.call(this, {
            value: {
                panels: validatedPanels,
            },
        }) || this;
    }
    /**
     * Add a new panel (validates with Zod)
     */
    PanelStore.prototype.addPanel = function (panel) {
        var validatedPanel = types_1.PanelDataSchema.parse(panel);
        this.set(['panels', validatedPanel.id], validatedPanel);
    };
    /**
     * Remove a panel by ID (marks as deleted)
     */
    PanelStore.prototype.removePanel = function (id) {
        var panel = this.value.panels.get(id);
        if (!panel) {
            throw new Error("Panel with id \"".concat(id, "\" not found"));
        }
        var updatedPanel = types_1.PanelDataSchema.parse(__assign(__assign({}, panel), { status: constants_1.PANEL_STATUS.DELETED }));
        this.set(['panels', id], updatedPanel);
    };
    /**
     * Update a panel (validates merged result with Zod)
     */
    PanelStore.prototype.updatePanel = function (id, updates) {
        if (this.isDeleted(id))
            return;
        var panel = this.value.panels.get(id);
        if (!panel) {
            throw new Error("Panel with id \"".concat(id, "\" not found"));
        }
        var updatedPanel = types_1.PanelDataSchema.parse(__assign(__assign(__assign({}, panel), updates), { status: constants_1.PANEL_STATUS.DIRTY }));
        this.set(['panels', id], updatedPanel);
    };
    /**
     * Update panel position (validates with Zod)
     */
    PanelStore.prototype.updatePanelPosition = function (id, x, y) {
        if (this.isDeleted(id))
            return;
        var panel = this.value.panels.get(id);
        if (!panel) {
            throw new Error("Panel with id \"".concat(id, "\" not found"));
        }
        var updatedPanel = types_1.PanelDataSchema.parse(__assign(__assign({}, panel), { x: x, y: y, status: constants_1.PANEL_STATUS.DIRTY }));
        this.set(['panels', id], updatedPanel);
    };
    /**
     * Update panel size (validates with Zod)
     */
    PanelStore.prototype.updatePanelSize = function (id, width, height) {
        if (this.isDeleted(id))
            return;
        var panel = this.value.panels.get(id);
        if (!panel) {
            throw new Error("Panel with id \"".concat(id, "\" not found"));
        }
        var updatedPanel = types_1.PanelDataSchema.parse(__assign(__assign({}, panel), { width: width, height: height, status: constants_1.PANEL_STATUS.DIRTY }));
        this.set(['panels', id], updatedPanel);
    };
    /**
     * Update panel background style (validates with Zod)
     */
    PanelStore.prototype.updatePanelBackground = function (id, background) {
        if (this.isDeleted(id))
            return;
        var panel = this.value.panels.get(id);
        if (!panel) {
            throw new Error("Panel with id \"".concat(id, "\" not found"));
        }
        var newBackground = background === false
            ? false
            : __assign(__assign({}, panel.style.background), background);
        var updatedPanel = types_1.PanelDataSchema.parse(__assign(__assign({}, panel), { style: __assign(__assign({}, panel.style), { background: newBackground }), status: constants_1.PANEL_STATUS.DIRTY }));
        this.set(['panels', id], updatedPanel);
    };
    /**
     * Update panel stroke style (validates with Zod)
     */
    PanelStore.prototype.updatePanelStroke = function (id, stroke) {
        if (this.isDeleted(id))
            return;
        var panel = this.value.panels.get(id);
        if (!panel) {
            throw new Error("Panel with id \"".concat(id, "\" not found"));
        }
        var newStroke = stroke === false
            ? false
            : __assign(__assign({}, panel.style.stroke), stroke);
        var updatedPanel = types_1.PanelDataSchema.parse(__assign(__assign({}, panel), { style: __assign(__assign({}, panel.style), { stroke: newStroke }), status: constants_1.PANEL_STATUS.DIRTY }));
        this.set(['panels', id], updatedPanel);
    };
    /**
     * Update panel order (validates with Zod)
     */
    PanelStore.prototype.updatePanelOrder = function (id, order) {
        if (this.isDeleted(id))
            return;
        var panel = this.value.panels.get(id);
        if (!panel) {
            throw new Error("Panel with id \"".concat(id, "\" not found"));
        }
        var updatedPanel = types_1.PanelDataSchema.parse(__assign(__assign({}, panel), { order: order, status: constants_1.PANEL_STATUS.DIRTY }));
        this.set(['panels', id], updatedPanel);
    };
    /**
     * Get a panel by ID
     */
    PanelStore.prototype.getPanel = function (id) {
        return this.value.panels.get(id);
    };
    /**
     * Get all panels as an array, sorted by order
     */
    PanelStore.prototype.getPanelsArray = function () {
        return Array.from(this.value.panels.values()).sort(function (a, b) { return a.order - b.order; });
    };
    /**
     * Get visible panels as an array, sorted by order
     */
    PanelStore.prototype.getVisiblePanels = function () {
        return this.getPanelsArray().filter(function (panel) { return panel.isVisible; });
    };
    /**
     * Clear all panels (marks all as deleted)
     */
    PanelStore.prototype.clearPanels = function () {
        this.mutate(function (draft) {
            draft.panels.forEach(function (panel, id) {
                draft.panels.set(id, __assign(__assign({}, panel), { status: constants_1.PANEL_STATUS.DELETED }));
            });
        });
    };
    /**
     * Get panel count
     */
    PanelStore.prototype.getPanelCount = function () {
        return this.value.panels.size;
    };
    /**
     * Check if a panel is deleted
     */
    PanelStore.prototype.isDeleted = function (id) {
        var panel = this.value.panels.get(id);
        return (panel === null || panel === void 0 ? void 0 : panel.status) === constants_1.PANEL_STATUS.DELETED;
    };
    /**
     * Set custom data property on a panel
     */
    PanelStore.prototype.setPanelData = function (id, key, value) {
        if (this.isDeleted(id))
            return;
        var panel = this.value.panels.get(id);
        if (!panel) {
            throw new Error("Panel with id \"".concat(id, "\" not found"));
        }
        var data = panel.data ? new Map(panel.data) : new Map();
        data.set(key, value);
        var updatedPanel = types_1.PanelDataSchema.parse(__assign(__assign({}, panel), { data: data, status: constants_1.PANEL_STATUS.DIRTY }));
        this.set(['panels', id], updatedPanel);
    };
    /**
     * Get custom data property from a panel
     */
    PanelStore.prototype.getPanelData = function (id, key) {
        var _a;
        var panel = this.value.panels.get(id);
        return (_a = panel === null || panel === void 0 ? void 0 : panel.data) === null || _a === void 0 ? void 0 : _a.get(key);
    };
    /**
     * Remove custom data property from a panel
     */
    PanelStore.prototype.removePanelData = function (id, key) {
        if (this.isDeleted(id))
            return;
        var panel = this.value.panels.get(id);
        if (!panel || !panel.data) {
            return;
        }
        var data = new Map(panel.data);
        data.delete(key);
        var updatedPanel = types_1.PanelDataSchema.parse(__assign(__assign({}, panel), { data: data, status: constants_1.PANEL_STATUS.DIRTY }));
        this.set(['panels', id], updatedPanel);
    };
    /**
     * Get panels by status
     */
    PanelStore.prototype.getPanelsByStatus = function (status) {
        return Array.from(this.value.panels.values()).filter(function (panel) { return panel.status === status; });
    };
    /**
     * Get all clean panels (for change detection in pre())
     */
    PanelStore.prototype.getCleanPanels = function () {
        return this.getPanelsByStatus(constants_1.PANEL_STATUS.CLEAN);
    };
    /**
     * Get all dirty panels (panels that need redrawing)
     */
    PanelStore.prototype.getDirtyPanels = function () {
        return this.getPanelsByStatus(constants_1.PANEL_STATUS.DIRTY);
    };
    /**
     * Get all deleted panels
     */
    PanelStore.prototype.getDeletedPanels = function () {
        return this.getPanelsByStatus(constants_1.PANEL_STATUS.DELETED);
    };
    /**
     * Mark all panels as clean
     */
    PanelStore.prototype.markAllPanelsClean = function () {
        this.mutate(function (draft) {
            draft.panels.forEach(function (panel, id) {
                if (panel.status !== constants_1.PANEL_STATUS.DELETED) {
                    draft.panels.set(id, __assign(__assign({}, panel), { status: constants_1.PANEL_STATUS.CLEAN }));
                }
            });
        });
    };
    /**
     * Remove all deleted panels from the store
     */
    PanelStore.prototype.purgeDeletedPanels = function () {
        this.mutate(function (draft) {
            draft.panels.forEach(function (panel, id) {
                if (panel.status === constants_1.PANEL_STATUS.DELETED) {
                    draft.panels.delete(id);
                }
            });
        });
    };
    return PanelStore;
}(forestry4_1.Forest));
exports.PanelStore = PanelStore;
