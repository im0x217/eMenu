const express = require('express');

module.exports = function createCustomersRouter(context) {
  const router = express.Router();
  const { ObjectId } = require('mongodb');
  const { 
    checkMongoDB, checkAdmin, checkCustomerAuth, customerLimiter, 
    getNextOrderNumber, findCustomerByPhone, MONGO_URI,
    getOrderEffectiveDateStr, generateCustomerToken
  } = context;

router.get("/api/admin/customers", checkMongoDB, checkAdmin, async (req, res) => {
  const shop = req.query.shop === "shop2" ? "shop2" : "shop1";
  const ordColl = shop === "shop2" ? ordersCollection2 : ordersCollection;

  let startDateStr = '';
  let endDateStr = '';
  if (req.query.selectedDate) {
    startDateStr = req.query.selectedDate.trim().slice(0, 10);
    endDateStr = startDateStr;
  } else if (req.query.startDate && req.query.endDate) {
    startDateStr = req.query.startDate.trim().slice(0, 10);
    endDateStr = req.query.endDate.trim().slice(0, 10);
  } else if (req.query.startDate) {
    startDateStr = req.query.startDate.trim().slice(0, 10);
  } else if (req.query.endDate) {
    endDateStr = req.query.endDate.trim().slice(0, 10);
  }

  try {
    const customers = await customersCollection.find().toArray();
    
    // Fetch all non-cancelled orders for the active shop
    const allActiveOrders = await ordColl.find({ status: { $ne: "cancelled" } }).toArray();

    // Filter orders by effective receiving date (rec_date: deliveryDate -> receivedAt -> createdAt)
    const filteredOrders = allActiveOrders.filter(order => {
      if (!startDateStr && !endDateStr) return true;
      const effDate = getOrderEffectiveDateStr(order);
      if (!effDate) return false;
      if (startDateStr && endDateStr) {
        return effDate >= startDateStr && effDate <= endDateStr;
      } else if (startDateStr) {
        return effDate >= startDateStr;
      } else if (endDateStr) {
        return effDate <= endDateStr;
      }
      return true;
    });

    // Aggregate stats by customer phone
    const statsMap = {};
    const balanceMap = {};

    for (const order of filteredOrders) {
      const phone = order.customerInfo && order.customerInfo.phone;
      if (!phone) continue;

      if (!statsMap[phone]) {
        statsMap[phone] = { totalSpent: 0, orderCount: 0 };
      }
      statsMap[phone].totalSpent += Number(order.totalPrice) || 0;
      statsMap[phone].orderCount += 1;

      // Outstanding balance check
      const isUnpaidOrPartial = order.paymentStatus === 'unpaid' || order.paymentStatus === 'partial' || !order.paymentStatus;
      if (isUnpaidOrPartial) {
        const totalOwed = Number(order.totalPrice) || 0;
        const totalPaid = Number(order.paidAmount) || 0;
        const owed = Math.max(0, totalOwed - totalPaid);
        balanceMap[phone] = (balanceMap[phone] || 0) + owed;
      }
    }

    // Batch fetch all favorites by phone for the active shop
    const allFavs = await favoritesCollection.find({ shop }).toArray();
    const favsMap = {};
    for (const fav of allFavs) {
      if (!favsMap[fav.phone]) favsMap[fav.phone] = [];
      favsMap[fav.phone].push(fav.productId.toString());
    }

    const customersWithDetails = customers.map(cust => {
      const phone = cust.phone;
      const stats = statsMap[phone] || { totalSpent: 0, orderCount: 0 };
      const outstandingBalance = balanceMap[phone] || 0;
      const favorites = favsMap[phone] || [];
      
      return {
        _id: cust._id,
        name: cust.name,
        phone,
        password: cust.password || cust.plainPassword || '',
        hasPassword: !!(cust.password || cust.plainPassword || cust.passwordHash),
        lastActive: cust.lastActive,
        createdAt: cust.createdAt,
        totalSpent: stats.totalSpent,
        orderCount: stats.orderCount,
        outstandingBalance,
        favorites
      };
    });

    res.json(customersWithDetails);
  } catch (err) {
    console.error("Fetch admin customers error:", err);
    res.status(500).json({ error: "Failed to fetch customers" });
  }
});

// Update customer details (with reference linkage preservation & password management)
router.put("/api/admin/customers/:id", checkMongoDB, checkAdmin, async (req, res) => {
  const { id } = req.params;
  const { name, phone, password } = req.body;

  if (!name || !phone) {
    return res.status(400).json({ error: "Name and phone are required" });
  }

  try {
    const customer = await customersCollection.findOne({ _id: new ObjectId(id) });
    if (!customer) {
      return res.status(404).json({ error: "Customer not found" });
    }

    const oldPhone = customer.phone;
    const newPhone = phone.trim();

    const updateDoc = { 
      name: name.trim(), 
      phone: newPhone, 
      lastActive: new Date() 
    };

    if (password !== undefined) {
      const cleanPass = String(password).trim();
      if (cleanPass.length > 0) {
        updateDoc.password = cleanPass;
        updateDoc.passwordHash = hashCustomerPassword(cleanPass);
      } else {
        updateDoc.password = '';
        updateDoc.passwordHash = '';
      }
    }

    await customersCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateDoc }
    );

    if (oldPhone !== newPhone) {
      await favoritesCollection.updateMany({ phone: oldPhone }, { $set: { phone: newPhone } });
      await ordersCollection.updateMany({ "customerInfo.phone": oldPhone }, { $set: { "customerInfo.phone": newPhone } });
      await ordersCollection2.updateMany({ "customerInfo.phone": oldPhone }, { $set: { "customerInfo.phone": newPhone } });
      // Cascade phone change to payment audit trail
      await paymentsCollection.updateMany({ customerPhone: oldPhone }, { $set: { customerPhone: newPhone } });
    }

    res.json({ success: true, name, phone: newPhone });
  } catch (err) {
    console.error("Update customer error:", err);
    res.status(500).json({ error: "Failed to update customer" });
  }
});

