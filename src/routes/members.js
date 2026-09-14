const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const prisma = require("../lib/prisma");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

// POST /api/members/register — the 8-step wizard submits here as one payload
router.post("/register", async (req, res) => {
  const {
    firstName, middleName, lastName, gender, dob, nationality, profilePhotoUrl,
    mobile, email, physicalAddress, password,
    healthConditions = [], interestedServices = [],
    emergencyContactName, emergencyContactRelationship, emergencyContactPhone,
    membershipTier, marketingOptIn, agreedToTerms,
  } = req.body;

  if (!agreedToTerms) return res.status(400).json({ error: "Must agree to terms" });

  const passwordHash = await bcrypt.hash(password, 10);
  const member = await prisma.member.create({
    data: {
      firstName, middleName, lastName, gender, dob: new Date(dob), nationality, profilePhotoUrl,
      mobile, email, physicalAddress, passwordHash,
      healthConditions: JSON.stringify(healthConditions),
      interestedServices: JSON.stringify(interestedServices),
      emergencyContactName, emergencyContactRelationship, emergencyContactPhone,
      membershipTier, marketingOptIn, agreedToTerms,
    },
  });
  res.status(201).json({ id: member.id, email: member.email });
});

// POST /api/members/login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const member = await prisma.member.findUnique({ where: { email } });
  if (!member || !(await bcrypt.compare(password, member.passwordHash))) {
    return res.status(401).json({ error: "Invalid credentials" });
  }
  const token = jwt.sign(
    { sub: member.id, role: "MEMBER" },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );
  res.json({ token });
});

// GET /api/members/me — the logged-in member's own profile, for their
// dashboard. Uses the same requireAuth/requireRole middleware as admin
// routes — the JWT from POST /api/members/login already carries role:
// "MEMBER", so requireRole("MEMBER") works identically to how it works
// for SUPER_ADMIN/STAFF elsewhere.
router.get("/me", requireAuth, requireRole("MEMBER"), async (req, res) => {
  const member = await prisma.member.findUnique({
    where: { id: req.user.sub },
    select: {
      id: true, firstName: true, lastName: true, email: true,
      membershipTier: true, loyaltyPoints: true,
    },
  });
  if (!member) return res.status(404).json({ error: "Member not found" });

  // Returns ALL of the member's bookings (past and upcoming, any status) —
  // the dashboard frontend filters to "upcoming" for display, so the data
  // is available for a fuller "booking history" view later without needing
  // another backend change.
  const bookings = await prisma.booking.findMany({
    where: { memberId: member.id },
    include: { treatment: true, specialist: true },
    orderBy: { requestedDatetime: "desc" },
  });

  res.json({ ...member, bookings });
});

// GET /api/members — Super Admin only, view-only list (no edit endpoint per spec)
router.get("/", requireAuth, requireRole("SUPER_ADMIN"), async (req, res) => {
  const members = await prisma.member.findMany({
    select: { id: true, firstName: true, lastName: true, email: true, membershipTier: true, createdAt: true },
  });
  res.json(members);
});

// DELETE /api/members/:id — Super Admin only
router.delete("/:id", requireAuth, requireRole("SUPER_ADMIN"), async (req, res) => {
  await prisma.member.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

// Note: intentionally no PUT/PATCH here — Super Admin can view + delete only, per client spec.

module.exports = router;
