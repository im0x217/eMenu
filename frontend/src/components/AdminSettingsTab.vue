<template>
  <div class="settings-tab-content">
    <div class="settings-grid">
      <!-- Backup Management Card -->
      <div class="table-card glass-panel mb-4">
        <div class="card-toolbar card-toolbar-split">
          <div class="card-toolbar-top">
            <div class="toolbar-title-group">
              <div class="d-flex align-items-center gap-2">
                <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" class="text-primary"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                <h3 class="toolbar-title">نظام النسخ الاحتياطي الشامل (Full Database Backup)</h3>
              </div>
              <span class="toolbar-badge">{{ backups.length }} نسخ محفوظة</span>
            </div>
          </div>
        </div>

        <div class="p-3">
          <!-- Local Backup Directory Info Banner -->
          <div class="backup-folder-banner mb-3 d-flex align-items-center justify-content-between flex-wrap gap-2">
            <div class="d-flex align-items-center gap-2">
              <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" class="text-primary"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
              <span class="font-bold text-small">مجلد حفظ ملفات JSON المحلي:</span>
            </div>
            <code class="backup-folder-path text-mono" dir="ltr">{{ backupDir || 'C:\\Users\\user\\Documents\\EmenuBackup' }}</code>
          </div>

          <!-- Create Backup Bar -->
          <div class="backup-action-bar mb-3 d-flex gap-2 align-items-center">
            <input
              v-model="newBackupLabel"
              type="text"
              placeholder="وصف اختياري للنسخة الاحتياطية…"
              class="form-control flex-grow-1"
            />
            <button
              @click="createBackup"
              class="btn btn-primary d-flex align-items-center gap-2"
              :disabled="backupLoading"
            >
              <svg aria-hidden="true" v-if="!backupLoading" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              <span>{{ backupLoading ? 'جاري الإنشاء…' : 'إنشاء نسخة احتياطية الآن' }}</span>
            </button>
          </div>

          <!-- Backups Table -->
          <div class="table-container">
            <table class="admin-table">
              <thead>
                <tr>
                  <th>تاريخ ووقت النسخة</th>
                  <th>وصف / ملف النسخة</th>
                  <th>إحصائيات البيانات المشمولة</th>
                  <th>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="backups.length === 0">
                  <td colspan="4" class="text-center p-4 text-muted">لا توجد نسخ احتياطية محفوظة بعد.</td>
                </tr>
                <tr v-for="b in backups" :key="b._id">
                  <td class="text-mono font-bold">{{ new Date(b.createdAt).toLocaleString('ar-LY') }}</td>
                  <td>
                    <div class="d-flex flex-column gap-1">
                      <span class="backup-label-pill">{{ b.label }}</span>
                      <span v-if="b.fileName" class="backup-file-sub text-mono" dir="ltr" :title="b.filePath || b.fileName">
                        {{ b.fileName }}
                      </span>
                    </div>
                  </td>
                  <td>
                    <div class="d-flex flex-wrap gap-1 align-items-center">
                      <span class="badge-stat-pill" v-if="b.stats">الطلبات: {{ (b.stats['emenu.orders'] || 0) + (b.stats['emenu2.orders'] || 0) }}</span>
                      <span class="badge-stat-pill" v-if="b.stats">الأصناف: {{ (b.stats['emenu.products'] || 0) + (b.stats['emenu2.products'] || 0) }}</span>
                      <span class="badge-stat-pill" v-if="b.stats">العملاء: {{ b.stats['emenu.customers'] || 0 }}</span>
                      <span class="badge-stat-pill" v-if="b.stats">الدفعات: {{ b.stats['emenu.payments'] || 0 }}</span>
                    </div>
                  </td>
                  <td>
                    <div class="order-actions-btns">
                      <button @click="downloadBackup(b._id, b.fileName)" class="btn-table-action btn-action-edit" title="تحميل ملف JSON" :aria-label="`تنزيل ملف النسخة الاحتياطية ${b.label || ''}`">
                        <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                        <span>تنزيل JSON</span>
                      </button>
                      <button @click="deleteBackup(b._id)" class="btn-table-action btn-action-delete" title="حذف النسخة الاحتياطية" aria-label="حذف النسخة الاحتياطية">
                        <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        <span>حذف</span>
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Danger Zone Card: Reset Orders & Analytics -->
      <div class="danger-zone-card mb-4">
        <div class="danger-zone-header">
          <div class="d-flex align-items-center gap-2">
            <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <h3 class="danger-zone-title">منطقة العمليات الحساسة وإعادة ضبط البيانات (Data Reset)</h3>
          </div>
        </div>

        <div class="danger-zone-body">
          <p class="danger-zone-desc">
            تصفير سجل الطلبات والمبيعات والتحليلات لبدء موسم عمل جديد. تأكد من أخذ نسخة احتياطية أولاً.
          </p>
          <div class="danger-points-list">
            <div class="danger-point-item">
              <span class="danger-bullet">•</span>
              <span>سيتم مسح جميع سجلات الطلبات من المتجر الرئيسي وقسم النواشف.</span>
            </div>
            <div class="danger-point-item">
              <span class="danger-bullet">•</span>
              <span>سيتم مسح سجل الدفعات والتحصيلات بالكامل وتصفير مديونيات ومشتريات العملاء.</span>
            </div>
            <div class="danger-point-item">
              <span class="danger-bullet">•</span>
              <span>سيتم إعادة ترقيم الطلبات التلقائي ليبدأ من الرقم <strong>#1001</strong> مجدداً.</span>
            </div>
            <div class="danger-point-item safe-point">
              <span class="safe-bullet"><svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg></span>
              <span><strong>محفوظات آمنة:</strong> لن يتم حذف الأصناف، المنتجات، التصنيفات، حسابات العملاء، أو حسابات المدراء.</span>
            </div>
          </div>

          <div class="mt-3">
            <button @click="openResetModal" class="btn btn-danger btn-reset-trigger d-flex align-items-center gap-2">
              <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
              <span>مسح وتصفير سجل الطلبات والمبيعات…</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- RESET ORDERS CONFIRMATION MODAL -->
    <Transition name="modal-spring-fade">
      <div v-if="resetModalOpen" class="modal-overlay" @click.self="$emit('update:resetModalOpen', false)">
        <div class="modal-content reset-confirm-modal-box" role="dialog" aria-modal="true" aria-labelledby="reset-modal-title" v-sheet-gesture="() => $emit('update:resetModalOpen', false)">
          <div class="sheet-grab-handle" aria-hidden="true"></div>
          <div class="modal-header reset-modal-header">
            <div class="d-flex align-items-center gap-3">
              <div class="reset-header-icon" aria-hidden="true">
                <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              </div>
              <div>
                <h3 id="reset-modal-title" class="m-0 font-bold text-danger">تأكيد مسح وتصفير سجل الطلبات</h3>
                <p class="text-muted m-0 text-small">هذا الإجراء سيقوم بمسح بيانات الطلبات والمبيعات نهائياً</p>
              </div>
            </div>
            <button @click="$emit('update:resetModalOpen', false)" class="modal-close-btn" aria-label="إغلاق">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>

          <div class="modal-body py-3">
            <div class="alert-reset-warning mb-3">
              <strong>تنبيه هام جداً:</strong> سيتم حذف جميع الطلبات وإعادة ضبط ترقيم الطلبات إلى <strong>#1001</strong>. تأكد من أنك قمت بأخذ نسخة احتياطية قبل المتابعة.
            </div>

            <div class="form-check mb-3">
              <input class="form-check-input" type="checkbox" id="resetCustBalanceCheck" v-model="resetCustomerBalances" />
              <label class="form-check-label font-bold" for="resetCustBalanceCheck" style="cursor: pointer;">
                تصفير مديونيات ومشتريات العملاء أيضاً (تصفير مالي شامل)
              </label>
            </div>

            <div class="form-group mb-2">
              <label class="form-label font-bold">اكتب العبارة التالية للتأكيد: <span class="text-danger font-bold">مسح البيانات</span></label>
              <input
                v-model="resetConfirmText"
                type="text"
                class="form-control text-center font-bold"
                placeholder="مسح البيانات…"
                autocomplete="off"
                spellcheck="false"
              />
            </div>
          </div>

          <div class="modal-footer">
            <button
              type="button"
              @click="confirmResetOrders"
              class="btn btn-danger d-flex align-items-center gap-2"
              :disabled="resetConfirmText.trim() !== 'مسح البيانات' || resetLoading"
            >
              <span>{{ resetLoading ? 'جاري المسح…' : 'نعم، قم بالمسح النهائي' }}</span>
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import { useToastStore } from '../stores/toast';
import { useConfirmStore } from '../stores/confirm';

