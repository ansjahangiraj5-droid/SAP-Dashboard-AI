/**
 * ExcelParser.js
 * Parses .xlsx, .xls, and .csv files using the SheetJS (xlsx) library.
 * Returns a normalised dataset object consumed by AIService and DashboardBuilder.
 *
 * Dependencies: SheetJS must be loaded globally via index.html CDN tag.
 */
sap.ui.define([], function () {
    "use strict";

    /* Maximum rows sent to AI to keep token usage manageable */
    const MAX_ANALYSIS_ROWS = 200;
    const MAX_PREVIEW_ROWS = 10;

    /**
     * @namespace ai.dashboard.service
     * @class ExcelParser
     */
    var ExcelParser = {

        /**
         * Parse a File object (from a file input or drop event).
         * @param {File} oFile - the browser File object
         * @returns {Promise<Object>} normalised dataset
         */
        parseFile: function (oFile) {
            return new Promise(function (resolve, reject) {
                if (!oFile) {
                    reject(new Error("No file provided"));
                    return;
                }

                // Guard: SheetJS must be available
                if (typeof XLSX === "undefined") {
                    reject(new Error("SheetJS library is not loaded. Check CDN link in index.html."));
                    return;
                }

                var oReader = new FileReader();

                oReader.onload = function (e) {
                    try {
                        var oResult = ExcelParser._processBuffer(
                            e.target.result,
                            oFile.name
                        );
                        resolve(oResult);
                    } catch (err) {
                        reject(new Error("Failed to parse file: " + err.message));
                    }
                };

                oReader.onerror = function () {
                    reject(new Error("FileReader error while reading: " + oFile.name));
                };

                oReader.readAsArrayBuffer(oFile);
            });
        },

        /**
         * Core processing: converts ArrayBuffer → normalised dataset.
         * @param {ArrayBuffer} oBuffer
         * @param {string} sFileName
         * @returns {Object} dataset
         * @private
         */
        _processBuffer: function (oBuffer, sFileName) {
            var oWorkbook = XLSX.read(oBuffer, {
                type: "array",
                cellDates: true,
                cellStyles: false,
                sheetRows: MAX_ANALYSIS_ROWS + 1   // header + rows
            });

            // Use the first sheet
            var sFirstSheet = oWorkbook.SheetNames[0];
            var oSheet = oWorkbook.Sheets[sFirstSheet];

            // Convert to JSON — first row becomes headers
            var aRaw = XLSX.utils.sheet_to_json(oSheet, {
                header: 1,
                defval: "",
                raw: false,         // coerce everything to string first
                dateNF: "YYYY-MM-DD"
            });

            if (!aRaw || aRaw.length < 2) {
                throw new Error("File is empty or has no data rows.");
            }

            var aHeaders = aRaw[0].map(function (h) {
                return String(h).trim() || "Column_" + Math.random().toString(36).substr(2, 5);
            });

            var aDataRows = aRaw.slice(1).filter(function (row) {
                // Remove completely empty rows
                return row.some(function (cell) { return cell !== "" && cell !== null && cell !== undefined; });
            });

            // Limit rows
            var bTruncated = aDataRows.length > MAX_ANALYSIS_ROWS;
            if (bTruncated) {
                aDataRows = aDataRows.slice(0, MAX_ANALYSIS_ROWS);
            }

            // Convert row arrays → objects keyed by header
            var aObjects = aDataRows.map(function (row) {
                var oRow = {};
                aHeaders.forEach(function (header, idx) {
                    oRow[header] = row[idx] !== undefined ? row[idx] : "";
                });
                return oRow;
            });

            // Analyse column types
            var oColTypes = ExcelParser._detectColumnTypes(aHeaders, aObjects);

            return {
                fileName: sFileName,
                sheetName: sFirstSheet,
                headers: aHeaders,
                rows: aObjects,
                rowCount: aObjects.length,
                columnCount: aHeaders.length,
                numericColumns: oColTypes.numeric,
                dateColumns: oColTypes.date,
                textColumns: oColTypes.text,
                sampleRows: aObjects.slice(0, MAX_PREVIEW_ROWS),
                truncated: bTruncated,
                columnMeta: oColTypes.meta    // {colName: {type, sample, uniqueCount}}
            };
        },

        /**
         * Heuristically detect each column's data type.
         * Uses the first up-to-50 non-empty values to determine the majority type.
         * @param {string[]} aHeaders
         * @param {Object[]} aRows
         * @returns {{numeric: string[], date: string[], text: string[], meta: Object}}
         * @private
         */
        _detectColumnTypes: function (aHeaders, aRows) {
            var numeric = [], date = [], text = [];
            var meta = {};

            var oDatePattern = /^\d{4}-\d{2}-\d{2}|^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/;
            var oNumPattern = /^-?[\d,]+\.?\d*$/;

            aHeaders.forEach(function (col) {
                var aSample = aRows
                    .map(function (r) { return String(r[col] || "").trim(); })
                    .filter(function (v) { return v !== ""; })
                    .slice(0, 50);

                if (aSample.length === 0) {
                    text.push(col);
                    meta[col] = { type: "text", sample: [], uniqueCount: 0 };
                    return;
                }

                var numCount = aSample.filter(function (v) {
                    return oNumPattern.test(v.replace(/,/g, ""));
                }).length;

                var dateCount = aSample.filter(function (v) {
                    return oDatePattern.test(v);
                }).length;

                var ratio = numCount / aSample.length;
                var dateRatio = dateCount / aSample.length;

                var uniqueVals = [...new Set(aSample)];

                if (dateRatio >= 0.6) {
                    date.push(col);
                    meta[col] = { type: "date", sample: aSample.slice(0, 5), uniqueCount: uniqueVals.length };
                } else if (ratio >= 0.7) {
                    numeric.push(col);
                    meta[col] = { type: "numeric", sample: aSample.slice(0, 5), uniqueCount: uniqueVals.length };
                } else {
                    text.push(col);
                    meta[col] = { type: "text", sample: aSample.slice(0, 5), uniqueCount: uniqueVals.length };
                }
            });

            return { numeric: numeric, date: date, text: text, meta: meta };
        }
    };

    return ExcelParser;
});
