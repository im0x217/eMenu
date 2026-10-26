<template>
  <div class="users-tab-content">
    <div class="table-card glass-panel overflow-hidden">
      <div class="card-toolbar card-toolbar-unified justify-content-end">
        <button @click="openUserModal()" class="btn btn-primary">
          <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" class="me-1" style="display:inline-block; vertical-align:middle;"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          <span>إضافة مستخدم جديد</span>
        </button>
      </div>

      <div class="table-container">
        <table class="admin-table desktop-users-table">
          <thead>
            <tr>
              <th>الاسم / حساب الدخول</th>
              <th>الدور / الصلاحية</th>
              <th>نطاق المتجر</th>
              <th>تاريخ الإضافة</th>
              <th>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="adminUsers.length === 0">
              <td colspan="5" class="text-center p-4">لا يوجد مستخدمون مدخلون بعد.</td>
            </tr>
            <tr v-for="(u, idx) in adminUsers" :key="u._id" :class="{ 'keyboard-selected-row': !isMobileScreen && selectedTableRowIndex === idx }">
              <td class="text-bold">{{ u.name }}</td>
              <td>
                <span class="price-mode-badge" :class="u.role === 'admin' ? 'regular' : 'bulk'">
                  {{ u.role === 'admin' ? 'مدير النظام' : 'إدارة الطلبات والإنتاج' }}
                </span>
              </td>
              <td>
                <span class="text-small text-muted">
                  {{ u.shopAccess === 'shop1' ? 'المتجر الرئيسي' : u.shopAccess === 'shop2' ? 'قسم النواشف' : 'جميع المتاجر' }}
                </span>
              </td>
              <td class="text-mono text-small">{{ u.createdAt ? new Date(u.createdAt).toLocaleDateString('ar-LY') : '-' }}</td>
              <td>
                <div class="order-actions-btns">
                  <button @click="openUserModal(u)" class="btn-table-action btn-action-edit" title="تعديل المستخدم">
                    <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    <span>تعديل</span>
                  </button>
                  <button @click="deleteUser(u._id)" class="btn-table-action btn-action-delete" title="حذف حساب المستخدم" :aria-label="`حذف حساب المستخدم ${u.name}`">
                    <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    <span>حذف</span>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Mobile Users Cards Grid (Active on screens <= 768px) -->
        <div class="mobile-users-cards-grid">
          <div v-if="adminUsers.length === 0" class="empty-state-card p-4 text-center">
            <p class="text-muted mb-0">لا يوجد مستخدمون مدخلون بعد.</p>
          </div>
          <div
            v-for="u in adminUsers"
            :key="'mob-user-' + u._id"
            class="mobile-user-card glass-panel"
          >
            <div class="mob-user-header">
              <div class="mob-user-avatar-wrap">
                <div class="mob-user-avatar" :class="u.role === 'admin' ? 'admin' : 'staff'">
                  <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                </div>
                <div class="mob-user-meta">
                  <span class="mob-user-name font-bold">{{ u.name }}</span>
                  <span class="mob-user-date text-mono text-muted text-small">{{ u.createdAt ? new Date(u.createdAt).toLocaleDateString('ar-LY') : '-' }}</span>
                </div>
              </div>
              <span class="price-mode-badge" :class="u.role === 'admin' ? 'regular' : 'bulk'">
                {{ u.role === 'admin' ? 'مدير النظام' : 'إدارة الطلبات والإنتاج' }}
              </span>
            </div>
            <div class="mob-user-body">
              <div class="mob-user-scope">
                <span class="lbl text-muted">نطاق المتجر:</span>
                <span class="val font-semibold">
                  {{ u.shopAccess === 'shop1' ? 'المتجر الرئيسي' : u.shopAccess === 'shop2' ? 'قسم النواشف' : 'جميع المتاجر' }}
                </span>
              </div>
              <div class="mob-user-actions">
                <button @click="openUserModal(u)" class="btn-card-action btn-action-edit" :aria-label="`تعديل المستخدم ${u.name}`">
                  <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                  <span>تعديل</span>
                </button>
                <button @click="deleteUser(u._id)" class="btn-card-action btn-action-delete" :aria-label="`حذف المستخدم ${u.name}`">
                  <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                  <span>حذف</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- User Modal Form -->
    <Transition name="modal-spring-fade">
      <div v-if="modalOpen" class="modal-overlay" @click.self="$emit('update:modalOpen', false)">
        <div class="modal-box glass-panel max-w-lg user-form-modal" role="dialog" aria-modal="true" aria-labelledby="user-modal-title" v-sheet-gesture="() => $emit('update:modalOpen', false)">
          <div class="sheet-grab-handle" aria-hidden="true"></div>
          <div class="modal-header">
            <div class="modal-title-group">
              <div class="modal-title-icon" aria-hidden="true">
                <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="23" y1="11" x2="17" y2="11"></line></svg>
              </div>
              <h3 id="user-modal-title">{{ editingUser._id ? 'تعديل بيانات المستخدم' : 'إضافة مستخدم جديد' }}</h3>
            </div>
            <button @click="$emit('update:modalOpen', false)" class="modal-close-btn" aria-label="إغلاق">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>

          <form @submit.prevent="saveUser" class="modal-form">
            <div class="form-group mb-3">
              <label class="form-label">الاسم / اسم الحساب للدخول</label>
              <input ref="nameInputRef" type="text" v-model="editingUser.name" class="form-input" placeholder="مثال: علي محمد…" required />
            </div>

            <div class="form-group mb-3">
              <label class="form-label">{{ editingUser._id ? 'كلمة المرور الجديدة (اتركه فارغاً للإبقاء على الحالية)' : 'كلمة المرور' }}</label>
              <input type="password" v-model="editingUser.password" class="form-input" :placeholder="editingUser._id ? 'بدون تغيير إذا تُرك فارغاً…' : 'كلمة المرور…'" :required="!editingUser._id" />
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">الدور وصلاحيات الوصول</label>
                <select v-model="editingUser.role" class="form-select user-form-select">
                  <option value="order_manager">موظف إدارة الطلبات والإنتاج (Order & Production Manager - طلبات، عملاء، إنتاج)</option>
                  <option value="admin">مدير النظام (Admin - وصول كامل)</option>
                </select>
              </div>

              <div class="form-group">
                <label class="form-label">نطاق المتجر</label>
                <select v-model="editingUser.shopAccess" class="form-select user-form-select">
                  <option value="all">جميع المتاجر</option>
                  <option value="shop1">المتجر الرئيسي فقط</option>
                  <option value="shop2">قسم النواشف فقط</option>
                </select>
              </div>
            </div>

            <div class="modal-footer mt-4">
              <button type="submit" class="btn btn-primary btn-modal-save" :disabled="saving">
                <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-left: 6px;"><polyline points="20 6 9 17 4 12"></polyline></svg>
                {{ saving ? 'جاري الحفظ…' : 'حفظ البيانات' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script>
import { ref, reactive, watch, nextTick } from 'vue';
import { useToastStore } from '../stores/toast';

export default {
  name: 'AdminUsersTab',
  props: {
    adminUsers: { type: Array, default: () => [] },
    isMobileScreen: { type: Boolean, default: false },
    selectedTableRowIndex: { type: Number, default: 0 },
    modalOpen: { type: Boolean, default: false },
    initialUser: { type: Object, default: null },
    adminFetch: { type: Function, required: true }
  },
  emits: ['update:modalOpen', 'refresh'],
  setup(props, { emit }) {
    const toast = useToastStore();
    const saving = ref(false);
    const nameInputRef = ref(null);
    const editingUser = reactive({
      _id: null,
      name: '',
      password: '',
      role: 'order_manager',
      shopAccess: 'all'
    });

    const populateForm = (user = null) => {
      if (user) {
        editingUser._id = user._id;
        editingUser.name = user.name || '';
        editingUser.password = '';
        editingUser.role = user.role || 'order_manager';
        editingUser.shopAccess = user.shopAccess || 'all';
      } else {
        editingUser._id = null;
        editingUser.name = '';
        editingUser.password = '';
        editingUser.role = 'order_manager';
        editingUser.shopAccess = 'all';
      }
    };

    watch(
      () => props.modalOpen,
      (isOpen) => {
        if (isOpen) {
          populateForm(props.initialUser);
          nextTick(() => {
            if (!props.isMobileScreen && nameInputRef.value) {
              nameInputRef.value.focus();
            }
          });
        }
      },
      { immediate: true }
    );

    const openUserModal = (user = null) => {
      populateForm(user);
      emit('update:modalOpen', true);
      nextTick(() => {
        if (!props.isMobileScreen && nameInputRef.value) {
          nameInputRef.value.focus();
        }
      });
    };

    const saveUser = async () => {
      if (!editingUser.name || (!editingUser._id && !editingUser.password)) {
        toast.show('جميع الحقول المطلوبة إلزامية', 'danger');
        return;
      }
      saving.value = true;
      try {
        const isEdit = !!editingUser._id;
        const url = isEdit ? `/api/admin/users/${editingUser._id}` : '/api/admin/users';
        const method = isEdit ? 'PUT' : 'POST';
        const res = await props.adminFetch(url, {
          method,
          body: JSON.stringify(editingUser)
        });
        if (res.ok) {
          toast.show(isEdit ? 'تم تحديث بيانات المستخدم بنجاح' : 'تم إضافة المستخدم بنجاح', 'success');
          emit('update:modalOpen', false);
          emit('refresh');
        } else {
          const data = await res.json();
          toast.show(data.error || 'فشل حفظ بيانات المستخدم', 'danger');
        }
      } catch (e) {
        toast.show('حدث خطأ بالاتصال بالخادم', 'danger');
      } finally {
        saving.value = false;
      }
    };

    const deleteUser = async (id) => {
      if (!confirm('هل أنت متأكد من حذف هذا المستخدم نهائياً؟')) return;
      try {
        const res = await props.adminFetch(`/api/admin/users/${id}`, { method: 'DELETE' });
        if (res.ok) {
          toast.show('تم حذف المستخدم بنجاح', 'success');
          emit('refresh');
        } else {
          toast.show('فشل حذف المستخدم', 'danger');
        }
      } catch (e) {
        toast.show('حدث خطأ بالاتصال بالخادم', 'danger');
      }
    };

    return {
      saving,
      nameInputRef,
      editingUser,
      openUserModal,
      saveUser,
      deleteUser
    };
  }
};
</script>

<style scoped>
@import '../assets/admin-tabs-shared.css';

.price-mode-badge {
  display: inline-block;
  padding: 4px 10px;
  font-size: 0.76rem;
  font-weight: 700;
  border-radius: 6px;
}

.price-mode-badge.regular {
  background: #e7f5ff;
  color: #228be6;
}

.price-mode-badge.bulk {
  background: #fff4e6;
  color: #fd7e14;
}

.user-form-modal select,
.user-form-select {
  -webkit-appearance: none !important;
  -moz-appearance: none !important;
  appearance: none !important;
  width: 100% !important;
  box-sizing: border-box !important;
  background-color: #ffffff !important;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E") !important;
  background-repeat: no-repeat !important;
  background-position: left 14px center !important;
  background-size: 16px 16px !important;
  padding: 10px 14px 10px 38px !important;
  border: 1.5px solid #cbd5e1 !important;
  border-radius: 10px !important;
  color: #0f172a !important;
  font-family: 'Cairo', sans-serif !important;
  font-size: 0.92rem !important;
  font-weight: 600 !important;
  min-height: 44px !important;
  outline: none !important;
  direction: rtl !important;
  text-align: right !important;
  cursor: pointer !important;
}

.mobile-users-cards-grid {
  display: none;
}

@media (max-width: 768px) {
  .desktop-users-table {
    display: none !important;
  }

  .mobile-users-cards-grid {
    display: flex !important;
    flex-direction: column !important;
    gap: 12px !important;
    width: 100% !important;
    padding: 12px !important;
    box-sizing: border-box !important;
  }

  .mobile-user-card {
    background: #ffffff !important;
    border: 1px solid #e2e8f0 !important;
    border-radius: 14px !important;
    padding: 14px 16px !important;
    display: flex !important;
    flex-direction: column !important;
    gap: 12px !important;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04) !important;
  }

  .mob-user-header {
    display: flex !important;
    align-items: center !important;
    justify-content: space-between !important;
    gap: 10px !important;
  }

  .mob-user-avatar-wrap {
    display: flex !important;
    align-items: center !important;
    gap: 10px !important;
    min-width: 0 !important;
    flex: 1 !important;
  }

  .mob-user-avatar {
    width: 38px !important;
    height: 38px !important;
    border-radius: 50% !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    flex-shrink: 0 !important;
  }

  .mob-user-avatar.admin {
    background: #eff6ff !important;
    color: #2563eb !important;
  }

  .mob-user-avatar.staff {
    background: #f0fdf4 !important;
    color: #16a34a !important;
  }

  .mob-user-meta {
    display: flex !important;
    flex-direction: column !important;
    gap: 2px !important;
    min-width: 0 !important;
  }

  .mob-user-name {
    font-size: 0.95rem !important;
    color: #0f172a !important;
    font-weight: 800 !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
    white-space: nowrap !important;
  }

  .mob-user-body {
    display: flex !important;
    flex-direction: column !important;
    gap: 10px !important;
    padding-top: 8px !important;
    border-top: 1px solid #f1f5f9 !important;
  }

  .mob-user-scope {
    display: flex !important;
    align-items: center !important;
    gap: 8px !important;
    font-size: 0.82rem !important;
  }

  .mob-user-actions {
    display: grid !important;
    grid-template-columns: 1fr 1fr !important;
    gap: 8px !important;
  }

  .btn-card-action {
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    gap: 6px !important;
    min-height: 44px !important;
    padding: 8px 14px !important;
    border-radius: 10px !important;
    font-size: 0.88rem !important;
    font-weight: 750 !important;
    font-family: 'Cairo', sans-serif !important;
    cursor: pointer !important;
    border: 1px solid #e2e8f0 !important;
    background: #ffffff !important;
  }

  .btn-card-action.btn-action-edit {
    color: #2563eb !important;
    border-color: #bfdbfe !important;
    background: #eff6ff !important;
  }

  .btn-card-action.btn-action-delete {
    color: #ef4444 !important;
    border-color: #fca5a5 !important;
    background: #fef2f2 !important;
  }
}
</style>
