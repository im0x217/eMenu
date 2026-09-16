<template>
  <div class="ai-sandbox-page" dir="rtl">
    <!-- Sandbox Header -->
    <header class="sandbox-header">
      <div class="header-content">
        <div class="header-titles">
          <div class="badge-row">
            <span class="sandbox-badge">مختبر الذكاء الاصطناعي التجريبي</span>
            <span class="branch-badge">Branch: feature/gemini-ai-lab</span>
          </div>
          <h1>Gemini AI Lab & Sandbox</h1>
          <p class="subtitle">بيئة تجارب معزولة تماماً لاختبار قدرات Gemini 3.8 Flash مع منيو وبيانات عبمبر الزروق</p>
        </div>

        <div class="header-status-card">
          <div class="status-indicator" :class="apiStatus.status">
            <span class="status-dot"></span>
            <span class="status-text">{{ apiStatus.message }}</span>
          </div>
          <div class="status-meta">
            <span class="meta-item"><strong>الموديل:</strong> {{ apiStatus.model || 'gemini-3.8-flash' }}</span>
            <span v-if="apiStatus.latency" class="meta-item"><strong>الاستجابة:</strong> {{ apiStatus.latency }}ms</span>
          </div>
          <button @click="checkApiStatus" class="btn-refresh-status" :disabled="checkingStatus">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" class="spin-icon" :class="{ spinning: checkingStatus }">
              <path d="M23 4v6h-6"></path><path d="M1 20v-6h6"></path><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
            </svg>
            تحديث الاتصال
          </button>
        </div>
      </div>

      <!-- Navigation Tabs -->
      <nav class="sandbox-tabs">
        <button 
          v-for="tab in tabs" 
          :key="tab.id"
          class="tab-btn" 
          :class="{ active: activeTab === tab.id }"
          @click="activeTab = tab.id"
        >
          <span class="tab-icon" v-html="tab.icon"></span>
          <span class="tab-title">{{ tab.title }}</span>
          <span v-if="tab.badge" class="tab-badge">{{ tab.badge }}</span>
        </button>
      </nav>
    </header>

    <!-- Main Playground Container -->
    <main class="sandbox-main">
      <!-- Warning Banner if API Key is not set -->
      <div v-if="apiStatus.status === 'unconfigured'" class="api-warning-banner">
        <div class="banner-icon">⚠️</div>
        <div class="banner-content">
          <strong>مفتاح Gemini API غير مفعّل في ملف البيئة المحلي (.env)</strong>
          <p>أضف المفتاح في ملف <code>.env</code> في المجلد الرئيسي <code>GEMINI_API_KEY=your_key_here</code> ثم اضغط على "تحديث الاتصال".</p>
        </div>
      </div>

      <!-- TAB 1: Conversational Analytics -->
      <section v-if="activeTab === 'analytics'" class="tab-pane animate-fade-in">
        <div class="pane-header">
          <h2>اسأل البيانات والتحليلات (Conversational BI)</h2>
          <p>اطرح أي سؤال حول المبيعات، المدفوعات، أو أداء المنتجات باللغة العربية واحصل على إجابة ذكية مباشرة من قاعدة البيانات بوضع القراءة فقط.</p>
        </div>

        <!-- Quick Prompts -->
        <div class="quick-prompts">
          <span class="prompt-label">أسئلة مقترحة:</span>
          <button 
            v-for="(p, i) in analyticsPrompts" 
            :key="i"
            class="prompt-chip"
            @click="queryAnalytics(p)"
            :disabled="analyticsLoading"
          >
            {{ p }}
          </button>
        </div>

        <!-- Chat / Query Box -->
        <div class="chat-container">
          <div class="chat-history" ref="chatHistoryRef">
            <div v-if="analyticsMessages.length === 0" class="empty-chat-state">
              <div class="empty-icon">📊</div>
              <p>جرّب اختيار أحد الأسئلة المقترحة أعلاه أو اكتب استفسارك الخاص أدناه.</p>
            </div>

            <div 
              v-for="(msg, index) in analyticsMessages" 
              :key="index"
              class="chat-bubble"
              :class="msg.role"
            >
              <div class="bubble-header">
                <span class="bubble-author">{{ msg.role === 'user' ? 'أنت' : 'مساعد التحليلات الذكي' }}</span>
                <span class="bubble-time">{{ msg.time }}</span>
              </div>
              <div class="bubble-text" v-html="formatMarkdown(msg.text)"></div>
              
              <!-- Structured Result Cards if present -->
              <div v-if="msg.metrics" class="msg-metrics-cards">
                <div v-for="(v, k) in msg.metrics" :key="k" class="mini-kpi-card">
                  <span class="mini-kpi-label">{{ k }}</span>
                  <span class="mini-kpi-val">{{ v }}</span>
                </div>
              </div>
            </div>

            <div v-if="analyticsLoading" class="chat-bubble assistant typing">
              <span class="dot"></span><span class="dot"></span><span class="dot"></span>
              <span class="typing-text">جاري استعلام البيانات وتحليلها عبر Gemini...</span>
            </div>
          </div>

          <form @submit.prevent="submitAnalyticsQuery" class="chat-input-form">
            <input 
              v-model="analyticsQueryInput" 
              type="text" 
              class="chat-input"
              placeholder="اكتب استفسارك هنا (مثال: ما هي الأصناف الأكثر طلباً هذا الأسبوع؟)..."
              :disabled="analyticsLoading"
            />
            <button type="submit" class="btn-send" :disabled="!analyticsQueryInput.trim() || analyticsLoading">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
              إرسال
            </button>
          </form>
        </div>
      </section>

      <!-- TAB 2: Smart Order Parser -->
      <section v-if="activeTab === 'order_parser'" class="tab-pane animate-fade-in">
        <div class="pane-header">
          <h2>محاكي الطلب الصوتي والذكاء الاصطناعي (Smart Order Parser)</h2>
          <p>أدخل نص طلب باللهجة الليبية أو العربية وسيقوم Gemini بمطابقته فورياً مع أصناف المنيو الحقيقية، واستخراج الأوزان والكميات وحساب الإجمالي.</p>
        </div>

        <!-- Preset Dialect Phrases -->
        <div class="quick-prompts">
          <span class="prompt-label">أمثلة باللهجة الليبية:</span>
          <button 
            v-for="(phrase, i) in orderPhrases" 
            :key="i"
            class="prompt-chip"
            @click="orderInputText = phrase; parseOrderText()"
            :disabled="orderParsing"
          >
            "{{ phrase }}"
          </button>
        </div>

        <div class="order-parser-grid">
          <!-- Input Card -->
          <div class="sandbox-card input-card">
            <h3>نص الطلب أو التسجيل</h3>
            <textarea 
              v-model="orderInputText" 
              class="order-textarea" 
              rows="4"
              placeholder="اكتب ما طلبه الزبون هنا (مثال: نبي نص كيلو غريبة طرابلسية وزوز صحون عبمبر باللوز)..."
            ></textarea>

            <div class="parser-actions">
              <button 
                @click="simulateVoiceRecording" 
                class="btn-voice-toggle"
                :class="{ recording: isRecording }"
              >
                <span class="mic-icon">🎙️</span>
                {{ isRecording ? 'جاري الاستماع...' : 'تسجيل صوتي تجريبي' }}
              </button>

              <button 
                @click="parseOrderText" 
                class="btn-parse-submit" 
                :disabled="!orderInputText.trim() || orderParsing"
              >
                <span v-if="orderParsing" class="spinner-inline"></span>
                <span v-else>مطابقة الطلب مع المنيو ✨</span>
              </button>
            </div>
          </div>

          <!-- Parsed Result Card -->
          <div class="sandbox-card result-card">
            <h3>نتيجة المطابقة مع المنيو (Structured Cart)</h3>

            <div v-if="!parsedCart && !orderParsing" class="empty-result-state">
              <p>اضغط على أحد الأمثلة أو أدخل نصاً واضغط على "مطابقة الطلب مع المنيو".</p>
            </div>

            <div v-if="orderParsing" class="loading-state">
              <div class="shimmer-line"></div>
              <div class="shimmer-line short"></div>
              <p>يقوم الموديل بمطابقة الأسماء وحساب الكميات والأسعار...</p>
            </div>

            <div v-if="parsedCart" class="parsed-content animate-fade-in">
              <div class="matched-summary-bar">
                <span>تم العثور على <strong>{{ parsedCart.items.length }}</strong> أصناف</span>
                <span class="confidence-pill" :class="parsedCart.confidence">دقة المطابقة: {{ parsedCart.confidence === 'high' ? 'عالية 🟢' : 'متوسطة 🟡' }}</span>
              </div>

              <div class="cart-items-list">
                <div v-for="(item, idx) in parsedCart.items" :key="idx" class="parsed-item-row">
                  <div class="item-main">
                    <span class="item-name">{{ item.productName }}</span>
                    <span class="item-raw-match">مستخرج من: "{{ item.rawMention }}"</span>
                  </div>
                  <div class="item-details">
                    <span class="item-qty-badge">{{ item.quantity }} {{ item.unit || 'قطع' }}</span>
                    <span class="item-price">{{ item.price ? item.price + ' د.ل' : 'غير محدد' }}</span>
                  </div>
                </div>
              </div>

              <div class="cart-total-row">
                <span>الإجمالي التقديري:</span>
                <span class="total-val">{{ parsedCart.totalAmount ? parsedCart.totalAmount + ' د.ل' : 'حسب الوزن' }}</span>
              </div>

              <div v-if="parsedCart.notes" class="order-notes-box">
                <strong>ملاحظات الزبون:</strong> {{ parsedCart.notes }}
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- TAB 3: Product Studio -->
      <section v-if="activeTab === 'product_studio'" class="tab-pane animate-fade-in">
        <div class="pane-header">
          <h2>استوديو توليد المنتجات الذكي (Product Studio)</h2>
          <p>اكتب فكرة صنف جديد أو مكونات أولية، ودع Gemini يقترح الاسم التسويقي الأمثل، الوصف الشهي، التصنيف، ومحاذير الحساسية.</p>
        </div>

        <div class="studio-grid">
          <!-- Input Form -->
          <div class="sandbox-card">
            <h3>بيانات الصنف الأولية</h3>
            <div class="form-group">
              <label>فكرة الصنف أو المكونات:</label>
              <input 
                v-model="studioInput.idea" 
                type="text" 
                class="form-control" 
                placeholder="مثال: غريبة طرابلسية باللوز الوطني والسمن البلدي المقرمش"
              />
            </div>

            <div class="form-group">
              <label>النبرة التسويقية:</label>
              <select v-model="studioInput.tone" class="form-control">
                <option value="traditional">تقليدي عريق وفاخر (طرابلسي أصيل)</option>
                <option value="modern">عصري ومبتكر</option>
                <option value="appetizing">شهي ووصفي غني بالنكهات</option>
              </select>
            </div>

            <button 
              @click="generateProductDetails" 
              class="btn-studio-generate" 
              :disabled="!studioInput.idea.trim() || studioLoading"
            >
              <span v-if="studioLoading" class="spinner-inline"></span>
              <span v-else>توليد تفاصيل الصنف ✨</span>
            </button>
          </div>

          <!-- Preview Output Card -->
          <div class="sandbox-card">
            <h3>بطاقة الصنف المقترحة</h3>
            
            <div v-if="!generatedProduct && !studioLoading" class="empty-result-state">
              <p>أدخل فكرة الصنف واضغط على "توليد تفاصيل الصنف" لمعاينة البطاقة الجاهزة.</p>
            </div>

            <div v-if="studioLoading" class="loading-state">
              <p>جاري صياغة الاسم والوصف واقتراح التصنيف والحساسية...</p>
            </div>

            <div v-if="generatedProduct" class="product-preview-card animate-fade-in">
              <div class="preview-header">
                <h4>{{ generatedProduct.nameAr }}</h4>
                <span class="category-pill">{{ generatedProduct.category }}</span>
              </div>
              <p class="preview-desc">{{ generatedProduct.description }}</p>
              
              <div class="preview-meta-row">
                <div class="meta-badge">
                  <span class="meta-label">السعر المقترح:</span>
                  <span class="meta-value">{{ generatedProduct.suggestedPrice }} د.ل</span>
                </div>
                <div class="meta-badge">
                  <span class="meta-label">نوع البيع:</span>
                  <span class="meta-value">{{ generatedProduct.saleType }}</span>
                </div>
              </div>

              <div v-if="generatedProduct.allergens?.length" class="allergens-row">
                <span class="allergen-title">محاذير الحساسية:</span>
                <span v-for="(alg, idx) in generatedProduct.allergens" :key="idx" class="allergen-tag">
                  ⚠️ {{ alg }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';

export default {
  name: 'AiSandboxView',
  setup() {
    const activeTab = ref('analytics');
    const checkingStatus = ref(false);

    const apiStatus = ref({
      status: 'checking',
      message: 'جاري فحص الاتصال بـ Gemini API...',
      model: 'gemini-3.8-flash',
      latency: null
    });

    const tabs = [
      {
        id: 'analytics',
        title: 'اسأل البيانات والتحليلات',
        icon: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>',
        badge: 'BI'
      },
      {
        id: 'order_parser',
        title: 'محاكي الطلب الذكي',
        icon: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>',
        badge: 'Voice/NLP'
      },
      {
        id: 'product_studio',
        title: 'استوديو المنتجات',
        icon: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><path d="m10 15 5-3-5-3v6z"></path></svg>',
        badge: 'Creator'
      }
    ];

    // ====== Tab 1: Conversational Analytics State ======
    const analyticsPrompts = [
      'run adit for this',
      'ما هي أكثر 3 أصناف طلباً في آخر 30 يوم؟',
      'كم إجمالي المبيعات والمدفوع نقداً في آخر 7 أيام؟',
      'ما هو متوسط قيمة الطلب للزبائن؟',
      'كم إجمالي المبالغ المتبقية كديون على الطلبات؟'
    ];
    const analyticsQueryInput = ref('');
    const analyticsLoading = ref(false);

    const defaultAuditMessages = [
      {
        role: 'assistant',
        text: 'أهلاً بك في مختبر التحليلات الذكي! يمكنك توجيه أي سؤال استفساري حول أداء المبيعات أو حركة الطلبات.',
        time: '04:18'
      },
      {
        role: 'user',
        text: 'run adit for this',
        time: '04:19'
      },
      {
        role: 'assistant',
        text: 'أهلاً بك، سيدي المدير. بصفتي مساعدك المالي والإداري، قمت بإجراء تدقيق شامل (Audit Report) لبيانات محل **"حلويات عبمبر الزروق"** عن آخر 30 يوماً عبر Gemini 3.6 Flash:\n\n### 📊 الملامح المالية الأساسية:\n* **إجمالي المبيعات:** **170,649.70 د.ل** (أداء ممتاز يعكس قوة الطلب).\n* **إجمالي المبالغ المحصلة (المدفوع):** **40,393.95 د.ل** (تمثل **23.6%** فقط من المبيعات).\n* **إجمالي الديون (المتبقي للتحصيل):** **130,255.75 د.ل** (تمثل **76.4%**، وهو مؤشر عالي المخاطر على السيولة).\n* **إجمالي عدد الطلبات:** **200 طلب** (متوسط **853.25 د.ل** لكل طلب).\n\n### 🏆 الأصناف الأعلى طلباً (محرك الإيرادات):\n1. **عبمبر اللوز الطرابلسي:** (910.5) - *المنتج القيادي الأساسي*.\n2. **روزاطة اللوز 1 لتر:** (838)\n3. **روزاطة اللوز قالون:** (778)\n4. **مثلث رد:** (346)\n5. **فراولة 1 لتر:** (323)\n\n### ⚠️ التوصيات التشغيلية والإدارية:\n1. **بدء حملة تحصيل عاجلة:** لتحصيل الديون المتأخرة لتأمين السيولة النقدية لشراء المواد الخام.\n2. **تأمين مخزون اللوز الوطني:** لضمان استمرارية إنتاج العبمبر والروزاطة دون انقطاع.\n3. **اشتراط عربون لا يقل عن 50%:** عند حجز طلبات المناسبات الكبرى لتقليل مخاطر البيع بالآجل.',
        metrics: {
          'إجمالي المبيعات': '170649.70 د.ل',
          'إجمالي المدفوع': '40393.95 د.ل',
          'إجمالي المتبقي': '130255.75 د.ل',
          'متوسط الطلب': '853.25 د.ل'
        },
        time: '04:19'
      }
    ];

    const analyticsMessages = ref([...defaultAuditMessages]);
    const chatHistoryRef = ref(null);

    // ====== Tab 2: Smart Order Parser State ======
    const orderPhrases = [
      'نبي كيلو بقلاوة وزوز صحون غريبة طرابلسية',
      'أعطيني نص كيلو عبمبر باللوز وعلبة شوكولاتة مشكلة',
      '3 كيلو كعك بالتمر وصحن مقروض بالسمن البلدي'
    ];
    const orderInputText = ref('');
    const orderParsing = ref(false);
    const isRecording = ref(false);
    const parsedCart = ref(null);

    // ====== Tab 3: Product Studio State ======
    const studioInput = ref({
      idea: 'عبمبر اللوز الطرابلسي الفاخر بالسمن الطبيعي ورقائق اللوز المحمص',
      tone: 'traditional'
    });
    const studioLoading = ref(false);
    const generatedProduct = ref(null);

    // ====== API Actions ======
    const checkApiStatus = async () => {
      checkingStatus.value = true;
      try {
        const res = await fetch('/api/dev/ai/status');
        const data = await res.json();
        if (data.configured) {
          apiStatus.value = {
            status: 'connected',
            message: 'متصل وجاهز للاختبار',
            model: data.model || 'gemini-3.8-flash',
            latency: data.latency || 180
          };
        } else {
          apiStatus.value = {
            status: 'unconfigured',
            message: 'بانتظار ضبط مفتاح GEMINI_API_KEY',
            model: 'gemini-3.8-flash',
            latency: null
          };
        }
      } catch (e) {
        apiStatus.value = {
          status: 'error',
          message: 'تعذر الاتصال بخادم التطوير',
          model: 'gemini-3.8-flash',
          latency: null
        };
      } finally {
        checkingStatus.value = false;
      }
    };

    const submitAnalyticsQuery = () => {
      if (!analyticsQueryInput.value.trim() || analyticsLoading.value) return;
      queryAnalytics(analyticsQueryInput.value);
    };

    const queryAnalytics = async (query) => {
      analyticsLoading.value = true;
      const userMsg = {
        role: 'user',
        text: query,
        time: new Date().toLocaleTimeString('ar-LY', { hour: '2-digit', minute: '2-digit' })
      };
      analyticsMessages.value.push(userMsg);
      analyticsQueryInput.value = '';

      try {
        const res = await fetch('/api/dev/ai/query-analytics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query })
        });
        const data = await res.json();
        analyticsMessages.value.push({
          role: 'assistant',
          text: data.answer || 'تمت معالجة الاستعلام بنجاح.',
          metrics: data.metrics || null,
          time: new Date().toLocaleTimeString('ar-LY', { hour: '2-digit', minute: '2-digit' })
        });
      } catch (err) {
        analyticsMessages.value.push({
          role: 'assistant',
          text: 'عذراً، حدث خطأ أثناء تنفيذ الاستعلام عبر الذكاء الاصطناعي.',
          time: new Date().toLocaleTimeString('ar-LY', { hour: '2-digit', minute: '2-digit' })
        });
      } finally {
        analyticsLoading.value = false;
      }
    };

    const simulateVoiceRecording = () => {
      if (isRecording.value) {
        isRecording.value = false;
        return;
      }
      isRecording.value = true;
      setTimeout(() => {
        isRecording.value = false;
        orderInputText.value = 'نبي نص كيلو غريبة طرابلسية وزوز علب بقلاوة فاخرة';
        parseOrderText();
      }, 2500);
    };

    const parseOrderText = async () => {
      if (!orderInputText.value.trim() || orderParsing.value) return;
      orderParsing.value = true;
      try {
        const res = await fetch('/api/dev/ai/parse-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: orderInputText.value })
        });
        const data = await res.json();
        parsedCart.value = data;
      } catch (err) {
        console.error('Order parsing error:', err);
      } finally {
        orderParsing.value = false;
      }
    };

    const generateProductDetails = async () => {
      if (!studioInput.value.idea.trim() || studioLoading.value) return;
      studioLoading.value = true;
      try {
        const res = await fetch('/api/dev/ai/generate-product', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(studioInput.value)
        });
        const data = await res.json();
        generatedProduct.value = data;
      } catch (err) {
        console.error('Studio generation error:', err);
      } finally {
        studioLoading.value = false;
      }
    };

    const formatMarkdown = (text) => {
      if (!text) return '';
      // Safe lightweight markdown formatting for bold, bullets, linebreaks
      let formatted = text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/\n\n/g, '<br/><br/>')
        .replace(/\n/g, '<br/>');
      return formatted;
    };

    onMounted(() => {
      checkApiStatus();
    });

    return {
      activeTab,
      checkingStatus,
      apiStatus,
      tabs,
      analyticsPrompts,
      analyticsQueryInput,
      analyticsLoading,
      analyticsMessages,
      chatHistoryRef,
      orderPhrases,
      orderInputText,
      orderParsing,
      isRecording,
      parsedCart,
      studioInput,
      studioLoading,
      generatedProduct,
      checkApiStatus,
      submitAnalyticsQuery,
      queryAnalytics,
      simulateVoiceRecording,
      parseOrderText,
      generateProductDetails,
      formatMarkdown
    };
  }
};
</script>

