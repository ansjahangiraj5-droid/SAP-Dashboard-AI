/**
 * App.controller.js
 * Root controller attached to App.xml.
 * Owns: ShellBar, Settings dialog, global navigation.
 */
sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/core/Fragment"
], function (Controller, MessageToast, MessageBox, Fragment) {
    "use strict";

    return Controller.extend("ai.dashboard.controller.App", {

        // ── Lifecycle ────────────────────────────────────────────────

        onInit: function () {
            this._oSettingsDialog = null;
        },

        // ── Navigation ───────────────────────────────────────────────

        onNavBack: function () {
            var oHistory = sap.ui.core.routing.History.getInstance();
            var sPreviousHash = oHistory.getPreviousHash();
            if (sPreviousHash !== undefined) {
                window.history.go(-1);
            } else {
                this.getOwnerComponent().getRouter().navTo("Landing", {}, true);
            }
        },

        // ── Settings Dialog ──────────────────────────────────────────

        /**
         * Open the Settings dialog (lazy load).
         */
        onOpenSettings: function () {
            var oView = this.getView();
            var that = this;

            if (!this._oSettingsDialog) {
                Fragment.load({
                    id: oView.getId(),
                    name: "ai.dashboard.view.fragment.SettingsDialog",
                    controller: this
                }).then(function (oDialog) {
                    that._oSettingsDialog = oDialog;
                    oView.addDependent(oDialog);
                    oDialog.open();
                });
            } else {
                this._oSettingsDialog.open();
            }
        },

        onSaveSettings: function () {
            // Settings are already two-way bound to appState model; just close.
            var oAppState = this.getOwnerComponent().getModel("appState");
            var sApiKey = oAppState.getProperty("/watsonx/apiKey");

            if (!sApiKey || sApiKey.trim() === "") {
                MessageToast.show("No API key entered — running in Demo mode.");
            } else {
                MessageToast.show("Settings saved. IBM watsonx AI is now enabled.");
            }

            if (this._oSettingsDialog) {
                this._oSettingsDialog.close();
            }
        },

        onCloseSettings: function () {
            if (this._oSettingsDialog) {
                this._oSettingsDialog.close();
            }
        },

        /**
         * Test the watsonx connection with a minimal prompt.
         */
        onTestConnection: function () {
            var oAppState = this.getOwnerComponent().getModel("appState");
            var oSettings = oAppState.getProperty("/watsonx");

            if (!oSettings.apiKey) {
                MessageToast.show("Please enter an API key first.");
                return;
            }

            MessageToast.show("Testing connection to IBM watsonx…");

            sap.ui.require(["ai/dashboard/service/AIService"], function (AIService) {
                // Tiny test dataset
                var oTestDataset = {
                    fileName: "test.csv",
                    rowCount: 5,
                    columnCount: 2,
                    headers: ["Product", "Sales"],
                    numericColumns: ["Sales"],
                    dateColumns: [],
                    textColumns: ["Product"],
                    sampleRows: [{ Product: "A", Sales: 100 }],
                    rows: [{ Product: "A", Sales: 100 }]
                };

                AIService.analyzeDataset(oTestDataset, "Test connection", oSettings)
                    .then(function () {
                        MessageBox.success("IBM watsonx connection successful! Your API key is valid.");
                    })
                    .catch(function (oErr) {
                        MessageBox.error("Connection failed: " + oErr.message);
                    });
            });
        }
    });
});
