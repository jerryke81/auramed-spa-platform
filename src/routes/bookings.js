const express = require("express");
const crypto = require("crypto");
const prisma = require("../lib/prisma");
const { requireAuth, requireRole } = require("../middleware/auth");
const { generateCode } = require("./referrals");
const { POINTS_PER_VISIT } = require("./loyalty");

const router = express.Router();

// POST /api/bookings — member or guest submits a request (no specialist chosen yet)
router.post("/", async (req, res) => {
  const {
    memberId, guestName, guestEmail, guestPhone,
    treatmentId, requestedDatetime, notificationChannel, notes,
    referredByCode, // optional code entered at booking time
  } = req.body;

  const booking = await prisma.booking.create({
    data: {
      memberId, guestName, guestEmail, guestPhone,
      treatmentId, requestedDatetime: new Date(requestedDatetime),
      notificationChannel, notes,
      referredByCode: referredByCode || null,
    },
  });

  // If a referral code was entered, link this booking to it as a pending
  // reward for whoever owns that code. Invalid/missing codes are silently
  // ignored here (not a hard error) so a typo doesn't block booking.
  if (referredByCode) {
    const code = await prisma.referralCode.findUnique({
      where: { code: referredByCode.toUpperCase() },
    });
    if (code) {
      await prisma.referral.create({
        data: { referralCodeId: code.id, refereeBookingId: booking.id },
      });
    }
  }

  // Every booker becomes a potential referrer themselves. Give them a code
  // if they (by email) don't already have one. Guests included, not just
  // registered members, per the client's decision. Capture whichever code
  // applies (existing or newly created) so the response can show it to them.
  let myReferralCode = null;
  const contactEmail = guestEmail || null;
  if (contactEmail) {
    const existing = await prisma.referralCode.findFirst({ where: { ownerEmail: contactEmail } });
    if (existing) {
      myReferralCode = existing.code;
    } else {
      const created = await prisma.referralCode.create({
        data: {
          code: generateCode(guestName),
          ownerName: guestName || "Guest",
          ownerEmail: contactEmail,
          ownerPhone: guestPhone || null,
        },
      });
      myReferralCode = created.code;
    }
  }

  res.status(201).json({ ...booking, myReferralCode });
});

// GET /api/bookings — Super Admin/Staff, all bookings regardless of status
router.get("/", requireAuth, requireRole("SUPER_ADMIN", "STAFF"), async (req, res) => {
  const bookings = await prisma.booking.findMany({
    include: { treatment: true, member: true, specialist: true },
    orderBy: { createdAt: "desc" },
  });
  res.json(bookings);
});

// GET /api/bookings/pending — staff/admin queue
router.get("/pending", requireAuth, requireRole("SUPER_ADMIN", "STAFF"), async (req, res) => {
  const bookings = await prisma.booking.findMany({
    where: { status: "PENDING" },
    include: { treatment: true, member: true },
    orderBy: { createdAt: "asc" },
  });
  res.json(bookings);
});

// PATCH /api/bookings/:id/assign — staff assigns a specialist, flags conflicts (doesn't block)
router.patch("/:id/assign", requireAuth, requireRole("SUPER_ADMIN", "STAFF"), async (req, res) => {
  const { specialistId } = req.body;
  const booking = await prisma.booking.findUnique({ where: { id: req.params.id } });
  if (!booking) return res.status(404).json({ error: "Not found" });

  const overlapping = await prisma.booking.findMany({
    where: {
      specialistId,
      status: { in: ["PENDING", "CONFIRMED"] },
      requestedDatetime: booking.requestedDatetime,
      NOT: { id: booking.id },
    },
  });

  const updated = await prisma.booking.update({
    where: { id: req.params.id },
    data: { specialistId },
  });
  res.json({ booking: updated, conflictWarning: overlapping.length > 0 });
});

// PATCH /api/bookings/:id/confirm — staff confirms, choosing pay-now or pay-later
router.patch("/:id/confirm", requireAuth, requireRole("SUPER_ADMIN", "STAFF"), async (req, res) => {
  const { paymentOption } = req.body; // "PAY_NOW" | "PAY_LATER"
  const booking = await prisma.booking.update({
    where: { id: req.params.id },
    data: { status: "CONFIRMED", paymentOption, confirmedAt: new Date() },
  });

  // If this booking used a referral code, the referrer just earned their reward
  const referral = await prisma.referral.findUnique({ where: { refereeBookingId: booking.id } });
  if (referral && referral.rewardStatus === "PENDING") {
    await prisma.referral.update({
      where: { id: referral.id },
      data: { rewardStatus: "EARNED" },
    });
  }

  // Generate a review link, ready for staff to share whenever they follow up
  await prisma.review.create({
    data: { bookingId: booking.id, token: crypto.randomBytes(20).toString("hex") },
  });

  // Award loyalty points if this booking belongs to a registered member.
  // Guest bookings are silently skipped — Members only, per the client's
  // decision for this feature.
  if (booking.memberId) {
    const treatment = await prisma.treatment.findUnique({ where: { id: booking.treatmentId } });
    await prisma.loyaltyTransaction.create({
      data: {
        memberId: booking.memberId,
        points: POINTS_PER_VISIT,
        reason: `Visit: ${treatment ? treatment.name : "treatment"}`,
      },
    });
    await prisma.member.update({
      where: { id: booking.memberId },
      data: { loyaltyPoints: { increment: POINTS_PER_VISIT } },
    });
  }

  // TODO: trigger notification on booking.notificationChannel
  res.json(booking);
});

// PATCH /api/bookings/:id/decline — staff declines
router.patch("/:id/decline", requireAuth, requireRole("SUPER_ADMIN", "STAFF"), async (req, res) => {
  const booking = await prisma.booking.update({
    where: { id: req.params.id },
    data: { status: "DECLINED" },
  });
  // TODO: trigger notification on booking.notificationChannel
  res.json(booking);
});

module.exports = router;
