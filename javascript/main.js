document.addEventListener("DOMContentLoaded", function () {
  const detailModal = new bootstrap.Modal(
    document.getElementById("detailModal"),
  );
  const btnDetailList = document.querySelectorAll(".btnDetail");
  const modalJudul = document.getElementById("modal-judul-produk");
  const modalDeskripsi = document.getElementById("modal-deskripsi-produk");
  const modalGambar = document.getElementById("modal-gambar-produk");
  const modalBiayaPerjalanan = document.getElementById(
    "modal-biaya-perjalanan",
  );
  const modalTotalPembayaran = document.getElementById(
    "modal-total-pembayaran",
  );
  const modalJarakTempuh = document.getElementById("modal-jarak-tempuh");
  const bookingForm = document.getElementById("bookingForm");
  const namaPembeliInput = document.getElementById("namaPembeli");
  const alamatLengkapInput = document.getElementById("alamatLengkap");
  const lokasiGoogleMapsInput = document.getElementById("lokasiGoogleMaps");
  const shareLocBtn = document.getElementById("shareLocBtn");
  const geolocationError = document.getElementById("geolocationError");
  const tanggalBookingInput = document.getElementById("tanggalBooking");
  const pilihanJamBerangkatContainer = document.getElementById(
    "pilihanJamBerangkatContainer",
  );
  const pilihanJamPulangContainer = document.getElementById(
    "pilihanJamPulangContainer",
  );
  const stokStatusSpan = document.getElementById("stokStatus");
  const pesanSekarangBtn = document.getElementById("pesanSekarangBtn");

  const stockData = {
    "Rute Merjosari": { "05:00": 15, "05:15": 15, "05:30": 15 },
    "Rute Suhat": { "05:00": 15, "05:15": 15, "05:30": 15 },
    "Rute Dinoyo": { "05:00": 15, "05:15": 15, "05:30": 15 },
    "Rute Siguragura": { "05:00": 15, "05:15": 15, "05:30": 15 },
    "Rute Ijen": { "05:00": 15, "05:15": 15, "05:30": 15 },
    "Rute Galunggung": { "05:00": 15, "05:15": 15, "05:30": 15 },
  };

  let currentCardData = {};
  let userLocation = null;
  let activeCard = null;

  flatpickr(tanggalBookingInput, {
    dateFormat: "d-m-Y",
    minDate: "today",
    allowInput: true,
  });

  btnDetailList.forEach((btn) => {
    btn.addEventListener("click", function () {
      if (activeCard) activeCard.classList.remove("card-active");

      const card = this.closest(".card");
      activeCard = card;
      activeCard.classList.add("card-active");

      currentCardData = {
        title: card.querySelector(".card-title").innerText,
        description: card.querySelector(".deskripsi-tersembunyi").innerText,
        image: card.getAttribute("data-gambar"),
        destinationLat: parseFloat(card.getAttribute("data-destination-lat")),
        destinationLon: parseFloat(card.getAttribute("data-destination-lon")),
      };

      modalJudul.innerText = currentCardData.title;
      modalDeskripsi.innerText = currentCardData.description;
      modalGambar.src = currentCardData.image;

      bookingForm.reset();
      modalBiayaPerjalanan.innerText = "Klik tombol Ambil Lokasi";
      modalTotalPembayaran.innerText = "Klik tombol Ambil Lokasi";
      if (modalJarakTempuh)
        modalJarakTempuh.parentElement.classList.add("d-none");
      stokStatusSpan.innerText = "Pilih tanggal dan jam";
      stokStatusSpan.className = "text-warning";
      pesanSekarangBtn.disabled = true;
      userLocation = null;
      document
        .querySelectorAll(".is-invalid-label")
        .forEach((label) => label.classList.remove("is-invalid-label"));
      document
        .querySelectorAll("input, select, textarea")
        .forEach((el) => el.classList.remove("is-invalid"));
    });
  });

  // Share Location Button (Ambil GPS HP secara Langsung)
  shareLocBtn.addEventListener("click", function () {
    if (navigator.geolocation) {
      geolocationError.classList.add("d-none");
      this.innerText = "Mengambil Lokasi...";
      this.disabled = true;

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;
          userLocation = { lat, lon };
          lokasiGoogleMapsInput.value = `https://www.google.com/maps?q=${lat},${lon}`;

          calculateDistanceAndPrice();

          this.innerText = "📍 Lokasi Terdeteksi";
          this.disabled = false;
          checkFormValidityAndStock();
        },
        (error) => {
          geolocationError.classList.remove("d-none");
          geolocationError.innerText =
            "Gagal mengambil GPS. Pastikan izin lokasi aktif di HP Anda.";
          this.innerText = "📍 Ambil Lokasi Saya";
          this.disabled = false;
        },
        { enableHighAccuracy: true, timeout: 10000 },
      );
    } else {
      geolocationError.classList.remove("d-none");
      geolocationError.innerText = "Browser tidak mendukung GPS.";
    }
  });

  // Menghitung Jarak Jalan Raya via OSRM + Tarif
  async function calculateDistanceAndPrice() {
    if (!userLocation || !currentCardData.destinationLat) return;

    modalBiayaPerjalanan.innerText = "Menghitung rute...";
    modalTotalPembayaran.innerText = "Menghitung rute...";

    try {
      const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${userLocation.lon},${userLocation.lat};${currentCardData.destinationLon},${currentCardData.destinationLat}?overview=false`;
      const response = await fetch(osrmUrl);
      const data = await response.json();

      if (!data.routes || data.routes.length === 0) {
        modalBiayaPerjalanan.innerText = "Rute tidak ditemukan";
        modalTotalPembayaran.innerText = "Rute tidak ditemukan";
        return;
      }

      const distanceM = data.routes[0].distance;
      const distanceKm = (distanceM / 1000).toFixed(2);

      if (modalJarakTempuh) {
        modalJarakTempuh.innerText = `${distanceKm} km`;
        modalJarakTempuh.parentElement.classList.remove("d-none");
      }

      let oneWayPrice;
      if (distanceM <= 500) {
        oneWayPrice = 8000;
      } else if (distanceM <= 5000) {
        oneWayPrice = 8000 + (distanceM - 500) * 8;
      } else {
        oneWayPrice = 8000 + 4500 * 8 + (distanceM - 5000) * 6;
      }

      oneWayPrice = Math.round(oneWayPrice / 100) * 100;
      const totalPrice = oneWayPrice * 2;

      modalBiayaPerjalanan.innerText = `Rp. ${oneWayPrice.toLocaleString("id-ID")}`;
      modalTotalPembayaran.innerText = `Rp. ${totalPrice.toLocaleString("id-ID")}`;
    } catch (error) {
      modalBiayaPerjalanan.innerText = "Gagal menghitung rute";
      modalTotalPembayaran.innerText = "Gagal menghitung rute";
    }
  }

  tanggalBookingInput.addEventListener("change", checkFormValidityAndStock);
  pilihanJamBerangkatContainer.addEventListener(
    "change",
    checkFormValidityAndStock,
  );
  pilihanJamPulangContainer.addEventListener(
    "change",
    checkFormValidityAndStock,
  );
  namaPembeliInput.addEventListener("input", checkFormValidityAndStock);
  alamatLengkapInput.addEventListener("input", checkFormValidityAndStock);

  function checkFormValidityAndStock() {
    const selectedDate = tanggalBookingInput.value;
    const selectedTimeBerangkat = bookingForm.querySelector(
      'input[name="waktuBerangkat"]:checked',
    )?.value;
    const selectedTimePulang = bookingForm.querySelector(
      'input[name="waktuPulang"]:checked',
    )?.value;
    const selectedRute = currentCardData.title;
    const isFormValid =
      namaPembeliInput.value &&
      alamatLengkapInput.value &&
      userLocation &&
      selectedDate &&
      selectedTimeBerangkat &&
      selectedTimePulang;

    let hasStock = false;
    if (selectedDate && selectedTimeBerangkat && selectedRute) {
      if (
        stockData[selectedRute] &&
        stockData[selectedRute][selectedTimeBerangkat] > 0
      ) {
        const remainingStock = stockData[selectedRute][selectedTimeBerangkat];
        stokStatusSpan.innerText = `Tersedia (${remainingStock} kursi)`;
        stokStatusSpan.className = "text-success";
        hasStock = true;
      } else {
        stokStatusSpan.innerText = "Tidak Tersedia";
        stokStatusSpan.className = "text-danger";
      }
    } else {
      stokStatusSpan.innerText = "Pilih tanggal dan jam";
      stokStatusSpan.className = "text-warning";
    }

    pesanSekarangBtn.disabled = !(isFormValid && hasStock);
  }

  pesanSekarangBtn.addEventListener("click", function (e) {
    e.preventDefault();
    const message = `
Halo MaRide! Saya ingin memesan layanan antar-jemput.

Berikut detail pesanan saya:
*Nama:* ${namaPembeliInput.value}
*Rute:* ${currentCardData.title}
*Alamat Lengkap:* ${alamatLengkapInput.value}
*Titik Lokasi (GPS):* ${lokasiGoogleMapsInput.value}
*Tanggal Booking:* ${tanggalBookingInput.value}
*Jam Berangkat:* ${bookingForm.querySelector('input[name="waktuBerangkat"]:checked')?.value}
*Jam Pulang:* ${bookingForm.querySelector('input[name="waktuPulang"]:checked')?.value}

*Biaya Perjalanan (Satu Arah):* ${modalBiayaPerjalanan.innerText}
*Total Pembayaran (Antar + Jemput):* ${modalTotalPembayaran.innerText}

Mohon konfirmasi ketersediaan dan detail selanjutnya. Terima kasih!
        `.trim();

    window.open(
      `https://wa.me/6289515750507?text=${encodeURIComponent(message)}`,
      "_blank",
    );
    detailModal.hide();
  });
});
