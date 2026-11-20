'use strict';

const { round2 } = require('../../domain/pricing');
const { formatCanonicalLibyanPhone } = require('../../domain/phone');
const {
  summarizeEmployeeProduction,
  computeMonthlyPayoutSummary,
} = require('../../domain/payroll');
const { withOptionalTransaction } = require('../../infra/transactions');
const defaultLogger = require('../../infra/logger');

const DEFAULT_EMP_TX_LIMIT = 2000;
const MAX_EMP_TX_LIMIT = 2000;

function sessionOpts(session, extra = {}) {
  return session ? { ...extra, session } : extra;
}

function resolveBoundedLimit(rawLimit, defaultLimit, maxLimit) {
  if (rawLimit === undefined || rawLimit === null || rawLimit === '') {
    return defaultLimit;
  }
  const parsed = parseInt(String(rawLimit), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return defaultLimit;
  }
  return Math.min(parsed, maxLimit);
}

function buildEmployeeBranchScopeQuery(req, explicitBranch = null) {
  const userAccess = req.staffUser?.shopAccess || 'all';
  if (userAccess === 'shop1' || userAccess === 'shop2') {
    return { branch: { $in: [userAccess, 'all'] } };
  }
  if (explicitBranch === 'shop1' || explicitBranch === 'shop2') {
    return { branch: { $in: [explicitBranch, 'all'] } };
  }
  return {};
}

function isEmployeeInUserScope(emp, req) {
  if (!emp) return false;
  const userAccess = req.staffUser?.shopAccess || 'all';
  if (userAccess === 'all') return true;
  return emp.branch === userAccess || emp.branch === 'all';
}

function normalizeOptionalIsoDate(val) {
  if (typeof val !== 'string') return '';
  const s = val.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return '';
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  if (
    Number.isNaN(dt.getTime()) ||
    dt.getFullYear() !== y ||
    dt.getMonth() !== m - 1 ||
    dt.getDate() !== d
  ) {
    return '';
  }
  return s;
}

/**
 * Register Employees, Jobs, Chef Coefficients, Payroll Summary, Payout, and Transactions routes.
 * Evaluates MongoDB collections, `mongoClient`, and helpers dynamically per request.
 *
 * @param {import('express').Express} app
 * @param {{
 *   getCollections: () => Record<string, any>,
 *   getMongoClient: () => any,
 *   getNextEmpTxNumber: (session?: any) => Promise<number>,
 *   getOrderEffectiveDateStr: (order: any) => string,
 *   ObjectId: any,
 *   idempotencyGuard: Function,
 *   middlewares: { checkMongoDB: Function, checkStaff: Function, checkAdmin: Function },
 *   logger?: any
 * }} deps
 */
