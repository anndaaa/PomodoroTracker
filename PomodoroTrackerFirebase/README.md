# Pomodoro Tracker — HTML/CSS/JavaScript + Cordova + Firebase

Aplikasi untuk menghitung sesi fokus dan istirahat, mengirim notifikasi ketika sesi berakhir, dan mencatat statistik harian.

## Fitur
- Timer fokus 25 menit, istirahat pendek 5 menit, istirahat panjang 15 menit.
- Mulai/jeda, atur ulang, lewati sesi, dan pengaturan durasi.
- Istirahat panjang otomatis setelah jumlah sesi fokus sesuai pengaturan.
- Statistik harian dan riwayat sesi tersimpan di `localStorage`.
- Integrasi Firebase Cloud Firestore opsional untuk sinkronisasi statistik.
- Notifikasi browser; notifikasi lokal Cordova jika berjalan di aplikasi Android dengan plugin terpasang.

## Struktur
```text
PomodoroTrackerFirebase/
├── index.html
├── config.xml
├── firestore.rules.example
├── README.md
├── css/
│   └── style.css
└── js/
    ├── app.js
    └── firebase.js
```

## A. Jalankan di VS Code (mode web)
1. Ekstrak folder project.
2. Buka folder `PomodoroTrackerFirebase` di VS Code.
3. Pasang ekstensi **Live Server**.
4. Klik kanan `index.html` > **Open with Live Server**.
5. Tanpa konfigurasi Firebase, timer dan statistik lokal tetap berjalan. Untuk module JavaScript, gunakan server lokal, jangan membuka file dengan `file://`.

## B. Hubungkan Firebase Console
1. Buka https://console.firebase.google.com/ lalu buat project, misalnya `pomodoro-tracker`.
2. Di halaman project, klik ikon Web `</>` untuk menambahkan aplikasi web. Beri nama `Pomodoro Tracker`.
3. Salin konfigurasi web yang diberikan Firebase.
4. Buka `js/firebase.js`, lalu ganti semua nilai `ISI_...` dengan nilai dari Firebase Console. Jangan menaruh private service-account key di frontend.
5. Di menu **Build > Firestore Database**, klik **Create database**. Pilih lokasi yang dekat dengan pengguna dan selesaikan wizard.
6. Untuk uji coba tugas, buka tab **Rules** dan sesuaikan aturan dengan `firestore.rules.example`. Aturan contoh itu hanya untuk demo, karena siapa pun dapat membaca/menulis data. Jangan gunakan di aplikasi publik.
7. Jalankan ulang Live Server dan tekan **Perbarui** di bagian Statistik harian. Jika berhasil, label akan menampilkan Firebase terhubung.
8. Sesi yang selesai akan ditambahkan ke koleksi `pomodoroSessions`. Di Firestore Data, koleksi tersebut muncul setelah sesi pertama selesai.

### Catatan Firebase
- Konfigurasi web Firebase bukan service-account key; tetap gunakan Firebase Security Rules.
- Untuk aplikasi yang dipakai banyak orang, tambahkan Firebase Authentication dan simpan `uid` di setiap dokumen, lalu batasi Rules agar pengguna hanya bisa mengakses datanya sendiri.
- Jika query menampilkan pesan tentang indeks, buka link indeks yang muncul di Console dan buat indeks yang diminta. Untuk penggunaan dasar, query menggunakan `day` dan `createdAt`.

## C. Notifikasi Cordova (opsional, aplikasi Android)
Notifikasi lokal membutuhkan Cordova dan plugin native; plugin tidak bekerja hanya dengan Live Server di browser.
1. Install Node.js LTS dan Java/JDK serta Android Studio bila ingin build Android.
2. Buka terminal di folder project atau salin file web ke folder Cordova baru.
3. Jalankan:
```bash
npm install -g cordova
cordova create PomodoroCordova id.ac.upitra.pomodoro "Pomodoro Tracker"
```
4. Salin `index.html`, folder `css`, dan folder `js` ke folder `PomodoroCordova/www/`. Salin `config.xml` bila diperlukan.
5. Di terminal masuk ke folder `PomodoroCordova`, lalu:
```bash
cordova platform add android
cordova plugin add cordova-plugin-local-notification
cordova build android
```
6. Jalankan di emulator/perangkat Android sesuai pengaturan Android Studio:
```bash
cordova run android
```

> Catatan kompatibilitas: plugin notifikasi bergantung pada versi Cordova, Android, dan versi plugin. Uji pada perangkat/emulator. Untuk Android modern, izin notifikasi mungkin perlu disetujui pengguna. Timer JavaScript tidak dijamin berjalan akurat saat OS menangguhkan aplikasi di latar belakang; notifikasi terjadwal native lebih andal untuk alarm jangka panjang.

## Cara kerja data
- `localStorage`: statistik harian pada perangkat/browser yang sama.
- Firestore: salinan sesi yang selesai disimpan ke cloud saat koneksi tersedia.
- Data Firestore belum dipakai untuk menggantikan statistik lokal; label status menampilkan ringkasan cloud setelah tombol Perbarui ditekan.

## Pengujian cepat
1. Jalankan Live Server.
2. Klik **Mulai**, tunggu atau ubah durasi fokus ke 1 menit untuk uji.
3. Setelah timer habis, statistik fokus dan riwayat bertambah.
4. Atur Firebase, selesaikan satu sesi, lalu lihat koleksi `pomodoroSessions` di Firestore.
