let DatabaseSync;
try {
  DatabaseSync = require('node:sqlite').DatabaseSync;
} catch (e) {
  console.error('========================================================================');
  console.error('❌ ERROR: Modul node:sqlite tidak ditemukan.');
  console.error('Pastikan versi Node.js di cPanel Anda dipilih versi 22.x atau yang terbaru.');
  console.error('Buka menu "Setup Node.js App" di cPanel dan ubah Node.js Version ke 22.x.');
  console.error('========================================================================');
  throw new Error('Node.js versi 22.5.0+ dibutuhkan untuk menjalankan modul database SQLite bawaan.');
}

const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'database.sqlite');
const db = new DatabaseSync(dbPath);

// Enable foreign keys
db.exec('PRAGMA foreign_keys = ON;');

function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'reader' CHECK(role IN ('admin', 'editor', 'author', 'reader')),
      bio TEXT DEFAULT '',
      avatar TEXT DEFAULT '/images/default-avatar.png',
      status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive', 'banned')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      slug TEXT NOT NULL UNIQUE,
      description TEXT DEFAULT '',
      icon TEXT DEFAULT 'tag',
      color TEXT DEFAULT 'indigo',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      slug TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS articles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      author_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
      title TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      excerpt TEXT NOT NULL,
      content TEXT NOT NULL,
      cover_image TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'pending', 'published', 'rejected')),
      reject_reason TEXT DEFAULT '',
      is_featured INTEGER DEFAULT 0,
      view_count INTEGER DEFAULT 0,
      reading_time INTEGER DEFAULT 3,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      published_at DATETIME
    );

    CREATE TABLE IF NOT EXISTS article_tags (
      article_id INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
      tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
      PRIMARY KEY (article_id, tag_id)
    );

    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      article_id INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      parent_id INTEGER REFERENCES comments(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      status TEXT DEFAULT 'approved' CHECK(status IN ('approved', 'pending', 'spam')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS likes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      article_id INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(article_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS bookmarks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      article_id INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(article_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      description TEXT DEFAULT ''
    );
  `);
}

module.exports = { db, initDatabase };
