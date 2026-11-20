'use strict';

const {
  NotFoundError: DefaultNotFoundError,
  sendSafeError: defaultSendSafeError,
} = require('../../errors/AppError');

/**
 * Register diagnostic `/api/debug/*` endpoints using per-request collection getters.
 * Replaces N+1 `countDocuments` loops with a single `$group` aggregation.
 *
 * @param {import('express').Express} app
 * @param {{
 *   isDebugEnabled: () => boolean,
 *   getCollections: () => { categoriesCollection: any, productsCollection: any },
 *   middlewares: { checkMongoDB: Function, requireGlobalAdmin: Function },
 *   sendSafeError?: Function,
 *   NotFoundError?: typeof DefaultNotFoundError
 * }} deps
 */
function registerDebugRoutes(app, deps) {
  const {
    isDebugEnabled,
    getCollections,
    middlewares: { checkMongoDB, requireGlobalAdmin },
    sendSafeError = defaultSendSafeError,
    NotFoundError = DefaultNotFoundError,
  } = deps;

  const requireDebugRoutesEnabled = (req, res, next) => {
    if (!isDebugEnabled()) {
      return sendSafeError(
        res,
        req,
        new NotFoundError('نقطة النهاية غير متاحة في بيئة التشغيل الحالية', {
          code: 'DEBUG_ROUTES_DISABLED',
        })
      );
    }
    return next();
  };

  app.use('/api/debug', requireDebugRoutesEnabled);

  app.get('/api/debug/products-by-category', checkMongoDB, requireGlobalAdmin, async (req, res) => {
    try {
      const { categoriesCollection, productsCollection } = getCollections();
      const [categories, groupedCounts] = await Promise.all([
        categoriesCollection.find({}, { projection: { _id: 0, name: 1 } }).toArray(),
        productsCollection
          .aggregate([
            {
              $group: {
                _id: '$category',
                count: { $sum: 1 },
              },
            },
          ])
          .toArray(),
      ]);

      const countByCategory = new Map();
      let totalProducts = 0;
      for (const row of groupedCounts) {
        const count = Number(row.count) || 0;
        totalProducts += count;
        if (row._id !== null && row._id !== undefined) {
          countByCategory.set(String(row._id), count);
        }
      }

      const result = {};
      for (const cat of categories) {
        if (cat && cat.name !== undefined) {
          result[cat.name] = countByCategory.get(cat.name) || 0;
        }
      }

      return res.json({
        shop: 'shop1',
        categories: result,
        totalCategories: categories.length,
        totalProducts,
      });
    } catch (err) {
      return sendSafeError(res, req, err, { fallbackMessage: 'تعذر جلب إحصائيات التصنيفات' });
    }
  });

  app.get('/api/debug/purchase-types', checkMongoDB, requireGlobalAdmin, async (req, res) => {
    try {
      const { productsCollection } = getCollections();
      const [results, total] = await Promise.all([
        productsCollection
          .aggregate([
            {
              $group: {
                _id: '$purchaseType',
                count: { $sum: 1 },
              },
            },
            { $sort: { count: -1 } },
          ])
          .toArray(),
        productsCollection.countDocuments({}),
      ]);

      return res.json({
        purchaseTypeDistribution: results,
        total,
      });
    } catch (err) {
      return sendSafeError(res, req, err, { fallbackMessage: 'تعذر جلب توزيع أنواع الشراء' });
    }
  });

  app.get('/api/debug/subcategories', checkMongoDB, requireGlobalAdmin, async (req, res) => {
    try {
      const { productsCollection } = getCollections();
      const category = req.query.category;
      const query = category ? { category } : {};

      const [results, total] = await Promise.all([
        productsCollection
          .aggregate([
            { $match: query },
            {
              $group: {
                _id: '$subCategory',
                count: { $sum: 1 },
              },
            },
            { $sort: { count: -1 } },
          ])
          .toArray(),
        productsCollection.countDocuments(query),
      ]);

      return res.json({
        category: category || 'all',
        subCategories: results,
        total,
      });
    } catch (err) {
      return sendSafeError(res, req, err, { fallbackMessage: 'تعذر جلب التصنيفات الفرعية' });
    }
  });
}

module.exports = {
  registerDebugRoutes,
};
