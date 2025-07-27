const express = require('express');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const { MongoClient, ObjectId } = require('mongodb');
const app = express();
const PORT = process.env.PORT || 3000;

const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || '1234';
const MONGO_URI = process.env.MONGO_URI;

// Security and middleware
app.use(
  helmet({
    contentSecurityPolicy: false
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());
app.use(express.static(__dirname));

let db, productsCollection;
MongoClient.connect(MONGO_URI)
  .then(client => {
    db = client.db('emenu');
    productsCollection = db.collection('products');

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

    // GET all products (optionally by category)
    app.get('/api/products', async (req, res) => {
      try {
        const category = req.query.category;
        const query = category ? { category } : {};
        const products = await productsCollection.find(query).toArray();
        res.json(products);
      } catch (err) {
        res.status(500).json({ error: 'Failed to fetch products' });
      }
    });

    // POST new product
    app.post('/api/products', checkAdmin, async (req, res) => {
      try {
        const { name, desc, price, img, category } = req.body;
        if (!name || !category || !img) {
          return res.status(400).json({ error: 'Missing required fields' });
        }
        const result = await productsCollection.insertOne({ name, desc, price, img, category });
        res.json({ success: true, id: result.insertedId });
      } catch (err) {
        res.status(500).json({ error: 'Failed to add product' });
      }
    });

    // PUT (edit) a product
    app.put('/api/products/:id', checkAdmin, async (req, res) => {
      try {
        const { name, desc, price, img, category } = req.body;
        if (!name || !category || !img) {
          return res.status(400).json({ error: 'Missing required fields' });
        }
        await productsCollection.updateOne(
          { _id: new ObjectId(req.params.id) },
          { $set: { name, desc, price, img, category } }
        );
        res.json({ success: true });
      } catch (err) {
        res.status(500).json({ error: 'Failed to update product' });
      }
    });

    // DELETE a product
    app.delete('/api/products/:id', checkAdmin, async (req, res) => {
      try {
        await productsCollection.deleteOne({ _id: new ObjectId(req.params.id) });
        res.json({ success: true });
      } catch (err) {
        res.status(500).json({ error: 'Failed to delete product' });
      }
    });

    app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error('Failed to connect to MongoDB', err);
    process.exit(1);
  });