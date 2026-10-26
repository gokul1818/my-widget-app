import React, { useState } from 'react';
import { Widget } from './components/Widget';
import { mockDashboardData } from './utils/mockData';
import './App.css';

export function App() {
  const [data, setData] = useState(mockDashboardData);
  const [stateMode, setStateMode] = useState('normal'); // 'normal' | 'loading' | 'error' | 'empty'
  const [theme, setTheme] = useState('light'); // 'light' | 'dark'
  const [viewportMode, setViewportMode] = useState('fluid'); // 'fluid' | 'mobile' | 'tablet'

  const handleRefresh = () => {
    setStateMode('loading');
    setTimeout(() => {
      // Simulate refreshed numbers
      setData((prev) => ({
        ...prev,
        lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        kpis: prev.kpis.map((kpi) => ({
          ...kpi,
          value:
            kpi.format === 'currency'
              ? Math.round(kpi.value * (0.95 + Math.random() * 0.1))
              : kpi.format === 'number'
              ? Math.round(kpi.value + (Math.random() * 20 - 10))
              : kpi.value,
        })),
      }));
      setStateMode('normal');
    }, 600);
  };

  const handleTimeframeChange = (timeframe) => {
    // Generate modified trend data according to timeframe
    const multiplier = timeframe === 'Today' ? 0.2 : timeframe === '7D' ? 1 : timeframe === '30D' ? 3.8 : 11.2;
    setData((prev) => ({
      ...prev,
      timeframe,
      lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      kpis: prev.kpis.map((kpi) => ({
        ...kpi,
        value: kpi.format === 'currency' || kpi.format === 'number' ? Math.round(kpi.value * multiplier * 0.9) : kpi.value,
        description: `vs. previous ${timeframe}`,
      })),
    }));
  };

  return (
    <div className={`app-wrapper ${theme === 'dark' ? 'dark-mode' : ''}`}>
      {/* Top Application Header */}
      <header className="app-header">
        <div className="app-header-top">
          <div className="app-brand">
            <span className="app-logo-badge">WIDGET</span>
            <div>
              <h1 className="app-heading">Mobile-Friendly React Widget Showcase</h1>
              <p className="app-subheading">Interactive Metrics & Analytics Dashboard</p>
            </div>
          </div>

          {/* Theme Selector */}
          <div className="toolbar-group">
            <span className="toolbar-label">Theme</span>
            <button
              type="button"
              className={`toolbar-btn ${theme === 'light' ? 'active' : ''}`}
              onClick={() => setTheme('light')}
              aria-label="Light mode"
            >
              ☀️ Light
            </button>
            <button
              type="button"
              className={`toolbar-btn ${theme === 'dark' ? 'active' : ''}`}
              onClick={() => setTheme('dark')}
              aria-label="Dark mode"
            >
              🌙 Dark
            </button>
          </div>
        </div>

        {/* State and Viewport Testing Controls */}
        <div className="app-toolbar">
          {/* State Mode Selector */}
          <div className="toolbar-group">
            <span className="toolbar-label">State</span>
            <button
              type="button"
              className={`toolbar-btn ${stateMode === 'normal' ? 'active' : ''}`}
              onClick={() => setStateMode('normal')}
            >
              Normal Data
            </button>
            <button
              type="button"
              className={`toolbar-btn ${stateMode === 'loading' ? 'active' : ''}`}
              onClick={() => setStateMode('loading')}
            >
              Loading
            </button>
            <button
              type="button"
              className={`toolbar-btn ${stateMode === 'empty' ? 'active' : ''}`}
              onClick={() => setStateMode('empty')}
            >
              Empty
            </button>
            <button
              type="button"
              className={`toolbar-btn ${stateMode === 'error' ? 'active' : ''}`}
              onClick={() => setStateMode('error')}
            >
              Error
            </button>
          </div>

          {/* Device Simulator Toggle */}
          <div className="toolbar-group">
            <span className="toolbar-label">Device Mode</span>
            <button
              type="button"
              className={`toolbar-btn ${viewportMode === 'mobile' ? 'active' : ''}`}
              onClick={() => setViewportMode('mobile')}
              title="375px mobile viewport"
            >
              📱 Mobile (375px)
            </button>
            <button
              type="button"
              className={`toolbar-btn ${viewportMode === 'tablet' ? 'active' : ''}`}
              onClick={() => setViewportMode('tablet')}
              title="768px tablet viewport"
            >
              📱 Tablet (768px)
            </button>
            <button
              type="button"
              className={`toolbar-btn ${viewportMode === 'fluid' ? 'active' : ''}`}
              onClick={() => setViewportMode('fluid')}
              title="Full width fluid responsive"
            >
              💻 Responsive (100%)
            </button>
          </div>
        </div>
      </header>

      {/* Main Viewport */}
      <main className="app-main">
        <div className={`device-viewport-frame view-${viewportMode}`}>
          {viewportMode !== 'fluid' && (
            <div className="device-frame-banner">
              <span className="device-camera-notch" />
              <span>Simulated {viewportMode.toUpperCase()} Screen</span>
            </div>
          )}

          {/* The Reusable Mobile-Friendly Widget */}
          <Widget
            title="Revenue & Growth Analytics"
            subtitle="Real-time transaction volume & channel breakdown"
            data={stateMode === 'empty' ? null : data}
            loading={stateMode === 'loading'}
            error={
              stateMode === 'error'
                ? 'Unable to sync metrics with server. Please check connection and try again.'
                : null
            }
            theme={theme}
            onRefresh={handleRefresh}
            onTimeframeChange={handleTimeframeChange}
            activeTimeframe={data.timeframe}
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="app-footer-bar">
        Built with React 19 + Vite · Mobile-first responsive design · Touch targets ≥ 44×44px · Zero external charting dependencies
      </footer>
    </div>
  );
}

export default App;
