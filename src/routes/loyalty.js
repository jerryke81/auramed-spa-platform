const express = require("express");
const prisma = require("../lib/prisma");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

// Flat points awarded per confirmed visit — see bookings.js confirm handler.
// Kept here so both this file and bookings.js reference the same constant.
const POINTS_PER_VISIT = 10;

// GET /api/loyalty — admin list of all members with a points balance > 0,
// for staff to browse who has points available to redeem.
router.get("/", requireAuth, requireRole("SUPER_ADMIN", "STAFF"), async (req, res) => {
  const members = await prisma.member.findMany({
    where: { loyaltyPoints: { gt: 0 } },
    select: { id: true, firstName: true, lastName: true, email: true, membershipTier: true, loyaltyPoints: true },
    orderBy: { loyaltyPoints: "desc" },
  });
  res.json(members);
});

// GET /api/loyalty/:memberId — a single member's balance + full transaction
// history, for staff to look up at checkout or to double check before redeeming.
router.get("/:memberId", requireAuth, requireRole("SUPER_ADMIN", "STAFF"), async (req, res) => {
  const member = await prisma.member.findUnique({
    where: { id: req.params.memberId },
    include: { loyaltyTransactions: { orderBy: { createdAt: "desc" } } },
  });
  if (!member) return res.status(404).json({ error: "Member not found" });
  res.json({
    id: member.id,
    firstName: member.firstName,
    lastName: member.lastName,
    email: member.email,
    loyaltyPoints: member.loyaltyPoints,
    transactions: member.loyaltyTransactions,
  });
});

// POST /api/loyalty/:memberId/redeem — staff manually redeem points for a
// discount they've applied by hand. Requires a note describing what the
// discount actually was, for the audit trail.
router.post("/:memberId/redeem", requireAuth, requireRole("SUPER_ADMIN", "STAFF"), async (req, res) => {
  const { points, note } = req.body;
  const pointsToRedeem = parseInt(points, 10);

  if (!pointsToRedeem || pointsToRedeem <= 0) {
    return res.status(400).json({ error: "points must be a positive number" });
  }
  if (!note || !note.trim()) {
    return res.status(400).json({ error: "A note describing the discount applied is required" });
  }

  const member = await prisma.member.findUnique({ where: { id: req.params.memberId } });
  if (!member) return res.status(404).json({ error: "Member not found" });
  if (member.loyaltyPoints < pointsToRedeem) {
    return res.status(400).json({ error: `Member only has ${member.loyaltyPoints} points available` });
  }

  await prisma.loyaltyTransaction.create({
    data: { memberId: member.id, points: -pointsToRedeem, reason: `Redeemed — ${note.trim()}` },
  });
  const updated = await prisma.member.update({
    where: { id: member.id },
    data: { loyaltyPoints: { decrement: pointsToRedeem } },
  });

  res.json({ loyaltyPoints: updated.loyaltyPoints });
});

module.exports = router;
module.exports.POINTS_PER_VISIT = POINTS_PER_VISIT;
