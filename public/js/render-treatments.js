/**
 * Renders treatment cards into .catalog-grid from GET /api/treatments.
 * Only published treatments are returned by this endpoint (drafts are
 * admin-only, see /api/treatments/admin/all).
 *
 * Note: the previous static build showed richer per-treatment metadata
 * (custom "Downtime" figures, descriptive category labels like "Endocrine
 * Systems") that the current data model doesn't capture — this renders what
 * the schema actually has (category enum, duration, cost). If the client
 * wants that richer copy back, it needs new fields added to the Treatment
 * model + admin form, not just template changes here.
 */
(function () {
  const CATEGORY_LABELS = { FACE: "Face", SKIN: "Skin", BODY: "Body", WELLNESS: "Wellness" };

  function firstImage(images) {
    try {
      const arr = JSON.parse(images || "[]");
      return arr[0] || "/images/gallery/img-001-14885905-w600.jpg"; // generic fallback
    } catch (e) {
      return "/images/gallery/img-001-14885905-w600.jpg";
    }
  }

  function cardHtml(t) {
    return `
      <article class="treatment-card">
        <div class="treatment-image-box">
          <img src="${firstImage(t.images)}" alt="${t.name}">
        </div>
        <div class="treatment-details-box">
          <span class="treatment-tag">Category: ${CATEGORY_LABELS[t.category] || t.category}</span>
          <h2>${t.name}</h2>
          <div class="treatment-meta-strip">
            <div class="meta-item"><span class="meta-label">Time</span><span class="meta-value">${t.durationValue} ${t.durationUnit.toLowerCase()}</span></div>
            <div class="meta-item"><span class="meta-label">Cost</span><span class="meta-value">$${t.costUsd}</span></div>
          </div>
          <p class="treatment-description">${t.description}</p>
          <div class="treatment-actions">
            <a href="appointment.html" class="cta-btn">Book Appointment</a>
            <a href="procedure-1.html" class="cta-btn outline-btn">View Treatment</a>
          </div>
        </div>
      </article>`;
  }

  document.addEventListener("DOMContentLoaded", async function () {
    const grid = document.querySelector(".catalog-grid");
    const emptyMsg = document.getElementById("emptyMsg");
    if (!grid) return;

    try {
      const res = await fetch("/api/treatments");
      const treatments = await res.json();
      if (!treatments.length) {
        emptyMsg.style.display = "block";
        return;
      }
      emptyMsg.style.display = "none";
      grid.insertAdjacentHTML("beforeend", treatments.map(cardHtml).join(""));
    } catch (err) {
      console.error("Failed to load treatments:", err);
      emptyMsg.textContent = "Couldn't load treatments right now — please refresh.";
      emptyMsg.style.display = "block";
    }
  });
})();
