/**
 * SyntexHub Project Suite - Storage Module
 * LocalStorage wrapper with schema validation, error handling, and demo data presets.
 */

const Storage = {
  KEYS: {
    THEME: 'syntexhub_theme',
    EXPENSES: 'syntexhub_expenses',
    NOTES: 'syntexhub_notes',
    WEATHER_RECENT: 'syntexhub_weather_recent',
    WEATHER_UNIT: 'syntexhub_weather_unit',
    WEATHER_DEMO_MODE: 'syntexhub_weather_demo'
  },

  /**
   * Safe getter with JSON parsing
   */
  get(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(key);
      if (item === null || item === undefined) return defaultValue;
      return JSON.parse(item);
    } catch (err) {
      console.warn(`[Storage] Failed to read key "${key}":`, err);
      return defaultValue;
    }
  },

  /**
   * Safe setter with JSON stringification
   */
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (err) {
      console.error(`[Storage] Failed to write key "${key}":`, err);
      if (window.Utils && Utils.showToast) {
        Utils.showToast({ message: 'Storage quota exceeded or disabled.', type: 'error' });
      }
      return false;
    }
  },

  /**
   * Remove item
   */
  remove(key) {
    try {
      localStorage.removeItem(key);
    } catch (err) {
      console.warn(`[Storage] Failed to delete key "${key}":`, err);
    }
  },

  // ================= EXPENSES API =================
  getExpenses() {
    const data = this.get(this.KEYS.EXPENSES, null);
    if (!data || !Array.isArray(data)) {
      return this.loadDemoExpenses();
    }
    return data;
  },

  saveExpenses(expenses) {
    return this.set(this.KEYS.EXPENSES, expenses);
  },

  loadDemoExpenses() {
    const demo = [
      {
        id: 'exp_1',
        title: 'Monthly Tech Salary',
        amount: 4500.00,
        type: 'income',
        category: 'Salary',
        date: new Date(Date.now() - 86400000 * 2).toISOString().split('T')[0],
        notes: 'Primary employment monthly direct deposit'
      },
      {
        id: 'exp_2',
        title: 'Apartment Luxury Rent',
        amount: 1400.00,
        type: 'expense',
        category: 'Housing',
        date: new Date(Date.now() - 86400000 * 3).toISOString().split('T')[0],
        notes: 'Downtown studio apartment rent'
      },
      {
        id: 'exp_3',
        title: 'Whole Foods Groceries',
        amount: 168.45,
        type: 'expense',
        category: 'Food & Dining',
        date: new Date(Date.now() - 86400000 * 4).toISOString().split('T')[0],
        notes: 'Organic produce, berries, coffee beans'
      },
      {
        id: 'exp_4',
        title: 'UI/UX Consulting Project',
        amount: 1250.00,
        type: 'income',
        category: 'Freelance',
        date: new Date(Date.now() - 86400000 * 6).toISOString().split('T')[0],
        notes: 'Client milestone for SaaS redesign'
      },
      {
        id: 'exp_5',
        title: 'Equinox Gym & Spa',
        amount: 120.00,
        type: 'expense',
        category: 'Health',
        date: new Date(Date.now() - 86400000 * 8).toISOString().split('T')[0],
        notes: 'Monthly fitness pass'
      },
      {
        id: 'exp_6',
        title: 'Cloud VPS & Subscriptions',
        amount: 64.99,
        type: 'expense',
        category: 'Utilities',
        date: new Date(Date.now() - 86400000 * 11).toISOString().split('T')[0],
        notes: 'Server hosting & productivity tools'
      },
      {
        id: 'exp_7',
        title: 'Dinner at Nobu Restaurant',
        amount: 142.50,
        type: 'expense',
        category: 'Entertainment',
        date: new Date(Date.now() - 86400000 * 14).toISOString().split('T')[0],
        notes: 'Team celebration dinner'
      }
    ];
    this.saveExpenses(demo);
    return demo;
  },

  clearExpenses() {
    this.saveExpenses([]);
  },

  // ================= NOTES API =================
  getNotes() {
    const data = this.get(this.KEYS.NOTES, null);
    if (!data || !Array.isArray(data)) {
      return this.loadDemoNotes();
    }
    return data;
  },

  saveNotes(notes) {
    return this.set(this.KEYS.NOTES, notes);
  },

  loadDemoNotes() {
    const demo = [
      {
        id: 'note_1',
        title: '🚀 Q4 Frontend Architecture Roadmap',
        content: `Key objectives for the upcoming sprint release:
1. Complete conversion of design tokens to CSS custom properties.
2. Ensure AAA contrast levels across dark and light themes.
3. Optimize Core Web Vitals to achieve 98+ Lighthouse score.
4. Implement automated offline fallback with localStorage caching.
5. Polish micro-interactions on button hover and card elevations.`,
        category: 'Work',
        color: 'indigo',
        pinned: true,
        createdAt: new Date(Date.now() - 86400000 * 1).toISOString(),
        updatedAt: new Date(Date.now() - 3600000 * 2).toISOString()
      },
      {
        id: 'note_2',
        title: '💡 Design System Principles & Ideas',
        content: `Design Guidelines:
- Primary palette: Deep Navy (#0F172A), Royal Indigo (#4F46E5), Violet (#7C3AED).
- Secondary accents: Cyan (#06B6D4) and Emerald (#10B981) for positive statistics.
- Use subtle border glow (1px solid rgba(255, 255, 255, 0.08)) for glassmorphism.
- Buttons should feel responsive with 150ms transform scale micro-press.`,
        category: 'Design',
        color: 'purple',
        pinned: true,
        createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
        updatedAt: new Date(Date.now() - 86400000 * 2).toISOString()
      },
      {
        id: 'note_3',
        title: '🛒 Weekly High-Protein Grocery Checklist',
        content: `- Wild caught Alaskan Salmon fillets
- Steel cut oats & almond butter
- Greek yogurt (0% fat, plain)
- Fresh blueberries, raspberries, avocados
- Cold brew coffee concentrate & oat milk
- Baby spinach & microgreens`,
        category: 'Personal',
        color: 'emerald',
        pinned: false,
        createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
        updatedAt: new Date(Date.now() - 86400000 * 4).toISOString()
      },
      {
        id: 'note_4',
        title: '📚 Weekly Reading & Research List',
        content: `Books & papers to study this month:
- Refactoring UI by Adam Wathan & Steve Schoger
- Designing Data-Intensive Applications
- Web Performance in Action
- High-Performance Browser Networking`,
        category: 'Study',
        color: 'amber',
        pinned: false,
        createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
        updatedAt: new Date(Date.now() - 86400000 * 6).toISOString()
      }
    ];
    this.saveNotes(demo);
    return demo;
  },

  clearNotes() {
    this.saveNotes([]);
  },

  // ================= WEATHER PREFERENCES =================
  getRecentCities() {
    return this.get(this.KEYS.WEATHER_RECENT, ['London', 'New York', 'Tokyo', 'San Francisco', 'Paris']);
  },

  addRecentCity(cityName) {
    if (!cityName) return;
    const cleanName = cityName.trim();
    let list = this.getRecentCities();
    list = [cleanName, ...list.filter(c => c.toLowerCase() !== cleanName.toLowerCase())].slice(0, 6);
    this.set(this.KEYS.WEATHER_RECENT, list);
    return list;
  },

  getWeatherUnit() {
    return this.get(this.KEYS.WEATHER_UNIT, 'celsius'); // 'celsius' or 'fahrenheit'
  },

  setWeatherUnit(unit) {
    return this.set(this.KEYS.WEATHER_UNIT, unit);
  },

  isWeatherDemoMode() {
    return this.get(this.KEYS.WEATHER_DEMO_MODE, false);
  },

  setWeatherDemoMode(isDemo) {
    return this.set(this.KEYS.WEATHER_DEMO_MODE, isDemo);
  },

  // ================= THEME =================
  getTheme() {
    const saved = this.get(this.KEYS.THEME, null);
    if (saved) return saved;
    // Default to dark mode for fintech/saas aesthetic
    return 'dark';
  },

  setTheme(theme) {
    return this.set(this.KEYS.THEME, theme);
  }
};

window.Storage = Storage;