// Delete customer and all their data (orders, favorites)
router.delete("/api/admin/customers/:id", checkMongoDB, checkAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    const customer = await customersCollection.findOne({ _id: new ObjectId(id) });
    if (!customer) {
      return res.status(404).json({ error: "Customer not found" });
    }

    const phone = customer.phone;

    // Wipe customer
    await customersCollection.deleteOne({ _id: new ObjectId(id) });

    // Wipe all related data
    if (phone) {
      await favoritesCollection.deleteMany({ phone });
      await ordersCollection.deleteMany({ "customerInfo.phone": phone });
      await ordersCollection2.deleteMany({ "customerInfo.phone": phone });
      await paymentsCollection.deleteMany({ customerPhone: phone });
    }

    res.json({ success: true, message: "Customer and all associated data deleted successfully." });
  } catch (err) {
    console.error("Delete customer error:", err);
    res.status(500).json({ error: "Failed to delete customer" });
  }
});


// Mark order as printed by admin
router.get("/api/admin/customers/:phone/balance", checkMongoDB, checkAdmin, async (req, res) => {
  const shop = req.query.shop === "shop2" ? "shop2" : "shop1";
  const ordColl = shop === "shop2" ? ordersCollection2 : ordersCollection;
  const { phone } = req.params;

  try {
    const unpaidOrders = await ordColl.find({
      "customerInfo.phone": phone,
      status: { $ne: "cancelled" },
      $or: [
        { paymentStatus: { $in: ["unpaid", "partial"] } },
        { paymentStatus: { $exists: false } }
      ]
    }).sort({ createdAt: 1 }).toArray();

    // For legacy orders without paymentStatus, treat as unpaid
    const normalizedOrders = unpaidOrders.map(o => ({
      _id: o._id,
      orderNumber: o.orderNumber || null,
      totalPrice: o.totalPrice || 0,
      paidAmount: o.paidAmount || 0,
      remaining: (o.totalPrice || 0) - (o.paidAmount || 0),
      paymentStatus: o.paymentStatus || 'unpaid',
      createdAt: o.createdAt,
      deliveryDate: o.deliveryDate,
      status: o.status,
      items: o.items
    }));

    const totalOwed = Math.round(normalizedOrders.reduce((sum, o) => sum + o.totalPrice, 0) * 100) / 100;
    const totalPaid = Math.round(normalizedOrders.reduce((sum, o) => sum + o.paidAmount, 0) * 100) / 100;
    const outstandingBalance = Math.round(Math.max(0, totalOwed - totalPaid) * 100) / 100;

    const recentPayments = await paymentsCollection.find({
      customerPhone: phone,
      shop
    }).sort({ createdAt: -1 }).limit(20).toArray();

    res.json({
      totalOwed,
      totalPaid,
      outstandingBalance,
      unpaidOrders: normalizedOrders,
      recentPayments
    });
  } catch (err) {
    console.error("Fetch customer balance error:", err);
    res.status(500).json({ error: "Failed to fetch customer balance" });
  }
});

