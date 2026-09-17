const express = require('express');

module.exports = function createProductsRouter(context) {
  const router = express.Router();
  const { ObjectId } = require('mongodb');
  const { 
    checkMongoDB, checkAdmin, upload, uploadErrorHandler, 
    parsePrice, getDisplayImage, deleteProductImageFromS3, attachS3Images
  } = context;

router.get("/api/products", checkMongoDB, async (req, res) => {
  try {
    const { category, id } = req.query;
    let query = {};

    if (id) {
      if (!ObjectId.isValid(id)) {
        return res.status(400).json({ error: "Invalid product ID" });
      }
      query = { _id: new ObjectId(id) };
    } else if (category) {
      if (typeof category !== 'string') {
        return res.status(400).json({ error: "Invalid category format" });
      }
      query = { category };
    }
    
    const isStaff = isStaffSession(req);
    const products = await context.productsCollection
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
          cloudinary_public_id: 1,
          allowFloat: 1,
          purchaseType: 1,
          tags: 1,
          ...(isStaff ? { makingCost: 1, chefId: 1, chefName: 1 } : {})
        },
      })
      .sort({ name: 1 })
      .toArray();
    
    // Handle missing images - S3 images are public and directly accessible
    const productsWithUrls = await Promise.all(products.map(async (product) => {
      const imageData = getDisplayImage(product);
      
      // If it's S3, the URL is directly accessible (public-read ACL)
      if (product.img && product.img.includes('amazonaws.com')) {
        console.log("[S3 IMAGE] Using direct URL for:", product.name);
        imageData.imgSigned = product.img;  // No signing needed, images are public
      }
      
      return { ...product, ...imageData };
    }));
    
    res.json(productsWithUrls);
  } catch (err) {
    console.error("Error fetching products:", err);
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

router.post("/api/verify-bulk-code", (req, res) => {
  const { code } = req.body;
  const BULK_CODE = process.env.BULK_CODE || "1234";
  if (code === BULK_CODE) {
    res.json({ success: true });
  } else {
    res.status(401).json({ error: "Invalid code" });
  }
});

router.post("/api/products", checkAdmin, upload.single('img'), uploadErrorHandler, async (req, res) => {
  const { name, desc, price_regular, price_bulk, makingCost, category, subCategory, price, available, allowFloat, purchaseType, tags, chefId, chefName } = req.body;
  
  let parsedTags = [];
  try {
    if (tags) parsedTags = JSON.parse(tags);
  } catch (e) {
    console.error("Failed to parse tags:", tags);
  }
  
  // Check for file validation errors first
  if (req.fileValidationError) {
    return res.status(400).json({ error: `Image upload failed: ${req.fileValidationError}`, warning: "Product will use placeholder image." });
  }
  
  // Always compute stable public URL using bucket + region + key, prefer CloudFront if configured
  const cloudfrontDomain = process.env.AWS_CLOUDFRONT_DOMAIN;
  let img = "/res/logo.jpg"; // Default placeholder
  let uploadWarning = null;
  
  if (req.file) {
    const s3Url = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${req.file.key}`;
    img = cloudfrontDomain ? `https://${cloudfrontDomain}/${req.file.key}` : s3Url;
    console.log("[UPLOAD SUCCESS] POST /api/products - File uploaded:", req.file.key);
  } else {
    uploadWarning = "Image upload failed - using placeholder. Check S3 configuration or file size/type.";
    console.log("[UPLOAD WARNING] POST /api/products - No file received, using placeholder");
  }
  
  console.log("[UPLOAD DEBUG] POST /api/products");
  console.log("  File received:", req.file ? "Yes" : "No");
  console.log("  Form data:", { name, category, price_regular, price_bulk });
  
  const isFloat = allowFloat === 'true';
  const parsedPriceRegular = parsePrice(price_regular, isFloat);
  const parsedPriceBulk = parsePrice(price_bulk, isFloat);
  const parsedPrice = parsePrice(price, isFloat);
  const parsedMakingCost = Number(makingCost) || 0;

  const hasSomePrice = parsedPriceRegular !== null || parsedPrice !== null || (purchaseType === 'bulk' && parsedPriceBulk !== null);
  if (
    !name ||
    !category ||
    !hasSomePrice
  ) {
    console.log("[UPLOAD ERROR] Missing required fields - name:", name, "category:", category);
    return res.status(400).json({ error: "Missing required fields (name, category, or price)." });
  }
  try {
    await context.productsCollection.insertOne({
      name,
      desc,
      price_regular: parsedPriceRegular,
      price_bulk: parsedPriceBulk,
      price: parsedPrice,
      makingCost: parsedMakingCost,
      img,
      category,
      subCategory,
      available: available === "false" ? false : true,
      allowFloat: isFloat,
      purchaseType: purchaseType || 'both',
      tags: parsedTags,
      chefId: chefId || '',
      chefName: chefName || ''
    });
    console.log("[UPLOAD SUCCESS] Product saved with image:", img);
    res.json({ success: true });
  } catch (err) {
    console.error("[UPLOAD ERROR] Database error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

router.put("/api/products/:id", checkAdmin, upload.single('img'), uploadErrorHandler, async (req, res) => {
  const { name, desc, price_regular, price_bulk, makingCost, category, subCategory, price, available, allowFloat, purchaseType, existingImg, tags, chefId, chefName } = req.body;
  const isFloat = allowFloat === 'true';
  const parsedPriceRegular = parsePrice(price_regular, isFloat);
  const parsedPriceBulk = parsePrice(price_bulk, isFloat);
  const parsedPrice = parsePrice(price, isFloat);
  const parsedMakingCost = Number(makingCost) || 0;
  
  let parsedTags = [];
  try {
    if (tags) parsedTags = JSON.parse(tags);
  } catch (e) {
    console.error("Failed to parse tags:", tags);
  }
  
  let updateData = {
      name,
      desc,
      price_regular: parsedPriceRegular,
      price_bulk: parsedPriceBulk,
      price: parsedPrice,
      makingCost: parsedMakingCost,
      category,
      subCategory,
      available: available === "false" ? false : true,
      allowFloat: isFloat,
      purchaseType: purchaseType || 'both',
      tags: parsedTags,
      chefId: chefId || '',
      chefName: chefName || ''
  };

  let uploadWarning = null;
  
  if (req.file) {
      // Compute deterministic public URL for updated image, prefer CloudFront if configured
      const cloudfrontDomain = process.env.AWS_CLOUDFRONT_DOMAIN;
      const s3Url = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${req.file.key}`;
      updateData.img = cloudfrontDomain ? `https://${cloudfrontDomain}/${req.file.key}` : s3Url;
    } else {
      // Use existing image, or placeholder if null/invalid
      if (existingImg && existingImg !== 'null' && existingImg !== 'undefined') {
        updateData.img = existingImg;
      } else {
        updateData.img = "/res/logo.jpg";
        uploadWarning = "No valid image found - using placeholder.";
      }
  }

  const hasSomePrice = updateData.price_regular !== null || updateData.price !== null || (updateData.purchaseType === 'bulk' && updateData.price_bulk !== null);
  if (
    !updateData.name ||
    !updateData.category ||
    !hasSomePrice
  ) {
    return res.status(400).json({ error: "Missing required fields (name, category, or price)" });
  }
  if (!ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ error: "Invalid product ID" });
  }

  try {
    await context.productsCollection.updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: updateData }
    );
    const response = { success: true };
    if (uploadWarning) {
      response.warning = uploadWarning;
    }
    res.json(response);
  } catch (err) {
    console.error("Error updating product:", err);
    res.status(500).json({ error: "Failed to update product" });
  }
});

router.patch("/api/products/:id/availability", checkAdmin, async (req, res) => {
  const { available } = req.body;
  if (typeof available !== 'boolean') {
      return res.status(400).json({ error: "Invalid available status" });
  }
  if (!ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ error: "Invalid product ID" });
  }
  try {
      await context.productsCollection.updateOne(
          { _id: new ObjectId(req.params.id) },
          { $set: { available: available } }
      );
      res.json({ success: true });
  } catch (err) {
      console.error("Error updating availability:", err);
      res.status(500).json({ error: "Failed to update availability" });
  }
});

