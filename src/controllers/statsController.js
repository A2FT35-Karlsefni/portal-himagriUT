const { db } = require('../config/database');

exports.getDashboardStats = (req, res) => {
  try {
    const user = req.user;

    if (user.role === 'admin' || user.role === 'editor') {
      const totalArticles = db.prepare('SELECT COUNT(*) as count FROM articles').get().count;
      const publishedArticles = db.prepare("SELECT COUNT(*) as count FROM articles WHERE status = 'published'").get().count;
      const pendingArticles = db.prepare("SELECT COUNT(*) as count FROM articles WHERE status = 'pending'").get().count;
      const draftArticles = db.prepare("SELECT COUNT(*) as count FROM articles WHERE status = 'draft'").get().count;

      const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
      const totalAuthors = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'author'").get().count;
      const totalReaders = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'reader'").get().count;

      const totalViews = db.prepare('SELECT COALESCE(SUM(view_count), 0) as count FROM articles').get().count;
      const totalComments = db.prepare("SELECT COUNT(*) as count FROM comments WHERE status = 'approved'").get().count;
      const pendingComments = db.prepare("SELECT COUNT(*) as count FROM comments WHERE status = 'pending'").get().count;

      const topArticles = db.prepare(`
        SELECT articles.id, articles.title, articles.slug, articles.view_count, articles.published_at, users.name as author_name
        FROM articles
        JOIN users ON users.id = articles.author_id
        WHERE articles.status = 'published'
        ORDER BY articles.view_count DESC
        LIMIT 5
      `).all();

      const recentArticles = db.prepare(`
        SELECT articles.id, articles.title, articles.status, articles.created_at, users.name as author_name
        FROM articles
        JOIN users ON users.id = articles.author_id
        ORDER BY articles.created_at DESC
        LIMIT 5
      `).all();

      return res.json({
        success: true,
        stats: {
          articles: { total: totalArticles, published: publishedArticles, pending: pendingArticles, draft: draftArticles },
          users: { total: totalUsers, authors: totalAuthors, readers: totalReaders },
          views: totalViews,
          comments: { total: totalComments, pending: pendingComments },
          topArticles,
          recentArticles,
        }
      });
    } else if (user.role === 'author') {
      // Author specific stats
      const myArticles = db.prepare('SELECT COUNT(*) as count FROM articles WHERE author_id = ?').get(user.id).count;
      const myPublished = db.prepare("SELECT COUNT(*) as count FROM articles WHERE author_id = ? AND status = 'published'").get(user.id).count;
      const myPending = db.prepare("SELECT COUNT(*) as count FROM articles WHERE author_id = ? AND status = 'pending'").get(user.id).count;
      const myDrafts = db.prepare("SELECT COUNT(*) as count FROM articles WHERE author_id = ? AND status = 'draft'").get(user.id).count;

      const myViews = db.prepare('SELECT COALESCE(SUM(view_count), 0) as count FROM articles WHERE author_id = ?').get(user.id).count;
      const myLikes = db.prepare('SELECT COUNT(*) as count FROM likes WHERE article_id IN (SELECT id FROM articles WHERE author_id = ?)').get(user.id).count;
      const myComments = db.prepare('SELECT COUNT(*) as count FROM comments WHERE article_id IN (SELECT id FROM articles WHERE author_id = ?)').get(user.id).count;

      const recentArticles = db.prepare(`
        SELECT id, title, slug, status, view_count, created_at
        FROM articles
        WHERE author_id = ?
        ORDER BY created_at DESC
        LIMIT 5
      `).all(user.id);

      return res.json({
        success: true,
        stats: {
          articles: { total: myArticles, published: myPublished, pending: myPending, draft: myDrafts },
          views: myViews,
          likes: myLikes,
          comments: myComments,
          recentArticles,
        }
      });
    } else {
      // Reader stats
      const myBookmarks = db.prepare('SELECT COUNT(*) as count FROM bookmarks WHERE user_id = ?').get(user.id).count;
      const myLikes = db.prepare('SELECT COUNT(*) as count FROM likes WHERE user_id = ?').get(user.id).count;
      const myComments = db.prepare('SELECT COUNT(*) as count FROM comments WHERE user_id = ?').get(user.id).count;

      return res.json({
        success: true,
        stats: {
          bookmarks: myBookmarks,
          likes: myLikes,
          comments: myComments,
        }
      });
    }
  } catch (error) {
    console.error('getDashboardStats error:', error);
    return res.status(500).json({ success: false, message: 'Gagal mengambil statistik dashboard.' });
  }
};

// GET /api/settings
exports.getSettings = (req, res) => {
  try {
    const rows = db.prepare('SELECT key, value, description FROM settings').all();
    const settings = {};
    rows.forEach(r => {
      settings[r.key] = r.value;
    });
    return res.json({ success: true, data: settings });
  } catch (error) {
    console.error('getSettings error:', error);
    return res.status(500).json({ success: false, message: 'Gagal mengambil pengaturan.' });
  }
};

// PUT /api/settings (Admin only)
exports.updateSettings = (req, res) => {
  try {
    const settings = req.body;
    const upsert = db.prepare(`
      INSERT INTO settings (key, value)
      VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `);

    for (const [key, value] of Object.entries(settings)) {
      upsert.run(key, String(value));
    }

    return res.json({ success: true, message: 'Pengaturan situs berhasil diperbarui.' });
  } catch (error) {
    console.error('updateSettings error:', error);
    return res.status(500).json({ success: false, message: 'Gagal memperbarui pengaturan.' });
  }
};
