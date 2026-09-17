const express = require('express');

module.exports = function createOrdersRouter(context) {
  const router = express.Router();
  const { ObjectId } = require('mongodb');
  const { 
    checkMongoDB, checkAdmin, checkCustomerAuth, customerLimiter, 
    getNextOrderNumber, findCustomerByPhone, MONGO_URI,
    getOrderEffectiveDateStr, generateCustomerToken
  } = context;

router.get("/api/admin/orders", checkMongoDB, checkAdmin, async (req, res) => {
  const shop = req.query.shop === "shop2" ? "shop2" : "shop1";
  const status = req.query.status;
  const ordColl = shop === "shop2" ? ordersCollection2 : ordersCollection;

  try {
    const query = {};
    if (status) {
      query.status = status;
    }
    const limitParam = req.query.limit;
    const limit = limitParam ? Math.min(Number(limitParam) || 1000, 5000) : 1000;
    const orders = await ordColl.find(query).sort({ createdAt: -1 }).limit(limit).toArray();
    res.json(orders);
  } catch (err) {
    console.error("Fetch admin orders error:", err);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

// Update order status
router.put("/api/admin/orders/:id/status", checkMongoDB, checkAdmin, async (req, res) => {
  const shop = req.query.shop === "shop2" ? "shop2" : "shop1";
  const ordColl = shop === "shop2" ? ordersCollection2 : ordersCollection;
  const { id } = req.params;
  const { status } = req.body;

  if (!["pending", "ready", "received", "cancelled"].includes(status)) {
    return res.status(400).json({ error: "Invalid status value" });
  }

  try {
    const updateOps = {
      $set: { status, updatedAt: new Date() }
    };
    if (status === 'cancelled') {
      updateOps.$set.cancelledAt = new Date();
    } else {
      updateOps.$unset = { cancelledAt: "" };
    }

    const result = await ordColl.updateOne(
      { _id: new ObjectId(id) },
      updateOps
    );
    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "Order not found" });
    }
    res.json({ 
      success: true, 
      status, 
      cancelledAt: status === 'cancelled' ? updateOps.$set.cancelledAt : null 
    });
  } catch (err) {
    console.error("Update order status error:", err);
    res.status(500).json({ error: "Failed to update order status" });
  }
});

// Full order edit
router.put("/api/admin/orders/:id", checkMongoDB, checkAdmin, async (req, res) => {
  const shop = req.query.shop === "shop2" ? "shop2" : "shop1";
  const ordColl = shop === "shop2" ? ordersCollection2 : ordersCollection;
  const { id } = req.params;

  if (!ObjectId.isValid(id)) {
    return res.status(400).json({ error: "Invalid order ID" });
  }

  try {
    const { customerInfo, items, totalPrice, deliveryDate, notes, priceMode, status } = req.body;

    const updateDoc = {};
    if (customerInfo) {
      updateDoc.customerInfo = {
        name: (customerInfo.name || '').trim(),
        phone: (customerInfo.phone || '').trim()
      };
    }
    if (items && Array.isArray(items)) {
      updateDoc.items = items.map(item => ({
        productId: item.productId && ObjectId.isValid(item.productId) ? new ObjectId(item.productId) : item.productId,
        name: item.name || '',
        price: Number(item.price) || 0,
        quantity: Number(item.quantity) || 1,
        allowFloat: !!item.allowFloat,
        notes: item.notes || ''
      }));
      // Recalculate total price directly from items to guarantee mathematical correctness
      const calculatedTotal = updateDoc.items.reduce((sum, i) => sum + (i.price * i.quantity), 0);
      updateDoc.totalPrice = Math.round(calculatedTotal * 100) / 100;
    } else if (totalPrice !== undefined) {
      updateDoc.totalPrice = Math.round(Number(totalPrice) * 100) / 100;
    }

    if (updateDoc.totalPrice !== undefined) {
      const existingOrder = await ordColl.findOne({ _id: new ObjectId(id) });
      if (existingOrder) {
        const paid = existingOrder.paidAmount || 0;
        if (paid >= updateDoc.totalPrice) {
          updateDoc.paymentStatus = 'paid';
          updateDoc.paidAmount = updateDoc.totalPrice; // Cap overpayment to match new total price
        } else if (paid > 0) {
          updateDoc.paymentStatus = 'partial';
        } else {
          updateDoc.paymentStatus = 'unpaid';
        }
      }
    }

    if (deliveryDate !== undefined) updateDoc.deliveryDate = deliveryDate;
    if (notes !== undefined) updateDoc.notes = notes;
    if (priceMode) updateDoc.priceMode = priceMode;
    const unsetDoc = {};
    if (status && ["pending", "ready", "received", "cancelled"].includes(status)) {
      updateDoc.status = status;
      if (status === 'cancelled') {
        updateDoc.cancelledAt = new Date();
      } else {
        unsetDoc.cancelledAt = "";
      }
    }

    updateDoc.updatedAt = new Date();

    const updateQuery = { $set: updateDoc };
    if (Object.keys(unsetDoc).length > 0) {
      updateQuery.$unset = unsetDoc;
    }

    const result = await ordColl.updateOne(
      { _id: new ObjectId(id) },
      updateQuery
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "Order not found" });
    }

    // If customer phone is provided/changed, ensure customer document exists/updated
    if (updateDoc.customerInfo && updateDoc.customerInfo.phone) {
      try {
        await customersCollection.updateOne(
          { phone: updateDoc.customerInfo.phone },
          { 
            $setOnInsert: { 
              name: updateDoc.customerInfo.name || 'عميل',
              phone: updateDoc.customerInfo.phone,
              createdAt: new Date()
            },
            $set: {
              lastActive: new Date()
            }
          },
          { upsert: true }
        );
      } catch (custErr) {
        console.warn("Failed to auto-upsert customer on order edit:", custErr);
      }
    }

    res.json({ success: true });
  } catch (err) {
    console.error("Full order edit error:", err);
    res.status(500).json({ error: "Failed to update order" });
  }
});

