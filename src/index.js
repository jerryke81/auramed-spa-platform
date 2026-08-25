require("dotenv").config();
const express = require("express");
// Patches Express 4's router so an async handler that rejects is passed to the
// error handler below instead of becoming an unhandled rejection that exits the
// process. Must be required before the route files are loaded (they're required
// further down), so the patch is in place when their routers are created.
require("express-async-errors");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const app = express();

app.use(cors({ origin: process.env.CLIENT_ORIGIN, credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use(express.static("public"));   // serves index.html, treatments.html, etc. + /images, /js
app.use("/uploads", express.static("uploads"));

app.get("/api/health", (req, res) => res.json({ ok: true }));

app.use("/api/treatments", require("./routes/treatments"));
app.use("/api/specialists", require("./routes/specialists"));
app.use("/api/products", require("./routes/products"));
app.use("/api/bookings", require("./routes/bookings"));
app.use("/api/members", require("./routes/members"));
app.use("/api/staff", require("./routes/staff"));
app.use("/api/payments", require("./routes/payments"));
app.use("/api/admin", require("./routes/admin"));

// Basic error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`Spa platform API running on http://localhost:${port}`));
