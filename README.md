# NusantaraPost - Portal Artikel Dinamis Multi-Level User

Website portal artikel dan publikasi digital **full dinamis** dengan sistem manajemen peran berbasis hak akses (**Role-Based Access Control / RBAC**) berjenjang: **Administrator, Editor, Penulis (Author), dan Pembaca (Reader)**.

---

## 🌟 Fitur Utama & Sistem Multi-Level User

### 1. 👑 Administrator (Superadmin)
- **Dashboard Eksekutif**: Pantau metrik agregat seluruh situs (total artikel terbit, draf, review pending, total view/pembaca, total komentar, pengguna).
- **Manajemen Pengguna (User RBAC)**:
  - Ubah peran pengguna secara instan (`admin`, `editor`, `author`, `reader`).
  - Aktifkan atau tangguhkan akun pengguna.
  - Hapus akun pengguna.
- **Kendali Artikel Penuh**: Setujui, sunting, tolak, hapus artikel mana pun, serta jadikan artikel sebagai **Headline / Pilihan Utama**.
- **Kelola Kategori & Tagar**: Buat, edit, dan hapus kategori beserta skema warna badge.
- **Pengaturan Situs Global**: Ubah nama web, tagline, dan teks banner pengumuman.

### 2. ✍️ Editor (Redaktur)
- **Editorial Review Workflow**: Meninjau artikel yang diajukan oleh Penulis (status: `pending`).
- **Persetujuan 1-Klik**: Menyetujui dan langsung menerbitkan artikel ke publik (`published`).
- **Moderasi Komentar**: Menyetujui komentar baru, menandai spam, atau menghapus komentar yang tidak pantas.
- **Kelola Taksonomi**: Menambah dan memperbarui kategori serta tagar artikel.

### 3. 📝 Penulis (Author)
- **Author Studio & WYSIWYG Editor**:
  - Tulis artikel dengan format kaya (Heading H2, H3, Bold, Italic, Blockquote, Bullet List, Code Block).
  - Unggah gambar sampul (cover image) via berkas lokal atau masukkan URL gambar (Unsplash).
  - Tentukan kategori dan tagar.
  - Simpan artikel sebagai **Draf** atau ajukan untuk **Review Redaksi (Pending)**.
- **Statistik Karya Pribadi**: Memantau jumlah total pembaca (views), apresiasi like, dan komentar pada artikel milik sendiri.
- **Manajemen Tulisan Pribadi**: Sunting dan kelola draf artikel karya sendiri.

### 4. 📖 Pembaca (Reader / Member)
- **Interaksi Penuh**:
  - **Suka (Like)**: Memberikan like pada artikel favorit dengan pembaruan interaktif realtime.
  - **Daftar Bacaan (Bookmarks)**: Menyimpan artikel ke halaman bacaan pribadi (`/tersimpan`).
  - **Diskusi & Komentar Bersarang**: Mengirim komentar dan membalas komentar pengguna lain (nested replies).
  - **Profil Pribadi**: Sunting foto profil (avatar), nama lengkap, bio, dan ubah kata sandi.

### 5. 🌐 Pengunjung Umum (Guest)
- Jelajahi artikel terpublikasi dengan live search, filter kategori instan, filter tagar, dan sorting (terbaru, paling populer).
- Membaca artikel lengkap dengan estimasi waktu baca (*reading time*) dan profil penulis.
- Masuk / Daftar akun baru secara mandiri.

---

## 🔐 Akun Demo Bawaan (Siap Uji Coba)

Sistem telah dilengkapi data awal (*seeder*) dengan 4 akun demo untuk menguji setiap level hak akses:

| Peran (Role) | Email / Username | Kata Sandi | Keterangan |
|---|---|---|---|
| 👑 **Administrator** | `admin@portal.com` *(atau `admin`)* | `admin123` | Akses penuh seluruh sistem |
| ✍️ **Editor** | `editor@portal.com` *(atau `editor`)* | `editor123` | Meninjau & menyetujui artikel |
| 📝 **Penulis** | `penulis@portal.com` *(atau `penulis`)* | `penulis123` | Menulis & mengajukan artikel |
| 📖 **Pembaca** | `pembaca@portal.com` *(atau `pembaca`)* | `pembaca123` | Membaca, like, bookmark & komen |

> **💡 Tip Cepat**: Pada tampilan website disediakan **Floating Bar Demo Switcher** di bagian bawah layar dan tombol **1-Klik Demo Login** di halaman masuk, sehingga Anda dapat berganti peran secara instan tanpa perlu repot mengetik ulang kata sandi!

---

## 🛠️ Arsitektur Teknologi

- **Backend**: Node.js & Express.js
- **Database**: SQLite terintegrasi (`node:sqlite DatabaseSync`) – Cepat, andal, tanpa perlu konfigurasi server database eksternal.
- **Autentikasi**: JSON Web Token (JWT) + HTTP-Only Secure Cookies + Bcrypt Password Hashing.
- **Keamanan**: Role-Based Authorization Middleware, Parameterized SQL Queries (Anti-SQLi), dan HTML Sanitization (Anti-XSS).
- **Frontend**: Responsive Tailwind CSS, Glassmorphism UI, Dark/Light Mode Switcher, Desain Mobile-Friendly.

---

## 🚀 Cara Menjalankan Proyek

1. **Buka Direktori Proyek**:
   ```bash
   cd "C:\Users\User\.gemini\antigravity\scratch\portal-artikel-multilevel"
   ```

2. **Jalankan Server**:
   ```bash
   npm start
   ```
   *Atau mode auto-reload saat pengembangan:*
   ```bash
   npm run dev
   ```

3. **Buka di Browser**:
   Kunjungi: **[http://localhost:3000](http://localhost:3000)**

---

## 📁 Struktur Direktori

```
portal-artikel-multilevel/
├── data/
│   └── database.sqlite             # Database SQLite lokal otomatis terbuat
├── public/
│   ├── css/
│   │   └── style.css               # Gaya kustom, tipografi artikel, animasi toast
│   ├── js/
│   │   ├── main.js                 # Logika auth, tema gelap/terang, demo switcher
│   │   └── dashboard.js            # Logika dashboard multi-role & editor artikel
│   ├── uploads/
│   │   ├── avatars/                # Berkas unggahan foto profil
│   │   └── covers/                 # Berkas unggahan gambar sampul artikel
│   ├── index.html                  # Beranda portal publik
│   ├── article.html                # Tampilan detail artikel & diskusi
│   ├── category.html               # Halaman arsip per kategori
│   ├── author.html                 # Profil publik penulis
│   ├── saved.html                  # Halaman artikel tersimpan (bookmark)
│   ├── login.html                  # Halaman masuk dengan tombol 1-klik demo
│   ├── register.html               # Halaman registrasi pembaca baru
│   └── dashboard.html              # Dashboard terpadu multi-peran
├── src/
│   ├── config/
│   │   └── database.js             # Skema tabel & inisialisasi SQLite
│   ├── controllers/                # Logika bisnis (Auth, Artikel, User, Kategori, Komentar, Stats)
│   ├── middleware/                 # JWT Auth, RBAC, dan Multer upload
│   ├── routes/                     # Rute API RESTful
│   └── utils/
│       └── seeder.js               # Pembuat data awal otomatis
├── server.js                       # Entry point aplikasi Express
└── package.json
```
