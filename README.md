# Resolution Tracker - Desktop & Mobile Web App

A Progressive Web App (PWA) for tracking resolutions with Notion and Zapier integration.

---

## 🚀 Quick Start

### Option 1: Vite + React (Recommended)

```bash
# Create new project
npm create vite@latest resolution-tracker -- --template react
cd resolution-tracker

# Install dependencies
npm install

# Copy the component file
# Place resolution-tracker-pwa.jsx in src/

# Update src/App.jsx:
import ResolutionTrackerPWA from './resolution-tracker-pwa'
export default function App() {
  return <ResolutionTrackerPWA />
}

# Run development server
npm run dev
```

### Option 2: Next.js

```bash
npx create-next-app@latest resolution-tracker
cd resolution-tracker

# Install PWA plugin
npm install next-pwa

# Configure next.config.js for PWA
```

---

## 📁 Project Structure

```
resolution-tracker/
├── public/
│   ├── manifest.json          # PWA manifest
│   ├── service-worker.js      # Offline support
│   ├── icons/                 # App icons (72-512px)
│   │   ├── icon-72.png
│   │   ├── icon-96.png
│   │   ├── icon-128.png
│   │   ├── icon-144.png
│   │   ├── icon-152.png
│   │   ├── icon-192.png
│   │   ├── icon-384.png
│   │   └── icon-512.png
│   └── screenshots/           # PWA install screenshots
├── src/
│   ├── components/
│   │   └── ResolutionTracker.jsx
│   ├── hooks/
│   │   ├── useNotionSync.js   # Notion API integration
│   │   ├── useOfflineSync.js  # IndexedDB + background sync
│   │   └── usePWA.js          # PWA install prompt
│   ├── services/
│   │   ├── notion.js          # Notion API client
│   │   └── storage.js         # Local storage wrapper
│   ├── App.jsx
│   └── main.jsx
├── api/                       # Serverless functions (if using)
│   ├── notion-sync.js
│   └── zapier-webhook.js
├── manifest.json
├── service-worker.js
└── package.json
```

---

## 🔧 Implementation Steps

### Step 1: Add PWA Support to index.html

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  
  <!-- PWA Meta Tags -->
  <meta name="theme-color" content="#6366F1">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <meta name="apple-mobile-web-app-title" content="Resolutions">
  
  <!-- Icons -->
  <link rel="icon" type="image/png" href="/icons/icon-192.png">
  <link rel="apple-touch-icon" href="/icons/icon-192.png">
  
  <!-- Manifest -->
  <link rel="manifest" href="/manifest.json">
  
  <title>Resolution Tracker</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.jsx"></script>
  
  <!-- Register Service Worker -->
  <script>
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
          .then(reg => console.log('SW registered:', reg.scope))
          .catch(err => console.log('SW registration failed:', err));
      });
    }
  </script>
</body>
</html>
```

### Step 2: Create Notion API Service

```javascript
// src/services/notion.js
const NOTION_API = 'https://api.notion.com/v1';

export class NotionService {
  constructor(apiKey, databaseId) {
    this.apiKey = apiKey;
    this.databaseId = databaseId;
  }

  async getResolutions() {
    const response = await fetch(`${NOTION_API}/databases/${this.databaseId}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sorts: [{ property: 'Category', direction: 'ascending' }]
      })
    });
    
    const data = await response.json();
    return data.results.map(this.parseResolution);
  }

  async updateProgress(pageId, progress) {
    return fetch(`${NOTION_API}/pages/${pageId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        properties: {
          'Current Progress': { number: progress },
          'Last Check-in': { date: { start: new Date().toISOString().split('T')[0] } }
        }
      })
    });
  }

  parseResolution(page) {
    const props = page.properties;
    return {
      id: page.id,
      title: props['Resolution']?.title[0]?.plain_text || '',
      category: props['Category']?.select?.name || 'Personal',
      target: props['Target']?.number || 0,
      current: props['Current Progress']?.number || 0,
      unit: props['Unit']?.select?.name || 'times',
      frequency: props['Frequency']?.select?.name || 'weekly',
      streak: props['Streak']?.number || 0,
      lastCheckin: props['Last Check-in']?.date?.start || ''
    };
  }
}
```

### Step 3: Add Offline Storage

```javascript
// src/services/storage.js
const DB_NAME = 'ResolutionTrackerDB';
const DB_VERSION = 1;

