/**
 * Realistic metrics data generator for development and testing.
 */

export const mockDashboardData = {
  timeframe: '7D',
  lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  kpis: [
    {
      id: 'revenue',
      label: 'Gross Volume',
      value: 28450,
      format: 'currency',
      change: 14.8,
      trend: 'up',
      description: 'vs. previous 7 days',
    },
    {
      id: 'orders',
      label: 'Completed Orders',
      value: 1240,
      format: 'number',
      change: 8.2,
      trend: 'up',
      description: 'vs. previous 7 days',
    },
    {
      id: 'conversion',
      label: 'Conversion Rate',
      value: 4.6,
      format: 'percent_raw',
      change: -0.4,
      trend: 'down',
      description: 'vs. previous 7 days',
    },
    {
      id: 'avg_order',
      label: 'Avg. Ticket Size',
      value: 22.95,
      format: 'currency',
      change: 5.7,
      trend: 'up',
      description: 'vs. previous 7 days',
    },
  ],
  trendChart: [
    { label: 'Mon', value: 3100, orders: 135 },
    { label: 'Tue', value: 3600, orders: 158 },
    { label: 'Wed', value: 3400, orders: 149 },
    { label: 'Thu', value: 4200, orders: 184 },
    { label: 'Fri', value: 5100, orders: 223 },
    { label: 'Sat', value: 5850, orders: 256 },
    { label: 'Sun', value: 3200, orders: 135 },
  ],
  breakdown: [
    { category: 'Dine-In Orders', count: 680, percentage: 55, amount: 15650, color: '#3b82f6' },
    { category: 'Takeaway / Pickup', count: 340, percentage: 27, amount: 7680, color: '#10b981' },
    { category: 'Mobile QR Scans', count: 220, percentage: 18, amount: 5120, color: '#f59e0b' },
  ],
};

export const timeframes = ['Today', '7D', '30D', '90D'];

