import React from 'react';
import { formatCurrency, formatNumber } from '../utils/formatters';

export function BreakdownList({ items = [] }) {
  if (!items || items.length === 0) return null;

  return (
    <div className="widget-breakdown-section">
      <h4 className="widget-section-title">Channel Breakdown</h4>
      <div className="widget-breakdown-list">
        {items.map((item, idx) => (
          <div key={idx} className="widget-breakdown-item">
            <div className="widget-breakdown-info">
              <span className="widget-breakdown-category">
                <span
                  className="widget-breakdown-dot"
                  style={{ backgroundColor: item.color || '#3b82f6' }}
                />
                {item.category}
              </span>
              <span className="widget-breakdown-values">
                <strong>{formatCurrency(item.amount)}</strong>
                <span className="widget-breakdown-sub">
                  ({formatNumber(item.count)} orders · {item.percentage}%)
                </span>
              </span>
            </div>
            <div className="widget-progress-track">
              <div
                className="widget-progress-fill"
                style={{
                  width: `${item.percentage}%`,
                  backgroundColor: item.color || '#3b82f6',
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