<style scoped>
.ai-sandbox-page {
  min-height: 100vh;
  background-color: #f8fafc;
  color: #0f172a;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  padding: 1.5rem;
  box-sizing: border-box;
}

.sandbox-header {
  background: #ffffff;
  border-radius: 16px;
  padding: 1.5rem;
  border: 1px solid #e2e8f0;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
  margin-bottom: 1.5rem;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 1.5rem;
}

.badge-row {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.sandbox-badge {
  background: #f1f5f9;
  color: #475569;
  font-size: 0.75rem;
  font-weight: 700;
  padding: 0.25rem 0.6rem;
  border-radius: 999px;
  border: 1px solid #cbd5e1;
}

.branch-badge {
  background: #eff6ff;
  color: #2563eb;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.25rem 0.6rem;
  border-radius: 999px;
  font-family: monospace;
}

.header-titles h1 {
  font-size: 1.5rem;
  font-weight: 800;
  margin: 0 0 0.25rem 0;
  color: #0f172a;
}

.subtitle {
  margin: 0;
  font-size: 0.9rem;
  color: #64748b;
}

.header-status-card {
  background: #f8fafc;
  padding: 0.85rem 1.25rem;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  min-width: 260px;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  font-weight: 700;
}

.status-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #94a3b8;
}

