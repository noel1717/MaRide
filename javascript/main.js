document.addEventListener('DOMContentLoaded', function () {
    const detailModal = new bootstrap.Modal(document.getElementById('detailModal'));
    const btnDetailList = document.querySelectorAll('.btnDetail');
    const modalJudul = document.getElementById('modal-judul-produk');
    const modalDeskripsi = document.getElementById('modal-deskripsi-produk');
    const modalGambar = document.getElementById('modal-gambar-produk');
    const modalBiayaPerjalanan = document.getElementById('modal-biaya-perjalanan');
    const modalTotalPembayaran = document.getElementById('modal-total-pembayaran');
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
            stokStatusSpan.innerText = 'Pilih tanggal dan jam';
            stokStatusSpan.classList.remove('text-success', 'text-danger');
            stokStatusSpan.classList.add('text-warning');
            pesanSekarangBtn.disabled = true;
            userLocation = null;
            document.querySelectorAll('.is-invalid-label').forEach(label => label.classList.remove('is-invalid-label'));
            document.querySelectorAll('input, select, textarea').forEach(el => el.classList.remove('is-invalid'));
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
                    lokasiGoogleMapsInput.value = `https://www.google.com/maps?q=${lat},${lon}`;
                    calculateDistanceAndPrice();
                    this.innerText = '';
                    this.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-geo-alt-fill" viewBox="0 0 16 16"><path d="M8 16s6-5.686 6-10A6 6 0 0 0 2 6c0 4.314 6 10 6 10zm0-7a3 3 0 1 1 0-6 3 3 0 0 1 0 6z"/></svg>';
                    this.disabled = false;
                    checkFormValidityAndStock();
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
            userLocation = null;
        }
        checkFormValidityAndStock();
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

        let oneWayPrice;
        if (distanceKm <= 5) {
            oneWayPrice = 5000 + (distanceKm * 1000 * 7); // Tarif per meter
        } else {
            oneWayPrice = 5000 + (5000 * 7) + ((distanceKm - 5) * 1000 * 6); // Tarif per meter dengan diskon
        }

        oneWayPrice = Math.round(oneWayPrice / 100) * 100; // Round to nearest 100
        const totalPrice = oneWayPrice * 2;

        modalBiayaPerjalanan.innerText = `Rp. ${oneWayPrice.toLocaleString('id-ID')}`;
        modalTotalPembayaran.innerText = `Rp. ${totalPrice.toLocaleString('id-ID')}`;
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
        
        let hasStock = false;
        if (selectedDate && selectedTimeBerangkat && selectedRute) {
            if (stockData[selectedRute] && stockData[selectedRute][selectedTimeBerangkat] && stockData[selectedRute][selectedTimeBerangkat] > 0) {
                const remainingStock = stockData[selectedRute][selectedTimeBerangkat];
                stokStatusSpan.classList.remove('text-warning', 'text-danger');
                stokStatusSpan.innerText = `Tersedia (${remainingStock} kursi)`;
                stokStatusSpan.classList.add('text-success');
                hasStock = true;
            } else {
                stokStatusSpan.innerText = 'Tidak Tersedia';
                stokStatusSpan.classList.remove('text-warning', 'text-success');
                stokStatusSpan.classList.add('text-danger');
            }
        } else {
            stokStatusSpan.innerText = 'Pilih tanggal dan jam';
            stokStatusSpan.classList.remove('text-success', 'text-danger');
            stokStatusSpan.classList.add('text-warning');
        }

        pesanSekarangBtn.disabled = !(isFormValid && hasStock);
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
        document.querySelectorAll('form label.is-invalid-label').forEach(label => label.classList.remove('is-invalid-label'));

        // Cek validasi untuk setiap field yang wajib diisi
        if (!namaPembeli) {
            document.querySelector('label[for="namaPembeli"]').classList.add('is-invalid-label');
            namaPembeliInput.classList.add('is-invalid');
            isValid = false;
        } else {
            namaPembeliInput.classList.remove('is-invalid');
        }
        if (!alamatLengkap) {
            document.querySelector('label[for="alamatLengkap"]').classList.add('is-invalid-label');
            alamatLengkapInput.classList.add('is-invalid');
            isValid = false;
        } else {
            alamatLengkapInput.classList.remove('is-invalid');
        }
        if (!lokasiGoogleMaps) {
            document.querySelector('label[for="lokasiGoogleMaps"]').classList.add('is-invalid-label');
            lokasiGoogleMapsInput.classList.add('is-invalid');
            isValid = false;
        } else {
            lokasiGoogleMapsInput.classList.remove('is-invalid');
        }
        if (!tanggalBooking) {
            document.querySelector('label[for="tanggalBooking"]').classList.add('is-invalid-label');
            tanggalBookingInput.classList.add('is-invalid');
            isValid = false;
        } else {
            tanggalBookingInput.classList.remove('is-invalid');
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
*Titik Lokasi penjemputan (Google Maps):* ${lokasiGoogleMaps}
*Tanggal Booking:* ${tanggalBooking}
*Jam Berangkat:* ${waktuBerangkat}
*Jam Pulang:* ${waktuPulang}

*Biaya Perjalanan (Satu Arah):* ${biayaPerjalananText}
*Total Pembayaran (Antar + Jemput):* ${totalPembayaranText}

Mohon konfirmasi ketersediaan dan detail selanjutnya. Terima kasih!
        `.trim();

        // Mengarahkan langsung ke WhatsApp dengan nomor baru
        const whatsappUrl = `https://wa.me/6289515750507?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
        
        detailModal.hide();
    });
});

