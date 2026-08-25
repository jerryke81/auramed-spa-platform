/**
 * Renders product cards into .shop-grid from GET /api/products.
 * Note: the previous static build had a "Skin Type" meta field per product
 * that isn't part of the Product model — dropped here rather than invented.
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
      <article class="product-card">
        <div class="product-image-box">
          <img src="${firstImage(p.images)}" alt="${p.name}">
        </div>
        <div class="product-details-box">
          <span class="product-tag">Category: ${p.category}</span>
          <h2>${p.name}</h2>
          <div class="product-meta-strip">
            <div class="meta-item"><span class="meta-label">Volume</span><span class="meta-value">${p.weightValue}${p.weightUnit.toLowerCase()}</span></div>
          </div>
          <p class="product-description">${p.description}</p>
          <div class="product-price">$${p.priceUsd}</div>
          <div class="product-actions">
            <a href="#" class="cta-btn" onclick="addToCart('${p.id}'); return false;">Add to Cart</a>
            <a href="#" class="cta-btn outline-btn">View Details</a>
          </div>
        </div>
      </article>`;
  }

  // Cart wiring uses the persistent guest-cart endpoints already built on the
  // backend (see src/routes/products.js). No cart UI/counter yet — this just
  // confirms the item was added.
  window.addToCart = async function (productId) {
    try {
      await fetch("/api/products/cart/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ productId, quantity: 1 }),
      });
      alert("Added to cart.");
    } catch (err) {
      alert("Couldn't add to cart — please try again.");
    }
  };

  document.addEventListener("DOMContentLoaded", async function () {
    const grid = document.querySelector(".shop-grid");
    const emptyMsg = document.getElementById("emptyMsg");
    if (!grid) return;

    try {
      const res = await fetch("/api/products");
      const products = await res.json();
      if (!products.length) {
        emptyMsg.style.display = "block";
        return;
      }
      emptyMsg.style.display = "none";
      grid.insertAdjacentHTML("beforeend", products.map(cardHtml).join(""));
    } catch (err) {
      console.error("Failed to load products:", err);
      emptyMsg.textContent = "Couldn't load products right now — please refresh.";
      emptyMsg.style.display = "block";
    }
  });
})();
