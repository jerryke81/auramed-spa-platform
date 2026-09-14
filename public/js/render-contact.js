/**
 * Wires the Contact page form to POST /api/enquiries. The form itself has
 * existed since the original static build with no JS behind it at all
 * (action="#") — this is the actual fix, not a rebuild of the markup.
 *
 * Real fields on this page: #name, #email, #interest (a "Treatment Focus"
 * select), #message. There's no phone field, so `phone` is sent as
 * undefined (Enquiry.phone is optional). `interest` isn't a column on
 * Enquiry — rather than silently dropping it (see CLAUDE.md's other
 * "fields dropped in the transition" notes), its selected label is folded
 * into the message text so staff still see it in admin → Enquiries.
 */
(function () {
  document.addEventListener("DOMContentLoaded", function () {
    const form = document.querySelector(".contact-form-wrapper form");
    if (!form) return;

    form.addEventListener("submit", async function (e) {
      e.preventDefault();

      const submitBtn = form.querySelector('button[type="submit"], input[type="submit"]');
      const originalText = submitBtn ? submitBtn.textContent || submitBtn.value : null;
      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = "Sending..."; }

      const interestSelect = document.getElementById("interest");
      const interestLabel = interestSelect && interestSelect.selectedOptions.length
        ? interestSelect.selectedOptions[0].textContent
        : null;
      const rawMessage = document.getElementById("message")?.value || "";
      const message = interestLabel ? `Treatment Focus: ${interestLabel}\n\n${rawMessage}` : rawMessage;

      try {
        const res = await fetch("/api/enquiries", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: document.getElementById("name")?.value,
            email: document.getElementById("email")?.value,
            message,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Something went wrong");

        form.style.display = "none";
        form.insertAdjacentHTML("afterend", `
          <div style="padding:1.5rem; background:#eef5ee; border:1px solid #3c7a4f; border-radius:8px; margin-top:1rem;">
            Thank you — we've received your message and will be in touch soon.
          </div>
        `);
      } catch (err) {
        alert("Couldn't send your message: " + err.message);
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = originalText; }
      }
    });
  });
})();