router.delete("/api/products/:id", checkAdmin, async (req, res) => {
  try {
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: "Invalid product ID" });
    }
    const product = await context.productsCollection.findOne({ _id: new ObjectId(req.params.id) });
    if (product) {
      await deleteProductImageFromS3(product);
    }
    await context.productsCollection.deleteOne({ _id: new ObjectId(req.params.id) });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete product" });
  }
});

// ============ CATEGORIES API ============
router.get("/api/categories", checkMongoDB, async (req, res) => {
  console.log("[ROUTE] GET /api/categories called");
  try {
    const categories = await context.categoriesCollection.find({}).toArray();
    res.json(categories);
  } catch (err) {
    console.error("Error fetching categories:", err);
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

router.post("/api/categories", checkAdmin, async (req, res) => {
  try {
    const { name, icon, emoji, subCategories } = req.body;
    if (!name) {
      return res.status(400).json({ error: "Missing required category name" });
    }
    const result = await context.categoriesCollection.insertOne({ 
      name, 
      icon: icon || '', 
      emoji: emoji || '', 
      subCategories: subCategories || [] 
    });
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ error: "Failed to create category" });
  }
});

router.put("/api/categories/:id", checkAdmin, async (req, res) => {
  try {
    const { name, icon, emoji, subCategories } = req.body;
    if (!name) {
      return res.status(400).json({ error: "Missing required category name" });
    }
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: "Invalid category ID" });
    }
    await context.categoriesCollection.updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { name, icon: icon || '', emoji: emoji || '', subCategories: subCategories || [] } }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to update category" });
  }
});

