document.addEventListener('DOMContentLoaded', function () {
    const detailModal = new bootstrap.Modal(document.getElementById('detailModal'));
    const ticketModal = new bootstrap.Modal(document.getElementById('ticketModal'));

    const btnDetailList = document.querySelectorAll('.btnDetail');
    const modalJudul = document.getElementById('modal-judul-produk');
    const modalDeskripsi = document.getElementById('modal-deskripsi-produk');
    const modalGambar = document.getElementById('modal-gambar-produk');
    const modalBiayaPerjalanan = document.getElementById('modal-biaya-perjalanan');
    const modalTotalPembayaran = document.getElementById('modal-total-pembayaran');
    const modalJarakTempuh = document.getElementById('modal-jarak-tempuh');
    const bookingForm = document.getElementById('bookingForm');
    const lokasiGoogleMapsInput = document.getElementById('lokasiGoogleMaps');
    const shareLocBtn = document.getElementById('shareLocBtn');
    const geolocationError = document.getElementById('geolocationError');
    const tanggalBookingInput = document.getElementById('tanggalBooking');
    const pilihanJamBerangkatContainer = document.getElementById('pilihanJamBerangkatContainer');
    const pilihanJamPulangContainer = document.getElementById('pilihanJamPulangContainer');
    const stokStatusSpan = document.getElementById('stokStatus');
    const pesanSekarangBtn = document.getElementById('pesanSekarangBtn');
    const ticketDetails = document.getElementById('ticketDetails');
    const cetakTiketBtn = document.getElementById('cetakTiketBtn');

    // Variabel untuk menyimpan data simulasi stok
    const stockData = {
        "Rute Merjosari": { "05:00": 15, "05:15": 15, "05:30": 15 },
        "Rute Suhat": { "05:00": 15, "05:15": 15, "05:30": 15 },
        "Rute Dinoyo": { "05:00": 15, "05:15": 15, "05:30": 15 },
        "Rute Siguragura": { "05:00": 15, "05:15": 15, "05:30": 15 },
        "Rute Ijen": { "05:00": 15, "05:15": 15, "05:30": 15 },
        "Rute Galunggung": { "05:00": 15, "05:15": 15, "05:30": 15 }
    };

    // --- Efek Baru untuk Menu Navigasi ---
    const navLinks = document.querySelectorAll('nav a');
    const sections = document.querySelectorAll('.elegant-dark-section, .elegant-light-section');

    function setActiveNavLink(id) {
        navLinks.forEach(link => {
            if (link.getAttribute('href') === `#${id}`) {
                link.classList.add('nav-link-active');
            } else {
                link.classList.remove('nav-link-active');
            }
        });
    }

    window.addEventListener('scroll', function() {
        let currentSection = '';
        sections.forEach(section => {
            const sectionTop = section.offsetTop - 150;
            if (window.scrollY >= sectionTop) {
                currentSection = section.getAttribute('id');
            }
        });
        if (currentSection) {
            setActiveNavLink(currentSection);
        } else {
            navLinks.forEach(link => link.classList.remove('nav-link-active'));
        }
    });

    navLinks.forEach(link => {
        link.addEventListener('click', function (event) {
            const targetId = this.getAttribute('href').substring(1);
            if (targetId) {
                navLinks.forEach(item => item.classList.remove('nav-link-active'));
                this.classList.add('nav-link-active');
            }
        });
    });
    // --- Akhir dari Efek Baru ---

    let currentCardData = {};
    let userLocation = null;
    let activeCard = null;

    flatpickr(tanggalBookingInput, {
        dateFormat: "d-m-Y",
        minDate: "today",
        allowInput: true
    });

    btnDetailList.forEach(btn => {
        btn.addEventListener('click', function () {
            if (activeCard) {
                activeCard.classList.remove('card-active');
            }

            const card = this.closest('.card');
            activeCard = card;
            activeCard.classList.add('card-active');

            currentCardData = {
                title: card.querySelector('.card-title').innerText,
                description: card.querySelector('.deskripsi-tersembunyi').innerText,
                image: card.getAttribute('data-gambar'),
                destinationLat: parseFloat(card.getAttribute('data-destination-lat')),
                destinationLon: parseFloat(card.getAttribute('data-destination-lon'))
            };

            modalJudul.innerText = currentCardData.title;
            modalDeskripsi.innerText = currentCardData.description;
            modalGambar.src = currentCardData.image;

            bookingForm.reset();
            modalBiayaPerjalanan.innerText = 'Menunggu lokasi...';
            modalTotalPembayaran.innerText = 'Menunggu lokasi...';
            // Sembunyikan elemen jarak tempuh saat modal dibuka
            modalJarakTempuh.parentElement.classList.add('d-none');
            stokStatusSpan.innerText = 'Pilih tanggal dan jam';
            stokStatusSpan.classList.remove('text-success', 'text-danger');
            stokStatusSpan.classList.add('text-warning');
            pesanSekarangBtn.disabled = true;
            userLocation = null;
        });
    });

    document.getElementById('detailModal').addEventListener('hidden.bs.modal', function () {
        if (activeCard) {
            activeCard.classList.remove('card-active');
            activeCard = null;
        }
    });

    shareLocBtn.addEventListener('click', function () {
        if (navigator.geolocation) {
            geolocationError.classList.add('d-none');
            this.innerText = 'Mengambil lokasi...';
            this.disabled = true;

            navigator.geolocation.getCurrentPosition(
                position => {
                    const lat = position.coords.latitude;
                    const lon = position.coords.longitude;
                    userLocation = { lat, lon };
                    lokasiGoogleMapsInput.value = `https://www.google.com/maps?q=$${lat},${lon}`;
                    calculateDistanceAndPrice();
                    this.innerText = 'Gunakan Lokasi Saat Ini';
                    this.disabled = false;
                },
                error => {
                    geolocationError.classList.remove('d-none');
                    geolocationError.innerText = 'Gagal mendapatkan lokasi. Mohon izinkan akses atau masukkan tautan manual.';
                    this.innerText = 'Gunakan Lokasi Saat Ini';
                    this.disabled = false;
                }
            );
        } else {
            geolocationError.classList.remove('d-none');
            geolocationError.innerText = 'Geolocation tidak didukung oleh browser ini.';
        }
    });

    lokasiGoogleMapsInput.addEventListener('input', () => {
        const url = lokasiGoogleMapsInput.value;
        const match = url.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
        if (match) {
            userLocation = { lat: parseFloat(match[1]), lon: parseFloat(match[2]) };
            calculateDistanceAndPrice();
        } else {
            modalBiayaPerjalanan.innerText = 'Tautan tidak valid';
            modalTotalPembayaran.innerText = 'Tautan tidak valid';
            // Sembunyikan kembali elemen jarak tempuh jika tautan tidak valid
            modalJarakTempuh.parentElement.classList.add('d-none');
            userLocation = null;
        }
    });

    function calculateDistanceAndPrice() {
        if (!userLocation || !currentCardData.destinationLat) return;

        const R = 6371;
        const dLat = deg2rad(currentCardData.destinationLat - userLocation.lat);
        const dLon = deg2rad(currentCardData.destinationLon - userLocation.lon);

        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(deg2rad(userLocation.lat)) * Math.cos(deg2rad(currentCardData.destinationLat)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);

        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c;
        const roundedDistance = distance.toFixed(2);
        
        const basePricePerKm = 3000;
        const basePrice = 10000;
        const oneWayPrice = Math.round(basePrice + (distance * basePricePerKm));
        const totalPrice = oneWayPrice * 2;

        modalBiayaPerjalanan.innerText = `Rp. ${oneWayPrice.toLocaleString('id-ID')}`;
        modalTotalPembayaran.innerText = `Rp. ${totalPrice.toLocaleString('id-ID')}`;
        modalJarakTempuh.innerText = `Jarak: ${roundedDistance} km`;
        // Tampilkan elemen jarak tempuh setelah berhasil dihitung
        modalJarakTempuh.parentElement.classList.remove('d-none');
    }

    function deg2rad(deg) {
        return deg * (Math.PI / 180);
    }

    tanggalBookingInput.addEventListener('change', checkStok);
    pilihanJamBerangkatContainer.addEventListener('change', checkStok);
    pilihanJamPulangContainer.addEventListener('change', checkStok);

    function checkStok() {
        const selectedDate = tanggalBookingInput.value;
        const selectedTimeBerangkat = bookingForm.querySelector('input[name="waktuBerangkat"]:checked')?.value;
        const selectedTimePulang = bookingForm.querySelector('input[name="waktuPulang"]:checked')?.value;
        const selectedRute = currentCardData.title;

        if (selectedDate && selectedTimeBerangkat && selectedTimePulang && selectedRute) {
            if (stockData[selectedRute] && stockData[selectedRute][selectedTimeBerangkat]) {
                const remainingStock = stockData[selectedRute][selectedTimeBerangkat];

                stokStatusSpan.classList.remove('text-warning', 'text-danger', 'text-success');

                if (remainingStock > 0) {
                    stokStatusSpan.innerText = `Tersedia (${remainingStock} kursi)`;
                    stokStatusSpan.classList.add('text-success');
                    pesanSekarangBtn.disabled = false;
                } else {
                    stokStatusSpan.innerText = 'Tidak Tersedia';
                    stokStatusSpan.classList.add('text-danger');
                    pesanSekarangBtn.disabled = true;
                }
            } else {
                stokStatusSpan.innerText = 'Tidak Tersedia';
                stokStatusSpan.classList.remove('text-warning', 'text-success');
                stokStatusSpan.classList.add('text-danger');
                pesanSekarangBtn.disabled = true;
            }
        } else {
            stokStatusSpan.innerText = 'Pilih tanggal dan jam';
            stokStatusSpan.classList.remove('text-success', 'text-danger');
            stokStatusSpan.classList.add('text-warning');
            pesanSekarangBtn.disabled = true;
        }
    }

    pesanSekarangBtn.addEventListener('click', function (e) {
        e.preventDefault();

        const namaPembeli = document.getElementById('namaPembeli').value;
        const alamatLengkap = document.getElementById('alamatLengkap').value;
        const lokasiGoogleMaps = document.getElementById('lokasiGoogleMaps').value;
        const tanggalBooking = document.getElementById('tanggalBooking').value;
        const waktuBerangkat = bookingForm.querySelector('input[name="waktuBerangkat"]:checked')?.value;
        const waktuPulang = bookingForm.querySelector('input[name="waktuPulang"]:checked')?.value;

        let isValid = true;
        
        document.querySelectorAll('.required-warning').forEach(el => el.parentElement.classList.remove('is-invalid-label'));

        if (!namaPembeli) {
            document.getElementById('namaPembeli').previousElementSibling.classList.add('is-invalid-label');
            isValid = false;
        }
        if (!alamatLengkap) {
            document.getElementById('alamatLengkap').previousElementSibling.classList.add('is-invalid-label');
            isValid = false;
        }
        if (!lokasiGoogleMaps) {
            document.getElementById('lokasiGoogleMaps').previousElementSibling.classList.add('is-invalid-label');
            isValid = false;
        }
        if (!tanggalBooking) {
            document.getElementById('tanggalBooking').previousElementSibling.classList.add('is-invalid-label');
            isValid = false;
        }
        if (!waktuBerangkat) {
            alert('Silakan pilih jam berangkat.');
            isValid = false;
        }
        if (!waktuPulang) {
            alert('Silakan pilih jam pulang.');
            isValid = false;
        }

        if (!isValid) {
            return;
        }
        
        const biayaPerjalananText = modalBiayaPerjalanan.innerText;
        const totalPembayaranText = modalTotalPembayaran.innerText;

        const message = `
Halo MaRide! Saya ingin memesan layanan antar-jemput.

Berikut detail pesanan saya:

*Nama:* ${namaPembeli}
*Rute:* ${currentCardData.title}
*Alamat Lengkap:* ${alamatLengkap}
*Titik Lokasi (Google Maps):* ${lokasiGoogleMaps}
*Tanggal Booking:* ${tanggalBooking}
*Jam Berangkat:* ${waktuBerangkat}
*Jam Pulang:* ${waktuPulang}

*Biaya Perjalanan (Satu Arah):* ${biayaPerjalananText}
*Total Pembayaran (Antar + Jemput):* ${totalPembayaranText}

Mohon konfirmasi ketersediaan dan detail selanjutnya. Terima kasih!
        `.trim();

        ticketDetails.innerHTML = `
            <p><strong>Nama:</strong> ${namaPembeli}</p>
            <p><strong>Rute:</strong> ${currentCardData.title}</p>
            <p><strong>Alamat:</strong> ${alamatLengkap}</p>
            <p><strong>Tanggal Booking:</strong> ${tanggalBooking}</p>
            <p><strong>Jam Berangkat:</strong> ${waktuBerangkat}</p>
            <p><strong>Jam Pulang:</strong> ${waktuPulang}</p>
            <p><strong>Total Pembayaran:</strong> ${totalPembayaranText}</p>
        `;

        detailModal.hide();
        setTimeout(() => {
            ticketModal.show();
        }, 500);

        const whatsappUrl = `https://wa.me/6281234567890?text=${encodeURIComponent(message)}`;
        pesanSekarangBtn.dataset.whatsappUrl = whatsappUrl;

        pesanSekarangBtn.addEventListener('click', function () {
            window.open(this.dataset.whatsappUrl, '_blank');
        });
    });

    cetakTiketBtn.addEventListener('click', function() {
        const printContent = document.getElementById('ticketDetails').outerHTML;
        const originalContent = document.body.innerHTML;
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
            <head>
                <title>Tiket Booking MaRide</title>
                <style>
                    body { font-family: sans-serif; padding: 20px; }
                    .ticket-container { border: 2px solid #333; padding: 20px; border-radius: 10px; max-width: 500px; margin: auto; }
                    h2 { text-align: center; color: #333; }
                    p { font-size: 16px; margin: 5px 0; }
                </style>
            </head>
            <body>
                <div class="ticket-container">
                    <h2>Tiket Booking MaRide</h2>
                    <hr>
                    ${printContent}
                </div>
            </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.print();
    });
});