/**
 * ResponseParser.js
 * Extracts and normalises the JSON dashboard configuration
 * from a raw watsonx text response. Handles common model artefacts
 * such as leading/trailing text, markdown code fences, and partial JSON.
 */
sap.ui.define([], function () {
    "use strict";

    var ResponseParser = {

        /**
         * Parse the raw text from watsonx into a structured analysis object.
         * @param {string} sRawText
         * @returns {Object} normalised analysis
         */
        parseAnalysisResponse: function (sRawText) {
            var sCleaned = ResponseParser._extractJSON(sRawText);
            var oRaw;

            try {
                oRaw = JSON.parse(sCleaned);
            } catch (e) {
                // Last resort: try to repair common issues
                try {
                    oRaw = JSON.parse(ResponseParser._repairJSON(sCleaned));
                } catch (e2) {
                    throw new Error("Could not parse AI response as JSON. Raw response: " + sRawText.substr(0, 300));
                }
            }

            return ResponseParser._normalise(oRaw);
        },

        /**
         * Extract the JSON portion from a possibly verbose response.
         * Handles markdown code blocks, prose before/after the JSON object.
         * @private
         */
        _extractJSON: function (sText) {
            if (!sText) { return "{}"; }

            // Remove markdown code fences
            sText = sText.replace(/```json\s*/gi, "").replace(/```\s*/g, "");

            // Find the first { and last } to extract JSON object
            var nStart = sText.indexOf("{");
            var nEnd = sText.lastIndexOf("}");

            if (nStart === -1 || nEnd === -1 || nEnd < nStart) {
                // Try array
                nStart = sText.indexOf("[");
                nEnd = sText.lastIndexOf("]");
                if (nStart === -1 || nEnd === -1) {
                    return "{}";
                }
            }

            return sText.substring(nStart, nEnd + 1).trim();
        },

        /**
         * Attempt to repair truncated or malformed JSON.
         * Closes unclosed arrays and objects.
         * @private
         */
        _repairJSON: function (sText) {
            var sResult = sText.trim();
            // Count unclosed braces/brackets
            var nBrace = 0, nBracket = 0;
            var bInString = false;
            for (var i = 0; i < sResult.length; i++) {
                var c = sResult[i];
                if (c === '"' && (i === 0 || sResult[i - 1] !== "\\")) { bInString = !bInString; }
                if (!bInString) {
                    if (c === "{") { nBrace++; }
                    else if (c === "}") { nBrace--; }
                    else if (c === "[") { nBracket++; }
                    else if (c === "]") { nBracket--; }
                }
            }
            // Close any open structures
            for (var j = 0; j < nBracket; j++) { sResult += "]"; }
            for (var k = 0; k < nBrace; k++) { sResult += "}"; }
            return sResult;
        },

        /**
         * Normalise the parsed object against the expected schema,
         * filling in defaults for any missing fields.
         * @private
         */
        _normalise: function (oRaw) {
            if (!oRaw || typeof oRaw !== "object") {
                oRaw = {};
            }

            return {
                title: oRaw.title || "Business Dashboard",
                description: oRaw.description || "AI-generated dashboard",
                kpis: ResponseParser._normaliseKPIs(oRaw.kpis),
                charts: ResponseParser._normaliseCharts(oRaw.charts),
                filters: ResponseParser._normaliseFilters(oRaw.filters),
                insights: ResponseParser._normaliseInsights(oRaw.insights),
                tableColumns: Array.isArray(oRaw.tableColumns) ? oRaw.tableColumns : [],
                confidenceScore: Math.min(100, Math.max(0, parseInt(oRaw.confidenceScore) || 75)),
                confidenceLevel: ["High", "Medium", "Low"].includes(oRaw.confidenceLevel)
                    ? oRaw.confidenceLevel : "Medium",
                generatedAt: new Date().toISOString(),
                isMock: false
            };
        },

        /**
         * Normalise KPI array.
         * @private
         */
        _normaliseKPIs: function (aKpis) {
            if (!Array.isArray(aKpis)) { return []; }
            var gradients = ["gradientBlue", "gradientPurple", "gradientGreen", "gradientRed"];
            return aKpis.map(function (kpi, i) {
                return {
                    id: kpi.id || ("kpi_" + i),
                    title: String(kpi.title || "KPI " + (i + 1)),
                    value: String(kpi.value || "0"),
                    unit: String(kpi.unit || ""),
                    trend: ["Up", "Down", "None"].includes(kpi.trend) ? kpi.trend : "None",
                    trendValue: String(kpi.trendValue || ""),
                    description: String(kpi.description || ""),
                    gradient: gradients.includes(kpi.gradient) ? kpi.gradient : gradients[i % 4]
                };
            });
        },

        /**
         * Normalise chart array.
         * @private
         */
        _normaliseCharts: function (aCharts) {
            if (!Array.isArray(aCharts)) { return []; }
            var validTypes = ["bar", "line", "pie", "donut", "column", "scatter", "area", "combination"];
            return aCharts.map(function (chart, i) {
                return {
                    id: chart.id || ("chart_" + i),
                    type: validTypes.includes(String(chart.type).toLowerCase())
                        ? String(chart.type).toLowerCase() : "bar",
                    title: String(chart.title || "Chart " + (i + 1)),
                    xAxis: String(chart.xAxis || ""),
                    yAxis: String(chart.yAxis || ""),
                    dimension: String(chart.dimension || chart.xAxis || ""),
                    measure: String(chart.measure || chart.yAxis || ""),
                    measures: Array.isArray(chart.measures) ? chart.measures : [chart.yAxis || chart.measure || ""],
                    description: String(chart.description || "")
                };
            });
        },

        /**
         * Normalise filter array.
         * @private
         */
        _normaliseFilters: function (aFilters) {
            if (!Array.isArray(aFilters)) { return []; }
            return aFilters.map(function (f, i) {
                return {
                    id: f.id || ("filter_" + i),
                    column: String(f.column || ""),
                    type: String(f.type || "select"),
                    label: String(f.label || f.column || "Filter " + (i + 1))
                };
            });
        },

        /**
         * Normalise insights array — ensure all entries are strings.
         * @private
         */
        _normaliseInsights: function (aInsights) {
            if (!Array.isArray(aInsights)) { return []; }
            return aInsights.map(function (insight) {
                return typeof insight === "string" ? insight : JSON.stringify(insight);
            }).filter(function (s) { return s.length > 0; });
        }
    };

    return ResponseParser;
});
