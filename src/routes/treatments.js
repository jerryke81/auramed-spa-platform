const express = require("express");
const prisma = require("../lib/prisma");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

// Enforced here since SQLite (local dev) can't use a Prisma enum for this field —
// see prisma/schema.prisma note. Keep this list in sync with the commented
// enum block there.
const VALID_CATEGORIES = ["FACE", "SKIN", "BODY", "WELLNESS"];

// GET /api/treatments — public, only published treatments, with specialists
router.get("/", async (req, res) => {
  const treatments = await prisma.treatment.findMany({
    where: { isPublished: true },
    include: { specialists: { include: { specialist: true } } },
  });
  res.json(treatments);
});

// GET /api/treatments/admin/all — Super Admin/Staff, sees drafts + published
// (must be registered before GET /:id, or "admin" would be matched as an id)
router.get("/admin/all", requireAuth, requireRole("SUPER_ADMIN", "STAFF"), async (req, res) => {
  const treatments = await prisma.treatment.findMany({
    include: { specialists: { include: { specialist: true } } },
    orderBy: { createdAt: "desc" },
  });
  res.json(treatments);
});

// GET /api/treatments/:id — public detail page, full bulletin + specialists
router.get("/:id", async (req, res) => {
  const treatment = await prisma.treatment.findUnique({
    where: { id: req.params.id },
    include: {
      specialists: { include: { specialist: true } },
      bulletinItems: { orderBy: { order: "asc" } },
    },
  });
  if (!treatment) return res.status(404).json({ error: "Not found" });
  res.json(treatment);
});

// POST /api/treatments — Super Admin only
router.post("/", requireAuth, requireRole("SUPER_ADMIN"), async (req, res) => {
  const {
    name, images, category, durationValue, durationUnit,
    description, costUsd, historyOfProcedure, patientRequirements,
    specialistIds = [], bulletinItems = [],
  } = req.body;

  if (!VALID_CATEGORIES.includes(category)) {
    return res.status(400).json({ error: `category must be one of ${VALID_CATEGORIES.join(", ")}` });
  }

  const treatment = await prisma.treatment.create({
    data: {
      name, images: JSON.stringify(images), category, durationValue, durationUnit,
      description, costUsd, historyOfProcedure, patientRequirements,
      specialists: { create: specialistIds.map((id) => ({ specialistId: id })) },
      bulletinItems: { create: bulletinItems.map((b, i) => ({ ...b, order: i })) },
    },
  });
  res.status(201).json(treatment);
});

// PUT /api/treatments/:id — Super Admin only
router.put("/:id", requireAuth, requireRole("SUPER_ADMIN"), async (req, res) => {
  const { images, category, ...rest } = req.body;

  if (category !== undefined && !VALID_CATEGORIES.includes(category)) {
    return res.status(400).json({ error: `category must be one of ${VALID_CATEGORIES.join(", ")}` });
  }

  const treatment = await prisma.treatment.update({
    where: { id: req.params.id },
    data: {
      ...rest,
      ...(category !== undefined ? { category } : {}),
      ...(images ? { images: JSON.stringify(images) } : {}),
    },
  });
  res.json(treatment);
});

// DELETE /api/treatments/:id — Super Admin only
router.delete("/:id", requireAuth, requireRole("SUPER_ADMIN"), async (req, res) => {
  await prisma.treatment.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

// PATCH /api/treatments/:id/publish — Super Admin only, toggles live/draft
router.patch("/:id/publish", requireAuth, requireRole("SUPER_ADMIN"), async (req, res) => {
  const { isPublished } = req.body;
  const treatment = await prisma.treatment.update({
    where: { id: req.params.id },
    data: { isPublished: !!isPublished },
  });
  res.json(treatment);
});

module.exports = router;
