/**
 * SyntexHub Project Suite - Expense Tracker Module
 * State management, form validation, Canvas donut chart, monthly analytics, CSV export, mock API sync.
 */

document.addEventListener('DOMContentLoaded', () => {
  ExpenseTracker.init();
});

const ExpenseTracker = {
  state: {
    transactions: [],
    searchQuery: '',
    categoryFilter: 'all',
    typeFilter: 'all',
    sortBy: 'date-desc',
    editingId: null
  },

  // Color palette for category breakdowns
  CATEGORY_COLORS: {
    'Salary': '#10B981',
    'Freelance': '#06B6D4',
    'Investment': '#8B5CF6',
    'Housing': '#F43F5E',
    'Food & Dining': '#F59E0B',
    'Utilities': '#3B82F6',
    'Health': '#EC4899',
    'Entertainment': '#A855F7',
    'Shopping': '#6366F1',
    'Transport': '#14B8A6',
    'Other': '#64748B'
  },

  init() {
    this.state.transactions = Storage.getExpenses();
    this.bindEvents();
    this.render();

    // Re-draw chart on theme change
    window.addEventListener('themeChanged', () => {
      this.drawCategoryChart();
    });
  },

  bindEvents() {
    // Add Transaction Form
    const txForm = document.getElementById('transaction-form');
    if (txForm) {
      txForm.addEventListener('submit', (e) => this.handleFormSubmit(e));
    }

    // Edit Transaction Form in Modal
    const editForm = document.getElementById('edit-transaction-form');
    if (editForm) {
      editForm.addEventListener('submit', (e) => this.handleEditSubmit(e));
    }

    // Modal Edit Type Radios
    const editTypeRadios = document.querySelectorAll('input[name="edit-tx-type"]');
    editTypeRadios.forEach(radio => {
      radio.addEventListener('change', (e) => {
        const labelExp = document.getElementById('edit-label-expense');
        const labelInc = document.getElementById('edit-label-income');
        if (labelExp) labelExp.classList.toggle('selected-expense', e.target.value === 'expense');
        if (labelInc) labelInc.classList.toggle('selected-income', e.target.value === 'income');
      });
    });

    // Type radio toggle buttons
    const typeRadios = document.querySelectorAll('input[name="tx-type"]');
    typeRadios.forEach(radio => {
      radio.addEventListener('change', (e) => {
        document.querySelectorAll('.type-radio-label').forEach(l => {
          l.classList.remove('selected-income', 'selected-expense');
        });
        const parent = radio.closest('.type-radio-label');
        if (e.target.value === 'income') parent.classList.add('selected-income');
        else parent.classList.add('selected-expense');
      });
    });

    // Search input (debounced)
    const searchInput = document.getElementById('tx-search');
    if (searchInput) {
      searchInput.addEventListener('input', Utils.debounce((e) => {
        this.state.searchQuery = e.target.value.trim().toLowerCase();
        this.renderTable();
      }, 250));
    }

    // Category Filter
    const catFilter = document.getElementById('filter-category');
    if (catFilter) {
      catFilter.addEventListener('change', (e) => {
        this.state.categoryFilter = e.target.value;
        this.renderTable();
      });
    }

    // Type Filter
    const typeFilter = document.getElementById('filter-type');
    if (typeFilter) {
      typeFilter.addEventListener('change', (e) => {
        this.state.typeFilter = e.target.value;
        this.renderTable();
      });
    }

    // Sort By
    const sortSelect = document.getElementById('sort-transactions');
    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        this.state.sortBy = e.target.value;
        this.renderTable();
      });
    }

    // CSV Export
    const csvBtn = document.getElementById('btn-export-csv');
    if (csvBtn) {
      csvBtn.addEventListener('click', () => this.exportCSV());
    }

    // Load Demo Data
    const loadDemoBtn = document.getElementById('btn-load-demo');
    if (loadDemoBtn) {
      loadDemoBtn.addEventListener('click', () => {
        this.state.transactions = Storage.loadDemoExpenses();
        this.render();
        Utils.showToast({ message: 'Sample financial transactions loaded.', type: 'success' });
      });
    }

    // Clear All
    const clearBtn = document.getElementById('btn-clear-all');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        Utils.confirm({
          title: 'Clear All Transactions',
          message: 'Are you sure you want to delete all financial records? This cannot be undone.',
          confirmText: 'Clear All',
          confirmVariant: 'danger',
          onConfirm: () => {
            this.state.transactions = [];
            Storage.clearExpenses();
            this.render();
            Utils.showToast({ message: 'All transactions cleared.', type: 'info' });
          }
        });
      });
    }

    // Mock API Sync Simulation
    const syncBtn = document.getElementById('btn-sync-cloud');
    if (syncBtn) {
      syncBtn.addEventListener('click', () => this.simulateCloudSync());
    }

    // Event delegation for Edit and Delete buttons on table
    const tableBody = document.getElementById('transactions-table-body');
    if (tableBody) {
      tableBody.addEventListener('click', (e) => {
        const editBtn = e.target.closest('[data-edit-id]');
        if (editBtn) {
          const id = editBtn.getAttribute('data-edit-id');
          this.openEditModal(id);
          return;
        }

        const deleteBtn = e.target.closest('[data-delete-id]');
        if (deleteBtn) {
          const id = deleteBtn.getAttribute('data-delete-id');
          this.deleteTransaction(id);
          return;
        }
      });
    }

    // Default today's date in form
    const dateInput = document.getElementById('tx-date');
    if (dateInput && !dateInput.value) {
      dateInput.value = new Date().toISOString().split('T')[0];
    }
  },

  handleFormSubmit(e) {
    e.preventDefault();

    const titleInput = document.getElementById('tx-title');
    const amountInput = document.getElementById('tx-amount');
    const typeInput = document.querySelector('input[name="tx-type"]:checked');
    const categoryInput = document.getElementById('tx-category');
    const dateInput = document.getElementById('tx-date');
    const notesInput = document.getElementById('tx-notes');

    // Validation
    let isValid = true;

    if (!titleInput.value.trim()) {
      this.setInputError(titleInput, 'Transaction title is required');
      isValid = false;
    } else {
      this.clearInputError(titleInput);
    }

    const amount = parseFloat(amountInput.value);
    if (isNaN(amount) || amount <= 0) {
      this.setInputError(amountInput, 'Enter a valid amount greater than 0');
      isValid = false;
    } else {
      this.clearInputError(amountInput);
    }

    if (!dateInput.value) {
      this.setInputError(dateInput, 'Date is required');
      isValid = false;
    } else {
      this.clearInputError(dateInput);
    }

    if (!isValid) return;

    if (this.state.editingId) {
      // Update existing
      const index = this.state.transactions.findIndex(t => t.id === this.state.editingId);
      if (index !== -1) {
        this.state.transactions[index] = {
          ...this.state.transactions[index],
          title: titleInput.value.trim(),
          amount: amount,
          type: typeInput ? typeInput.value : 'expense',
          category: categoryInput.value,
          date: dateInput.value,
          notes: notesInput.value.trim()
        };
        Storage.saveExpenses(this.state.transactions);
        Utils.showToast({ message: 'Transaction updated successfully!', type: 'success' });
      }
      this.state.editingId = null;
      document.getElementById('transaction-modal').classList.remove('active');
    } else {
      // Create new
      const newTx = {
        id: Utils.generateId(),
        title: titleInput.value.trim(),
        amount: amount,
        type: typeInput ? typeInput.value : 'expense',
        category: categoryInput.value,
        date: dateInput.value,
        notes: notesInput.value.trim()
      };

      this.state.transactions.unshift(newTx);
      Storage.saveExpenses(this.state.transactions);
      Utils.showToast({ message: 'New transaction logged.', type: 'success' });
      e.target.reset();
      dateInput.value = new Date().toISOString().split('T')[0];
      // Reset radio styling
      document.querySelectorAll('.type-radio-label').forEach(l => l.classList.remove('selected-income', 'selected-expense'));
      const expRadio = document.querySelector('input[name="tx-type"][value="expense"]');
      if (expRadio) {
        expRadio.checked = true;
        expRadio.closest('.type-radio-label').classList.add('selected-expense');
      }
    }

    this.render();
  },

  setInputError(inputEl, message) {
    const group = inputEl.closest('.form-group');
    if (!group) return;
    group.classList.add('has-error');
    let err = group.querySelector('.form-error-msg');
    if (!err) {
      err = document.createElement('span');
      err.className = 'form-error-msg';
      group.appendChild(err);
    }
    err.textContent = message;
    err.style.display = 'block';
  },

  clearInputError(inputEl) {
    const group = inputEl.closest('.form-group');
    if (!group) return;
    group.classList.remove('has-error');
    const err = group.querySelector('.form-error-msg');
    if (err) err.style.display = 'none';
  },

  openEditModal(id) {
    const tx = this.state.transactions.find(t => t.id === id);
    if (!tx) return;

    this.state.editingId = id;

    const modal = document.getElementById('transaction-modal');
    if (!modal) return;

    document.getElementById('edit-tx-id').value = tx.id;
    document.getElementById('edit-tx-title').value = tx.title;
    document.getElementById('edit-tx-amount').value = tx.amount;
    document.getElementById('edit-tx-category').value = tx.category;
    document.getElementById('edit-tx-date').value = tx.date;
    document.getElementById('edit-tx-notes').value = tx.notes || '';

    const radio = document.querySelector(`input[name="edit-tx-type"][value="${tx.type}"]`);
    if (radio) {
      radio.checked = true;
      const labelExp = document.getElementById('edit-label-expense');
      const labelInc = document.getElementById('edit-label-income');
      if (labelExp) labelExp.classList.toggle('selected-expense', tx.type === 'expense');
      if (labelInc) labelInc.classList.toggle('selected-income', tx.type === 'income');
    }

    modal.classList.add('active');
  },

  handleEditSubmit(e) {
    e.preventDefault();

    const id = document.getElementById('edit-tx-id').value;
    const title = document.getElementById('edit-tx-title').value.trim();
    const amount = parseFloat(document.getElementById('edit-tx-amount').value);
    const category = document.getElementById('edit-tx-category').value;
    const date = document.getElementById('edit-tx-date').value;
    const notes = document.getElementById('edit-tx-notes').value.trim();
    const typeRadio = document.querySelector('input[name="edit-tx-type"]:checked');
    const type = typeRadio ? typeRadio.value : 'expense';

    if (!title || isNaN(amount) || amount <= 0 || !date) {
      Utils.showToast({ message: 'Please provide valid values for all required fields.', type: 'error' });
      return;
    }

    const index = this.state.transactions.findIndex(t => t.id === id);
    if (index !== -1) {
      this.state.transactions[index] = {
        ...this.state.transactions[index],
        title,
        amount,
        type,
        category,
        date,
        notes
      };
      Storage.saveExpenses(this.state.transactions);
      this.render();
      Utils.showToast({ message: 'Transaction successfully updated.', type: 'success' });
    }

    const modal = document.getElementById('transaction-modal');
    if (modal) modal.classList.remove('active');
  },

  deleteTransaction(id) {
    const tx = this.state.transactions.find(t => t.id === id);
    if (!tx) return;

    Utils.confirm({
      title: 'Delete Transaction',
      message: `Are you sure you want to delete "${tx.title}" ($${tx.amount})?`,
      confirmText: 'Delete',
      confirmVariant: 'danger',
      onConfirm: () => {
        const deletedIndex = this.state.transactions.findIndex(t => t.id === id);
        const [deletedItem] = this.state.transactions.splice(deletedIndex, 1);
        Storage.saveExpenses(this.state.transactions);
        this.render();

        // Undo capability
        Utils.showToast({
          message: `Deleted "${deletedItem.title}".`,
          type: 'warning',
          action: {
            label: 'Undo',
            onClick: () => {
              this.state.transactions.splice(deletedIndex, 0, deletedItem);
              Storage.saveExpenses(this.state.transactions);
              this.render();
              Utils.showToast({ message: 'Transaction restored.', type: 'success' });
            }
          }
        });
      }
    });
  },

  getFilteredTransactions() {
    let list = [...this.state.transactions];

    // Filter by type
    if (this.state.typeFilter !== 'all') {
      list = list.filter(t => t.type === this.state.typeFilter);
    }

    // Filter by category
    if (this.state.categoryFilter !== 'all') {
      list = list.filter(t => t.category === this.state.categoryFilter);
    }

    // Filter by search query
    if (this.state.searchQuery) {
      const q = this.state.searchQuery;
      list = list.filter(t =>
        t.title.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q) ||
        (t.notes && t.notes.toLowerCase().includes(q))
      );
    }

    // Sorting
    switch (this.state.sortBy) {
      case 'date-desc':
        list.sort((a, b) => new Date(b.date) - new Date(a.date));
        break;
      case 'date-asc':
        list.sort((a, b) => new Date(a.date) - new Date(b.date));
        break;
      case 'amount-desc':
        list.sort((a, b) => b.amount - a.amount);
        break;
      case 'amount-asc':
        list.sort((a, b) => a.amount - b.amount);
        break;
      default:
        list.sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    return list;
  },

  render() {
    this.renderStats();
    this.renderTable();
    this.drawCategoryChart();
    this.renderMonthlyBars();
  },

  renderStats() {
    let totalIncome = 0;
    let totalExpense = 0;

    this.state.transactions.forEach(t => {
      const amt = Number(t.amount) || 0;
      if (t.type === 'income') totalIncome += amt;
      else totalExpense += amt;
    });

    const netBalance = totalIncome - totalExpense;
    const savingsRate = totalIncome > 0 ? Math.max(0, Math.round(((totalIncome - totalExpense) / totalIncome) * 100)) : 0;

    const netEl = document.getElementById('stat-net-balance');
    const incomeEl = document.getElementById('stat-total-income');
    const expenseEl = document.getElementById('stat-total-expense');
    const savingsEl = document.getElementById('stat-savings-rate');

    if (netEl) {
      netEl.textContent = Utils.formatCurrency(netBalance);
      netEl.style.color = netBalance >= 0 ? '#34D399' : '#FB7185';
    }
    if (incomeEl) incomeEl.textContent = Utils.formatCurrency(totalIncome);
    if (expenseEl) expenseEl.textContent = Utils.formatCurrency(totalExpense);
    if (savingsEl) savingsEl.textContent = `${savingsRate}%`;
  },

  renderTable() {
    const tbody = document.getElementById('transactions-table-body');
    const countEl = document.getElementById('filter-results-count');
    if (!tbody) return;

    const filtered = this.getFilteredTransactions();
    if (countEl) countEl.textContent = `${filtered.length} of ${this.state.transactions.length} records`;

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6">
            <div class="empty-state" style="padding: 2.5rem 1rem;">
              <div class="empty-state-icon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
              </div>
              <h4 class="empty-state-title">No transactions found</h4>
              <p class="empty-state-text">No records match your active search or filter criteria.</p>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = filtered.map(tx => {
      const isIncome = tx.type === 'income';
      const categoryColor = this.CATEGORY_COLORS[tx.category] || '#64748B';

      return `
        <tr>
          <td>
            <span class="badge ${isIncome ? 'badge-income' : 'badge-expense'}">
              ${isIncome ? 'Income' : 'Expense'}
            </span>
          </td>
          <td>
            <div class="tx-title-group">
              <span class="tx-title">${Utils.escapeHTML(tx.title)}</span>
              ${tx.notes ? `<span class="tx-notes">${Utils.escapeHTML(tx.notes)}</span>` : ''}
            </div>
          </td>
          <td>
            <span style="display: inline-flex; align-items: center; gap: 0.35rem; font-size: 0.85rem; font-weight: 500;">
              <span style="width: 8px; height: 8px; border-radius: 50%; background: ${categoryColor};"></span>
              ${Utils.escapeHTML(tx.category)}
            </span>
          </td>
          <td>
            <span style="font-size: 0.85rem; color: var(--text-secondary);">${Utils.formatDate(tx.date)}</span>
          </td>
          <td>
            <span class="tx-amount ${isIncome ? 'income' : 'expense'}">
              ${isIncome ? '+' : '-'}${Utils.formatCurrency(tx.amount)}
            </span>
          </td>
          <td>
            <div class="tx-actions">
              <button class="action-btn" data-edit-id="${tx.id}" title="Edit transaction" aria-label="Edit">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
              </button>
              <button class="action-btn delete" data-delete-id="${tx.id}" title="Delete transaction" aria-label="Delete">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  },

  drawCategoryChart() {
    const canvas = document.getElementById('categoryChartCanvas');
    const legendContainer = document.getElementById('chart-legend-container');
    const centerAmountEl = document.getElementById('chart-center-amount');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const size = 200;

    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    // Compute category expenses
    const categoryTotals = {};
    let totalExpense = 0;

    this.state.transactions.forEach(t => {
      if (t.type === 'expense') {
        const amt = Number(t.amount) || 0;
        categoryTotals[t.category] = (categoryTotals[t.category] || 0) + amt;
        totalExpense += amt;
      }
    });

    if (centerAmountEl) {
      centerAmountEl.textContent = Utils.formatCurrency(totalExpense);
    }

    const categories = Object.keys(categoryTotals);

    // Empty state on canvas if no expenses
    if (totalExpense === 0 || categories.length === 0) {
      ctx.clearRect(0, 0, size, size);
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, 75, 0, 2 * Math.PI);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 20;
      ctx.stroke();

      if (legendContainer) {
        legendContainer.innerHTML = '<p style="font-size: 0.85rem; color: var(--text-muted);">No expense entries logged.</p>';
      }
      return;
    }

    // Draw Donut segments
    const centerX = size / 2;
    const centerY = size / 2;
    const radius = 75;
    const lineWidth = 22;
    let startAngle = -Math.PI / 2;

    ctx.clearRect(0, 0, size, size);

    categories.forEach(cat => {
      const sliceAngle = (categoryTotals[cat] / totalExpense) * 2 * Math.PI;
      const endAngle = startAngle + sliceAngle;
      const color = this.CATEGORY_COLORS[cat] || '#818CF8';

      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.lineCap = 'butt';
      ctx.stroke();

      startAngle = endAngle;
    });

    // Render HTML Legend
    if (legendContainer) {
      legendContainer.innerHTML = categories
        .sort((a, b) => categoryTotals[b] - categoryTotals[a])
        .slice(0, 5)
        .map(cat => {
          const amt = categoryTotals[cat];
          const pct = Math.round((amt / totalExpense) * 100);
          const color = this.CATEGORY_COLORS[cat] || '#818CF8';
          return `
            <div class="legend-item">
              <div class="legend-color-tag">
                <span class="legend-dot" style="background: ${color};"></span>
                <span>${Utils.escapeHTML(cat)} (${pct}%)</span>
              </div>
              <span class="legend-val">${Utils.formatCurrency(amt)}</span>
            </div>
          `;
        }).join('');
    }
  },

  renderMonthlyBars() {
    const container = document.getElementById('monthly-bars-container');
    if (!container) return;

    // Aggregate spending and income for the last 5 months
    const now = new Date();
    const months = [];

    for (let i = 4; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const name = d.toLocaleString('en-US', { month: 'short' });
      months.push({ key, name, income: 0, expense: 0 });
    }

    this.state.transactions.forEach(t => {
      const txMonth = t.date.substring(0, 7);
      const match = months.find(m => m.key === txMonth);
      if (match) {
        if (t.type === 'income') match.income += Number(t.amount);
        else match.expense += Number(t.amount);
      }
    });

    const maxVal = Math.max(...months.map(m => Math.max(m.income, m.expense)), 1000);

    container.innerHTML = months.map(m => {
      const incomeHeight = Math.max(4, Math.round((m.income / maxVal) * 75));
      const expenseHeight = Math.max(4, Math.round((m.expense / maxVal) * 75));

      return `
        <div class="monthly-bar-col">
          <div class="bar-track" title="${m.name}: In +$${m.income} | Out -$${m.expense}">
            <div class="bar-fill-income" style="height: ${incomeHeight}px;"></div>
            <div class="bar-fill-expense" style="height: ${expenseHeight}px;"></div>
          </div>
          <span class="bar-label">${m.name}</span>
        </div>
      `;
    }).join('');
  },

  exportCSV() {
    const transactions = this.getFilteredTransactions();
    if (transactions.length === 0) {
      Utils.showToast({ message: 'No transactions to export.', type: 'warning' });
      return;
    }

    const headers = ['ID', 'Title', 'Type', 'Category', 'Amount', 'Date', 'Notes'];
    const rows = transactions.map(t => [
      `"${t.id}"`,
      `"${(t.title || '').replace(/"/g, '""')}"`,
      `"${t.type}"`,
      `"${t.category}"`,
      t.amount,
      `"${t.date}"`,
      `"${(t.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    Utils.downloadFile(csvContent, `syntexhub_expenses_${Date.now()}.csv`, 'text/csv;charset=utf-8;');
    Utils.showToast({ message: 'CSV exported successfully.', type: 'success' });
  },

  async simulateCloudSync() {
    const btn = document.getElementById('btn-sync-cloud');
    const statusText = document.getElementById('sync-status-text');
    if (!btn) return;

    btn.disabled = true;
    btn.innerHTML = `
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation: spin 1s infinite linear;"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
      <span>Syncing...</span>
    `;
    if (statusText) statusText.textContent = 'Synchronizing with remote cloud mock API...';

    try {
      // Perform mock API request using JSONPlaceholder with fetch
      const res = await fetch('https://jsonplaceholder.typicode.com/posts/1');
      if (!res.ok) throw new Error('Network error during sync');
      await res.json();

      // Simulated network processing
      await new Promise(r => setTimeout(r, 600));

      Utils.showToast({ message: 'Cloud database synchronized seamlessly.', type: 'success' });
      if (statusText) statusText.textContent = `All ${this.state.transactions.length} records backed up to cloud.`;
    } catch (err) {
      Utils.showToast({ message: 'Failed to sync with mock endpoint. Changes saved locally.', type: 'error' });
      if (statusText) statusText.textContent = 'Sync failed. Local storage preserved.';
    } finally {
      btn.disabled = false;
      btn.innerHTML = `
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>
        <span>Sync Cloud</span>
      `;
    }
  }
};

window.ExpenseTracker = ExpenseTracker;
