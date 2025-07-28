// server.js
const express = require("express");
const { MongoClient, ObjectId } = require("mongodb");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const path = require("path");
const app = express();

const MONGO_URL = process.env.MONGO_URL || "mongodb://localhost:27017";
const DB_NAME = process.env.DB_NAME || "emenu";
const PORT = process.env.PORT || 3000;

const ADMIN_USER = process.env.ADMIN_USER || "admin";
const ADMIN_PASS = process.env.ADMIN_PASS || "1234";
const BULK_CODE = process.env.BULK_CODE || "1234";

app.use(express.static("."));
app.use(bodyParser.json({ limit: "2mb" }));
app.use(cookieParser());

MongoClient.connect(MONGO_URL).then((client) => {
  const db = client.db(DB_NAME);

  function checkAdmin(req, res, next) {
    if (req.cookies.admin === "true") return next();
    res.status(403).json({ error: "Unauthorized" });
  }

  // --- AUTH ---
  app.post("/api/login", (req, res) => {
    const { username, password } = req.body;
    if (username === ADMIN_USER && password === ADMIN_PASS) {
      res.cookie("admin", "true", {
        httpOnly: true,
        sameSite: "Lax",
        secure: false,
      });
      return res.json({ success: true });
    }
    res.status(401).json({ success: false, message: "Unauthorized" });
  });

  app.post("/api/logout", (req, res) => {
    res.clearCookie("admin");
    res.json({ success: true });
  });

  app.get("/api/admin-check", checkAdmin, (req, res) => {
    res.json({ ok: true });
  });

  // --- PRODUCTS ---
  app.get("/api/products", async (req, res) => {
    const { category } = req.query;
    const query = category ? { category } : {};
    // Only return the new price fields
    const products = await db.collection("products").find(query).toArray();
    res.json(
      products.map((p) => ({
        _id: p._id,
        name: p.name,
        desc: p.desc,
        price_regular: p.price_regular,
        price_bulk: p.price_bulk,
        img: p.img,
        category: p.category,
      }))
    );
  });

  app.post("/api/products", checkAdmin, async (req, res) => {
    const { name, desc, price_regular, price_bulk, img, category } = req.body;
    if (
      !name ||
      !category ||
      !img ||
      price_regular === undefined ||
      price_bulk === undefined
    ) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    await db.collection("products").insertOne({
      name,
      desc,
      price_regular,
      price_bulk,
      img,
      category,
    });
    res.json({ success: true });
  });

  app.put("/api/products/:id", checkAdmin, async (req, res) => {
    const { name, desc, price_regular, price_bulk, img, category } = req.body;
    if (
      !name ||
      !category ||
      !img ||
      price_regular === undefined ||
      price_bulk === undefined
    ) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    await db
      .collection("products")
      .updateOne(
        { _id: new ObjectId(req.params.id) },
        { $set: { name, desc, price_regular, price_bulk, img, category } }
      );
    res.json({ success: true });
  });

  app.delete("/api/products/:id", checkAdmin, async (req, res) => {
    await db
      .collection("products")
      .deleteOne({ _id: new ObjectId(req.params.id) });
    res.json({ success: true });
  });

  // --- BULK PRICE UNLOCK ENDPOINT (optional, for better security) ---
  app.post("/api/bulk-unlock", (req, res) => {
    const { code } = req.body;
    if (code === BULK_CODE) {
      return res.json({ success: true });
    }
    res.status(401).json({ success: false });
  });

  // --- fallback ---
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
  });

  app.listen(PORT, () => {
    console.log(`eMenu server running on port ${PORT}`);
  });
});
