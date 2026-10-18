/**
 * Multi-Role Unified Dashboard Controller
 */

let dashboardData = {
  currentTab: 'overview',
  categories: [],
  articles: [],
  users: [],
  comments: [],
  editingArticleId: null,
};

document.addEventListener('DOMContentLoaded', async () => {
  // Ensure user is loaded
  await checkAuth();

  if (!AppState.user) {
    showToast('Silakan login untuk mengakses Dashboard.', 'warning');
    setTimeout(() => window.location.href = '/login', 500);
    return;
  }

  // Parse query tab if present
  const urlParams = new URLSearchParams(window.location.search);
  const tabParam = urlParams.get('tab');
  if (tabParam) {
    dashboardData.currentTab = tabParam;
  }

  initDashboardUI();
  await loadDashboardCategories();
  switchTab(dashboardData.currentTab);
});

function initDashboardUI() {
  const user = AppState.user;
  document.getElementById('dash-user-name').textContent = user.name;
  document.getElementById('dash-user-avatar').src = user.avatar;

  const roleBadge = document.getElementById('dash-user-role');
  roleBadge.textContent = user.role.toUpperCase();

  const roleClasses = {
    admin: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
    editor: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    author: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    reader: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
  };
  roleBadge.className = `text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${roleClasses[user.role]}`;

  // Role-based Nav items visibility
  if (user.role === 'reader') {
    document.querySelectorAll('.nav-creator').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.nav-editor').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.nav-admin').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.nav-reader').forEach(el => el.classList.remove('hidden'));
  } else if (user.role === 'author') {
    document.querySelectorAll('.nav-creator').forEach(el => el.classList.remove('hidden'));
    document.querySelectorAll('.nav-editor').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.nav-admin').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.nav-reader').forEach(el => el.classList.add('hidden'));
  } else if (user.role === 'editor') {
    document.querySelectorAll('.nav-creator').forEach(el => el.classList.remove('hidden'));
    document.querySelectorAll('.nav-editor').forEach(el => el.classList.remove('hidden'));
    document.querySelectorAll('.nav-admin').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.nav-reader').forEach(el => el.classList.add('hidden'));
  } else if (user.role === 'admin') {
    document.querySelectorAll('.nav-creator').forEach(el => el.classList.remove('hidden'));
    document.querySelectorAll('.nav-editor').forEach(el => el.classList.remove('hidden'));
    document.querySelectorAll('.nav-admin').forEach(el => el.classList.remove('hidden'));
    document.querySelectorAll('.nav-reader').forEach(el => el.classList.add('hidden'));
  }
}

function switchTab(tabName) {
  dashboardData.currentTab = tabName;

  // Update nav highlight
  document.querySelectorAll('.dash-nav-btn').forEach(btn => {
    btn.classList.remove('bg-indigo-600', 'text-white', 'shadow-md');
    btn.classList.add('text-slate-600', 'dark:text-slate-300', 'hover:bg-slate-100', 'dark:hover:bg-slate-800');
  });

  const activeBtn = document.getElementById(`nav-${tabName}`);
  if (activeBtn) {
    activeBtn.classList.remove('text-slate-600', 'dark:text-slate-300', 'hover:bg-slate-100', 'dark:hover:bg-slate-800');
    activeBtn.classList.add('bg-indigo-600', 'text-white', 'shadow-md');
  }

  // Hide all sections
  document.querySelectorAll('.dash-section').forEach(sec => sec.classList.add('hidden'));

  // Show active section
  const activeSec = document.getElementById(`section-${tabName}`);
  if (activeSec) {
    activeSec.classList.remove('hidden');
  }

  // Trigger data loaders
  if (tabName === 'overview') loadOverviewStats();
  if (tabName === 'articles') loadManageArticles();
  if (tabName === 'write') prepareWriteForm();
  if (tabName === 'categories') loadManageCategories();
  if (tabName === 'users') loadManageUsers();
  if (tabName === 'comments') loadManageComments();
  if (tabName === 'profile') loadProfileSettings();
}

