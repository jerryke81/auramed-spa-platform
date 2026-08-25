/**
 * Count-up animation for the "Numbers Don't Lie" stats section.
 * Triggers once when the section scrolls into view (IntersectionObserver),
 * animates each <h3 data-count="14" data-suffix="k+" data-decimals="0">
 * from 0 up to its target value.
 */
(function () {
  function animateCount(el) {
    const target = parseFloat(el.dataset.count);
    const suffix = el.dataset.suffix || "";
    const decimals = parseInt(el.dataset.decimals || "0", 10);
    const duration = 1500; // ms
    const startTime = performance.now();

    function frame(now) {
      const progress = Math.min((now - startTime) / duration, 1);
      // ease-out for a natural "settling" feel
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = target * eased;
      el.textContent = current.toFixed(decimals) + suffix;
      if (progress < 1) requestAnimationFrame(frame);
      else el.textContent = target.toFixed(decimals) + suffix;
    }
    requestAnimationFrame(frame);
  }

  document.addEventListener("DOMContentLoaded", function () {
    const section = document.querySelector(".metrics");
    if (!section) return;

    const counters = section.querySelectorAll("h3[data-count]");
    if (!counters.length) return;

    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            counters.forEach(animateCount);
            obs.disconnect(); // only animate once
          }
        });
      },
      { threshold: 0.3 }
    );
    observer.observe(section);
  });
})();