// Get all customer orders for Admin A5 Statement & History
router.get("/api/admin/customers/:phone/orders", checkMongoDB, checkAdmin, async (req, res) => {
  const shop = req.query.shop === "shop2" ? "shop2" : (req.query.shop === "all" ? "all" : "shop1");
  const { phone } = req.params;
  const rawPhone = (phone || "").trim();

  try {
    const cleanDigits = rawPhone.replace(/\D/g, "");
    const variations = [rawPhone];
    if (cleanDigits) {
      variations.push(cleanDigits);
      if (cleanDigits.startsWith("218")) {
        variations.push(cleanDigits.slice(3));
        variations.push("0" + cleanDigits.slice(3));
      } else if (cleanDigits.startsWith("0")) {
        variations.push(cleanDigits.slice(1));
        variations.push("218" + cleanDigits.slice(1));
      } else {
        variations.push("0" + cleanDigits);
        variations.push("218" + cleanDigits);
      }
    }
    const uniquePhones = [...new Set(variations.filter(Boolean))];

    const phoneFilter = {
      $or: [
        { "customerInfo.phone": { $in: uniquePhones } },
        { customerPhone: { $in: uniquePhones } }
      ]
    };

    let orders = [];
    if (shop === "all") {
      const orders1 = await ordersCollection.find(phoneFilter).sort({ createdAt: -1 }).toArray();
      const orders2 = await ordersCollection2.find(phoneFilter).sort({ createdAt: -1 }).toArray();
      orders = [
        ...orders1.map(o => ({ ...o, shop: 'shop1' })),
        ...orders2.map(o => ({ ...o, shop: 'shop2' }))
      ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } else {
      const ordColl = shop === "shop2" ? ordersCollection2 : ordersCollection;
      orders = await ordColl.find(phoneFilter).sort({ createdAt: -1 }).toArray();
    }

    const normalizedOrders = orders.map(o => {
      const totalPrice = Number(o.totalPrice || o.total || 0);
      const isPaid = o.paymentStatus === 'paid';
      const paidAmount = Number(o.paidAmount || (isPaid ? totalPrice : 0));
      const remaining = o.remaining !== undefined ? Number(o.remaining) : Math.max(0, totalPrice - paidAmount);

      return {
        _id: o._id,
        orderNumber: o.orderNumber || null,
        totalPrice,
        paidAmount,
        remaining,
        paymentStatus: o.paymentStatus || (remaining <= 0 ? 'paid' : (paidAmount > 0 ? 'partial' : 'unpaid')),
        createdAt: o.createdAt,
        deliveryDate: o.deliveryDate,
        status: o.status || 'pending',
        itemsSummary: (o.items || []).map(i => `${i.name || i.title || ''} (${i.quantity || 1})`).join('، '),
        notes: o.notes || '',
        shop: o.shop || shop
      };
    });

    res.json(normalizedOrders);
  } catch (err) {
    console.error("Fetch customer orders error:", err);
    res.status(500).json({ error: "Failed to fetch customer orders" });
  }
});


// Record a payment (FIFO distribution)
router.post("/api/admin/payments", checkMongoDB, checkAdmin, async (req, res) => {
  const { customerPhone, customerName, amount, shop: reqShop, note, method, targetOrderId } = req.body;
  const shop = reqShop === "shop2" ? "shop2" : "shop1";
  const ordColl = shop === "shop2" ? ordersCollection2 : ordersCollection;

  if (!customerPhone || typeof customerPhone !== 'string') {
    return res.status(400).json({ error: "Missing customer phone" });
  }
  const paymentAmount = Number(amount);
  if (!paymentAmount || paymentAmount <= 0) {
    return res.status(400).json({ error: "Invalid payment amount" });
  }
  if (method && !['cash', 'card', 'bank_transfer'].includes(method)) {
    return res.status(400).json({ error: "Invalid payment method" });
  }

  try {
    // Fetch unpaid/partial orders sorted oldest first (FIFO)
    let unpaidOrders = await ordColl.find({
      "customerInfo.phone": customerPhone.trim(),
      status: { $ne: "cancelled" },
      $or: [
        { paymentStatus: { $in: ["unpaid", "partial"] } },
        { paymentStatus: { $exists: false } }
      ]
    }).sort({ createdAt: 1 }).toArray();

    // If targetOrderId is specified, move target order to the front of the allocation list
    if (targetOrderId && ObjectId.isValid(targetOrderId)) {
      const targetIdx = unpaidOrders.findIndex(o => o._id.toString() === targetOrderId.toString());
      if (targetIdx > 0) {
        const targetOrder = unpaidOrders.splice(targetIdx, 1)[0];
        unpaidOrders.unshift(targetOrder);
      }
    }

    // Prevent paying for cancelled orders
    const activeUnpaidOrders = unpaidOrders.filter(o => o.status !== 'cancelled');

    // Calculate total outstanding from active orders only
    const totalOutstanding = Math.round(activeUnpaidOrders.reduce((sum, o) => {
      return sum + ((o.totalPrice || 0) - (o.paidAmount || 0));
    }, 0) * 100) / 100;

    if (paymentAmount > totalOutstanding + 0.01) {
      return res.status(400).json({ 
        error: "Payment exceeds outstanding balance",
        outstanding: totalOutstanding
      });
    }

    if (activeUnpaidOrders.length === 0 && paymentAmount > 0) {
      return res.status(400).json({ error: "No active unpaid orders found for this customer" });
    }

    // FIFO distribution (only against active orders)
    let remaining = paymentAmount;
    const distributedTo = [];

    for (const order of activeUnpaidOrders) {
      if (remaining <= 0) break;

      const orderRemaining = (order.totalPrice || 0) - (order.paidAmount || 0);
      if (orderRemaining <= 0) continue;

      const applied = Math.round(Math.min(remaining, orderRemaining) * 100) / 100;
      const newPaidAmount = Math.round(((order.paidAmount || 0) + applied) * 100) / 100;
      const newStatus = (order.totalPrice - newPaidAmount) <= 0.009 ? 'paid' : 'partial';

      await ordColl.updateOne(
        { _id: order._id },
        { $set: { paidAmount: newPaidAmount, paymentStatus: newStatus, paymentMethod: method || 'cash' } }
      );

      distributedTo.push({
        orderId: order._id,
        orderNumber: order.orderNumber || null,
        applied: applied,
        orderTotal: order.totalPrice,
        previousPaid: order.paidAmount || 0,
        newPaidAmount: newPaidAmount,
        newStatus: newStatus
      });

      remaining = Math.round((remaining - applied) * 100) / 100;
    }

    const remainingBalanceAfter = Math.round(Math.max(0, totalOutstanding - paymentAmount) * 100) / 100;

    // Record payment transaction
    const paymentDoc = {
      customerPhone: customerPhone.trim(),
      customerName: (customerName || '').trim(),
      amount: paymentAmount,
      method: method || 'cash',
      shop,
      note: (note || '').trim(),
      distributedTo,
      remainingBalanceAfter: Math.max(0, remainingBalanceAfter),
      balanceBefore: totalOutstanding,
      createdAt: new Date()
    };

    const result = await paymentsCollection.insertOne(paymentDoc);

    res.status(201).json({
      success: true,
      paymentId: result.insertedId,
      amount: paymentAmount,
      distributedTo,
      remainingBalanceAfter: Math.max(0, remainingBalanceAfter)
    });
  } catch (err) {
    console.error("Record payment error:", err);
    res.status(500).json({ error: "Failed to record payment" });
  }
});

// Admin endpoint to safely migrate unpaid orders paymentMethod to empty string
router.post("/api/admin/migrate-unpaid-orders", checkMongoDB, checkAdmin, async (req, res) => {
  try {
    const query = {
      $or: [
        { paymentStatus: 'unpaid' },
        { paymentStatus: { $exists: false } },
        { paidAmount: 0 },
        { paidAmount: { $exists: false } }
      ]
    };

    const res1 = await ordersCollection.updateMany(query, { $set: { paymentMethod: '' } });
    const res2 = await ordersCollection2.updateMany(query, { $set: { paymentMethod: '' } });

    res.json({
      success: true,
      shop1Modified: res1.modifiedCount,
      shop2Modified: res2.modifiedCount,
      message: `Migrated ${res1.modifiedCount + res2.modifiedCount} unpaid orders successfully.`
    });
  } catch (err) {
    console.error("Migration error:", err);
    res.status(500).json({ error: "Failed to migrate unpaid orders" });
  }
});

// Get payment history for a customer
router.get("/api/admin/payments", checkMongoDB, checkAdmin, async (req, res) => {
  const { phone, shop: reqShop, limit: reqLimit } = req.query;
  const shop = reqShop === "shop2" ? "shop2" : "shop1";
  const limit = Math.min(Number(reqLimit) || 50, 200);

  try {
    const query = { shop };
    if (phone) query.customerPhone = phone;
    const payments = await paymentsCollection.find(query).sort({ createdAt: -1 }).limit(limit).toArray();
    res.json(payments);
  } catch (err) {
    console.error("Fetch payments error:", err);
    res.status(500).json({ error: "Failed to fetch payments" });
  }
});

// Cancel / Reverse a payment
router.post("/api/admin/payments/:id/cancel", checkMongoDB, checkAdmin, async (req, res) => {
  const { id } = req.params;
  if (!ObjectId.isValid(id)) {
    return res.status(400).json({ error: "Invalid payment ID" });
  }

  try {
    const payment = await paymentsCollection.findOne({ _id: new ObjectId(id) });
    if (!payment) {
      return res.status(404).json({ error: "Payment not found" });
    }
    if (payment.status === 'cancelled' || payment.isCancelled) {
      return res.status(400).json({ error: "هذه الدفعة ملغية بالفعل" });
    }

    const shop = payment.shop === "shop2" ? "shop2" : "shop1";
    const ordColl = shop === "shop2" ? ordersCollection2 : ordersCollection;

    // Reverse distribution for each affected order
    if (Array.isArray(payment.distributedTo)) {
      for (const dist of payment.distributedTo) {
        if (dist.orderId && ObjectId.isValid(dist.orderId)) {
          const order = await ordColl.findOne({ _id: new ObjectId(dist.orderId) });
          if (order) {
            const applied = Number(dist.applied) || 0;
            const newPaidAmount = Math.max(0, Math.round(((order.paidAmount || 0) - applied) * 100) / 100);
            let newStatus = 'unpaid';
            if (newPaidAmount >= (order.totalPrice || 0) - 0.009) {
              newStatus = 'paid';
            } else if (newPaidAmount > 0) {
              newStatus = 'partial';
            }
            const updateDoc = {
              paidAmount: newPaidAmount,
              paymentStatus: newStatus
            };
            if (newPaidAmount === 0) {
              updateDoc.paymentMethod = '';
            }
            await ordColl.updateOne(
              { _id: new ObjectId(dist.orderId) },
              { $set: updateDoc }
            );
          }
        }
      }
    }

    // Mark payment as cancelled in payments collection
    await paymentsCollection.updateOne(
      { _id: new ObjectId(id) },
      { 
        $set: { 
          status: 'cancelled', 
          isCancelled: true, 
          cancelledAt: new Date(), 
          cancelledBy: req.adminUser ? req.adminUser.username : 'admin' 
        } 
      }
    );

    res.json({
      success: true,
      message: "تم إلغاء واسترجاع الدفعة بنجاح",
      paymentId: id
    });
  } catch (err) {
    console.error("Cancel payment error:", err);
    res.status(500).json({ error: "فشل إلغاء الدفعة" });
  }
});

// Also support DELETE method for payment cancellation
router.delete("/api/admin/payments/:id", checkMongoDB, checkAdmin, async (req, res) => {
  const { id } = req.params;
  if (!ObjectId.isValid(id)) {
    return res.status(400).json({ error: "Invalid payment ID" });
  }

  try {
    const payment = await paymentsCollection.findOne({ _id: new ObjectId(id) });
    if (!payment) {
      return res.status(404).json({ error: "Payment not found" });
    }
    if (payment.status === 'cancelled' || payment.isCancelled) {
      return res.status(400).json({ error: "هذه الدفعة ملغية بالفعل" });
    }

    const shop = payment.shop === "shop2" ? "shop2" : "shop1";
    const ordColl = shop === "shop2" ? ordersCollection2 : ordersCollection;

    // Reverse distribution
    if (Array.isArray(payment.distributedTo)) {
      for (const dist of payment.distributedTo) {
        if (dist.orderId && ObjectId.isValid(dist.orderId)) {
          const order = await ordColl.findOne({ _id: new ObjectId(dist.orderId) });
          if (order) {
            const applied = Number(dist.applied) || 0;
            const newPaidAmount = Math.max(0, Math.round(((order.paidAmount || 0) - applied) * 100) / 100);
            let newStatus = 'unpaid';
            if (newPaidAmount >= (order.totalPrice || 0) - 0.009) {
              newStatus = 'paid';
            } else if (newPaidAmount > 0) {
              newStatus = 'partial';
            }
            const updateDoc = {
              paidAmount: newPaidAmount,
              paymentStatus: newStatus
            };
            if (newPaidAmount === 0) {
              updateDoc.paymentMethod = '';
            }
            await ordColl.updateOne(
              { _id: new ObjectId(dist.orderId) },
              { $set: updateDoc }
            );
          }
        }
      }
    }

    await paymentsCollection.updateOne(
      { _id: new ObjectId(id) },
      { 
        $set: { 
          status: 'cancelled', 
          isCancelled: true, 
          cancelledAt: new Date(), 
          cancelledBy: req.adminUser ? req.adminUser.username : 'admin' 
        } 
      }
    );

    res.json({
      success: true,
      message: "تم إلغاء واسترجاع الدفعة بنجاح",
      paymentId: id
    });
  } catch (err) {
    console.error("Delete payment error:", err);
    res.status(500).json({ error: "فشل إلغاء الدفعة" });
  }
});

// Get single payment receipt
router.get("/api/admin/payments/:id", checkMongoDB, checkAdmin, async (req, res) => {
  const { id } = req.params;
  if (!ObjectId.isValid(id)) {
    return res.status(400).json({ error: "Invalid payment ID" });
  }

  try {
    const payment = await paymentsCollection.findOne({ _id: new ObjectId(id) });
    if (!payment) {
      return res.status(404).json({ error: "Payment not found" });
    }
    res.json(payment);
  } catch (err) {
    console.error("Fetch payment error:", err);
    res.status(500).json({ error: "Failed to fetch payment" });
  }
});

// ============ REPORTS EXPORT APIs ============

// Export report as CSV
router.post("/api/customer/register", checkMongoDB, customerLimiter, async (req, res) => {
  try {
    const { name, phone, password } = req.body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: "يرجى كتابة الاسم بالكامل" });
    }
    if (!phone || typeof phone !== 'string' || phone.trim().length < 9) {
      return res.status(400).json({ error: "يرجى إدخال رقم هاتف صحيح" });
    }
    if (!password || typeof password !== 'string' || password.length < 4) {
      return res.status(400).json({ error: "كلمة المرور يجب أن لا تقل عن 4 خانات" });
    }

    const normalizedPhone = phone.trim();
    const normalizedName = name.trim();

    // Check if phone already registered
    const existing = await customersCollection.findOne({ phone: normalizedPhone });
    if (existing) {
      if (existing.passwordHash) {
        return res.status(409).json({ error: "رقم الهاتف مسجل مسبقاً، يرجى تسجيل الدخول بدلاً من ذلك" });
      } else {
        // Legacy customer without password: set password and activate account
        const passwordHash = hashCustomerPassword(password);
        await customersCollection.updateOne(
          { _id: existing._id },
          { 
            $set: { 
              name: existing.name || normalizedName,
              password: password.trim(),
              passwordHash,
              lastActive: new Date()
            } 
          }
        );
        const token = generateCustomerToken(normalizedPhone);
        return res.json({
          success: true,
          token,
          customer: {
            name: existing.name || normalizedName,
            phone: normalizedPhone,
            hasPassword: true
          }
        });
      }
    }

    // New customer registration
    const passwordHash = hashCustomerPassword(password);
    const newCustomerDoc = {
      name: normalizedName,
      phone: normalizedPhone,
      password: password.trim(),
      passwordHash,
      createdAt: new Date(),
      lastActive: new Date()
    };

    await customersCollection.insertOne(newCustomerDoc);
    const token = generateCustomerToken(normalizedPhone);

    res.status(201).json({
      success: true,
      token,
      customer: {
        name: normalizedName,
        phone: normalizedPhone,
        hasPassword: true
      }
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: "رقم الهاتف مسجل مسبقاً" });
    }
    console.error("Customer register error:", err);
    res.status(500).json({ error: "فشل إنشاء الحساب، يرجى المحاولة لاحقاً" });
  }
});

