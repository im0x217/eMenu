<script setup>
import { ref } from 'vue';
import { useAuthStore } from '../stores/auth';
import { useToastStore } from '../stores/toast';

const authStore = useAuthStore();
const toastStore = useToastStore();

const newPassword = ref('');
const confirmPassword = ref('');
const showNewPassword = ref(false);
const showConfirmPassword = ref(false);
const isSubmitting = ref(false);
const errorMessage = ref('');

const handleSubmit = async () => {
  if (!newPassword.value) {
    errorMessage.value = 'يرجى إدخال كلمة المرور';
    return;
  }
  if (newPassword.value.length < 4) {
    errorMessage.value = 'كلمة المرور يجب أن لا تقل عن 4 خانات';
    return;
  }
  if (newPassword.value !== confirmPassword.value) {
    errorMessage.value = 'كلمتا المرور غير متطابقتين';
    return;
  }

  isSubmitting.value = true;
  errorMessage.value = '';

  try {
    await authStore.setPassword(authStore.customerPhone, newPassword.value);
    toastStore.show('تم تأمين حسابك بكلمة المرور بنجاح!', 'success');
    newPassword.value = '';
    confirmPassword.value = '';
  } catch (err) {
    errorMessage.value = err.message || 'فشل حفظ كلمة المرور';
  } finally {
    isSubmitting.value = false;
  }
};

const handleDismiss = () => {
  authStore.showSetPasswordModal = false;
};
</script>

<template>
  <div v-if="authStore.showSetPasswordModal" class="password-modal-overlay animate-fade-in" @click.self="handleDismiss">
    <div class="password-modal-card glass-panel" role="dialog" aria-modal="true">
      <div class="modal-badge-icon">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
      </div>

      <h3 class="modal-title">تأمين حسابك بكلمة مرور</h3>
      <p class="modal-desc">
        لحماية سجل طلباتك وعنوانك ونقاطك، يرجى تعيين كلمة مرور خاصة بحسابك لتسجيل الدخول بأمان في أي وقت.
      </p>

      <div class="account-identity-pill">
        <div class="identity-info">
          <span class="identity-name font-bold">{{ authStore.customerName || 'عميل مسجل' }}</span>
          <span class="identity-phone text-mono font-bold" dir="ltr">{{ authStore.customerPhone }}</span>
        </div>
        <span class="identity-verified-tag">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          <span>مسجل</span>
        </span>
      </div>

      <form @submit.prevent="handleSubmit" class="modal-form">
        <!-- New Password Field -->
        <div class="form-field-group">
          <label class="form-label">كلمة المرور الجديدة</label>
          <div class="input-with-icon-wrapper">
            <input 
              v-model="newPassword" 
              :type="showNewPassword ? 'text' : 'password'" 
              placeholder="اكتب كلمة المرور (4 خانات على الأقل)…" 
              class="form-control-modal"
              autocomplete="new-password"
              required
            />
            <button type="button" class="btn-toggle-eye" @click="showNewPassword = !showNewPassword" tabindex="-1">
              <svg v-if="!showNewPassword" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
            </button>
          </div>
        </div>

        <!-- Confirm Password Field -->
        <div class="form-field-group">
          <label class="form-label">تأكيد كلمة المرور</label>
          <div class="input-with-icon-wrapper">
            <input 
              v-model="confirmPassword" 
              :type="showConfirmPassword ? 'text' : 'password'" 
              placeholder="أعد كتابة كلمة المرور…" 
              class="form-control-modal"
              autocomplete="new-password"
              required
            />
            <button type="button" class="btn-toggle-eye" @click="showConfirmPassword = !showConfirmPassword" tabindex="-1">
              <svg v-if="!showConfirmPassword" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
            </button>
          </div>
        </div>

        <div v-if="errorMessage" class="modal-alert-danger animate-fade-in">
          {{ errorMessage }}
        </div>

        <div class="modal-actions-row">
          <button type="submit" class="btn-modal-submit" :disabled="isSubmitting">
            <svg v-if="!isSubmitting" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            <span v-if="!isSubmitting">حفظ وتأمين الحساب</span>
            <span v-else>جاري الحفظ…</span>
          </button>
          <button type="button" class="btn-modal-cancel" @click="handleDismiss" :disabled="isSubmitting">
            لاحقاً
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.password-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.75);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 16px;
  direction: rtl;
  animation: modalOverlayFade 0.22s ease-out both;
  will-change: opacity;
}

