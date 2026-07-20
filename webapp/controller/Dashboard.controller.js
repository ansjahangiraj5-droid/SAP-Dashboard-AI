/**
 * Dashboard.controller.js
 * Controls the dynamically built Dashboard page.
 * Delegates rendering to DashboardBuilder and exports to ExportService.
 */
sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/m/Select",
    "sap/ui/core/Item",
    "ai/dashboard/service/DashboardBuilder",
    "ai/dashboard/service/ExportService"
], function (
    Controller, MessageToast, MessageBox, Select, Item,
    DashboardBuilder, ExportService
) {
    "use strict";

    return Controller.extend("ai.dashboard.controller.Dashboard", {

        // ── Lifecycle ─────────────────────────────────────────────────

        onInit: function () {
            this._oRouter = this.getOwnerComponent().getRouter();
            this._oRouter.getRoute("Dashboard").attachPatternMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: function () {
            this._buildDashboard();
        },

        // ── Dashboard Build ───────────────────────────────────────────

        /**
         * Retrieve analysis + dataset from appState and delegate to DashboardBuilder.
         * @private
         */
        _buildDashboard: function () {
            var oAppState = this.getOwnerComponent().getModel("appState");
            var oAnalysis = oAppState.getProperty("/analysis");
            var oDataset = oAppState.getProperty("/dataset");

            if (!oAnalysis || !oAnalysis.title) {
                // No analysis available — empty state handled by XML visibility binding
                return;
            }

            var oBusyDialog = this.getView().byId("busyDialog");
            if (oBusyDialog) { oBusyDialog.open(); }

            // Use setTimeout to allow the busy dialog to render first
            setTimeout(function () {
                try {
                    var oContainer = this.getView().byId("dashboardContainer");
                    oContainer.removeAllItems();

                    var aControls = DashboardBuilder.buildDashboard(oAnalysis, oDataset);
                    aControls.forEach(function (oCtrl) {
                        oContainer.addItem(oCtrl);
                    });

                    // Build quick filter select
                    this._buildFilterSelect(oAnalysis.filters || [], oDataset);

                    oAppState.setProperty("/showDashboard", true);

                } catch (oErr) {
                    MessageBox.error("Failed to render dashboard: " + oErr.message);
                } finally {
                    if (oBusyDialog) { oBusyDialog.close(); }
                }
            }.bind(this), 100);
        },

        /**
         * Populate the OverflowToolbar filter Select with the first text column.
         * @private
         */
        _buildFilterSelect: function (aFilters, oDataset) {
            var oSelect = this.getView().byId("quickFilterSelect");
            if (!oSelect || !aFilters.length) { return; }

            oSelect.removeAllItems();
            oSelect.addItem(new Item({ key: "__all__", text: "All Records" }));

            // Use first text filter column to get unique values
            var oFirstFilter = aFilters[0];
            if (!oFirstFilter || !oFirstFilter.column) { return; }

            oSelect.setPlaceholder("Filter by " + oFirstFilter.column);

            var aRows = (oDataset && oDataset.rows) ? oDataset.rows : [];
            var aUnique = [];
            var oSeen = {};

            aRows.forEach(function (row) {
                var sVal = String(row[oFirstFilter.column] || "").trim();
                if (sVal && !oSeen[sVal]) {
                    oSeen[sVal] = true;
                    aUnique.push(sVal);
                }
            });

            aUnique.slice(0, 20).forEach(function (sVal) {
                oSelect.addItem(new Item({ key: sVal, text: sVal }));
            });
        },

        // ── Actions ───────────────────────────────────────────────────

        onNavBack: function () {
            this._oRouter.navTo("Analysis", {}, false);
        },

        onNavToAnalysis: function () {
            this._oRouter.navTo("Analysis", {}, false);
        },

        /** Refresh / rebuild the dashboard */
        onRefresh: function () {
            var oBusyDialog = this.getView().byId("busyDialog");
            if (oBusyDialog) { oBusyDialog.open(); }

            setTimeout(function () {
                this._buildDashboard();
            }.bind(this), 100);
        },

        /** Quick filter change — for demo just show toast */
        onQuickFilterChange: function (oEvent) {
            var sKey = oEvent.getParameter("selectedItem").getKey();
            if (sKey === "__all__") {
                MessageToast.show("Showing all records.");
            } else {
                MessageToast.show("Filtered by: " + sKey);
            }
        },

        // ── Exports ───────────────────────────────────────────────────

        onExportDashboard: function () {
            var oAppState = this.getOwnerComponent().getModel("appState");
            var oDataset = oAppState.getProperty("/dataset");
            ExportService.downloadDatasetCSV(oDataset);
        },

        onDownloadConfig: function () {
            var oAppState = this.getOwnerComponent().getModel("appState");
            var oAnalysis = oAppState.getProperty("/analysis");
            var oDataset = oAppState.getProperty("/dataset");

            if (!oAnalysis || !oAnalysis.title) {
                MessageToast.show("No dashboard configuration available.");
                return;
            }

            ExportService.downloadDashboardConfig(oAnalysis, oDataset, "dashboard-config");
        }
    });
});
