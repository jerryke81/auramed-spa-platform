/**
 * Populates the homepage's "Our Products" infinite-scroll carousel from
 * GET /api/products. The CSS carousel (.carousel-track / @keyframes scroll)
 * relies on a --card-count CSS variable to size the track width and scroll
 * distance correctly for however many products actually exist — see the
 * width/keyframe rules in index.html's <style> block.
 *
 * The infinite-loop effect works by rendering the product set TWICE back to
 * back, then animating exactly one set-width to the left so it loops
 * seamlessly. If there are 0 products, the whole section is hidden rather
 * than showing an empty/broken carousel.
 */
(function () {
  function firstImage(images) {
    try {
      const arr = JSON.parse(images || "[]");
      return arr[0] || "/images/gallery/img-001-14885905-w600.jpg";
    } catch (e) {
      return "/images/gallery/img-001-14885905-w600.jpg";
    }
  }

  function cardHtml(p) {
    return `
      <div class="product-card">
        <img src="${firstImage(p.images)}" alt="${p.name}">
        <h4>${p.name}</h4>
        <p>$${p.priceUsd}</p>
      </div>`;
  }

  document.addEventListener("DOMContentLoaded", async function () {
    const track = document.querySelector(".carousel-track");
    const section = document.querySelector(".products-section");
    if (!track || !section) return;

    try {
      const res = await fetch("/api/products");
      const products = await res.json();

      if (!products.length) {
        section.style.display = "none"; // nothing to show yet — hide rather than show a broken carousel
        return;
      }

      // Cap how many feed the homepage strip so it doesn't get absurdly wide
      // with a large catalog — full list still lives on shop.html.
      const featured = products.slice(0, 8);

      track.style.setProperty("--card-count", featured.length);
      const cardsHtml = featured.map(cardHtml).join("");
      track.innerHTML = cardsHtml + cardsHtml; // duplicate set for the seamless loop
    } catch (err) {
      console.error("Failed to load homepage products:", err);
      section.style.display = "none";
    }
  });
})();
