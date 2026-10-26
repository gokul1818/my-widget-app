import React, { useState } from 'react';
import { formatCurrency } from '../utils/formatters';

export function TrendChart({ data = [] }) {
  const [activeIndex, setActiveIndex] = useState(data.length - 1);

  if (!data || data.length === 0) {
    return <div className="widget-chart-empty">No trend data available</div>;
  }

  // Dimensions for coordinate mapping
  const width = 500;
  const height = 180;
  const paddingX = 35;
  const paddingY = 25;

  const values = data.map((d) => d.value);
  const minVal = Math.min(...values) * 0.85;
  const maxVal = Math.max(...values) * 1.08;
  const range = maxVal - minVal || 1;

  // Generate SVG coordinates
  const points = data.map((d, i) => {
    const x = paddingX + (i / (data.length - 1)) * (width - paddingX * 2);
    const y = height - paddingY - ((d.value - minVal) / range) * (height - paddingY * 2);
    return { x, y, ...d };
  });

  const pathD = points.reduce((acc, pt, i) => {
    return i === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
  }, '');

  const areaD = `${pathD} L ${points[points.length - 1].x} ${height - paddingY} L ${points[0].x} ${height - paddingY} Z`;

  const activePoint = points[activeIndex] || points[points.length - 1];

  const handlePointerMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const relX = clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, relX / rect.width));
    const closestIdx = Math.round(ratio * (data.length - 1));
    setActiveIndex(closestIdx);
  };

  return (
    <div className="widget-chart-wrapper">
      <div className="widget-chart-header">
        <span className="widget-chart-label">Trend Overview</span>
        <div className="widget-chart-hover-pill">
          <strong>{activePoint.label}:</strong> {formatCurrency(activePoint.value)} ({activePoint.orders} orders)
        </div>
      </div>

      <div
        className="widget-chart-canvas-container"
        onMouseMove={handlePointerMove}
        onTouchMove={handlePointerMove}
        onTouchStart={handlePointerMove}
        role="region"
        aria-label="Interactive trend chart"
      >
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="widget-chart-svg"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent-color, #3b82f6)" stopOpacity="0.4" />
              <stop offset="100%" stopColor="var(--accent-color, #3b82f6)" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <line
            x1={paddingX}
            y1={paddingY}
            x2={width - paddingX}
            y2={paddingY}
            stroke="var(--chart-grid, rgba(148, 163, 184, 0.2))"
            strokeDasharray="4 4"
          />
          <line
            x1={paddingX}
            y1={height / 2}
            x2={width - paddingX}
            y2={height / 2}
            stroke="var(--chart-grid, rgba(148, 163, 184, 0.2))"
            strokeDasharray="4 4"
          />
          <line
            x1={paddingX}
            y1={height - paddingY}
            x2={width - paddingX}
            y2={height - paddingY}
            stroke="var(--chart-grid, rgba(148, 163, 184, 0.3))"
          />

          {/* Fill Area */}
          <path d={areaD} fill="url(#chartGradient)" />

          {/* Line Path */}
          <path
            d={pathD}
            fill="none"
            stroke="var(--accent-color, #3b82f6)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Vertical Active Line */}
          {activePoint && (
            <line
              x1={activePoint.x}
              y1={paddingY}
              x2={activePoint.x}
              y2={height - paddingY}
              stroke="var(--accent-color, #3b82f6)"
              strokeWidth="1.5"
              strokeDasharray="3 3"
            />
          )}

          {/* Points */}
          {points.map((pt, i) => (
            <circle
              key={i}
              cx={pt.x}
              cy={pt.y}
              r={i === activeIndex ? 6 : 4}
              className={i === activeIndex ? 'chart-point-active' : 'chart-point'}
              fill={i === activeIndex ? 'var(--accent-color, #3b82f6)' : '#ffffff'}
              stroke="var(--accent-color, #3b82f6)"
              strokeWidth={i === activeIndex ? 3 : 2}
            />
          ))}
        </svg>

        {/* X-axis labels */}
        <div className="widget-chart-xaxis">
          {data.map((d, i) => (
            <span
              key={i}
              className={`widget-chart-xpoint ${i === activeIndex ? 'active' : ''}`}
            >
              {d.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

