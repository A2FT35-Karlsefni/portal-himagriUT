const bcrypt = require('bcryptjs');
const { db } = require('../config/database');

// GET /api/users (Admin only)
exports.getUsers = (req, res) => {
  try {
    const { role, status, search } = req.query;

    let whereClauses = [];
    let params = [];

    if (role) {
      whereClauses.push('users.role = ?');
      params.push(role);
    }

    if (status) {
      whereClauses.push('users.status = ?');
      params.push(status);
    }

    if (search) {
      whereClauses.push('(users.name LIKE ? OR users.username LIKE ? OR users.email LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const whereSql = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';

    const users = db.prepare(`
      SELECT 
        users.id,
        users.name,
        users.username,
        users.email,
        users.role,
        users.status,
        users.avatar,
        users.created_at,
        (SELECT COUNT(*) FROM articles WHERE articles.author_id = users.id) as articles_count,
        (SELECT COUNT(*) FROM comments WHERE comments.user_id = users.id) as comments_count
      FROM users
      ${whereSql}
      ORDER BY users.id ASC
    `).all(...params);

    return res.json({ success: true, data: users });
  } catch (error) {
    console.error('getUsers error:', error);
    return res.status(500).json({ success: false, message: 'Gagal mengambil data pengguna.' });
  }
};

// POST /api/users (Admin only create user)
exports.createUser = (req, res) => {
  try {
    const { name, username, email, password, role, bio } = req.body;

    if (!name || !username || !email || !password || !role) {
      return res.status(400).json({ success: false, message: 'Nama, username, email, kata sandi, dan peran wajib diisi.' });
    }

    const validRoles = ['admin', 'editor', 'author', 'reader'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ success: false, message: 'Peran (role) tidak valid.' });
    }

    const existing = db.prepare('SELECT id FROM users WHERE email = ? OR username = ?').get(email, username);
    if (existing) {
      return res.status(400).json({ success: false, message: 'Email atau username sudah terdaftar.' });
    }

    const passwordHash = bcrypt.hashSync(password, 10);
    const defaultAvatar = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}&backgroundColor=4f46e5`;

    const result = db.prepare(`
      INSERT INTO users (name, username, email, password_hash, role, bio, avatar, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'active')
    `).run(name, username, email, passwordHash, role, bio || '', defaultAvatar);

    const created = db.prepare('SELECT id, name, username, email, role, bio, avatar, status, created_at FROM users WHERE id = ?').get(result.lastInsertRowid);

    return res.status(201).json({
      success: true,
      message: 'Pengguna baru berhasil ditambahkan.',
      data: created,
    });
  } catch (error) {
    console.error('createUser error:', error);
    return res.status(500).json({ success: false, message: 'Gagal membuat pengguna baru.' });
  }
};

// PUT /api/users/:id/role (Admin only)
exports.updateUserRole = (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    const currentAdminId = req.user.id;

    const validRoles = ['admin', 'editor', 'author', 'reader'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ success: false, message: 'Peran tidak valid.' });
    }

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Pengguna tidak ditemukan.' });
    }

    // Protect superadmin from demoting self if only 1 admin
    if (parseInt(id) === currentAdminId && role !== 'admin') {
      const adminCount = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'admin' AND status = 'active'").get().count;
      if (adminCount <= 1) {
        return res.status(400).json({ success: false, message: 'Anda tidak dapat mengubah peran Anda sendiri karena Anda adalah satu-satunya admin aktif.' });
      }
    }

    db.prepare('UPDATE users SET role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(role, id);

    return res.json({
      success: true,
      message: `Peran pengguna ${user.name} berhasil diubah menjadi ${role.toUpperCase()}.`,
    });
  } catch (error) {
    console.error('updateUserRole error:', error);
    return res.status(500).json({ success: false, message: 'Gagal memperbarui peran pengguna.' });
  }
};

// PUT /api/users/:id/status (Admin only)
exports.updateUserStatus = (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const currentAdminId = req.user.id;

    const validStatuses = ['active', 'inactive', 'banned'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Status tidak valid.' });
    }

    if (parseInt(id) === currentAdminId && status !== 'active') {
      return res.status(400).json({ success: false, message: 'Anda tidak dapat menonaktifkan akun admin Anda sendiri.' });
    }

    db.prepare('UPDATE users SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, id);

    return res.json({
      success: true,
      message: `Status akun berhasil diubah menjadi ${status}.`,
    });
  } catch (error) {
    console.error('updateUserStatus error:', error);
    return res.status(500).json({ success: false, message: 'Gagal memperbarui status pengguna.' });
  }
};

// DELETE /api/users/:id (Admin only)
exports.deleteUser = (req, res) => {
  try {
    const { id } = req.params;
    const currentAdminId = req.user.id;

    if (parseInt(id) === currentAdminId) {
      return res.status(400).json({ success: false, message: 'Anda tidak dapat menghapus akun Anda sendiri.' });
    }

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Pengguna tidak ditemukan.' });
    }

    db.prepare('DELETE FROM users WHERE id = ?').run(id);

    return res.json({ success: true, message: `Pengguna ${user.name} berhasil dihapus.` });
  } catch (error) {
    console.error('deleteUser error:', error);
    return res.status(500).json({ success: false, message: 'Gagal menghapus pengguna.' });
  }
};

// GET /api/users/author/:id (Public author profile)
exports.getPublicAuthorProfile = (req, res) => {
  try {
    const { id } = req.params;
    const author = db.prepare(`
      SELECT id, name, username, bio, avatar, created_at, role
      FROM users
      WHERE id = ? OR username = ?
    `).get(id, id);

    if (!author) {
      return res.status(404).json({ success: false, message: 'Profil penulis tidak ditemukan.' });
    }

    const stats = db.prepare(`
      SELECT 
        COUNT(*) as total_articles,
        COALESCE(SUM(view_count), 0) as total_views,
        (SELECT COUNT(*) FROM likes WHERE article_id IN (SELECT id FROM articles WHERE author_id = ?)) as total_likes
      FROM articles
      WHERE author_id = ? AND status = 'published'
    `).get(author.id, author.id);

    const articles = db.prepare(`
      SELECT 
        articles.id,
        articles.title,
        articles.slug,
        articles.excerpt,
        articles.cover_image,
        articles.reading_time,
        articles.view_count,
        articles.created_at,
        categories.name as category_name,
        categories.slug as category_slug,
        categories.color as category_color,
        (SELECT COUNT(*) FROM likes WHERE likes.article_id = articles.id) as likes_count
      FROM articles
      JOIN categories ON categories.id = articles.category_id
      WHERE articles.author_id = ? AND articles.status = 'published'
      ORDER BY articles.created_at DESC
    `).all(author.id);

    return res.json({
      success: true,
      data: {
        author,
        stats,
        articles,
      }
    });
  } catch (error) {
    console.error('getPublicAuthorProfile error:', error);
    return res.status(500).json({ success: false, message: 'Gagal mengambil profil penulis.' });
  }
};
