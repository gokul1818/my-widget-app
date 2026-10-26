import test from 'node:test';
import assert from 'node:assert/strict';
import { formatCurrency, formatNumber, formatPercent } from '../src/utils/formatters.js';
import { mockDashboardData, timeframes } from '../src/utils/mockData.js';

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

test('Mock Data: Dashboard payload contains valid structure', () => {
  assert.ok(mockDashboardData.kpis.length >= 4);
  assert.ok(mockDashboardData.trendChart.length > 0);
  assert.ok(mockDashboardData.breakdown.length > 0);
  assert.deepEqual(timeframes, ['Today', '7D', '30D', '90D']);
});

