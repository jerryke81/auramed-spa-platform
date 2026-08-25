/**
 * Renders specialist cards into .grid-six from GET /api/specialists.
 * Note: the previous static build had a short job-title line per specialist
 * (e.g. "Chief Executive Officer") that isn't part of the Specialist model —
 * we have academicBackground/workExperience instead. Showing workExperience
 * as the subtitle line here as the closest fit; a dedicated "title" field
 * would need adding to the schema + admin form if the client wants the exact
 * short-title format back.
 *
 * Specialist detail links point to suzanne.html for all cards for now — that
 * page is still a static single-specialist template, not yet wired to show
 * the specific specialist clicked (see the procedure-1.html/suzanne.html
 * note in chat: deferred, needs a content decision first).
 */
(function () {
  function cardHtml(s) {
    return `
      <div class="member-card">
        <div class="member-img-box">
          <img src="${s.photoUrl}" alt="${s.name}" onerror="this.style.opacity=0.15">
        </div>
        <div class="member-meta">
          <h2><a href="suzanne.html">${s.name}</a></h2>
          <span class="member-title">${s.academicBackground}</span>
          <p class="member-bio">${s.workExperience}</p>
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