.status-indicator.connected .status-dot {
  background: #10b981;
  box-shadow: 0 0 8px rgba(16, 185, 129, 0.5);
}

.status-indicator.unconfigured .status-dot {
  background: #f59e0b;
}

.status-indicator.error .status-dot {
  background: #ef4444;
}

.status-meta {
  display: flex;
  gap: 0.75rem;
  font-size: 0.75rem;
  color: #64748b;
}

.btn-refresh-status {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  background: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  padding: 0.35rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: #334155;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-refresh-status:hover {
  background: #f1f5f9;
}

.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.sandbox-tabs {
  display: flex;
  gap: 0.5rem;
  margin-top: 1.25rem;
  border-top: 1px solid #f1f5f9;
  padding-top: 1rem;
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 1.1rem;
  border-radius: 10px;
  border: 1px solid transparent;
  background: transparent;
  color: #64748b;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.tab-btn:hover {
  background: #f1f5f9;
  color: #0f172a;
}

.tab-btn.active {
  background: #0f172a;
  color: #ffffff;
}

.tab-badge {
  font-size: 0.7rem;
  padding: 0.1rem 0.4rem;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.2);
}

.tab-btn:not(.active) .tab-badge {
  background: #e2e8f0;
  color: #475569;
}

.api-warning-banner {
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: 12px;
  padding: 1rem 1.25rem;
  display: flex;
  gap: 1rem;
  align-items: flex-start;
  margin-bottom: 1.5rem;
}

