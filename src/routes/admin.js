const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const prisma = require("../lib/prisma");

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

module.exports = router;
