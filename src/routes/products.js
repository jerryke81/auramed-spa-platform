const express = require("express");
const prisma = require("../lib/prisma");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

const VALID_WEIGHT_UNITS = ["KG", "LITER", "GRAMS"];

router.get("/", async (req, res) => {
  const products = await prisma.product.findMany();
  res.json(products);
});

// GET /api/products/cart — returns the current cart, if any.
// Must be registered before GET /:id, or "cart" is matched as a product id
// (same reason /admin/all sits above /:id in treatments.js).
router.get("/cart", async (req, res) => {
  const cartToken = req.cookies?.cartToken;
  if (!cartToken) return res.json({ items: [] });

  const order = await prisma.order.findFirst({
    where: { cartToken, status: "pending" },
    include: { items: { include: { product: true } } },
  });
  res.json(order || { items: [] });
});

router.get("/:id", async (req, res) => {
  const product = await prisma.product.findUnique({ where: { id: req.params.id } });
  if (!product) return res.status(404).json({ error: "Not found" });
  res.json(product);
});

router.post("/", requireAuth, requireRole("SUPER_ADMIN"), async (req, res) => {
  const { name, images, category, weightValue, weightUnit, description, priceUsd } = req.body;
  if (!VALID_WEIGHT_UNITS.includes(weightUnit)) {
    return res.status(400).json({ error: `weightUnit must be one of ${VALID_WEIGHT_UNITS.join(", ")}` });
  }
  const product = await prisma.product.create({
    data: { name, images: JSON.stringify(images), category, weightValue, weightUnit, description, priceUsd },
  });
  res.status(201).json(product);
});

router.put("/:id", requireAuth, requireRole("SUPER_ADMIN"), async (req, res) => {
  const { images, ...rest } = req.body;
  const product = await prisma.product.update({
    where: { id: req.params.id },
    data: { ...rest, ...(images ? { images: JSON.stringify(images) } : {}) },
  });
  res.json(product);
});

router.delete("/:id", requireAuth, requireRole("SUPER_ADMIN"), async (req, res) => {
  await prisma.product.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

// --- Persistent guest cart (cookie-based token, no account required) ---

// POST /api/products/cart/add — adds an item; creates a cart token cookie if none exists
router.post("/cart/add", async (req, res) => {
  let cartToken = req.cookies?.cartToken;
  const { productId, quantity = 1 } = req.body;

  let order = cartToken
    ? await prisma.order.findFirst({ where: { cartToken, status: "pending" } })
    : null;

  if (!order) {
    cartToken = cartToken || `cart_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    order = await prisma.order.create({ data: { cartToken, status: "pending" } });
    res.cookie("cartToken", cartToken, { maxAge: 1000 * 60 * 60 * 24 * 90, httpOnly: true });
  }

  const item = await prisma.orderItem.create({
    data: { orderId: order.id, productId, quantity },
  });
  res.status(201).json(item);
});

module.exports = router;
