/**
 * SyntexHub Project Suite - Utility Functions
 * Reusable, safe, performant helper routines for all modules.
 */

const Utils = {
  /**
   * Escape untrusted text to prevent XSS attacks when inserting into DOM
   * @param {string} str - Raw input text
   * @returns {string} Sanitized text
   */
  escapeHTML(str) {
    if (str === null || str === undefined) return '';
    const div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
  },

  /**
   * Format numbers as currency
   * @param {number} amount
   * @param {string} [currency='USD']
   * @returns {string} Formatted currency string
   */
  formatCurrency(amount, currency = 'USD') {
    const num = Number(amount) || 0;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(num);
  },

  /**
   * Format date strings or timestamps into human-readable format
   * @param {string|number|Date} dateInput
   * @param {Intl.DateTimeFormatOptions} [options]
   * @returns {string}
   */
  formatDate(dateInput, options = {}) {
    if (!dateInput) return 'N/A';
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return 'Invalid date';

    const defaultOptions = {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      ...options
    };
    return new Intl.DateTimeFormat('en-US', defaultOptions).format(date);
  },

  /**
   * Format relative time (e.g. "Just now", "5 mins ago", "Yesterday")
   * @param {string|number|Date} dateInput
   * @returns {string}
   */
  timeAgo(dateInput) {
    if (!dateInput) return '';
    const date = new Date(dateInput);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 30) return 'Just now';
    if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
    const diffInMins = Math.floor(diffInSeconds / 60);
    if (diffInMins < 60) return `${diffInMins}m ago`;
    const diffInHours = Math.floor(diffInMins / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return Utils.formatDate(date);
  },

  /**
   * Debounce higher-order function for live search and input handling
   * @param {Function} func - Function to execute
   * @param {number} delay - Delay in ms
   * @returns {Function} Debounced function
   */
  debounce(func, delay = 300) {
    let timer;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => func.apply(this, args), delay);
    };
  },

  /**
   * Generate unique alphanumeric ID
   * @returns {string}
   */
  generateId() {
    return 'id_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 8);
  },

  /**
   * Display modern toast notification with optional action button (e.g. Undo)
   * @param {Object|string} options - Toast configuration or text
   */
  showToast(options) {
    let message = '';
    let type = 'info'; // 'info', 'success', 'warning', 'error'
    let duration = 3500;
    let action = null; // { label: 'Undo', onClick: () => {} }

    if (typeof options === 'string') {
      message = options;
    } else if (typeof options === 'object' && options !== null) {
      message = options.message || '';
      type = options.type || 'info';
      duration = options.duration || 3500;
      action = options.action || null;
    }

    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      container.setAttribute('aria-live', 'polite');
      container.setAttribute('aria-atomic', 'true');
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.setAttribute('role', 'alert');

    // Icon mapping
    const icons = {
      success: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>',
      error: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>',
      warning: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>',
      info: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>'
    };

    const iconHtml = icons[type] || icons.info;

    toast.innerHTML = `
      <div class="toast-icon">${iconHtml}</div>
      <div class="toast-content">${Utils.escapeHTML(message)}</div>
      ${action ? `<button class="toast-action-btn">${Utils.escapeHTML(action.label)}</button>` : ''}
      <button class="toast-close" aria-label="Dismiss notification">&times;</button>
    `;

    if (action && typeof action.onClick === 'function') {
      const actionBtn = toast.querySelector('.toast-action-btn');
      if (actionBtn) {
        actionBtn.addEventListener('click', () => {
          action.onClick();
          removeToast();
        });
      }
    }

    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', removeToast);

    container.appendChild(toast);

    // Trigger reflow for animation
    requestAnimationFrame(() => {
      toast.classList.add('toast-visible');
    });

    const timer = setTimeout(removeToast, duration);

    function removeToast() {
      clearTimeout(timer);
      toast.classList.remove('toast-visible');
      toast.classList.add('toast-hiding');
      setTimeout(() => {
        if (toast.parentElement) toast.remove();
      }, 300);
    }
  },

  /**
   * Confirmation dialog helper using reusable modal
   * @param {Object} options
   */
  confirm({ title = 'Confirm Action', message = 'Are you sure?', confirmText = 'Confirm', confirmVariant = 'danger', onConfirm }) {
    let modal = document.getElementById('global-confirm-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'global-confirm-modal';
      modal.className = 'modal-backdrop';
      modal.innerHTML = `
        <div class="modal-dialog modal-sm">
          <div class="modal-header">
            <h3 class="modal-title" id="confirm-modal-title"></h3>
            <button class="modal-close-btn" id="confirm-modal-close" aria-label="Close dialog">&times;</button>
          </div>
          <div class="modal-body">
            <p id="confirm-modal-text"></p>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" id="confirm-modal-cancel">Cancel</button>
            <button class="btn" id="confirm-modal-ok">Confirm</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
    }

    const titleEl = modal.querySelector('#confirm-modal-title');
    const textEl = modal.querySelector('#confirm-modal-text');
    const okBtn = modal.querySelector('#confirm-modal-ok');
    const cancelBtn = modal.querySelector('#confirm-modal-cancel');
    const closeBtn = modal.querySelector('#confirm-modal-close');

    titleEl.textContent = title;
    textEl.textContent = message;
    okBtn.textContent = confirmText;
    okBtn.className = `btn btn-${confirmVariant}`;

    const close = () => {
      modal.classList.remove('active');
    };

    const handleConfirm = () => {
      close();
      if (typeof onConfirm === 'function') onConfirm();
    };

    okBtn.onclick = handleConfirm;
    cancelBtn.onclick = close;
    closeBtn.onclick = close;
    modal.onclick = (e) => {
      if (e.target === modal) close();
    };

    modal.classList.add('active');
    okBtn.focus();
  },

  /**
   * Download content as file (CSV, JSON, etc.)
   * @param {string} content
   * @param {string} filename
   * @param {string} mimeType
   */
  downloadFile(content, filename, mimeType = 'text/csv;charset=utf-8;') {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
};

window.Utils = Utils;
