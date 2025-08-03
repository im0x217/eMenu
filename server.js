const express = require("express");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const compression = require("compression");
const { MongoClient, ObjectId } = require("mongodb");
const app = express();
const PORT = process.env.PORT || 3000;

const ADMIN_USER = process.env.ADMIN_USER || "admin";
const ADMIN_PASS = process.env.ADMIN_PASS || "1234";
const MONGO_URI = process.env.MONGO_URI;

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(compression());
app.use(express.json({ limit: "10mb" }));
app.use(cookieParser());
app.use(express.static(__dirname));

let db, productsCollection;
MongoClient.connect(MONGO_URI).then((client) => {
  db = client.db("emenu");
  productsCollection = db.collection("products");
  productsCollection.createIndex({ category: 1 });

  app.post("/api/login", (req, res) => {
    const { username, password } = req.body;
    if (username === ADMIN_USER && password === ADMIN_PASS) {
      res.cookie("admin", "true", { httpOnly: true, sameSite: "Strict", secure: true });
      return res.json({ success: true });
    }
    res.status(401).json({ success: false, message: "Unauthorized" });
  });

  const checkAdmin = (req, res, next) => {
    if (req.cookies.admin === "true") return next();
    res.status(403).json({ success: false, message: "Forbidden" });
  };

  app.get("/api/admin-check", checkAdmin, (req, res) => {
    res.json({ ok: true });
  });

  app.get("/api/products", async (req, res) => {
    try {
      const category = req.query.category;
      const query = category ? { category } : {};
      const products = await productsCollection
        .find(query, {
          projection: {
            name: 1,
            desc: 1,
            price: 1,
            price_regular: 1,
            price_bulk: 1,
            img: 1,
            category: 1,
            available: 1,
          },
        })
        .toArray();
      res.json(products);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch products" });
    }
  });

  app.post("/api/products", checkAdmin, async (req, res) => {
    const { name, desc, price_regular, price_bulk, img, category, price, available } = req.body;
    if (
      !name ||
      !category ||
      !img ||
      (price_regular === undefined && price === undefined)
    ) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    await productsCollection.insertOne({
      name,
      desc,
      price_regular,
      price_bulk,
      price,
      img,
      category,
      available: available === false ? false : true
    });
    res.json({ success: true });
  });

  app.put("/api/products/:id", checkAdmin, async (req, res) => {
    const { name, desc, price_regular, price_bulk, img, category, price, available } = req.body;
    if (
      !name ||
      !category ||
      !img ||
      (price_regular === undefined && price === undefined)
    ) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    await productsCollection.updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { name, desc, price_regular, price_bulk, price, img, category, available: available === false ? false : true } }
    );
    res.json({ success: true });
  });

  app.delete("/api/products/:id", checkAdmin, async (req, res) => {
    try {
      await productsCollection.deleteOne({ _id: new ObjectId(req.params.id) });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to delete product" });
    }
  });

  // Global error handler for deployment
  app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  });
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
});
