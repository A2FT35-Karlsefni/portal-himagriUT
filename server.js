const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const { initDatabase } = require('./src/config/database');
const { seed } = require('./src/utils/seeder');

// Routes
const authRoutes = require('./src/routes/authRoutes');
const articleRoutes = require('./src/routes/articleRoutes');
const categoryRoutes = require('./src/routes/categoryRoutes');
const userRoutes = require('./src/routes/userRoutes');
const commentRoutes = require('./src/routes/commentRoutes');
const statsRoutes = require('./src/routes/statsRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Database & Seeder
initDatabase();
seed();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/articles', articleRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/users', userRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/stats', statsRoutes);

// Page Routing (Friendly URLs for HTML views)
app.get('/artikel/:slug', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/article.html'));
});

app.get('/kategori/:slug', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/category.html'));
});

app.get('/penulis/:id', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/author.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/dashboard.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/login.html'));
});

app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/register.html'));
});

app.get('/tersimpan', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/saved.html'));
});

// Fallback to home for SPA/other routes
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    message: err.message || 'Terjadi kesalahan pada internal server.',
  });
});

app.listen(PORT, () => {
  console.log(`=================================================`);
  console.log(`🚀 Portal Artikel Nusantara Berjalan Sukses!`);
  console.log(`📡 URL: http://localhost:${PORT}`);
  console.log(`🔐 Akun Demo Siap Digunakan:`);
  console.log(`   - Admin:   admin@portal.com   / admin123`);
  console.log(`   - Editor:  editor@portal.com  / editor123`);
  console.log(`   - Penulis: penulis@portal.com / penulis123`);
  console.log(`   - Pembaca: pembaca@portal.com / pembaca123`);
  console.log(`=================================================`);
});
