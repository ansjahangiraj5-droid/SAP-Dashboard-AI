/**
 * DashboardBuilder.js
 * Dynamically constructs SAPUI5 controls (tiles, charts, table, filters)
 * from the AI analysis JSON and renders them into a given container.
 *
 * All controls are created programmatically — no XML fragment required —
 * so the dashboard can be fully data-driven from AI output.
 */
sap.ui.define([
    "sap/m/GenericTile",
    "sap/m/TileContent",
    "sap/m/NumericContent",
    "sap/m/Text",
    "sap/m/Label",
    "sap/m/VBox",
    "sap/m/HBox",
    "sap/m/FlexItemData",
    "sap/m/MessageStrip",
    "sap/m/Table",
    "sap/m/Column",
    "sap/m/ColumnListItem",
    "sap/m/ObjectStatus",
    "sap/ui/layout/cssgrid/CSSGrid",
    "sap/f/Card",
    "sap/f/cards/Header",
    "sap/viz/ui5/controls/VizFrame",
    "sap/viz/ui5/controls/common/feeds/FeedItem",
    "sap/viz/ui5/data/FlattenedDataset",
    "sap/viz/ui5/data/DimensionDefinition",
    "sap/viz/ui5/data/MeasureDefinition",
    "sap/ui/model/json/JSONModel",
    "ai/dashboard/service/ChartRecommendation"
], function (
    GenericTile, TileContent, NumericContent, Text, Label, VBox, HBox,
    FlexItemData, MessageStrip, Table, Column, ColumnListItem, ObjectStatus,
    CSSGrid, FCard, FCardHeader, VizFrame, FeedItem, FlattenedDataset,
    DimensionDefinition, MeasureDefinition, JSONModel, ChartRecommendation
) {
    "use strict";

    var DashboardBuilder = {

        /**
         * Build and return an array of SAPUI5 controls representing the full dashboard.
         * @param {Object} oAnalysis - from AIService / ResponseParser
         * @param {Object} oDataset  - from ExcelParser
         * @returns {sap.ui.core.Control[]} array of controls ready to add to a container
         */
        buildDashboard: function (oAnalysis, oDataset) {
            var aControls = [];

            // ── 1. AI Insights Message Strip ────────────────────────
            if (oAnalysis.isMock) {
                aControls.push(new MessageStrip({
                    text: "Demo mode: IBM watsonx API key not configured. Showing AI-simulated recommendations. Open Settings to add your API key.",
                    type: "Warning",
                    showIcon: true,
                    showCloseButton: true
                }).addStyleClass("sapUiSmallMarginBottom"));
            }

            // ── 2. KPI Tiles Row ─────────────────────────────────────
            if (oAnalysis.kpis && oAnalysis.kpis.length > 0) {
                var oKpiSection = DashboardBuilder._buildKPISection(oAnalysis.kpis);
                aControls.push(oKpiSection);
            }

            // ── 3. Charts Grid ───────────────────────────────────────
            if (oAnalysis.charts && oAnalysis.charts.length > 0) {
                var oChartsSection = DashboardBuilder._buildChartsSection(oAnalysis.charts, oDataset);
                aControls.push(oChartsSection);
            }

            // ── 4. Data Table ─────────────────────────────────────────
            if (oAnalysis.tableColumns && oAnalysis.tableColumns.length > 0) {
                var oTableSection = DashboardBuilder._buildTableSection(oAnalysis.tableColumns, oDataset);
                aControls.push(oTableSection);
            }

            // ── 5. Insights Panel ────────────────────────────────────
            if (oAnalysis.insights && oAnalysis.insights.length > 0) {
                var oInsightsSection = DashboardBuilder._buildInsightsSection(oAnalysis.insights);
                aControls.push(oInsightsSection);
            }

            return aControls;
        },

        // ─────────────────────────────────────────────────────────────
        // KPI SECTION
        // ─────────────────────────────────────────────────────────────

        /**
         * Build a responsive row of GenericTile KPI cards.
         * @private
         */
        _buildKPISection: function (aKpis) {
            var oWrapper = new VBox({
                width: "100%"
            }).addStyleClass("sapUiSmallMarginBottom");

            var oTitle = new Text({
                text: "Key Performance Indicators"
            }).addStyleClass("aiSectionHeader sapUiSmallMarginBottom");
            oWrapper.addItem(oTitle);

            var oGrid = new HBox({
                wrap: "Wrap",
                justifyContent: "Start",
                alignItems: "Start"
            });

            aKpis.forEach(function (oKpi) {
                var oTrendIcon = "";
                if (oKpi.trend === "Up") { oTrendIcon = "↑ "; }
                else if (oKpi.trend === "Down") { oTrendIcon = "↓ "; }

                var oTile = new GenericTile({
                    header: oKpi.title,
                    subheader: oKpi.description,
                    frameType: "TwoByOne",
                    tileContent: [
                        new TileContent({
                            unit: oKpi.unit || "",
                            footer: oKpi.trendValue ? (oTrendIcon + oKpi.trendValue) : "",
                            content: new NumericContent({
                                value: oKpi.value,
                                scale: "",
                                indicator: oKpi.trend === "Up" ? "Up" :
                                           oKpi.trend === "Down" ? "Down" : "None",
                                valueColor: oKpi.trend === "Up" ? "Good" :
                                            oKpi.trend === "Down" ? "Critical" : "Neutral",
                                withMargin: false,
                                truncateValueTo: 8
                            })
                        })
                    ]
                }).addStyleClass("aiKpiTile " + (oKpi.gradient || "gradientBlue"))
                  .addStyleClass("sapUiSmallMarginEnd sapUiSmallMarginBottom");

                // Responsive sizing via layout data
                oTile.setLayoutData(new FlexItemData({
                    minWidth: "200px",
                    growFactor: 1
                }));

                oGrid.addItem(oTile);
            });

            oWrapper.addItem(oGrid);
            return oWrapper;
        },

        // ─────────────────────────────────────────────────────────────
        // CHARTS SECTION
        // ─────────────────────────────────────────────────────────────

        /**
         * Build a grid of VizFrame chart cards.
         * @private
         */
        _buildChartsSection: function (aCharts, oDataset) {
            var oWrapper = new VBox({ width: "100%" })
                .addStyleClass("sapUiSmallMarginBottom");

            var oTitle = new Text({ text: "Charts & Visualisations" })
                .addStyleClass("aiSectionHeader sapUiSmallMarginBottom");
            oWrapper.addItem(oTitle);

            var oGrid = new HBox({
                wrap: "Wrap",
                justifyContent: "Start",
                alignItems: "Start"
            });

            aCharts.forEach(function (oChartSpec) {
                var oCard = DashboardBuilder._buildSingleChart(oChartSpec, oDataset);
                if (oCard) {
                    oCard.setLayoutData(new FlexItemData({ minWidth: "380px", growFactor: 1 }));
                    oCard.addStyleClass("sapUiSmallMarginEnd sapUiSmallMarginBottom");
                    oGrid.addItem(oCard);
                }
            });

            oWrapper.addItem(oGrid);
            return oWrapper;
        },

        /**
         * Build a single VizFrame inside a card wrapper.
         * @private
         */
        _buildSingleChart: function (oChartSpec, oDataset) {
            try {
                var oVizConfig = ChartRecommendation.buildVizConfig(oChartSpec, oDataset.rows || []);
                if (!oVizConfig || !oVizConfig.data || oVizConfig.data.length === 0) {
                    return DashboardBuilder._buildNoDataCard(oChartSpec.title);
                }

                // Build JSONModel for chart
                var oModel = new JSONModel({ data: oVizConfig.data });

                // Build dimensions and measures
                var aDimensions = [new DimensionDefinition({
                    name: "dimension",
                    value: "{dimension}"
                })];

                var aMeasures = oVizConfig.measures.map(function (m) {
                    return new MeasureDefinition({ name: m, value: "{" + m + "}" });
                });

                var oDataset = new FlattenedDataset({
                    dimensions: aDimensions,
                    measures: aMeasures,
                    data: { path: "/data" }
                });

                // Build feed items
                var aFeeds = oVizConfig.feeds.map(function (feed) {
                    return new FeedItem({
                        uid: feed.uid,
                        type: feed.type,
                        values: feed.values
                    });
                });

                var oViz = new VizFrame({
                    vizType: oVizConfig.vizType,
                    dataset: oDataset,
                    feeds: aFeeds,
                    width: "100%",
                    height: "300px",
                    vizProperties: {
                        title: { visible: false },
                        plotArea: {
                            colorPalette: oVizConfig.colors,
                            dataLabel: { visible: false }
                        },
                        categoryAxis: { title: { visible: false } },
                        valueAxis: { title: { visible: false } },
                        legend: { visible: true }
                    }
                });

                oViz.setModel(oModel);

                // Wrap in a styled VBox card
                var oCard = new VBox({
                    width: "100%",
                    items: [
                        new Text({ text: oChartSpec.title }).addStyleClass("sapUiSmallMarginBegin sapUiSmallMarginTop sapMTitle"),
                        new Text({ text: oChartSpec.description }).addStyleClass("sapUiSmallMarginBegin sapUiTinyMarginBottom sapUiSmallText"),
                        oViz
                    ]
                }).addStyleClass("aiChartContainer");

                return oCard;

            } catch (e) {
                return DashboardBuilder._buildNoDataCard(oChartSpec.title + " (Error: " + e.message + ")");
            }
        },

        /**
         * Build a placeholder card when chart data is unavailable.
         * @private
         */
        _buildNoDataCard: function (sTitle) {
            return new VBox({
                width: "100%",
                height: "200px",
                justifyContent: "Center",
                alignItems: "Center",
                items: [
                    new Text({ text: sTitle }).addStyleClass("sapMTitle sapUiSmallMarginBottom"),
                    new Text({ text: "No data available for this chart" }).addStyleClass("sapUiSmallText")
                ]
            }).addStyleClass("aiChartContainer");
        },

        // ─────────────────────────────────────────────────────────────
        // TABLE SECTION
        // ─────────────────────────────────────────────────────────────

        /**
         * Build a scrollable sap.m.Table with the dataset rows.
         * @private
         */
        _buildTableSection: function (aTableColumns, oDataset) {
            var oWrapper = new VBox({ width: "100%" })
                .addStyleClass("sapUiSmallMarginBottom");

            var oTitle = new Text({ text: "Data Table — " + oDataset.fileName })
                .addStyleClass("aiSectionHeader sapUiSmallMarginBottom");
            oWrapper.addItem(oTitle);

            // Build columns
            var aColumns = aTableColumns.map(function (col) {
                return new Column({
                    header: new Label({ text: col }),
                    width: "auto",
                    minScreenWidth: "Tablet",
                    demandPopin: true,
                    popinDisplay: "Inline"
                });
            });

            // Build rows
            var aCells = aTableColumns.map(function (col) {
                return new Text({ text: "{" + col.replace(/[^a-zA-Z0-9_]/g, "_") + "}" });
            });

            var oTable = new Table({
                columns: aColumns,
                growing: true,
                growingThreshold: 20,
                growingScrollToLoad: false,
                alternateRowColors: true,
                sticky: ["ColumnHeaders"],
                noDataText: "No data available"
            }).addStyleClass("aiPreviewTable");

            // Sanitise row keys for binding
            var aRows = (oDataset.rows || []).slice(0, 500).map(function (row) {
                var oSafe = {};
                Object.keys(row).forEach(function (key) {
                    oSafe[key.replace(/[^a-zA-Z0-9_]/g, "_")] = row[key];
                });
                return oSafe;
            });

            var oModel = new JSONModel({ rows: aRows });
            oTable.setModel(oModel);
            oTable.bindAggregation("items", {
                path: "/rows",
                template: new ColumnListItem({ cells: aCells })
            });

            var oCard = new VBox({
                width: "100%",
                items: [oTable]
            }).addStyleClass("aiChartContainer");

            oWrapper.addItem(oCard);
            return oWrapper;
        },

        // ─────────────────────────────────────────────────────────────
        // INSIGHTS SECTION
        // ─────────────────────────────────────────────────────────────

        /**
         * Build a styled list of AI-generated business insights.
         * @private
         */
        _buildInsightsSection: function (aInsights) {
            var oWrapper = new VBox({ width: "100%" });

            var oTitle = new Text({ text: "AI Business Insights" })
                .addStyleClass("aiSectionHeader sapUiSmallMarginBottom");
            oWrapper.addItem(oTitle);

            var oCard = new VBox({
                width: "100%"
            }).addStyleClass("aiChartContainer");

            aInsights.forEach(function (sInsight, i) {
                var icons = ["💡", "📊", "🎯", "📈", "🔍", "⚡"];
                var oItem = new HBox({
                    alignItems: "Start",
                    items: [
                        new Text({ text: icons[i % icons.length] }).addStyleClass("aiInsightIcon sapUiSmallMarginEnd"),
                        new Text({ text: sInsight, wrapping: true }).addStyleClass("sapUiSmallText")
                    ]
                }).addStyleClass("aiInsightItem");
                oCard.addItem(oItem);
            });

            oWrapper.addItem(oCard);
            return oWrapper;
        }
    };

    return DashboardBuilder;
});