// Login to customer account
router.post("/api/customer/login", checkMongoDB, customerLimiter, async (req, res) => {
  try {
    const { phone, password } = req.body;
    if (!phone || typeof phone !== 'string' || !phone.trim()) {
      return res.status(400).json({ error: "يرجى إدخال رقم الهاتف" });
    }

    const normalizedPhone = phone.trim();
    const customer = await customersCollection.findOne({ phone: normalizedPhone });

    if (!customer) {
      return res.status(404).json({ error: "رقم الهاتف غير مسجل، يرجى إنشاء حساب جديد" });
    }

    // If customer has no password (legacy profile from guest ordering)
    if (!customer.passwordHash) {
      return res.json({
        success: true,
        requiresPasswordSetup: true,
        customer: {
          name: customer.name,
          phone: customer.phone,
          hasPassword: false
        }
      });
    }

    if (!password || typeof password !== 'string') {
      return res.status(400).json({ error: "يرجى إدخال كلمة المرور" });
    }

    const isValid = verifyCustomerPassword(password, customer.passwordHash, customer.password);
    if (!isValid) {
      return res.status(401).json({ error: "كلمة المرور غير صحيحة" });
    }

    await customersCollection.updateOne(
      { _id: customer._id },
      { $set: { lastActive: new Date() } }
    );

    const token = generateCustomerToken(normalizedPhone);
    res.json({
      success: true,
      token,
      customer: {
        name: customer.name,
        phone: customer.phone,
        hasPassword: true
      }
    });
  } catch (err) {
    console.error("Customer login error:", err);
    res.status(500).json({ error: "فشل تسجيل الدخول" });
  }
});