router.delete("/api/categories/:id", checkAdmin, async (req, res) => {
  try {
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: "Invalid category ID" });
    }
    await context.categoriesCollection.deleteOne({ _id: new ObjectId(req.params.id) });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete category" });
  }
});

// ============ TAGS API ============
router.get("/api/tags", checkMongoDB, async (req, res) => {
  try {
    const tags = await context.tagsCollection.find({}).toArray();
    res.json(tags);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch tags" });
  }
});

router.post("/api/tags", checkMongoDB, checkAdmin, async (req, res) => {
  try {
    const { name, color, icon } = req.body;
    if (!name) return res.status(400).json({ error: "Name is required" });
    const result = await context.tagsCollection.insertOne({ 
      name, 
      color: color || 'default', 
      icon: icon || 'heart' 
    });
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ error: "Failed to create tag" });
  }
});

router.put("/api/tags/:id", checkMongoDB, checkAdmin, async (req, res) => {
  try {
    const { name, color, icon } = req.body;
    if (!name) return res.status(400).json({ error: "Name is required" });
    if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ error: "Invalid ID" });
    await context.tagsCollection.updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { name, color: color || 'default', icon: icon || 'heart' } }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to update tag" });
  }
});

router.delete("/api/tags/:id", checkMongoDB, checkAdmin, async (req, res) => {
  try {
    if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ error: "Invalid ID" });
    await context.tagsCollection.deleteOne({ _id: new ObjectId(req.params.id) });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete tag" });
  }
});

// ============ SHOP2 API ROUTES ============
router.get("/api/shop2/categories", checkMongoDB, async (req, res) => {
  try {
    const cats = await context.categoriesCollection2.find({}).toArray();
    res.json(cats);
  } catch (err) {
    console.error("Error fetching shop2 categories:", err);
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

router.post("/api/shop2/categories", checkMongoDB, checkAdmin, async (req, res) => {
  try {
    const { name, emoji, subCategories } = req.body;
    if (!name || !emoji) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    const result = await context.categoriesCollection2.insertOne({ name, emoji, subCategories: subCategories || [] });
    res.status(201).json(result);
  } catch (err) {
    console.error("Error creating shop2 category:", err);
    res.status(500).json({ error: "Failed to create category" });
  }
});

router.put("/api/shop2/categories/:id", checkMongoDB, checkAdmin, async (req, res) => {
  try {
    const { name, emoji, subCategories } = req.body;
    if (!name || !emoji) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: "Invalid category ID" });
    }
    await context.categoriesCollection2.updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { name, emoji, subCategories: subCategories || [] } }
    );
    res.json({ success: true });
  } catch (err) {
    console.error("Error updating shop2 category:", err);
    res.status(500).json({ error: "Failed to update category" });
  }
});

router.delete("/api/shop2/categories/:id", checkMongoDB, checkAdmin, async (req, res) => {
  try {
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: "Invalid category ID" });
    }
    await context.categoriesCollection2.deleteOne({ _id: new ObjectId(req.params.id) });
    res.json({ success: true });
  } catch (err) {
    console.error("Error deleting shop2 category:", err);
    res.status(500).json({ error: "Failed to delete category" });
  }
});

