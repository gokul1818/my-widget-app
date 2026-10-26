import React from 'react';

export function WidgetLoadingSkeleton() {
  return (
    <div className="widget-loading-container" role="status" aria-label="Loading metrics data">
      <div className="skeleton skeleton-header" />
      <div className="widget-kpi-grid">
        <div className="skeleton skeleton-card" />
        <div className="skeleton skeleton-card" />
        <div className="skeleton skeleton-card" />
        <div className="skeleton skeleton-card" />
      </div>
      <div className="skeleton skeleton-chart" />
      <div className="skeleton skeleton-list" />
      <span className="sr-only">Loading metrics data, please wait...</span>
    </div>
  );
}

export function WidgetEmptyState({ onAction, actionLabel = 'Initialize Metrics' }) {
  return (
    <div className="widget-state-card widget-empty-state">
      <div className="widget-state-icon">📊</div>
      <h3 className="widget-state-title">No metrics recorded yet</h3>
      <p className="widget-state-desc">
        There is currently no activity recorded for this timeframe. Place an order or generate test
        transactions to see real-time statistics.
      </p>
      {onAction && (
        <button
          type="button"
          className="widget-btn widget-btn-primary"
          onClick={onAction}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

export function WidgetErrorState({ error, onRetry }) {
  const errorMessage =
    typeof error === 'string'
      ? error
      : error?.message || 'Unable to load performance metrics right now.';

  return (
    <div className="widget-state-card widget-error-state" role="alert">
      <div className="widget-state-icon error-icon">⚠️</div>
      <h3 className="widget-state-title">Failed to load metrics</h3>
      <p className="widget-state-desc">{errorMessage}</p>
      {onRetry && (
        <button
          type="button"
          className="widget-btn widget-btn-retry"
          onClick={onRetry}
        >
          Retry Connection
        </button>
      )}
    </div>
  );
}

