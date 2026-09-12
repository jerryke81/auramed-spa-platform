const express = require("express");
const prisma = require("../lib/prisma");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

// GET /api/reviews/public — homepage/testimonials feed, only approved reviews
router.get("/public", async (req, res) => {
  const reviews = await prisma.review.findMany({
    where: { isPublished: true, rating: { not: null } },
    include: { booking: { include: { treatment: true } } },
    orderBy: { submittedAt: "desc" },
  });
  res.json(reviews);
});

// GET /api/reviews/by-token/:token — the client's own review link, staff-shared.
// No auth: the unguessable token IS the access control here.
router.get("/by-token/:token", async (req, res) => {
  const review = await prisma.review.findUnique({
    where: { token: req.params.token },
    include: { booking: { include: { treatment: true } } },
  });
  if (!review) return res.status(404).json({ error: "Review link not found or expired" });
  res.json(review);
});

// POST /api/reviews/by-token/:token — client submits their rating/comment
router.post("/by-token/:token", async (req, res) => {
  const { rating, comment } = req.body;
  const ratingNum = parseInt(rating, 10);
  if (!ratingNum || ratingNum < 1 || ratingNum > 5) {
    return res.status(400).json({ error: "Rating must be between 1 and 5" });
  }

  const review = await prisma.review.findUnique({ where: { token: req.params.token } });
  if (!review) return res.status(404).json({ error: "Review link not found or expired" });
  if (review.submittedAt) return res.status(400).json({ error: "This review has already been submitted" });

  const updated = await prisma.review.update({
    where: { token: req.params.token },
    data: { rating: ratingNum, comment, submittedAt: new Date() },
  });
  res.json(updated);
});

// GET /api/reviews — admin moderation queue, all reviews regardless of status
router.get("/", requireAuth, requireRole("SUPER_ADMIN", "STAFF"), async (req, res) => {
  const reviews = await prisma.review.findMany({
    include: { booking: { include: { treatment: true } } },
    orderBy: { createdAt: "desc" },
  });
  res.json(reviews);
});

// PATCH /api/reviews/:id/publish — Super Admin approves/unpublishes a review
router.patch("/:id/publish", requireAuth, requireRole("SUPER_ADMIN"), async (req, res) => {
  const { isPublished } = req.body;
  const review = await prisma.review.update({
    where: { id: req.params.id },
    data: { isPublished: !!isPublished },
  });
  res.json(review);
});

module.exports = router;