export default {
  name: 'AdminSettingsTab',
  props: {
    resetModalOpen: { type: Boolean, default: false },
    adminFetch: { type: Function, required: true }
  },
  emits: ['update:resetModalOpen', 'orders-reset'],
  setup(props, { emit }) {
    const toast = useToastStore();
    const confirmStore = useConfirmStore();
    const backups = ref([]);
    const backupDir = ref('');
    const backupLoading = ref(false);
    const newBackupLabel = ref('');
    const resetConfirmText = ref('');
    const resetCustomerBalances = ref(true);
    const resetLoading = ref(false);

    const fetchBackups = async () => {
      try {
        const res = await props.adminFetch('/api/admin/backups');
        if (res.ok) {
          const data = await res.json();
          backups.value = data.backups || [];
          if (data.backupDir) {
            backupDir.value = data.backupDir;
          }
        }
      } catch (e) {
        console.error('Fetch backups error', e);
      }
    };

    const createBackup = async () => {
      backupLoading.value = true;
      try {
        const res = await props.adminFetch('/api/admin/backup', {
          method: 'POST',
          body: JSON.stringify({ label: newBackupLabel.value.trim() })
        });
        const data = await res.json();
        if (res.ok && data.success) {
          if (data.backupDir) {
            backupDir.value = data.backupDir;
          }
          toast.show(
            data.filePath
              ? `تم حفظ النسخة الاحتياطية في: ${data.filePath}`
              : 'تم إنشاء النسخة الاحتياطية بنجاح',
            'success'
          );
          newBackupLabel.value = '';
          await fetchBackups();
        } else {
          toast.show(data.error || 'فشل إنشاء النسخة الاحتياطية', 'danger');
        }
      } catch (e) {
        console.error('Create backup error', e);
        toast.show('حدث خطأ في إنشاء النسخة الاحتياطية', 'danger');
      } finally {
        backupLoading.value = false;
      }
    };

    const downloadBackup = (id, fileName) => {
      const url = `/api/admin/backup/${id}/download`;
      props.adminFetch(url)
        .then((res) => res.blob())
        .then((blob) => {
          const dlUrl = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = dlUrl;
          a.download = fileName || `emenu-backup-${new Date().toISOString().slice(0, 10)}.json`;
          document.body.appendChild(a);
          a.click();
          a.remove();
          window.URL.revokeObjectURL(dlUrl);
          toast.show('تم بدء تنزيل النسخة الاحتياطية', 'success');
        })
        .catch((err) => {
          console.error('Download backup error', err);
          toast.show('فشل تنزيل النسخة الاحتياطية', 'danger');
        });
    };

    const deleteBackup = async (id) => {
      const ok = await confirmStore.ask({
        title: 'حذف النسخة الاحتياطية',
        message: 'هل أنت متأكد من رغبتك في حذف هذه النسخة الاحتياطية من السجل؟',
        confirmText: 'حذف النسخة',
        variant: 'danger'
      });
      if (!ok) return;
      try {
        const res = await props.adminFetch(`/api/admin/backup/${id}`, { method: 'DELETE' });
        if (res.ok) {
          toast.show('تم حذف النسخة الاحتياطية بنجاح', 'success');
          await fetchBackups();
        } else {
          const data = await res.json();
          toast.show(data.error || 'فشل حذف النسخة الاحتياطية', 'danger');
        }
      } catch (e) {
        console.error('Delete backup error', e);
        toast.show('حدث خطأ في حذف النسخة الاحتياطية', 'danger');
      }
    };

    const openResetModal = () => {
      resetConfirmText.value = '';
      resetCustomerBalances.value = true;
      emit('update:resetModalOpen', true);
    };

    const confirmResetOrders = async () => {
      if (resetConfirmText.value.trim() !== 'مسح البيانات') return;
      resetLoading.value = true;
      try {
        const res = await props.adminFetch('/api/admin/reset/orders', {
          method: 'POST',
          body: JSON.stringify({
            confirm: 'RESET_ALL_ORDERS',
            resetCustomerBalances: resetCustomerBalances.value
          })
        });
        const data = await res.json();
        if (res.ok && data.success) {
          toast.show('تم مسح وإعادة ضبط سجل الطلبات والمبيعات بنجاح', 'success');
          emit('update:resetModalOpen', false);
          resetConfirmText.value = '';
          await fetchBackups();
          emit('orders-reset');
        } else {
          toast.show(data.error || 'فشل مسح البيانات', 'danger');
        }
      } catch (e) {
        console.error('Reset orders error', e);
        toast.show('حدث خطأ في مسح البيانات', 'danger');
      } finally {
        resetLoading.value = false;
      }
    };

    onMounted(() => {
      fetchBackups();
    });

    return {
      backups,
      backupDir,
      backupLoading,
      newBackupLabel,
      resetConfirmText,
      resetCustomerBalances,
      resetLoading,
      createBackup,
      downloadBackup,
      deleteBackup,
      openResetModal,
      confirmResetOrders
    };
  }
};
</script>