.banner-icon {
  font-size: 1.5rem;
}

.banner-content strong {
  display: block;
  color: #92400e;
  margin-bottom: 0.25rem;
}

.banner-content p {
  margin: 0;
  font-size: 0.85rem;
  color: #b45309;
}

.banner-content code {
  background: #fef3c7;
  padding: 0.1rem 0.4rem;
  border-radius: 4px;
  font-family: monospace;
}

.tab-pane {
  background: #ffffff;
  border-radius: 16px;
  padding: 1.75rem;
  border: 1px solid #e2e8f0;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
}

.pane-header h2 {
  margin: 0 0 0.25rem 0;
  font-size: 1.25rem;
  font-weight: 700;
}

.pane-header p {
  margin: 0 0 1.25rem 0;
  font-size: 0.88rem;
  color: #64748b;
}

.quick-prompts {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-bottom: 1.25rem;
}

.prompt-label {
  font-size: 0.8rem;
  font-weight: 700;
  color: #64748b;
}

.prompt-chip {
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  border-radius: 999px;
  padding: 0.35rem 0.85rem;
  font-size: 0.8rem;
  color: #1e293b;
  cursor: pointer;
  transition: all 0.15s ease;
}

.prompt-chip:hover {
  background: #e2e8f0;
  border-color: #cbd5e1;
}

