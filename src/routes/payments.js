const express = require("express");
const prisma = require("../lib/prisma");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

// POST /api/payments/create — creates a pending Payment record for a booking or order
// Actual PayPal order creation (calling PayPal's Orders API) plugs in here.
router.post("/create", async (req, res) => {
  const { bookingId, orderId, amountUsd } = req.body;
  const payment = await prisma.payment.create({
    data: { bookingId, orderId, amountUsd, provider: "paypal" },
  });
  // TODO: call PayPal Orders API (createOrder) using PAYPAL_CLIENT_ID/SECRET from .env,
  // store the returned PayPal order id in providerRef, return the approval URL to the client.
  res.status(201).json(payment);
});

// POST /api/payments/:id/capture — called after PayPal approval to mark as paid
// This is where you'd call PayPal's "capture" endpoint and verify the response.
router.post("/:id/capture", async (req, res) => {
  const { providerRef } = req.body;
  const payment = await prisma.payment.update({
    where: { id: req.params.id },
    data: { status: "PAID", providerRef },
  });
  res.json(payment);
});

// GET /api/payments — Super Admin dashboard view of all payment statuses
router.get("/", requireAuth, requireRole("SUPER_ADMIN"), async (req, res) => {
  const payments = await prisma.payment.findMany({
    include: { booking: true, order: true },
    orderBy: { createdAt: "desc" },
  });
  res.json(payments);
});

module.exports = router;
