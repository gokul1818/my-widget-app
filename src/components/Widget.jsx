import React, { useState } from 'react';
import { StatCard } from './StatCard';
import { TrendChart } from './TrendChart';
import { BreakdownList } from './BreakdownList';
import { Timer } from './Timer';
import {
  WidgetLoadingSkeleton,
  WidgetEmptyState,
  WidgetErrorState,
} from './WidgetStates';
import { timeframes } from '../utils/mockData';

/**
 * Mobile-First Reusable Analytics Widget Component
 *
 * @param {Object} props
 * @param {string} [props.title='Performance Analytics'] - Widget display title
 * @param {string} [props.subtitle] - Optional descriptive subtitle
 * @param {Object} [props.data] - Analytics dataset (kpis, trendChart, breakdown)
 * @param {boolean} [props.loading=false] - Triggers loading shimmer skeleton
 * @param {any} [props.error=null] - Error object, string or boolean
 * @param {'light'|'dark'|'system'} [props.theme='light'] - Theme configuration
 * @param {Function} [props.onRefresh] - Callback when user hits refresh
 * @param {Function} [props.onTimeframeChange] - Callback for timeframe pills
 * @param {string} [props.activeTimeframe='7D'] - Selected timeframe pill
 * @param {string} [props.className=''] - Additional custom CSS class names
 * @param {boolean} [props.showTimer=true] - Toggle display of the embedded simple timer
 * @param {string} [props.timerTitle='Session Timer'] - Display label for timer
 */
export function Widget({
  title = 'Performance Analytics',
  subtitle,
  data,
  loading = false,
  error = null,
  theme = 'light',
  onRefresh,
  onTimeframeChange,
  activeTimeframe = '7D',
  className = '',
  showTimer = true,
  timerTitle = 'Session Timer',
}) {
  const [selectedTimeframe, setSelectedTimeframe] = useState(activeTimeframe);
  const [searchQuery, setSearchQuery] = useState('');

  const handleTimeframeClick = (tf) => {
    setSelectedTimeframe(tf);
    if (onTimeframeChange) {
      onTimeframeChange(tf);
    }
  };

  const hasData =
    data &&
    ((data.kpis && data.kpis.length > 0) ||
      (data.trendChart && data.trendChart.length > 0) ||
      (data.breakdown && data.breakdown.length > 0));

  // Filter KPI cards if user types into search input
  const filteredKpis = data?.kpis?.filter((kpi) =>
    kpi.label.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <section
      className={`widget-container ${className}`}
      data-theme={theme}
      aria-label={title}
    >
      {/* Widget Header */}
      <header className="widget-header">
        <div className="widget-title-group">
          <div className="widget-badge-row">
            <span className="widget-live-dot" aria-hidden="true" />
            <span className="widget-status-badge">Live System Metrics</span>
          </div>
          <h2 className="widget-title">{title}</h2>
          {subtitle ? (
            <p className="widget-subtitle">{subtitle}</p>
          ) : data?.lastUpdated ? (
            <p className="widget-subtitle">
              Updated at {data.lastUpdated}
            </p>
          ) : null}
        </div>

        {/* Action Buttons (Refresh & Options) */}
        <div className="widget-actions">
          {onRefresh && (
            <button
              type="button"
              className="widget-icon-btn"
              onClick={onRefresh}
              title="Refresh metrics data"
              aria-label="Refresh metrics"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
              </svg>
            </button>
          )}
        </div>
      </header>

      {/* Widget Controls Bar: Search Input & Timeframe Pills */}
      <div className="widget-controls-bar">
        {/* Search input with 16px min font-size to prevent iOS Safari auto-zoom */}
        <div className="widget-search-wrapper">
          <svg
            className="widget-search-icon"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="search"
            className="widget-input"
            placeholder="Filter metrics..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Filter metrics"
          />
        </div>

        {/* Timeframe Filter Pills */}
        <div className="widget-timeframe-pills" role="tablist" aria-label="Select Timeframe">
          {timeframes.map((tf) => (
            <button
              key={tf}
              type="button"
              role="tab"
              aria-selected={selectedTimeframe === tf}
              className={`widget-pill-btn ${selectedTimeframe === tf ? 'active' : ''}`}
              onClick={() => handleTimeframeClick(tf)}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {/* Body States: Loading, Error, Empty, or Content */}
      <div className="widget-body">
        {loading ? (
          <WidgetLoadingSkeleton />
        ) : error ? (
          <WidgetErrorState error={error} onRetry={onRefresh} />
        ) : !hasData ? (
          <WidgetEmptyState onAction={onRefresh} />
        ) : (
          <div className="widget-content">
            {/* Simple Responsive Timer for Mobile & Web */}
            {showTimer && <Timer title={timerTitle} />}

            {/* KPI Cards Grid */}
            <div className="widget-kpi-grid">
              {filteredKpis.length > 0 ? (
                filteredKpis.map((kpi) => <StatCard key={kpi.id} kpi={kpi} />)
              ) : (
                <div className="widget-no-results">
                  No metrics match "{searchQuery}"
                </div>
              )}
            </div>

            {/* Responsive Trend Chart */}
            {data.trendChart && data.trendChart.length > 0 && (
              <TrendChart data={data.trendChart} />
            )}

            {/* Breakdown Category List */}
            {data.breakdown && data.breakdown.length > 0 && (
              <BreakdownList items={data.breakdown} />
            )}
          </div>
        )}
      </div>

      {/* Widget Footer */}
      <footer className="widget-footer">
        <span className="widget-footer-meta">
          Showing data for <strong>{selectedTimeframe}</strong>
        </span>
        <button
          type="button"
          className="widget-link-btn"
          onClick={() => alert(`Exporting report for ${selectedTimeframe}...`)}
        >
          Export Summary →
        </button>
      </footer>
    </section>
  );
}
export default Widget;

