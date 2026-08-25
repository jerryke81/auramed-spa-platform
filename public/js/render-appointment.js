/**
 * Appointment request form — request-and-confirm model (see CLAUDE.md §Booking).
 * The client picks a treatment + preferred date/time only. No specialist
 * picker here by design — staff assign the specialist after the request
 * comes in (this page used to let clients pick a clinician directly, which
 * contradicted the confirmed flow — removed).
 *
 * Submits to POST /api/bookings as a guest booking (name/email/phone),
 * since there's no member login wired into this page yet.
 */
(function () {
  let treatments = [];
  let selectedTreatment = null;

  function renderTreatmentCards() {
    const grid = document.getElementById("treatmentGrid");
    const emptyMsg = document.getElementById("treatmentEmptyMsg");

    if (!treatments.length) {
      emptyMsg.style.display = "block";
      document.getElementById("submitBtn").disabled = true;
      return;
    }

    grid.innerHTML = treatments.map((t, i) => `
      <div class="selection-card${i === 0 ? " active" : ""}" data-treatment-id="${t.id}" style="cursor:pointer;">
        <input type="radio" name="treatment_choice" id="t_${t.id}" ${i === 0 ? "checked" : ""} style="pointer-events:none;">
        <div class="card-content">
          <span class="title">${t.name}</span>
          <span class="meta">$${t.costUsd} • ${t.durationValue} ${t.durationUnit.toLowerCase()}</span>
        </div>
      </div>
    `).join("");

    // Click anywhere on the card selects it — the missing piece that made
    // the original static cards unclickable (no <label>, no handler at all).
    grid.querySelectorAll(".selection-card").forEach((card) => {
      card.addEventListener("click", () => {
        grid.querySelectorAll(".selection-card").forEach((c) => c.classList.remove("active"));
        card.classList.add("active");
        card.querySelector('input[type="radio"]').checked = true;
        selectedTreatment = treatments.find((t) => t.id === card.dataset.treatmentId);
        updateSummary();
      });
    });

    selectedTreatment = treatments[0];
    updateSummary();
  }

  function updateSummary() {
    document.getElementById("summaryTreatment").textContent = selectedTreatment
      ? selectedTreatment.name : "Not yet selected";
    document.getElementById("summaryPrice").textContent = selectedTreatment
      ? `$${selectedTreatment.costUsd}` : "—";

    const date = document.getElementById("booking_date").value;
    const time = document.getElementById("booking_time").value;
    document.getElementById("summaryDatetime").textContent =
      date && time ? `${date} at ${time}` : "Not yet selected";
  }

  async function loadTreatments() {
    try {
      const res = await fetch("/api/treatments");
      treatments = await res.json();
      renderTreatmentCards();
    } catch (err) {
      console.error("Failed to load treatments:", err);
      document.getElementById("treatmentEmptyMsg").textContent =
        "Couldn't load treatments right now — please refresh or contact us directly.";
      document.getElementById("treatmentEmptyMsg").style.display = "block";
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    loadTreatments();

    document.getElementById("booking_date").addEventListener("change", updateSummary);
    document.getElementById("booking_time").addEventListener("change", updateSummary);

    document.getElementById("appointmentForm").addEventListener("submit", async function (e) {
      e.preventDefault();

      const errorBanner = document.getElementById("formError");
      const successBanner = document.getElementById("formSuccess");
      errorBanner.style.display = "none";
      successBanner.style.display = "none";

      const date = document.getElementById("booking_date").value;
      const time = document.getElementById("booking_time").value;

      if (!selectedTreatment) {
        errorBanner.textContent = "Please choose a treatment.";
        errorBanner.style.display = "block";
        return;
      }
      if (!date || !time) {
        errorBanner.textContent = "Please choose a preferred date and time.";
        errorBanner.style.display = "block";
        return;
      }

      const submitBtn = document.getElementById("submitBtn");
      submitBtn.disabled = true;
      submitBtn.textContent = "Sending Request...";

      try {
        const res = await fetch("/api/bookings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            treatmentId: selectedTreatment.id,
            requestedDatetime: new Date(`${date}T${time}`).toISOString(),
            notificationChannel: document.getElementById("notification_channel").value,
            guestName: `${document.getElementById("first_name").value} ${document.getElementById("last_name").value}`.trim(),
            guestEmail: document.getElementById("email_address").value,
            guestPhone: document.getElementById("phone_number").value,
            notes: document.getElementById("clinical_notes").value,
          }),
        });

        if (!res.ok) throw new Error("Request failed — please try again.");

        successBanner.textContent = "Your appointment request has been received. Our team will review it and confirm your slot via the channel you selected.";
        successBanner.style.display = "block";
        document.getElementById("appointmentForm").reset();
        submitBtn.textContent = "Request Sent";
      } catch (err) {
        errorBanner.textContent = err.message || "Something went wrong — please try again.";
        errorBanner.style.display = "block";
        submitBtn.disabled = false;
        submitBtn.textContent = "Request Appointment";
      }
    });
  });
})();
