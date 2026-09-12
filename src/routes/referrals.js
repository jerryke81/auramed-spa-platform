const express = require("express");
const crypto = require("crypto");
const prisma = require("../lib/prisma");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

function generateCode(name) {
  const base = (name || "GUEST").replace(/[^A-Za-z]/g, "").toUpperCase().slice(0, 6) || "GUEST";
  const suffix = crypto.randomInt(1000, 9999);
  return `${base}${suffix}`;
}

// GET /api/referrals/validate/:code — used by the booking form to check a
// code is real before submitting. Public — anyone can check a code exists.
router.get("/validate/:code", async (req, res) => {
  const code = await prisma.referralCode.findUnique({ where: { code: req.params.code.toUpperCase() } });
  if (!code) return res.status(404).json({ error: "Referral code not found" });
  res.json({ valid: true, ownerName: code.ownerName });
});

// GET /api/referrals — admin view of all referral rewards, for staff to look
// up by name/email/phone when a referrer comes in for their next booking.
router.get("/", requireAuth, requireRole("SUPER_ADMIN", "STAFF"), async (req, res) => {
  const referrals = await prisma.referral.findMany({
    include: {
      referralCode: true,
      refereeBooking: { include: { treatment: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  res.json(referrals);
});

// PATCH /api/referrals/:id/redeem — staff mark a reward as manually applied
router.patch("/:id/redeem", requireAuth, requireRole("SUPER_ADMIN", "STAFF"), async (req, res) => {
  const referral = await prisma.referral.update({
    where: { id: req.params.id },
    data: { rewardStatus: "REDEEMED", redeemedAt: new Date() },
  });
  res.json(referral);
});

module.exports = router;
module.exports.generateCode = generateCode;
