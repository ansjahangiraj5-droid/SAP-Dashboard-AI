/**
 * Model factory — creates all global models used by the application.
 * Centralised here to keep Component.js clean.
 */
sap.ui.define([
    "sap/ui/model/json/JSONModel",
    "sap/ui/Device"
], function (JSONModel, Device) {
    "use strict";

    return {

        /**
         * Creates a JSONModel seeded from Device API so views can
         * react to screen-size changes declaratively.
         * @returns {sap.ui.model.json.JSONModel}
         */
        createDeviceModel: function () {
            var oModel = new JSONModel(Device);
            oModel.setDefaultBindingMode("OneWay");
            return oModel;
        },

        /**
         * Creates the application-state model shared across all views.
         * All transient UI state lives here so controllers stay thin.
         * @returns {sap.ui.model.json.JSONModel}
         */
        createAppStateModel: function () {
            return new JSONModel({
                /* ── Upload state ─────────────────────────────────── */
                uploadedFileName: "",
                uploadedFileSize: 0,
                fileUploaded: false,
                userPrompt: "",

                /* ── Parsed dataset ───────────────────────────────── */
                dataset: {
                    headers: [],
                    rows: [],
                    rowCount: 0,
                    columnCount: 0,
                    numericColumns: [],
                    dateColumns: [],
                    textColumns: [],
                    sampleRows: []        // first 10 rows for preview
                },

                /* ── AI analysis result ───────────────────────────── */
                analysis: {
                    title: "",
                    description: "",
                    kpis: [],
                    charts: [],
                    filters: [],
                    insights: [],
                    tableColumns: [],
                    confidenceScore: 0,
                    confidenceLevel: "",
                    generatedAt: ""
                },

                /* ── Dashboard configuration ──────────────────────── */
                dashboard: {
                    title: "",
                    widgets: [],
                    layout: [],
                    filters: [],
                    generated: false
                },

                /* ── UI flags ─────────────────────────────────────── */
                busy: false,
                busyMessage: "",
                showAnalysis: false,
                showDashboard: false,

                /* ── watsonx settings ─────────────────────────────── */
                watsonx: {
                    apiKey: "",
                    endpoint: "https://us-south.ml.cloud.ibm.com",
                    modelId: "ibm/granite-13b-instruct-v2",
                    projectId: "",
                    maxTokens: 2048,
                    temperature: 0.3
                }
            });
        }
    };
});
