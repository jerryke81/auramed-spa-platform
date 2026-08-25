const express = require("express");
const prisma = require("../lib/prisma");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

router.get("/", async (req, res) => {
  const specialists = await prisma.specialist.findMany({
    include: { treatments: { include: { treatment: true } } },
  });
  res.json(specialists);
});

router.get("/:id", async (req, res) => {
  const specialist = await prisma.specialist.findUnique({
    where: { id: req.params.id },
    include: { treatments: { include: { treatment: true } } },
  });
  if (!specialist) return res.status(404).json({ error: "Not found" });
  res.json(specialist);
});

router.post("/", requireAuth, requireRole("SUPER_ADMIN"), async (req, res) => {
  const { name, photoUrl, academicBackground, workExperience, treatmentIds = [] } = req.body;
  const specialist = await prisma.specialist.create({
    data: {
      name, photoUrl, academicBackground, workExperience,
      treatments: { create: treatmentIds.map((id) => ({ treatmentId: id })) },
    },
  });
  res.status(201).json(specialist);
});

router.put("/:id", requireAuth, requireRole("SUPER_ADMIN"), async (req, res) => {
  const { name, photoUrl, academicBackground, workExperience, treatmentIds } = req.body;

  if (treatmentIds) {
    // Replace the specialization set: remove old links, create new ones
    await prisma.treatmentSpecialist.deleteMany({ where: { specialistId: req.params.id } });
    await prisma.treatmentSpecialist.createMany({
      data: treatmentIds.map((treatmentId) => ({ treatmentId, specialistId: req.params.id })),
    });
  }

  const specialist = await prisma.specialist.update({
    where: { id: req.params.id },
    data: { name, photoUrl, academicBackground, workExperience },
  });
  res.json(specialist);
});

router.delete("/:id", requireAuth, requireRole("SUPER_ADMIN"), async (req, res) => {
  await prisma.specialist.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

module.exports = router;