// Get all customers with details (Filtered accurately by rec_date / deliveryDate)
router.put("/api/admin/orders/:id/printed", checkMongoDB, checkAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { shop } = req.body;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid order ID" });
    }
    const ordColl = shop === 'shop2' ? ordersCollection2 : ordersCollection;
    await ordColl.updateOne(
      { _id: new ObjectId(id) },
      { $set: { printed: true, printedAt: new Date() } }
    );
    res.json({ success: true, printed: true });
  } catch (err) {
    console.error("Mark order printed error:", err);
    res.status(500).json({ error: "Failed to mark order as printed" });
  }
});

// ============ CUSTOMER PAYMENTS & BALANCES ============

// Get customer balance & unpaid orders
router.post("/api/orders", checkMongoDB, async (req, res) => {
  try {
    const { customer, items, deliveryDate, notes, priceMode, force, bypassDuplicateCheck } = req.body;
    if (!customer || !items || !Array.isArray(items)) {
      return res.status(400).json({ error: "Missing order details" });
    }

    const normalizedPhone = customer.phone.trim();
    const normalizedName = customer.name.trim();

    const isStaff = isStaffSession(req);
    const {
      items: sanitizedItems,
      totalPrice: parsedTotal,
      paidAmount: parsedPaid,
      paymentStatus: parsedPaymentStatus,
      paymentMethod: parsedPaymentMethod,
      status: parsedStatus
    } = await sanitizeAndCalculateOrder(items, priceMode, productsCollection, isStaff, req.body);

    // 5-Minute Duplicate Order Prevention (Cooldown)
    if (!force && !bypassDuplicateCheck) {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const recentOrders = await ordersCollection.find({
        "customerInfo.phone": normalizedPhone,
        status: { $ne: "cancelled" },
        createdAt: { $gte: fiveMinutesAgo }
      }).sort({ createdAt: -1 }).toArray();

      for (const recent of recentOrders) {
        if (Math.abs((recent.totalPrice || 0) - parsedTotal) < 0.05 && areOrderItemsEqual(sanitizedItems, recent.items)) {
          const elapsedMs = Date.now() - new Date(recent.createdAt).getTime();
          const remainingSeconds = Math.max(1, Math.ceil((5 * 60 * 1000 - elapsedMs) / 1000));
          const remainingMinutes = Math.ceil(remainingSeconds / 60);
          const existingNum = recent.orderNumber || (recent._id ? recent._id.toString().slice(-6) : '');
          
          return res.status(409).json({
            error: `تم إرسال نفس هذا الطلب بالفعل برقم #${existingNum} منذ ${Math.round(elapsedMs / 60000) || 1} دقيقة. يرجى الانتظار ${remainingMinutes} دقيقة لتجنب التكرار.`,
            isDuplicate: true,
            existingOrderNumber: existingNum,
            existingOrderId: recent._id,
            remainingSeconds,
            remainingMinutes
          });
        }
      }
    }

    // Upsert customer profile (preserve registered name)
    const existingCust = await customersCollection.findOne({ phone: normalizedPhone });
    const finalCustName = (existingCust && existingCust.name) ? existingCust.name : normalizedName;

    await customersCollection.updateOne(
      { phone: normalizedPhone },
      { 
        $set: { 
          name: finalCustName, 
          lastActive: new Date() 
        },
        $setOnInsert: {
          createdAt: new Date()
        }
      },
      { upsert: true }
    );

    const nextOrderNumber = await getNextOrderNumber();
    const orderDoc = {
      orderNumber: nextOrderNumber,
      customerInfo: {
        name: normalizedName,
        phone: normalizedPhone
      },
      items: sanitizedItems,
      totalPrice: parsedTotal,
      paidAmount: parsedPaid,
      paymentStatus: parsedPaymentStatus,
      paymentMethod: parsedPaymentMethod,
      deliveryDate: deliveryDate || '',
      notes: notes || '',
      priceMode: priceMode || 'regular',
      status: parsedStatus,
      ...(parsedStatus === 'cancelled' ? { cancelledAt: new Date() } : {}),
      printed: false,
      whatsappSent: true,
      createdAt: new Date()
    };
    
    const result = await ordersCollection.insertOne(orderDoc);
    res.status(201).json({ 
      success: true, 
      orderId: result.insertedId, 
      orderNumber: nextOrderNumber,
      order: { ...orderDoc, _id: result.insertedId }
    });
  } catch (err) {
    console.error("Save order error:", err);
    res.status(500).json({ error: "Failed to save order" });
  }
});