<style scoped>
@import '../assets/admin-tabs-shared.css';

.settings-grid {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.backup-folder-banner {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 10px 14px;
  color: #334155;
}

.backup-folder-path {
  background: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  padding: 3px 10px;
  font-size: 0.8rem;
  font-weight: 700;
  color: #0f172a;
}

.backup-file-sub {
  font-size: 0.74rem;
  color: #475569;
}

.backup-action-bar {
  background: rgba(255, 255, 255, 0.6);
  padding: 12px;
  border-radius: 12px;
  border: 1px solid rgba(0, 0, 0, 0.06);
}

.backup-label-pill {
  display: inline-block;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 3px 8px;
  font-size: 0.85rem;
  font-weight: 600;
  color: #334155;
  width: fit-content;
}

.badge-stat-pill {
  display: inline-block;
  background: #f1f5f9;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  padding: 2px 7px;
  font-size: 0.78rem;
  font-weight: 600;
  color: #475569;
}

.danger-zone-card {
  background: #fff5f5;
  border: 1.5px solid #fecaca;
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 4px 16px rgba(239, 68, 68, 0.06);
}

.danger-zone-header {
  border-bottom: 1px dashed #fca5a5;
  padding-bottom: 12px;
  margin-bottom: 14px;
}

.danger-zone-title {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 800;
  color: #b91c1c;
}

.danger-zone-desc {
  color: #7f1d1d;
  font-size: 0.92rem;
  margin-bottom: 12px;
  line-height: 1.5;
}

.danger-points-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
  background: rgba(255, 255, 255, 0.7);
  padding: 14px;
  border-radius: 10px;
  border: 1px solid #fee2e2;
}

