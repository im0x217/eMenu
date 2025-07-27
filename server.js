const express = require('express');
const fs = require('fs');
const path = require('path');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const app = express();
const PORT = process.env.PORT || 3000;

const DATA_FILE = path.join(__dirname, 'products.json');
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || '1234';

// Explicitly disable Helmet's CSP
app.use(
    helmet({
        contentSecurityPolicy: false
    })
);
app.use(express.json({ limit: '10mb' })); // Increase limit for image data URLs
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
app.get('/api/products', (req, res) => {
    fs.readFile(DATA_FILE, 'utf8', (err, data) => {
        if (err) {
            // If file doesn't exist, return empty structure
            return res.json({
                "الشرقي": [],
                "الغربي": [],
                "تورتات": [],
                "عصائر": [],
                "شكلاطة": []
            });
        }
        res.json(JSON.parse(data));
    });
});

// POST products
app.post('/api/products', checkAdmin, (req, res) => {
    fs.writeFile(DATA_FILE, JSON.stringify(req.body, null, 2), err => {
        if (err) return res.status(500).json({ error: 'Failed to save' });
        res.json({ success: true });
    });
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});