<script setup>
import { vSheetGesture } from '../utils/sheetGesture';

defineProps({
  open: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['close']);
const vSheetGestureDirective = vSheetGesture;
</script>

<template>
  <Transition name="modal-spring-fade">
    <div v-if="open" class="modal-overlay" @click.self="emit('close')">
      <div
        class="modal-content shortcuts-modal-box"
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcuts-modal-title"
        v-sheet-gesture-directive="() => emit('close')"
      >
        <div class="sheet-grab-handle" aria-hidden="true"></div>
        <!-- Fixed Modal Header -->
        <div class="shortcuts-modal-header">
          <div class="d-flex align-items-center gap-3">
            <div class="shortcuts-header-icon" aria-hidden="true">
              <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="2" y="4" width="20" height="16" rx="2" ry="2"/><line x1="6" y1="8" x2="6" y2="8"/><line x1="10" y1="8" x2="10" y2="8"/><line x1="14" y1="8" x2="14" y2="8"/><line x1="18" y1="8" x2="18" y2="8"/><line x1="6" y1="12" x2="6" y2="12"/><line x1="10" y1="12" x2="10" y2="12"/><line x1="14" y1="12" x2="14" y2="12"/><line x1="18" y1="12" x2="18" y2="12"/><line x1="7" y1="16" x2="17" y2="16"/></svg>
            </div>
            <div>
              <h3 id="shortcuts-modal-title" class="m-0 font-bold shortcuts-title">دليل اختصارات لوحة المفاتيح (Keyboard Shortcuts)</h3>
              <p class="text-muted m-0 text-small">تحكم كامل بالمنظومة وإدخال سريع للطلبات دون استخدام الفأرة</p>
            </div>
          </div>
          <button @click="emit('close')" class="modal-close-btn" aria-label="إغلاق">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        <!-- Scrollable Modal Body -->
        <div class="shortcuts-modal-body custom-scrollbar">
          <div class="shortcuts-sections-grid">
            <!-- Global & Navigation -->
            <div class="shortcut-category-card">
              <div class="cat-header">
                <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>
                <span>التنقل العام والتنقل بين التبويبات</span>
              </div>
              <div class="shortcut-item-row">
                <span class="desc">التبديل والتنقل بين التبويبات الرئيسية</span>
                <div class="keys"><kbd class="kbd-badge">[</kbd> <kbd class="kbd-badge">]</kbd> <span class="or-text">أو</span> <kbd class="kbd-badge">←</kbd> <kbd class="kbd-badge">→</kbd> <span class="or-text">أو</span> <kbd class="kbd-badge">Alt</kbd>+<kbd class="kbd-badge">1..9</kbd></div>
              </div>
              <div class="shortcut-item-row">
                <span class="desc">التركيز على حقل البحث في التبويب الحالي</span>
                <div class="keys"><kbd class="kbd-badge">/</kbd></div>
              </div>
              <div class="shortcut-item-row">
                <span class="desc">تثبيت البحث والانتقال لأول نتيجة في الجدول</span>
                <div class="keys"><kbd class="kbd-badge">Enter</kbd> <span class="or-text">أو</span> <kbd class="kbd-badge">↓</kbd></div>
              </div>
              <div class="shortcut-item-row">
                <span class="desc">فتح لوحة الأوامر السريعة (Command Palette)</span>
                <div class="keys"><kbd class="kbd-badge">Ctrl</kbd>+<kbd class="kbd-badge">Space</kbd> <span class="or-text">أو</span> <kbd class="kbd-badge">Alt</kbd>+<kbd class="kbd-badge">/</kbd></div>
              </div>
              <div class="shortcut-item-row">
                <span class="desc">عرض نافذة دليل الاختصارات هذه</span>
                <div class="keys"><kbd class="kbd-badge">?</kbd> <span class="or-text">أو</span> <kbd class="kbd-badge">Alt</kbd>+<kbd class="kbd-badge">H</kbd></div>
              </div>
              <div class="shortcut-item-row">
                <span class="desc">إغلاق أي نافذة منبثقة أو إلغاء الإجراء</span>
                <div class="keys"><kbd class="kbd-badge">Esc</kbd></div>
              </div>
            </div>

            <!-- Table Row Navigation -->
            <div class="shortcut-category-card">
              <div class="cat-header">
                <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
                <span>التنقل في الجداول والبيانات</span>
              </div>
              <div class="shortcut-item-row">
                <span class="desc">التنقل بين صفوف الجدول لأعلى / لأسفل</span>
                <div class="keys"><kbd class="kbd-badge">↑</kbd> <kbd class="kbd-badge">↓</kbd> <span class="or-text">أو</span> <kbd class="kbd-badge">j</kbd> <kbd class="kbd-badge">k</kbd></div>
              </div>
              <div class="shortcut-item-row">
                <span class="desc">فتح وتعديل الصف المحدد حالياً</span>
                <div class="keys"><kbd class="kbd-badge">Enter</kbd></div>
              </div>
              <div class="shortcut-item-row">
                <span class="desc">طباعة فاتورة الطلب المحدد مباشرة (في الطلبات)</span>
                <div class="keys"><kbd class="kbd-badge">P</kbd></div>
              </div>
              <div class="shortcut-item-row">
                <span class="desc">الانتقال للصفحة التالية / السابقة في الجدول</span>
                <div class="keys"><kbd class="kbd-badge">PageDown</kbd> / <kbd class="kbd-badge">PageUp</kbd> <span class="or-text">أو</span> <kbd class="kbd-badge">Ctrl</kbd>+<kbd class="kbd-badge">↓</kbd> / <kbd class="kbd-badge">↑</kbd></div>
              </div>
              <div class="shortcut-item-row">
                <span class="desc">التمرير التلقائي لأزرار التصفح بعد نهاية الجدول</span>
                <div class="keys"><kbd class="kbd-badge">↓</kbd> <span class="or-text">عند آخر صف</span></div>
              </div>
            </div>

            <!-- POS Flow -->
            <div class="shortcut-category-card">
              <div class="cat-header">
                <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
                <span>طلبات الكاشير السريعة (POS)</span>
              </div>
              <div class="shortcut-item-row">
                <span class="desc">فتح نافذة إنشاء طلب كاشير فوري</span>
                <div class="keys"><kbd class="kbd-badge">F2</kbd> <span class="or-text">أو</span> <kbd class="kbd-badge">Alt</kbd>+<kbd class="kbd-badge">N</kbd></div>
              </div>
              <div class="shortcut-item-row">
                <span class="desc">إضافة الصنف المحدد ومتابعة البحث الفوري</span>
                <div class="keys"><kbd class="kbd-badge">Enter</kbd></div>
              </div>
              <div class="shortcut-item-row">
                <span class="desc">زيادة / إنقاص كمية الصنف</span>
                <div class="keys"><kbd class="kbd-badge">+</kbd> <kbd class="kbd-badge">-</kbd> <span class="or-text">أو</span> <kbd class="kbd-badge">Space</kbd></div>
              </div>
              <div class="shortcut-item-row">
                <span class="desc">تعديل نوع السعر (جملة ⇄ مفرد)</span>
                <div class="keys"><kbd class="kbd-badge">Alt</kbd>+<kbd class="kbd-badge">W</kbd></div>
              </div>
              <div class="shortcut-item-row">
                <span class="desc">تفعيل / تعطيل الطباعة التلقائية</span>
                <div class="keys"><kbd class="kbd-badge">Alt</kbd>+<kbd class="kbd-badge">P</kbd></div>
              </div>
              <div class="shortcut-item-row">
                <span class="desc">تحديد تاريخ التسليم (اليوم / غداً / بعد غد)</span>
                <div class="keys"><kbd class="kbd-badge">Alt</kbd>+<kbd class="kbd-badge">1</kbd> / <kbd class="kbd-badge">2</kbd> / <kbd class="kbd-badge">3</kbd></div>
              </div>
              <div class="shortcut-item-row">
                <span class="desc">تدوير وتصفية تصنيفات المنتجات</span>
                <div class="keys"><kbd class="kbd-badge">Alt</kbd>+<kbd class="kbd-badge">C</kbd></div>
              </div>
              <div class="shortcut-item-row">
                <span class="desc">الانتقال للتحكم بكميات السلة</span>
                <div class="keys"><kbd class="kbd-badge">Alt</kbd>+<kbd class="kbd-badge">K</kbd></div>
              </div>
              <div class="shortcut-item-row">
                <span class="desc">حفظ وطباعة الطلب فوراً</span>
                <div class="keys"><kbd class="kbd-badge">Ctrl</kbd>+<kbd class="kbd-badge">Enter</kbd> <span class="or-text">أو</span> <kbd class="kbd-badge">Alt</kbd>+<kbd class="kbd-badge">S</kbd></div>
              </div>
            </div>

            <!-- Modals & Editing -->
            <div class="shortcut-category-card">
              <div class="cat-header">
                <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                <span>النوافذ وتعديل الطلبات والمدفوعات</span>
              </div>
              <div class="shortcut-item-row">
                <span class="desc">حفظ تعديلات الطلب</span>
                <div class="keys"><kbd class="kbd-badge">Ctrl</kbd>+<kbd class="kbd-badge">Enter</kbd> <span class="or-text">أو</span> <kbd class="kbd-badge">Alt</kbd>+<kbd class="kbd-badge">S</kbd></div>
              </div>
              <div class="shortcut-item-row">
                <span class="desc">تأكيد وحفظ الدفعة في نافذة الدفع</span>
                <div class="keys"><kbd class="kbd-badge">Enter</kbd></div>
              </div>
              <div class="shortcut-item-row">
                <span class="desc">تعديل كميات الأصناف في نافذة التعديل</span>
                <div class="keys"><kbd class="kbd-badge">↑</kbd> <kbd class="kbd-badge">↓</kbd></div>
              </div>
              <div class="shortcut-item-row">
                <span class="desc">حذف صنف من الطلب</span>
                <div class="keys"><kbd class="kbd-badge">Delete</kbd></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Fixed Modal Footer -->
        <div class="shortcuts-modal-footer">
          <button type="button" @click="emit('close')" class="btn btn-primary btn-shortcuts-done">
            <span>فهمت ذلك</span>
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.d-flex { display: flex; }
.align-items-center { align-items: center; }
.gap-3 { gap: 12px; }
.m-0 { margin: 0; }
.font-bold { font-weight: 700; }
.text-muted { color: #64748b; }
.text-small { font-size: 0.82rem; }

.modal-close-btn {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: #f8fafc;
  border: 1px solid #cbd5e1;
  color: #475569;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease, border-color 0.15s ease;
}

.modal-close-btn:hover {
  background: #fef2f2;
  color: #ef4444;
  border-color: #fca5a5;
}

.btn-primary {
  background: linear-gradient(135deg, #f59e0b, #d97706);
  color: #ffffff;
  border: none;
  border-radius: 10px;
  font-family: 'Cairo', sans-serif;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(217, 119, 6, 0.25);
  transition: transform 0.15s ease, opacity 0.2s ease;
}

.btn-primary:hover {
  opacity: 0.95;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.55);
  backdrop-filter: blur(5px);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.kbd-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #f1f5f9;
  color: #334155;
  border: 1px solid #cbd5e1;
  border-bottom: 2px solid #94a3b8;
  border-radius: 6px;
  padding: 2px 7px;
  font-size: 0.78rem;
  font-weight: 700;
  font-family: 'Cairo', sans-serif;
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);
  min-width: 22px;
  text-align: center;
}

.shortcuts-modal-box {
  width: 95% !important;
  max-width: 860px !important;
  max-height: 88vh !important;
  height: auto !important;
  display: flex !important;
  flex-direction: column !important;
  background: #ffffff !important;
  border-radius: 20px !important;
  border: 1px solid #e2e8f0 !important;
  box-shadow: 0 25px 60px rgba(15, 23, 42, 0.22) !important;
  padding: 0 !important;
  overflow: hidden !important;
}

.shortcuts-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  background: #ffffff;
  border-bottom: 1px solid #f1f5f9;
  flex-shrink: 0;
}