router.post("/api/shop2/orders", checkMongoDB, async (req, res) => {
  try {
    const { customer, items, deliveryDate, notes, priceMode, force, bypassDuplicateCheck } = req.body;
    if (!customer || !items || !Array.isArray(items)) {
      return res.status(400).json({ error: "Missing order details" });
    }

    const normalizedPhone = customer.phone.trim();
    const normalizedName = customer.name.trim();

    const isStaff = isStaffSession(req);
    const {
      items: sanitizedItems,
      totalPrice: parsedTotal,
      paidAmount: parsedPaid,
      paymentStatus: parsedPaymentStatus,
      paymentMethod: parsedPaymentMethod,
      status: parsedStatus
    } = await sanitizeAndCalculateOrder(items, priceMode, productsCollection2, isStaff, req.body);

    // 5-Minute Duplicate Order Prevention (Cooldown)
    if (!force && !bypassDuplicateCheck) {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const recentOrders = await ordersCollection2.find({
        "customerInfo.phone": normalizedPhone,
        status: { $ne: "cancelled" },
        createdAt: { $gte: fiveMinutesAgo }
      }).sort({ createdAt: -1 }).toArray();

      for (const recent of recentOrders) {
        if (Math.abs((recent.totalPrice || 0) - parsedTotal) < 0.05 && areOrderItemsEqual(sanitizedItems, recent.items)) {
          const elapsedMs = Date.now() - new Date(recent.createdAt).getTime();
          const remainingSeconds = Math.max(1, Math.ceil((5 * 60 * 1000 - elapsedMs) / 1000));
          const remainingMinutes = Math.ceil(remainingSeconds / 60);
          const existingNum = recent.orderNumber || (recent._id ? recent._id.toString().slice(-6) : '');
          
          return res.status(409).json({
            error: `تم إرسال نفس هذا الطلب بالفعل برقم #${existingNum} منذ ${Math.round(elapsedMs / 60000) || 1} دقيقة. يرجى الانتظار ${remainingMinutes} دقيقة لتجنب التكرار.`,
            isDuplicate: true,
            existingOrderNumber: existingNum,
            existingOrderId: recent._id,
            remainingSeconds,
            remainingMinutes
          });
        }
      }
    }

    // Upsert customer profile (preserve registered name)
    const existingCust = await customersCollection.findOne({ phone: normalizedPhone });
    const finalCustName = (existingCust && existingCust.name) ? existingCust.name : normalizedName;

    await customersCollection.updateOne(
      { phone: normalizedPhone },
      { 
        $set: { 
          name: finalCustName, 
          lastActive: new Date() 
        },
        $setOnInsert: {
          createdAt: new Date()
        }
      },
      { upsert: true }
    );

    const nextOrderNumber = await getNextOrderNumber();
    const orderDoc = {
      orderNumber: nextOrderNumber,
      customerInfo: {
        name: normalizedName,
        phone: normalizedPhone
      },
      items: sanitizedItems,
      totalPrice: parsedTotal,
      paidAmount: parsedPaid,
      paymentStatus: parsedPaymentStatus,
      paymentMethod: parsedPaymentMethod,
      deliveryDate: deliveryDate || '',
      notes: notes || '',
      priceMode: priceMode || 'regular',
      status: parsedStatus,
      ...(parsedStatus === 'cancelled' ? { cancelledAt: new Date() } : {}),
      printed: false,
      whatsappSent: true,
      createdAt: new Date()
    };
    
    const result = await ordersCollection2.insertOne(orderDoc);
    res.status(201).json({ 
      success: true, 
      orderId: result.insertedId, 
      orderNumber: nextOrderNumber,
      order: { ...orderDoc, _id: result.insertedId }
    });
  } catch (err) {
    console.error("Save shop2 order error:", err);
    res.status(500).json({ error: "Failed to save order" });
  }
});

