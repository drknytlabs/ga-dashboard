document.addEventListener('DOMContentLoaded', () => {
  const liveUsersEl = document.getElementById('liveUsers');
  const dateRangeEl = document.getElementById('dateRange');
  let chart;

  // 🌘 Theme toggle
  document.getElementById('themeToggle')?.addEventListener('click', () => {
    document.body.classList.toggle('dark');
    console.log('🌗 Theme toggled');
  });

  // 📅 Date range picker
  flatpickr(dateRangeEl, {
    mode: 'range',
    dateFormat: 'Y-m-d',
    defaultDate: [
      new Date(new Date().setDate(new Date().getDate() - 7)),
      new Date()
    ],
    onClose: (selectedDates) => {
      if (selectedDates.length === 2) {
        const [start, end] = selectedDates.map(d => d.toISOString().split('T')[0]);
        loadChartByPagePath(start, end);
        loadTopPages(start, end);
        loadSessionMetrics(start, end);
      }
    }
  });

  function loadChartByPagePath(startDate, endDate) {
    fetch(`/api/analytics/by-pagepath?start=${startDate}&end=${endDate}`)
      .then(res => res.json())
      .then(data => {
        if (!data.success) throw new Error('API error');
        if (chart) chart.destroy();

        chart = new Chart(document.getElementById('chart'), {
          type: 'line',
          data: {
            labels: data.labels,
            datasets: data.datasets
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
              duration: 1000,
              easing: 'easeOutCubic'
            },
            plugins: {
              legend: { position: 'top' },
              tooltip: {
                mode: 'index',
                intersect: false,
              }
            },
            scales: {
              x: { title: { display: true, text: 'Date' } },
              y: { title: { display: true, text: 'Views' }, beginAtZero: true }
            }
          }
        });
      })
      .catch(err => console.error('❌ Chart error:', err));
  }

  function loadTopPages(start, end) {
    fetch(`/api/analytics/top-pages?start=${start}&end=${end}`)
      .then(res => res.json())
      .then(data => {
        const list = document.getElementById('topPagesList');
        list.innerHTML = '';
        data.data.forEach(p => {
          const li = document.createElement('li');
          li.textContent = `${p.path} – ${p.views} views`;
          list.appendChild(li);
        });
      });
  }

  function loadGeoRealtime() {
    fetch('/api/realtime/geo')
      .then(res => res.json())
      .then(data => {
        const list = document.getElementById('geoList');
        list.innerHTML = '';
        data.data.forEach(loc => {
          const li = document.createElement('li');
          li.textContent = `${loc.country} – ${loc.users} active`;
          list.appendChild(li);
        });
      });
  }

  function loadSessionMetrics(start, end) {
    fetch(`/api/analytics/session-metrics?start=${start}&end=${end}`)
      .then(res => res.json())
      .then(data => {
        const d = data.data;
        document.getElementById('bounceRate').textContent = d.bounceRate;
        document.getElementById('avgSession').textContent = `${d.avgSessionDuration}s`;
        document.getElementById('engagedSessions').textContent = d.engagedSessions;
        document.getElementById('totalSessions').textContent = d.totalSessions;
      });
  }

  function loadLiveUsers() {
    fetch('/api/realtime')
      .then(res => res.json())
      .then(data => {
        liveUsersEl.textContent = data.count || '0';
      })
      .catch(err => {
        console.error('⚠️ Realtime error:', err);
        liveUsersEl.textContent = 'N/A';
      });
  }

  // 🛰️ Load radar pings
  function loadRadarIntel() {
    fetch('/api/radar/google')
      .then(res => res.json())
      .then(data => {
        const section = document.getElementById('radarFeed');
        section.innerHTML = '';
        if (!data.success || data.data.length === 0) {
          section.innerHTML = '<p>No radar pings found.</p>';
          return;
        }
        data.data.forEach(item => {
          const li = document.createElement('li');
          li.innerHTML = `<a href="${item.url}" target="_blank">${item.source} | ${item.title}</a><br><small>${new Date(item.date).toLocaleString()}</small>`;
          section.appendChild(li);
        });
      })
      .catch(err => {
        console.error('📡 Radar load error:', err);
      });
  }

  // 🖲️ Button triggers
  document.getElementById('realtime-button')?.addEventListener('click', loadGeoRealtime);
  document.getElementById('radar-button')?.addEventListener('click', loadRadarIntel);

  // 🚀 Initial loads
  loadChartByPagePath('7daysAgo', 'today');
  loadTopPages('7daysAgo', 'today');
  loadSessionMetrics('7daysAgo', 'today');
  loadLiveUsers();
  loadGeoRealtime();
  loadRadarIntel();
});