.chat-container {
  display: flex;
  flex-direction: column;
  height: 480px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  overflow: hidden;
  background: #f8fafc;
}

.chat-history {
  flex: 1;
  padding: 1rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.chat-bubble {
  max-width: 80%;
  padding: 0.85rem 1.1rem;
  border-radius: 14px;
  font-size: 0.9rem;
  line-height: 1.5;
}

.chat-bubble.user {
  align-self: flex-start;
  background: #0f172a;
  color: #ffffff;
  border-bottom-right-radius: 4px;
}

.chat-bubble.assistant {
  align-self: flex-end;
  background: #ffffff;
  color: #0f172a;
  border: 1px solid #e2e8f0;
  border-bottom-left-radius: 4px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.03);
}

.bubble-header {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.25rem;
  font-size: 0.72rem;
  opacity: 0.75;
}

.msg-metrics-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
  gap: 0.5rem;
  margin-top: 0.75rem;
}

.mini-kpi-card {
  background: #f1f5f9;
  border-radius: 8px;
  padding: 0.5rem 0.75rem;
  display: flex;
  flex-direction: column;
}

.mini-kpi-label {
  font-size: 0.72rem;
  color: #64748b;
}

.mini-kpi-val {
  font-size: 1rem;
  font-weight: 700;
  color: #0f172a;
}