// Set password for account (for legacy accounts or password updates)
router.post("/api/customer/set-password", checkMongoDB, customerLimiter, async (req, res) => {
  try {
    const { phone, password, oldPassword } = req.body;
    if (!phone || typeof phone !== 'string' || !phone.trim()) {
      return res.status(400).json({ error: "رقم الهاتف مطلوب" });
    }
    if (!password || typeof password !== 'string' || password.length < 4) {
      return res.status(400).json({ error: "كلمة المرور يجب أن لا تقل عن 4 خانات" });
    }

    const normalizedPhone = phone.trim();
    const customer = await customersCollection.findOne({ phone: normalizedPhone });

    if (!customer) {
      return res.status(404).json({ error: "الحساب غير موجود" });
    }

    // If already has password, verify old password first
    if ((customer.passwordHash || customer.password) && oldPassword) {
      const isOldValid = verifyCustomerPassword(oldPassword, customer.passwordHash, customer.password);
      if (!isOldValid) {
        return res.status(401).json({ error: "كلمة المرور الحالية غير صحيحة" });
      }
    }

    const newHash = hashCustomerPassword(password);
    await customersCollection.updateOne(
      { _id: customer._id },
      { 
        $set: { 
          password: password.trim(),
          passwordHash: newHash,
          lastActive: new Date()
        } 
      }
    );

    const token = generateCustomerToken(normalizedPhone);
    res.json({
      success: true,
      token,
      customer: {
        name: customer.name,
        phone: customer.phone,
        hasPassword: true
      }
    });
  } catch (err) {
    console.error("Set customer password error:", err);
    res.status(500).json({ error: "فشل تعيين كلمة المرور" });
  }
});

