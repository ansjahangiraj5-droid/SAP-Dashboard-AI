/**
 * ExportService.js
 * Handles all export operations:
 *   - Export AI Analysis as JSON
 *   - Export Dashboard Configuration JSON
 *   - Export Dataset Preview as CSV
 * Uses FileSaver.js (loaded via CDN in index.html).
 */
sap.ui.define([
    "sap/m/MessageToast"
], function (MessageToast) {
    "use strict";

    var ExportService = {

        /**
         * Download the AI analysis as a formatted JSON file.
         * @param {Object} oAnalysis - analysis object from AIService
         * @param {string} sFileName - optional custom filename
         */
        downloadAnalysis: function (oAnalysis, sFileName) {
            var sJson = JSON.stringify(oAnalysis, null, 2);
            var sName = (sFileName || "ai-analysis") + "_" + ExportService._timestamp() + ".json";
            ExportService._saveAsFile(sJson, sName, "application/json;charset=utf-8");
            MessageToast.show("AI Analysis downloaded: " + sName);
        },

        /**
         * Download the full dashboard configuration JSON.
         * @param {Object} oAnalysis - analysis object (used to build config)
         * @param {Object} oDataset - parsed dataset metadata
         * @param {string} sFileName - optional custom filename
         */
        downloadDashboardConfig: function (oAnalysis, oDataset, sFileName) {
            var oConfig = {
                _meta: {
                    generatedBy: "AI Smart Dashboard Builder",
                    generatedAt: new Date().toISOString(),
                    version: "1.0.0"
                },
                dashboard: {
                    title: oAnalysis.title,
                    description: oAnalysis.description,
                    confidenceScore: oAnalysis.confidenceScore,
                    confidenceLevel: oAnalysis.confidenceLevel
                },
                dataset: {
                    fileName: oDataset.fileName,
                    rowCount: oDataset.rowCount,
                    columnCount: oDataset.columnCount,
                    headers: oDataset.headers,
                    numericColumns: oDataset.numericColumns,
                    dateColumns: oDataset.dateColumns,
                    textColumns: oDataset.textColumns
                },
                kpis: oAnalysis.kpis,
                charts: oAnalysis.charts,
                filters: oAnalysis.filters,
                insights: oAnalysis.insights,
                tableColumns: oAnalysis.tableColumns
            };

            var sJson = JSON.stringify(oConfig, null, 2);
            var sName = (sFileName || "dashboard-config") + "_" + ExportService._timestamp() + ".json";
            ExportService._saveAsFile(sJson, sName, "application/json;charset=utf-8");
            MessageToast.show("Dashboard configuration downloaded: " + sName);
        },

        /**
         * Download the dataset preview as a CSV file.
         * @param {Object} oDataset - parsed dataset from ExcelParser
         */
        downloadDatasetCSV: function (oDataset) {
            var aRows = oDataset.rows || [];
            var aHeaders = oDataset.headers || [];

            if (aHeaders.length === 0 || aRows.length === 0) {
                MessageToast.show("No dataset available to export.");
                return;
            }

            var sCSV = ExportService._toCSV(aHeaders, aRows);
            var sName = (oDataset.fileName || "dataset") + "_export_" + ExportService._timestamp() + ".csv";
            ExportService._saveAsFile(sCSV, sName, "text/csv;charset=utf-8");
            MessageToast.show("Dataset CSV downloaded: " + sName);
        },

        /**
         * Convert headers + rows to CSV string.
         * @private
         */
        _toCSV: function (aHeaders, aRows) {
            var aLines = [];

            // Header row
            aLines.push(aHeaders.map(ExportService._csvCell).join(","));

            // Data rows
            aRows.forEach(function (row) {
                var aVals = aHeaders.map(function (h) {
                    return ExportService._csvCell(row[h] !== undefined ? String(row[h]) : "");
                });
                aLines.push(aVals.join(","));
            });

            return aLines.join("\r\n");
        },

        /**
         * Escape a single CSV cell value.
         * @private
         */
        _csvCell: function (sValue) {
            var s = String(sValue);
            if (s.includes(",") || s.includes('"') || s.includes("\n") || s.includes("\r")) {
                return '"' + s.replace(/"/g, '""') + '"';
            }
            return s;
        },

        /**
         * Trigger a browser file download.
         * Uses FileSaver.js if available, otherwise falls back to anchor trick.
         * @private
         */
        _saveAsFile: function (sContent, sFileName, sMimeType) {
            var oBlob = new Blob([sContent], { type: sMimeType });

            if (typeof saveAs !== "undefined") {
                // FileSaver.js
                saveAs(oBlob, sFileName);
            } else {
                // Fallback: anchor element trick
                var sUrl = URL.createObjectURL(oBlob);
                var oLink = document.createElement("a");
                oLink.href = sUrl;
                oLink.download = sFileName;
                document.body.appendChild(oLink);
                oLink.click();
                document.body.removeChild(oLink);
                URL.revokeObjectURL(sUrl);
            }
        },

        /**
         * Return a timestamp string suitable for filenames (no colons).
         * @private
         */
        _timestamp: function () {
            return new Date().toISOString().replace(/[:.]/g, "-").substring(0, 19);
        }
    };

    return ExportService;
});
