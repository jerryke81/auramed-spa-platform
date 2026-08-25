const express = require("express");
const prisma = require("../lib/prisma");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

// POST /api/bookings — member or guest submits a request (no specialist chosen yet)
router.post("/", async (req, res) => {
  const {
    memberId, guestName, guestEmail, guestPhone,
    treatmentId, requestedDatetime, notificationChannel, notes,
  } = req.body;

  const booking = await prisma.booking.create({
    data: {
      memberId, guestName, guestEmail, guestPhone,
      treatmentId, requestedDatetime: new Date(requestedDatetime),
      notificationChannel, notes,
    },
  });
  res.status(201).json(booking);
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
