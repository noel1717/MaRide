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
    const namaPembeliInput = document.getElementById('namaPembeli');
    const alamatLengkapInput = document.getElementById('alamatLengkap');
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

    // Data simulasi stok, setiap slot waktu memiliki 15 kursi
    const stockData = {
        "Rute Merjosari": { "05:00": 15, "05:15": 15, "05:30": 15 },
        "Rute Suhat": { "05:00": 15, "05:15": 15, "05:30": 15 },
        "Rute Dinoyo": { "05:00": 15, "05:15": 15, "05:30": 15 },
        "Rute Siguragura": { "05:00": 15, "05:15": 15, "05:30": 15 },
        "Rute Ijen": { "05:00": 15, "05:15": 15, "05:30": 15 },
        "Rute Galunggung": { "05:00": 15, "05:15": 15, "05:30": 15 }
    };

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
            modalJarakTempuh.parentElement.classList.add('d-none');
            stokStatusSpan.innerText = 'Pilih tanggal dan jam';
            stokStatusSpan.classList.remove('text-success', 'text-danger');
            stokStatusSpan.classList.add('text-warning');
            pesanSekarangBtn.disabled = true;
            userLocation = null;
            document.querySelectorAll('.required-warning').forEach(label => label.parentElement.classList.remove('is-invalid-label'));
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
                    lokasiGoogleMapsInput.value = `https://maps.google.com/?q=${lat},${lon}`;
                    calculateDistanceAndPrice();
                    this.innerText = '';
                    this.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-geo-alt-fill" viewBox="0 0 16 16"><path d="M8 16s6-5.686 6-10A6 6 0 0 0 2 6c0 4.314 6 10 6 10zm0-7a3 3 0 1 1 0-6 3 3 0 0 1 0 6z"/></svg>';
                    this.disabled = false;
                },
                error => {
                    geolocationError.classList.remove('d-none');
                    geolocationError.innerText = 'Gagal mendapatkan lokasi. Mohon izinkan akses atau masukkan tautan manual.';
                    this.innerText = '';
                    this.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-geo-alt-fill" viewBox="0 0 16 16"><path d="M8 16s6-5.686 6-10A6 6 0 0 0 2 6c0 4.314 6 10 6 10zm0-7a3 3 0 1 1 0-6 3 3 0 0 1 0 6z"/></svg>';
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
            modalJarakTempuh.parentElement.classList.add('d-none');
            userLocation = null;
        }
    });

    function calculateDistanceAndPrice() {
        if (!userLocation || !currentCardData.destinationLat) return;

        const R = 6371; // Radius of Earth in km
        const dLat = deg2rad(currentCardData.destinationLat - userLocation.lat);
        const dLon = deg2rad(currentCardData.destinationLon - userLocation.lon);

        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(deg2rad(userLocation.lat)) * Math.cos(deg2rad(currentCardData.destinationLat)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);

        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distanceKm = R * c;
        const distanceM = distanceKm * 1000;
        const roundedDistanceKm = distanceKm.toFixed(2);

        let oneWayPrice;
        const tarif500m = 5000;
        const tarifNormalPerM = 7;
        const tarifDiskonPerM = 6;
        const batasNormal = 5000; // 5 km dalam meter

        if (distanceM <= 500) {
            oneWayPrice = tarif500m;
        } else if (distanceM > 500 && distanceM <= batasNormal) {
            const sisaJarakM = distanceM - 500;
            oneWayPrice = tarif500m + (sisaJarakM * tarifNormalPerM);
        } else { // distanceM > 5000
            const jarakDiAtas500m = distanceM - 500;
            const jarakNormal = batasNormal - 500;
            const jarakDiskon = jarakDiAtas500m - jarakNormal;
            oneWayPrice = tarif500m + (jarakNormal * tarifNormalPerM) + (jarakDiskon * tarifDiskonPerM);
        }

        const totalPrice = Math.round(oneWayPrice * 2 / 100) * 100; // Round to nearest 100
        oneWayPrice = Math.round(oneWayPrice / 100) * 100; // Round to nearest 100

        modalBiayaPerjalanan.innerText = `Rp. ${oneWayPrice.toLocaleString('id-ID')}`;
        modalTotalPembayaran.innerText = `Rp. ${totalPrice.toLocaleString('id-ID')}`;
        modalJarakTempuh.innerText = `${roundedDistanceKm} km`;
        modalJarakTempuh.parentElement.classList.remove('d-none');
    }

    function deg2rad(deg) {
        return deg * (Math.PI / 180);
    }

    tanggalBookingInput.addEventListener('change', checkFormValidityAndStock);
    pilihanJamBerangkatContainer.addEventListener('change', checkFormValidityAndStock);
    pilihanJamPulangContainer.addEventListener('change', checkFormValidityAndStock);
    namaPembeliInput.addEventListener('input', checkFormValidityAndStock);
    alamatLengkapInput.addEventListener('input', checkFormValidityAndStock);
    lokasiGoogleMapsInput.addEventListener('input', checkFormValidityAndStock);

    function checkFormValidityAndStock() {
        const selectedDate = tanggalBookingInput.value;
        const selectedTimeBerangkat = bookingForm.querySelector('input[name="waktuBerangkat"]:checked')?.value;
        const selectedTimePulang = bookingForm.querySelector('input[name="waktuPulang"]:checked')?.value;
        const selectedRute = currentCardData.title;
        const isFormValid = namaPembeliInput.value && alamatLengkapInput.value && lokasiGoogleMapsInput.value && selectedDate && selectedTimeBerangkat && selectedTimePulang;

        if (selectedDate && selectedTimeBerangkat && selectedTimePulang && selectedRute) {
            const dateParts = selectedDate.split('-');
            const dateObj = new Date(dateParts[2], dateParts[1] - 1, dateParts[0]);
            const day = dateObj.getDay(); // 0 = Minggu, 1 = Senin, ... 6 = Sabtu

            if (day === 0 || day === 6) {
                stokStatusSpan.innerText = 'Layanan tidak tersedia di akhir pekan.';
                stokStatusSpan.classList.remove('text-success', 'text-warning');
                stokStatusSpan.classList.add('text-danger');
                pesanSekarangBtn.disabled = true;
                return;
            }

            if (stockData[selectedRute] && stockData[selectedRute][selectedTimeBerangkat]) {
                const remainingStock = stockData[selectedRute][selectedTimeBerangkat];

                stokStatusSpan.classList.remove('text-warning', 'text-danger');

                if (remainingStock > 0) {
                    stokStatusSpan.innerText = `Tersedia (${remainingStock} kursi)`;
                    stokStatusSpan.classList.add('text-success');
                    pesanSekarangBtn.disabled = !isFormValid;
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

        const namaPembeli = namaPembeliInput.value;
        const alamatLengkap = alamatLengkapInput.value;
        const lokasiGoogleMaps = lokasiGoogleMapsInput.value;
        const tanggalBooking = tanggalBookingInput.value;
        const waktuBerangkat = bookingForm.querySelector('input[name="waktuBerangkat"]:checked')?.value;
        const waktuPulang = bookingForm.querySelector('input[name="waktuPulang"]:checked')?.value;

        let isValid = true;
        document.querySelectorAll('form label').forEach(label => label.classList.remove('is-invalid-label'));

        if (!namaPembeli) {
            document.querySelector('label[for="namaPembeli"]').classList.add('is-invalid-label');
            isValid = false;
        }
        if (!alamatLengkap) {
            document.querySelector('label[for="alamatLengkap"]').classList.add('is-invalid-label');
            isValid = false;
        }
        if (!lokasiGoogleMaps) {
            document.querySelector('label[for="lokasiGoogleMaps"]').classList.add('is-invalid-label');
            isValid = false;
        }
        if (!tanggalBooking) {
            document.querySelector('label[for="tanggalBooking"]').classList.add('is-invalid-label');
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
        const whatsappUrl = `https://wa.me/6281234567890?text=${encodeURIComponent(message)}`;
        
        const existingWhatsappBtn = document.querySelector('#ticketModal .modal-footer .btn-success');
        if (existingWhatsappBtn) {
            existingWhatsappBtn.remove();
        }

        const whatsappBtn = document.createElement('a');
        whatsappBtn.href = whatsappUrl;
        whatsappBtn.target = '_blank';
        whatsappBtn.className = 'btn btn-success fw-bold me-2';
        whatsappBtn.innerText = 'Kirim ke WhatsApp';

        const modalFooter = document.querySelector('#ticketModal .modal-footer');
        modalFooter.insertBefore(whatsappBtn, cetakTiketBtn);
        
        setTimeout(() => {
            ticketModal.show();
        }, 500);

        cetakTiketBtn.addEventListener('click', function() {
            const printContent = document.getElementById('ticketDetails').outerHTML;
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
});