// ============ FAVICON & ICON ROUTES ============
router.get("/favicon.ico", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "favicon.ico"));
});

router.get("/favicon.svg", (req, res) => {
  res.setHeader("Content-Type", "image/svg+xml");
  res.sendFile(path.join(__dirname, "public", "favicon.svg"));
});

router.get(["/apple-touch-icon.png", "/app/apple-touch-icon.png", "/apple-touch-icon-shop1.png", "/app/apple-touch-icon-shop1.png"], (req, res) => {
  res.sendFile(path.join(__dirname, "public", "apple-touch-icon-shop1.png"));
});

router.get(["/apple-touch-icon-shop2.png", "/app/apple-touch-icon-shop2.png"], (req, res) => {
  res.sendFile(path.join(__dirname, "public", "apple-touch-icon-shop2.png"));
});

router.get(["/apple-touch-icon-admin.png", "/app/apple-touch-icon-admin.png"], (req, res) => {
  res.sendFile(path.join(__dirname, "public", "apple-touch-icon-admin.png"));
});

router.get(["/manifest.json", "/app/manifest.json"], (req, res) => {
  res.setHeader("Content-Type", "application/manifest+json");
  res.sendFile(path.join(__dirname, "public", "manifest.json"));
});

router.get(["/manifest-shop2.json", "/app/manifest-shop2.json"], (req, res) => {
  res.setHeader("Content-Type", "application/manifest+json");
  res.sendFile(path.join(__dirname, "public", "manifest-shop2.json"));
});

router.get(["/manifest-admin.json", "/app/manifest-admin.json"], (req, res) => {
  res.setHeader("Content-Type", "application/manifest+json");
  res.sendFile(path.join(__dirname, "public", "manifest-admin.json"));
});

// ============ DEDICATED ADMIN PWA ROUTE ============
router.get(["/admin", "/admin/*"], (req, res) => {
  res.sendFile(path.join(__dirname, "public", "app", "index.html"));
});

// ============ CATCH-ALL ROUTE FOR VUE SPA ============
router.get("/app/*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "app", "index.html"));
});

// ============ FONT FILE HANDLER ============
// Handle requests for font files that may not exist (prevents 404 errors in console)
router.get("/*.ttf", (req, res) => {
  res.status(204).send(); // No Content - prevents console errors
});

router.get("/*.woff", (req, res) => {
  res.status(204).send();
});

router.get("/*.woff2", (req, res) => {
  res.status(204).send();
});

// ============ MARKETING CAROUSEL APIs ============

// Get carousel items (Public)
  // Marketing Routes moved
router.get("/api/admin/chefs", checkMongoDB, checkAdmin, async (req, res) => {
  try {
    const shop = req.query.shop || 'shop1';
    const chefColl = shop === 'shop2' ? chefsCollection2 : chefsCollection;
    const chefs = await chefColl.find().sort({ name: 1 }).toArray();
    res.json(chefs);
  } catch (err) {
    console.error("Fetch chefs error:", err);
    res.status(500).json({ error: "Failed to fetch chefs" });
  }
});

