const sanitizeHtml = require('sanitize-html');
const { db } = require('../config/database');

// GET /api/comments/article/:articleId (Public)
exports.getCommentsByArticle = (req, res) => {
  try {
    const { articleId } = req.params;

    const rawComments = db.prepare(`
      SELECT 
        comments.id,
        comments.article_id,
        comments.parent_id,
        comments.content,
        comments.status,
        comments.created_at,
        users.id as user_id,
        users.name as user_name,
        users.username as user_username,
        users.avatar as user_avatar,
        users.role as user_role
      FROM comments
      JOIN users ON users.id = comments.user_id
      WHERE comments.article_id = ? AND comments.status = 'approved'
      ORDER BY comments.created_at ASC
    `).all(articleId);

    // Group comments into parent -> replies
    const commentMap = {};
    const rootComments = [];

    rawComments.forEach(c => {
      commentMap[c.id] = { ...c, replies: [] };
    });

    rawComments.forEach(c => {
      if (c.parent_id && commentMap[c.parent_id]) {
        commentMap[c.parent_id].replies.push(commentMap[c.id]);
      } else {
        rootComments.push(commentMap[c.id]);
      }
    });

    return res.json({ success: true, data: rootComments, total: rawComments.length });
  } catch (error) {
    console.error('getCommentsByArticle error:', error);
    return res.status(500).json({ success: false, message: 'Gagal mengambil komentar.' });
  }
};

// POST /api/comments (Auth required)
exports.addComment = (req, res) => {
  try {
    const { article_id, parent_id, content } = req.body;
    const user = req.user;

    if (!article_id || !content || !content.trim()) {
      return res.status(400).json({ success: false, message: 'Komentar tidak boleh kosong.' });
    }

    const article = db.prepare('SELECT id, status FROM articles WHERE id = ?').get(article_id);
    if (!article || article.status !== 'published') {
      return res.status(400).json({ success: false, message: 'Artikel tidak ditemukan atau belum dipublikasikan.' });
    }

    if (parent_id) {
      const parent = db.prepare('SELECT id FROM comments WHERE id = ? AND article_id = ?').get(parent_id, article_id);
      if (!parent) {
        return res.status(400).json({ success: false, message: 'Komentar induk yang dibalas tidak ditemukan.' });
      }
    }

    const cleanContent = sanitizeHtml(content.trim(), {
      allowedTags: ['b', 'i', 'em', 'strong', 'code'],
      allowedAttributes: {}
    });

    const result = db.prepare(`
      INSERT INTO comments (article_id, user_id, parent_id, content, status)
      VALUES (?, ?, ?, ?, 'approved')
    `).run(article_id, user.id, parent_id || null, cleanContent);

    const newComment = db.prepare(`
      SELECT 
        comments.id,
        comments.article_id,
        comments.parent_id,
        comments.content,
        comments.status,
        comments.created_at,
        users.id as user_id,
        users.name as user_name,
        users.avatar as user_avatar,
        users.role as user_role
      FROM comments
      JOIN users ON users.id = comments.user_id
      WHERE comments.id = ?
    `).get(result.lastInsertRowid);

    newComment.replies = [];

    return res.status(201).json({
      success: true,
      message: 'Komentar berhasil dikirim.',
      data: newComment,
    });
  } catch (error) {
    console.error('addComment error:', error);
    return res.status(500).json({ success: false, message: 'Gagal mengirim komentar.' });
  }
};

// GET /api/comments (Admin & Editor moderation)
exports.getAllComments = (req, res) => {
  try {
    const { status, search } = req.query;

    let whereClauses = [];
    let params = [];

    if (status) {
      whereClauses.push('comments.status = ?');
      params.push(status);
    }

    if (search) {
      whereClauses.push('(comments.content LIKE ? OR users.name LIKE ? OR articles.title LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const whereSql = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';

    const comments = db.prepare(`
      SELECT 
        comments.id,
        comments.content,
        comments.status,
        comments.created_at,
        users.name as user_name,
        users.email as user_email,
        users.avatar as user_avatar,
        articles.id as article_id,
        articles.title as article_title,
        articles.slug as article_slug
      FROM comments
      JOIN users ON users.id = comments.user_id
      JOIN articles ON articles.id = comments.article_id
      ${whereSql}
      ORDER BY comments.created_at DESC
      LIMIT 100
    `).all(...params);

    return res.json({ success: true, data: comments });
  } catch (error) {
    console.error('getAllComments error:', error);
    return res.status(500).json({ success: false, message: 'Gagal mengambil data komentar.' });
  }
};

// PUT /api/comments/:id/status (Admin & Editor)
exports.moderateComment = (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['approved', 'pending', 'spam'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Status moderasi tidak valid.' });
    }

    db.prepare('UPDATE comments SET status = ? WHERE id = ?').run(status, id);

    return res.json({ success: true, message: `Status komentar diubah menjadi ${status}.` });
  } catch (error) {
    console.error('moderateComment error:', error);
    return res.status(500).json({ success: false, message: 'Gagal memoderasi komentar.' });
  }
};

// DELETE /api/comments/:id
exports.deleteComment = (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    const comment = db.prepare('SELECT * FROM comments WHERE id = ?').get(id);
    if (!comment) {
      return res.status(404).json({ success: false, message: 'Komentar tidak ditemukan.' });
    }

    const isOwner = comment.user_id === user.id;
    const isPrivileged = user.role === 'admin' || user.role === 'editor';

    if (!isOwner && !isPrivileged) {
      return res.status(403).json({ success: false, message: 'Anda tidak berhak menghapus komentar ini.' });
    }

    db.prepare('DELETE FROM comments WHERE id = ?').run(id);

    return res.json({ success: true, message: 'Komentar berhasil dihapus.' });
  } catch (error) {
    console.error('deleteComment error:', error);
    return res.status(500).json({ success: false, message: 'Gagal menghapus komentar.' });
  }
};