function registerEmployeeRoutes(app, deps) {
  const {
    getCollections,
    getMongoClient,
    getNextEmpTxNumber,
    getOrderEffectiveDateStr,
    ObjectId,
    idempotencyGuard,
    middlewares: { checkMongoDB, checkStaff, checkAdmin },
    logger = defaultLogger,
  } = deps;

  const computeChefProductMetricsForMonth = async (monthKey, session = null) => {
    const {
      productsCollection,
      productsCollection2,
      ordersCollection,
      ordersCollection2,
    } = getCollections();

    const monthStart = `${monthKey}-01`;
    const monthEnd = `${monthKey}-31`;
    const chefProductMetrics = {};

    const prodProj = {
      _id: 1,
      name: 1,
      category: 1,
      chefId: 1,
      chefName: 1,
      chefCoefficient: 1,
    };
    const ordProj = {
      _id: 0,
      deliveryDate: 1,
      receivedAt: 1,
      createdAt: 1,
      items: 1,
    };

    const readCatalogAndOrders = async () => {
      if (session) {
        const p1 = await productsCollection.find({}, { projection: prodProj, session }).toArray();
        const p2 = await productsCollection2.find({}, { projection: prodProj, session }).toArray();
        const o1 = await ordersCollection
          .find({ status: { $ne: 'cancelled' } }, { projection: ordProj, session })
          .toArray();
        const o2 = await ordersCollection2
          .find({ status: { $ne: 'cancelled' } }, { projection: ordProj, session })
          .toArray();
        return [p1, p2, o1, o2];
      }
      return Promise.all([
        productsCollection.find({}, { projection: prodProj }).toArray(),
        productsCollection2.find({}, { projection: prodProj }).toArray(),
        ordersCollection.find({ status: { $ne: 'cancelled' } }, { projection: ordProj }).toArray(),
        ordersCollection2.find({ status: { $ne: 'cancelled' } }, { projection: ordProj }).toArray(),
      ]);
    };

    const [prods1, prods2, ords1, ords2] = await readCatalogAndOrders();

    const initShopCatalog = (shopKey, prodsList) => {
      const prodMap = new Map();
      for (const p of prodsList) {
        const pid = String(p._id);
        const coeff = Number(p.chefCoefficient) || 0;
        const chefIdStr = p.chefId ? String(p.chefId) : '';
        prodMap.set(pid, {
          productId: pid,
          name: p.name || '',
          category: p.category || '',
          chefId: chefIdStr,
          chefName: p.chefName || '',
          chefCoefficient: coeff,
        });
        if (chefIdStr) {
          const cKey = `${shopKey}:${chefIdStr}`;
          if (!chefProductMetrics[cKey]) chefProductMetrics[cKey] = new Map();
          chefProductMetrics[cKey].set(pid, {
            shop: shopKey,
            productId: pid,
            productName: p.name || '',
            category: p.category || '',
            chefId: chefIdStr,
            chefName: p.chefName || '',
            soldQty: 0,
            totalSales: 0,
            chefCoefficient: coeff,
            chefEarnings: 0,
          });
        }
      }
      return prodMap;
    };

    const prodMap1 = initShopCatalog('shop1', prods1);
    const prodMap2 = initShopCatalog('shop2', prods2);

    const processOrders = (shopKey, ordList, prodMap) => {
      for (const order of ordList) {
        const effDate = getOrderEffectiveDateStr(order);
        if (!effDate || effDate < monthStart || effDate > monthEnd) continue;
        const items = Array.isArray(order.items) ? order.items : [];
        for (const item of items) {
          if (!item) continue;
          const pid = (item.productId || item._id || '').toString();
          const pInfo = prodMap.get(pid);
          if (!pInfo || !pInfo.chefId) continue;
          const qty = Number(item.quantity) || 0;
          const itemRev = (Number(item.price) || 0) * qty;
          const cKey = `${shopKey}:${pInfo.chefId}`;
          const targetMap = chefProductMetrics[cKey];
          if (targetMap && targetMap.has(pid)) {
            const rec = targetMap.get(pid);
            rec.soldQty += qty;
            rec.totalSales += itemRev;
          }
        }
      }
    };

    processOrders('shop1', ords1, prodMap1);
    processOrders('shop2', ords2, prodMap2);
    return chefProductMetrics;
  };

  // 1. Jobs CRUD
  app.get('/api/admin/employee-jobs', checkMongoDB, checkStaff, async (req, res) => {
    try {
      const { employeeJobsCollection, employeesCollection } = getCollections();
      const [jobs, empList] = await Promise.all([
        employeeJobsCollection.find().sort({ name: 1 }).toArray(),
        employeesCollection.find({}, { projection: { jobId: 1 } }).toArray(),
      ]);
      const countMap = {};
      for (const e of empList) {
        if (e.jobId) {
          const k = String(e.jobId);
          countMap[k] = (countMap[k] || 0) + 1;
        }
      }
      const enriched = jobs.map((j) => ({
        ...j,
        employeeCount: countMap[String(j._id)] || 0,
      }));
      return res.json(enriched);
    } catch (err) {
      logger.error('Fetch employee jobs error', { requestId: req.id, err });
      return res.status(500).json({ error: 'فشل في جلب قائمة الوظائف' });
    }
  });

  app.post('/api/admin/employee-jobs', checkMongoDB, checkAdmin, async (req, res) => {
    try {
      const { employeeJobsCollection } = getCollections();
      const { name, payType, description } = req.body || {};
      const cleanName = typeof name === 'string' ? name.trim() : '';
      if (!cleanName) {
        return res.status(400).json({ error: 'اسم الوظيفة مطلوب' });
      }
      if (!['fixed', 'production'].includes(payType)) {
        return res.status(400).json({ error: 'نوع احتساب الراتب غير صالح' });
      }
      const existing = await employeeJobsCollection.findOne({ name: cleanName });
      if (existing) {
        return res.status(400).json({ error: 'يوجد وظيفة بنفس هذا الاسم مسبقاً' });
      }
      const now = new Date();
      const doc = {
        name: cleanName,
        payType,
        description: typeof description === 'string' ? description.trim() : '',
        createdAt: now,
        updatedAt: now,
      };
      const result = await employeeJobsCollection.insertOne(doc);
      return res
        .status(201)
        .json({ success: true, job: { _id: result.insertedId, ...doc, employeeCount: 0 } });
    } catch (err) {
      logger.error('Create employee job error', { requestId: req.id, err });
      return res.status(500).json({ error: 'فشل في إضافة الوظيفة' });
    }
  });

  app.put('/api/admin/employee-jobs/:id', checkMongoDB, checkAdmin, async (req, res) => {
    try {
      const { employeeJobsCollection, employeesCollection, employeeTransactionsCollection } =
        getCollections();
      const { id } = req.params;
      if (!ObjectId.isValid(id)) {
        return res.status(400).json({ error: 'معرف الوظيفة غير صالح' });
      }
      const { name, payType, description } = req.body || {};
      const cleanName = typeof name === 'string' ? name.trim() : '';
      if (!cleanName) {
        return res.status(400).json({ error: 'اسم الوظيفة مطلوب' });
      }
      if (!['fixed', 'production'].includes(payType)) {
        return res.status(400).json({ error: 'نوع احتساب الراتب غير صالح' });
      }
      const jobObjId = new ObjectId(id);
      const conflict = await employeeJobsCollection.findOne({
        name: cleanName,
        _id: { $ne: jobObjId },
      });
      if (conflict) {
        return res.status(400).json({ error: 'يوجد وظيفة أخرى بنفس هذا الاسم' });
      }
      const now = new Date();
      const upd = await employeeJobsCollection.updateOne(
        { _id: jobObjId },
        {
          $set: {
            name: cleanName,
            payType,
            description: typeof description === 'string' ? description.trim() : '',
            updatedAt: now,
          },
        }
      );
      if (upd.matchedCount === 0) {
        return res.status(404).json({ error: 'الوظيفة غير موجودة' });
      }

      // Cascade job metadata changes to assigned employees safely
      const empCascadeSet = { jobName: cleanName, payType, updatedAt: now };
      if (payType === 'production') {
        empCascadeSet.salary = null;
      } else {
        empCascadeSet.linkedChefs = [];
      }
      await employeesCollection.updateMany({ jobId: jobObjId }, { $set: empCascadeSet });
      await employeeTransactionsCollection.updateMany(
        { jobId: jobObjId },
        { $set: { employeeJobName: cleanName } }
      );

      return res.json({ success: true });
    } catch (err) {
      logger.error('Update employee job error', { requestId: req.id, err });
      return res.status(500).json({ error: 'فشل في تحديث بيانات الوظيفة' });
    }
  });

  app.delete('/api/admin/employee-jobs/:id', checkMongoDB, checkAdmin, async (req, res) => {
    try {
      const { employeeJobsCollection, employeesCollection } = getCollections();
      const { id } = req.params;
      if (!ObjectId.isValid(id)) {
        return res.status(400).json({ error: 'معرف الوظيفة غير صالح' });
      }
      const jobObjId = new ObjectId(id);
      const assignedCount = await employeesCollection.countDocuments({ jobId: jobObjId });
      if (assignedCount > 0) {
        return res.status(400).json({
          error: `لا يمكن حذف هذه الوظيفة لوجود ${assignedCount} موظف مسجل عليها حالياً`,
        });
      }
      const del = await employeeJobsCollection.deleteOne({ _id: jobObjId });
      if (del.deletedCount === 0) {
        return res.status(404).json({ error: 'الوظيفة غير موجودة' });
      }
      return res.json({ success: true });
    } catch (err) {
      logger.error('Delete employee job error', { requestId: req.id, err });
      return res.status(500).json({ error: 'فشل في حذف الوظيفة' });
    }
  });

  // 2. Available Production Chefs for Linking to Producer Employees (Admin Only)
  app.get('/api/admin/employees/chefs-options', checkMongoDB, checkAdmin, async (req, res) => {
    try {
      const { chefsCollection, chefsCollection2 } = getCollections();
      const access = req.staffUser?.shopAccess || 'all';
      const [s1, s2] = await Promise.all([
        access === 'all' || access === 'shop1'
          ? chefsCollection.find({}, { projection: { _id: 1, name: 1, phone: 1 } }).sort({ name: 1 }).toArray()
          : Promise.resolve([]),
        access === 'all' || access === 'shop2'
          ? chefsCollection2.find({}, { projection: { _id: 1, name: 1, phone: 1 } }).sort({ name: 1 }).toArray()
          : Promise.resolve([]),
      ]);
      return res.json({
        shop1: s1.map((c) => ({
          shop: 'shop1',
          chefId: String(c._id),
          chefName: c.name,
          phone: c.phone || '',
        })),
        shop2: s2.map((c) => ({
          shop: 'shop2',
          chefId: String(c._id),
          chefName: c.name,
          phone: c.phone || '',
        })),
      });
    } catch (err) {
      logger.error('Fetch chef link options error', { requestId: req.id, err });
      return res.status(500).json({ error: 'فشل في جلب قائمة الشيفات' });
    }
  });

  // 3. Batch Update Per-Product Chef Coefficients (Admin Only)
  app.put('/api/admin/employees/chef-coefficients', checkMongoDB, checkAdmin, async (req, res) => {
    try {
      const { productsCollection, productsCollection2 } = getCollections();
      const { updates } = req.body || {};
      if (!Array.isArray(updates) || updates.length === 0) {
        return res.status(400).json({ error: 'لم يتم إرسال أي تعديلات للمعاملات' });
      }
      const userAccess = req.staffUser?.shopAccess || 'all';
      const opsShop1 = [];
      const opsShop2 = [];

      for (const u of updates) {
        if (!u || !u.productId || !ObjectId.isValid(u.productId)) continue;
        const targetShop = u.shop === 'shop2' ? 'shop2' : 'shop1';
        if (userAccess !== 'all' && userAccess !== targetShop) {
          return res.status(403).json({ error: 'ليس لديك صلاحية لتعديل معاملات أصناف هذا الفرع' });
        }
        const numVal = Number(u.chefCoefficient);
        const cleanCoeff =
          Number.isFinite(numVal) && numVal > 0 ? Math.round(numVal * 10000) / 10000 : 0;
        const op = {
          updateOne: {
            filter: { _id: new ObjectId(u.productId) },
            update: { $set: { chefCoefficient: cleanCoeff } },
          },
        };
        if (targetShop === 'shop2') opsShop2.push(op);
        else opsShop1.push(op);
      }

      if (opsShop1.length > 0) await productsCollection.bulkWrite(opsShop1);
      if (opsShop2.length > 0) await productsCollection2.bulkWrite(opsShop2);

      return res.json({ success: true, updatedCount: opsShop1.length + opsShop2.length });
    } catch (err) {
      logger.error('Update chef coefficients error', { requestId: req.id, err });
      return res.status(500).json({ error: 'فشل في حفظ معاملات الأصناف' });
    }
  });

  // 4. Monthly Employee & Payroll Summary (Admin sees full financial payroll; Cashier sees branch list + unsettled adjustments only)
  app.get('/api/admin/employees/summary', checkMongoDB, checkStaff, async (req, res) => {
    try {
      const { employeesCollection, employeeTransactionsCollection } = getCollections();
      const rawMonth = typeof req.query.month === 'string' ? req.query.month.trim() : '';
      const defaultMonth = new Date().toLocaleDateString('en-CA').slice(0, 7);
      const monthKey = /^\d{4}-\d{2}$/.test(rawMonth) ? rawMonth : defaultMonth;
      const requestedBranch =
        req.query.branch === 'shop1' ? 'shop1' : req.query.branch === 'shop2' ? 'shop2' : 'all';
      const isAdmin = req.staffUser?.role === 'admin';

      const empFilter = buildEmployeeBranchScopeQuery(req, requestedBranch);
      const txScopeFilter = buildEmployeeBranchScopeQuery(req, requestedBranch);

      const [employees, monthTxs] = await Promise.all([
        employeesCollection.find(empFilter).sort({ name: 1 }).toArray(),
        employeeTransactionsCollection
          .find({ ...txScopeFilter, monthKey })
          .sort({ date: -1, createdAt: -1 })
          .toArray(),
      ]);

      // Aggregate unsettled monthly bonuses / borrowings / penalties and settled payout totals by employeeId
      const txByEmp = {};
      for (const tx of monthTxs) {
        const eid = String(tx.employeeId);
        if (!txByEmp[eid]) {
          txByEmp[eid] = {
            bonusesTotal: 0,
            borrowingsTotal: 0,
            penaltiesTotal: 0,
            nonPayoutTxCount: 0,
            totalTxCount: 0,
            unsettledItems: [],
            payoutCount: 0,
            paidTotalThisMonth: 0,
            settledGrossTotal: 0,
            hasBaseSalarySettled: false,
            latestPayout: null,
          };
        }
        const bucket = txByEmp[eid];
        const amt = Number(tx.amount) || 0;
        bucket.totalTxCount += 1;

        if (tx.type === 'payout') {
          bucket.payoutCount += 1;
          bucket.paidTotalThisMonth += amt;
          bucket.settledGrossTotal += Number(tx.payoutDetails?.grossPaySettled) || 0;
          if (tx.payoutDetails?.settledBaseSalary) bucket.hasBaseSalarySettled = true;
          if (!bucket.latestPayout) bucket.latestPayout = tx;
        } else {
          bucket.nonPayoutTxCount += 1;
          if (!tx.settledByPayoutId) {
            if (tx.type === 'bonus') bucket.bonusesTotal += amt;
            else if (tx.type === 'borrowing') bucket.borrowingsTotal += amt;
            else if (tx.type === 'penalty') bucket.penaltiesTotal += amt;
            bucket.unsettledItems.push({
              _id: tx._id,
              txNumber: tx.txNumber,
              type: tx.type,
              amount: round2(amt),
              reason: tx.reason || '',
              date: tx.date || '',
            });
          }
        }
      }

      for (const eid of Object.keys(txByEmp)) {
        txByEmp[eid].unsettledItems.sort(
          (a, b) =>
            (a.date || '').localeCompare(b.date || '') ||
            (Number(a.txNumber) || 0) - (Number(b.txNumber) || 0)
        );
      }

      // For Cashiers: strip all sensitive salary / production earnings / payout details
      if (!isAdmin) {
        const safeEmployees = employees.map((e) => {
          const eid = String(e._id);
          const agg = txByEmp[eid] || {
            bonusesTotal: 0,
            borrowingsTotal: 0,
            penaltiesTotal: 0,
            nonPayoutTxCount: 0,
          };
          return {
            _id: e._id,
            name: e.name,
            phone: e.phone || '',
            branch: e.branch || 'shop1',
            jobId: e.jobId,
            jobName: e.jobName || '',
            payType: e.payType || 'fixed',
            active: e.active !== false,
            startDate: e.startDate || '',
            healthCertExpiry: e.healthCertExpiry || '',
            notes: e.notes || '',
            bonusesTotal: round2(agg.bonusesTotal),
            borrowingsTotal: round2(agg.borrowingsTotal),
            penaltiesTotal: round2(agg.penaltiesTotal),
            txCount: agg.nonPayoutTxCount,
          };
        });
        return res.json({ success: true, monthKey, isAdmin: false, employees: safeEmployees });
      }

      // Admin payroll calculation: aggregate monthly production sales per chef per product
      const hasProductionStaff = employees.some((e) => e.payType === 'production');
      const chefProductMetrics = hasProductionStaff
        ? await computeChefProductMetricsForMonth(monthKey)
        : {};

      let totalFixedSalaries = 0;
      let totalProductionPay = 0;
      let totalBonuses = 0;
      let totalBorrowings = 0;
      let totalPenalties = 0;
      let totalNetPay = 0;
      let totalPaidOut = 0;
      let activeCount = 0;

      const fullEmployees = employees.map((e) => {
        const eid = String(e._id);
        const agg = txByEmp[eid] || {
          bonusesTotal: 0,
          borrowingsTotal: 0,
          penaltiesTotal: 0,
          totalTxCount: 0,
          unsettledItems: [],
          payoutCount: 0,
          paidTotalThisMonth: 0,
          settledGrossTotal: 0,
          hasBaseSalarySettled: false,
          latestPayout: null,
        };
        const bonusesTotal = round2(agg.bonusesTotal);
        const borrowingsTotal = round2(agg.borrowingsTotal);
        const penaltiesTotal = round2(agg.penaltiesTotal);
        const isProduction = e.payType === 'production';

        // Preserve configured permanent salary on fixed staff so Modal 1 editing never zeros it out
        const configuredBaseSalary = isProduction ? null : round2(e.salary);
        const prod = isProduction
          ? summarizeEmployeeProduction(e, chefProductMetrics)
          : { productionTotalQty: 0, productionTotalSales: 0, productionGrossPay: 0, productBreakdown: [] };

        const rawProductionGrossPay = prod.productionGrossPay;
        const unpaidProductionPay = isProduction
          ? Math.max(0, round2(rawProductionGrossPay - agg.settledGrossTotal))
          : 0;
        const effectiveBaseSalary = isProduction
          ? 0
          : agg.hasBaseSalarySettled
            ? 0
            : configuredBaseSalary || 0;
        const effectiveGrossPay = isProduction ? unpaidProductionPay : effectiveBaseSalary;
        const netPay = round2(effectiveGrossPay + bonusesTotal - borrowingsTotal - penaltiesTotal);
        const paidTotalThisMonth = round2(agg.paidTotalThisMonth);
        const isMonthSettled =
          agg.payoutCount > 0 && effectiveGrossPay === 0 && agg.unsettledItems.length === 0;

        if (e.active !== false) {
          activeCount += 1;
          if (isProduction) totalProductionPay += unpaidProductionPay;
          else totalFixedSalaries += effectiveBaseSalary;
          totalBonuses += bonusesTotal;
          totalBorrowings += borrowingsTotal;
          totalPenalties += penaltiesTotal;
          totalNetPay += netPay;
          totalPaidOut += paidTotalThisMonth;
        }

        return {
          _id: e._id,
          name: e.name,
          phone: e.phone || '',
          branch: e.branch || 'shop1',
          jobId: e.jobId,
          jobName: e.jobName || '',
          payType: e.payType || 'fixed',
          salary: configuredBaseSalary,
          effectiveGrossPay,
          rawProductionGrossPay,
          linkedChefs: isProduction ? e.linkedChefs || [] : [],
          active: e.active !== false,
          startDate: e.startDate || '',
          healthCertExpiry: e.healthCertExpiry || '',
          notes: e.notes || '',
          productionTotalQty: prod.productionTotalQty,
          productionTotalSales: prod.productionTotalSales,
          productionGrossPay: unpaidProductionPay,
          productBreakdown: prod.productBreakdown,
          bonusesTotal,
          borrowingsTotal,
          penaltiesTotal,
          deductionsTotal: round2(borrowingsTotal + penaltiesTotal),
          unsettledItems: agg.unsettledItems,
          paidTotalThisMonth,
          payoutCountThisMonth: agg.payoutCount,
          hasBaseSalarySettled: agg.hasBaseSalarySettled,
          isMonthSettled,
          latestPayout: agg.latestPayout || null,
          txCount: agg.totalTxCount,
          netPay,
        };
      });

      return res.json({
        success: true,
        monthKey,
        isAdmin: true,
        employees: fullEmployees,
        kpis: {
          totalEmployees: fullEmployees.length,
          activeCount,
          totalFixedSalaries: round2(totalFixedSalaries),
          totalProductionPay: round2(totalProductionPay),
          totalBonuses: round2(totalBonuses),
          totalBorrowings: round2(totalBorrowings),
          totalPenalties: round2(totalPenalties),
          totalDeductions: round2(totalBorrowings + totalPenalties),
          totalPaidOut: round2(totalPaidOut),
          totalNetPay: round2(totalNetPay),
        },
      });
    } catch (err) {
      logger.error('Fetch employees summary error', { requestId: req.id, err });
      return res.status(500).json({ error: 'فشل في تحميل بيانات مسير الموظفين' });
    }
  });

  // 5. Employees CRUD (Admin Only)
  app.post('/api/admin/employees', checkMongoDB, checkAdmin, async (req, res) => {
    try {
      const { employeeJobsCollection, employeesCollection } = getCollections();
      const {
        name,
        phone,
        branch,
        jobId,
        salary,
        linkedChefs,
        active,
        notes,
        startDate,
        healthCertExpiry,
      } = req.body || {};
      const cleanName = typeof name === 'string' ? name.trim() : '';
      if (!cleanName) {
        return res.status(400).json({ error: 'اسم الموظف مطلوب' });
      }
      if (!jobId || !ObjectId.isValid(jobId)) {
        return res.status(400).json({ error: 'يرجى اختيار الوظيفة' });
      }
      const job = await employeeJobsCollection.findOne({ _id: new ObjectId(jobId) });
      if (!job) {
        return res.status(404).json({ error: 'الوظيفة المختارة غير موجودة' });
      }

      const userAccess = req.staffUser?.shopAccess || 'all';
      let resolvedBranch = ['shop1', 'shop2', 'all'].includes(branch) ? branch : 'shop1';
      if (userAccess !== 'all') {
        resolvedBranch = userAccess;
      }

      const cleanPhone = phone ? formatCanonicalLibyanPhone(phone) : '';
      const isProduction = job.payType === 'production';
      const resolvedSalary = isProduction ? null : Math.max(0, round2(salary));
      const resolvedLinks =
        isProduction && Array.isArray(linkedChefs)
          ? linkedChefs
              .filter((c) => c && c.chefId && (userAccess === 'all' || c.shop === userAccess))
              .map((c) => ({
                shop: c.shop === 'shop2' ? 'shop2' : 'shop1',
                chefId: String(c.chefId),
                chefName: String(c.chefName || '').trim(),
              }))
          : [];

      const now = new Date();
      const doc = {
        name: cleanName,
        phone: cleanPhone,
        branch: resolvedBranch,
        jobId: job._id,
        jobName: job.name,
        payType: job.payType,
        salary: resolvedSalary,
        linkedChefs: resolvedLinks,
        active: active !== false,
        startDate: normalizeOptionalIsoDate(startDate),
        healthCertExpiry: normalizeOptionalIsoDate(healthCertExpiry),
        notes: typeof notes === 'string' ? notes.trim().slice(0, 500) : '',
        createdAt: now,
        updatedAt: now,
      };
      const result = await employeesCollection.insertOne(doc);
      return res.status(201).json({ success: true, employee: { _id: result.insertedId, ...doc } });
    } catch (err) {
      logger.error('Create employee error', { requestId: req.id, err });
      return res.status(500).json({ error: 'فشل في إضافة الموظف' });
    }
  });

  app.put('/api/admin/employees/:id', checkMongoDB, checkAdmin, async (req, res) => {
    try {
      const { employeesCollection, employeeJobsCollection, employeeTransactionsCollection } =
        getCollections();
      const { id } = req.params;
      if (!ObjectId.isValid(id)) {
        return res.status(400).json({ error: 'معرف الموظف غير صالح' });
      }
      const existing = await employeesCollection.findOne({ _id: new ObjectId(id) });
      if (!existing) {
        return res.status(404).json({ error: 'الموظف غير موجود' });
      }
      if (!isEmployeeInUserScope(existing, req)) {
        return res.status(403).json({ error: 'ليس لديك صلاحية لتعديل موظف في فرع آخر' });
      }

      const {
        name,
        phone,
        branch,
        jobId,
        salary,
        linkedChefs,
        active,
        notes,
        startDate,
        healthCertExpiry,
      } = req.body || {};
      const cleanName = typeof name === 'string' ? name.trim() : '';
      if (!cleanName) {
        return res.status(400).json({ error: 'اسم الموظف مطلوب' });
      }
      if (!jobId || !ObjectId.isValid(jobId)) {
        return res.status(400).json({ error: 'يرجى اختيار الوظيفة' });
      }
      const job = await employeeJobsCollection.findOne({ _id: new ObjectId(jobId) });
      if (!job) {
        return res.status(404).json({ error: 'الوظيفة المختارة غير موجودة' });
      }

      const userAccess = req.staffUser?.shopAccess || 'all';
      let resolvedBranch = ['shop1', 'shop2', 'all'].includes(branch)
        ? branch
        : existing.branch || 'shop1';
      if (userAccess !== 'all') {
        resolvedBranch = userAccess;
      }

      const cleanPhone = phone ? formatCanonicalLibyanPhone(phone) : '';
      const isProduction = job.payType === 'production';
      const resolvedSalary = isProduction ? null : Math.max(0, round2(salary));
      const resolvedLinks =
        isProduction && Array.isArray(linkedChefs)
          ? linkedChefs
              .filter((c) => c && c.chefId && (userAccess === 'all' || c.shop === userAccess))
              .map((c) => ({
                shop: c.shop === 'shop2' ? 'shop2' : 'shop1',
                chefId: String(c.chefId),
                chefName: String(c.chefName || '').trim(),
              }))
          : [];

      const now = new Date();
      const updateSet = {
        name: cleanName,
        phone: cleanPhone,
        branch: resolvedBranch,
        jobId: job._id,
        jobName: job.name,
        payType: job.payType,
        salary: resolvedSalary,
        linkedChefs: resolvedLinks,
        active: active !== false,
        startDate:
          startDate !== undefined
            ? normalizeOptionalIsoDate(startDate)
            : existing.startDate || '',
        healthCertExpiry:
          healthCertExpiry !== undefined
            ? normalizeOptionalIsoDate(healthCertExpiry)
            : existing.healthCertExpiry || '',
        notes: typeof notes === 'string' ? notes.trim().slice(0, 500) : '',
        updatedAt: now,
      };
      await employeesCollection.updateOne({ _id: new ObjectId(id) }, { $set: updateSet });

      // Keep cached employee labels aligned in transaction ledger
      await employeeTransactionsCollection.updateMany(
        { employeeId: new ObjectId(id) },
        {
          $set: {
            employeeName: cleanName,
            employeePhone: cleanPhone,
            employeeJobName: job.name,
            branch: resolvedBranch,
          },
        }
      );

      return res.json({ success: true });
    } catch (err) {
      logger.error('Update employee error', { requestId: req.id, err });
      return res.status(500).json({ error: 'فشل في تحديث بيانات الموظف' });
    }
  });

  app.delete('/api/admin/employees/:id', checkMongoDB, checkAdmin, async (req, res) => {
    try {
      const { employeesCollection } = getCollections();
      const { id } = req.params;
      if (!ObjectId.isValid(id)) {
        return res.status(400).json({ error: 'معرف الموظف غير صالح' });
      }
      const existing = await employeesCollection.findOne({ _id: new ObjectId(id) });
      if (!existing) {
        return res.status(404).json({ error: 'الموظف غير موجود' });
      }
      if (!isEmployeeInUserScope(existing, req)) {
        return res.status(403).json({ error: 'ليس لديك صلاحية لحذف موظف في فرع آخر' });
      }
      await employeesCollection.deleteOne({ _id: new ObjectId(id) });
      return res.json({ success: true });
    } catch (err) {
      logger.error('Delete employee error', { requestId: req.id, err });
      return res.status(500).json({ error: 'فشل في حذف الموظف' });
    }
  });

  // 5b. Settle & Pay Employee Monthly Dues (Admin Only) — Resets month due to 0 and records payout invoice
  app.post(
    '/api/admin/employees/:id/payout',
    checkMongoDB,
    checkAdmin,
    idempotencyGuard,
    async (req, res) => {
      try {
        const { employeesCollection, employeeTransactionsCollection } = getCollections();
        const { id } = req.params;
        if (!ObjectId.isValid(id)) {
          return res.status(400).json({ error: 'معرف الموظف غير صالح' });
        }

        const { monthKey: rawMonth, date: rawDate, note } = req.body || {};
        const defaultMonth = new Date().toLocaleDateString('en-CA').slice(0, 7);
        const monthKey =
          typeof rawMonth === 'string' && /^\d{4}-\d{2}$/.test(rawMonth.trim())
            ? rawMonth.trim()
            : defaultMonth;

        const todayStr = new Date().toLocaleDateString('en-CA');
        const cleanDate =
          typeof rawDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(rawDate.trim())
            ? rawDate.trim()
            : todayStr;
        const cleanNote = typeof note === 'string' ? note.trim().slice(0, 600) : '';

        const outcome = await withOptionalTransaction(
          getMongoClient,
          async (session) => {
            const emp = await employeesCollection.findOne(
              { _id: new ObjectId(id) },
              sessionOpts(session)
            );
            if (!emp) {
              return { status: 404, body: { error: 'الموظف غير موجود' } };
            }
            if (!isEmployeeInUserScope(emp, req)) {
              return { status: 403, body: { error: 'ليس لديك صلاحية لصرف مستحقات موظف في فرع آخر' } };
            }

            const monthTxs = await employeeTransactionsCollection
              .find({ employeeId: emp._id, monthKey }, sessionOpts(session))
              .sort({ date: 1, createdAt: 1, txNumber: 1 })
              .toArray();

            const productionMetrics =
              emp.payType === 'production'
                ? await computeChefProductMetricsForMonth(monthKey, session)
                : {};

            const summary = computeMonthlyPayoutSummary({
              employee: emp,
              monthTransactions: monthTxs,
              productionMetrics,
            });

            if (!summary.ok) {
              return {
                status: 400,
                body: { error: summary.reason, code: summary.code },
              };
            }

            const txNumber = await getNextEmpTxNumber(session);
            const now = new Date();

            const payoutDoc = {
              txNumber,
              employeeId: emp._id,
              jobId: emp.jobId || null,
              employeeName: emp.name,
              employeePhone: emp.phone || '',
              employeeJobName: emp.jobName || '',
              branch: emp.branch || 'shop1',
              type: 'payout',
              amount: summary.totalPayReceived,
              reason: cleanNote || `تصفية وصرف مستحقات شهر ${monthKey}`,
              date: cleanDate,
              monthKey,
              payoutDetails: {
                payType: emp.payType || 'fixed',
                configuredBaseSalary: summary.configuredBaseSalary,
                settledBaseSalary: summary.settledBaseSalary,
                grossPaySettled: summary.grossPayToSettle,
                productionTotalQty: summary.productionTotalQty,
                bonusesTotal: summary.bonusesTotal,
                borrowingsTotal: summary.borrowingsTotal,
                penaltiesTotal: summary.penaltiesTotal,
                deductionsTotal: summary.deductionsTotal,
                totalPayReceived: summary.totalPayReceived,
                settledTxIds: summary.unsettledAdjustments.map((t) => t._id),
                settledTransactions: summary.settledTransactions,
              },
              recordedBy: {
                username: req.staffUser?.username || 'admin',
                name: req.staffUser?.name || req.staffUser?.username || 'المدير العام',
                role: 'admin',
              },
              createdAt: now,
            };

            const insertRes = await employeeTransactionsCollection.insertOne(
              payoutDoc,
              sessionOpts(session)
            );
            if (summary.unsettledAdjustments.length > 0) {
              await employeeTransactionsCollection.updateMany(
                { _id: { $in: summary.unsettledAdjustments.map((t) => t._id) } },
                { $set: { settledByPayoutId: insertRes.insertedId, settledAt: now } },
                sessionOpts(session)
              );
            }

            return {
              status: 201,
              body: { success: true, payout: { _id: insertRes.insertedId, ...payoutDoc } },
            };
          },
          logger
        );

        return res.status(outcome.status).json(outcome.body);
      } catch (err) {
        logger.error('Employee monthly payout error', { requestId: req.id, err });
        return res.status(500).json({ error: 'فشل في اعتماد وصرف مستحقات الموظف' });
      }
    }
  );

  // 6. Employee Transactions (Bonuses, Borrowings, Penalties & Admin Payouts with Receipt Re-access)
  app.get('/api/admin/employees/transactions', checkMongoDB, checkStaff, async (req, res) => {
    try {
      const { employeeTransactionsCollection } = getCollections();
      const { month, employeeId, type, branch, q, limit: limitParam } = req.query;
      const requestedBranch = branch === 'shop1' ? 'shop1' : branch === 'shop2' ? 'shop2' : 'all';
      const query = { ...buildEmployeeBranchScopeQuery(req, requestedBranch) };

      if (month && month !== 'all' && /^\d{4}-\d{2}$/.test(month)) {
        query.monthKey = month;
      }
      const isAdmin = req.staffUser?.role === 'admin';
      if (employeeId && ObjectId.isValid(employeeId)) {
        query.employeeId = new ObjectId(employeeId);
      }
      if (isAdmin) {
        if (type && ['bonus', 'borrowing', 'penalty', 'payout'].includes(type)) {
          query.type = type;
        }
      } else {
        query.type =
          type && ['bonus', 'borrowing', 'penalty'].includes(type)
            ? type
            : { $in: ['bonus', 'borrowing', 'penalty'] };
      }

      const effectiveLimit = resolveBoundedLimit(
        limitParam,
        DEFAULT_EMP_TX_LIMIT,
        MAX_EMP_TX_LIMIT
      );
      let list = await employeeTransactionsCollection
        .find(query)
        .sort({ date: -1, createdAt: -1 })
        .limit(effectiveLimit)
        .toArray();

      if (q && typeof q === 'string' && q.trim()) {
        const term = q.trim().toLowerCase().replace(/^#?emp-?/i, '');
        list = list.filter((tx) => {
          const txNumStr = String(tx.txNumber || '');
          const eName = (tx.employeeName || '').toLowerCase();
          const reasonStr = (tx.reason || '').toLowerCase();
          const recName = (tx.recordedBy?.name || '').toLowerCase();
          return (
            txNumStr.includes(term) ||
            eName.includes(term) ||
            reasonStr.includes(term) ||
            recName.includes(term)
          );
        });
      }

      return res.json({ success: true, transactions: list });
    } catch (err) {
      logger.error('Fetch employee transactions error', { requestId: req.id, err });
      return res.status(500).json({ error: 'فشل في جلب سجل عمليات الموظفين' });
    }
  });

  app.post('/api/admin/employees/transactions', checkMongoDB, checkStaff, async (req, res) => {
    try {
      const { employeesCollection, employeeTransactionsCollection } = getCollections();
      const { employeeId, type, amount, reason, date } = req.body || {};
      if (!employeeId || !ObjectId.isValid(employeeId)) {
        return res.status(400).json({ error: 'يرجى اختيار الموظف' });
      }
      if (!['bonus', 'borrowing', 'penalty'].includes(type)) {
        return res.status(400).json({ error: 'نوع العملية غير صالح' });
      }
      const cleanAmount = round2(amount);
      if (!Number.isFinite(cleanAmount) || cleanAmount <= 0) {
        return res.status(400).json({ error: 'المبلغ يجب أن يكون أكبر من صفر' });
      }
      const cleanReason = typeof reason === 'string' ? reason.trim() : '';
      if (!cleanReason) {
        return res.status(400).json({ error: 'يرجى إدخال السبب / البيان الخاص بالعملية' });
      }

      const emp = await employeesCollection.findOne({ _id: new ObjectId(employeeId) });
      if (!emp) {
        return res.status(404).json({ error: 'الموظف غير موجود' });
      }
      if (!isEmployeeInUserScope(emp, req)) {
        return res.status(403).json({ error: 'ليس لديك صلاحية لتسجيل عملية لموظف في فرع آخر' });
      }

      const todayStr = new Date().toLocaleDateString('en-CA');
      const cleanDate =
        typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date.trim()) ? date.trim() : todayStr;
      const monthKey = cleanDate.slice(0, 7);
      const txNumber = await getNextEmpTxNumber();
      const now = new Date();

      const txDoc = {
        txNumber,
        employeeId: emp._id,
        jobId: emp.jobId || null,
        employeeName: emp.name,
        employeePhone: emp.phone || '',
        employeeJobName: emp.jobName || '',
        branch: emp.branch || 'shop1',
        type,
        amount: cleanAmount,
        reason: cleanReason.slice(0, 600),
        date: cleanDate,
        monthKey,
        recordedBy: {
          username: req.staffUser?.username || 'staff',
          name: req.staffUser?.name || req.staffUser?.username || 'موظف',
          role: req.staffUser?.role === 'admin' ? 'admin' : 'order_manager',
        },
        createdAt: now,
      };

      const result = await employeeTransactionsCollection.insertOne(txDoc);
      return res
        .status(201)
        .json({ success: true, transaction: { _id: result.insertedId, ...txDoc } });
    } catch (err) {
      logger.error('Create employee transaction error', { requestId: req.id, err });
      return res.status(500).json({ error: 'فشل في تسجيل العملية المالية للموظف' });
    }
  });

  app.delete('/api/admin/employees/transactions/:id', checkMongoDB, checkAdmin, async (req, res) => {
    try {
      const { employeeTransactionsCollection } = getCollections();
      const { id } = req.params;
      if (!ObjectId.isValid(id)) {
        return res.status(400).json({ error: 'معرف العملية غير صالح' });
      }

      const outcome = await withOptionalTransaction(
        getMongoClient,
        async (session) => {
          const existingTx = await employeeTransactionsCollection.findOne(
            { _id: new ObjectId(id) },
            sessionOpts(session)
          );
          if (!existingTx) {
            return { status: 404, body: { error: 'العملية غير موجودة' } };
          }
          await employeeTransactionsCollection.deleteOne(
            { _id: existingTx._id },
            sessionOpts(session)
          );
          if (existingTx.type === 'payout') {
            await employeeTransactionsCollection.updateMany(
              { settledByPayoutId: existingTx._id },
              { $unset: { settledByPayoutId: '', settledAt: '' } },
              sessionOpts(session)
            );
          }
          return { status: 200, body: { success: true } };
        },
        logger
      );

      return res.status(outcome.status).json(outcome.body);
    } catch (err) {
      logger.error('Delete employee transaction error', { requestId: req.id, err });
      return res.status(500).json({ error: 'فشل في حذف العملية' });
    }
  });
}

module.exports = {
  registerEmployeeRoutes,
  buildEmployeeBranchScopeQuery,
  isEmployeeInUserScope,
  normalizeOptionalIsoDate,
  resolveBoundedLimit,
};