.shortcuts-title {
  font-size: 1.2rem;
  color: #0f172a;
}

.shortcuts-modal-body {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto !important;
  overflow-x: hidden !important;
  -webkit-overflow-scrolling: touch;
  padding: 20px 24px;
}

.shortcuts-modal-footer {
  padding: 16px 24px;
  background: #f8fafc;
  border-top: 1px solid #f1f5f9;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.btn-shortcuts-done {
  min-width: 160px;
  padding: 10px 24px;
  font-weight: 700;
  font-size: 0.95rem;
}

.shortcuts-sections-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.shortcut-category-card {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  padding: 14px 16px;
  box-shadow: 0 2px 6px rgba(0,0,0,0.02);
  transition: border-color 0.15s ease;
}

.shortcut-category-card:hover {
  border-color: #cbd5e1;
}

.shortcut-category-card .cat-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 800;
  font-size: 0.92rem;
  color: #d97706;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #e2e8f0;
}

.shortcut-item-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 7px 0;
  border-bottom: 1px dashed #e2e8f0;
  font-size: 0.85rem;
  gap: 12px;
}

.shortcut-item-row:last-child {
  border-bottom: none;
}

.shortcut-item-row .desc {
  color: #334155;
  font-weight: 600;
  flex: 1;
}

.shortcut-item-row .keys {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.shortcut-item-row .or-text {
  font-size: 0.72rem;
  color: #94a3b8;
  margin: 0 2px;
}

.shortcuts-header-icon {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  background: rgba(245, 158, 11, 0.12);
  color: #d97706;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

@media (max-width: 768px) {
  .shortcuts-modal-box {
    width: 96% !important;
    max-height: 92vh !important;
  }
  .shortcuts-modal-header,
  .shortcuts-modal-body,
  .shortcuts-modal-footer {
    padding: 14px 16px;
  }
  .shortcuts-sections-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }
}
</style>
