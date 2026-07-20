# AI Smart Dashboard Builder

> A production-quality **SAP Fiori / SAPUI5** application that uses **IBM watsonx AI** to automatically generate business dashboards from uploaded Excel or CSV files.

---

## 📸 Application Overview

| Page | Description |
|------|-------------|
| **Landing Page** | Upload Excel/CSV, enter a prompt, generate dashboard |
| **AI Analysis Page** | View KPI suggestions, chart recommendations, filters, confidence score |
| **Dashboard Page** | Dynamically rendered tiles, charts, tables, and insights |

---

## 🚀 Quick Start (3 Steps)

### Prerequisites
- **Node.js** 14 or higher (only for the local server)
- **Modern browser**: Chrome 100+, Edge 100+, Firefox 100+, Safari 16+
- **Internet access** (to load SAPUI5 from CDN and call IBM watsonx)

### Step 1 — Install (no npm install needed)
```bash
# Clone or copy this project to your machine
# No package.json dependencies — everything loads from CDN
```

### Step 2 — Start the local server
```bash
# From the project root (where server.js lives)
node server.js
```
You should see:
```
Server: http://127.0.0.1:8080
```

### Step 3 — Open in browser
```
http://127.0.0.1:8080
```

---

## 🔑 IBM watsonx AI Setup (Optional)

Without an API key, the app runs in **Demo Mode** — a built-in AI simulator generates realistic recommendations.

To enable real IBM watsonx AI:

