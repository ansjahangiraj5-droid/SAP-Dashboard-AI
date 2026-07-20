/**
 * ChartRecommendation.js
 * Maps AI chart recommendations to SAPUI5 VizFrame configuration objects.
 * Transforms the raw data + chart spec into chart feeds, dimensions, and measures.
 */
sap.ui.define([], function () {
    "use strict";

    /* Map from generic AI type to VizFrame vizType */
    var CHART_TYPE_MAP = {
        "bar"         : "bar",
        "line"        : "line",
        "pie"         : "pie",
        "donut"       : "donut",
        "column"      : "column",
        "scatter"     : "scatter",
        "area"        : "stacked_area",
        "combination" : "combination",
        "default"     : "bar"
    };

    /* VizFrame colour palette (SAP Horizon compliant) */
    var CHART_COLORS = [
        "#5899DA", "#E8743B", "#19A979", "#ED4A7B",
        "#945ECF", "#13A4B4", "#525DF4", "#BF399E"
    ];

    var ChartRecommendation = {

        /**
         * Convert an AI chart spec + dataset rows into a VizFrame-ready config.
         * @param {Object} oChartSpec - from AIService response
         * @param {Object[]} aRows - full dataset rows
         * @returns {Object} { vizType, feeds, chartData, options }
         */
        buildVizConfig: function (oChartSpec, aRows) {
            var sVizType = CHART_TYPE_MAP[oChartSpec.type] || CHART_TYPE_MAP.default;

            switch (oChartSpec.type) {
                case "pie":
                case "donut":
                    return ChartRecommendation._buildPieConfig(oChartSpec, aRows, sVizType);
                case "scatter":
                    return ChartRecommendation._buildScatterConfig(oChartSpec, aRows, sVizType);
                default:
                    return ChartRecommendation._buildXYConfig(oChartSpec, aRows, sVizType);
            }
        },

        /**
         * Build XY-axis chart config (bar, column, line, area).
         * @private
         */
        _buildXYConfig: function (oSpec, aRows, sVizType) {
            var sDim = oSpec.xAxis || oSpec.dimension;
            var aMeasures = Array.isArray(oSpec.measures) && oSpec.measures.length
                ? oSpec.measures : [oSpec.yAxis || oSpec.measure];

            // Aggregate: group by dimension, sum measures
            var oAgg = ChartRecommendation._aggregateByDimension(aRows, sDim, aMeasures);

            var aDataItems = Object.keys(oAgg).slice(0, 20).map(function (key) {
                var oItem = { dimension: key };
                aMeasures.forEach(function (m) {
                    oItem[m] = oAgg[key][m] || 0;
                });
                return oItem;
            });

            var feeds = [
                { uid: "categoryAxis", type: "Dimension", values: ["dimension"] },
                { uid: "valueAxis", type: "Measure", values: aMeasures }
            ];

            return {
                vizType: sVizType,
                feeds: feeds,
                data: aDataItems,
                dimensionKey: "dimension",
                measures: aMeasures,
                colors: CHART_COLORS
            };
        },

        /**
         * Build Pie/Donut config.
         * @private
         */
        _buildPieConfig: function (oSpec, aRows, sVizType) {
            var sDim = oSpec.dimension || oSpec.xAxis;
            var sMeasure = oSpec.measure || oSpec.yAxis;

            var oAgg = ChartRecommendation._aggregateByDimension(aRows, sDim, [sMeasure]);

            var aDataItems = Object.keys(oAgg).slice(0, 12).map(function (key) {
                return { dimension: key, measure: oAgg[key][sMeasure] || 0 };
            });

            return {
                vizType: sVizType,
                feeds: [
                    { uid: "color", type: "Dimension", values: ["dimension"] },
                    { uid: "size", type: "Measure", values: ["measure"] }
                ],
                data: aDataItems,
                dimensionKey: "dimension",
                measures: ["measure"],
                colors: CHART_COLORS
            };
        },

        /**
         * Build Scatter config.
         * @private
         */
        _buildScatterConfig: function (oSpec, aRows, sVizType) {
            var sX = oSpec.xAxis;
            var sY = oSpec.yAxis;

            var aDataItems = aRows.slice(0, 100).map(function (row, i) {
                return {
                    x: parseFloat(String(row[sX] || "0").replace(/,/g, "")) || 0,
                    y: parseFloat(String(row[sY] || "0").replace(/,/g, "")) || 0,
                    label: String(row[Object.keys(row)[0]] || i)
                };
            });

            return {
                vizType: sVizType,
                feeds: [
                    { uid: "valueAxis", type: "Measure", values: ["x"] },
                    { uid: "valueAxis2", type: "Measure", values: ["y"] }
                ],
                data: aDataItems,
                dimensionKey: "label",
                measures: ["x", "y"],
                colors: CHART_COLORS
            };
        },

        /**
         * Aggregate rows by a dimension column, summing numeric measures.
         * @private
         */
        _aggregateByDimension: function (aRows, sDimCol, aMeasureCols) {
            var oResult = {};

            aRows.forEach(function (row) {
                var sKey = String(row[sDimCol] || "(blank)").trim();
                if (!oResult[sKey]) {
                    oResult[sKey] = {};
                    aMeasureCols.forEach(function (m) { oResult[sKey][m] = 0; });
                }
                aMeasureCols.forEach(function (m) {
                    var nVal = parseFloat(String(row[m] || "0").replace(/,/g, ""));
                    if (!isNaN(nVal)) {
                        oResult[sKey][m] += nVal;
                    }
                });
            });

            return oResult;
        },

        /**
         * Return a VizFrame color palette for i items.
         * @param {number} nCount
         * @returns {string[]}
         */
        getColors: function (nCount) {
            var aResult = [];
            for (var i = 0; i < nCount; i++) {
                aResult.push(CHART_COLORS[i % CHART_COLORS.length]);
            }
            return aResult;
        }
    };

    return ChartRecommendation;
});
