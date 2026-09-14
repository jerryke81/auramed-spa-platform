const express = require("express");
const prisma = require("../lib/prisma");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

// POST /api/enquiries — public, from the Contact page form. No auth needed
// (same as booking requests) — anyone should be able to reach out.
router.post("/", async (req, res) => {
  const { name, email, phone, message } = req.body;
  if (!name || !email || !message) {
    return res.status(400).json({ error: "Name, email, and a message are required" });
  }
  const enquiry = await prisma.enquiry.create({
    data: { name, email, phone, message },
  });
  res.status(201).json({ id: enquiry.id });
});

// GET /api/enquiries — Super Admin/Staff follow-up queue
router.get("/", requireAuth, requireRole("SUPER_ADMIN", "STAFF"), async (req, res) => {
  const enquiries = await prisma.enquiry.findMany({ orderBy: { createdAt: "desc" } });
  res.json(enquiries);
});

// PATCH /api/enquiries/:id/status — mark as responded
router.patch("/:id/status", requireAuth, requireRole("SUPER_ADMIN", "STAFF"), async (req, res) => {
  const { status } = req.body;
  if (!["NEW", "RESPONDED"].includes(status)) {
    return res.status(400).json({ error: "status must be NEW or RESPONDED" });
  }
  const enquiry = await prisma.enquiry.update({ where: { id: req.params.id }, data: { status } });
  res.json(enquiry);
});

module.exports = router;
