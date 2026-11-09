// 1. Impor module yang diperlukan dari firebase dan firestore
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

// 2. Konfigurasi Firebase
const firebaseConfig = {
    apiKey: "AIzaSyA6I1Tvw61wzc6-2MVmcWXfZ17IwDYj7u4",
    authDomain: "rpl25-b6db4.firebaseapp.com",
    projectId: "rpl25-b6db4",
    storageBucket: "rpl25-b6db4.firebasestorage.app",
    messagingSenderId: "643920833293",
    appId: "1:643920833293:web:f5ac7fdc746e4e410d5e44"
}

// 3. Inisialisasi Firebase dan Firestore
const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

// Data akun (siswa)
const userId = '3100108117' // isi dengan nisn masing-masing
let saldoSekarang = 0
let trxIdSekarang = ''
let trxTotalSekarang = 0
let htmlQRScanner = null

// Inisialisasi aplikasi pembaca QR saat halaman dimuat
window.addEventListener('DOMContentLoaded', () => {
    // panggil fungsi inisialisasi saldo
    inisialisasiSaldo()

    // panggil fungsi mulai scan kamera
    mulaiScannerKamera()
})

function inisialisasiSaldo() {
    const refUser = doc(db, 'users', userId)

    // mendengarkan saldo siswa
    onSnapshot(refUser, async (docSnapshot) => {
        // periksa apakah doc snapshot ada
        if (docSnapshot.exists()) {
            saldoSekarang = docSnapshot.data().saldo
        } else {
            // buat dokumen user baru karena belum ada
            saldoSekarang = 50000
            await setDoc(refUser, {
                saldo: saldoSekarang,
                nama: 'Nia Cahaya Ilahi'
            })
        }

        // menampilkan saldo
        document.getElementById('saldo-display').innerText = `Rp. ${saldoSekarang}`
    })
}

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

    htmlQRScanner.render(ketikaScanSukses, ketikaScanGagal)
}

async function ketikaScanSukses(decodedText) {
    trxIdSekarang = decodedText

    // Hentikan scanner kamera sementara
    htmlQRScanner.clear()

    tampilkanPesan("Memeriksa tagihan...", "#17a2b8")

    // Cari Dokumen Transaksi di Firestore
    const txRef = doc(db, 'transaksi', trxIdSekarang)
    try {
        const docSnapshot = await getDoc(txRef)

        if (docSnapshot.exists()) {
            const dataTx = docSnapshot.data()

            if (dataTx.status === 'terbayar') {
                tampilkanPesan("❌ Transaksi ini SUDAH DIBAYAR!", "#dc3545")
                setTimeout(() => location.reload(), 2500)
                return
            }

            trxTotalSekarang = dataTx.total
            document.getElementById('tx-id-found').innerText = trxIdSekarang
            document.getElementById('tx-total-found').innerText = `Rp ${trxTotalSekarang}`

            document.getElementById('scanner-section').classList.add('hidden')
            document.getElementById('konfirmasi-section').classList.remove('hidden')
            tampilkanPesan("", "")
        } else {
            tampilkanPesan("❌ ID Transaksi tidak ditemukan!", "#dc3545")
            setTimeout(() => location.reload(), 2500)
        }
    } catch (error) {
        tampilkanPesan("Error: " + error.message, "#dc3545")
    }
}

async function ketikaScanGagal() {
    // abaikan
}

window.batalScan = function () {
    location.reload()
}

window.prosesBayar = async function () {
    if (saldoSekarang < trxTotalSekarang) {
        tampilkanPesan("❌ Saldo Anda tidak cukup!", "#dc3545")
        return
    }

    const sisaSaldo = saldoSekarang - trxTotalSekarang

    const userRef = doc(db, 'users', userId)
    const txRef = doc(db, 'transaksi', trxIdSekarang)

    try {
        // Update Saldo Siswa
        await updateDoc(userRef, { saldo: sisaSaldo })

        // Update Status Transaksi
        await updateDoc(txRef, {
            status: 'terbayar',
            dibayar: userId
        })

        document.getElementById('konfirmasi-section').classList.add('hidden')
        tampilkanPesan("🎉 Pembayaran Berhasil!", "#28a745")

        // Reload otomatis setelah 2.5 detik untuk transaksi berikutnya
        setTimeout(() => {
            location.reload()
        }, 2500)
    } catch (error) {
        tampilkanPesan("Gagal memproses: " + error.message, "#dc3545")
    }
}

function tampilkanPesan(teks, warna) {
    const el = document.getElementById('pesan-box')
    el.innerText = teks
    el.style.color = warna
}