@keyframes modalOverlayFade {
  0% { opacity: 0; }
  100% { opacity: 1; }
}

.password-modal-card {
  width: 100%;
  max-width: 440px;
  background: rgba(255, 255, 255, 0.98);
  border: 1px solid rgba(226, 232, 240, 0.9);
  border-radius: 20px;
  padding: 28px 24px;
  box-shadow: 0 25px 60px rgba(15, 23, 42, 0.3);
  text-align: center;
  font-family: 'Cairo', sans-serif;
  animation: modalMaterializeIn 0.28s cubic-bezier(0.16, 1, 0.3, 1) both;
  will-change: transform, opacity;
  transform: translateZ(0);
}

@keyframes modalMaterializeIn {
  0% {
    opacity: 0;
    transform: translateY(14px) scale(0.985);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.modal-badge-icon {
  width: 56px;
  height: 56px;
  margin: 0 auto 14px auto;
  border-radius: 16px;
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(217, 119, 6, 0.25));
  border: 1px solid rgba(245, 158, 11, 0.35);
  color: #d97706;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-title {
  font-size: 1.25rem;
  font-weight: 850;
  color: #0f172a;
  margin: 0 0 6px 0;
}

.modal-desc {
  font-size: 0.86rem;
  color: #64748b;
  line-height: 1.5;
  margin: 0 0 16px 0;
}

.account-identity-pill {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 10px 14px;
  margin-bottom: 18px;
  text-align: right;
}

.identity-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.identity-name {
  font-size: 0.92rem;
  color: #1e293b;
}

.identity-phone {
  font-size: 0.84rem;
  color: #64748b;
}

.identity-verified-tag {
  font-size: 0.75rem;
  font-weight: 800;
  background: rgba(16, 185, 129, 0.12);
  color: #059669;
  padding: 3px 8px;
  border-radius: 8px;
}

.modal-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
  text-align: right;
}

.form-field-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-label {
  font-size: 0.84rem;
  font-weight: 750;
  color: #334155;
}

.input-with-icon-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.form-control-modal {
  width: 100%;
  height: 42px;
  padding: 8px 40px 8px 12px;
  border: 1.5px solid #cbd5e1;
  border-radius: 10px;
  font-family: inherit;
  font-size: 0.9rem;
  color: #0f172a;
  background: #ffffff;
  transition: all 0.2s ease;
  box-sizing: border-box;
}

.form-control-modal:focus {
  border-color: #f59e0b;
  outline: none;
  box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.15);
}

.btn-toggle-eye {
  position: absolute;
  left: 10px;
  background: transparent;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
  transition: color 0.15s ease;
}

.btn-toggle-eye:hover {
  color: #475569;
}

.modal-alert-danger {
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #b91c1c;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 0.82rem;
  font-weight: 700;
  text-align: center;
}

.modal-actions-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 8px;
}

.btn-modal-submit {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 42px;
  border-radius: 10px;
  background: linear-gradient(135deg, #f59e0b, #d97706);
  border: 1px solid #d97706;
  color: #ffffff;
  font-family: inherit;
  font-size: 0.92rem;
  font-weight: 800;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  box-shadow: 0 4px 14px rgba(217, 119, 6, 0.3);
}

.btn-modal-submit:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 18px rgba(217, 119, 6, 0.4);
  background: linear-gradient(135deg, #fbbf24, #ea580c);
}

.btn-modal-submit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-modal-cancel {
  height: 42px;
  padding: 0 16px;
  border-radius: 10px;
  background: #f1f5f9;
  border: 1px solid #cbd5e1;
  color: #475569;
  font-family: inherit;
  font-size: 0.88rem;
  font-weight: 750;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-modal-cancel:hover:not(:disabled) {
  background: #e2e8f0;
  color: #0f172a;
}
</style>
