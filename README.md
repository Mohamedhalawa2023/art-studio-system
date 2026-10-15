# 🎨 Atelier: Art Studio & Academy Management System

> **A 100% Offline-First Desktop Management System designed specifically for fine arts studios, ateliers, and independent academies.**

---

## 📌 Project Overview

**Atelier** is an offline desktop administrative platform tailored to the unique workflow of fine art studios and ateliers. It is built strictly for **the studio manager, master artist, and reception gate**, requiring **zero student login** and **zero internet connectivity**. 

The system digitizes studio operations, introduces smart QR entrance scanning for incoming students, manages workshop financials, and produces museum-grade **A4 Art Mastery Diplomas & Growth Evaluations**.

---

## 🏛️ Core System Pillars (Foundations)

```
┌────────────────────────────────────────────────────────────────────────┐
│                        ATELIER ART STUDIO SYSTEM                      │
└────────────────────────────────────────────────────────────────────────┘
          │                   │                   │                   │
          ▼                   ▼                   ▼                   ▼
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
│   1. OPERATIONS  │ │  2. SMART GATE   │ │  3. ART DIPLOMA  │ │ 4. ART GALLERY   │
│   & FINANCIALS   │ │   & ATTENDANCE   │ │   & EVALUATION   │ │   & INVENTORY    │
├──────────────────┤ ├──────────────────┤ ├──────────────────┤ ├──────────────────┤
│ • Student Roster │ │ • QR ID Badges   │ │ • Algorithmic    │ │ • Artwork Catalog│
│ • Course Tracks  │ │ • Webcam / Laser │ │   Skill Ratings  │ │ • Medium & Size  │
│ • Schedule Times │ │ • Arabic Voice & │ │ • A4 Print Frame │ │ • Pricing & Sale │
│ • Fees & Dues    │ │   Audio Chimes   │ │ • Live Editing   │ │ • Artist Share   │
│ • Materials Exp. │ │ • 4s Auto-Reset  │ │ • 4 Royal Themes │ │ • Exhibitions    │
└──────────────────┘ └──────────────────┘ └──────────────────┘ └──────────────────┘
```