// Get customer profile and password status
router.get("/api/customer/profile", checkMongoDB, customerLimiter, async (req, res) => {
  try {
    const { phone } = req.query;
    if (!phone || typeof phone !== 'string') {
      return res.status(400).json({ error: "Missing phone parameter" });
    }
    const customer = await customersCollection.findOne({ phone: phone.trim() });
    if (!customer) {
      return res.status(404).json({ error: "Customer not found" });
    }
    res.json({
      name: customer.name,
      phone: customer.phone,
      hasPassword: !!customer.passwordHash,
      createdAt: customer.createdAt
    });
  } catch (err) {
    console.error("Get customer profile error:", err);
    res.status(500).json({ error: "Failed to get profile" });
  }
});

// Admin reset customer password
router.put("/api/admin/customers/:id/reset-password", checkMongoDB, checkAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid customer ID" });
    }
    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 4) {
      return res.status(400).json({ error: "كلمة المرور يجب أن لا تقل عن 4 خانات" });
    }

    const customer = await customersCollection.findOne({ _id: new ObjectId(id) });
    if (!customer) {
      return res.status(404).json({ error: "Customer not found" });
    }

    const cleanNewPass = newPassword.trim();
    const passwordHash = hashCustomerPassword(cleanNewPass);
    await customersCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { password: cleanNewPass, passwordHash, lastActive: new Date() } }
    );

    res.json({ success: true, password: cleanNewPass, message: "تم إعادة تعيين كلمة المرور بنجاح" });
  } catch (err) {
    console.error("Admin reset customer password error:", err);
    res.status(500).json({ error: "Failed to reset password" });
  }
});


// Get customer balance for customer view (combines both shops)
router.get("/api/customer/balance", checkMongoDB, customerLimiter, checkCustomerAuth, async (req, res) => {
  try {
    const { phone } = req.query;
    if (!phone || typeof phone !== 'string') {
      return res.status(400).json({ error: "Missing phone parameter" });
    }

    const normalizedPhone = phone.trim();

    // Query unpaid orders across both shops
    const unpaid1 = await ordersCollection.find({
      "customerInfo.phone": normalizedPhone,
      status: { $ne: "cancelled" },
      $or: [
        { paymentStatus: { $in: ["unpaid", "partial"] } },
        { paymentStatus: { $exists: false } }
      ]
    }).toArray();

    const unpaid2 = await ordersCollection2.find({
      "customerInfo.phone": normalizedPhone,
      status: { $ne: "cancelled" },
      $or: [
        { paymentStatus: { $in: ["unpaid", "partial"] } },
        { paymentStatus: { $exists: false } }
      ]
    }).toArray();

    const allUnpaid = [...unpaid1, ...unpaid2];
    const totalOwed = Math.round(allUnpaid.reduce((sum, o) => sum + (o.totalPrice || 0), 0) * 100) / 100;
    const totalPaid = Math.round(allUnpaid.reduce((sum, o) => sum + (o.paidAmount || 0), 0) * 100) / 100;
    const outstandingBalance = Math.round(Math.max(0, totalOwed - totalPaid) * 100) / 100;

    // Fetch all completed/received orders to get lifetime totals
    const allCompleted1 = await ordersCollection.find({ "customerInfo.phone": normalizedPhone, status: { $in: ["ready", "received", "completed"] } }).toArray();
    const allCompleted2 = await ordersCollection2.find({ "customerInfo.phone": normalizedPhone, status: { $in: ["ready", "received", "completed"] } }).toArray();
    const lifetimeTotal = Math.round([...allCompleted1, ...allCompleted2].reduce((sum, o) => sum + (o.totalPrice || 0), 0) * 100) / 100;

    res.json({
      outstandingBalance,
      unpaidOrdersCount: allUnpaid.length,
      lifetimeTotal,
      currency: "د.ل"
    });
  } catch (err) {
    console.error("Fetch customer balance error:", err);
    res.status(500).json({ error: "Failed to fetch customer balance" });
  }
});

// ============ CUSTOMER & FAVORITES APIs ============

router.post("/api/customer/identify", checkMongoDB, customerLimiter, async (req, res) => {
  try {
    const { name, phone } = req.body;
    if (!name || !phone || typeof name !== 'string' || typeof phone !== 'string') {
      return res.status(400).json({ error: "Missing or invalid name or phone number" });
    }
    
    const normalizedPhone = phone.trim();
    
    await customersCollection.updateOne(
      { phone: normalizedPhone },
      { 
        $set: { 
          name: name.trim(), 
          lastActive: new Date() 
        },
        $setOnInsert: {
          createdAt: new Date()
        }
      },
      { upsert: true }
    );
    
    const token = generateCustomerToken(normalizedPhone);
    res.json({ success: true, token });
  } catch (err) {
    console.error("Identify customer error:", err);
    res.status(500).json({ error: "Failed to identify customer" });
  }
});

