const bcrypt = require('bcryptjs');
const { db, initDatabase } = require('../config/database');

function seed() {
  initDatabase();

  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  if (userCount > 0) {
    console.log('Database already seeded. Skipping initial seeding.');
    return;
  }

  console.log('Seeding initial data...');

  const passwordHash = bcrypt.hashSync('admin123', 10);
  const editorHash = bcrypt.hashSync('editor123', 10);
  const authorHash = bcrypt.hashSync('penulis123', 10);
  const readerHash = bcrypt.hashSync('pembaca123', 10);

  // 1. Seed Users
  const insertUser = db.prepare(`
    INSERT INTO users (name, username, email, password_hash, role, bio, avatar, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const adminId = insertUser.run(
    'Budi Santoso',
    'admin',
    'admin@portal.com',
    passwordHash,
    'admin',
    'Kepala Administrator sistem Portal Artikel Nusantara. Bertanggung jawab atas integritas dan pengelolaan platform.',
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    'active'
  ).lastInsertRowid;

  const editorId = insertUser.run(
    'Dewi Lestari',
    'editor',
    'editor@portal.com',
    editorHash,
    'editor',
    'Chief Editor & Kurator Konten. Menjaga kualitas redaksi dan standarisasi tulisan artikel sebelum terbit.',
    'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    'active'
  ).lastInsertRowid;

  const authorId = insertUser.run(
    'Rian Pratama',
    'penulis',
    'penulis@portal.com',
    authorHash,
    'author',
    'Penulis teknologi dan pemerhati transformasi digital di Asia Tenggara. Senang mengulas AI dan ekosistem startup.',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    'active'
  ).lastInsertRowid;

  const readerId = insertUser.run(
    'Siti Rahma',
    'pembaca',
    'pembaca@portal.com',
    readerHash,
    'reader',
    'Penggiat literasi digital dan pembaca setia artikel teknologi serta gaya hidup seimbang.',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    'active'
  ).lastInsertRowid;

  // 2. Seed Categories
  const insertCategory = db.prepare(`
    INSERT INTO categories (name, slug, description, icon, color)
    VALUES (?, ?, ?, ?, ?)
  `);

  const catTekno = insertCategory.run('Teknologi', 'teknologi', 'Perkembangan AI, Software, Gadget, dan Transformasi Digital.', 'cpu', 'blue').lastInsertRowid;
  const catBisnis = insertCategory.run('Bisnis & Finansial', 'bisnis-finansial', 'Investasi, Finansial Pribadi, Startup, dan Ekonomi Kreatif.', 'trending-up', 'emerald').lastInsertRowid;
  const catGayaHidup = insertCategory.run('Gaya Hidup', 'gaya-hidup', 'Kesehatan mental, Produktivitas, Work-Life Balance, dan Hobi.', 'heart', 'rose').lastInsertRowid;
  const catEdukasi = insertCategory.run('Edukasi & Karir', 'edukasi-karir', 'Pengembangan diri, Tips interview, dan Karir di era global.', 'book-open', 'amber').lastInsertRowid;
  const catSains = insertCategory.run('Sains & Inovasi', 'sains-inovasi', 'Riset terkini, Energi terbarukan, dan Masa depan planet bumi.', 'sparkles', 'purple').lastInsertRowid;

  // 3. Seed Tags
  const insertTag = db.prepare(`INSERT INTO tags (name, slug) VALUES (?, ?)`);
  const tagIds = {
    ai: insertTag.run('AI', 'ai').lastInsertRowid,
    startup: insertTag.run('Startup', 'startup').lastInsertRowid,
    produktivitas: insertTag.run('Produktivitas', 'produktivitas').lastInsertRowid,
    investasi: insertTag.run('Investasi', 'investasi').lastInsertRowid,
    karir: insertTag.run('Karir', 'karir').lastInsertRowid,
    kesehatan: insertTag.run('Kesehatan', 'kesehatan').lastInsertRowid,
    coding: insertTag.run('Coding', 'coding').lastInsertRowid,
    sains: insertTag.run('Energi Terbarukan', 'energi-terbarukan').lastInsertRowid,
  };

  // 4. Seed Articles
  const insertArticle = db.prepare(`
    INSERT INTO articles (
      author_id, category_id, title, slug, excerpt, content, cover_image, status, is_featured, view_count, reading_time, published_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', ?))
  `);

  const insertArticleTag = db.prepare(`INSERT INTO article_tags (article_id, tag_id) VALUES (?, ?)`);

  // Article 1 (Featured)
  const art1 = insertArticle.run(
    authorId,
    catTekno,
    'Revolusi Kecerdasan Buatan (AI) di Dunia Pendidikan dan Industri 2026',
    'revolusi-kecerdasan-buatan-ai-pendidikan-industri-2026',
    'Bagaimana implementasi AI agentic dan asisten koding mentransformasi produktivitas profesional dan kurikulum pendidikan modern.',
    `<h2>Era Baru Transformasi Digital Berbasis Kecerdasan Buatan</h2>
    <p>Dalam kurun waktu beberapa tahun terakhir, lanskap kecerdasan buatan telah bergeser dari sekadar model bahasa statis menuju sistem <strong>agentic workflows</strong> yang mampu berpikir, merencanakan, dan mengeksekusi tugas-tugas kompleks secara mandiri.</p>
    <p>Di sektor pendidikan, AI telah membuka pintu bagi pembelajaran hiper-personalisasi di mana setiap murid memiliki tutor pribadi yang memahami kecepatan belajarnya masing-masing.</p>
    <h3>Dampak Langsung pada Industri Software</h3>
    <p>Bagi para perekayasa perangkat lunak, kehadiran AI asisten bukan lagi sekadar pelengkap, melainkan mitra sejati (pair programmer) yang menangani tugas rutin seperti refactoring, pembuatan unit test, hingga deployment otomatis.</p>
    <blockquote>"Kecerdasan Buatan tidak menggantikan profesional, namun profesional yang memanfaatkan kecerdasan buatan akan memimpin industri."</blockquote>
    <h3>Tantangan Etika dan Keamanan Data</h3>
    <p>Meskipun efisiensi melonjak, organisasi harus tetap waspada terhadap privasi data pengguna, kepatuhan lisensi sumber terbuka, dan potensi bias dalam algoritma evaluasi.</p>`,
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80',
    'published',
    1,
    1420,
    5,
    '-3 days'
  ).lastInsertRowid;

  insertArticleTag.run(art1, tagIds.ai);
  insertArticleTag.run(art1, tagIds.coding);

  // Article 2
  const art2 = insertArticle.run(
    adminId,
    catBisnis,
    'Panduan Memulai Investasi Saham dan Reksadana untuk Pemula di Era Digital',
    'panduan-memulai-investasi-saham-dan-reksadana-pemula',
    'Kunci membangun portofolio investasi yang aman, terdiversifikasi, dan tahan terhadap fluktuasi pasar global.',
    `<h2>Langkah Fundamental Menuju Kebebasan Finansial</h2>
    <p>Investasi sering kali dianggap rumit dan penuh risiko oleh mereka yang baru memulai. Padahal, dengan pemahaman dasar yang kokoh mengenai alokasi aset dan profil risiko, siapa pun bisa berinvestasi dengan percaya diri.</p>
    <h3>1. Menyiapkan Dana Darurat</h3>
    <p>Sebelum mengalokasikan modal ke instrumen berisiko seperti saham, pastikan Anda telah memiliki dana darurat setara 3 hingga 6 bulan pengeluaran rutin.</p>
    <h3>2. Diversifikasi Menggunakan Reksadana Indeks</h3>
    <p>Bagi pemula, menyebar modal ke reksadana indeks atau obligasi negara adalah strategi bijak untuk meminimalisir volatilitas jangka pendek.</p>
    <h3>3. Konsistensi Dollar-Cost Averaging (DCA)</h3>
    <p>Membeli aset secara berkala tanpa terpengaruh emosi naik-turunnya pasar terbukti menghasilkan return yang lebih stabil dalam horizon jangka panjang.</p>`,
    'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=1200&auto=format&fit=crop&q=80',
    'published',
    0,
    980,
    4,
    '-2 days'
  ).lastInsertRowid;

  insertArticleTag.run(art2, tagIds.investasi);
  insertArticleTag.run(art2, tagIds.startup);

  // Article 3
  const art3 = insertArticle.run(
    editorId,
    catGayaHidup,
    '5 Kebiasaan Pagi Hari yang Terbukti Meningkatkan Fokus dan Kesehatan Mental',
    '5-kebiasaan-pagi-hari-tingkatkan-fokus-kesehatan-mental',
    'Rutinitas sederhana namun berdampak besar yang dilakukan para profesional sukses sebelum memulai jam kerja mereka.',
    `<h2>Membangun Ritme Hari Sejak Menit Pertama</h2>
    <p>Bagaimana Anda menghabiskan 60 menit pertama setelah bangun tidur sangat menentukan tingkat konsentrasi dan stabilitas emosi sepanjang hari.</p>
    <ul>
      <li><strong>Hindari Membuka Notifikasi Ponsel Seketika:</strong> Berikan otak Anda waktu untuk beradaptasi dengan realitas fisik sebelum dibanjiri informasi eksternal.</li>
      <li><strong>Hidrasi Optimal:</strong> Minumlah setidaknya 500ml air putih sesaat setelah bangun untuk mengaktifkan metabolisme tubuh.</li>
      <li><strong>Sinar Matahari Pagi (Morning Sunlight):</strong> Paparan cahaya alami selama 10-15 menit membantu menyetel ulang ritme sirkadian.</li>
      <li><strong>Gerakan Fisik Ringan:</strong> Peregangan atau jalan santai memperlancar sirkulasi darah ke otak.</li>
      <li><strong>Identifikasi Satu Tugas Utama (The One Thing):</strong> Tentukan satu prioritas terpenting yang harus Anda selesaikan hari ini.</li>
    </ul>`,
    'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=1200&auto=format&fit=crop&q=80',
    'published',
    0,
    750,
    3,
    '-1 days'
  ).lastInsertRowid;

  insertArticleTag.run(art3, tagIds.kesehatan);
  insertArticleTag.run(art3, tagIds.produktivitas);

  // Article 4
  const art4 = insertArticle.run(
    authorId,
    catEdukasi,
    'Strategi Membangun Portofolio Karir yang Menarik Perhatian Rekruter Global',
    'strategi-membangun-portofolio-karir-rekruter-global',
    'Tips nyata menyusun studi kasus, portofolio digital, dan personal branding agar dilirik perusahaan multinasional.',
    `<h2>Dari CV Tradisional ke Portofolio Berbasis Nilai Nyata</h2>
    <p>Di era kerja jarak jauh (remote work), pencari kerja tidak lagi hanya dinilai dari daftar riwayat pendidikan formal, melainkan dari bukti nyata pemecahan masalah yang telah mereka hasilkan.</p>
    <h3>Tunjukkan Proses, Bukan Hanya Hasil Akhir</h3>
    <p>Rekruter ingin melihat bagaimana cara Anda berpikir: apa kendala yang dihadapi, hipotesis awal apa yang diambil, dan apa dampak terukur (ROI, efisiensi waktu, kepuasan pengguna) dari solusi Anda.</p>`,
    'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1200&auto=format&fit=crop&q=80',
    'published',
    0,
    620,
    4,
    '-5 hours'
  ).lastInsertRowid;

  insertArticleTag.run(art4, tagIds.karir);
  insertArticleTag.run(art4, tagIds.produktivitas);

  // Article 5 (Pending review - for testing Editor/Admin approval)
  const art5 = insertArticle.run(
    authorId,
    catSains,
    'Menjelajahi Potensi Energi Surya Terintegrasi di Rumah Tangga Modern',
    'menjelajahi-potensi-energi-surya-terintegrasi-rumah-tangga',
    'Analisis efisiensi panel surya generasi terbaru dan dampaknya terhadap pengurangan emisi karbon perumahan.',
    `<h2>Transisi Energi Bersih dari Lingkungan Terkecil</h2>
    <p>Teknologi photovoltaic terus mengalami penurunan biaya produksi sekaligus peningkatan efisiensi konversi daya. Artikel ini membahas studi kelayakan pemasangan panel surya atap (rooftop solar) untuk hunian urban.</p>`,
    'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=1200&auto=format&fit=crop&q=80',
    'pending',
    0,
    0,
    3,
    '0 days'
  ).lastInsertRowid;

  insertArticleTag.run(art5, tagIds.sains);

  // Article 6 (Draft by Author)
  insertArticle.run(
    authorId,
    catTekno,
    'Catatan Eksperimen: Membangun Aplikasi Realtime dengan WebSockets',
    'catatan-eksperimen-membangun-aplikasi-realtime-websockets',
    'Draf catatan pribadi menguji latency dan scaling koneksi persisten.',
    `<p>Ini adalah draf yang masih dalam proses penulisan oleh Penulis.</p>`,
    'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=1200&auto=format&fit=crop&q=80',
    'draft',
    0,
    0,
    2,
    '0 days'
  );

  // 5. Seed Comments
  const insertComment = db.prepare(`
    INSERT INTO comments (article_id, user_id, parent_id, content, status)
    VALUES (?, ?, ?, ?, ?)
  `);

  const c1 = insertComment.run(art1, readerId, null, 'Ulasan yang sangat mencerahkan! Agentic AI memang mengubah cara kita memandang otomatisasi tugas.', 'approved').lastInsertRowid;
  insertComment.run(art1, authorId, c1, 'Terima kasih Siti! Betul sekali, kolaborasi manusia dan AI adalah kunci utamanya.', 'approved');
  insertComment.run(art1, editorId, null, 'Artikel ini sangat relevan dengan kebutuhan praktisi saat ini. Good job!', 'approved');
  insertComment.run(art2, readerId, null, 'Tips diversifikasi reksadananya sangat mudah dipahami pemula seperti saya.', 'approved');

  // 6. Seed Likes & Bookmarks
  const insertLike = db.prepare(`INSERT INTO likes (article_id, user_id) VALUES (?, ?)`);
  insertLike.run(art1, readerId);
  insertLike.run(art1, editorId);
  insertLike.run(art2, readerId);
  insertLike.run(art3, readerId);
  insertLike.run(art4, readerId);

  const insertBookmark = db.prepare(`INSERT INTO bookmarks (article_id, user_id) VALUES (?, ?)`);
  insertBookmark.run(art1, readerId);
  insertBookmark.run(art2, readerId);

  // 7. Seed Settings
  const insertSetting = db.prepare(`INSERT OR REPLACE INTO settings (key, value, description) VALUES (?, ?, ?)`);
  insertSetting.run('site_name', 'NusantaraPost', 'Nama portal artikel');
  insertSetting.run('site_tagline', 'Inspirasi & Wawasan Berkelas Tanpa Batas', 'Slogan website');
  insertSetting.run('allow_registration', 'true', 'Izinkan pendaftaran akun baru oleh publik');
  insertSetting.run('require_article_approval', 'true', 'Artikel penulis harus disetujui editor/admin sebelum terbit');
  insertSetting.run('announcement', 'Selamat datang di Portal Artikel Nusantara! Platform multi-level terpercaya.', 'Pengumuman banner');

  console.log('Seeding completed successfully!');
}

module.exports = { seed };