.chat-input-form {
  display: flex;
  gap: 0.5rem;
  padding: 0.85rem;
  background: #ffffff;
  border-top: 1px solid #e2e8f0;
}

.chat-input {
  flex: 1;
  padding: 0.65rem 1rem;
  border-radius: 10px;
  border: 1px solid #cbd5e1;
  font-size: 0.9rem;
  outline: none;
}

.chat-input:focus {
  border-color: #0f172a;
}

.btn-send {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  background: #0f172a;
  color: #ffffff;
  border: none;
  border-radius: 10px;
  padding: 0 1.25rem;
  font-weight: 600;
  cursor: pointer;
}

.btn-send:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Order Parser Layout */
.order-parser-grid, .studio-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
}

.sandbox-card {
  background: #f8fafc;
  border-radius: 12px;
  padding: 1.25rem;
  border: 1px solid #e2e8f0;
}

.sandbox-card h3 {
  margin: 0 0 1rem 0;
  font-size: 1.05rem;
  font-weight: 700;
}

.order-textarea {
  width: 100%;
  padding: 0.75rem;
  border-radius: 10px;
  border: 1px solid #cbd5e1;
  font-family: inherit;
  font-size: 0.9rem;
  resize: vertical;
  box-sizing: border-box;
}

.parser-actions {
  display: flex;
  gap: 0.75rem;
  margin-top: 1rem;
}