### 1. Operations, Schedules & Financials
* **Student Directory:** Comprehensive student profiles, contact channels, artistic interests, and workshop history.
* **Masterclass & Course Tracks:** Categorized by medium (Oil Painting, Charcoal & Portraiture, Watercolor Flow, Children's Fine Arts Academy).
* **Schedule & Room Assignment:** Studio room allocation, instructor scheduling, weekly group capacities, and remaining seat counts.
* **Financial Ledger:** Tracking course fees, installments, discounts, remaining balances, and studio operational expenses (canvases, pigments, brushes, studio lighting).

### 2. Smart Reception Gate & Kiosk Mode
* **Instant Entry Scanning:** Students scan their physical ID card / QR code upon arrival at the studio door.
* **Hardware Agnostic:** Supports standard USB laser barcode guns (HID keyboard emulation), integrated webcams, or fast manual lookups.
* **Automated Reception Greeting:**
  * Synthesizes warm harmonic chords via the browser's Web Audio API.
  * Speaks a polite Arabic voice welcome using local Web Speech synthesis.
  * Displays a full-screen welcome card indicating student name, workshop, assigned room, and remaining session balance.
  * 4-second linear countdown bar resets the kiosk automatically for the next incoming student.
* **Duplicate Detection:** Prevents accidental double check-ins on the same day with friendly reminder notifications.

### 3. Masterclass Art Evaluation & Luxury A4 Diploma
* **Offline Algorithmic Assessment:** Evaluates students across 4 core academic artistic competencies:
  1. **Brushwork Technique & Stroke Control (التحكم في الفرشاة والخامة)**
  2. **Composition, Proportion & Perspective (التكوين والنسب البصرية)**
  3. **Chiaroscuro & Value Range (إدراك النور والظلال)**
  4. **Color Harmony & Palette Mixing (تناغم وانسجام الألوان)**
* **Tailored Academic Art Critique:** Automatic descriptive critiques customized to the workshop category (Oil, Portrait, Watercolor, Kids).
* **Museum-Grade A4 Diploma Frame:**
  * Vector baroque corner filigree ornaments and gold guilloche borders.
  * 3D embossed gold medallion seal with satin ribbon tails.
  * Electronic QR verification stamp.
  * 4 luxury themes: **Royal Gold**, **Imperial Emerald**, **Sapphire Navy**, and **Aristocratic Burgundy**.
* **Anytime Customization (Live In-Place Editing):**
  * Studio directors can click on any text directly on the certificate to edit student names, grades, critiques, dates, or signatures.
  * Collapsible customizer drawer with skill sliders and quick presets.
  * Permanent local persistence with one-click reset to calculated defaults.

### 4. Art Gallery & Artwork Inventory
* Tracks finished paintings and sculptures exhibited at the studio.
* Manages artwork dimensions, medium, creation year, price, sale status, and artist attribution.

---

## 🛠️ Required Technologies & Architecture

| Layer | Recommended Technology | Purpose & Rationale |
| :--- | :--- | :--- |
| **Runtime** | **Node.js (v18+ LTS)** | Cross-platform, fast local execution without external dependencies. |
| **Packaging (Optional)** | **Electron / Bat Runner** | Wraps the application into an offline desktop `.exe` or one-click Windows launch script. |
| **Backend Framework** | **Express.js (v4.x / v5.x)** | Ultra-lightweight REST API server handling business logic and file persistence. |
| **Database** | **Embedded JSON Engine** | 100% offline file-based storage (`data_store.json`) with atomic writes and timestamped snapshots. Zero database server installation needed. |
| **Frontend UI** | **Vanilla HTML5 / Modern CSS** | Clean light mode aesthetic (warm parchment, gold, ivory, emerald). Zero client build step needed for maximum offline durability. |
| **Icons & Visuals** | **Lucide Icons (Local SVG)** | Lightweight, modern icon set bundled locally. |
| **QR Generation & Scan** | **`qrcode` (Node) & `html5-qrcode`** | Offline QR generation for student ID cards and webcam barcode reading. |
| **Audio & Speech** | **Web Audio API & Web Speech API** | Offline audio synthesis for welcome chimes and native OS Arabic voice synthesis. |
| **Printing Engine** | **CSS3 `@media print` (A4)** | Pixel-perfect print isolation for student ID cards and museum-grade A4 certificates. |

---

## 📁 Starter Project Structure

```text
art-studio-system/
├── src/                          # Backend source code
│   ├── config/                   # Studio settings & defaults
│   ├── database/                 # JSON DB engine & models
│   ├── routes/                   # API endpoints (students, courses, attendance, certs)
│   └── server.js                 # Server entry point
├── public/                       # Frontend assets & web UI
│   ├── assets/                   # Offline icons & images
│   ├── js/                       # Client app, kiosk & certificate logic
│   ├── css/                      # Custom styles, themes & print rules
│   └── index.html                # Main administrative interface
├── docs/                         # Documentation & specifications
├── .gitignore                    # Git exclusion rules
├── package.json                  # Dependencies & scripts
└── README.md                     # Project blueprint & guide
```

---

## 🚀 Getting Started

### 1. Prerequisites
* **Node.js** (v18.x, v20.x or higher) installed on the Windows machine.
* A standard modern browser (Chrome, Edge, Brave, or Firefox) or Electron runtime.

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/Mohamedhalawa2023/art-studio-system.git

# Enter project directory
cd art-studio-system

# Install dependencies
npm install
```

### 3. Launching
```bash
# Start the local offline server
npm start

# For development with auto-reload
npm run dev
```

---

## 📜 License
This project is open-source and available under the [MIT License](LICENSE).
