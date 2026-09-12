const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const prisma = require("../lib/prisma");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

// POST /api/admin/login — Super Admin and Staff both log in here; role comes back in the token
router.post("/login", async (req, res) => {
  const { email, password } = req.body || {};

  // Guard before the query: Prisma throws on an undefined `where` value, and an
  // async throw here is an unhandled rejection that takes the whole process
  // down — i.e. an unauthenticated POST with no body could kill the API.
  if (typeof email !== "string" || typeof password !== "string") {
    return res.status(400).json({ error: "email and password are required" });
  }

  const admin = await prisma.adminUser.findUnique({ where: { email } });
  if (!admin || !(await bcrypt.compare(password, admin.passwordHash))) {
    return res.status(401).json({ error: "Invalid credentials" });
  }
  const token = jwt.sign(
    { sub: admin.id, role: admin.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );
  res.json({ token, role: admin.role });
});

// GET /api/admin/staff-accounts — Super Admin only, lists AdminUser rows
// with role STAFF, joined with their Staff profile if linked.
router.get("/staff-accounts", requireAuth, requireRole("SUPER_ADMIN"), async (req, res) => {
  const accounts = await prisma.adminUser.findMany({
    where: { role: "STAFF" },
    select: { id: true, name: true, email: true, staffId: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
  res.json(accounts);
});

// POST /api/admin/staff-accounts — Super Admin only. Creates login
// credentials (role STAFF) for someone already in the Staff table.
router.post("/staff-accounts", requireAuth, requireRole("SUPER_ADMIN"), async (req, res) => {
  const { staffId, email, password } = req.body;

  if (!email || !password || password.length < 8) {
    return res.status(400).json({ error: "Email and an 8+ character password are required" });
  }

  const existing = await prisma.adminUser.findUnique({ where: { email } });
  if (existing) return res.status(400).json({ error: "An account with this email already exists" });

  let staffName = "Staff";
  if (staffId) {
    const staff = await prisma.staff.findUnique({ where: { id: staffId } });
    if (!staff) return res.status(404).json({ error: "Staff record not found" });
    staffName = staff.name;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const account = await prisma.adminUser.create({
    data: { name: staffName, email, passwordHash, role: "STAFF", staffId: staffId || null },
  });
  res.status(201).json({ id: account.id, email: account.email });
});

// PATCH /api/admin/staff-accounts/:id/reset-password — Super Admin only
router.patch("/staff-accounts/:id/reset-password", requireAuth, requireRole("SUPER_ADMIN"), async (req, res) => {
  const { password } = req.body;
  if (!password || password.length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters" });
  }
  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.adminUser.update({ where: { id: req.params.id }, data: { passwordHash } });
  res.json({ ok: true });
});

module.exports = router;