.btn-voice-toggle {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  padding: 0.6rem 1rem;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
}

.btn-voice-toggle.recording {
  background: #fee2e2;
  border-color: #ef4444;
  color: #b91c1c;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.02); }
}

.btn-parse-submit, .btn-studio-generate {
  flex: 1;
  background: #2563eb;
  color: #ffffff;
  border: none;
  border-radius: 10px;
  padding: 0.6rem 1.25rem;
  font-size: 0.9rem;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-parse-submit:disabled, .btn-studio-generate:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.matched-summary-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
  font-size: 0.85rem;
}

.confidence-pill {
  padding: 0.2rem 0.5rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 700;
  background: #ecfdf5;
  color: #065f46;
}

.cart-items-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  background: #ffffff;
  border-radius: 10px;
  padding: 0.75rem;
  border: 1px solid #e2e8f0;
}

.parsed-item-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
  border-bottom: 1px solid #f1f5f9;
}

.parsed-item-row:last-child {
  border-bottom: none;
}

.item-main {
  display: flex;
  flex-direction: column;
}

.item-name {
  font-weight: 700;
  font-size: 0.9rem;
}

.item-raw-match {
  font-size: 0.75rem;
  color: #64748b;
}

.item-details {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.item-qty-badge {
  background: #f1f5f9;
  padding: 0.2rem 0.5rem;
  border-radius: 6px;
  font-weight: 700;
  font-size: 0.8rem;
}

.item-price {
  font-weight: 800;
  color: #0f172a;
}

.cart-total-row {
  display: flex;
  justify-content: space-between;
  padding: 0.75rem 0;
  font-weight: 800;
  font-size: 1rem;
  margin-top: 0.5rem;
  border-top: 2px dashed #cbd5e1;
}

.order-notes-box {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 0.5rem 0.75rem;
  font-size: 0.8rem;
  margin-top: 0.5rem;
  color: #475569;
}

/* Studio Preview Card */
.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  font-size: 0.85rem;
  font-weight: 600;
  margin-bottom: 0.35rem;
}

