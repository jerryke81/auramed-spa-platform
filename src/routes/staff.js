const express = require("express");
const prisma = require("../lib/prisma");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

router.get("/", requireAuth, requireRole("SUPER_ADMIN"), async (req, res) => {
  res.json(await prisma.staff.findMany());
});

router.post("/", requireAuth, requireRole("SUPER_ADMIN"), async (req, res) => {
  const { name, position, dob } = req.body;
  const staff = await prisma.staff.create({ data: { name, position, dob: new Date(dob) } });
  res.status(201).json(staff);
});

router.put("/:id", requireAuth, requireRole("SUPER_ADMIN"), async (req, res) => {
  const { name, position, dob } = req.body;
  const staff = await prisma.staff.update({
    where: { id: req.params.id },
    data: { name, position, ...(dob ? { dob: new Date(dob) } : {}) },
  });
  res.json(staff);
});

router.delete("/:id", requireAuth, requireRole("SUPER_ADMIN"), async (req, res) => {
  await prisma.staff.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

module.exports = router;
