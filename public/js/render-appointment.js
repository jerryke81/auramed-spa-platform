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

    // Respect a treatment chosen before arriving here (e.g. clicking
    // "Book Appointment" on a specific treatment card or detail page).
    // Falls back to the first treatment if the id isn't found or wasn't given.
    const preselectedId = new URLSearchParams(window.location.search).get("treatmentId");
    const preselectedIndex = preselectedId ? treatments.findIndex(t => t.id === preselectedId) : -1;
    const initialIndex = preselectedIndex >= 0 ? preselectedIndex : 0;

    grid.innerHTML = treatments.map((t, i) => `
      <div class="selection-card${i === initialIndex ? " active" : ""}" data-treatment-id="${t.id}" style="cursor:pointer;">
        <input type="radio" name="treatment_choice" id="t_${t.id}" ${i === initialIndex ? "checked" : ""} style="pointer-events:none;">
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

    selectedTreatment = treatments[initialIndex];
    updateSummary();

    // If the treatment came pre-selected, scroll it into view so the client
    // actually sees which one is highlighted, rather than trusting they'll
    // notice a selected card somewhere in a long list.
    if (preselectedIndex >= 0) {
      grid.children[preselectedIndex].scrollIntoView({ behavior: "smooth", block: "center" });
    }
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

  let loggedInMember = null;

  // Detects a logged-in member and shows a status banner — informational
  // only, never a gate. A guest who ignores this experiences zero
  // difference from before this feature existed (see CLAUDE.md — Loyalty).
  async function checkMemberStatus() {
    if (!MemberAuth.isLoggedIn()) {
      document.getElementById("memberBanner").innerHTML = `
        <div style="background:#faf5e6; border:1px solid #d4af37; border-radius:8px; padding:0.85rem 1rem; margin-bottom:1.5rem; font-size:0.85rem;">
          <a href="/account/login.html?redirect=/appointment.html" style="color:#1c2b24; font-weight:600;">Log in</a>
          or <a href="/account/register.html" style="color:#1c2b24; font-weight:600;">create an account</a>
          to earn loyalty points on this visit.
        </div>`;
      return;
    }
    try {
      loggedInMember = await MemberAuth.authFetch("/api/members/me");
      document.getElementById("memberBanner").innerHTML = `
        <div style="background:#eef5ee; border:1px solid #3c7a4f; border-radius:8px; padding:0.85rem 1rem; margin-bottom:1.5rem; font-size:0.85rem;">
          Booking as <strong>${loggedInMember.firstName} ${loggedInMember.lastName}</strong> —
          you have ${loggedInMember.loyaltyPoints} loyalty points.
          <a href="#" onclick="MemberAuth.logout(); return false;" style="color:#a83c3c;">Not you?</a>
        </div>`;
      // Pre-fill and lock the contact fields since we already know them
      document.getElementById("first_name").value = loggedInMember.firstName;
      document.getElementById("last_name").value = loggedInMember.lastName;
      document.getElementById("email_address").value = loggedInMember.email;
    } catch (err) {
      // Token expired or invalid — treat as logged out, don't block booking
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    loadTreatments();
    checkMemberStatus();

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
            referredByCode: document.getElementById("referral_code").value.trim().toUpperCase() || undefined,
            memberId: loggedInMember ? loggedInMember.id : undefined,
          }),
        });

        if (!res.ok) throw new Error("Request failed — please try again.");
        const result = await res.json(); // the booking creation response

        successBanner.innerHTML = `
          Your appointment request has been received. Our team will review it and
          confirm your slot via the channel you selected.
          ${result.myReferralCode ? `
            <br><br>
            <div style="background:#faf5e6; border:1px solid #d4af37; border-radius:8px; padding:1rem; margin-top:0.5rem;">
              <strong>Know someone who'd love AuraMed?</strong><br>
              Share your code and you'll get 10% off your next visit once their
              first appointment is confirmed:
              <div style="font-size:1.3rem; font-weight:600; letter-spacing:1px; margin-top:0.5rem; color:#1c2b24;">
                ${result.myReferralCode}
              </div>
            </div>
          ` : ""}
        `;
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
