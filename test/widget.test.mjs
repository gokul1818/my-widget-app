import test from 'node:test';
import assert from 'node:assert/strict';
import { formatCurrency, formatNumber, formatPercent, formatTimer } from '../src/utils/formatters.js';
import { mockDashboardData, timeframes, timerPresets } from '../src/utils/mockData.js';

test('Formatters: formatCurrency handles integers and decimals', () => {
  assert.equal(formatCurrency(28450), '$28,450');
  assert.equal(formatCurrency(22.95), '$22.95');
  assert.equal(formatCurrency(0), '$0');
});

test('Formatters: formatNumber handles standard and compact formatting', () => {
  assert.equal(formatNumber(1240), '1,240');
  assert.equal(formatNumber(25000), '25K');
  assert.equal(formatNumber(0), '0');
});

test('Formatters: formatPercent handles positive and negative percentages', () => {
  assert.equal(formatPercent(14.8), '+14.8%');
  assert.equal(formatPercent(-0.4), '-0.4%');
  assert.equal(formatPercent(0), '0%');
});

test('Formatters: formatTimer handles seconds, minutes, hours, and edge cases', () => {
  assert.equal(formatTimer(0), '00:00');
  assert.equal(formatTimer(45), '00:45');
  assert.equal(formatTimer(60), '01:00');
  assert.equal(formatTimer(75), '01:15');
  assert.equal(formatTimer(3599), '59:59');
  assert.equal(formatTimer(3600), '01:00:00');
  assert.equal(formatTimer(3665), '01:01:05');
  assert.equal(formatTimer(-10), '00:00');
  assert.equal(formatTimer(null), '00:00');
  assert.equal(formatTimer(undefined), '00:00');
  assert.equal(formatTimer(NaN), '00:00');
});

test('Timer Presets: Contains standard stopwatch and countdown presets', () => {
  assert.ok(Array.isArray(timerPresets));
  assert.equal(timerPresets[0].label, 'Stopwatch');
  assert.equal(timerPresets[0].mode, 'countup');
  assert.equal(timerPresets[1].label, '1m');
  assert.equal(timerPresets[1].seconds, 60);
  assert.equal(timerPresets[1].mode, 'countdown');
});

test('Mock Data: Dashboard payload contains valid structure', () => {
  assert.ok(mockDashboardData.kpis.length >= 4);
  assert.ok(mockDashboardData.trendChart.length > 0);
  assert.ok(mockDashboardData.breakdown.length > 0);
  assert.deepEqual(timeframes, ['Today', '7D', '30D', '90D']);
});