async function loadDashboardCategories() {
  try {
    const res = await fetch('/api/categories');
    const data = await res.json();
    if (data.success) {
      dashboardData.categories = data.data;
      const select = document.getElementById('write-category');
      if (select) {
        select.innerHTML = '<option value="">-- Pilih Kategori --</option>' +
          data.data.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
      }
    }
  } catch (err) {
    console.error('Failed to load categories', err);
  }
}

// TAB 1: OVERVIEW
async function loadOverviewStats() {
  try {
    const res = await fetch('/api/stats/dashboard');
    const data = await res.json();
    if (data.success) {
      const stats = data.stats;
      const container = document.getElementById('overview-cards');
      const user = AppState.user;

      if (user.role === 'admin' || user.role === 'editor') {
        container.innerHTML = `
          <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
            <div class="flex items-center justify-between mb-2">
              <span class="text-xs font-bold text-slate-400 uppercase">Total Artikel Terbit</span>
              <span class="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600">📄</span>
            </div>
            <div class="text-3xl font-black text-slate-900 dark:text-white">${stats.articles.published}</div>
            <div class="text-[11px] text-slate-400 mt-2">${stats.articles.total} total semua status</div>
          </div>

          <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
            <div class="flex items-center justify-between mb-2">
              <span class="text-xs font-bold text-amber-500 uppercase">Menunggu Review</span>
              <span class="p-2 rounded-xl bg-amber-50 dark:bg-amber-950 text-amber-600">⏳</span>
            </div>
            <div class="text-3xl font-black text-amber-600">${stats.articles.pending}</div>
            <div class="text-[11px] text-slate-400 mt-2">Perlu persetujuan publikasi</div>
          </div>

          <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
            <div class="flex items-center justify-between mb-2">
              <span class="text-xs font-bold text-slate-400 uppercase">Total Pembaca (Views)</span>
              <span class="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600">👁</span>
            </div>
            <div class="text-3xl font-black text-slate-900 dark:text-white">${stats.views}</div>
            <div class="text-[11px] text-slate-400 mt-2">Trafik pembaca kumulatif</div>
          </div>

          <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
            <div class="flex items-center justify-between mb-2">
              <span class="text-xs font-bold text-slate-400 uppercase">Total Pengguna</span>
              <span class="p-2 rounded-xl bg-purple-50 dark:bg-purple-950 text-purple-600">👥</span>
            </div>
            <div class="text-3xl font-black text-slate-900 dark:text-white">${stats.users.total}</div>
            <div class="text-[11px] text-slate-400 mt-2">${stats.users.authors} Penulis terdaftar</div>
          </div>
        `;

        // Render top viewed articles
        const topContainer = document.getElementById('overview-top-articles');
        if (topContainer && stats.topArticles) {
          topContainer.innerHTML = stats.topArticles.map(a => `
            <div class="flex items-center justify-between py-3 border-b border-slate-100 dark:border-slate-800 text-xs">
              <div class="truncate max-w-[300px]">
                <a href="/artikel/${a.slug}" target="_blank" class="font-bold text-slate-800 dark:text-slate-100 hover:text-indigo-600">${a.title}</a>
                <p class="text-[11px] text-slate-400">Oleh: ${a.author_name}</p>
              </div>
              <span class="font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-1 rounded-lg">👁 ${a.view_count}</span>
            </div>
          `).join('');
        }
      } else if (user.role === 'author') {
        container.innerHTML = `
          <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
            <span class="text-xs font-bold text-slate-400 uppercase">Artikel Terbit Saya</span>
            <div class="text-3xl font-black text-emerald-600 mt-2">${stats.articles.published}</div>
            <div class="text-[11px] text-slate-400 mt-1">${stats.articles.total} total artikel saya</div>
          </div>
          <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
            <span class="text-xs font-bold text-amber-500 uppercase">Menunggu Review</span>
            <div class="text-3xl font-black text-amber-500 mt-2">${stats.articles.pending}</div>
            <div class="text-[11px] text-slate-400 mt-1">Sedang ditinjau redaksi</div>
          </div>
          <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
            <span class="text-xs font-bold text-slate-400 uppercase">Total Pembaca</span>
            <div class="text-3xl font-black text-indigo-600 mt-2">${stats.views}</div>
            <div class="text-[11px] text-slate-400 mt-1">Pembaca karya Anda</div>
          </div>
          <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
            <span class="text-xs font-bold text-slate-400 uppercase">Apresiasi Suka</span>
            <div class="text-3xl font-black text-rose-600 mt-2">❤️ ${stats.likes}</div>
            <div class="text-[11px] text-slate-400 mt-1">Total like didapat</div>
          </div>
        `;
      } else {
        // Reader overview
        container.innerHTML = `
          <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
            <span class="text-xs font-bold text-slate-400 uppercase">Artikel Tersimpan</span>
            <div class="text-3xl font-black text-amber-500 mt-2">${stats.bookmarks}</div>
            <a href="/tersimpan" class="text-xs text-indigo-600 font-bold mt-2 inline-block">Buka Daftar Bacaan &rarr;</a>
          </div>
          <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
            <span class="text-xs font-bold text-slate-400 uppercase">Artikel Disukai</span>
            <div class="text-3xl font-black text-rose-600 mt-2">${stats.likes}</div>
            <div class="text-[11px] text-slate-400 mt-1">Apresiasi yang Anda berikan</div>
          </div>
          <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
            <span class="text-xs font-bold text-slate-400 uppercase">Komentar Dikirim</span>
            <div class="text-3xl font-black text-indigo-600 mt-2">${stats.comments}</div>
            <div class="text-[11px] text-slate-400 mt-1">Partisipasi diskusi</div>
          </div>
        `;
      }
    }
  } catch (err) {
    console.error('Failed to load stats', err);
  }
}

