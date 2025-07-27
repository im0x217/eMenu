// ... existing imports and setup ...

// POST products (optimized for upsert performance)
app.post("/api/products", checkAdmin, async (req, res) => {
  try {
    // Only update if the incoming object is not empty and has at least one non-empty category
    const incoming = req.body;
    if (
      !incoming ||
      typeof incoming !== "object" ||
      !Object.keys(incoming).length ||
      !Object.values(incoming).some((arr) => Array.isArray(arr) && arr.length)
    ) {
      return res
        .status(400)
        .json({ error: "Empty products object. Save aborted." });
    }

    // Use $set for upsert, which is generally fast for single document
    await productsCollection.updateOne(
      { _id: "menu" },
      { $set: { products: incoming } },
      { upsert: true }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to save" });
  }
});