// Create a new chef
router.post("/api/admin/chefs", checkMongoDB, checkAdmin, async (req, res) => {
  try {
    const { name, phone, shop } = req.body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: "اسم الشيف مطلوب" });
    }
    const chefColl = shop === 'shop2' ? chefsCollection2 : chefsCollection;
    const newChef = {
      name: name.trim(),
      phone: (phone || '').trim(),
      active: true,
      createdAt: new Date(),
      lastActive: new Date()
    };
    const result = await chefColl.insertOne(newChef);
    res.status(201).json({ success: true, _id: result.insertedId, ...newChef });
  } catch (err) {
    console.error("Create chef error:", err);
    res.status(500).json({ error: "Failed to create chef" });
  }
});

// Update chef details
router.put("/api/admin/chefs/:id", checkMongoDB, checkAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, active, shop } = req.body;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid chef ID" });
    }
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: "اسم الشيف مطلوب" });
    }
    const chefColl = shop === 'shop2' ? chefsCollection2 : chefsCollection;
    const prodColl = shop === 'shop2' ? productsCollection2 : productsCollection;
    
    const oldChef = await chefColl.findOne({ _id: new ObjectId(id) });
    const newName = name.trim();
    
    await chefColl.updateOne(
      { _id: new ObjectId(id) },
      { $set: { name: newName, phone: (phone || '').trim(), active: active !== false, lastActive: new Date() } }
    );
    
    // If name changed, cascade update to all assigned products
    if (oldChef && oldChef.name !== newName) {
      await prodColl.updateMany(
        { chefId: id },
        { $set: { chefName: newName } }
      );
    }
    
    res.json({ success: true });
  } catch (err) {
    console.error("Update chef error:", err);
    res.status(500).json({ error: "Failed to update chef" });
  }
});

// Delete chef (and unlink products)
router.delete("/api/admin/chefs/:id", checkMongoDB, checkAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const shop = req.query.shop || 'shop1';
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid chef ID" });
    }
    const chefColl = shop === 'shop2' ? chefsCollection2 : chefsCollection;
    const prodColl = shop === 'shop2' ? productsCollection2 : productsCollection;
    
    await chefColl.deleteOne({ _id: new ObjectId(id) });
    // Unlink all products from this chef
    await prodColl.updateMany(
      { chefId: id },
      { $set: { chefId: '', chefName: '' } }
    );
    
    res.json({ success: true });
  } catch (err) {
    console.error("Delete chef error:", err);
    res.status(500).json({ error: "Failed to delete chef" });
  }
});

// Bulk assign products to a chef (robust ObjectId and string matching)
router.put("/api/admin/chefs/:id/assign-products", checkMongoDB, checkAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { productIds, shop } = req.body;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid chef ID" });
    }
    if (!Array.isArray(productIds)) {
      return res.status(400).json({ error: "productIds must be an array" });
    }
    const chefColl = shop === 'shop2' ? chefsCollection2 : chefsCollection;
    const prodColl = shop === 'shop2' ? productsCollection2 : productsCollection;
    
    const chef = await chefColl.findOne({ _id: new ObjectId(id) });
    if (!chef) {
      return res.status(404).json({ error: "Chef not found" });
    }

    const chefIdStr = String(id);
    const validObjectIds = productIds.filter(pid => ObjectId.isValid(pid)).map(pid => new ObjectId(pid));
    
    // 1. Unassign all products currently assigned to this chef that are NOT in the new selection
    await prodColl.updateMany(
      { 
        $or: [{ chefId: chefIdStr }, { chefId: new ObjectId(id) }],
        _id: { $nin: validObjectIds } 
      },
      { $set: { chefId: '', chefName: '' } }
    );
    
    // 2. Assign the specified products to this chef
    if (validObjectIds.length > 0) {
      await prodColl.updateMany(
        { _id: { $in: validObjectIds } },
        { $set: { chefId: chefIdStr, chefName: chef.name } }
      );
    }
    
    res.json({ success: true, assignedCount: validObjectIds.length });
  } catch (err) {
    console.error("Assign products to chef error:", err);
    res.status(500).json({ error: "Failed to assign products" });
  }
});