.form-control {
  width: 100%;
  padding: 0.65rem 0.85rem;
  border-radius: 10px;
  border: 1px solid #cbd5e1;
  font-size: 0.9rem;
  box-sizing: border-box;
}

.product-preview-card {
  background: #ffffff;
  border-radius: 12px;
  padding: 1.25rem;
  border: 1px solid #e2e8f0;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.preview-header h4 {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 800;
}

.category-pill {
  background: #eff6ff;
  color: #2563eb;
  padding: 0.2rem 0.5rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 700;
}

.preview-desc {
  font-size: 0.88rem;
  color: #475569;
  line-height: 1.6;
  margin-bottom: 1rem;
}

.preview-meta-row {
  display: flex;
  gap: 1rem;
  margin-bottom: 0.75rem;
}

.meta-badge {
  background: #f8fafc;
  padding: 0.4rem 0.75rem;
  border-radius: 8px;
  font-size: 0.8rem;
  border: 1px solid #e2e8f0;
}

.meta-label {
  color: #64748b;
  margin-left: 0.35rem;
}

.meta-value {
  font-weight: 700;
  color: #0f172a;
}

.allergens-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  font-size: 0.78rem;
  margin-top: 0.5rem;
}

.allergen-tag {
  background: #fef2f2;
  color: #b91c1c;
  padding: 0.2rem 0.5rem;
  border-radius: 6px;
  font-weight: 600;
}

.animate-fade-in {
  animation: fadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}

@media (max-width: 900px) {
  .order-parser-grid, .studio-grid {
    grid-template-columns: 1fr;
  }
}
</style>
