/**
 * SyntexHub Project Suite - Main Dashboard Controller
 * Dynamic statistics, recent combined activity feed, quick weather glance, demo data reset.
 */

document.addEventListener('DOMContentLoaded', () => {
  Dashboard.init();
});

const Dashboard = {
  init() {
    this.updateGreeting();
    this.renderStats();
    this.renderRecentActivity();
    this.fetchWeatherGlance();
    this.initQuickActions();
  },

  updateGreeting() {
    const greetingEl = document.getElementById('hero-greeting');
    const dateEl = document.getElementById('current-date-text');
    if (!greetingEl) return;

    const hour = new Date().getHours();
    let text = 'Welcome back';
    if (hour < 12) text = 'Good morning';
    else if (hour < 18) text = 'Good afternoon';
    else text = 'Good evening';

    greetingEl.textContent = `${text}, Developer`;

    if (dateEl) {
      dateEl.textContent = new Intl.DateTimeFormat('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      }).format(new Date());
    }
  },

  renderStats() {
    // 1. Finance Stats
    const expenses = Storage.getExpenses();
    let totalIncome = 0;
    let totalExpense = 0;

    expenses.forEach(item => {
      const amt = parseFloat(item.amount) || 0;
      if (item.type === 'income') totalIncome += amt;
      else totalExpense += amt;
    });

    const netBalance = totalIncome - totalExpense;

    const balanceEl = document.getElementById('stat-net-balance');
    const expCountEl = document.getElementById('stat-expenses-count');
    if (balanceEl) balanceEl.textContent = Utils.formatCurrency(netBalance);
    if (expCountEl) expCountEl.textContent = `${expenses.length} logged transactions`;

    // 2. Notes Stats
    const notes = Storage.getNotes();
    const pinnedCount = notes.filter(n => n.pinned).length;

    const notesCountEl = document.getElementById('stat-notes-count');
    const notesSubEl = document.getElementById('stat-notes-sub');
    if (notesCountEl) notesCountEl.textContent = notes.length;
    if (notesSubEl) notesSubEl.textContent = `${pinnedCount} pinned notes`;

    // 3. Update counter badges in sidebar
    const badgeExp = document.getElementById('sidebar-badge-expenses');
    const badgeNotes = document.getElementById('sidebar-badge-notes');
    if (badgeExp) badgeExp.textContent = expenses.length;
    if (badgeNotes) badgeNotes.textContent = notes.length;
  },

  renderRecentActivity() {
    const container = document.getElementById('recent-activity-list');
    if (!container) return;

    const expenses = Storage.getExpenses();
    const notes = Storage.getNotes();

    // Map into unified activity items
    const activities = [];

    expenses.forEach(exp => {
      activities.push({
        type: 'expense',
        subType: exp.type,
        title: exp.title,
        detail: `${exp.category} • ${exp.type === 'income' ? '+' : '-'}${Utils.formatCurrency(exp.amount)}`,
        date: new Date(exp.date),
        icon: exp.type === 'income' ? '↗' : '↘',
        badgeColor: exp.type === 'income' ? 'var(--accent-emerald)' : 'var(--accent-rose)'
      });
    });

    notes.forEach(note => {
      activities.push({
        type: 'note',
        subType: 'note',
        title: note.title,
        detail: `Note saved • ${note.category}`,
        date: new Date(note.updatedAt || note.createdAt),
        icon: '📝',
        badgeColor: 'var(--primary)'
      });
    });

    // Sort newest first
    activities.sort((a, b) => b.date - a.date);
    const recent = activities.slice(0, 5);

    if (recent.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="padding: 2rem 1rem;">
          <p class="empty-state-text">No recent activity yet. Add an expense or note to get started!</p>
        </div>
      `;
      return;
    }

    container.innerHTML = recent.map(item => `
      <div class="activity-item">
        <div class="activity-icon" style="background: rgba(255,255,255,0.06); color: ${item.badgeColor}; font-weight: bold;">
          ${item.icon}
        </div>
        <div class="activity-info">
          <div class="activity-title">${Utils.escapeHTML(item.title)}</div>
          <div class="activity-sub">${Utils.escapeHTML(item.detail)}</div>
        </div>
        <div class="activity-meta" style="color: var(--text-muted); font-size: 0.78rem;">
          ${Utils.timeAgo(item.date)}
        </div>
      </div>
    `).join('');
  },

  async fetchWeatherGlance() {
    const tempEl = document.getElementById('stat-weather-temp');
    const conditionEl = document.getElementById('stat-weather-condition');
    const iconEl = document.getElementById('stat-weather-icon');
    if (!tempEl) return;

    try {
      // Pick first city from recent list or London default
      const recent = Storage.getRecentCities();
      const city = recent[0] || 'London';

      // Geocoding query via Open-Meteo (Free, no API key required)
      const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`;
      const geoRes = await fetch(geoUrl);
      const geoData = await geoRes.json();

      if (geoData.results && geoData.results.length > 0) {
        const { latitude, longitude, name, country } = geoData.results[0];
        const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=auto`;
        const weatherRes = await fetch(weatherUrl);
        const weatherData = await weatherRes.json();

        if (weatherData.current) {
          const tempC = Math.round(weatherData.current.temperature_2m);
          const isF = Storage.getWeatherUnit() === 'fahrenheit';
          const displayTemp = isF ? `${Math.round((tempC * 9/5) + 32)}°F` : `${tempC}°C`;
          const desc = this.getWmoDescription(weatherData.current.weather_code);

          tempEl.textContent = displayTemp;
          if (conditionEl) conditionEl.textContent = `${name} • ${desc}`;
          if (iconEl) iconEl.textContent = this.getWmoIcon(weatherData.current.weather_code);
          return;
        }
      }
      throw new Error('Fallback to demo glance');
    } catch (err) {
      // Graceful fallback preview
      if (tempEl) tempEl.textContent = '22°C';
      if (conditionEl) conditionEl.textContent = 'London • Partly Cloudy';
      if (iconEl) iconEl.textContent = '⛅';
    }
  },

  getWmoDescription(code) {
    const codes = {
      0: 'Clear sky',
      1: 'Mainly clear',
      2: 'Partly cloudy',
      3: 'Overcast',
      45: 'Foggy',
      48: 'Depositing rime fog',
      51: 'Light drizzle',
      61: 'Slight rain',
      63: 'Moderate rain',
      65: 'Heavy rain',
      71: 'Slight snow',
      80: 'Rain showers',
      95: 'Thunderstorm'
    };
    return codes[code] || 'Clear & Sunny';
  },

  getWmoIcon(code) {
    if (code === 0 || code === 1) return '☀️';
    if (code === 2 || code === 3) return '⛅';
    if (code >= 45 && code <= 48) return '🌫️';
    if (code >= 51 && code <= 65) return '🌧️';
    if (code >= 71 && code <= 77) return '❄️';
    if (code >= 80 && code <= 82) return '🌦️';
    if (code >= 95) return '⛈️';
    return '🌤️';
  },

  initQuickActions() {
    const resetBtn = document.getElementById('btn-reset-demo-all');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        Utils.confirm({
          title: 'Reset All Demo Data',
          message: 'This will reset expenses and notes to default rich sample presets. Continue?',
          confirmText: 'Reset Demo Data',
          confirmVariant: 'primary',
          onConfirm: () => {
            Storage.loadDemoExpenses();
            Storage.loadDemoNotes();
            Dashboard.renderStats();
            Dashboard.renderRecentActivity();
            Utils.showToast({ message: 'Default demo datasets loaded successfully.', type: 'success' });
          }
        });
      });
    }

    const exportBtn = document.getElementById('btn-export-backup');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        const bundle = {
          suite: 'SyntexHub Project Suite Backup',
          exportedAt: new Date().toISOString(),
          expenses: Storage.getExpenses(),
          notes: Storage.getNotes(),
          recentCities: Storage.getRecentCities(),
          theme: Storage.getTheme()
        };
        Utils.downloadFile(JSON.stringify(bundle, null, 2), `syntexhub_backup_${Date.now()}.json`, 'application/json');
        Utils.showToast({ message: 'Backup JSON downloaded.', type: 'success' });
      });
    }
  }
};

window.Dashboard = Dashboard;