// Production report: aggregate order items by chef via product→chef mapping
router.get("/api/admin/production/report", checkMongoDB, checkAdmin, async (req, res) => {
  try {
    const { shop, startDate, endDate, chefId } = req.query;
    const ordColl = shop === 'shop2' ? ordersCollection2 : ordersCollection;
    const prodColl = shop === 'shop2' ? productsCollection2 : productsCollection;
    
    // Uses universal getOrderEffectiveDateStr(order) helper

    // Get all non-cancelled orders
    const allOrders = await ordColl.find({
      status: { $ne: "cancelled" }
    }).toArray();

    // Filter orders accurately by effective date range (time-zone immune YYYY-MM-DD comparison)
    const orders = allOrders.filter(order => {
      const effDate = getOrderEffectiveDateStr(order);
      if (!effDate) return false;
      if (startDate && endDate) {
        return effDate >= startDate && effDate <= endDate;
      } else if (startDate) {
        return effDate >= startDate;
      } else if (endDate) {
        return effDate <= endDate;
      }
      return true;
    });
    
    // Get all products with chef assignments
    const allProducts = await prodColl.find().toArray();
    const productMap = {};
    for (const p of allProducts) {
      productMap[p._id.toString()] = {
        name: p.name,
        category: p.category || '',
        chefId: p.chefId || '',
        chefName: p.chefName || '',
        makingCost: p.makingCost || 0,
        price_regular: p.price_regular || p.price || 0
      };
    };
    
    // Aggregate: for each order item, map to its chef via product
    const chefAgg = {};  // chefId -> { name, products: { productId -> { name, qty, revenue, cost } } }
    const unassignedProducts = {}; // productId -> { name, qty, revenue }
    
    for (const order of orders) {
      const items = order.items || [];
      for (const item of items) {
        const pid = (item.productId || item._id || '').toString();
        const pInfo = productMap[pid];
        const qty = Number(item.quantity) || 1;
        const itemPrice = Number(item.price) || 0;
        const revenue = itemPrice * qty;
        
        if (pInfo && pInfo.chefId) {
          // Filter by chefId if specified
          if (chefId && pInfo.chefId !== chefId) continue;
          
          if (!chefAgg[pInfo.chefId]) {
            chefAgg[pInfo.chefId] = {
              chefId: pInfo.chefId,
              chefName: pInfo.chefName,
              totalQty: 0,
              totalRevenue: 0,
              totalCost: 0,
              products: {}
            };
          }
          const chef = chefAgg[pInfo.chefId];
          chef.totalQty += qty;
          chef.totalRevenue += revenue;
          chef.totalCost += (pInfo.makingCost || 0) * qty;
          
          if (!chef.products[pid]) {
            chef.products[pid] = { name: pInfo.name, category: pInfo.category, qty: 0, revenue: 0, cost: 0 };
          }
          chef.products[pid].qty += qty;
          chef.products[pid].revenue += revenue;
          chef.products[pid].cost += (pInfo.makingCost || 0) * qty;
        } else if (!chefId) {
          // Unassigned product
          const pName = pInfo ? pInfo.name : (item.name || 'منتج غير معروف');
          if (!unassignedProducts[pid]) {
            unassignedProducts[pid] = { name: pName, qty: 0, revenue: 0 };
          }
          unassignedProducts[pid].qty += qty;
          unassignedProducts[pid].revenue += revenue;
        }
      }
    }
    
    // Convert to arrays for response
    const chefReport = Object.values(chefAgg).map(c => ({
      ...c,
      products: Object.values(c.products).sort((a, b) => b.qty - a.qty)
    })).sort((a, b) => b.totalRevenue - a.totalRevenue);
    
    const unassigned = Object.values(unassignedProducts).sort((a, b) => b.qty - a.qty);
    
    const grandTotalQty = chefReport.reduce((s, c) => s + c.totalQty, 0) + unassigned.reduce((s, p) => s + p.qty, 0);
    const grandTotalRevenue = chefReport.reduce((s, c) => s + c.totalRevenue, 0) + unassigned.reduce((s, p) => s + p.revenue, 0);
    const grandTotalCost = chefReport.reduce((s, c) => s + c.totalCost, 0);
    
    res.json({
      chefReport,
      unassigned,
      totalOrders: orders.length,
      grandTotalQty,
      grandTotalRevenue: Math.round(grandTotalRevenue * 100) / 100,
      grandTotalCost: Math.round(grandTotalCost * 100) / 100
    });
  } catch (err) {
    console.error("Production report error:", err);
    res.status(500).json({ error: "Failed to generate production report" });
  }
});

