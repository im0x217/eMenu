const express = require('express');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const { MongoClient } = require('mongodb');
const app = express();
const PORT = process.env.PORT || 3000;

const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || '1234';
const MONGO_URI = process.env.MONGO_URI; // Set this in Render Environment

// MongoDB setup
let db, productsCollection;
MongoClient.connect(MONGO_URI, { useUnifiedTopology: true })
  .then(client => {
    db = client.db('emenu');
    productsCollection = db.collection('products');
    app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error('Failed to connect to MongoDB', err);
    process.exit(1);
  });

// Security and middleware
app.use(
  helmet({
    contentSecurityPolicy: false
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());
app.use(express.static(__dirname));

// Remove CSP header if set by any middleware
app.use((req, res, next) => {
  res.removeHeader('Content-Security-Policy');
  next();
});

// Login endpoint
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (username === ADMIN_USER && password === ADMIN_PASS) {
    res.cookie('admin', 'true', { httpOnly: true });
    return res.json({ success: true });
  }
  res.status(401).json({ success: false, message: 'Unauthorized' });
});

// Middleware to check admin cookie
const checkAdmin = (req, res, next) => {
  if (req.cookies.admin === 'true') {
    return next();
  }
  res.status(403).json({ success: false, message: 'Forbidden' });
};

// GET products
app.get('/api/products', async (req, res) => {
  try {
    const docs = await productsCollection.findOne({ _id: 'menu' });
    if (docs) {
      res.json(docs.products);
    } else {
      // If not found, return empty structure
      res.json({
        "الشرقي": [],
        "الغربي": [],
        "تورتات": [],
        "عصائر": [],
        "شكلاطة": []
      });
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// POST products
app.post('/api/products', checkAdmin, async (req, res) => {
  try {
    await productsCollection.updateOne(
      { _id: 'menu' },
      { $set: { products: req.body } },
      { upsert: true }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save' });
  }
});