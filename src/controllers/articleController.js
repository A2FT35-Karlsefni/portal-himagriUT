const slugify = require('slugify');
const sanitizeHtml = require('sanitize-html');
const { db } = require('../config/database');

const sanitizeOptions = {
  allowedTags: sanitizeHtml.defaults.allowedTags.concat(['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'img', 'blockquote', 'code', 'pre', 'span']),
  allowedAttributes: {
    ...sanitizeHtml.defaults.allowedAttributes,
    img: ['src', 'alt', 'title', 'width', 'height', 'loading', 'class'],
    a: ['href', 'name', 'target', 'rel', 'class'],
    span: ['class'],
    code: ['class'],
  }
};

function calculateReadingTime(content) {
  const text = content.replace(/<[^>]*>/g, '');
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(wordCount / 200));
}

function generateUniqueSlug(title, currentId = null) {
  const baseSlug = slugify(title, { lower: true, strict: true }) || 'artikel-' + Date.now();
  let slug = baseSlug;
  let counter = 1;

  while (true) {
    let query = 'SELECT id FROM articles WHERE slug = ?';
    let params = [slug];
    if (currentId) {
      query += ' AND id != ?';
      params.push(currentId);
    }
    const existing = db.prepare(query).get(...params);
    if (!existing) {
      return slug;
    }
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
}

// GET /api/articles (Public & Filtered)
exports.getArticles = (req, res) => {
  try {
    const {
      category,
      tag,
      author,
      search,
      status = 'published',
      sort = 'latest',
      page = 1,
      limit = 9,
      is_featured,
    } = req.query;

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 9));
    const offset = (pageNum - 1) * limitNum;

    let whereClauses = [];
    let params = [];

    // Role-based status filtering
    const userRole = req.user ? req.user.role : 'guest';
    const userId = req.user ? req.user.id : null;

    if (status === 'all') {
      if (userRole === 'admin' || userRole === 'editor') {
        // Can see all
      } else if (userRole === 'author') {
        whereClauses.push("(articles.status = 'published' OR articles.author_id = ?)");
        params.push(userId);
      } else {
        whereClauses.push("articles.status = 'published'");
      }
    } else {
      whereClauses.push('articles.status = ?');
      params.push(status);

      if (status !== 'published' && userRole === 'author') {
        whereClauses.push('articles.author_id = ?');
        params.push(userId);
      }
    }

    if (category) {
      whereClauses.push('(categories.slug = ? OR categories.id = ?)');
      params.push(category, category);
    }

    if (author) {
      whereClauses.push('articles.author_id = ?');
      params.push(author);
    }

    if (is_featured !== undefined) {
      whereClauses.push('articles.is_featured = ?');
      params.push(parseInt(is_featured) ? 1 : 0);
    }

    if (search) {
      whereClauses.push('(articles.title LIKE ? OR articles.excerpt LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }

    if (tag) {
      whereClauses.push(`articles.id IN (
        SELECT at.article_id FROM article_tags at
        JOIN tags t ON t.id = at.tag_id
        WHERE t.slug = ? OR t.name = ?
      )`);
      params.push(tag, tag);
    }

    const whereSql = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';

    // Sort order
    let orderSql = 'ORDER BY articles.created_at DESC';
    if (sort === 'popular') {
      orderSql = 'ORDER BY articles.view_count DESC, articles.created_at DESC';
    } else if (sort === 'oldest') {
      orderSql = 'ORDER BY articles.created_at ASC';
    } else if (sort === 'featured') {
      orderSql = 'ORDER BY articles.is_featured DESC, articles.created_at DESC';
    }

    // Count query
    const countSql = `
      SELECT COUNT(*) as total
      FROM articles
      JOIN users ON users.id = articles.author_id
      JOIN categories ON categories.id = articles.category_id
      ${whereSql}
    `;
    const total = db.prepare(countSql).get(...params).total;

    // Data query
    const dataSql = `
      SELECT 
        articles.id,
        articles.title,
        articles.slug,
        articles.excerpt,
        articles.cover_image,
        articles.status,
        articles.reject_reason,
        articles.is_featured,
        articles.view_count,
        articles.reading_time,
        articles.created_at,
        articles.published_at,
        users.id as author_id,
        users.name as author_name,
        users.avatar as author_avatar,
        users.username as author_username,
        categories.id as category_id,
        categories.name as category_name,
        categories.slug as category_slug,
        categories.color as category_color,
        (SELECT COUNT(*) FROM comments WHERE comments.article_id = articles.id AND comments.status = 'approved') as comments_count,
        (SELECT COUNT(*) FROM likes WHERE likes.article_id = articles.id) as likes_count
      FROM articles
      JOIN users ON users.id = articles.author_id
      JOIN categories ON categories.id = articles.category_id
      ${whereSql}
      ${orderSql}
      LIMIT ? OFFSET ?
    `;

    const articles = db.prepare(dataSql).all(...params, limitNum, offset);

    // Fetch tags for these articles
    if (articles.length > 0) {
      const articleIds = articles.map(a => a.id);
      const tagsSql = `
        SELECT at.article_id, t.id, t.name, t.slug
        FROM article_tags at
        JOIN tags t ON t.id = at.tag_id
        WHERE at.article_id IN (${articleIds.join(',')})
      `;
      const allTags = db.prepare(tagsSql).all();

      // Check if user liked/bookmarked
      let userLikes = new Set();
      let userBookmarks = new Set();
      if (userId) {
        const likes = db.prepare(`SELECT article_id FROM likes WHERE user_id = ? AND article_id IN (${articleIds.join(',')})`).all(userId);
        likes.forEach(l => userLikes.add(l.article_id));

        const bms = db.prepare(`SELECT article_id FROM bookmarks WHERE user_id = ? AND article_id IN (${articleIds.join(',')})`).all(userId);
        bms.forEach(b => userBookmarks.add(b.article_id));
      }

      articles.forEach(article => {
        article.tags = allTags.filter(t => t.article_id === article.id);
        article.is_liked = userLikes.has(article.id);
        article.is_bookmarked = userBookmarks.has(article.id);
      });
    }

    return res.json({
      success: true,
      data: articles,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      }
    });
  } catch (error) {
    console.error('getArticles error:', error);
    return res.status(500).json({ success: false, message: 'Gagal mengambil daftar artikel.' });
  }
};

// GET /api/articles/:slug
exports.getArticleBySlug = (req, res) => {
  try {
    const { slug } = req.params;
    const userId = req.user ? req.user.id : null;
    const userRole = req.user ? req.user.role : 'guest';

    const article = db.prepare(`
      SELECT 
        articles.*,
        users.id as author_id,
        users.name as author_name,
        users.username as author_username,
        users.avatar as author_avatar,
        users.bio as author_bio,
        categories.id as category_id,
        categories.name as category_name,
        categories.slug as category_slug,
        categories.color as category_color,
        (SELECT COUNT(*) FROM comments WHERE comments.article_id = articles.id AND comments.status = 'approved') as comments_count,
        (SELECT COUNT(*) FROM likes WHERE likes.article_id = articles.id) as likes_count
      FROM articles
      JOIN users ON users.id = articles.author_id
      JOIN categories ON categories.id = articles.category_id
      WHERE articles.slug = ?
    `).get(slug);

    if (!article) {
      return res.status(404).json({ success: false, message: 'Artikel tidak ditemukan.' });
    }

    // Permission check for non-published articles
    if (article.status !== 'published') {
      const isAuthor = userId === article.author_id;
      const isPrivileged = userRole === 'admin' || userRole === 'editor';
      if (!isAuthor && !isPrivileged) {
        return res.status(403).json({ success: false, message: 'Artikel ini belum dipublikasikan.' });
      }
    } else {
      // Increment views count asynchronously
      db.prepare('UPDATE articles SET view_count = view_count + 1 WHERE id = ?').run(article.id);
      article.view_count += 1;
    }

    // Fetch tags
    article.tags = db.prepare(`
      SELECT t.id, t.name, t.slug
      FROM article_tags at
      JOIN tags t ON t.id = at.tag_id
      WHERE at.article_id = ?
    `).all(article.id);

    // Check user interaction
    article.is_liked = false;
    article.is_bookmarked = false;
    if (userId) {
      const liked = db.prepare('SELECT id FROM likes WHERE article_id = ? AND user_id = ?').get(article.id, userId);
      const bookmarked = db.prepare('SELECT id FROM bookmarks WHERE article_id = ? AND user_id = ?').get(article.id, userId);
      article.is_liked = !!liked;
      article.is_bookmarked = !!bookmarked;
    }

    return res.json({ success: true, data: article });
  } catch (error) {
    console.error('getArticleBySlug error:', error);
    return res.status(500).json({ success: false, message: 'Gagal mengambil detail artikel.' });
  }
};

// POST /api/articles (Create Article)
exports.createArticle = (req, res) => {
  try {
    const { title, excerpt, content, category_id, tags, cover_url } = req.body;
    let { status = 'draft', is_featured = 0 } = req.body;
    const user = req.user;

    if (!title || !content || !category_id) {
      return res.status(400).json({ success: false, message: 'Judul, konten, dan kategori artikel wajib diisi.' });
    }

    // Verify category exists
    const category = db.prepare('SELECT id FROM categories WHERE id = ?').get(category_id);
    if (!category) {
      return res.status(400).json({ success: false, message: 'Kategori yang dipilih tidak valid.' });
    }

    // Role-based status protection
    // Authors can only create 'draft' or 'pending'
    if (user.role === 'author') {
      if (status === 'published') {
        status = 'pending'; // Authors require review
      }
      is_featured = 0; // Authors cannot feature articles directly
    }

    let coverImage = cover_url || 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=1200&auto=format&fit=crop&q=80';
    if (req.file) {
      coverImage = `/uploads/covers/${req.file.filename}`;
    }

    const cleanContent = sanitizeHtml(content, sanitizeOptions);
    const generatedExcerpt = excerpt || cleanContent.replace(/<[^>]*>/g, '').slice(0, 160) + '...';
    const readingTime = calculateReadingTime(cleanContent);
    const slug = generateUniqueSlug(title);

    const publishedAt = status === 'published' ? new Date().toISOString() : null;

    const result = db.prepare(`
      INSERT INTO articles (
        author_id, category_id, title, slug, excerpt, content, cover_image, status, is_featured, reading_time, published_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      user.id,
      category_id,
      title,
      slug,
      generatedExcerpt,
      cleanContent,
      coverImage,
      status,
      parseInt(is_featured) || 0,
      readingTime,
      publishedAt
    );

    const articleId = result.lastInsertRowid;

    // Handle tags
    if (tags) {
      const tagList = Array.isArray(tags) ? tags : String(tags).split(',').map(t => t.trim()).filter(Boolean);
      for (const tagName of tagList) {
        const tagSlug = slugify(tagName, { lower: true, strict: true });
        let tagRecord = db.prepare('SELECT id FROM tags WHERE slug = ?').get(tagSlug);
        if (!tagRecord) {
          const insertTag = db.prepare('INSERT INTO tags (name, slug) VALUES (?, ?)').run(tagName, tagSlug);
          tagRecord = { id: insertTag.lastInsertRowid };
        }
        db.prepare('INSERT OR IGNORE INTO article_tags (article_id, tag_id) VALUES (?, ?)').run(articleId, tagRecord.id);
      }
    }

    const createdArticle = db.prepare('SELECT * FROM articles WHERE id = ?').get(articleId);

    let message = 'Artikel berhasil disimpan sebagai Draf.';
    if (status === 'pending') {
      message = 'Artikel berhasil diajukan dan sedang menunggu peninjauan Editor/Admin.';
    } else if (status === 'published') {
      message = 'Artikel berhasil diterbitkan langsung!';
    }

    return res.status(201).json({
      success: true,
      message,
      data: createdArticle,
    });
  } catch (error) {
    console.error('createArticle error:', error);
    return res.status(500).json({ success: false, message: 'Gagal membuat artikel baru.' });
  }
};

// PUT /api/articles/:id (Update Article)
exports.updateArticle = (req, res) => {
  try {
    const { id } = req.params;
    const { title, excerpt, content, category_id, tags, cover_url, status, is_featured, reject_reason } = req.body;
    const user = req.user;

    const article = db.prepare('SELECT * FROM articles WHERE id = ?').get(id);
    if (!article) {
      return res.status(404).json({ success: false, message: 'Artikel tidak ditemukan.' });
    }

    const isAuthor = article.author_id === user.id;
    const isPrivileged = user.role === 'admin' || user.role === 'editor';

    if (!isAuthor && !isPrivileged) {
      return res.status(403).json({ success: false, message: 'Anda tidak memiliki hak untuk mengedit artikel ini.' });
    }

    let nextStatus = status !== undefined ? status : article.status;
    let nextFeatured = is_featured !== undefined ? parseInt(is_featured) : article.is_featured;
    let nextRejectReason = reject_reason !== undefined ? reject_reason : article.reject_reason;

    // Authors cannot publish directly or set featured
    if (user.role === 'author') {
      if (status === 'published' && article.status !== 'published') {
        nextStatus = 'pending';
      }
      nextFeatured = article.is_featured;
      nextRejectReason = article.reject_reason;
    }

    let nextCover = cover_url || article.cover_image;
    if (req.file) {
      nextCover = `/uploads/covers/${req.file.filename}`;
    }

    let newSlug = article.slug;
    if (title && title !== article.title) {
      newSlug = generateUniqueSlug(title, article.id);
    }

    const cleanContent = content ? sanitizeHtml(content, sanitizeOptions) : article.content;
    const nextExcerpt = excerpt || (content ? cleanContent.replace(/<[^>]*>/g, '').slice(0, 160) + '...' : article.excerpt);
    const readingTime = calculateReadingTime(cleanContent);

    let publishedAt = article.published_at;
    if (nextStatus === 'published' && !publishedAt) {
      publishedAt = new Date().toISOString();
    }

    db.prepare(`
      UPDATE articles 
      SET 
        title = ?,
        slug = ?,
        excerpt = ?,
        content = ?,
        category_id = ?,
        cover_image = ?,
        status = ?,
        reject_reason = ?,
        is_featured = ?,
        reading_time = ?,
        published_at = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      title || article.title,
      newSlug,
      nextExcerpt,
      cleanContent,
      category_id || article.category_id,
      nextCover,
      nextStatus,
      nextRejectReason,
      nextFeatured,
      readingTime,
      publishedAt,
      id
    );

    // Update tags if provided
    if (tags !== undefined) {
      db.prepare('DELETE FROM article_tags WHERE article_id = ?').run(id);
      const tagList = Array.isArray(tags) ? tags : String(tags).split(',').map(t => t.trim()).filter(Boolean);
      for (const tagName of tagList) {
        const tagSlug = slugify(tagName, { lower: true, strict: true });
        let tagRecord = db.prepare('SELECT id FROM tags WHERE slug = ?').get(tagSlug);
        if (!tagRecord) {
          const insertTag = db.prepare('INSERT INTO tags (name, slug) VALUES (?, ?)').run(tagName, tagSlug);
          tagRecord = { id: insertTag.lastInsertRowid };
        }
        db.prepare('INSERT OR IGNORE INTO article_tags (article_id, tag_id) VALUES (?, ?)').run(id, tagRecord.id);
      }
    }

    const updated = db.prepare('SELECT * FROM articles WHERE id = ?').get(id);
    return res.json({
      success: true,
      message: 'Artikel berhasil diperbarui.',
      data: updated,
    });
  } catch (error) {
    console.error('updateArticle error:', error);
    return res.status(500).json({ success: false, message: 'Gagal memperbarui artikel.' });
  }
};

// DELETE /api/articles/:id
exports.deleteArticle = (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    const article = db.prepare('SELECT * FROM articles WHERE id = ?').get(id);
    if (!article) {
      return res.status(404).json({ success: false, message: 'Artikel tidak ditemukan.' });
    }

    const isAuthor = article.author_id === user.id;
    const isPrivileged = user.role === 'admin' || user.role === 'editor';

    if (!isAuthor && !isPrivileged) {
      return res.status(403).json({ success: false, message: 'Anda tidak berhak menghapus artikel ini.' });
    }

    db.prepare('DELETE FROM articles WHERE id = ?').run(id);
    return res.json({ success: true, message: 'Artikel berhasil dihapus.' });
  } catch (error) {
    console.error('deleteArticle error:', error);
    return res.status(500).json({ success: false, message: 'Gagal menghapus artikel.' });
  }
};

