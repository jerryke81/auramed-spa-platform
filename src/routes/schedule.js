const express = require("express");
const prisma = require("../lib/prisma");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

// GET /api/schedule?date=YYYY-MM-DD — bookings grouped by specialist for one
// day. Includes any booking with that specialist assigned, regardless of
// status (PENDING assignments matter for planning too, not just CONFIRMED
// ones) — status is shown per booking so staff can tell the difference.
// Also returns a separate list of same-day bookings with no specialist
// assigned yet, so staff see what still needs assigning.
router.get("/", requireAuth, requireRole("SUPER_ADMIN", "STAFF"), async (req, res) => {
  const dateParam = req.query.date || new Date().toISOString().slice(0, 10); // default: today
  const dayStart = new Date(`${dateParam}T00:00:00`);
  const dayEnd = new Date(`${dateParam}T23:59:59.999`);

  const specialists = await prisma.specialist.findMany({
    orderBy: { name: "asc" },
  });

  const schedule = await Promise.all(
    specialists.map(async (specialist) => {
      const bookings = await prisma.booking.findMany({
        where: {
          specialistId: specialist.id,
          requestedDatetime: { gte: dayStart, lte: dayEnd },
          status: { not: "CANCELLED" },
        },
        include: { treatment: true, member: true },
        orderBy: { requestedDatetime: "asc" },
      });
      return { specialist: { id: specialist.id, name: specialist.name, photoUrl: specialist.photoUrl }, bookings };
    })
  );

  const unassigned = await prisma.booking.findMany({
    where: {
      specialistId: null,
      requestedDatetime: { gte: dayStart, lte: dayEnd },
      status: { not: "CANCELLED" },
    },
    include: { treatment: true, member: true },
    orderBy: { requestedDatetime: "asc" },
  });

  res.json({ date: dateParam, schedule, unassigned });
});

module.exports = router;
