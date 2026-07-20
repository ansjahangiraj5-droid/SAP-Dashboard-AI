/**
 * Analysis.controller.js
 * Controls the AI Analysis results page.
 * Renders business insights, confidence bar, and navigates to Dashboard.
 */
sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/m/HBox",
    "sap/m/Text",
    "sap/m/VBox",
    "sap/m/ProgressIndicator",
    "ai/dashboard/service/ExportService"
], function (
    Controller, MessageToast, HBox, Text, VBox, ProgressIndicator, ExportService
) {
    "use strict";

    return Controller.extend("ai.dashboard.controller.Analysis", {

        // ── Lifecycle ─────────────────────────────────────────────────

        onInit: function () {
            this._oRouter = this.getOwnerComponent().getRouter();
            this._oRouter.getRoute("Analysis").attachPatternMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: function () {
            this._renderDynamicContent();
        },

        // ── Dynamic Content ───────────────────────────────────────────

        /**
         * Render the confidence bar and insights list — these cannot be
         * expressed purely in XML because they need computed CSS widths.
         * @private
         */
        _renderDynamicContent: function () {
            var oAppState = this.getOwnerComponent().getModel("appState");
            var oAnalysis = oAppState.getProperty("/analysis");

            if (!oAnalysis) { return; }

            this._renderConfidenceBar(oAnalysis);
            this._renderInsights(oAnalysis.insights || []);
        },

        /**
         * Render an HTML-based progress bar for the confidence score.
         * @private
         */
        _renderConfidenceBar: function (oAnalysis) {
            var oContainer = this.getView().byId("confidenceBarContainer");
            if (!oContainer) { return; }

            oContainer.removeAllItems();

            var nScore = oAnalysis.confidenceScore || 0;
            var sLevel = (nScore >= 80) ? "high" : (nScore >= 60) ? "medium" : "low";

            var oBar = new ProgressIndicator({
                percentValue: nScore,
                displayValue: nScore + "%",
                showValue: true,
                state: sLevel === "high" ? "Success" : sLevel === "medium" ? "Warning" : "Error",
                width: "100%"
            });

            oContainer.addItem(oBar);
        },

        /**
         * Render insight items programmatically with icon + text styling.
         * @private
         */
        _renderInsights: function (aInsights) {
            var oContainer = this.getView().byId("insightsList");
            if (!oContainer) { return; }

            oContainer.removeAllItems();

            var aIcons = ["💡", "📊", "🎯", "📈", "🔍", "⚡", "✅", "⚠️"];

            if (!aInsights || aInsights.length === 0) {
                oContainer.addItem(new Text({ text: "No insights generated." }).addStyleClass("sapUiSmallText"));
                return;
            }

            aInsights.forEach(function (sInsight, i) {
                var oRow = new HBox({
                    alignItems: "Start",
                    items: [
                        new Text({ text: aIcons[i % aIcons.length] }).addStyleClass("aiInsightIcon sapUiSmallMarginEnd"),
                        new Text({ text: sInsight, wrapping: true }).addStyleClass("sapUiSmallText")
                    ]
                }).addStyleClass("aiInsightItem");
                oContainer.addItem(oRow);
            });
        },

        // ── Formatters ────────────────────────────────────────────────

        /**
         * Format an array of strings into a comma-separated display string.
         * Used in XML binding formatter attributes.
         * @param {string[]} aValues
         * @returns {string}
         */
        formatArray: function (aValues) {
            if (!Array.isArray(aValues) || aValues.length === 0) { return "None"; }
            return aValues.join(", ");
        },

        // ── Navigation ────────────────────────────────────────────────

        onNavBack: function () {
            this._oRouter.navTo("Landing", {}, false);
        },

        onProceedToDashboard: function () {
            var oAppState = this.getOwnerComponent().getModel("appState");
            oAppState.setProperty("/showDashboard", true);
            this._oRouter.navTo("Dashboard");
        },

        // ── Export ────────────────────────────────────────────────────

        onDownloadAnalysis: function () {
            var oAppState = this.getOwnerComponent().getModel("appState");
            var oAnalysis = oAppState.getProperty("/analysis");
            if (!oAnalysis || !oAnalysis.title) {
                MessageToast.show("No analysis available to download.");
                return;
            }
            ExportService.downloadAnalysis(oAnalysis, "watsonx-analysis");
        }
    });
});
