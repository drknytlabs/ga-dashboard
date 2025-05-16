const express = require('express');
const path = require('path');
const { google } = require('googleapis');
const cheerio = require('cheerio');
const schedule = require('node-schedule');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// ✅ In-memory radar cache
let latestRadarResults = [];

// ✅ Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// ✅ Root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 📊 Analytics: page views over time per pagePath
app.get('/api/analytics/by-pagepath', async (req, res) => {
  try {
    const startDate = req.query.start || '7daysAgo';
    const endDate = req.query.end || 'today';

    const auth = new google.auth.GoogleAuth({
      keyFile: process.env.GA_CREDENTIALS_PATH,
      scopes: ['https://www.googleapis.com/auth/analytics.readonly'],
    });

    const client = await auth.getClient();
    const analyticsDataClient = google.analyticsdata('v1beta');

    const result = await analyticsDataClient.properties.runReport({
      property: `properties/${process.env.GA_PROPERTY_ID}`,
      requestBody: {
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'date' }, { name: 'pagePath' }],
        metrics: [{ name: 'screenPageViews' }],
        orderBys: [
          { dimension: { dimensionName: 'pagePath' } },
          { dimension: { dimensionName: 'date' } }
        ],
        limit: 1000
      },
      auth: client
    });

    const rawRows = result.data.rows || [];
    const grouped = {};

    rawRows.forEach(row => {
      const date = row.dimensionValues[0].value;
      const path = row.dimensionValues[1].value;
      const views = parseInt(row.metricValues[0].value);

      if (!grouped[path]) grouped[path] = {};
      grouped[path][date] = views;
    });

    const allDates = [...new Set(rawRows.map(r => r.dimensionValues[0].value))].sort();

    const datasets = Object.entries(grouped).map(([path, dateMap]) => ({
      label: path,
      data: allDates.map(d => dateMap[d] || 0),
      fill: false,
      borderColor: `hsl(${Math.floor(Math.random() * 360)}, 70%, 60%)`,
      tension: 0.4
    }));

    res.json({ success: true, labels: allDates, datasets });
  } catch (error) {
    console.error('❌ PagePath Chart API error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 📄 Top pages
app.get('/api/analytics/top-pages', async (req, res) => {
  try {
    const startDate = req.query.start || '7daysAgo';
    const endDate = req.query.end || 'today';

    const auth = new google.auth.GoogleAuth({
      keyFile: process.env.GA_CREDENTIALS_PATH,
      scopes: ['https://www.googleapis.com/auth/analytics.readonly'],
    });

    const client = await auth.getClient();
    const analyticsDataClient = google.analyticsdata('v1beta');

    const result = await analyticsDataClient.properties.runReport({
      property: `properties/${process.env.GA_PROPERTY_ID}`,
      requestBody: {
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'pagePath' }],
        metrics: [{ name: 'screenPageViews' }],
        orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
        limit: 10
      },
      auth: client,
    });

    const rows = result.data.rows?.map(row => ({
      path: row.dimensionValues[0].value,
      views: row.metricValues[0].value
    })) || [];

    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('❌ Top Pages API error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 📈 Session metrics
app.get('/api/analytics/session-metrics', async (req, res) => {
  try {
    const startDate = req.query.start || '7daysAgo';
    const endDate = req.query.end || 'today';

    const auth = new google.auth.GoogleAuth({
      keyFile: process.env.GA_CREDENTIALS_PATH,
      scopes: ['https://www.googleapis.com/auth/analytics.readonly'],
    });

    const client = await auth.getClient();
    const analyticsDataClient = google.analyticsdata('v1beta');

    const result = await analyticsDataClient.properties.runReport({
      property: `properties/${process.env.GA_PROPERTY_ID}`,
      requestBody: {
        dateRanges: [{ startDate, endDate }],
        metrics: [
          { name: 'bounceRate' },
          { name: 'averageSessionDuration' },
          { name: 'engagedSessions' },
          { name: 'sessions' }
        ]
      },
      auth: client,
    });

    const metrics = result.data.rows?.[0]?.metricValues || [];

    res.json({
      success: true,
      data: {
        bounceRate: parseFloat(metrics[0]?.value || 0).toFixed(2),
        avgSessionDuration: parseFloat(metrics[1]?.value || 0).toFixed(0),
        engagedSessions: metrics[2]?.value || 0,
        totalSessions: metrics[3]?.value || 0
      }
    });
  } catch (error) {
    console.error('❌ Session Metrics API error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 🌍 Realtime country data
app.get('/api/realtime/geo', async (req, res) => {
  try {
    const auth = new google.auth.GoogleAuth({
      keyFile: process.env.GA_CREDENTIALS_PATH,
      scopes: ['https://www.googleapis.com/auth/analytics.readonly'],
    });

    const client = await auth.getClient();
    const analyticsDataClient = google.analyticsdata('v1beta');

    const result = await analyticsDataClient.properties.runRealtimeReport({
      property: `properties/${process.env.GA_PROPERTY_ID}`,
      requestBody: {
        dimensions: [{ name: 'country' }],
        metrics: [{ name: 'activeUsers' }],
        orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
        limit: 5
      },
      auth: client,
    });

    const data = result.data.rows?.map(row => ({
      country: row.dimensionValues[0].value,
      users: row.metricValues[0].value
    })) || [];

    res.json({ success: true, data });
  } catch (error) {
    console.error('❌ Realtime Geo API error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 🧍 Realtime user count
app.get('/api/realtime', async (req, res) => {
  try {
    const auth = new google.auth.GoogleAuth({
      keyFile: process.env.GA_CREDENTIALS_PATH,
      scopes: ['https://www.googleapis.com/auth/analytics.readonly'],
    });

    const client = await auth.getClient();
    const analyticsDataClient = google.analyticsdata('v1beta');

    const result = await analyticsDataClient.properties.runRealtimeReport({
      property: `properties/${process.env.GA_PROPERTY_ID}`,
      requestBody: {
        metrics: [{ name: 'activeUsers' }]
      },
      auth: client,
    });

    const count = result.data.rows?.[0]?.metricValues?.[0]?.value || '0';
    res.json({ success: true, count });
  } catch (error) {
    console.error('❌ Realtime count error:', error.message);
    res.status(500).json({ success: false, count: 0 });
  }
});

// 📡 Radar scraper: Google mentions of Gary Gabel / The Constitution Kids
async function refreshRadarCache() {
  const terms = ['Gary Gabel', 'The Constitution Kids'];
  const results = [];

  try {
    for (const term of terms) {
      const query = encodeURIComponent(term);
      const response = await fetch(`https://www.google.com/search?q=${query}&hl=en`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (CommandRadarBot)'
        }
      });

      const html = await response.text();
      const $ = cheerio.load(html);

      $('a h3').each((i, el) => {
        const title = $(el).text();
        const link = $(el).parent().attr('href');

        if (title && link && !link.startsWith('/')) {
          results.push({
            source: 'Google',
            title,
            url: link,
            date: new Date().toISOString()
          });
        }
      });
    }

    latestRadarResults = results.slice(0, 15);
    console.log(`📡 Radar cache refreshed: ${latestRadarResults.length} items`);
  } catch (err) {
    console.error('❌ Radar scraping failed:', err.message);
  }
}

// ✅ Serve cached radar results
app.get('/api/radar/google', (req, res) => {
  res.json({ success: true, data: latestRadarResults });
});

// ✅ Initial run
refreshRadarCache();

// ✅ Refresh daily at 8am
schedule.scheduleJob('0 8 * * *', () => {
  console.log('🔁 Daily radar refresh starting...');
  refreshRadarCache();
});

// ✅ Launch server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