router.post("/api/customer/favorites", checkMongoDB, customerLimiter, checkCustomerAuth, async (req, res) => {
  try {
    const { phone, shop, favorites } = req.body;
    if (!phone || !shop || !Array.isArray(favorites) || typeof phone !== 'string') {
      return res.status(400).json({ error: "Missing or invalid required fields" });
    }
    
    const normalizedPhone = phone.trim();
    
    // Clear existing favorites for this shop and phone
    await favoritesCollection.deleteMany({ phone: normalizedPhone, shop });
    
    // Insert new favorites
    if (favorites.length > 0) {
      const docs = favorites.map(id => ({
        phone: normalizedPhone,
        productId: new ObjectId(id),
        shop,
        createdAt: new Date()
      }));
      await favoritesCollection.insertMany(docs);
    }
    
    res.json({ success: true });
  } catch (err) {
    console.error("Sync favorites error:", err);
    res.status(500).json({ error: "Failed to sync favorites" });
  }
});

router.get("/api/customer/favorites", checkMongoDB, customerLimiter, checkCustomerAuth, async (req, res) => {
  try {
    const { phone } = req.query;
    if (!phone || typeof phone !== 'string') {
      return res.status(400).json({ error: "Missing or invalid phone parameter" });
    }
    
    const normalizedPhone = phone.trim();
    const favs = await favoritesCollection.find({ phone: normalizedPhone }).toArray();
    
    const shop1 = favs.filter(f => f.shop === 'shop1').map(f => f.productId.toString());
    const shop2 = favs.filter(f => f.shop === 'shop2').map(f => f.productId.toString());
    
    res.json({ shop1, shop2 });
  } catch (err) {
    console.error("Fetch favorites error:", err);
    res.status(500).json({ error: "Failed to fetch favorites" });
  }
});

router.get("/api/customer/orders", checkMongoDB, customerLimiter, checkCustomerAuth, async (req, res) => {
  try {
    const { phone } = req.query;
    if (!phone || typeof phone !== 'string') {
      return res.status(400).json({ error: "Missing or invalid phone parameter" });
    }
    
    const normalizedPhone = phone.trim();
    
    // Query both databases/collections with limits
    const orders1 = await ordersCollection.find({ "customerInfo.phone": normalizedPhone }).sort({ createdAt: -1 }).limit(50).toArray();
    const orders2 = await ordersCollection2.find({ "customerInfo.phone": normalizedPhone }).sort({ createdAt: -1 }).limit(50).toArray();
    
    // Add shop tags
    const taggedOrders1 = orders1.map(o => ({ ...o, shop: 'shop1' }));
    const taggedOrders2 = orders2.map(o => ({ ...o, shop: 'shop2' }));
    
    // Combine and sort by date descending
    const allOrders = [...taggedOrders1, ...taggedOrders2].sort((a, b) => {
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
    
    res.json(allOrders);
  } catch (err) {
    console.error("Fetch orders error:", err);
    res.status(500).json({ error: "Failed to fetch order history" });
  }
});


// Customer edits their order (allowed ONLY if admin has not printed the order yet)
router.put("/api/customer/orders/:id", checkMongoDB, customerLimiter, checkCustomerAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { phone, shop, items, deliveryDate, notes } = req.body;

    if (!phone || typeof phone !== 'string') {
      return res.status(400).json({ error: "رقم الهاتف مطلوب" });
    }
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: "معرف الطلب غير صالح" });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "يجب أن يحتوي الطلب على صنف واحد على الأقل" });
    }

    const ordColl = shop === 'shop2' ? ordersCollection2 : ordersCollection;
    const order = await ordColl.findOne({ _id: new ObjectId(id) });

    if (!order) {
      return res.status(404).json({ error: "الطلب غير موجود" });
    }

    if (order.customerInfo?.phone !== phone.trim()) {
      return res.status(403).json({ error: "لا يمكنك تعديل هذا الطلب" });
    }

    // CRITICAL CHECK: Customer cannot edit if order has already been printed by admin!
    if (order.printed) {
      return res.status(403).json({ error: "تمت طباعة هذا الطلب في المحل ولا يمكن تعديله. يرجى التواصل مع الإدارة." });
    }

    if (['received', 'completed', 'cancelled'].includes(order.status)) {
      return res.status(400).json({ error: "لا يمكن تعديل طلب مكتمل أو ملغي" });
    }

    // Calculate new total price
    let newTotal = 0;
    const updatedItems = items.map(item => {
      const qty = Math.max(0.1, Number(item.quantity) || 1);
      const price = Number(item.price) || 0;
      newTotal += price * qty;
      return {
        productId: ObjectId.isValid(item.productId) ? new ObjectId(item.productId) : null,
        name: item.name,
        price: price,
        quantity: item.allowFloat ? Math.round(qty * 10) / 10 : Math.round(qty),
        allowFloat: !!item.allowFloat,
        notes: (item.notes || '').trim()
      };
    });

    newTotal = Math.round(newTotal * 100) / 100;

    const paidAmount = order.paidAmount || 0;
    const newPaymentStatus = paidAmount >= newTotal && newTotal > 0 ? 'paid' : (paidAmount > 0 ? 'partial' : 'unpaid');

    await ordColl.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          items: updatedItems,
          totalPrice: newTotal,
          deliveryDate: deliveryDate !== undefined ? deliveryDate : order.deliveryDate,
          notes: notes !== undefined ? notes : order.notes,
          paymentStatus: newPaymentStatus,
          updatedAt: new Date()
        }
      }
    );

    const updatedOrder = await ordColl.findOne({ _id: new ObjectId(id) });
    res.json({ success: true, order: { ...updatedOrder, shop } });
  } catch (err) {
    console.error("Customer edit order error:", err);
    res.status(500).json({ error: "فشل تعديل الطلب" });
  }
});