// POST /api/articles/:id/like (Toggle Like)
exports.toggleLike = (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const article = db.prepare('SELECT id FROM articles WHERE id = ?').get(id);
    if (!article) {
      return res.status(404).json({ success: false, message: 'Artikel tidak ditemukan.' });
    }

    const existing = db.prepare('SELECT id FROM likes WHERE article_id = ? AND user_id = ?').get(id, userId);

    let isLiked = false;
    if (existing) {
      db.prepare('DELETE FROM likes WHERE id = ?').run(existing.id);
      isLiked = false;
    } else {
      db.prepare('INSERT INTO likes (article_id, user_id) VALUES (?, ?)').run(id, userId);
      isLiked = true;
    }

    const totalLikes = db.prepare('SELECT COUNT(*) as count FROM likes WHERE article_id = ?').get(id).count;

    return res.json({
      success: true,
      is_liked: isLiked,
      total_likes: totalLikes,
      message: isLiked ? 'Menyukai artikel ini' : 'Batal menyukai artikel',
    });
  } catch (error) {
    console.error('toggleLike error:', error);
    return res.status(500).json({ success: false, message: 'Gagal memperbarui status suka.' });
  }
};

// POST /api/articles/:id/bookmark (Toggle Bookmark)
exports.toggleBookmark = (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const article = db.prepare('SELECT id FROM articles WHERE id = ?').get(id);
    if (!article) {
      return res.status(404).json({ success: false, message: 'Artikel tidak ditemukan.' });
    }

    const existing = db.prepare('SELECT id FROM bookmarks WHERE article_id = ? AND user_id = ?').get(id, userId);

    let isBookmarked = false;
    if (existing) {
      db.prepare('DELETE FROM bookmarks WHERE id = ?').run(existing.id);
      isBookmarked = false;
    } else {
      db.prepare('INSERT INTO bookmarks (article_id, user_id) VALUES (?, ?)').run(id, userId);
      isBookmarked = true;
    }

    return res.json({
      success: true,
      is_bookmarked: isBookmarked,
      message: isBookmarked ? 'Artikel ditambahkan ke daftar bacaan Anda.' : 'Artikel dihapus dari daftar bacaan.',
    });
  } catch (error) {
    console.error('toggleBookmark error:', error);
    return res.status(500).json({ success: false, message: 'Gagal memperbarui daftar bacaan.' });
  }
};

// GET /api/articles/user/bookmarks (User's Saved Articles)
exports.getMyBookmarks = (req, res) => {
  try {
    const userId = req.user.id;
    const articles = db.prepare(`
      SELECT 
        articles.id,
        articles.title,
        articles.slug,
        articles.excerpt,
        articles.cover_image,
        articles.reading_time,
        articles.created_at,
        categories.name as category_name,
        categories.slug as category_slug,
        categories.color as category_color,
        users.name as author_name,
        users.avatar as author_avatar
      FROM bookmarks
      JOIN articles ON articles.id = bookmarks.article_id
      JOIN users ON users.id = articles.author_id
      JOIN categories ON categories.id = articles.category_id
      WHERE bookmarks.user_id = ?
      ORDER BY bookmarks.created_at DESC
    `).all(userId);

    return res.json({ success: true, data: articles });
  } catch (error) {
    console.error('getMyBookmarks error:', error);
    return res.status(500).json({ success: false, message: 'Gagal mengambil artikel tersimpan.' });
  }
};
