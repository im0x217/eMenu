const express = require('express');

module.exports = function createMarketingRouter(context) {
  const router = express.Router();
  const { ObjectId } = require('mongodb');
  const { 
    checkMongoDB, checkAdmin, upload, uploadErrorHandler, deleteProductImageFromS3, attachS3Images
  } = context;

router.get("/api/marketing-carousel", checkMongoDB, async (req, res) => {
  const shop = req.query.shop === "shop2" ? "shop2" : "shop1";
  try {
    const items = await context.carouselCollection.find({ shop }).sort({ createdAt: -1 }).toArray();
    res.json(items);
  } catch (err) {
    console.error("Get carousel error:", err);
    res.status(500).json({ error: "Failed to fetch marketing carousel" });
  }
});

// Get carousel items (Admin)
router.get("/api/admin/marketing-carousel", checkMongoDB, checkAdmin, async (req, res) => {
  const shop = req.query.shop === "shop2" ? "shop2" : "shop1";
  try {
    const items = await context.carouselCollection.find({ shop }).sort({ createdAt: -1 }).toArray();
    res.json(items);
  } catch (err) {
    console.error("Get admin carousel error:", err);
    res.status(500).json({ error: "Failed to fetch carousel items" });
  }
});

// Add carousel item (Admin)
router.post("/api/admin/marketing-carousel", checkMongoDB, checkAdmin, upload.single('img'), uploadErrorHandler, async (req, res) => {
  const { shop, title, subtitle, link } = req.body;
  if (!shop) {
    return res.status(400).json({ error: "Missing required shop field" });
  }
  
  if (req.fileValidationError) {
    return res.status(400).json({ error: `Image upload failed: ${req.fileValidationError}` });
  }
  
  const cloudfrontDomain = process.env.AWS_CLOUDFRONT_DOMAIN;
  let img = "/res/logo.jpg";
  if (req.file) {
    const s3Url = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${req.file.key}`;
    img = cloudfrontDomain ? `https://${cloudfrontDomain}/${req.file.key}` : s3Url;
  }
  
  try {
    const newItem = {
      shop: shop === "shop2" ? "shop2" : "shop1",
      title: title || "",
      subtitle: subtitle || "",
      link: link || "",
      image: img,
      createdAt: new Date()
    };
    const result = await context.carouselCollection.insertOne(newItem);
    res.json({ success: true, item: { ...newItem, _id: result.insertedId } });
  } catch (err) {
    console.error("Add carousel item error:", err);
    res.status(500).json({ error: "Failed to create carousel item" });
  }
});

// Update carousel item (Admin)
router.put("/api/admin/marketing-carousel/:id", checkMongoDB, checkAdmin, upload.single('img'), uploadErrorHandler, async (req, res) => {
  const { id } = req.params;
  const { title, subtitle, link } = req.body;
  
  if (req.fileValidationError) {
    return res.status(400).json({ error: `Image upload failed: ${req.fileValidationError}` });
  }

  try {
    const item = await context.carouselCollection.findOne({ _id: new ObjectId(id) });
    if (!item) {
      return res.status(404).json({ error: "Carousel item not found" });
    }

    const updateFields = {
      title: title || "",
      subtitle: subtitle || "",
      link: link || "",
    };

    if (req.file) {
      const cloudfrontDomain = process.env.AWS_CLOUDFRONT_DOMAIN;
      const s3Url = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${req.file.key}`;
      updateFields.image = cloudfrontDomain ? `https://${cloudfrontDomain}/${req.file.key}` : s3Url;
    }

    await context.carouselCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateFields }
    );

    res.json({ success: true, item: { ...item, ...updateFields } });
  } catch (err) {
    console.error("Update carousel item error:", err);
    res.status(500).json({ error: "Failed to update carousel item" });
  }
});


// Delete carousel item (Admin)
router.delete("/api/admin/marketing-carousel/:id", checkMongoDB, checkAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await context.carouselCollection.deleteOne({ _id: new ObjectId(id) });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Item not found" });
    }
    res.json({ success: true });
  } catch (err) {
    console.error("Delete carousel item error:", err);
    res.status(500).json({ error: "Failed to delete carousel item" });
  }
});

// ============ ERROR HANDLER ============
router.use((err, req, res, next) => {
  console.error("Server error:", err);
  res.status(500).json({ error: "Internal server error" });
});

// ============ CHEF MANAGEMENT & PRODUCTION REPORT ============

// Get all chefs for active shop

  return router;
};
