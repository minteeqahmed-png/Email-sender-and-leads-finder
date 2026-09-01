# 🚀 Gemini Email Automator

> **Next-Generation AI Cold Outreach & Smart Campaign Dispatch Suite**
> Powered by **Gemini 3.7 Flash**, Google Maps Places API lead discovery, D3.js real-time telemetry, and resilient anti-spam pacing.

---

## 🌟 Highlights & Key Features

- **⚡ Gemini 3.7 Flash Personalization Engine**
  - Synthesizes personalized, high-converting cold email subject lines and contextual bodies for every recipient.
  - Automatically substitutes variables like `{{Name}}`, `{{Email}}`, `{{CALENDAR_URL}}`, `{{COMPANY}}`, and custom CRM fields.
  - Custom recipient-level AI prompt instructions and tone switching (*Professional, Consultative, Direct, Friendly*).

- **🗺️ Interactive Google Maps Places & Leads Discovery**
  - Search businesses, clinics, gyms, agencies, and venues by keyword and location (e.g. *"Dental Clinics in Austin, TX"*).
  - Extract names, addresses, phone numbers, ratings, and website emails, then import them directly into your campaign queue with one click.

- **📊 Dual Analytics & Real-Time Telemetry**
  - **D3.js v7 Interactive Engine**: Delivery rate curves, engagement velocity, dynamic tooltips, and SVG donut distribution charts.
  - **Recharts Analytics**: Pacing curves, cumulative delivery counts, and failure analysis breakdown.

- **📱 Deep Email Preview Studio**
  - **Email Client View**: Realistic inbox view with TLS 1.3 verification badges, headers, and CAN-SPAM disclaimers.
  - **Mobile Device Simulator**: iPhone viewport to test mobile subject line lengths and preheader rendering.
  - **Plaintext / MIME Inspector**: Inspect raw email payloads.
  - **Direct Editor & Single Test Send**: Modify drafts on the fly or send an instant test to your personal inbox.

- **🛡️ Spam-Resilient Dispatch & Checkpoint Persistence**
  - Pacing engine with jitter controls (Safe Mode with 36s CAN-SPAM delay, Fast 2s test mode, or Instant mode).
  - Atomic checkpoint logs (`sent_emails_checkpoint.json` / CSV export) preventing duplicate sends even across server restarts or accidental interruptions.

- **🎨 Modern UX & Dark Mode**
  - Seamless light and dark mode with persistent storage.
  - Animated Framer Motion progress bars with real-time ETA calculation.
  - Interactive Python CLI scripts generator for headless server or VPS automation.

---

## 🏗️ Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Motion (Framer Motion), Lucide React
- **Visualization**: D3.js v7, Recharts
- **AI & Integrations**: Google Gen AI SDK (`@google/genai`), Google Maps JavaScript API Loader (`@googlemaps/js-api-loader`)
- **Backend / Server**: Node.js, Express, Vite, tsx, esbuild
- **Spreadsheet / Data**: SheetJS (`xlsx`), Canvas Confetti

---

## 📦 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/gemini-email-automator.git
cd gemini-email-automator
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env` file in the root directory (based on `.env.example`):

```env
# Required for Gemini AI email generation
GEMINI_API_KEY=your_gemini_api_key_here

# Optional: Set host URL for production deployment
APP_URL=http://localhost:3000
```

> **Note**: Get a free API key at [Google AI Studio](https://aistudio.google.com/).

---

## 🏃 Running the Application

### Development Mode

Starts the Express backend server with Vite middleware on port 3000:

```bash
npm run dev
```

Open your browser and navigate to `http://localhost:3000`.

### Production Build

```bash
# Compile client assets and bundle backend server
npm run build

# Start the production server
npm start
```

### Code Quality & Type Check

```bash
npm run lint
```

---

## 📁 Project Structure

```
├── src/
│   ├── components/
│   │   ├── AIPersonalizerTab.tsx         # Multi-view draft preview, direct editor & single test send
│   │   ├── CampaignConfigTab.tsx         # Sender profiles, campaign goals, tone & attachment setup
│   │   ├── ContactsManagerTab.tsx        # CSV/XLSX parser, custom fields, contact table & manual adder
│   │   ├── D3MetricsDashboard.tsx        # D3.js v7 real-time delivery telemetry & interactive charts
│   │   ├── ExecutionRunnerTab.tsx        # Live dispatch queue, Framer Motion progress bar, ETA & logs
│   │   ├── MapsLeadFinderModal.tsx       # Google Maps Places API lead discovery modal
│   │   ├── MetricsAnalyticsDashboard.tsx # Recharts delivery rate & pacing distribution
│   │   ├── Navbar.tsx                    # Top navigation bar with dark mode toggle
│   │   ├── PythonScriptTab.tsx           # Standalone Python CLI script generator
│   │   └── SearchLeadsTab.tsx            # B2B search lead management
│   ├── context/
│   │   └── ThemeContext.tsx              # Light/Dark mode state management & localStorage persistence
│   ├── utils/
│   │   └── apiClient.ts                  # Server API client for Gemini and email dispatch
│   ├── App.tsx                           # Main application layout & active tab routing
│   ├── main.tsx                          # React entry point
│   └── types.ts                          # Shared TypeScript interfaces & types
├── server.ts                             # Express server with Gemini API proxy & Vite middleware
├── metadata.json                         # Platform capabilities and permissions
├── package.json                          # Dependencies & NPM scripts
└── README.md                             # Project documentation
```

---

## 🔒 Security & Best Practices

1. **Server-Side API Proxying**: The Gemini API key is never exposed to the client browser. All generation requests are proxied securely through `/api/generate-email`.
2. **Safe CAN-SPAM Compliance**: The dispatcher supports rate pacing delays (36+ seconds with random jitter) and mandatory unsubscribe footers to protect your domain reputation.
3. **Idempotency & Checkpointing**: Every successful email transmission is immediately written to a local checkpoint to eliminate accidental duplicate messages.

---

## 📄 License

This project is licensed under the MIT License - feel free to use and customize it for your own campaigns.
