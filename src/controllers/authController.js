const bcrypt = require('bcryptjs');
const { db } = require('../config/database');
const { generateToken } = require('../middleware/auth');

exports.login = (req, res) => {
  try {
    const { login, password } = req.body; // login can be email or username

    if (!login || !password) {
      return res.status(400).json({ success: false, message: 'Email/Username dan kata sandi wajib diisi.' });
    }

    const user = db.prepare('SELECT * FROM users WHERE email = ? OR username = ?').get(login, login);

    if (!user) {
      return res.status(401).json({ success: false, message: 'Kombinasi email/username atau kata sandi salah.' });
    }

    if (user.status !== 'active') {
      return res.status(403).json({ success: false, message: 'Akun Anda dinonaktifkan atau ditangguhkan oleh Administrator.' });
    }

    const isMatch = bcrypt.compareSync(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Kombinasi email/username atau kata sandi salah.' });
    }

    const token = generateToken(user);

    // Set cookie
    res.cookie('token', token, {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      sameSite: 'lax',
    });

    const safeUser = {
      id: user.id,
      name: user.name,
      username: user.username,
      email: user.email,
      role: user.role,
      bio: user.bio,
      avatar: user.avatar,
    };

    return res.json({
      success: true,
      message: `Selamat datang kembali, ${user.name}!`,
      token,
      user: safeUser,
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan pada server.' });
  }
};

exports.register = (req, res) => {
  try {
    const { name, username, email, password } = req.body;

    if (!name || !username || !email || !password) {
      return res.status(400).json({ success: false, message: 'Semua kolom pendaftaran wajib diisi.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Kata sandi minimal 6 karakter.' });
    }

    // Check existing
    const existing = db.prepare('SELECT id FROM users WHERE email = ? OR username = ?').get(email, username);
    if (existing) {
      return res.status(400).json({ success: false, message: 'Email atau username sudah terdaftar.' });
    }

    const passwordHash = bcrypt.hashSync(password, 10);
    const defaultAvatar = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}&backgroundColor=4f46e5`;

    const result = db.prepare(`
      INSERT INTO users (name, username, email, password_hash, role, bio, avatar, status)
      VALUES (?, ?, ?, ?, 'reader', '', ?, 'active')
    `).run(name, username, email, passwordHash, defaultAvatar);

    const newUser = {
      id: result.lastInsertRowid,
      name,
      username,
      email,
      role: 'reader',
      bio: '',
      avatar: defaultAvatar,
    };

    const token = generateToken(newUser);

    res.cookie('token', token, {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: 'lax',
    });

    return res.status(201).json({
      success: true,
      message: 'Registrasi berhasil! Anda masuk sebagai Pembaca.',
      token,
      user: newUser,
    });
  } catch (error) {
    console.error('Register error:', error);
    return res.status(500).json({ success: false, message: 'Gagal melakukan pendaftaran.' });
  }
};

exports.getMe = (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ success: false, message: 'Belum login.' });
    }

    // Fetch stats
    const articleCount = db.prepare('SELECT COUNT(*) as count FROM articles WHERE author_id = ?').get(user.id).count;
    const bookmarkCount = db.prepare('SELECT COUNT(*) as count FROM bookmarks WHERE user_id = ?').get(user.id).count;
    const commentCount = db.prepare('SELECT COUNT(*) as count FROM comments WHERE user_id = ?').get(user.id).count;

    return res.json({
      success: true,
      user: {
        ...user,
        stats: {
          articles: articleCount,
          bookmarks: bookmarkCount,
          comments: commentCount,
        }
      }
    });
  } catch (error) {
    console.error('getMe error:', error);
    return res.status(500).json({ success: false, message: 'Gagal mengambil data profil.' });
  }
};

exports.updateProfile = (req, res) => {
  try {
    const userId = req.user.id;
    const { name, bio, current_password, new_password } = req.body;

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);

    let avatarPath = user.avatar;
    if (req.file) {
      avatarPath = `/uploads/avatars/${req.file.filename}`;
    }

    let passwordHash = user.password_hash;
    if (new_password) {
      if (!current_password) {
        return res.status(400).json({ success: false, message: 'Kata sandi saat ini wajib diisi untuk mengubah kata sandi baru.' });
      }
      if (!bcrypt.compareSync(current_password, user.password_hash)) {
        return res.status(400).json({ success: false, message: 'Kata sandi saat ini tidak cocok.' });
      }
      if (new_password.length < 6) {
        return res.status(400).json({ success: false, message: 'Kata sandi baru minimal 6 karakter.' });
      }
      passwordHash = bcrypt.hashSync(new_password, 10);
    }

    db.prepare(`
      UPDATE users 
      SET name = ?, bio = ?, avatar = ?, password_hash = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(name || user.name, bio !== undefined ? bio : user.bio, avatarPath, passwordHash, userId);

    const updated = db.prepare('SELECT id, name, username, email, role, bio, avatar FROM users WHERE id = ?').get(userId);
    const token = generateToken(updated);

    res.cookie('token', token, {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: 'lax',
    });

    return res.json({
      success: true,
      message: 'Profil berhasil diperbarui.',
      token,
      user: updated,
    });
  } catch (error) {
    console.error('Update profile error:', error);
    return res.status(500).json({ success: false, message: 'Gagal memperbarui profil.' });
  }
};

exports.switchDemoRole = (req, res) => {
  try {
    const { role } = req.params;
    const validRoles = ['admin', 'editor', 'author', 'reader'];

    if (!validRoles.includes(role)) {
      return res.status(400).json({ success: false, message: 'Role demo tidak valid.' });
    }

    const demoUser = db.prepare("SELECT * FROM users WHERE role = ? AND status = 'active' LIMIT 1").get(role);

    if (!demoUser) {
      return res.status(404).json({ success: false, message: `Akun demo untuk peran ${role} tidak ditemukan.` });
    }

    const token = generateToken(demoUser);

    res.cookie('token', token, {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: 'lax',
    });

    return res.json({
      success: true,
      message: `Berhasil beralih akun demo ke: ${demoUser.name} (${demoUser.role.toUpperCase()})`,
      token,
      user: {
        id: demoUser.id,
        name: demoUser.name,
        username: demoUser.username,
        email: demoUser.email,
        role: demoUser.role,
        bio: demoUser.bio,
        avatar: demoUser.avatar,
      }
    });
  } catch (error) {
    console.error('Switch demo role error:', error);
    return res.status(500).json({ success: false, message: 'Gagal beralih akun demo.' });
  }
};

exports.logout = (req, res) => {
  res.clearCookie('token');
  return res.json({ success: true, message: 'Berhasil keluar (logout).' });
};