// Customer confirms order received
router.put("/api/customer/orders/:id/received", checkMongoDB, customerLimiter, checkCustomerAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { phone, shop } = req.body;

    if (!phone || typeof phone !== 'string') {
      return res.status(400).json({ error: "Missing or invalid phone" });
    }
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid order ID" });
    }

    const ordColl = shop === 'shop2' ? ordersCollection2 : ordersCollection;
    const order = await ordColl.findOne({ _id: new ObjectId(id) });

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }
    if (order.customerInfo.phone !== phone.trim()) {
      return res.status(403).json({ error: "Phone mismatch" });
    }
    if (order.status !== 'ready') {
      return res.status(400).json({ error: "Order is not in ready state" });
    }

    await ordColl.updateOne(
      { _id: new ObjectId(id) },
      { $set: { status: 'received', receivedAt: new Date() } }
    );

    res.json({ success: true, status: 'received' });
  } catch (err) {
    console.error("Confirm order received error:", err);
    res.status(500).json({ error: "Failed to update order status" });
  }
});

// Helper function to check if two order item lists are identical
const areOrderItemsEqual = (itemsA, itemsB) => {
  if (!Array.isArray(itemsA) || !Array.isArray(itemsB)) return false;
  if (itemsA.length !== itemsB.length) return false;
  
  const sortKey = item => `${item.productId || ''}_${(item.name || '').trim().toLowerCase()}_${Number(item.price)}_${Number(item.quantity)}`;
  const sortedA = [...itemsA].sort((a, b) => sortKey(a).localeCompare(sortKey(b)));
  const sortedB = [...itemsB].sort((a, b) => sortKey(b).localeCompare(sortKey(b)));
  
  for (let i = 0; i < sortedA.length; i++) {
    const a = sortedA[i];
    const b = sortedB[i];
    const nameMatch = (a.name || '').trim().toLowerCase() === (b.name || '').trim().toLowerCase();
    const qtyMatch = Number(a.quantity) === Number(b.quantity);
    const priceMatch = Math.abs((Number(a.price) || 0) - (Number(b.price) || 0)) < 0.05;
    if (!nameMatch || !qtyMatch || !priceMatch) {
      return false;
    }
  }
  return true;
};

// Server-Side Price Recalculation & Privilege Segregation Helper
const sanitizeAndCalculateOrder = async (rawItems, priceMode, targetProductsColl, isStaffPOS, body = {}) => {
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    throw new Error("يجب أن يحتوي الطلب على صنف واحد على الأقل");
  }

  // Pre-fetch all products referenced in items
  const productIds = rawItems
    .map(i => i.productId)
    .filter(id => id && ObjectId.isValid(id))
    .map(id => new ObjectId(id));

  let dbProductsMap = new Map();
  if (productIds.length > 0) {
    const dbProducts = await targetProductsColl.find({ _id: { $in: productIds } }).toArray();
    dbProducts.forEach(p => dbProductsMap.set(p._id.toString(), p));
  }

  let computedTotal = 0;
  const sanitizedItems = rawItems.map(item => {
    const qty = Math.max(item.allowFloat ? 0.05 : 1, Number(item.quantity) || 1);
    let unitPrice = 0;

    const prodIdStr = item.productId ? item.productId.toString() : '';
    const dbProd = dbProductsMap.get(prodIdStr);

    if (dbProd) {
      if (isStaffPOS && typeof item.price === 'number' && !isNaN(item.price) && item.price >= 0) {
        // Staff POS can manually override prices or give line-item discounts
        unitPrice = Math.round(Number(item.price) * 100) / 100;
      } else {
        // Public orders strictly derive unit price from database catalog
        if (priceMode === 'bulk' && dbProd.price_bulk !== null && dbProd.price_bulk !== undefined && dbProd.price_bulk !== '') {
          unitPrice = Number(dbProd.price_bulk);
        } else if (dbProd.price_regular !== null && dbProd.price_regular !== undefined && dbProd.price_regular !== '') {
          unitPrice = Number(dbProd.price_regular);
        } else {
          unitPrice = Number(dbProd.price || 0);
        }
      }
    } else if (isStaffPOS) {
      // Staff POS can enter custom off-menu items
      unitPrice = Math.round(Number(item.price || 0) * 100) / 100;
    } else {
      // Public order referencing non-existent item
      unitPrice = 0;
    }

    unitPrice = Math.round(unitPrice * 100) / 100;
    computedTotal += unitPrice * qty;

    return {
      productId: item.productId && ObjectId.isValid(item.productId) ? new ObjectId(item.productId) : null,
      name: dbProd ? dbProd.name : (item.name || 'صنف غير محدد'),
      price: unitPrice,
      quantity: Math.round(qty * 100) / 100,
      allowFloat: !!item.allowFloat,
      notes: typeof item.notes === 'string' ? item.notes.slice(0, 500) : ''
    };
  });

  computedTotal = Math.round(computedTotal * 100) / 100;

  // Strict Privilege Segregation for financial fields
  let paidAmount = 0;
  let paymentStatus = 'unpaid';
  let paymentMethod = '';
  let status = 'pending';

  if (isStaffPOS) {
    const rawPaid = Number(body.paidAmount) || 0;
    paidAmount = Math.round(rawPaid * 100) / 100;
    if (body.paymentStatus && ['paid', 'partial', 'unpaid'].includes(body.paymentStatus)) {
      paymentStatus = body.paymentStatus;
    } else {
      paymentStatus = paidAmount >= computedTotal && computedTotal > 0 ? 'paid' : (paidAmount > 0 ? 'partial' : 'unpaid');
    }
    paymentMethod = typeof body.paymentMethod === 'string' ? body.paymentMethod.slice(0, 50) : '';
    if (body.status && ['pending', 'ready', 'received', 'cancelled'].includes(body.status)) {
      status = body.status;
    }
  }

  return {
    items: sanitizedItems,
    totalPrice: computedTotal,
    paidAmount,
    paymentStatus,
    paymentMethod,
    status
  };
};

// ============ ORDER SUBMISSION APIs ============



  return router;
};