export function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      if (!db.objectStoreNames.contains('resolutions')) {
        db.createObjectStore('resolutions', { keyPath: 'id' });
      }
      
      if (!db.objectStoreNames.contains('pendingUpdates')) {
        db.createObjectStore('pendingUpdates', { keyPath: 'id', autoIncrement: true });
      }
    };
  });
}

export async function saveResolutions(resolutions) {
  const db = await openDatabase();
  const tx = db.transaction('resolutions', 'readwrite');
  const store = tx.objectStore('resolutions');
  
  for (const resolution of resolutions) {
    store.put(resolution);
  }
  
  return new Promise((resolve, reject) => {
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

export async function getResolutions() {
  const db = await openDatabase();
  const tx = db.transaction('resolutions', 'readonly');
  const store = tx.objectStore('resolutions');
  
  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function queueUpdate(update) {
  const db = await openDatabase();
  const tx = db.transaction('pendingUpdates', 'readwrite');
  const store = tx.objectStore('pendingUpdates');
  
  store.add({
    ...update,
    timestamp: Date.now()
  });
  
  // Request background sync
  if ('serviceWorker' in navigator && 'sync' in window.registration) {
    await navigator.serviceWorker.ready;
    await window.registration.sync.register('sync-resolutions');
  }
}
```

### Step 4: PWA Install Hook

```javascript
// src/hooks/usePWA.js
import { useState, useEffect } from 'react';

export function usePWA() {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    // Capture install prompt
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
    };

    // Detect successful install
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setInstallPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const install = async () => {
    if (!installPrompt) return false;
    
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setInstallPrompt(null);
      return true;
    }
    return false;
  };

  return { canInstall: !!installPrompt, isInstalled, install };
}
```

---

## 🌐 Deployment Options

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard:
# - NOTION_API_KEY
# - NOTION_DATABASE_ID
```

### Netlify

```bash
# Install Netlify CLI
npm i -g netlify-cli

# Deploy
netlify deploy --prod
```

### Cloudflare Pages

```bash
# Connect GitHub repo to Cloudflare Pages
# Build command: npm run build
# Output directory: dist
```

---

## 📱 Mobile-Specific Features

### iOS Safari
- Add to Home Screen prompt
- Status bar styling
- Safe area insets for notch devices

### Android Chrome
- Native install banner
- Push notifications
- Background sync
- Shortcuts (long-press app icon)

---

## 🔐 Environment Variables

Create `.env.local`:

```env
VITE_NOTION_API_KEY=secret_xxx
VITE_NOTION_DATABASE_ID=xxx-xxx-xxx
VITE_ZAPIER_WEBHOOK_URL=https://hooks.zapier.com/xxx
```

---

## 📦 Build for Production

```bash
# Build optimized bundle
npm run build

# Preview production build
npm run preview

# Analyze bundle size
npx vite-bundle-visualizer
```

---

## ✅ PWA Checklist

- [ ] manifest.json with all required fields
- [ ] Service worker with offline support
- [ ] App icons (72, 96, 128, 144, 152, 192, 384, 512px)
- [ ] Theme color and background color
- [ ] Responsive design (mobile + desktop)
- [ ] Touch-friendly targets (min 44px)
- [ ] HTTPS enabled
- [ ] Fast first load (<3s on 3G)
- [ ] Works offline
- [ ] Install prompt handling

---

## 🧪 Testing

```bash
# Run Lighthouse audit
npx lighthouse http://localhost:5173 --view

# Test service worker
# Chrome DevTools > Application > Service Workers

# Test offline mode
# DevTools > Network > Offline checkbox
```

---

## 📚 Resources

- [PWA Documentation](https://web.dev/progressive-web-apps/)
- [Notion API Docs](https://developers.notion.com/)
- [Zapier Webhooks](https://zapier.com/apps/webhook/integrations)
- [Workbox (Service Worker Library)](https://developer.chrome.com/docs/workbox/)