1. Log in to [IBM watsonx.ai](https://dataplatform.cloud.ibm.com/)
2. Generate an **IAM API Key** from your IBM Cloud account
3. Note your **Project ID** from the watsonx project settings
4. In the app, click **Settings** (gear icon in the top-right)
5. Enter:
   - **API Key** — your IAM token
   - **Endpoint** — `https://us-south.ml.cloud.ibm.com` (or your region)
   - **Project ID** — your watsonx project ID
   - **Model** — IBM Granite 13B Instruct v2 (recommended)

> **Security**: Your API key is stored **only in memory** (JavaScript variable). It is never written to disk, never persisted in localStorage, and is cleared when you close the browser tab.

---

## 📁 Project Structure

```
WatsonXSAP/
├── server.js                    # Local dev HTTP server (Node.js)
├── README.md
└── webapp/
    ├── index.html               # App entry point (SAP Horizon theme + SheetJS CDN)
    ├── Component.js             # SAPUI5 UIComponent
    ├── manifest.json            # App descriptor (routing, models, libs)
    │
    ├── controller/
    │   ├── App.controller.js    # Root: ShellBar, Settings dialog
    │   ├── Landing.controller.js    # Upload, parse, prompt, generate
    │   ├── Analysis.controller.js   # AI results display
    │   └── Dashboard.controller.js  # Dynamic dashboard rendering
    │
    ├── view/
    │   ├── App.xml              # Shell + NavContainer
    │   ├── Landing.xml          # Upload page
    │   ├── Analysis.xml         # AI results page
    │   ├── Dashboard.xml        # Dynamic dashboard page
    │   └── fragment/
    │       └── SettingsDialog.fragment.xml   # watsonx settings
    │
    ├── service/
    │   ├── AIService.js         # IBM watsonx API calls + mock fallback
    │   ├── ExcelParser.js       # SheetJS-based file parser
    │   ├── ChartRecommendation.js   # AI chart spec → VizFrame config
    │   ├── DashboardBuilder.js  # Programmatic SAPUI5 control builder
    │   └── ExportService.js     # JSON + CSV export/download
    │
    ├── utils/
    │   ├── PromptBuilder.js     # Constructs structured watsonx prompts
    │   └── ResponseParser.js    # Parses + normalises AI JSON response
    │
    ├── model/
    │   ├── models.js            # Model factory (device, appState)
    │   └── appModel.json        # Static app config defaults
    │
    ├── css/
    │   └── app.css              # SAP Horizon-compatible custom styles
    │
    ├── i18n/
    │   └── i18n.properties      # All UI text strings
    │
    └── mock/
        ├── sales_data.csv       # 30 rows — regional sales with revenue/profit
        ├── employee_data.csv    # 25 rows — HR attendance and performance
        ├── finance_data.csv     # 12 rows — monthly P&L and balance sheet
        └── warehouse_data.csv   # 20 rows — inventory and stock levels
```

---

## 📊 Sample Datasets

Four ready-to-use CSV files are included in `webapp/mock/`:

| File | Use For | Prompt Suggestion |
|------|---------|-------------------|
| `sales_data.csv` | Sales dashboard | "Build a sales performance dashboard with regional KPIs" |
| `employee_data.csv` | HR dashboard | "Show employee attendance and performance analytics" |
| `finance_data.csv` | Finance overview | "Create a financial overview with revenue and profit trends" |
| `warehouse_data.csv` | Warehouse KPIs | "Build a warehouse inventory KPI dashboard" |

---

## 🏗️ Architecture

```
User uploads file
       │
       ▼
ExcelParser.js (SheetJS)
  ─ Extracts headers, rows, column types
       │
       ▼
PromptBuilder.js
  ─ Assembles structured prompt for watsonx
       │
       ▼
AIService.js ──────► IBM watsonx granite-13b-instruct-v2
  ─ POST /ml/v1/text/generation
  ─ Returns JSON (kpis, charts, filters, insights)
       │
       ▼
ResponseParser.js
  ─ Extracts + normalises JSON from model output
       │
       ▼
Analysis Page (display recommendations)
       │
       ▼
DashboardBuilder.js + ChartRecommendation.js
  ─ Creates GenericTile, VizFrame, Table, Insights
       │
       ▼
Dashboard Page (live interactive dashboard)
       │
       ▼
ExportService.js
  ─ Download JSON analysis, config, CSV
```

---

## 🎨 UI Features

- **SAP Horizon Theme** via SAPUI5 1.120 CDN
- **ShellBar** with Settings button
- **Drag & Drop** file upload zone
- **Quick Prompts** (Sales, Warehouse, HR, Finance)
- **Column Type Detection** (Numeric / Date / Text badges)
- **Dataset Preview Table** with first 10 rows
- **Confidence Score** progress bar
- **KPI GenericTiles** with trend indicators
- **VizFrame Charts**: Bar, Line, Pie, Donut, Column, Scatter
- **Growing Table** with first 500 rows
- **AI Insights** panel with icons
- **Export**: Download AI Analysis JSON, Dashboard Config JSON, Dataset CSV
- **Responsive**: Desktop, Tablet, Mobile (SAP Fiori grid)

---

## 🔧 Alternative: VS Code Live Server

Instead of `node server.js`, you can use the **Live Server** VS Code extension:

1. Install the **Live Server** extension
2. Right-click `webapp/index.html` → **Open with Live Server**
3. It will open `http://127.0.0.1:5500/webapp/`

---

## 🛡️ Security Notes

- API key stored in memory only (JavaScript `JSONModel`), never persisted
- Local server binds only to `127.0.0.1` (never `0.0.0.0`)
- All CDN resources are pinned to specific versions (SAPUI5 1.120.17, SheetJS 0.20.3)
- No ABAP backend, no SAP BTP runtime, no cloud dependency required
- Input files are parsed client-side; raw bytes never leave the browser

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| Blank page on `index.html` direct open | Use `node server.js` or Live Server — direct file:// breaks SAPUI5 module loading |
| SheetJS not loaded error | Check CDN connectivity; SheetJS loads from `cdn.sheetjs.com` |
| CORS error calling watsonx | Expected when running locally — watsonx API supports CORS from browsers |
| Charts appear empty | Verify the dataset columns match the chart's xAxis/yAxis from AI output |
| Demo mode not showing charts | Try uploading one of the mock CSV files from `webapp/mock/` |

---

## 📋 Technology Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| SAPUI5 | 1.120.17 | UI framework (Horizon theme) |
| SAP Fiori | Design system | UX guidelines |
| SheetJS (xlsx) | 0.20.3 | Excel/CSV parsing |
| FileSaver.js | 2.0.5 | File download |
| IBM watsonx AI | Granite 13B | AI dashboard generation |
| Node.js | 14+ | Local development server |

---

## 📄 License

This project is intended for IBM internal use and demonstration purposes.
IBM watsonx usage is subject to IBM Cloud service terms.

---

*Built with IBM Bob — AI Smart Dashboard Builder v1.0.0*