.danger-point-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 0.88rem;
  color: #991b1b;
}

.danger-point-item.safe-point {
  color: #15803d;
  font-weight: 600;
  margin-top: 4px;
  padding-top: 6px;
  border-top: 1px dashed #e2e8f0;
}

.danger-bullet {
  color: #ef4444;
  font-weight: 900;
  font-size: 1.1rem;
  line-height: 1;
}

.safe-bullet {
  color: #22c55e;
  font-weight: 900;
}

.btn-reset-trigger {
  font-weight: 800;
  min-height: 44px;
  padding: 10px 20px;
  border-radius: 10px;
  box-shadow: 0 4px 14px rgba(239, 68, 68, 0.25);
}

.reset-confirm-modal-box {
  max-width: 520px;
  border-radius: 18px;
  border: 2px solid #ef4444;
}

.reset-modal-header {
  border-bottom: 1px solid #fee2e2;
  background: #fef2f2;
  padding: 14px;
  border-radius: 12px;
}

.reset-header-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: #fee2e2;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.alert-reset-warning {
  background: #fff1f2;
  border: 1px solid #fecdd3;
  border-right: 4px solid #f43f5e;
  border-radius: 8px;
  padding: 10px 14px;
  color: #9f1239;
  font-size: 0.88rem;
  line-height: 1.45;
}

.form-check {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
}

.form-check-input {
  width: 20px;
  height: 20px;
  cursor: pointer;
}

@media (max-width: 768px) {
  .backup-action-bar {
    flex-direction: column;
    align-items: stretch !important;
  }

  .backup-action-bar .form-control,
  .reset-confirm-modal-box .form-control {
    font-size: 16px !important;
    min-height: 46px;
  }

  .backup-action-bar .btn {
    min-height: 46px;
    justify-content: center;
  }
}

@media (prefers-reduced-motion: reduce) {
  .btn-reset-trigger,
  .btn-table-action {
    transition: none !important;
  }
}
</style>
