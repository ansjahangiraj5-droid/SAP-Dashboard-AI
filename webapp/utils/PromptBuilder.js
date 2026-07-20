/**
 * PromptBuilder.js
 * Constructs the structured prompt sent to IBM watsonx AI.
 * Keeps prompts deterministic, token-efficient, and JSON-output focused.
 */
sap.ui.define([], function () {
    "use strict";

    var PromptBuilder = {

        /**
         * Build the full analysis prompt from dataset metadata + user intent.
         * @param {Object} oDataset - parsed dataset from ExcelParser
         * @param {string} sUserPrompt - free-text from the user
         * @returns {string} complete prompt string
         */
        buildAnalysisPrompt: function (oDataset, sUserPrompt) {
            var sColSummary = PromptBuilder._buildColumnSummary(oDataset);
            var sSampleData = PromptBuilder._buildSampleData(oDataset);

            var sIntent = sUserPrompt
                ? ("User request: " + sUserPrompt.trim())
                : "No specific request provided. Suggest the most useful business dashboard based on the data.";

            var sPrompt = [
                "You are an expert SAP Fiori dashboard architect and business intelligence analyst.",
                "Analyze the following dataset and generate a complete dashboard configuration.",
                "",
                "=== DATASET INFORMATION ===",
                "File: " + (oDataset.fileName || "unknown"),
                "Total Rows: " + oDataset.rowCount,
                "Total Columns: " + oDataset.columnCount,
                "",
                "=== COLUMNS ===",
                sColSummary,
                "",
                "=== SAMPLE DATA (first 5 rows) ===",
                sSampleData,
                "",
                "=== USER INTENT ===",
                sIntent,
                "",
                "=== INSTRUCTIONS ===",
                "Respond with ONLY a valid JSON object — no explanation, no markdown, no code block markers.",
                "The JSON must match this exact schema:",
                "",
                JSON.stringify(PromptBuilder._getResponseSchema(), null, 2),
                "",
                "Rules:",
                "- title: short descriptive dashboard title (max 8 words)",
                "- kpis: array of 3-6 KPI objects using numeric columns",
                "- charts: array of 3-5 chart objects; choose types from: bar, line, pie, donut, column, scatter, area",
                "- filters: array of 2-4 filter objects using text or date columns",
                "- insights: array of 4-6 business insight strings (actionable, specific to the data)",
                "- tableColumns: array of column names to display in the data table (max 8)",
                "- confidenceScore: integer 1-100 representing how confident you are in the recommendations",
                "- confidenceLevel: one of 'High', 'Medium', 'Low'",
                "",
                "JSON response:"
            ].join("\n");

            return sPrompt;
        },

        /**
         * Build column summary string.
         * @private
         */
        _buildColumnSummary: function (oDataset) {
            var aLines = [];

            (oDataset.numericColumns || []).forEach(function (col) {
                aLines.push("  [NUMERIC] " + col);
            });
            (oDataset.dateColumns || []).forEach(function (col) {
                aLines.push("  [DATE]    " + col);
            });
            (oDataset.textColumns || []).forEach(function (col) {
                var nUnique = oDataset.columnMeta && oDataset.columnMeta[col]
                    ? oDataset.columnMeta[col].uniqueCount : "?";
                aLines.push("  [TEXT]    " + col + " (" + nUnique + " unique values)");
            });

            return aLines.join("\n");
        },

        /**
         * Build sample data table as a readable string.
         * @private
         */
        _buildSampleData: function (oDataset) {
            var aSample = (oDataset.sampleRows || []).slice(0, 5);
            var aHeaders = oDataset.headers || [];

            if (!aSample.length) { return "(no sample data)"; }

            var aLines = [aHeaders.join(" | ")];
            aLines.push(aHeaders.map(function () { return "---"; }).join(" | "));

            aSample.forEach(function (row) {
                var aVals = aHeaders.map(function (h) {
                    var v = String(row[h] || "");
                    return v.length > 20 ? v.substr(0, 17) + "..." : v;
                });
                aLines.push(aVals.join(" | "));
            });

            return aLines.join("\n");
        },

        /**
         * Return the expected response JSON schema (used in the prompt as a template).
         * @private
         */
        _getResponseSchema: function () {
            return {
                title: "Dashboard Title",
                description: "Brief description of the dashboard",
                kpis: [
                    {
                        id: "kpi_0",
                        title: "KPI Name",
                        value: "Aggregated or computed value",
                        unit: "optional unit like %, $, K",
                        trend: "Up | Down | None",
                        trendValue: "e.g. 12.5%",
                        description: "What this KPI measures",
                        gradient: "gradientBlue | gradientPurple | gradientGreen | gradientRed"
                    }
                ],
                charts: [
                    {
                        id: "chart_0",
                        type: "bar | line | pie | donut | column | scatter | area",
                        title: "Chart Title",
                        xAxis: "column name for X axis",
                        yAxis: "column name for Y axis",
                        dimension: "grouping column (for pie/donut)",
                        measure: "value column (for pie/donut)",
                        measures: ["col1", "col2"],
                        description: "What this chart shows"
                    }
                ],
                filters: [
                    {
                        id: "filter_0",
                        column: "column name",
                        type: "select | multiselect | dateRange | slider",
                        label: "Filter label"
                    }
                ],
                insights: [
                    "Business insight 1",
                    "Business insight 2"
                ],
                tableColumns: ["col1", "col2"],
                confidenceScore: 85,
                confidenceLevel: "High"
            };
        }
    };

    return PromptBuilder;
});
