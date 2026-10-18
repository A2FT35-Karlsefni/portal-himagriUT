/**
 * Main Client-Side Library for Portal Artikel Nusantara
 */

// Global State
window.AppState = {
  user: null,
  theme: localStorage.getItem('theme') || 'light',
};

// Initialize Theme
function initTheme() {
  if (AppState.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

function toggleTheme() {
  const isDark = document.documentElement.classList.contains('dark');
  if (isDark) {
    document.documentElement.classList.remove('dark');
    localStorage.setItem('theme', 'light');
    AppState.theme = 'light';
  } else {
    document.documentElement.classList.add('dark');
    localStorage.setItem('theme', 'dark');
    AppState.theme = 'dark';
  }
}

// Toast Notifications
function showToast(message, type = 'success') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  const colors = {
    success: 'bg-emerald-600 text-white',
    error: 'bg-rose-600 text-white',
    info: 'bg-indigo-600 text-white',
    warning: 'bg-amber-600 text-white',
  };

  const icons = {
    success: '<svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>',
    error: '<svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>',
    info: '<svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>',
    warning: '<svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>',
  };

  toast.className = `toast flex items-center px-4 py-3 rounded-xl shadow-xl font-medium text-sm transition-all duration-300 ${colors[type] || colors.info}`;
  toast.innerHTML = `
    ${icons[type] || icons.info}
    <span>${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// Fetch Current User
async function checkAuth() {
  try {
    const res = await fetch('/api/auth/me');
    if (res.ok) {
      const data = await res.json();
      if (data.success) {
        AppState.user = data.user;
      }
    } else {
      AppState.user = null;
    }
  } catch (err) {
    AppState.user = null;
  }
  renderNavbarAuth();
  renderDemoBar();
}

// Quick Switch Demo Role
async function switchDemo(role) {
  try {
    const res = await fetch(`/api/auth/switch-demo/${role}`, { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      showToast(data.message, 'success');
      AppState.user = data.user;
      renderNavbarAuth();
      renderDemoBar();
      // Reload if on dashboard to refresh permissions
      if (window.location.pathname.startsWith('/dashboard')) {
        setTimeout(() => window.location.reload(), 400);
      }
    } else {
      showToast(data.message, 'error');
    }
  } catch (err) {
    showToast('Gagal beralih peran demo.', 'error');
  }
}

// Logout
async function handleLogout() {
  try {
    await fetch('/api/auth/logout', { method: 'POST' });
    AppState.user = null;
    showToast('Berhasil keluar.', 'info');
    renderNavbarAuth();
    renderDemoBar();
    if (window.location.pathname.startsWith('/dashboard') || window.location.pathname.startsWith('/tersimpan')) {
      window.location.href = '/';
    }
  } catch (err) {
    showToast('Gagal logout', 'error');
  }
}

// Render dynamic navbar user actions
function renderNavbarAuth() {
  const container = document.getElementById('navbar-auth-section');
  if (!container) return;

  if (AppState.user) {
    const roleColors = {
      admin: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 border-rose-200',
      editor: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200',
      author: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200',
      reader: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 border-indigo-200',
    };

    const roleName = {
      admin: 'Admin',
      editor: 'Editor',
      author: 'Penulis',
      reader: 'Pembaca',
    };

    container.innerHTML = `
      <div class="relative group">
        <button class="flex items-center space-x-3 p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition">
          <img src="${AppState.user.avatar}" alt="${AppState.user.name}" class="w-9 h-9 rounded-full object-cover border-2 border-indigo-500 shadow-sm" />
          <div class="hidden md:block text-left pr-2">
            <p class="text-xs font-bold text-slate-800 dark:text-slate-100 leading-tight">${AppState.user.name}</p>
            <span class="inline-block text-[10px] font-semibold px-1.5 py-0.2 border rounded-md uppercase tracking-wider ${roleColors[AppState.user.role]}">
              ${roleName[AppState.user.role]}
            </span>
          </div>
          <svg class="w-4 h-4 text-slate-400 group-hover:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
        </button>

        <!-- Dropdown menu -->
        <div class="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 py-2 hidden group-hover:block transition-all z-50">
          <div class="px-4 py-2 border-b border-slate-100 dark:border-slate-800">
            <p class="text-xs text-slate-400">Masuk sebagai</p>
            <p class="text-sm font-semibold text-slate-900 dark:text-white truncate">${AppState.user.email}</p>
          </div>
          
          <a href="/dashboard" class="flex items-center px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-slate-800 hover:text-indigo-600 transition">
            <svg class="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>
            Dashboard ${roleName[AppState.user.role]}
          </a>

          ${AppState.user.role === 'admin' || AppState.user.role === 'editor' || AppState.user.role === 'author' ? `
            <a href="/dashboard?tab=write" class="flex items-center px-4 py-2.5 text-sm text-indigo-600 font-semibold hover:bg-indigo-50 dark:hover:bg-slate-800 transition">
              <svg class="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
              Tulis Artikel Baru
            </a>
          ` : ''}

          <a href="/tersimpan" class="flex items-center px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-slate-800 hover:text-indigo-600 transition">
            <svg class="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/></svg>
            Artikel Tersimpan
          </a>

          <div class="border-t border-slate-100 dark:border-slate-800 my-1"></div>
          <button onclick="handleLogout()" class="w-full text-left flex items-center px-4 py-2.5 text-sm text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition">
            <svg class="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
            Keluar (Logout)
          </button>
        </div>
      </div>
    `;
  } else {
    container.innerHTML = `
      <div class="flex items-center space-x-2">
        <a href="/login" class="px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:text-indigo-600 transition">
          Masuk
        </a>
        <a href="/register" class="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-600/20 transition">
          Daftar
        </a>
      </div>
    `;
  }
}

// Render floating demo role switcher widget
function renderDemoBar() {
  let demoBar = document.getElementById('demo-role-switcher-bar');
  if (!demoBar) {
    demoBar = document.createElement('div');
    demoBar.id = 'demo-role-switcher-bar';
    document.body.appendChild(demoBar);
  }

  const currentRole = AppState.user ? AppState.user.role : 'guest';

  demoBar.innerHTML = `
    <div class="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 bg-slate-900/90 dark:bg-slate-800/90 backdrop-blur-md text-white px-3 py-2 rounded-2xl shadow-2xl border border-slate-700/60 flex items-center space-x-2 text-xs">
      <span class="hidden sm:inline font-semibold text-slate-300 pl-2">Coba Peran Demo:</span>
      <button onclick="switchDemo('admin')" class="px-2.5 py-1.5 rounded-xl font-medium transition ${currentRole === 'admin' ? 'bg-rose-600 text-white font-bold ring-2 ring-rose-400' : 'bg-slate-800 hover:bg-slate-700 text-slate-200'}">
        👑 Admin
      </button>
      <button onclick="switchDemo('editor')" class="px-2.5 py-1.5 rounded-xl font-medium transition ${currentRole === 'editor' ? 'bg-amber-600 text-white font-bold ring-2 ring-amber-400' : 'bg-slate-800 hover:bg-slate-700 text-slate-200'}">
        ✍️ Editor
      </button>
      <button onclick="switchDemo('author')" class="px-2.5 py-1.5 rounded-xl font-medium transition ${currentRole === 'author' ? 'bg-emerald-600 text-white font-bold ring-2 ring-emerald-400' : 'bg-slate-800 hover:bg-slate-700 text-slate-200'}">
        📝 Penulis
      </button>
      <button onclick="switchDemo('reader')" class="px-2.5 py-1.5 rounded-xl font-medium transition ${currentRole === 'reader' ? 'bg-indigo-600 text-white font-bold ring-2 ring-indigo-400' : 'bg-slate-800 hover:bg-slate-700 text-slate-200'}">
        📖 Pembaca
      </button>
    </div>
  `;
}

// Format relative date (e.g. 2 jam yang lalu)
function formatTimeAgo(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffInSec = Math.floor((now - date) / 1000);

  if (diffInSec < 60) return 'Baru saja';
  const diffInMin = Math.floor(diffInSec / 60);
  if (diffInMin < 60) return `${diffInMin} menit yang lalu`;
  const diffInHours = Math.floor(diffInMin / 60);
  if (diffInHours < 24) return `${diffInHours} jam yang lalu`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) return `${diffInDays} hari yang lalu`;
  return date.toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' });
}

// Category Badge Color Helper
function getCategoryColor(color) {
  const map = {
    blue: 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200',
    emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200',
    rose: 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200',
    amber: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200',
    purple: 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200',
    indigo: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200',
  };
  return map[color] || map.indigo;
}

// Run on load
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  checkAuth();
});