// TAB 2: WRITE ARTICLE
function prepareWriteForm(article = null) {
  dashboardData.editingArticleId = article ? article.id : null;
  const titleEl = document.getElementById('write-page-title');
  const btnSubmit = document.getElementById('btn-save-article');

  if (article) {
    titleEl.textContent = 'Edit Artikel';
    btnSubmit.textContent = 'Perbarui Artikel';
    document.getElementById('write-title').value = article.title;
    document.getElementById('write-category').value = article.category_id;
    document.getElementById('write-excerpt').value = article.excerpt;
    document.getElementById('write-content').value = article.content;
    document.getElementById('write-cover-url').value = article.cover_image;
    document.getElementById('write-status').value = article.status;
    document.getElementById('write-tags').value = article.tags ? article.tags.map(t => t.name).join(', ') : '';
    if (document.getElementById('write-featured')) {
      document.getElementById('write-featured').checked = !!article.is_featured;
    }
  } else {
    titleEl.textContent = 'Tulis Artikel Baru';
    btnSubmit.textContent = 'Simpan & Publikasikan';
    document.getElementById('write-form').reset();
    document.getElementById('write-status').value = AppState.user.role === 'author' ? 'pending' : 'published';
  }

  // Authors cannot publish directly or toggle featured
  const featuredBox = document.getElementById('featured-checkbox-container');
  if (featuredBox) {
    if (AppState.user.role === 'author') {
      featuredBox.classList.add('hidden');
    } else {
      featuredBox.classList.remove('hidden');
    }
  }
}

async function saveArticle(e) {
  e.preventDefault();
  const title = document.getElementById('write-title').value.trim();
  const category_id = document.getElementById('write-category').value;
  const excerpt = document.getElementById('write-excerpt').value.trim();
  const content = document.getElementById('write-content').value.trim();
  const cover_url = document.getElementById('write-cover-url').value.trim();
  const tags = document.getElementById('write-tags').value.trim();
  const status = document.getElementById('write-status').value;
  const is_featured = document.getElementById('write-featured') ? (document.getElementById('write-featured').checked ? 1 : 0) : 0;
  const coverFile = document.getElementById('write-cover-file').files[0];

  if (!title || !content || !category_id) {
    showToast('Judul, kategori, dan isi artikel wajib diisi.', 'warning');
    return;
  }

  const formData = new FormData();
  formData.append('title', title);
  formData.append('category_id', category_id);
  formData.append('excerpt', excerpt);
  formData.append('content', content);
  formData.append('cover_url', cover_url);
  formData.append('tags', tags);
  formData.append('status', status);
  formData.append('is_featured', is_featured);
  if (coverFile) {
    formData.append('cover', coverFile);
  }

  try {
    let url = '/api/articles';
    let method = 'POST';

    if (dashboardData.editingArticleId) {
      url = `/api/articles/${dashboardData.editingArticleId}`;
      method = 'PUT';
    }

    const res = await fetch(url, {
      method: method,
      body: formData,
    });

    const data = await res.json();
    if (data.success) {
      showToast(data.message, 'success');
      dashboardData.editingArticleId = null;
      switchTab('articles');
    } else {
      showToast(data.message, 'error');
    }
  } catch (err) {
    showToast('Gagal menyimpan artikel', 'error');
  }
}

