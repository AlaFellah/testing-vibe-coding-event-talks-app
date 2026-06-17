# Google BigQuery Release Notes Viewer & Tweet Hub

A sleek, responsive single-page web application (SPA) built with Python Flask and plain vanilla HTML, CSS, and JavaScript. The app aggregates the live Google BigQuery Release Notes XML feed, parses the compound daily entries into individual categorized cards, and integrates an intelligent composer to draft and publish updates directly to X/Twitter.

---

## 🚀 Key Features

* **Feed Parsing & Atom Multi-item Splitting**: Google groups all daily updates into a single feed item. The backend parses each day's entry and splits it into individual, distinct cards categorized by type (e.g. `Feature`, `Announcement`, `Issue`, `Deprecation`).
* **Efficient In-Memory Caching**: Implements server-side caching to guarantee rapid load times and protect against rate-limiting issues when requesting Google Cloud feeds.
* **Instant Filtering & Search**: Filter releases by category tabs (Features, Announcements, Issues, Deprecations) and execute search queries on keywords dynamically in the browser.
* **Twitter / X Composer & Web Intent**: Selecting a card generates a concise, character-budgeted tweet draft (max 280 characters). Includes an interactive SVG character progress ring and a one-click button to open the Twitter Web Intent share popup.
* **Modern UI Aesthetics**: A glassmorphic dark-theme design utilizing fluid CSS transitions, indicator badges, loaders, and customizable toast notifications.

---

## 📁 Repository Structure

* [app.py](file:///C:/Users/Alaa/agy-cli-projects/app.py) — Main Flask server containing network fetching, caching, and Atom XML BeautifulSoup grouping parsers.
* [requirements.txt](file:///C:/Users/Alaa/agy-cli-projects/requirements.txt) — Backend dependencies (`Flask`, `requests`, and `beautifulsoup4`).
* [.gitignore](file:///C:/Users/Alaa/agy-cli-projects/.gitignore) — Configured git exclusions for virtual environments and pycache.
* **templates/**
  * [templates/index.html](file:///C:/Users/Alaa/agy-cli-projects/templates/index.html) — Single-page HTML layout with filters, list placeholders, and the Composer drawer.
* **static/**
  * **css/**
    * [static/css/style.css](file:///C:/Users/Alaa/agy-cli-projects/static/css/style.css) — Custom glassmorphic styling system, responsive grids, and micro-animations.
  * **js/**
    * [static/js/main.js](file:///C:/Users/Alaa/agy-cli-projects/static/js/main.js) — Client state management, keyword search, selection inputs, tweet formatting logic, and intent dispatching.

---

## 🛠️ Local Installation & Setup

Ensure you have Python 3.8+ installed on your system.

1. **Clone the repository**:
   ```bash
   git clone https://github.com/AlaFellah/testing-vibe-coding-event-talks-app.git
   cd testing-vibe-coding-event-talks-app
   ```

2. **Create a virtual environment** (optional but recommended):
   ```bash
   python -m venv venv
   # On Windows (PowerShell):
   .\venv\Scripts\Activate.ps1
   # On macOS/Linux:
   source venv/bin/activate
   ```

3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

---

## 🏃 Running the Application

1. **Start the Flask server**:
   ```bash
   python app.py
   ```
2. **Access the application**:
   Open your browser and navigate to **[http://127.0.0.1:5000](http://127.0.0.1:5000)**.

3. **Refresh Feed**:
   Click the **Refresh** button next to the timestamp in the header to trigger a server-side cache bypass and retrieve the latest feed items.
