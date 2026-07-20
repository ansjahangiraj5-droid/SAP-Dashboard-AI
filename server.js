/**
 * server.js — optional local development server
 * Serves the webapp directory on http://127.0.0.1:8080
 *
 * Usage: node server.js
 * Requires: Node.js 14+  (no external dependencies)
 */

"use strict";

const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = 8080;
const HOST = "127.0.0.1";   // localhost only — never 0.0.0.0
const ROOT = path.join(__dirname, "webapp");

const MIME_TYPES = {
    ".html"  : "text/html; charset=utf-8",
    ".js"    : "application/javascript; charset=utf-8",
    ".json"  : "application/json; charset=utf-8",
    ".css"   : "text/css; charset=utf-8",
    ".xml"   : "application/xml; charset=utf-8",
    ".csv"   : "text/csv; charset=utf-8",
    ".xlsx"  : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".png"   : "image/png",
    ".jpg"   : "image/jpeg",
    ".svg"   : "image/svg+xml",
    ".ico"   : "image/x-icon",
    ".properties" : "text/plain; charset=utf-8"
};

const server = http.createServer(function (req, res) {
    // Prevent path traversal attacks
    var sUrlPath = req.url.split("?")[0];
    var sNormalized = path.normalize(sUrlPath);

    // Default to index.html for root
    if (sNormalized === "/" || sNormalized === "") {
        sNormalized = "/index.html";
    }

    var sFilePath = path.join(ROOT, sNormalized);

    // Ensure the resolved path stays within ROOT
    if (!sFilePath.startsWith(ROOT)) {
        res.writeHead(403, { "Content-Type": "text/plain" });
        res.end("403 Forbidden");
        return;
    }

    fs.readFile(sFilePath, function (err, data) {
        if (err) {
            if (err.code === "ENOENT") {
                res.writeHead(404, { "Content-Type": "text/plain" });
                res.end("404 Not Found: " + sNormalized);
            } else {
                res.writeHead(500, { "Content-Type": "text/plain" });
                res.end("500 Internal Server Error");
            }
            return;
        }

        var sExt = path.extname(sFilePath).toLowerCase();
        var sMime = MIME_TYPES[sExt] || "application/octet-stream";

        res.writeHead(200, {
            "Content-Type": sMime,
            "Cache-Control": "no-cache",
            // Minimal security headers
            "X-Content-Type-Options": "nosniff",
            "X-Frame-Options": "SAMEORIGIN",
            "Referrer-Policy": "same-origin"
        });
        res.end(data);
    });
});

server.listen(PORT, HOST, function () {
    console.log("=================================================");
    console.log("  AI Smart Dashboard Builder — Dev Server");
    console.log("=================================================");
    console.log("  Server: http://" + HOST + ":" + PORT);
    console.log("  Root  : " + ROOT);
    console.log("-------------------------------------------------");
    console.log("  Open http://127.0.0.1:8080 in your browser");
    console.log("  Press Ctrl+C to stop");
    console.log("=================================================");
});

server.on("error", function (err) {
    if (err.code === "EADDRINUSE") {
        console.error("ERROR: Port " + PORT + " is already in use.");
        console.error("Try: kill $(lsof -t -i:" + PORT + ") or change PORT in server.js");
    } else {
        console.error("Server error:", err.message);
    }
    process.exit(1);
});