// Visual editor helper (insert markup tags)
function formatDoc(command) {
  const textarea = document.getElementById('write-content');
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const selectedText = textarea.value.substring(start, end) || 'Teks di sini';
  let replacement = '';

  switch (command) {
    case 'h2': replacement = `\n<h2>${selectedText}</h2>\n`; break;
    case 'h3': replacement = `\n<h3>${selectedText}</h3>\n`; break;
    case 'bold': replacement = `<strong>${selectedText}</strong>`; break;
    case 'italic': replacement = `<em>${selectedText}</em>`; break;
    case 'quote': replacement = `\n<blockquote>${selectedText}</blockquote>\n`; break;
    case 'ul': replacement = `\n<ul>\n  <li>${selectedText}</li>\n</ul>\n`; break;
    case 'code': replacement = `<code>${selectedText}</code>`; break;
  }

  textarea.setRangeText(replacement, start, end, 'end');
  textarea.focus();
}

// TAB 3: MANAGE ARTICLES
async function loadManageArticles(filterStatus = 'all') {
  try {
    let url = `/api/articles?status=${filterStatus}&limit=50`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.success) {
      dashboardData.articles = data.data;
      renderArticlesTable(data.data);
    }
  } catch (err) {
    console.error('Failed to load articles', err);
  }
}

function renderArticlesTable(articles) {
  const container = document.getElementById('articles-table-body');
  const user = AppState.user;

  if (articles.length === 0) {
    container.innerHTML = `<tr><td colspan="7" class="text-center py-10 text-slate-400 text-xs">Belum ada artikel ditemukan.</td></tr>`;
    return;
  }

  const statusBadges = {
    published: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
    pending: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 animate-pulse',
    draft: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    rejected: 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300',
  };

  container.innerHTML = articles.map(art => {
    const isOwner = art.author_id === user.id;
    const isPrivileged = user.role === 'admin' || user.role === 'editor';

    return `
      <tr class="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
        <td class="py-3 px-4">
          <div class="flex items-center space-x-3">
            <img src="${art.cover_image}" class="w-12 h-12 rounded-xl object-cover shrink-0" />
            <div class="truncate max-w-[240px]">
              <a href="/artikel/${art.slug}" target="_blank" class="font-bold text-xs text-slate-900 dark:text-white hover:text-indigo-600 block truncate">
                ${art.title}
              </a>
              <span class="text-[10px] text-slate-400">${art.category_name}</span>
            </div>
          </div>
        </td>
        <td class="py-3 px-4 text-xs text-slate-600 dark:text-slate-300">
          <div class="flex items-center space-x-1.5">
            <img src="${art.author_avatar}" class="w-5 h-5 rounded-full object-cover" />
            <span>${art.author_name}</span>
          </div>
        </td>
        <td class="py-3 px-4">
          <span class="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${statusBadges[art.status]}">
            ${art.status}
          </span>
          ${art.is_featured ? '<span class="ml-1 text-[10px] text-amber-500 font-bold">★ Pilihan</span>' : ''}
        </td>
        <td class="py-3 px-4 text-xs text-slate-500 font-medium">👁 ${art.view_count}</td>
        <td class="py-3 px-4 text-[11px] text-slate-400">${formatTimeAgo(art.created_at)}</td>
        <td class="py-3 px-4 text-right">
          <div class="flex items-center justify-end space-x-1.5">
            <!-- Approve button for pending articles (Editor / Admin) -->
            ${isPrivileged && art.status === 'pending' ? `
              <button onclick="quickApproveArticle(${art.id})" class="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm transition" title="Setujui & Publikasikan">
                Setujui
              </button>
            ` : ''}

            <!-- Toggle Featured (Admin/Editor) -->
            ${isPrivileged && art.status === 'published' ? `
              <button onclick="toggleFeaturedArticle(${art.id}, ${art.is_featured ? 0 : 1})" class="p-1.5 rounded-lg text-slate-400 hover:text-amber-500 transition" title="Jadikan Headline">
                <svg class="w-4 h-4 ${art.is_featured ? 'text-amber-500 fill-amber-500' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/></svg>
              </button>
            ` : ''}

            <!-- Edit Button -->
            ${isOwner || isPrivileged ? `
              <button onclick="editArticle(${art.id})" class="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 transition" title="Edit">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
              </button>
            ` : ''}

            <!-- Delete Button -->
            ${isOwner || isPrivileged ? `
              <button onclick="deleteArticle(${art.id})" class="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 transition" title="Hapus">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
              </button>
            ` : ''}
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

async function quickApproveArticle(id) {
  try {
    const res = await fetch(`/api/articles/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'published' })
    });
    const data = await res.json();
    if (data.success) {
      showToast('Artikel berhasil disetujui dan langsung terbit!', 'success');
      loadManageArticles();
    }
  } catch (err) {
    showToast('Gagal menyetujui artikel', 'error');
  }
}

