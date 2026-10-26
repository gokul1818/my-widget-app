# 📊 Mobile-Friendly Analytics Widget (`my-widget-app`)

A lightweight, accessible, mobile-first reusable React widget for displaying business metrics, real-time KPI cards, interactive SVG trend lines, and channel breakdowns.

---

## 🚀 Features

- **📱 Mobile-First Architecture**: Handcrafted for smooth viewing on small screens (down to 320px) up to ultra-wide displays.
- **👆 Touch-Optimized (≥ 44×44px)**: All interactive buttons, search inputs, timeframe pills, and icons adhere to WCAG and mobile touch target guidelines.
- **🔍 Zero iOS Auto-Zoom**: Search inputs and form controls are set to `1rem` (16px) minimum font size to prevent unwanted iOS Safari zooming on focus.
- **📈 Native SVG Trend Chart**: Smooth interactive hover and touch scrubbers with zero bulky charting libraries.
- **🎨 Theming Support**: Native Light and Dark themes with smooth CSS variable transitions (`data-theme="light|dark"`).
- **⏳ Comprehensive State Handling**: Dedicated views for:
  - **Normal** data state
  - **Loading** state with animated shimmer skeleton loaders
  - **Error** state with error description and retry action
  - **Empty** state with call-to-action button
- **🛡️ Clean Code & Tests**: Verified with Oxlint and Node.js built-in test runner.

---

## 📂 Project Structure

```
my-widget-app/
├── index.html               # Viewport meta tags & HTML entry
├── vite.config.js           # Vite build configuration
├── package.json             # Scripts & dependencies
├── src/
│   ├── main.jsx             # React DOM root entry
│   ├── App.jsx              # Interactive showcase & device simulator
│   ├── App.css              # Showcase header, toolbar & simulated device frames
│   ├── index.css            # Global CSS imports
│   ├── components/
│   │   ├── index.js         # Unified barrel exports
│   │   ├── Widget.jsx       # Reusable mobile-friendly widget container
│   │   ├── StatCard.jsx     # Individual KPI stat cards with trend badges
│   │   ├── TrendChart.jsx   # Responsive interactive SVG trend curve
│   │   ├── BreakdownList.jsx# Channel breakdown with animated progress bars
│   │   └── WidgetStates.jsx # Skeleton, Empty, and Error state components
│   ├── styles/
│   │   ├── reset.css        # Base CSS reset, box-sizing, typography & touch resets
│   │   └── widget.css       # Scoped widget styling & mobile breakpoints
│   └── utils/
│       ├── formatters.js    # Currency, number, and percentage helpers
│       └── mockData.js      # Mock datasets and timeframe definitions
└── test/
    └── widget.test.mjs      # Unit tests for formatters and data validation
```

---

## 🛠️ Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Start development server
```bash
npm run dev
```
To test on your mobile device over local Wi-Fi:
```bash
npm run dev -- --host
```

### 3. Run tests
```bash
npm test
```

### 4. Run linter
```bash
npm run lint
```

### 5. Production build
```bash
npm run build
```

---

## 🧩 `<Widget />` Component Props & Usage

### Basic Usage Example

```jsx
import React, { useState } from 'react';
import { Widget } from './components/Widget';
import './styles/reset.css';
import './styles/widget.css';

function DashboardPage() {
  const [dataset, setDataset] = useState({
    lastUpdated: '10:45 AM',
    kpis: [
      { id: '1', label: 'Gross Volume', value: 28450, format: 'currency', change: 14.8, trend: 'up' },
      { id: '2', label: 'Completed Orders', value: 1240, format: 'number', change: 8.2, trend: 'up' },
    ],
    trendChart: [
      { label: 'Mon', value: 3100, orders: 135 },
      { label: 'Tue', value: 3600, orders: 158 },
      { label: 'Wed', value: 5850, orders: 256 },
    ],
    breakdown: [
      { category: 'Dine-In', count: 680, percentage: 65, amount: 15650, color: '#3b82f6' },
      { category: 'Takeaway', count: 340, percentage: 35, amount: 7680, color: '#10b981' },
    ]
  });

  return (
    <main style={{ padding: '1rem' }}>
      <Widget
        title="Revenue & Performance"
        subtitle="Live metrics updated automatically"
        data={dataset}
        theme="light"
        onRefresh={() => console.log('Refreshing metrics...')}
        onTimeframeChange={(tf) => console.log('Switched to', tf)}
      />
    </main>
  );
}
```

### Props Reference

| Prop | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `title` | `string` | `'Performance Analytics'` | Header title for the widget. |
| `subtitle` | `string` | `undefined` | Optional secondary description text. |
| `data` | `Object` | `null` | Data payload containing `kpis`, `trendChart`, `breakdown`. |
| `loading` | `boolean` | `false` | When `true`, displays shimmer skeleton loaders. |
| `error` | `string \| Object \| null` | `null` | When provided, displays the error state card with retry button. |
| `theme` | `'light' \| 'dark'` | `'light'` | Theme style applied via CSS variables. |
| `onRefresh` | `() => void` | `undefined` | Callback invoked when user clicks the refresh icon. |
| `onTimeframeChange` | `(tf: string) => void` | `undefined` | Callback invoked when user selects a timeframe pill (`Today`, `7D`, `30D`, `90D`). |
| `activeTimeframe` | `string` | `'7D'` | Currently active timeframe identifier. |
| `showTimer` | `boolean` | `true` | Embeds the responsive timer (Stopwatch / Countdown). |
| `timerTitle` | `string` | `'Session Timer'` | Label title for the embedded timer. |
| `className` | `string` | `''` | Optional extra class names for customization. |

### Standalone `<Timer />` Usage

You can also import and use the Timer as an independent widget:

```jsx
import { Timer } from './components/Timer';
import './styles/widget.css';

function MyTimerWidget() {
  return (
    <Timer
      title="Focus Timer"
      initialSeconds={0}
      onComplete={() => alert('Timer completed!')}
    />
  );
}
```

---

## 📱 Mobile Responsiveness Breakdown

| Viewport | Breakpoint | Layout Behavior |
| :--- | :--- | :--- |
| **Mobile** | `< 640px` | Single-column stacked KPI cards, full-width search input, horizontal scrollable timeframe pills, 44×44px touch targets. |
| **Tablet** | `640px – 1023px` | 2-column KPI grid, inline controls bar with search on left and pills on right, expanded chart height. |
| **Desktop** | `≥ 1024px` | 4-column KPI grid, spacious SVG chart canvas with interactive coordinates tooltip. |

---

## 📋 Acceptance Criteria Checklist

- [x] Project runs with no console errors
- [x] Widget renders cleanly on screens from 320px to desktop width
- [x] No horizontal scrolling (`overflow-x: hidden`, flexible relative units)
- [x] Touch targets at least 44×44px on all interactive controls
- [x] Font sizes for input elements at 16px to prevent iOS auto-zoom
- [x] Handles Loading, Empty, and Error states cleanly
- [x] Production build passes (`dist/` verified)
- [x] Clean unit test suite with Node test runner
