import React from 'react';
import { formatCurrency, formatNumber, formatPercent } from '../utils/formatters';

export function StatCard({ kpi }) {
  const { label, value, format, change, trend, description } = kpi;

  const displayValue = () => {
    switch (format) {
      case 'currency':
        return formatCurrency(value);
      case 'number':
        return formatNumber(value);
      case 'percent_raw':
        return `${value}%`;
      default:
        return value;
    }
  };

  const isPositive = trend === 'up';

  return (
    <div className="widget-stat-card">
      <div className="widget-stat-header">
        <span className="widget-stat-label">{label}</span>
        <span
          className={`widget-trend-badge ${isPositive ? 'trend-up' : 'trend-down'}`}
          aria-label={`${change}% ${trend}`}
        >
          {isPositive ? '↑' : '↓'} {formatPercent(Math.abs(change))}
        </span>
      </div>

      <div className="widget-stat-value">{displayValue()}</div>

      {description && <div className="widget-stat-desc">{description}</div>}
    </div>
  );
}

