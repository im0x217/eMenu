const express = require("express");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const compression = require("compression");
const { MongoClient, ObjectId } = require("mongodb");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const app = express();
const PORT = process.env.PORT || 3000;

const ADMIN_USER = process.env.ADMIN_USER || "admin";
const ADMIN_PASS = process.env.ADMIN_PASS || "1234";
const MONGO_URI = process.env.MONGO_URI;

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
}

// Multer storage configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname)); // Append extension
  }
});
const upload = multer({ storage: storage });

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(compression());
app.use(express.json({ limit: "10mb" }));
app.use(cookieParser());
app.use(express.static(__dirname));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

let db, productsCollection, categoriesCollection;
MongoClient.connect(MONGO_URI).then(async (client) => {
  db = client.db("emenu");
  productsCollection = db.collection("products");
  categoriesCollection = db.collection("categories");
  productsCollection.createIndex({ category: 1 });
  categoriesCollection.createIndex({ name: 1 }, { unique: true });

  const count = await categoriesCollection.countDocuments();
  if (count === 0) {
    const initialCategories = [
        { name: "الشرقي", emoji: "🍯", subCategories: ["صنف فرعي 1", "صنف فرعي 2"] },
        { name: "الغربي", emoji: "🍰", subCategories: ["كيكات", "تورتات مقصوصة", "جاتوه"] },
        { name: "عبمبر", emoji: "💖", subCategories: [] },
        { name: "تورتات", emoji: "🎂", subCategories: ["تورتة زمنية", "تورتات الشنتى", "تورتات درجة اولى", "مناسبات", "عيد ميلاد"] },
        { name: "عصائر", emoji: "🥤", subCategories: ["طبيعي", "غازي"] },
        { name: "نواشف", emoji: "🥐", subCategories: ["معجنات", "مالح", "حلو"] },
        { name: "لوزيات", emoji: "", subCategories: ["شكلاطة"] },
        { name: "خدمات", emoji: "🛎️", subCategories: [] },
    ];
    await categoriesCollection.insertMany(initialCategories);
  }

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
            subCategory: 1,
            available: 1,
          },
        })
        .toArray();
      res.json(products);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch products" });
    }
  });

  app.post("/api/products", checkAdmin, upload.single('img'), async (req, res) => {
    const { name, desc, price_regular, price_bulk, category, subCategory, price, available } = req.body;
    const img = req.file ? `/uploads/${req.file.filename}` : null;
    
    if (
      !name ||
      !category ||
      !img ||
      (price_regular === undefined && price === undefined)
    ) {
      if(img) fs.unlinkSync(path.join(__dirname, img)); // Clean up uploaded file
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
      subCategory,
      available: available === "false" ? false : true
    });
    res.json({ success: true });
  });

  app.put("/api/products/:id", checkAdmin, upload.single('img'), async (req, res) => {
    const { name, desc, price_regular, price_bulk, category, subCategory, price, available, existingImg } = req.body;
    
    let img = req.file ? `/uploads/${req.file.filename}` : existingImg;

    if (
      !name ||
      !category ||
      !img ||
      (price_regular === undefined && price === undefined)
    ) {
      if(req.file) fs.unlinkSync(path.join(__dirname, img)); // Clean up uploaded file
      return res.status(400).json({ error: "Missing required fields" });
    }

    // If a new image is uploaded and it's different from the old one, delete the old one.
    if (req.file && existingImg && img !== existingImg) {
        const oldImgPath = path.join(__dirname, existingImg);
        if (fs.existsSync(oldImgPath)) {
            fs.unlinkSync(oldImgPath);
        }
    }

    await productsCollection.updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { name, desc, price_regular, price_bulk, price, img, category, subCategory, available: available === "false" ? false : true } }
    );
    res.json({ success: true });
  });

  app.delete("/api/products/:id", checkAdmin, async (req, res) => {
    try {
      const product = await productsCollection.findOne({ _id: new ObjectId(req.params.id) });
      if (product && product.img) {
        const imgPath = path.join(__dirname, product.img);
        if (fs.existsSync(imgPath)) {
          fs.unlinkSync(imgPath);
        }
      }
      await productsCollection.deleteOne({ _id: new ObjectId(req.params.id) });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to delete product" });
    }
  });

  // Category Management API
  app.get("/api/categories", async (req, res) => {
    try {
      const categories = await categoriesCollection.find({}).toArray();
      res.json(categories);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch categories" });
    }
  });

  app.post("/api/categories", checkAdmin, async (req, res) => {
    try {
      const { name, emoji, subCategories } = req.body;
      if (!name || !emoji) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      const result = await categoriesCollection.insertOne({ name, emoji, subCategories: subCategories || [] });
      res.status(201).json(result);
    } catch (err) {
      res.status(500).json({ error: "Failed to create category" });
    }
  });

  app.put("/api/categories/:id", checkAdmin, async (req, res) => {
    try {
      const { name, emoji, subCategories } = req.body;
      if (!name || !emoji) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      await categoriesCollection.updateOne(
        { _id: new ObjectId(req.params.id) },
        { $set: { name, emoji, subCategories: subCategories || [] } }
      );
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to update category" });
    }
  });

  app.delete("/api/categories/:id", checkAdmin, async (req, res) => {
    try {
      await categoriesCollection.deleteOne({ _id: new ObjectId(req.params.id) });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to delete category" });
    }
  });

  // Global error handler for deployment
  app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  });
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
});