// Production report: get all customer orders containing a specific product within the date range
router.get("/api/admin/production/product-orders", checkMongoDB, checkAdmin, async (req, res) => {
  try {
    const { shop, productName, productId, startDate, endDate } = req.query;
    if (!productName && !productId) {
      return res.status(400).json({ error: "Product name or ID is required" });
    }
    const ordColl = shop === 'shop2' ? ordersCollection2 : ordersCollection;

    // Get all non-cancelled orders
    const allOrders = await ordColl.find({
      status: { $ne: "cancelled" }
    }).sort({ createdAt: -1 }).toArray();

    // Filter orders accurately by effective date range (time-zone immune YYYY-MM-DD comparison)
    const orders = allOrders.filter(order => {
      const effDate = getOrderEffectiveDateStr(order);
      if (!effDate) return false;
      if (startDate && endDate) {
        return effDate >= startDate && effDate <= endDate;
      } else if (startDate) {
        return effDate >= startDate;
      } else if (endDate) {
        return effDate <= endDate;
      }
      return true;
    });

    const targetName = productName ? productName.trim().toLowerCase() : '';
    const targetId = productId ? productId.toString().trim() : '';

    const orderResults = [];
    for (const order of orders) {
      const items = order.items || [];
      // Match by productId or productName
      const matchingItems = items.filter(item => {
        const itemPid = (item.productId || item._id || '').toString().trim();
        const itemName = (item.name || '').trim().toLowerCase();
        if (targetId && itemPid && itemPid === targetId) return true;
        if (targetName && itemName && itemName === targetName) return true;
        return false;
      });

      if (matchingItems.length > 0) {
        const productTotalQty = matchingItems.reduce((sum, it) => sum + (Number(it.quantity) || 1), 0);
        const productTotalPrice = matchingItems.reduce((sum, it) => sum + ((Number(it.price) || 0) * (Number(it.quantity) || 1)), 0);
        const notesList = matchingItems.map(it => it.notes).filter(Boolean);

        orderResults.push({
          orderId: order._id,
          orderNumber: order.orderNumber || (order._id ? order._id.toString().slice(-6) : ''),
          customerName: order.customerInfo?.name || 'عميل نقدي',
          customerPhone: order.customerInfo?.phone || '',
          orderDate: order.createdAt,
          deliveryDate: order.deliveryDate || '',
          effectiveDate: getOrderEffectiveDateStr(order),
          status: order.status || 'pending',
          paymentStatus: order.paymentStatus || 'unpaid',
          priceMode: order.priceMode || 'retail',
          quantity: productTotalQty,
          totalPrice: Math.round(productTotalPrice * 100) / 100,
          unitPrice: matchingItems[0]?.price || 0,
          notes: notesList.join(' ، ')
        });
      }
    }

    // Group by customer for aggregated customer-level view
    const customerMap = {};
    for (const ord of orderResults) {
      const custKey = (ord.customerPhone ? ord.customerPhone.trim() : ord.customerName.trim());
      if (!customerMap[custKey]) {
        customerMap[custKey] = {
          customerName: ord.customerName,
          customerPhone: ord.customerPhone,
          totalQty: 0,
          totalAmount: 0,
          ordersCount: 0,
          orders: []
        };
      }
      customerMap[custKey].totalQty += ord.quantity;
      customerMap[custKey].totalAmount = Math.round((customerMap[custKey].totalAmount + ord.totalPrice) * 100) / 100;
      customerMap[custKey].ordersCount += 1;
      customerMap[custKey].orders.push(ord);
    }

    const customers = Object.values(customerMap).sort((a, b) => b.totalQty - a.totalQty);
    const totalQty = orderResults.reduce((sum, o) => sum + o.quantity, 0);
    const totalRevenue = Math.round(orderResults.reduce((sum, o) => sum + o.totalPrice, 0) * 100) / 100;

    res.json({
      productName: productName || (orderResults[0] ? orderResults[0].productName : ''),
      totalQty,
      totalRevenue,
      ordersCount: orderResults.length,
      customersCount: customers.length,
      orders: orderResults,
      customers
    });
  } catch (err) {
    console.error("Product orders error:", err);
    res.status(500).json({ error: "Failed to fetch product customer orders" });
  }
});

// ============ BACKUP & DATA MANAGEMENT ============

// Create a full backup of all collections
router.post("/api/admin/orders/cleanup-cancelled", checkMongoDB, checkAdmin, async (req, res) => {
  const result = await cleanupExpiredCancelledOrders();
  res.json(result);
});

// Process Crash Protection & Logging


  return router;
};