async function toggleFeaturedArticle(id, isFeatured) {
  try {
    const res = await fetch(`/api/articles/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_featured: isFeatured })
    });
    const data = await res.json();
    if (data.success) {
      showToast(isFeatured ? 'Artikel dijadikan Pilihan Utama.' : 'Status Pilihan Utama dicabut.', 'info');
      loadManageArticles();
    }
  } catch (err) {
    showToast('Gagal mengubah status', 'error');
  }
}

function editArticle(id) {
  const article = dashboardData.articles.find(a => a.id === id);
  if (!article) return;
  switchTab('write');
  prepareWriteForm(article);
}

async function deleteArticle(id) {
  if (!confirm('Apakah Anda yakin ingin menghapus artikel ini secara permanen?')) return;
  try {
    const res = await fetch(`/api/articles/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      showToast(data.message, 'success');
      loadManageArticles();
    } else {
      showToast(data.message, 'error');
    }
  } catch (err) {
    showToast('Gagal menghapus artikel', 'error');
  }
}

// TAB 4: MANAGE CATEGORIES
async function loadManageCategories() {
  await loadDashboardCategories();
  const container = document.getElementById('categories-table-body');
  container.innerHTML = dashboardData.categories.map(c => `
    <tr class="border-b border-slate-100 dark:border-slate-800">
      <td class="py-3 px-4 font-bold text-xs text-slate-800 dark:text-slate-100">${c.name}</td>
      <td class="py-3 px-4 text-xs text-slate-400">/${c.slug}</td>
      <td class="py-3 px-4">
        <span class="px-2 py-0.5 rounded text-[10px] font-bold ${getCategoryColor(c.color)}">${c.color}</span>
      </td>
      <td class="py-3 px-4 text-xs font-semibold text-slate-700 dark:text-slate-300">${c.article_count} artikel</td>
      <td class="py-3 px-4 text-right">
        ${AppState.user.role === 'admin' ? `
          <button onclick="deleteCategory(${c.id})" class="text-xs text-rose-500 hover:text-rose-700 font-semibold">Hapus</button>
        ` : ''}
      </td>
    </tr>
  `).join('');
}

async function saveCategory(e) {
  e.preventDefault();
  const name = document.getElementById('new-cat-name').value.trim();
  const description = document.getElementById('new-cat-desc').value.trim();
  const color = document.getElementById('new-cat-color').value;

  try {
    const res = await fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description, color })
    });
    const data = await res.json();
    if (data.success) {
      showToast(data.message, 'success');
      document.getElementById('new-cat-name').value = '';
      document.getElementById('new-cat-desc').value = '';
      loadManageCategories();
    } else {
      showToast(data.message, 'error');
    }
  } catch (err) {
    showToast('Gagal membuat kategori', 'error');
  }
}