router.get("/api/shop2/tags", checkMongoDB, async (req, res) => {
  try {
    const tags = await context.tagsCollection2.find({}).toArray();
    res.json(tags);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch tags" });
  }
});

router.post("/api/shop2/tags", checkMongoDB, checkAdmin, async (req, res) => {
  try {
    const { name, color, icon } = req.body;
    if (!name) return res.status(400).json({ error: "Name is required" });
    const result = await context.tagsCollection2.insertOne({ 
      name, 
      color: color || 'default', 
      icon: icon || 'heart' 
    });
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ error: "Failed to create tag" });
  }
});

router.put("/api/shop2/tags/:id", checkMongoDB, checkAdmin, async (req, res) => {
  try {
    const { name, color, icon } = req.body;
    if (!name) return res.status(400).json({ error: "Name is required" });
    if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ error: "Invalid ID" });
    await context.tagsCollection2.updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { name, color: color || 'default', icon: icon || 'heart' } }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to update tag" });
  }
});

router.delete("/api/shop2/tags/:id", checkMongoDB, checkAdmin, async (req, res) => {
  try {
    if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ error: "Invalid ID" });
    await context.tagsCollection2.deleteOne({ _id: new ObjectId(req.params.id) });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete tag" });
  }
});

router.get("/api/shop2/products", checkMongoDB, async (req, res) => {
  try {
    const { category, bulkSearch } = req.query;
    let query = {};
    if (bulkSearch) {
      query = { isBulk: true };
    } else if (category) {
      if (typeof category !== 'string') {
        return res.status(400).json({ error: "Invalid category format" });
      }
      query = { category };
    }
    
    const isStaff = isStaffSession(req);
    const products = await context.productsCollection2
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
          cloudinary_public_id: 1,
          allowFloat: 1,
          purchaseType: 1,
          tags: 1,
          ...(isStaff ? { makingCost: 1, chefId: 1, chefName: 1 } : {})
        },
      })
      .sort({ name: 1 })
      .toArray();
    
    // Handle missing images - S3 images are public and directly accessible
    const productsWithUrls = await Promise.all(products.map(async (product) => {
      const imageData = getDisplayImage(product);
      
      // If it's S3, the URL is directly accessible (public-read ACL)
      if (product.img && product.img.includes('amazonaws.com')) {
        console.log("[S3 IMAGE] Using direct URL for:", product.name);
        imageData.imgSigned = product.img;  // No signing needed, images are public
      }
      
      return { ...product, ...imageData };
    }));
    
    res.json(productsWithUrls);
  } catch (err) {
    console.error("Error fetching shop2 products:", err);
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

router.post("/api/shop2/products", checkMongoDB, checkAdmin, upload.single('img'), uploadErrorHandler, async (req, res) => {
  const { name, desc, price_regular, price_bulk, makingCost, category, subCategory, price, available, allowFloat, purchaseType, tags, chefId, chefName } = req.body;
  
  let parsedTags = [];
  try {
    if (tags) parsedTags = JSON.parse(tags);
  } catch (e) {
    console.error("Failed to parse tags:", tags);
  }
  
  // Check for file validation errors first
  if (req.fileValidationError) {
    return res.status(400).json({ error: `Image upload failed: ${req.fileValidationError}`, warning: "Product will use placeholder image." });
  }
  
  // Prefer CloudFront domain for image delivery if configured
  const cloudfrontDomain = process.env.AWS_CLOUDFRONT_DOMAIN;
  let img = "/res/logo.jpg"; // Default placeholder
  let uploadWarning = null;
  
  if (req.file) {
    const s3Url = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${req.file.key}`;
    img = cloudfrontDomain ? `https://${cloudfrontDomain}/${req.file.key}` : s3Url;
  } else {
    uploadWarning = "Image upload failed - using placeholder. Check S3 configuration or file size/type.";
  }
  
  const isFloat = allowFloat === 'true';
  const parsedPriceRegular = parsePrice(price_regular, isFloat);
  const parsedPriceBulk = parsePrice(price_bulk, isFloat);
  const parsedPrice = parsePrice(price, isFloat);
  const parsedMakingCost = Number(makingCost) || 0;

  const hasSomePrice = parsedPriceRegular !== null || parsedPrice !== null || (purchaseType === 'bulk' && parsedPriceBulk !== null);
  if (
    !name ||
    !category ||
    !hasSomePrice
  ) {
    return res.status(400).json({ error: "Missing required fields (name, category, or price)." });
  }
  try {
    await context.productsCollection2.insertOne({
      name,
      desc,
      price_regular: parsedPriceRegular,
      price_bulk: parsedPriceBulk,
      price: parsedPrice,
      makingCost: parsedMakingCost,
      img,
      category,
      subCategory,
      available: available !== "false",
      allowFloat: isFloat,
      purchaseType: purchaseType || "both",
      tags: parsedTags,
      chefId: chefId || '',
      chefName: chefName || ''
    });
    console.log("[UPLOAD SUCCESS] Shop2 product saved with image:", img);
    const response = { success: true };
    if (uploadWarning) {
      response.warning = uploadWarning;
    }
    res.json(response);
  } catch (err) {
    console.error("[UPLOAD ERROR] Shop2 database error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

router.put("/api/shop2/products/:id", checkMongoDB, checkAdmin, upload.single('img'), uploadErrorHandler, async (req, res) => {
  try {
    const { name, desc, price_regular, price_bulk, makingCost, category, subCategory, price, available, allowFloat, purchaseType, existingImg, tags, chefId, chefName } = req.body;
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: "Invalid product ID" });
    }
    const product = await context.productsCollection2.findOne({ _id: new ObjectId(req.params.id) });
    if (!product) return res.status(404).json({ error: "Product not found" });

    let parsedTags = [];
    try {
      if (tags) parsedTags = JSON.parse(tags);
    } catch (e) {
      console.error("Failed to parse tags:", tags);
    }

    // Prefer CloudFront domain for image delivery if configured
    const cloudfrontDomain = process.env.AWS_CLOUDFRONT_DOMAIN;
    let img;
    let uploadWarning = null;
    
    if (req.file) {
      const s3Url = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${req.file.key}`;
      img = cloudfrontDomain ? `https://${cloudfrontDomain}/${req.file.key}` : s3Url;
    } else {
      // Use existing image from request or product, or placeholder if null/invalid
      const existingImage = existingImg || product.img;
      if (existingImage && existingImage !== 'null' && existingImage !== 'undefined') {
        img = existingImage;
      } else {
        img = "/res/logo.jpg";
        uploadWarning = "No valid image found - using placeholder.";
      }
    }

    const isFloat = allowFloat === "true";
    const parsedPriceRegular = parsePrice(price_regular, isFloat);
    const parsedPriceBulk = parsePrice(price_bulk, isFloat);
    const parsedPrice = parsePrice(price, isFloat);
    const parsedMakingCost = Number(makingCost) || 0;

    await context.productsCollection2.updateOne(
      { _id: new ObjectId(req.params.id) },
      {
        $set: {
          name,
          desc,
          price_regular: parsedPriceRegular,
          price_bulk: parsedPriceBulk,
          price: parsedPrice,
          makingCost: parsedMakingCost,
          img,
          category,
          subCategory,
          available: available !== "false",
          allowFloat: isFloat,
          purchaseType: purchaseType || "both",
          tags: parsedTags,
          chefId: chefId || '',
          chefName: chefName || '',
        },
      }
    );
    const response = { success: true };
    if (uploadWarning) {
      response.warning = uploadWarning;
    }
    res.json(response);
  } catch (err) {
    res.status(500).json({ error: "Failed to update product" });
  }
});

router.delete("/api/shop2/products/:id", checkMongoDB, checkAdmin, async (req, res) => {
  try {
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: "Invalid product ID" });
    }
    const product = await context.productsCollection2.findOne({ _id: new ObjectId(req.params.id) });
    if (product) {
      await deleteProductImageFromS3(product);
    }
    await context.productsCollection2.deleteOne({ _id: new ObjectId(req.params.id) });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete product" });
  }
});

router.patch("/api/shop2/products/:id/availability", checkMongoDB, checkAdmin, async (req, res) => {
  const { available } = req.body;
  if (typeof available !== 'boolean') {
      return res.status(400).json({ error: "Invalid available status" });
  }
  if (!ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ error: "Invalid product ID" });
  }
  try {
      await context.productsCollection2.updateOne(
          { _id: new ObjectId(req.params.id) },
          { $set: { available: available } }
      );
      res.json({ success: true });
  } catch (err) {
      console.error("Error updating shop2 availability:", err);
      res.status(500).json({ error: "Failed to update availability" });
  }
});

// ============ SHOP2 ADMIN ROUTES ============

  return router;
};
