/**
 * Renders specialist cards into .grid-six from GET /api/specialists.
 * Note: the previous static build had a short job-title line per specialist
 * (e.g. "Chief Executive Officer") that isn't part of the Specialist model —
 * we have academicBackground/workExperience instead. Showing workExperience
 * as the subtitle line here as the closest fit; a dedicated "title" field
 * would need adding to the schema + admin form if the client wants the exact
 * short-title format back.
 *
 * Specialist detail links go to specialist-detail.html?id=<id>, which shows
 * the FULL untruncated bio for that specific specialist — replaces the old
 * static suzanne.html that every card linked to regardless of which
 * specialist was clicked.
 */
(function () {
  // academicBackground/workExperience can now be a full paragraph each
  // (see TEXT_LENGTH_FIX.md) — truncate on the listing card so a long bio
  // doesn't blow out every card to match its height. The full text is
  // never lost, just not all shown here; specialist-detail.html shows it in
  // full.
  function truncate(text, maxLength) {
    if (!text || text.length <= maxLength) return text || "";
    return text.slice(0, maxLength).trim() + "…";
  }

  function cardHtml(s) {
    return `
      <div class="member-card">
        <div class="member-img-box">
          <img src="${s.photoUrl}" alt="${s.name}" onerror="this.style.opacity=0.15">
        </div>
        <div class="member-meta">
          <h2><a href="specialist-detail.html?id=${s.id}">${s.name}</a></h2>
          <span class="member-title">${truncate(s.academicBackground, 60)}</span>
          <p class="member-bio">${truncate(s.workExperience, 140)}</p>
        </div>
      </div>`;
  }

  document.addEventListener("DOMContentLoaded", async function () {
    const grid = document.querySelector(".grid-six");
    const emptyMsg = document.getElementById("emptyMsg");
    if (!grid) return;

    try {
      const res = await fetch("/api/specialists");
      const specialists = await res.json();
      if (!specialists.length) {
        emptyMsg.style.display = "block";
        return;
      }
      emptyMsg.style.display = "none";
      grid.insertAdjacentHTML("beforeend", specialists.map(cardHtml).join(""));
    } catch (err) {
      console.error("Failed to load specialists:", err);
      emptyMsg.textContent = "Couldn't load our team right now — please refresh.";
      emptyMsg.style.display = "block";
    }
  });
})();
