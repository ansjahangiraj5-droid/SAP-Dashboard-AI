/**
 * Landing.controller.js
 * Controls the Landing page: file upload, dataset preview, prompt input,
 * and the "Generate Dashboard" action that calls AIService.
 */
sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/m/Column",
    "sap/m/Text",
    "sap/m/Label",
    "sap/m/ColumnListItem",
    "sap/m/Token",
    "sap/ui/model/json/JSONModel",
    "ai/dashboard/service/ExcelParser",
    "ai/dashboard/service/AIService"
], function (
    Controller, MessageToast, MessageBox,
    Column, Text, Label, ColumnListItem, Token,
    JSONModel, ExcelParser, AIService
) {
    "use strict";

    return Controller.extend("ai.dashboard.controller.Landing", {

        // ── Lifecycle ─────────────────────────────────────────────────

        onInit: function () {
            this._oRouter = this.getOwnerComponent().getRouter();
            // Wire up file input after view is rendered
            this.getView().addEventDelegate({
                onAfterRendering: this._setupFileInput.bind(this)
            });
        },

        // ── File Input Setup ─────────────────────────────────────────

        /**
         * Attach the hidden <input type='file'> and the drop zone
         * to their respective event listeners.
         * @private
         */
        _setupFileInput: function () {
            var oFileInput = document.getElementById("fileInput");
            if (!oFileInput || oFileInput._aiListenerAdded) { return; }

            // File selected via browse dialog
            oFileInput.addEventListener("change", this._onFileSelected.bind(this));
            oFileInput._aiListenerAdded = true;

            // Drop zone events
            var oDropZone = this.getView().byId("dropZone");
            if (oDropZone && oDropZone.getDomRef()) {
                var oDom = oDropZone.getDomRef();
                oDom.addEventListener("dragover", function (e) {
                    e.preventDefault();
                    oDom.classList.add("dragover");
                });
                oDom.addEventListener("dragleave", function () {
                    oDom.classList.remove("dragover");
                });
                oDom.addEventListener("drop", function (e) {
                    e.preventDefault();
                    oDom.classList.remove("dragover");
                    var oFile = e.dataTransfer.files[0];
                    if (oFile) { this._processFile(oFile); }
                }.bind(this));

                // Click on drop zone also opens file dialog
                oDom.addEventListener("click", function () {
                    document.getElementById("fileInput").click();
                });
            }
        },

        // ── Upload ────────────────────────────────────────────────────

        /** Triggered by the Upload button */
        onUploadPress: function () {
            var oInput = document.getElementById("fileInput");
            if (oInput) { oInput.click(); }
        },

        /** Native file input change event */
        _onFileSelected: function (oEvent) {
            var oFile = oEvent.target.files[0];
            if (oFile) { this._processFile(oFile); }
        },

        /**
         * Parse the selected file and update the appState model.
         * @param {File} oFile
         * @private
         */
        _processFile: function (oFile) {
            var oAppState = this.getOwnerComponent().getModel("appState");
            var oAppConfig = this.getOwnerComponent().getModel("app");

            // Validate file size
            var nMaxSize = (oAppConfig && oAppConfig.getProperty("/ui/maxFileSize")) || 10485760;
            if (oFile.size > nMaxSize) {
                MessageBox.error("File is too large. Maximum allowed size is " + (nMaxSize / 1048576).toFixed(0) + " MB.");
                return;
            }

            // Validate extension
            var sExt = oFile.name.split(".").pop().toLowerCase();
            if (!["xlsx", "xls", "csv"].includes(sExt)) {
                MessageBox.error("Unsupported file type. Please upload .xlsx, .xls, or .csv files.");
                return;
            }

            this._setBusy(true, "Parsing " + oFile.name + "…");

            ExcelParser.parseFile(oFile)
                .then(function (oDataset) {
                    // Update app state
                    oAppState.setProperty("/uploadedFileName", oFile.name);
                    oAppState.setProperty("/uploadedFileSize", oFile.size);
                    oAppState.setProperty("/fileUploaded", true);
                    oAppState.setProperty("/dataset", oDataset);

                    this._renderPreview(oDataset);

                    MessageToast.show("File parsed: " + oDataset.rowCount + " rows, " + oDataset.columnCount + " columns.");

                    if (oDataset.truncated) {
                        MessageToast.show("File has >200 rows. Using first 200 for AI analysis.", { duration: 5000 });
                    }
                }.bind(this))
                .catch(function (oErr) {
                    MessageBox.error("Failed to parse file: " + oErr.message);
                })
                .finally(function () {
                    this._setBusy(false);
                }.bind(this));
        },

        // ── Preview Table ─────────────────────────────────────────────

        /**
         * Render the dataset preview table and column type badges.
         * @param {Object} oDataset
         * @private
         */
        _renderPreview: function (oDataset) {
            var oTable = this.getView().byId("previewTable");
            var oTagsBox = this.getView().byId("columnTagsBox");

            // Clear existing content
            oTable.removeAllColumns();
            oTable.removeAllItems();
            oTagsBox.removeAllItems();

            if (!oDataset || !oDataset.headers || !oDataset.headers.length) { return; }

            // Column type badge colours
            var oTypeStyle = { numeric: "gradientBlue", date: "date", text: "text" };
            var oMeta = oDataset.columnMeta || {};

            // Build column type tags
            oDataset.headers.forEach(function (sCol) {
                var sMeta = oMeta[sCol] || {};
                var sType = sMeta.type || "text";
                var oToken = new Token({
                    text: sCol,
                    editable: false
                }).addStyleClass("aiTypeBadge " + sType);
                oTagsBox.addItem(oToken);
            });

            // Build table columns (limit to 8 for readability)
            var aDisplayCols = oDataset.headers.slice(0, 8);
            aDisplayCols.forEach(function (sCol) {
                oTable.addColumn(new Column({
                    header: new Label({ text: sCol }),
                    width: "auto",
                    minScreenWidth: "Tablet",
                    demandPopin: true,
                    popinDisplay: "Inline"
                }));
            });

            // Build JSONModel for preview rows
            // Sanitise keys for binding
            var aSafeRows = (oDataset.sampleRows || []).map(function (row) {
                var oSafe = {};
                aDisplayCols.forEach(function (col) {
                    var sSafeKey = col.replace(/[^a-zA-Z0-9_]/g, "_");
                    oSafe[sSafeKey] = row[col] !== undefined ? String(row[col]) : "";
                });
                return oSafe;
            });

            var oPreviewModel = new JSONModel({ rows: aSafeRows });
            oTable.setModel(oPreviewModel, "preview");

            var aCells = aDisplayCols.map(function (col) {
                var sSafeKey = col.replace(/[^a-zA-Z0-9_]/g, "_");
                return new Text({ text: "{preview>" + sSafeKey + "}" });
            });

            oTable.bindAggregation("items", {
                model: "preview",
                path: "/rows",
                template: new ColumnListItem({ cells: aCells })
            });
        },

        // ── Quick Prompts ─────────────────────────────────────────────

        onQuickPrompt: function (oEvent) {
            var sPrompt = oEvent.getSource().data("prompt");
            if (sPrompt) {
                var oAppState = this.getOwnerComponent().getModel("appState");
                oAppState.setProperty("/userPrompt", sPrompt);
                MessageToast.show("Prompt set — click Generate Dashboard to proceed.");
            }
        },

        // ── Generate Dashboard ────────────────────────────────────────

        /**
         * Orchestrate the full flow: validate → call AI → navigate to Analysis.
         */
        onGenerateDashboard: function () {
            var oAppState = this.getOwnerComponent().getModel("appState");
            var oDataset = oAppState.getProperty("/dataset");
            var sPrompt = oAppState.getProperty("/userPrompt");

            // Validate: at least a prompt OR a dataset is needed
            if (!oAppState.getProperty("/fileUploaded") && (!sPrompt || !sPrompt.trim())) {
                MessageBox.warning("Please upload a dataset or enter a dashboard description first.");
                return;
            }

            // If no file uploaded, create a minimal placeholder dataset from the prompt
            if (!oAppState.getProperty("/fileUploaded")) {
                oDataset = {
                    fileName: "prompt-based",
                    rowCount: 0,
                    columnCount: 0,
                    headers: [],
                    numericColumns: [],
                    dateColumns: [],
                    textColumns: [],
                    sampleRows: [],
                    rows: []
                };
                oAppState.setProperty("/dataset", oDataset);
            }

            var oSettings = oAppState.getProperty("/watsonx");
            var bHasApiKey = oSettings && oSettings.apiKey && oSettings.apiKey.trim() !== "";

            this._setBusy(true, bHasApiKey
                ? "Sending to IBM watsonx AI…"
                : "Running AI simulation (Demo mode)…");

            var oPromise;

            if (bHasApiKey) {
                oPromise = AIService.analyzeDataset(oDataset, sPrompt, oSettings);
            } else {
                oPromise = AIService.generateMockAnalysis(oDataset, sPrompt);
            }

            oPromise
                .then(function (oAnalysis) {
                    oAppState.setProperty("/analysis", oAnalysis);
                    oAppState.setProperty("/showAnalysis", true);
                    this._oRouter.navTo("Analysis");
                }.bind(this))
                .catch(function (oErr) {
                    MessageBox.error("AI Analysis failed: " + oErr.message + "\n\nYou can still proceed with Demo mode by removing your API key.");
                })
                .finally(function () {
                    this._setBusy(false);
                }.bind(this));
        },

        // ── Busy Helper ───────────────────────────────────────────────

        _setBusy: function (bBusy, sMessage) {
            var oAppState = this.getOwnerComponent().getModel("appState");
            oAppState.setProperty("/busy", bBusy);
            oAppState.setProperty("/busyMessage", sMessage || "");

            var oBusyDialog = this.getView().byId("busyDialog");
            if (oBusyDialog) {
                if (bBusy) { oBusyDialog.open(); }
                else { oBusyDialog.close(); }
            }
        }
    });
});
