/**
 * AIService.js
 * Handles all communication with IBM watsonx AI (granite model).
 * Sends dataset metadata + user prompt and returns structured JSON recommendations.
 *
 * Security: API key is NEVER hardcoded. It must be entered by the user at runtime
 * via the Settings dialog and is stored only in the in-memory JSONModel.
 * It is never persisted to localStorage, sessionStorage, or any file.
 */
sap.ui.define([
    "ai/dashboard/utils/PromptBuilder",
    "ai/dashboard/utils/ResponseParser"
], function (PromptBuilder, ResponseParser) {
    "use strict";

    /* Watsonx text generation endpoint template */
    var WATSONX_URL_TPL = "{endpoint}/ml/v1/text/generation?version=2023-05-29";

    /* Request timeout in milliseconds */
    var REQUEST_TIMEOUT_MS = 90000;

    /**
     * @namespace ai.dashboard.service
     * @class AIService
     */
    var AIService = {

        /**
         * Main entry point: analyse a dataset and return dashboard recommendations.
         *
         * @param {Object} oDataset - output of ExcelParser.parseFile()
         * @param {string} sUserPrompt - free-text prompt from the user
         * @param {Object} oSettings - {apiKey, endpoint, modelId, projectId, maxTokens, temperature}
         * @returns {Promise<Object>} AI analysis result
         */
        analyzeDataset: function (oDataset, sUserPrompt, oSettings) {
            var sPrompt = PromptBuilder.buildAnalysisPrompt(oDataset, sUserPrompt);

            return AIService._callWatsonx(sPrompt, oSettings)
                .then(function (sRawResponse) {
                    return ResponseParser.parseAnalysisResponse(sRawResponse);
                });
        },

        /**
         * Internal: makes the actual HTTPS POST to the watsonx API.
         * Uses XMLHttpRequest wrapped in a Promise so it works without fetch polyfills.
         *
         * @param {string} sPrompt - fully assembled prompt string
         * @param {Object} oSettings - watsonx connection settings
         * @returns {Promise<string>} raw text response from the model
         * @private
         */
        _callWatsonx: function (sPrompt, oSettings) {
            return new Promise(function (resolve, reject) {
                if (!oSettings || !oSettings.apiKey) {
                    reject(new Error("IBM watsonx API key is not configured. Please open Settings and enter your API key."));
                    return;
                }

                if (!oSettings.endpoint) {
                    reject(new Error("IBM watsonx endpoint is not configured."));
                    return;
                }

                var sUrl = WATSONX_URL_TPL.replace("{endpoint}", oSettings.endpoint.replace(/\/$/, ""));

                var oPayload = {
                    model_id: oSettings.modelId || "ibm/granite-13b-instruct-v2",
                    input: sPrompt,
                    parameters: {
                        decoding_method: "greedy",
                        max_new_tokens: oSettings.maxTokens || 2048,
                        min_new_tokens: 50,
                        temperature: oSettings.temperature || 0.3,
                        repetition_penalty: 1.05,
                        stop_sequences: ["```"]
                    },
                    project_id: oSettings.projectId || undefined
                };

                // Remove undefined project_id to keep payload clean
                if (!oPayload.project_id) {
                    delete oPayload.project_id;
                }

                var oXhr = new XMLHttpRequest();
                var bDone = false;

                // Timeout guard
                var nTimer = setTimeout(function () {
                    if (!bDone) {
                        bDone = true;
                        oXhr.abort();
                        reject(new Error("IBM watsonx request timed out after " + (REQUEST_TIMEOUT_MS / 1000) + " seconds."));
                    }
                }, REQUEST_TIMEOUT_MS);

                oXhr.open("POST", sUrl, true);
                oXhr.setRequestHeader("Content-Type", "application/json");
                oXhr.setRequestHeader("Authorization", "Bearer " + oSettings.apiKey);
                oXhr.setRequestHeader("Accept", "application/json");

                oXhr.onreadystatechange = function () {
                    if (oXhr.readyState !== 4) { return; }
                    clearTimeout(nTimer);
                    if (bDone) { return; }
                    bDone = true;

                    if (oXhr.status >= 200 && oXhr.status < 300) {
                        try {
                            var oResponse = JSON.parse(oXhr.responseText);
                            var sText = (oResponse.results && oResponse.results[0] && oResponse.results[0].generated_text)
                                ? oResponse.results[0].generated_text
                                : "";
                            if (!sText) {
                                reject(new Error("IBM watsonx returned an empty response. Please try again."));
                            } else {
                                resolve(sText);
                            }
                        } catch (e) {
                            reject(new Error("Failed to parse IBM watsonx response: " + e.message));
                        }
                    } else {
                        var sError = "IBM watsonx API error " + oXhr.status;
                        try {
                            var oErr = JSON.parse(oXhr.responseText);
                            if (oErr.errors && oErr.errors[0]) {
                                sError += ": " + (oErr.errors[0].message || JSON.stringify(oErr.errors[0]));
                            } else if (oErr.message) {
                                sError += ": " + oErr.message;
                            }
                        } catch (e) { /* ignore parse error on error body */ }
                        reject(new Error(sError));
                    }
                };

                oXhr.onerror = function () {
                    clearTimeout(nTimer);
                    if (!bDone) {
                        bDone = true;
                        reject(new Error("Network error reaching IBM watsonx. Check your internet connection and CORS policy."));
                    }
                };

                oXhr.send(JSON.stringify(oPayload));
            });
        },

        /**
         * Generates a MOCK analysis response when no API key is configured.
         * Useful for demos and offline testing.
         * @param {Object} oDataset
         * @param {string} sUserPrompt
         * @returns {Promise<Object>}
         */
        generateMockAnalysis: function (oDataset, sUserPrompt) {
            return new Promise(function (resolve) {
                setTimeout(function () {
                    var sTitle = sUserPrompt
                        ? sUserPrompt.replace(/build|create|show|generate/gi, "").trim()
                        : (oDataset.fileName || "Business Dashboard");

                    // Intelligently pick columns for KPIs
                    var aNumCols = oDataset.numericColumns || [];
                    var aTextCols = oDataset.textColumns || [];
                    var aDateCols = oDataset.dateColumns || [];

                    var aKpis = aNumCols.slice(0, 4).map(function (col, i) {
                        var aRows = oDataset.rows || [];
                        var nSum = aRows.reduce(function (acc, row) {
                            return acc + (parseFloat(String(row[col]).replace(/,/g, "")) || 0);
                        }, 0);
                        var nAvg = aRows.length ? (nSum / aRows.length) : 0;
                        var gradients = ["gradientBlue", "gradientPurple", "gradientGreen", "gradientRed"];
                        var trends = ["Up", "Down", "Up", "None"];
                        return {
                            id: "kpi_" + i,
                            title: col,
                            value: nSum > 1000 ? (nSum / 1000).toFixed(1) + "K" : nSum.toFixed(0),
                            unit: "",
                            trend: trends[i % 4],
                            trendValue: (Math.random() * 15 + 2).toFixed(1) + "%",
                            description: "Total " + col + " from dataset",
                            gradient: gradients[i % 4]
                        };
                    });

                    // If no numeric columns, create placeholder KPIs
                    if (aKpis.length === 0) {
                        aKpis = [
                            { id: "kpi_0", title: "Total Records", value: String(oDataset.rowCount), unit: "", trend: "None", trendValue: "", description: "Total rows in dataset", gradient: "gradientBlue" },
                            { id: "kpi_1", title: "Total Columns", value: String(oDataset.columnCount), unit: "", trend: "None", trendValue: "", description: "Total columns in dataset", gradient: "gradientPurple" }
                        ];
                    }

                    var aCharts = [];
                    if (aNumCols.length >= 1 && aTextCols.length >= 1) {
                        aCharts.push({ id: "chart_0", type: "bar", title: aTextCols[0] + " by " + aNumCols[0], xAxis: aTextCols[0], yAxis: aNumCols[0], description: "Distribution analysis" });
                    }
                    if (aNumCols.length >= 2 && aTextCols.length >= 1) {
                        aCharts.push({ id: "chart_1", type: "line", title: aNumCols[0] + " Trend", xAxis: aDateCols[0] || aTextCols[0], yAxis: aNumCols[0], description: "Trend over time" });
                    }
                    if (aTextCols.length >= 1 && aNumCols.length >= 1) {
                        aCharts.push({ id: "chart_2", type: "donut", title: aNumCols[0] + " by " + aTextCols[0], dimension: aTextCols[0], measure: aNumCols[0], description: "Proportional breakdown" });
                    }
                    if (aNumCols.length >= 2) {
                        aCharts.push({ id: "chart_3", type: "column", title: "Comparison: " + aNumCols[0] + " vs " + (aNumCols[1] || aNumCols[0]), xAxis: aTextCols[0] || aNumCols[0], measures: aNumCols.slice(0, 2), description: "Side-by-side comparison" });
                    }

                    var aFilters = [];
                    aTextCols.slice(0, 3).forEach(function (col, i) {
                        aFilters.push({ id: "filter_" + i, column: col, type: "select", label: "Filter by " + col });
                    });
                    if (aDateCols.length > 0) {
                        aFilters.push({ id: "filter_date", column: aDateCols[0], type: "dateRange", label: "Date Range" });
                    }

                    var aInsights = [
                        "Dataset contains " + oDataset.rowCount + " records across " + oDataset.columnCount + " dimensions.",
                        "Identified " + aNumCols.length + " numeric measure column(s): " + (aNumCols.slice(0, 3).join(", ") || "none") + ".",
                        "Identified " + aDateCols.length + " date/time column(s) suitable for trend analysis.",
                        "Text columns with high cardinality are ideal for dimension-based grouping.",
                        "Consider adding drill-down filters on " + (aTextCols[0] || "categorical") + " for deeper analysis."
                    ];

                    resolve({
                        title: sTitle || "Business Dashboard",
                        description: "AI-generated dashboard based on your dataset",
                        kpis: aKpis,
                        charts: aCharts,
                        filters: aFilters,
                        insights: aInsights,
                        tableColumns: oDataset.headers ? oDataset.headers.slice(0, 8) : [],
                        confidenceScore: Math.floor(Math.random() * 25 + 72),
                        confidenceLevel: "High",
                        generatedAt: new Date().toISOString(),
                        isMock: true
                    });
                }, 2200);   // Simulate network latency
            });
        }
    };

    return AIService;
});