async function deleteCategory(id) {
  if (!confirm('Hapus kategori ini?')) return;
  try {
    const res = await fetch(`/api/categories/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      showToast(data.message, 'success');
      loadManageCategories();
    } else {
      showToast(data.message, 'error');
    }
  } catch (err) {
    showToast('Gagal menghapus kategori', 'error');
  }
}

// TAB 5: MANAGE USERS (ADMIN ONLY)
async function loadManageUsers() {
  try {
    const res = await fetch('/api/users');
    const data = await res.json();
    if (data.success) {
      dashboardData.users = data.data;
      renderUsersTable(data.data);
    }
  } catch (err) {
    console.error('Failed to load users', err);
  }
}

function renderUsersTable(users) {
  const container = document.getElementById('users-table-body');
  const roleBadges = {
    admin: 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300',
    editor: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300',
    author: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
    reader: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300',
  };

  container.innerHTML = users.map(u => `
    <tr class="border-b border-slate-100 dark:border-slate-800">
      <td class="py-3 px-4">
        <div class="flex items-center space-x-3">
          <img src="${u.avatar}" class="w-8 h-8 rounded-full object-cover border" />
          <div>
            <span class="font-bold text-xs text-slate-900 dark:text-white block">${u.name}</span>
            <span class="text-[10px] text-slate-400">@${u.username}</span>
          </div>
        </div>
      </td>
      <td class="py-3 px-4 text-xs text-slate-600 dark:text-slate-300">${u.email}</td>
      <td class="py-3 px-4">
        <select onchange="changeUserRole(${u.id}, this.value)" class="text-xs font-bold rounded-lg px-2 py-1 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 ${roleBadges[u.role]}">
          <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>👑 Admin</option>
          <option value="editor" ${u.role === 'editor' ? 'selected' : ''}>✍️ Editor</option>
          <option value="author" ${u.role === 'author' ? 'selected' : ''}>📝 Penulis</option>
          <option value="reader" ${u.role === 'reader' ? 'selected' : ''}>📖 Pembaca</option>
        </select>
      </td>
      <td class="py-3 px-4">
        <span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${u.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}">
          ${u.status}
        </span>
      </td>
      <td class="py-3 px-4 text-xs text-slate-500 font-semibold">${u.articles_count} artikel</td>
      <td class="py-3 px-4 text-right">
        ${u.id !== AppState.user.id ? `
          <button onclick="deleteUser(${u.id})" class="text-xs text-rose-500 hover:text-rose-700 font-bold">Hapus</button>
        ` : '<span class="text-[11px] text-slate-400">Akun Saya</span>'}
      </td>
    </tr>
  `).join('');
}

async function changeUserRole(userId, newRole) {
  try {
    const res = await fetch(`/api/users/${userId}/role`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: newRole })
    });
    const data = await res.json();
    if (data.success) {
      showToast(data.message, 'success');
      loadManageUsers();
    } else {
      showToast(data.message, 'error');
      loadManageUsers();
    }
  } catch (err) {
    showToast('Gagal mengubah peran user', 'error');
  }
}

async function deleteUser(id) {
  if (!confirm('Hapus pengguna ini beserta semua datanya?')) return;
  try {
    const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      showToast(data.message, 'success');
      loadManageUsers();
    } else {
      showToast(data.message, 'error');
    }
  } catch (err) {
    showToast('Gagal menghapus user', 'error');
  }
}

// TAB 6: MODERATE COMMENTS
async function loadManageComments() {
  try {
    const res = await fetch('/api/comments');
    const data = await res.json();
    if (data.success) {
      const container = document.getElementById('comments-table-body');
      container.innerHTML = data.data.map(c => `
        <tr class="border-b border-slate-100 dark:border-slate-800">
          <td class="py-3 px-4 text-xs font-bold text-slate-900 dark:text-white">${c.user_name}</td>
          <td class="py-3 px-4 text-xs text-slate-700 dark:text-slate-300 max-w-xs truncate">${c.content}</td>
          <td class="py-3 px-4 text-xs text-indigo-600 truncate max-w-[150px]">${c.article_title}</td>
          <td class="py-3 px-4 text-[10px]">
            <span class="px-2 py-0.5 rounded-full font-bold ${c.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}">
              ${c.status}
            </span>
          </td>
          <td class="py-3 px-4 text-right space-x-2">
            ${c.status !== 'approved' ? `
              <button onclick="moderateCommentStatus(${c.id}, 'approved')" class="text-xs text-emerald-600 font-bold">Setujui</button>
            ` : `
              <button onclick="moderateCommentStatus(${c.id}, 'spam')" class="text-xs text-amber-600 font-bold">Spam</button>
            `}
            <button onclick="deleteCommentFromDash(${c.id})" class="text-xs text-rose-600 font-bold">Hapus</button>
          </td>
        </tr>
      `).join('');
    }
  } catch (err) {
    console.error('Failed to load comments', err);
  }
}

async function moderateCommentStatus(id, status) {
  try {
    const res = await fetch(`/api/comments/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    const data = await res.json();
    if (data.success) {
      showToast(data.message, 'success');
      loadManageComments();
    }
  } catch (err) {
    showToast('Gagal memoderasi komentar', 'error');
  }
}

async function deleteCommentFromDash(id) {
  if (!confirm('Hapus komentar ini?')) return;
  try {
    const res = await fetch(`/api/comments/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      showToast(data.message, 'success');
      loadManageComments();
    }
  } catch (err) {
    showToast('Gagal menghapus komentar', 'error');
  }
}

// TAB 7: PROFILE & SITE SETTINGS
function loadProfileSettings() {
  const user = AppState.user;
  document.getElementById('prof-name').value = user.name;
  document.getElementById('prof-bio').value = user.bio || '';
  document.getElementById('prof-avatar-preview').src = user.avatar;

  if (user.role === 'admin') {
    document.getElementById('admin-site-settings-box').classList.remove('hidden');
    loadSiteSettings();
  } else {
    document.getElementById('admin-site-settings-box').classList.add('hidden');
  }
}

async function updateProfileForm(e) {
  e.preventDefault();
  const name = document.getElementById('prof-name').value.trim();
  const bio = document.getElementById('prof-bio').value.trim();
  const current_password = document.getElementById('prof-cur-pass').value;
  const new_password = document.getElementById('prof-new-pass').value;
  const avatarFile = document.getElementById('prof-avatar-file').files[0];

  const formData = new FormData();
  formData.append('name', name);
  formData.append('bio', bio);
  if (current_password) formData.append('current_password', current_password);
  if (new_password) formData.append('new_password', new_password);
  if (avatarFile) formData.append('avatar', avatarFile);

  try {
    const res = await fetch('/api/auth/profile', {
      method: 'PUT',
      body: formData,
    });
    const data = await res.json();
    if (data.success) {
      showToast(data.message, 'success');
      AppState.user = data.user;
      document.getElementById('dash-user-name').textContent = data.user.name;
      document.getElementById('dash-user-avatar').src = data.user.avatar;
      document.getElementById('prof-cur-pass').value = '';
      document.getElementById('prof-new-pass').value = '';
    } else {
      showToast(data.message, 'error');
    }
  } catch (err) {
    showToast('Gagal memperbarui profil', 'error');
  }
}

async function loadSiteSettings() {
  try {
    const res = await fetch('/api/stats/settings');
    const data = await res.json();
    if (data.success) {
      const s = data.data;
      if (document.getElementById('setting-site-name')) document.getElementById('setting-site-name').value = s.site_name || '';
      if (document.getElementById('setting-site-tagline')) document.getElementById('setting-site-tagline').value = s.site_tagline || '';
      if (document.getElementById('setting-announcement')) document.getElementById('setting-announcement').value = s.announcement || '';
    }
  } catch (err) {
    console.error('Failed to load settings', err);
  }
}

async function updateSiteSettings(e) {
  e.preventDefault();
  const site_name = document.getElementById('setting-site-name').value;
  const site_tagline = document.getElementById('setting-site-tagline').value;
  const announcement = document.getElementById('setting-announcement').value;

  try {
    const res = await fetch('/api/stats/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ site_name, site_tagline, announcement })
    });
    const data = await res.json();
    if (data.success) {
      showToast(data.message, 'success');
    } else {
      showToast(data.message, 'error');
    }
  } catch (err) {
    showToast('Gagal memperbarui pengaturan situs', 'error');
  }
}
