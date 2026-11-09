// ==========================================
// 1. IMPORT FIREBASE DAN FIRESTORE
// ==========================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js"

import {
  getFirestore,
  onSnapshot,
  doc,
  setDoc,
  getDoc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js"

import { Html5QrcodeScanner } from "https://esm.sh/html5-qrcode@2.3.8"


// ==========================================
// 2. KONFIGURASI FIREBASE
// ==========================================

const firebaseConfig = {
  apiKey: "AIzaSyA6I1Tvw61wzc6-2MVmcWXfZ17IwDYj7u4",
  authDomain: "rpl25-b6db4.firebaseapp.com",
  projectId: "rpl25-b6db4",
  storageBucket: "rpl25-b6db4.firebasestorage.app",
  messagingSenderId: "643920833293",
  appId: "1:643920833293:web:f5ac7fdc746e4e410d5e44"
}


// ==========================================
// 3. INISIALISASI FIREBASE DAN FIRESTORE
// ==========================================

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)


// ==========================================
// 4. DATA AKUN SISWA
// ==========================================

const userId = '3100108117'

let saldoSekarang = 0
let trxIdSekarang = ''
let trxTotalSekarang = 0
let htmlQRScanner = null


// ==========================================
// 5. SPEECH SYNTHESIS
// ==========================================

function aktifkanSuara() {

  if ("speechSynthesis" in window) {
    window.speechSynthesis.resume()
  }

}


function suaraKasir(teks) {

  if (!("speechSynthesis" in window)) {
    console.log("Browser tidak mendukung suara")
    return
  }

  window.speechSynthesis.cancel()

  const ucapan = new SpeechSynthesisUtterance(teks)

  const daftarSuara = window.speechSynthesis.getVoices()

  // Cari suara bahasa Indonesia
  const suaraIndonesia = daftarSuara.find(voice =>
    voice.lang.toLowerCase().startsWith("id")
  )

  if (suaraIndonesia) {
    ucapan.voice = suaraIndonesia
  }

  ucapan.lang = "id-ID"
  ucapan.rate = 0.9
  ucapan.pitch = 1.1
  ucapan.volume = 1

  window.speechSynthesis.speak(ucapan)

}


// ==========================================
// 6. INISIALISASI APLIKASI
// ==========================================

window.addEventListener('DOMContentLoaded', () => {

  inisialisasiSaldo()

  mulaiScannerKamera()

})


// ==========================================
// 7. FUNGSI INISIALISASI SALDO
// ==========================================

function inisialisasiSaldo() {

  const refUser = doc(db, 'users', userId)

  onSnapshot(refUser, async (docSnapshot) => {

    if (docSnapshot.exists()) {

      saldoSekarang = docSnapshot.data().saldo

    } else {

      saldoSekarang = 300000

      await setDoc(refUser, {
        saldo: saldoSekarang,
        nama: 'jahira'
      })

    }

    document.getElementById('saldo-display').innerText =
      `Rp. ${saldoSekarang.toLocaleString("id-ID")}`

  })

}


// ==========================================
// 8. FUNGSI MULAI SCANNER KAMERA
// ==========================================

function mulaiScannerKamera() {

  htmlQRScanner = new Html5QrcodeScanner(
    'reader',
    {
      fps: 10,
      qrbox: {
        width: 160,
        height: 160
      }
    },
    false
  )

  htmlQRScanner.render(
    ketikaScanSukses,
    ketikaScanGagal
  )

}


// ==========================================
// 9. KETIKA QR BERHASIL DI SCAN
// ==========================================

async function ketikaScanSukses(decodedText) {

  trxIdSekarang = decodedText

  // Hentikan scanner sementara
  htmlQRScanner.clear()

  tampilkanPesan("Memeriksa tagihan...", "#17a2b8")

  const txRef = doc(db, 'transaksi', trxIdSekarang)

  try {

    const docSnapshot = await getDoc(txRef)

    if (docSnapshot.exists()) {

      const dataTx = docSnapshot.data()

      if (dataTx.status === 'terbayar') {

        tampilkanPesan(
          "❌ Transaksi ini SUDAH DIBAYAR!",
          "#dc3545"
        )

        setTimeout(() => location.reload(), 2500)

        return
      }

      trxTotalSekarang = dataTx.total

      document.getElementById('tx-id-found').innerText =
        trxIdSekarang

      document.getElementById('tx-total-found').innerText =
        `Rp ${trxTotalSekarang.toLocaleString("id-ID")}`

      document.getElementById('scanner-section').classList.add('hidden')

      document.getElementById('konfirmasi-section').classList.remove('hidden')

      tampilkanPesan("", "")

    } else {

      tampilkanPesan(
        "❌ ID Transaksi tidak ditemukan!",
        "#dc3545"
      )

      setTimeout(() => location.reload(), 2500)

    }

  } catch (error) {

    tampilkanPesan(
      "Error: " + error.message,
      "#dc3545"
    )

  }

}


// ==========================================
// 10. KETIKA SCAN GAGAL
// ==========================================

async function ketikaScanGagal(error) {
  // Abaikan kesalahan pembacaan QR sementara
}


// ==========================================
// 11. FUNGSI BATAL SCAN
// ==========================================

window.batalScan = function() {

  location.reload()

}


// ==========================================
// 12. FUNGSI PROSES PEMBAYARAN
// ==========================================

window.prosesBayar = async function() {

  // Aktifkan audio melalui interaksi tombol pengguna
  aktifkanSuara()

  if (saldoSekarang < trxTotalSekarang) {

    tampilkanPesan(
      "❌ Saldo Anda tidak cukup!",
      "#dc3545"
    )

    return
  }

  const sisaSaldo = saldoSekarang - trxTotalSekarang

  const userRef = doc(db, 'users', userId)

  const txRef = doc(db, 'transaksi', trxIdSekarang)

  try {

    // Update saldo siswa
    await updateDoc(userRef, {
      saldo: sisaSaldo
    })

    // Update status transaksi
    await updateDoc(txRef, {
      status: 'terbayar',
      dibayar: userId
    })

    // Sembunyikan konfirmasi pembayaran
    document.getElementById('konfirmasi-section').classList.add('hidden')

    // Tampilkan pesan berhasil
    tampilkanPesan(
      "🎉 Pembayaran Berhasil!",
      "#28a745"
    )

    // SPEECH SYNTHESIS HANYA SAAT BERHASIL
    suaraKasir(
      "Pembayaran berhasil. Terima kasih sudah berbelanja. Sisa saldo Anda adalah " +
      sisaSaldo.toLocaleString("id-ID") +
      " rupiah."
    )

    // Reload untuk transaksi berikutnya
    setTimeout(() => {
      location.reload()
    }, 6000)

  } catch (error) {

    tampilkanPesan(
      "Gagal memproses: " + error.message,
      "#dc3545"
    )

  }

}


// ==========================================
// 13. FUNGSI MENAMPILKAN PESAN
// ==========================================

function tampilkanPesan(teks, warna) {

  const el = document.getElementById('pesan-box')

  el.innerText = teks

  el.style.color = warna

}