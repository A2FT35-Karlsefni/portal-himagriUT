const slugify = require('slugify');
const { db } = require('../config/database');

exports.getCategories = (req, res) => {
  try {
    const categories = db.prepare(`
      SELECT 
        categories.*,
        (SELECT COUNT(*) FROM articles WHERE articles.category_id = categories.id AND articles.status = 'published') as article_count
      FROM categories
      ORDER BY categories.name ASC
    `).all();

    return res.json({ success: true, data: categories });
  } catch (error) {
    console.error('getCategories error:', error);
    return res.status(500).json({ success: false, message: 'Gagal mengambil data kategori.' });
  }
};

exports.getCategoryBySlug = (req, res) => {
  try {
    const { slug } = req.params;
    const category = db.prepare(`
      SELECT 
        categories.*,
        (SELECT COUNT(*) FROM articles WHERE articles.category_id = categories.id AND articles.status = 'published') as article_count
      FROM categories
      WHERE categories.slug = ?
    `).get(slug);

    if (!category) {
      return res.status(404).json({ success: false, message: 'Kategori tidak ditemukan.' });
    }

    return res.json({ success: true, data: category });
  } catch (error) {
    console.error('getCategoryBySlug error:', error);
    return res.status(500).json({ success: false, message: 'Gagal mengambil informasi kategori.' });
  }
};

exports.createCategory = (req, res) => {
  try {
    const { name, description, icon, color } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: 'Nama kategori wajib diisi.' });
    }

    const slug = slugify(name, { lower: true, strict: true });
    const existing = db.prepare('SELECT id FROM categories WHERE slug = ? OR name = ?').get(slug, name);
    if (existing) {
      return res.status(400).json({ success: false, message: 'Kategori dengan nama atau slug ini sudah ada.' });
    }

    const result = db.prepare(`
      INSERT INTO categories (name, slug, description, icon, color)
      VALUES (?, ?, ?, ?, ?)
    `).run(name, slug, description || '', icon || 'tag', color || 'indigo');

    const created = db.prepare('SELECT * FROM categories WHERE id = ?').get(result.lastInsertRowid);
    return res.status(201).json({ success: true, message: 'Kategori berhasil dibuat.', data: created });
  } catch (error) {
    console.error('createCategory error:', error);
    return res.status(500).json({ success: false, message: 'Gagal membuat kategori.' });
  }
};

exports.updateCategory = (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, icon, color } = req.body;

    const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Kategori tidak ditemukan.' });
    }

    let slug = category.slug;
    if (name && name !== category.name) {
      slug = slugify(name, { lower: true, strict: true });
      const duplicate = db.prepare('SELECT id FROM categories WHERE (slug = ? OR name = ?) AND id != ?').get(slug, name, id);
      if (duplicate) {
        return res.status(400).json({ success: false, message: 'Nama kategori tersebut sudah digunakan.' });
      }
    }

    db.prepare(`
      UPDATE categories
      SET name = ?, slug = ?, description = ?, icon = ?, color = ?
      WHERE id = ?
    `).run(
      name || category.name,
      slug,
      description !== undefined ? description : category.description,
      icon || category.icon,
      color || category.color,
      id
    );

    const updated = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
    return res.json({ success: true, message: 'Kategori berhasil diperbarui.', data: updated });
  } catch (error) {
    console.error('updateCategory error:', error);
    return res.status(500).json({ success: false, message: 'Gagal memperbarui kategori.' });
  }
};

exports.deleteCategory = (req, res) => {
  try {
    const { id } = req.params;
    // Check if articles exist
    const count = db.prepare('SELECT COUNT(*) as count FROM articles WHERE category_id = ?').get(id).count;
    if (count > 0) {
      return res.status(400).json({
        success: false,
        message: `Kategori tidak dapat dihapus karena masih digunakan oleh ${count} artikel.`
      });
    }

    db.prepare('DELETE FROM categories WHERE id = ?').run(id);
    return res.json({ success: true, message: 'Kategori berhasil dihapus.' });
  } catch (error) {
    console.error('deleteCategory error:', error);
    return res.status(500).json({ success: false, message: 'Gagal menghapus kategori.' });
  }
};

exports.getTags = (req, res) => {
  try {
    const tags = db.prepare(`
      SELECT 
        tags.id,
        tags.name,
        tags.slug,
        COUNT(article_tags.article_id) as article_count
      FROM tags
      LEFT JOIN article_tags ON article_tags.tag_id = tags.id
      GROUP BY tags.id
      ORDER BY article_count DESC, tags.name ASC
    `).all();

    return res.json({ success: true, data: tags });
  } catch (error) {
    console.error('getTags error:', error);
    return res.status(500).json({ success: false, message: 'Gagal mengambil tag.' });
  }
};
