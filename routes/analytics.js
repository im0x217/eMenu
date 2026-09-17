const express = require('express');

module.exports = function createAnalyticsRouter(context) {
  const router = express.Router();
  const { ObjectId } = require('mongodb');
  const { 
    checkMongoDB, checkAdmin, checkCustomerAuth, customerLimiter, 
    getNextOrderNumber, findCustomerByPhone, MONGO_URI,
    getOrderEffectiveDateStr, generateCustomerToken
  } = context;

router.get("/api/admin/analytics", checkMongoDB, checkAdmin, async (req, res) => {
  const shop = req.query.shop === "shop2" ? "shop2" : "shop1";
  
  let ordColl = shop === "shop2" ? ordersCollection2 : ordersCollection;
  let prodColl = shop === "shop2" ? productsCollection2 : productsCollection;
  
  let startDateStr = '', endDateStr = '';
  let startDateObj = null, endDateObj = null;

  if (req.query.startDate && req.query.endDate) {
    startDateStr = req.query.startDate.trim().slice(0, 10);
    endDateStr = req.query.endDate.trim().slice(0, 10);
    startDateObj = new Date(req.query.startDate);
    endDateObj = new Date(req.query.endDate);
    endDateObj.setHours(23, 59, 59, 999);
  } else {
    const today = new Date();
    endDateStr = today.toLocaleDateString('en-CA');
    endDateObj = new Date();
    const period = req.query.period || "30d";
    if (period === "7d") {
      const d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      startDateStr = d.toLocaleDateString('en-CA');
      startDateObj = d;
    } else if (period === "30d") {
      const d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      startDateStr = d.toLocaleDateString('en-CA');
      startDateObj = d;
    } else if (period === "today" || period === "1d") {
      startDateStr = endDateStr;
      startDateObj = new Date();
      startDateObj.setHours(0, 0, 0, 0);
    } else {
      startDateStr = '1970-01-01';
      startDateObj = new Date(0);
    }
  }
  
  try {
    // Fetch all successful/received orders
    const allSuccessfulOrders = await ordColl.find({ status: { $in: ["received", "completed"] } }).toArray();

    // Filter orders by effective receiving date (rec_date)
    const filteredOrdersList = allSuccessfulOrders.filter(order => {
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

    const matchingOrderIds = filteredOrdersList.map(o => o._id);
    const matchStage = { _id: { $in: matchingOrderIds } };
    
    // KPI Cards: Total Sales, Total Orders, Average Order Value (AOV), Active Customers
    const kpiSummary = await ordColl.aggregate([
      { $match: matchStage },
      { $group: {
          _id: null,
          totalRevenue: { $sum: "$totalPrice" },
          orderCount: { $sum: 1 },
          uniquePhones: { $addToSet: "$customerInfo.phone" }
      } }
    ]).toArray();
    
    const kpi = {
      totalRevenue: kpiSummary[0] ? kpiSummary[0].totalRevenue : 0,
      orderCount: kpiSummary[0] ? kpiSummary[0].orderCount : 0,
      avgOrderValue: kpiSummary[0] && kpiSummary[0].orderCount > 0 ? (kpiSummary[0].totalRevenue / kpiSummary[0].orderCount) : 0,
      activeCustomers: kpiSummary[0] ? kpiSummary[0].uniquePhones.length : 0
    };
    
    // Revenue trend by effective receiving date (rec_date)
    const trendMap = {};
    for (const ord of filteredOrdersList) {
      const effDate = getOrderEffectiveDateStr(ord);
      if (!effDate) continue;
      if (!trendMap[effDate]) {
        trendMap[effDate] = { date: effDate, revenue: 0, orders: 0 };
      }
      trendMap[effDate].revenue += Number(ord.totalPrice) || 0;
      trendMap[effDate].orders += 1;
    }
    const revenueTrend = Object.values(trendMap).sort((a, b) => a.date.localeCompare(b.date));
    
    // Price Mode split (bulk vs regular)
    const modes = await ordColl.aggregate([
      { $match: matchStage },
      { $group: {
          _id: "$priceMode",
          revenue: { $sum: "$totalPrice" },
          count: { $sum: 1 }
      } }
    ]).toArray();
    
    const priceModeSplit = {
      regular: { revenue: 0, count: 0 },
      bulk: { revenue: 0, count: 0 }
    };
    modes.forEach(m => {
      const key = m._id === "bulk" ? "bulk" : "regular";
      priceModeSplit[key] = { revenue: m.revenue, count: m.count };
    });
    // Payment Methods breakdown (Attributed by order effective receiving date - rec_date)
    const allShopPayments = await paymentsCollection.find({
      shop,
      isCancelled: { $ne: true },
      status: { $ne: 'cancelled' }
    }).toArray();

    const orderPaymentsMap = new Map();
    for (const p of allShopPayments) {
      if (Array.isArray(p.distributedTo)) {
        for (const d of p.distributedTo) {
          if (d.orderId) {
            const idStr = d.orderId.toString();
            if (!orderPaymentsMap.has(idStr)) {
              orderPaymentsMap.set(idStr, []);
            }
            orderPaymentsMap.get(idStr).push({
              method: p.method || 'cash',
              applied: Number(d.applied) || 0
            });
          }
        }
      }
    }

    const paymentMethodsSplit = {
      cash: { revenue: 0, count: 0 },
      card: { revenue: 0, count: 0 },
      bank_transfer: { revenue: 0, count: 0 }
    };

    for (const ord of filteredOrdersList) {
      const idStr = ord._id.toString();
      const paymentsForOrder = orderPaymentsMap.get(idStr);

      if (paymentsForOrder && paymentsForOrder.length > 0) {
        const seenMethodsInOrder = new Set();
        let totalAppliedFromPayments = 0;

        for (const p of paymentsForOrder) {
          const key = p.method === 'card' ? 'card' : (p.method === 'bank_transfer' ? 'bank_transfer' : 'cash');
          paymentMethodsSplit[key].revenue = Math.round((paymentMethodsSplit[key].revenue + p.applied) * 100) / 100;
          seenMethodsInOrder.add(key);
          totalAppliedFromPayments += p.applied;
        }

        for (const m of seenMethodsInOrder) {
          paymentMethodsSplit[m].count += 1;
        }

        const directPaidRemainder = Math.round(((Number(ord.paidAmount) || 0) - totalAppliedFromPayments) * 100) / 100;
        if (directPaidRemainder > 0.01) {
          const key = ord.paymentMethod === 'card' ? 'card' : (ord.paymentMethod === 'bank_transfer' ? 'bank_transfer' : 'cash');
          paymentMethodsSplit[key].revenue = Math.round((paymentMethodsSplit[key].revenue + directPaidRemainder) * 100) / 100;
          if (!seenMethodsInOrder.has(key)) {
            paymentMethodsSplit[key].count += 1;
          }
        }
      } else if ((Number(ord.paidAmount) || 0) > 0) {
        const key = ord.paymentMethod === 'card' ? 'card' : (ord.paymentMethod === 'bank_transfer' ? 'bank_transfer' : 'cash');
        const paid = Number(ord.paidAmount) || 0;
        paymentMethodsSplit[key].revenue = Math.round((paymentMethodsSplit[key].revenue + paid) * 100) / 100;
        paymentMethodsSplit[key].count += 1;
      }
    }

    // KPI total paid and total remaining (debt)
    const totalPaid = Math.round((paymentMethodsSplit.cash.revenue + paymentMethodsSplit.card.revenue + paymentMethodsSplit.bank_transfer.revenue) * 100) / 100;
    const totalRemaining = Math.max(0, Math.round(((kpi.totalRevenue || 0) - totalPaid) * 100) / 100);
    kpi.totalPaid = totalPaid;
    kpi.totalRemaining = totalRemaining;
    
    // Fetch all products for this shop to evaluate real-time availability in-memory
    const allShopProducts = await prodColl.find({}).toArray();
    const isProductAvailable = (p) => {
      if (!p) return false;
      if (p.available === false || p.available === "false" || p.available === 0 || p.available === "0") {
        return false;
      }
      return true;
    };

    const availableProducts = allShopProducts.filter(p => isProductAvailable(p));
    const availableProductIdsStr = availableProducts.map(p => p._id.toString());

    // Top products by quantity sold (excluding currently unavailable products at call time)
    const topProductsRaw = await ordColl.aggregate([
      { $match: matchStage },
      { $unwind: "$items" },
      { $group: {
          _id: "$items.productId",
          name: { $first: "$items.name" },
          quantity: { $sum: { $toDouble: "$items.quantity" } },
          revenue: { $sum: { $multiply: [{ $toDouble: "$items.price" }, { $toDouble: "$items.quantity" }] } }
      } },
      { $sort: { quantity: -1 } }
    ]).toArray();
    
    const topProductsFormatted = topProductsRaw
      .filter(p => p._id && availableProductIdsStr.includes(p._id.toString()))
      .slice(0, 10)
      .map(p => ({
        productId: p._id,
        name: p.name || "منتج مجهول",
        quantity: p.quantity,
        revenue: p.revenue
      }));
    
    // Top customers by spend
    const topCustomersRaw = await ordColl.aggregate([
      { $match: matchStage },
      { $group: {
          _id: "$customerInfo.phone",
          name: { $first: "$customerInfo.name" },
          totalSpent: { $sum: "$totalPrice" },
          orderCount: { $sum: 1 }
      } },
      { $sort: { totalSpent: -1 } },
      { $limit: 10 }
    ]).toArray();
    
    const topCustomers = topCustomersRaw.map(c => ({
      phone: c._id,
      name: c.name || "عميل مجهول",
      totalSpent: c.totalSpent,
      orderCount: c.orderCount
    }));
    
    // Category Sales breakdown
    const categoriesRaw = await ordColl.aggregate([
      { $match: matchStage },
      { $unwind: "$items" },
      { $lookup: {
          from: "products",
          localField: "items.productId",
          foreignField: "_id",
          as: "prod"
      } },
      { $unwind: { path: "$prod", preserveNullAndEmptyArrays: true } },
      { $group: {
          _id: { $ifNull: ["$prod.category", "غير مصنف"] },
          revenue: { $sum: { $multiply: [{ $toDouble: "$items.price" }, { $toDouble: "$items.quantity" }] } },
          count: { $sum: 1 }
      } },
      { $sort: { revenue: -1 } }
    ]).toArray();
    
    const categorySales = categoriesRaw.map(c => ({
      category: c._id,
      revenue: c.revenue,
      count: c.count
    }));
    
    // Top favorites count (excluding currently unavailable products at call time)
    const favCounts = await favoritesCollection.aggregate([
      { $match: { shop } },
      { $group: {
          _id: "$productId",
          count: { $sum: 1 }
      } },
      { $sort: { count: -1 } }
    ]).toArray();
    
    const favProdMap = {};
    availableProducts.forEach(p => {
      favProdMap[p._id.toString()] = p.name;
    });
    
    const topFavorites = favCounts
      .filter(f => favProdMap[f._id.toString()])
      .slice(0, 10)
      .map(f => ({
        name: favProdMap[f._id.toString()],
        count: f.count
      }));

    // Actionable Insights: Inactive Customers (not active in selected period)
    const inactiveFilterDate = (startDateObj && startDateObj.getTime() > 0) 
      ? startDateObj 
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const inactiveCustsRaw = await customersCollection.find({
      $or: [
        { lastActive: { $lt: inactiveFilterDate } },
        { lastActive: { $exists: false } },
        { lastActive: null }
      ]
    }).sort({ lastActive: -1 }).limit(10).toArray();
    const inactiveCustomers = inactiveCustsRaw.map(c => ({
      phone: c.phone,
      name: c.name || "عميل مجهول",
      lastActive: c.lastActive
    }));

    // Actionable Insights: Low Performing Products (currently AVAILABLE products with 0 sales in selected period)
    const soldProductIds = await ordColl.distinct("items.productId", matchStage);
    const soldProductIdsStr = soldProductIds.filter(id => id).map(id => id.toString());
    const lowPerformingProducts = availableProducts
      .filter(p => !soldProductIdsStr.includes(p._id.toString()))
      .slice(0, 10)
      .map(p => ({
        productId: p._id,
        name: p.name,
        category: p.category || "غير مصنف",
        price: p.price
      }));
    
    res.json({
      kpi,
      revenueTrend,
      priceModeSplit,
      paymentMethodsSplit,
      topProducts: topProductsFormatted,
      topCustomers,
      categorySales,
      topFavorites,
      inactiveCustomers,
      lowPerformingProducts
    });
    
  } catch (err) {
    console.error("Aggregation analytics error:", err);
    res.status(500).json({ error: "Failed to generate analytics" });
  }
});

// ============ INTERACTION TELEMETRY & BEHAVIORAL ANALYTICS ============
// Public ingestion endpoint for anonymous client interaction telemetry (inspired by UX Datasets: 03_interaction_telemetry)
router.post("/api/telemetry/batch", async (req, res) => {
  if (!mongoConnected || !telemetryCollection) {
    return res.status(200).json({ success: false, reason: "Database initializing" });
  }

  try {
    const { sessionId, events } = req.body || {};
    if (!events || !Array.isArray(events) || events.length === 0) {
      return res.status(200).json({ success: true, count: 0 });
    }

    const safeSessionId = typeof sessionId === 'string' ? sessionId.slice(0, 64) : 'unknown';
    const now = new Date();

    // Map and sanitize each event (limit batch to 50 max to prevent abuse)
    const docs = events.slice(0, 50).map(evt => {
      let evtDate = now;
      if (evt.timestamp) {
        const parsed = new Date(evt.timestamp);
        if (!isNaN(parsed.getTime())) evtDate = parsed;
      }

      return {
        sessionId: safeSessionId,
        event: typeof evt.event === 'string' ? evt.event.slice(0, 40) : 'unknown',
        shop: evt.shop === 'shop2' ? 'shop2' : 'shop1',
        device: evt.device === 'tablet' ? 'tablet' : evt.device === 'desktop' ? 'desktop' : 'mobile',
        timestamp: evtDate,
        viewportWidth: typeof evt.viewportWidth === 'number' ? evt.viewportWidth : null,
        metadata: evt.metadata && typeof evt.metadata === 'object' ? evt.metadata : {}
      };
    });

    if (docs.length > 0) {
      await telemetryCollection.insertMany(docs, { ordered: false });
    }

    res.status(200).json({ success: true, count: docs.length });
  } catch (err) {
    // Non-blocking response for client telemetry
    res.status(200).json({ success: false, error: err.message });
  }
});

// Admin UX Insights aggregation endpoint
router.get("/api/admin/telemetry/insights", checkMongoDB, checkAdmin, async (req, res) => {
  try {
    const shop = req.query.shop;
    const days = parseInt(req.query.days, 10) || 7;
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const matchFilter = { timestamp: { $gte: cutoff } };
    if (shop === "shop1" || shop === "shop2") {
      matchFilter.shop = shop;
    }

    // 1. Funnel & Session Conversion Aggregation
    const funnelPipeline = [
      { $match: matchFilter },
      {
        $group: {
          _id: "$sessionId",
          events: { $addToSet: "$event" },
          device: { $first: "$device" }
        }
      },
      {
        $project: {
          hasPageView: { $in: ["page_view", "$events"] },
          hasCartAdd: { $in: ["cart_add", "$events"] },
          hasCheckout: { $in: ["checkout_step", "$events"] },
          hasOrder: { $in: ["order_complete", "$events"] },
          device: 1
        }
      }
    ];

    const sessionData = await telemetryCollection.aggregate(funnelPipeline).toArray();

    let totalSessions = 0;
    let cartSessions = 0;
    let checkoutSessions = 0;
    let orderSessions = 0;
    const deviceCounts = { mobile: 0, tablet: 0, desktop: 0 };

    for (const s of sessionData) {
      totalSessions++;
      if (s.hasCartAdd) cartSessions++;
      if (s.hasCheckout) checkoutSessions++;
      if (s.hasOrder) orderSessions++;
      if (s.device && deviceCounts[s.device] !== undefined) {
        deviceCounts[s.device]++;
      } else {
        deviceCounts.mobile++;
      }
    }

    // Rates calculation
    const conversionRate = totalSessions > 0 ? Math.round((orderSessions / totalSessions) * 1000) / 10 : 0;
    const cartConversionRate = cartSessions > 0 ? Math.round((orderSessions / cartSessions) * 1000) / 10 : 0;
    const cartAbandonmentRate = cartSessions > 0 ? Math.round(((cartSessions - orderSessions) / cartSessions) * 1000) / 10 : 0;

    // 2. Top Engaged Categories by Selection
    const categoryPipeline = [
      {
        $match: {
          ...matchFilter,
          event: "category_select",
          "metadata.categoryName": { $exists: true, $ne: "" }
        }
      },
      {
        $group: {
          _id: "$metadata.categoryName",
          interactions: { $sum: 1 }
        }
      },
      { $sort: { interactions: -1 } },
      { $limit: 6 }
    ];

    const topCategories = await telemetryCollection.aggregate(categoryPipeline).toArray();

    // 3. Average Product Dwell Time
    const dwellPipeline = [
      {
        $match: {
          ...matchFilter,
          event: "product_dwell",
          "metadata.dwellMs": { $exists: true, $gt: 0 }
        }
      },
      {
        $group: {
          _id: null,
          avgDwellMs: { $avg: "$metadata.dwellMs" },
          sampleCount: { $sum: 1 }
        }
      }
    ];

    const dwellResult = await telemetryCollection.aggregate(dwellPipeline).toArray();
    const avgDwellSeconds = dwellResult.length > 0 && dwellResult[0].avgDwellMs
      ? Math.round(dwellResult[0].avgDwellMs / 100) / 10
      : 0;

    res.json({
      success: true,
      periodDays: days,
      funnel: {
        totalSessions,
        cartSessions,
        checkoutSessions,
        orderSessions,
        conversionRate,
        cartConversionRate,
        cartAbandonmentRate
      },
      devices: deviceCounts,
      topCategories: topCategories.map(c => ({ name: c._id, interactions: c.interactions })),
      avgDwellSeconds
    });
  } catch (err) {
    console.error("Telemetry insights aggregation error:", err);
    res.status(500).json({ success: false, error: "Failed to generate UX insights" });
  }
});

// ============ ADMIN REPORTS EXPORT API ============
router.get("/api/admin/reports/export", checkMongoDB, checkAdmin, async (req, res) => {
  const shop = req.query.shop === "shop2" ? "shop2" : "shop1";
  const type = req.query.type || "orders"; // "orders" | "products" | "customers"
  
  let ordColl = shop === "shop2" ? ordersCollection2 : ordersCollection;
  
  let startDate, endDate;
  if (req.query.startDate && req.query.endDate) {
    startDate = new Date(req.query.startDate);
    endDate = new Date(req.query.endDate);
    endDate.setHours(23, 59, 59, 999);
  } else {
    endDate = new Date();
    const period = req.query.period || "30d";
    if (period === "7d") {
      startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    } else if (period === "30d") {
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    } else {
      startDate = new Date(0);
    }
  }
  
  const matchStage = { createdAt: { $gte: startDate, $lte: endDate }, status: { $in: ["received", "completed"] } };
  
  function escapeCSV(val) {
    if (val === null || val === undefined) return "";
    let str = String(val);
    if (str.includes(",") || str.includes("\"") || str.includes("\n") || str.includes("\r")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }
  
  try {
    if (type === "orders") {
      const orders = await ordColl.find(matchStage).sort({ createdAt: -1 }).toArray();
      let csv = "\uFEFF"; // UTF-8 BOM for Excel support
      csv += "رقم الطلب,التاريخ,اسم العميل,رقم الهاتف,طريقة التسعير,تاريخ التوصيل,الإجمالي,الحالة,المنتجات\n";
      orders.forEach(o => {
        const itemsSummary = o.items.map(item => `${item.name} (x${item.quantity})`).join(" | ");
        csv += `${escapeCSV(o._id)},${escapeCSV(o.createdAt.toISOString())},${escapeCSV(o.customerInfo.name)},${escapeCSV(o.customerInfo.phone)},${escapeCSV(o.priceMode)},${escapeCSV(o.deliveryDate)},${escapeCSV(o.totalPrice)},${escapeCSV(o.status)},${escapeCSV(itemsSummary)}\n`;
      });
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="orders-report-${shop}.csv"`);
      return res.status(200).send(csv);
    } else if (type === "products") {
      const topProducts = await ordColl.aggregate([
        { $match: matchStage },
        { $unwind: "$items" },
        { $group: {
            _id: "$items.productId",
            name: { $first: "$items.name" },
            quantity: { $sum: { $toDouble: "$items.quantity" } },
            revenue: { $sum: { $multiply: [{ $toDouble: "$items.price" }, { $toDouble: "$items.quantity" }] } }
        } },
        { $sort: { quantity: -1 } }
      ]).toArray();
      
      let csv = "\uFEFF";
      csv += "معرف المنتج,اسم المنتج,الكمية المباعة,إجمالي الإيرادات\n";
      topProducts.forEach(p => {
        csv += `${escapeCSV(p._id)},${escapeCSV(p.name)},${escapeCSV(p.quantity)},${escapeCSV(p.revenue)}\n`;
      });
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="products-report-${shop}.csv"`);
      return res.status(200).send(csv);
    } else if (type === "customers") {
      const topCustomersRaw = await ordColl.aggregate([
        { $match: matchStage },
        { $group: {
            _id: "$customerInfo.phone",
            name: { $first: "$customerInfo.name" },
            totalSpent: { $sum: "$totalPrice" },
            orderCount: { $sum: 1 }
        } },
        { $sort: { totalSpent: -1 } }
      ]).toArray();
      
      let csv = "\uFEFF";
      csv += "رقم الهاتف,اسم العميل,إجمالي الإنفاق,عدد الطلبات\n";
      topCustomersRaw.forEach(c => {
        csv += `${escapeCSV(c._id)},${escapeCSV(c.name)},${escapeCSV(c.totalSpent)},${escapeCSV(c.orderCount)}\n`;
      });
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="customers-report-${shop}.csv"`);
      return res.status(200).send(csv);
    }
  } catch (err) {
    console.error("Export report error:", err);
    res.status(500).json({ error: "Failed to export report" });
  }
});

// ============ ADMIN ORDERS & CUSTOMERS APIs ============

// Get all orders for the admin panel
router.get("/api/admin/reports/export", checkMongoDB, checkAdmin, async (req, res) => {
  const shop = req.query.shop === "shop2" ? "shop2" : "shop1";
  const type = req.query.type;
  const period = req.query.period;
  const startDate = req.query.startDate;
  const endDate = req.query.endDate;

  const ordColl = shop === "shop2" ? ordersCollection2 : ordersCollection;

  try {
    let dateFilter = {};
    if (period === 'custom') {
      if (startDate && endDate) {
        dateFilter = {
          createdAt: {
            $gte: new Date(startDate),
            $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999))
          }
        };
      }
    } else {
      const now = new Date();
      let days = 30;
      if (period === '1d') days = 1;
      else if (period === '7d') days = 7;
      
      const cutoff = new Date(now.setDate(now.getDate() - days));
      dateFilter = { createdAt: { $gte: cutoff } };
    }

    let csvContent = "";
    let fileName = `report_${type}_${period}.csv`;

    if (type === "orders") {
      const list = await ordColl.find(dateFilter).sort({ createdAt: -1 }).toArray();
      const headers = ['رقم الطلب', 'التاريخ', 'اسم العميل', 'رقم الهاتف', 'الإجمالي (د.ل)', 'طريقة التسعير', 'الحالة', 'المنتجات المطلوبة'];
      const rows = list.map(o => [
        o._id.toString(),
        o.createdAt ? new Date(o.createdAt).toLocaleString('ar-LY') : '',
        o.customerInfo ? o.customerInfo.name : '',
        o.customerInfo ? o.customerInfo.phone : '',
        o.totalPrice || 0,
        o.priceMode === 'bulk' ? 'جملة' : 'مفرد',
        o.status === 'received' ? 'تم الاستلام' : o.status === 'completed' ? 'مكتمل' : o.status === 'ready' ? 'جاهز للاستلام' : o.status === 'cancelled' ? 'ملغي' : 'قيد الانتظار',
        o.items ? o.items.map(i => `${i.name} (x${i.quantity})`).join(' | ') : ''
      ]);
      csvContent = arrayToCSV(headers, rows);
      fileName = `تقرير_الطلبات_${shop}_${period}.csv`;

    } else if (type === "products") {
      const completedOrders = await ordColl.find({ ...dateFilter, status: { $in: ['received', 'completed'] } }).toArray();
      const salesMap = {};
      for (const order of completedOrders) {
        if (!order.items) continue;
        for (const item of order.items) {
          const key = item.productId ? item.productId.toString() : item.name;
          if (!salesMap[key]) {
            salesMap[key] = {
              name: item.name,
              quantity: 0,
              revenue: 0
            };
          }
          salesMap[key].quantity += Number(item.quantity || 0);
          salesMap[key].revenue += Number(item.price || 0) * Number(item.quantity || 0);
        }
      }

      const prodColl = shop === "shop2" ? productsCollection2 : productsCollection;
      const allProducts = await prodColl.find().toArray();
      const headers = ['اسم المنتج', 'الفئة', 'الفئة الفرعية', 'سعر المفرد (د.ل)', 'سعر الجملة (د.ل)', 'الكمية المباعة', 'إجمالي الإيرادات (د.ل)'];
      const rows = [];
      for (const key in salesMap) {
        const sale = salesMap[key];
        const prodInfo = allProducts.find(p => p._id.toString() === key || p.name === sale.name);
        rows.push([
          sale.name,
          prodInfo ? prodInfo.category : 'غير معروف',
          prodInfo ? (prodInfo.subcategory || '') : '',
          prodInfo ? (prodInfo.price_regular || '') : '',
          prodInfo ? (prodInfo.price_bulk || '') : '',
          sale.quantity,
          sale.revenue.toFixed(2)
        ]);
      }
      rows.sort((a, b) => b[6] - a[6]);
      csvContent = arrayToCSV(headers, rows);
      fileName = `أداء_المنتجات_${shop}_${period}.csv`;

    } else if (type === "customers") {
      const customers = await customersCollection.find().toArray();
      const headers = ['اسم العميل', 'رقم الهاتف', 'تاريخ التسجيل', 'آخر نشاط', 'عدد الطلبات الناجحة', 'إجمالي المشتريات (د.ل)', 'عدد المنتجات المفضلة'];

      // Batch fetch all orders stats by phone
      const allOrderStats = await ordColl.aggregate([
        { $match: { status: { $in: ["received", "completed"] }, ...dateFilter } },
        { $group: {
            _id: "$customerInfo.phone",
            totalSpent: { $sum: "$totalPrice" },
            orderCount: { $sum: 1 }
        } }
      ]).toArray();
      
      // Batch fetch all favorites by phone for the active shop
      const allFavsCount = await favoritesCollection.aggregate([
        { $match: { shop } },
        { $group: { _id: "$phone", count: { $sum: 1 } } }
      ]).toArray();
      
      const statsMap = {};
      for (const stat of allOrderStats) {
        if (stat._id) statsMap[stat._id] = stat;
      }
      
      const favsMap = {};
      for (const fav of allFavsCount) {
        if (fav._id) favsMap[fav._id] = fav.count;
      }

      const rows = customers.map(cust => {
        const phone = cust.phone;
        const stats = statsMap[phone] || { totalSpent: 0, orderCount: 0 };
        const favCount = favsMap[phone] || 0;

        return [
          cust.name || '',
          cust.phone || '',
          cust.createdAt ? new Date(cust.createdAt).toLocaleDateString('ar-LY') : '',
          cust.lastActive ? new Date(cust.lastActive).toLocaleString('ar-LY') : '',
          stats.orderCount,
          stats.totalSpent.toFixed(2),
          favCount
        ];
      });
      rows.sort((a, b) => b[5] - a[5]);
      csvContent = arrayToCSV(headers, rows);
      fileName = `تقرير_العملاء_${shop}_${period}.csv`;
    }

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(fileName)}"`);
    res.send(csvContent);

  } catch (err) {
    console.error("Export report error:", err);
    res.status(500).json({ error: "Failed to generate CSV export" });
  }
});

// Helper function to format CSV cleanly with Excel compatibility
function arrayToCSV(headers, rows) {
  const formatCell = val => {
    if (val === undefined || val === null) return '';
    let stringVal = String(val);
    if (stringVal.includes(',') || stringVal.includes('\n') || stringVal.includes('"')) {
      stringVal = `"${stringVal.replace(/"/g, '""')}"`;
    }
    return stringVal;
  };
  
  const csvRows = [headers.map(formatCell).join(',')];
  for (const row of rows) {
    csvRows.push(row.map(formatCell).join(','));
  }
  return '\uFEFF' + csvRows.join('\r\n');
}

// ============ CUSTOMER AUTHENTICATION & PASSWORD APIs ============

// Register new customer account


  return router;
};
