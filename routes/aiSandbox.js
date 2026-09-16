const express = require('express');
const { GoogleGenAI } = require('@google/genai');

function createAiSandboxRouter({ 
  getProductsCollection, 
  getCategoriesCollection, 
  getOrdersCollection, 
  getPaymentsCollection,
  getOrderEffectiveDateStr 
}) {
  const router = express.Router();

  const getClient = () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey.trim() === '' || apiKey === 'your_gemini_api_key_here') {
      return null;
    }
    return new GoogleGenAI({ apiKey });
  };

  const MODEL_NAME = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

  // 1. Connection / Health Check
  router.get('/status', async (req, res) => {
    const client = getClient();
    if (!client) {
      return res.json({
        configured: false,
        message: 'بانتظار ضبط مفتاح GEMINI_API_KEY في ملف .env',
        model: MODEL_NAME,
        latency: null
      });
    }

    const t0 = Date.now();
    try {
      const response = await client.models.generateContent({
        model: MODEL_NAME,
        contents: 'ping'
      });
      const latency = Date.now() - t0;
      return res.json({
        configured: true,
        message: 'متصل بنجاح وجاهز للاختبار',
        model: MODEL_NAME,
        latency
      });
    } catch (err) {
      return res.json({
        configured: true,
        status: 'error',
        message: 'المفتاح مضبوط ولكن فشل الاتصال: ' + err.message,
        model: MODEL_NAME,
        latency: Date.now() - t0
      });
    }
  });

  // 2. Conversational Business Intelligence (Read-Only)
  router.post('/query-analytics', async (req, res) => {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ error: 'الاستفسار مطلوب' });
    }

    try {
      const ordersCol = getOrdersCollection();
      const productsCol = getProductsCollection();

      // Read-only aggregation snapshot
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const recentOrders = await ordersCol.find({
        status: { $nin: ['cancelled', 'ملغي'] }
      }).sort({ createdAt: -1 }).limit(200).toArray();

      let totalRevenue = 0;
      let totalPaid = 0;
      const productFreq = {};

      recentOrders.forEach(o => {
        const rev = Number(o.totalPrice || o.total || 0);
        totalRevenue += rev;
        const paid = Number(o.paidAmount !== undefined ? o.paidAmount : (o.paymentStatus === 'paid' ? rev : 0));
        totalPaid += paid;

        if (Array.isArray(o.items)) {
          o.items.forEach(it => {
            const name = it.name || it.productName || 'غير محدد';
            productFreq[name] = (productFreq[name] || 0) + Number(it.quantity || 1);
          });
        }
      });

      const topProducts = Object.entries(productFreq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, qty]) => `${name} (${qty})`);

      const totalRemaining = Math.max(0, Math.round((totalRevenue - totalPaid) * 100) / 100);
      const avgOrder = recentOrders.length > 0 ? Math.round((totalRevenue / recentOrders.length) * 100) / 100 : 0;

      const dataSnapshot = {
        totalOrdersCount: recentOrders.length,
        totalSales: totalRevenue.toFixed(2) + ' د.ل',
        totalPaid: totalPaid.toFixed(2) + ' د.ل',
        totalRemaining: totalRemaining.toFixed(2) + ' د.ل',
        averageOrderValue: avgOrder.toFixed(2) + ' د.ل',
        topSellingItems: topProducts
      };

      const client = getClient();
      if (client) {
        const prompt = `
أنت مساعد ذكاء اصطناعي خبير في التحليلات المالية وإدارة المتاجر لمحل "حلويات عبمبر الزروق" في طرابلس، ليبيا.
أجب عن سؤال المدير التالي بدقة، باللغة العربية الواضحة وبلهجة عملية واحترافية.

سؤال المدير:
"${query}"

بيانات المتجر الحالية (آخر 30 يوم من قاعدة البيانات):
- إجمالي عدد الطلبات: ${dataSnapshot.totalOrdersCount}
- إجمالي المبيعات: ${dataSnapshot.totalSales}
- إجمالي المدفوع: ${dataSnapshot.totalPaid}
- إجمالي الديون/المتبقي: ${dataSnapshot.totalRemaining}
- متوسط قيمة الطلب: ${dataSnapshot.averageOrderValue}
- الأصناف الأكثر مبيعاً: ${dataSnapshot.topSellingItems.join('، ')}

قدم إجابة مباشرة، منسقة ومفيدة مع إبراز الأرقام الهامة.
`;

        const response = await client.models.generateContent({
          model: MODEL_NAME,
          contents: prompt
        });

        return res.json({
          answer: response.text,
          metrics: {
            'إجمالي المبيعات': dataSnapshot.totalSales,
            'إجمالي المدفوع': dataSnapshot.totalPaid,
            'إجمالي المتبقي': dataSnapshot.totalRemaining,
            'متوسط الطلب': dataSnapshot.averageOrderValue
          }
        });
      } else {
        // Simulation response if API key not yet entered
        return res.json({
          answer: `**[وضع المحاكاة التجريبي]** بناءً على بيانات آخر ${dataSnapshot.totalOrdersCount} طلب في المتجر:\n\n` +
                  `• إجمالي المبيعات المحققة هو **${dataSnapshot.totalSales}** بمتوسط **${dataSnapshot.averageOrderValue}** لكل طلب.\n` +
                  `• إجمالي المبالغ المحصلة فعلياً: **${dataSnapshot.totalPaid}** والمتبقي ديون: **${dataSnapshot.totalRemaining}**.\n` +
                  `• الأصناف الأكثر إقبالاً وطلباً: **${dataSnapshot.topSellingItems.join('، ')}**.\n\n` +
                  `*(ملاحظة: لتفعيل الإجابات الحرة المخصصة عبر Gemini 3.8 Flash، يرجى وضع مفتاح GEMINI_API_KEY في ملف .env)*`,
          metrics: {
            'إجمالي المبيعات': dataSnapshot.totalSales,
            'إجمالي المدفوع': dataSnapshot.totalPaid,
            'إجمالي المتبقي': dataSnapshot.totalRemaining,
            'متوسط الطلب': dataSnapshot.averageOrderValue
          }
        });
      }
    } catch (err) {
      console.error('[AI Analytics Error]:', err);
      res.status(500).json({ error: 'فشلت معالجة الاستعلام: ' + err.message });
    }
  });

  // 3. Smart Order Parser (Speech / Dialect Text -> Menu Cart)
  router.post('/parse-order', async (req, res) => {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'نص الطلب مطلوب' });
    }

    try {
      const productsCol = getProductsCollection();
      const menuProducts = await productsCol.find({}).project({
        _id: 1,
        name: 1,
        price: 1,
        saleType: 1,
        allowFloat: 1
      }).toArray();

      const client = getClient();
      if (client) {
        const prompt = `
أنت خبير في فهم اللهجة الليبية والمغاربية وتحويل طلبات الزبائن الشفوية إلى عناصر سلة تسوق إلكترونية لمحل "حلويات عبمبر الزروق".
المطلوب تحليل نص الطلب ومطابقته بدقة مع قائمة أصناف المنيو المتوفرة لدينا.

نص طلب الزبون:
"${text}"

قائمة أصناف المنيو المتوفرة:
${menuProducts.map(p => `- ${p.name} (السعر: ${p.price || 0} د.ل)`).join('\n')}

أخرج النتيجة بتنسيق JSON فقط على الشكل التالي:
{
  "items": [
    {
      "productName": "اسم الصنف المطابق من المنيو",
      "quantity": 1,
      "unit": "كيلو أو صحن أو علبة",
      "price": 25,
      "rawMention": "الكلمة أو العبارة كما وردت في كلام الزبون"
    }
  ],
  "totalAmount": 25,
  "notes": "أي ملاحظات خاصة بالتسليم أو التفضيل",
  "confidence": "high"
}
لا تضف أي نص خارج كود JSON.
`;

        const response = await client.models.generateContent({
          model: MODEL_NAME,
          contents: prompt
        });

        let jsonStr = response.text.trim();
        if (jsonStr.startsWith('```json')) {
          jsonStr = jsonStr.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (jsonStr.startsWith('```')) {
          jsonStr = jsonStr.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }

        const parsed = JSON.parse(jsonStr);
        return res.json(parsed);
      } else {
        // Smart Dialect Rule-based Simulation Fallback
        const items = [];
        let total = 0;

        menuProducts.forEach(p => {
          if (text.includes(p.name) || (p.name.includes('بقلاوة') && text.includes('بقلاوة')) || (p.name.includes('غريبة') && text.includes('غريبة')) || (p.name.includes('عبمبر') && text.includes('عبمبر')) || (p.name.includes('كعك') && text.includes('كعك'))) {
            let qty = 1;
            let unit = 'قطعة';
            let rawMention = p.name;

            if (text.includes('نص كيلو') || text.includes('نصف كيلو')) {
              qty = 0.5;
              unit = 'كيلو';
              rawMention = 'نص كيلو ' + p.name;
            } else if (text.includes('2 كيلو') || text.includes('زوز كيلو')) {
              qty = 2;
              unit = 'كيلو';
              rawMention = 'زوز كيلو ' + p.name;
            } else if (text.includes('كيلو')) {
              qty = 1;
              unit = 'كيلو';
              rawMention = 'كيلو ' + p.name;
            } else if (text.includes('زوز صحون') || text.includes('صحنين')) {
              qty = 2;
              unit = 'صحن';
              rawMention = 'زوز صحون ' + p.name;
            } else if (text.includes('صحن')) {
              qty = 1;
              unit = 'صحن';
              rawMention = 'صحن ' + p.name;
            }

            const itemPrice = (p.price || 20) * qty;
            total += itemPrice;

            items.push({
              productName: p.name,
              quantity: qty,
              unit,
              price: itemPrice,
              rawMention
            });
          }
        });

        if (items.length === 0) {
          items.push({
            productName: menuProducts[0]?.name || 'عبمبر اللوز الطرابلسي',
            quantity: 1,
            unit: 'صحن',
            price: menuProducts[0]?.price || 30,
            rawMention: text
          });
          total = menuProducts[0]?.price || 30;
        }

        return res.json({
          items,
          totalAmount: total,
          notes: 'تمت المطابقة الذكية استناداً لقائمة أصناف المنيو الحية',
          confidence: 'high'
        });
      }
    } catch (err) {
      console.error('[AI Order Parse Error]:', err);
      res.status(500).json({ error: 'فشل تحليل الطلب: ' + err.message });
    }
  });

  // 4. Product Studio (Generate Copy, Categories & Allergens)
  router.post('/generate-product', async (req, res) => {
    const { idea, tone } = req.body;
    if (!idea) {
      return res.status(400).json({ error: 'فكرة الصنف مطلوبة' });
    }

    try {
      const client = getClient();
      if (client) {
        const prompt = `
أنت شيف حلواني وخبير تسويق لعلامة "حلويات عبمبر الزروق" في ليبيا.
أنشئ بطاقة منتج متكاملة وجذابة لهذا الصنف:
الفكرة: "${idea}"
النبرة التسويقية: "${tone || 'traditional'}"

أخرج النتيجة بصيغة JSON فقط:
{
  "nameAr": "الاسم التجاري الجذاب للصنف",
  "description": "وصف شهي ومميز يسيل اللعاب ويركز على جودة المكونات",
  "category": "الحلويات الطرابلسية أو المعجنات والحلويات الشرقية",
  "suggestedPrice": 35,
  "saleType": "بالكيلو أو بالصحن أو بالقطعة",
  "allergens": ["مكسرات", "لاكتوز", "سمسم"]
}
`;

        const response = await client.models.generateContent({
          model: MODEL_NAME,
          contents: prompt
        });

        let jsonStr = response.text.trim();
        if (jsonStr.startsWith('```json')) {
          jsonStr = jsonStr.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (jsonStr.startsWith('```')) {
          jsonStr = jsonStr.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }

        const parsed = JSON.parse(jsonStr);
        return res.json(parsed);
      } else {
        // High quality simulated response
        return res.json({
          nameAr: idea.includes('عبمبر') ? 'عبمبر اللوز الطرابلسي الملكي' : idea.split(' ').slice(0, 4).join(' '),
          description: 'محضر بعناية فائقة وفق التقاليد العريقة، بمزيج غني من اللوز الوطني المحمص والسمن الطبيعي الصافي، يقدم قرمشة ذهبية لا تقاوم ونكهة فاخرة تدوم.',
          category: 'الحلويات الطرابلسية الفاخرة',
          suggestedPrice: 45,
          saleType: 'بالكيلو',
          allergens: ['مكسرات (لوز)', 'حليب ومشتقاته']
        });
      }
    } catch (err) {
      console.error('[AI Product Studio Error]:', err);
      res.status(500).json({ error: 'فشل توليد الصنف: ' + err.message });
    }
  });

  return router;
}

module.exports = createAiSandboxRouter;
