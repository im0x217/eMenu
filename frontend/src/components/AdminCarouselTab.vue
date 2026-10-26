<template>
  <div class="carousel-tab-content">
    <div class="table-card glass-panel overflow-hidden p-0">
      <div class="card-toolbar card-toolbar-unified justify-content-end">
        <button @click="openCarouselModal()" class="btn btn-primary">
          <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" class="me-1" style="display:inline-block; vertical-align:middle;"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          <span>إضافة بنر جديد</span>
        </button>
      </div>

      <div class="p-3">
        <!-- SKELETON CAROUSEL GRID -->
        <div v-if="carouselLoading" class="carousel-grid">
          <div v-for="i in 3" :key="'car-skel-' + i" class="carousel-admin-card glass-panel skeleton-card">
            <div class="skeleton-shimmer" style="height: 180px; width: 100%; border-radius: 12px 12px 0 0;"></div>
            <div class="p-3 d-flex justify-content-between align-items-center">
              <div class="skeleton-shimmer" style="width: 100px; height: 14px;"></div>
              <div class="d-flex gap-2">
                <div class="skeleton-shimmer" style="width: 50px; height: 28px; border-radius: 6px;"></div>
                <div class="skeleton-shimmer" style="width: 50px; height: 28px; border-radius: 6px;"></div>
              </div>
            </div>
          </div>
        </div>

        <div v-else-if="carouselItems.length > 0" class="carousel-grid">
          <div v-for="item in carouselItems" :key="item._id" class="carousel-admin-card glass-panel animate-scale-in">
            <div class="card-image-wrapper">
              <div class="admin-banner-shimmer"></div>
              <img :src="item.image" alt="Banner Preview" class="card-image" loading="lazy" decoding="async" @click="$emit('zoom', item.image)" title="تكبير المعاينة" />
            </div>
            <div class="card-info-bar">
              <span class="card-date">تاريخ الإضافة: {{ new Date(item.createdAt).toLocaleDateString('ar-LY') }}</span>
              <div style="display: flex; gap: 8px;">
                <button @click="openCarouselModal(item)" class="btn-table-action btn-action-edit" title="تعديل البنر" aria-label="تعديل البنر">
                  <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                  <span>تعديل</span>
                </button>
                <button @click="deleteCarouselItem(item._id)" class="btn-table-action btn-action-delete" title="حذف البنر" aria-label="حذف البنر">
                  <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                  <span>حذف</span>
                </button>
              </div>
            </div>
          </div>
        </div>
        <div v-else class="text-center p-5 text-muted">
          لا توجد بنرات عروض تسويقية مضافة حالياً.
        </div>
      </div>
    </div>

    <!-- Marketing Carousel Modal Form -->
    <Transition name="modal-spring-fade">
      <div v-if="modalOpen" class="modal-overlay" @click.self="$emit('update:modalOpen', false)">
        <div class="modal-box glass-panel max-w-md" role="dialog" aria-modal="true" aria-labelledby="carousel-modal-title" v-sheet-gesture="() => $emit('update:modalOpen', false)">
          <div class="sheet-grab-handle" aria-hidden="true"></div>
          <div class="modal-header">
            <h3 id="carousel-modal-title">{{ editingCarouselId ? 'تعديل البنر الإعلاني' : 'إضافة بنر إعلاني جديد' }}</h3>
            <button @click="$emit('update:modalOpen', false)" class="modal-close-btn" aria-label="إغلاق">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
          <form @submit.prevent="saveCarouselItem" class="modal-form">
            <p class="modal-subtitle text-muted text-small mb-3">اختر صورة البنر الإعلاني ورابط التوجيه ليتم تحديثها وعرضها مباشرة للزبائن.</p>

            <!-- S3 Image Upload Dropzone -->
            <div class="form-group animate-fade-in">
              <input type="file" ref="carouselFileInput" class="hidden-file-input" style="display: none;" accept="image/*" @click.stop @change="handleCarouselImageFileSelect" />
              <div
                class="image-dropzone"
                :class="{ active: carouselDragActive }"
                @dragover.prevent="carouselDragActive = true"
                @dragleave.prevent="carouselDragActive = false"
                @drop.prevent="handleCarouselDrop($event)"
                @click="triggerCarouselImageSelect"
                role="button"
                tabindex="0"
                @keydown.enter.prevent="triggerCarouselImageSelect"
                @keydown.space.prevent="triggerCarouselImageSelect"
              >
                <div v-if="!newCarouselItem.filePreview" class="dropzone-prompt">
                  <svg aria-hidden="true" class="cloud-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                  <span>اسحب صورة البنر إلى هنا أو تصفح الملفات</span>
                </div>
                <div v-else class="dropzone-preview" @click.stop>
                  <img :src="newCarouselItem.filePreview" alt="Preview" style="max-height: 160px; width: 100%; object-fit: contain; border-radius: 8px; margin-bottom: 8px;" />
                  <span class="file-name">{{ newCarouselItem.file ? newCarouselItem.file.name : 'البنر الحالي (تغيير الصورة)' }}</span>
                  <span v-if="newCarouselItem.dimensions" class="file-dimensions block text-muted text-small mt-1" style="font-size: 0.75rem; color: #868e96; font-weight: 500;">
                    المقاسات: {{ newCarouselItem.dimensions }}
                  </span>
                  <button type="button" @click="clearCarouselFile" class="btn btn-outline btn-xs mt-2" style="color: #fa5252; border-color: #ffc9c9;">إزالة الصورة</button>
                </div>
              </div>
            </div>

            <!-- Link input field -->
            <div class="form-group mt-3">
              <label class="form-label text-bold" style="font-size: 0.9rem;">رابط التوجيه عند الضغط على البنر (اختياري)</label>
              <input v-model="newCarouselItem.link" type="text" placeholder="مثال: /category/وجبات أو رابط…" class="form-control" />
              <p class="text-muted" style="font-size: 0.72rem; margin-top: 4px; line-height: 1.3;">عندما ينقر الزبون على هذا البنر، سيتم نقله تلقائياً إلى هذا الرابط.</p>
            </div>

            <div class="modal-footer mt-4">
              <button type="submit" class="btn btn-primary" :disabled="saving">
                {{ saving ? 'جاري الحفظ…' : (editingCarouselId ? 'حفظ التعديلات' : 'رفع ونشر البنر الإعلاني') }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Transition>

    <!-- Premium Image Cropper Modal -->
    <Transition name="modal-spring-fade">
      <div v-if="cropperOpen" class="premium-cropper-overlay" role="dialog" aria-modal="true" aria-labelledby="cropper-modal-title">
        <div class="premium-cropper-content">
          <div class="premium-cropper-header">
            <div>
              <h2 id="cropper-modal-title" class="text-xl text-bold" style="margin: 0; color: #1f2937;">تخصيص أبعاد البنر</h2>
              <p class="text-muted text-small" style="margin: 0; margin-top: 4px;">قم بتعديل الصورة لتتناسب مع واجهة المتجر</p>
            </div>
            <button @click="$emit('update:cropperOpen', false)" class="premium-close-btn" aria-label="إغلاق">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>

          <div class="premium-cropper-body">
            <div class="cropper-canvas-container">
              <img ref="cropperImageElement" :src="cropperImageSrc" style="display: block; max-width: 100%;" />
            </div>

            <div class="cropper-toolbar">
              <div class="toolbar-section">
                <span class="toolbar-label">نسبة العرض: ثابتة (3:1)</span>
              </div>

              <div class="toolbar-actions">
                <button type="button" @click="rotateCropperImage(90)" class="tool-btn" title="تدوير يمين" aria-label="تدوير يمين">
                  <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2v6h-6"></path><path d="M21 13a9 9 0 1 1-3-7.7L21 8"></path></svg>
                </button>
                <button type="button" @click="rotateCropperImage(-90)" class="tool-btn" title="تدوير يسار" aria-label="تدوير يسار">
                  <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2v6h6"></path><path d="M3 13a9 9 0 1 0 3-7.7L3 8"></path></svg>
                </button>
                <div class="tool-divider"></div>
                <button type="button" @click="zoomCropperImage(0.1)" class="tool-btn" title="تكبير" aria-label="تكبير">
                  <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="11" y1="8" x2="11" y2="14"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>
                </button>
                <button type="button" @click="zoomCropperImage(-0.1)" class="tool-btn" title="تصغير" aria-label="تصغير">
                  <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>
                </button>
                <div class="tool-divider"></div>
                <button type="button" @click="resetCropperImage" class="tool-btn" title="إعادة ضبط" aria-label="إعادة ضبط">
                  <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path></svg>
                </button>
              </div>
            </div>
          </div>

          <div class="premium-cropper-footer">
            <button type="button" @click="cropAndSaveImage" class="btn btn-primary">
              <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-left: 6px;"><polyline points="20 6 9 17 4 12"></polyline></svg>
              تأكيد القص
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script>
import { ref, reactive, nextTick, onBeforeUnmount } from 'vue';
import { useToastStore } from '../stores/toast';
import Cropper from 'cropperjs';
import 'cropperjs/dist/cropper.css';

export default {
  name: 'AdminCarouselTab',
  props: {
    activeShop: { type: String, required: true },
    carouselItems: { type: Array, default: () => [] },
    carouselLoading: { type: Boolean, default: false },
    modalOpen: { type: Boolean, default: false },
    cropperOpen: { type: Boolean, default: false },
    adminFetch: { type: Function, required: true }
  },
  emits: ['update:modalOpen', 'update:cropperOpen', 'refresh', 'zoom'],
  setup(props, { emit }) {
    const toast = useToastStore();
    const saving = ref(false);
    const editingCarouselId = ref(null);
    const carouselDragActive = ref(false);
    const carouselFileInput = ref(null);
    const cropperImageElement = ref(null);
    const cropperImageSrc = ref('');
    const activeAspectRatio = ref(3 / 1);
    let cropperInstance = null;

    const newCarouselItem = reactive({
      title: '',
      subtitle: '',
      link: '',
      file: null,
      filePreview: '',
      dimensions: ''
    });

    const isImageFile = (file) => {
      return file && file.type && file.type.startsWith('image/');
    };

    const openCarouselModal = (item = null) => {
      if (item) {
        editingCarouselId.value = item._id;
        newCarouselItem.title = item.title || '';
        newCarouselItem.subtitle = item.subtitle || '';
        newCarouselItem.link = item.link || '';
        newCarouselItem.file = null;
        newCarouselItem.filePreview = item.image || '';
        newCarouselItem.dimensions = '';
      } else {
        editingCarouselId.value = null;
        newCarouselItem.title = '';
        newCarouselItem.subtitle = '';
        newCarouselItem.link = '';
        newCarouselItem.file = null;
        newCarouselItem.filePreview = '';
        newCarouselItem.dimensions = '';
      }
      emit('update:modalOpen', true);
    };

    const clearCarouselFile = () => {
      newCarouselItem.file = null;
      newCarouselItem.filePreview = '';
      newCarouselItem.dimensions = '';
      if (carouselFileInput.value) {
        carouselFileInput.value.value = '';
      }
    };

    const triggerCarouselImageSelect = () => {
      if (carouselFileInput.value) {
        carouselFileInput.value.click();
      }
    };

    const setCarouselFile = (file) => {
      if (file.size > 100 * 1024 * 1024) {
        toast.show('حجم الصورة كبير جداً. يجب أن تكون أقل من 100 ميجابايت.', 'danger');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        cropperImageSrc.value = e.target.result;
        emit('update:cropperOpen', true);

        nextTick(() => {
          if (cropperInstance) {
            cropperInstance.destroy();
          }
          if (cropperImageElement.value) {
            cropperInstance = new Cropper(cropperImageElement.value, {
              aspectRatio: activeAspectRatio.value,
              viewMode: 1,
              autoCropArea: 1,
              background: false
            });
          }
        });
      };
      reader.readAsDataURL(file);
    };

    const handleCarouselImageFileSelect = (e) => {
      const file = (e.target.files && e.target.files[0]) ? e.target.files[0] : null;
      if (file && isImageFile(file)) {
        setCarouselFile(file);
      }
      e.target.value = '';
    };

    const handleCarouselDrop = (e) => {
      carouselDragActive.value = false;
      const file = (e.dataTransfer && e.dataTransfer.files) ? e.dataTransfer.files[0] : null;
      if (file && isImageFile(file)) {
        setCarouselFile(file);
      } else if (file) {
        toast.show('يرجى اختيار ملف صورة صالح (JPG, PNG, WEBP…)', 'warning');
      }
    };

    const cropAndSaveImage = () => {
      if (!cropperInstance) return;

      const canvas = cropperInstance.getCroppedCanvas({
        maxWidth: 1600,
        maxHeight: 900,
        imageSmoothingEnabled: true,
        imageSmoothingQuality: 'high'
      });

      canvas.toBlob((blob) => {
        if (!blob) {
          toast.show('حدث خطأ أثناء معالجة وقص الصورة', 'danger');
          return;
        }

        const sizeKb = (blob.size / 1024).toFixed(1);
        const croppedFile = new File([blob], 'banner_compressed.webp', {
          type: blob.type || 'image/webp',
          lastModified: Date.now()
        });

        newCarouselItem.file = croppedFile;
        newCarouselItem.filePreview = canvas.toDataURL('image/webp', 0.78);
        newCarouselItem.dimensions = `${canvas.width} × ${canvas.height} بكسل (حجم مضغوط: ${sizeKb} KB)`;

        emit('update:cropperOpen', false);
        cropperInstance.destroy();
        cropperInstance = null;
        toast.show(`تم ضغط البنر وقصه بنجاح (${sizeKb} KB)`, 'success');
      }, 'image/webp', 0.78);
    };

    const rotateCropperImage = (degree) => {
      if (cropperInstance) cropperInstance.rotate(degree);
    };

    const zoomCropperImage = (ratio) => {
      if (cropperInstance) cropperInstance.zoom(ratio);
    };

    const resetCropperImage = () => {
      if (cropperInstance) cropperInstance.reset();
    };

    const saveCarouselItem = async () => {
      if (!editingCarouselId.value && !newCarouselItem.file) {
        toast.show('حدد صورة للبنر الإعلاني', 'danger');
        return;
      }

      saving.value = true;
      try {
        const formData = new FormData();
        formData.append('shop', props.activeShop);
        formData.append('title', newCarouselItem.title);
        formData.append('subtitle', newCarouselItem.subtitle);
        formData.append('link', newCarouselItem.link);
        if (newCarouselItem.file) {
          formData.append('img', newCarouselItem.file);
        }

        const url = editingCarouselId.value
          ? `/api/admin/marketing-carousel/${editingCarouselId.value}`
          : `/api/admin/marketing-carousel`;

        const res = await props.adminFetch(url, {
          method: editingCarouselId.value ? 'PUT' : 'POST',
          body: formData
        });

        if (res.ok) {
          toast.show(editingCarouselId.value ? 'تم تعديل البنر الإعلاني بنجاح' : 'تمت إضافة البنر الإعلاني بنجاح', 'success');
          emit('update:modalOpen', false);
          emit('refresh');
        } else {
          const errData = await res.json();
          toast.show(errData.error || (editingCarouselId.value ? 'فشل تعديل البنر الإعلاني' : 'فشل إضافة البنر الإعلاني'), 'danger');
        }
      } catch (err) {
        console.error(err);
        toast.show('حدث خطأ أثناء حفظ البنر', 'danger');
      } finally {
        saving.value = false;
      }
    };

    const deleteCarouselItem = async (itemId) => {
      if (!confirm('هل أنت متأكد من رغبتك في حذف هذا البنر الإعلاني؟')) return;
      try {
        const res = await props.adminFetch(`/api/admin/marketing-carousel/${itemId}`, { method: 'DELETE' });
        if (res.ok) {
          toast.show('تم حذف البنر الإعلاني بنجاح', 'success');
          emit('refresh');
        } else {
          toast.show('فشل حذف البنر الإعلاني', 'danger');
        }
      } catch (err) {
        console.error(err);
      }
    };

    onBeforeUnmount(() => {
      if (cropperInstance) {
        cropperInstance.destroy();
        cropperInstance = null;
      }
    });

    return {
      saving,
      editingCarouselId,
      carouselDragActive,
      carouselFileInput,
      cropperImageElement,
      cropperImageSrc,
      newCarouselItem,
      openCarouselModal,
      clearCarouselFile,
      triggerCarouselImageSelect,
      handleCarouselImageFileSelect,
      handleCarouselDrop,
      cropAndSaveImage,
      rotateCropperImage,
      zoomCropperImage,
      resetCropperImage,
      saveCarouselItem,
      deleteCarouselItem
    };
  }
};
</script>

<style scoped>
@import '../assets/admin-tabs-shared.css';

.carousel-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
}

.carousel-admin-card {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  height: 100%;
  border-radius: 14px;
  border: 1px solid #e2e8f0;
  background: #ffffff;
}

.card-image-wrapper {
  width: 100%;
  padding-top: 33.33%;
  position: relative;
  background: rgba(0, 0, 0, 0.03);
}

.card-image {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  cursor: zoom-in;
}

.card-info-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: rgba(255, 255, 255, 0.8);
}

.card-date {
  font-size: 0.78rem;
  color: #64748b;
}

.image-dropzone {
  border: 2px dashed #cbd5e1;
  border-radius: 14px;
  padding: 20px;
  text-align: center;
  cursor: pointer;
  background: #f8fafc;
  transition: all 0.15s ease;
}

.image-dropzone:hover,
.image-dropzone.active {
  border-color: var(--primary-color, #d97706);
  background: rgba(253, 181, 24, 0.06);
}

.cloud-icon {
  width: 32px;
  height: 32px;
  color: #94a3b8;
  margin-bottom: 8px;
}

.dropzone-prompt {
  display: flex;
  flex-direction: column;
  align-items: center;
  font-size: 0.85rem;
  color: #64748b;
}

.dropzone-preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.file-name {
  font-size: 0.78rem;
  color: #334155;
  font-weight: 600;
}

.premium-cropper-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.85);
  backdrop-filter: blur(8px);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.premium-cropper-content {
  background: #ffffff;
  border-radius: 24px;
  width: 100%;
  max-width: 1000px;
  overflow: hidden;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
}

.premium-cropper-header {
  padding: 20px 28px;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #f8fafc;
}

.premium-close-btn {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  color: #64748b;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.premium-cropper-body {
  background: #1e293b;
  display: flex;
  flex-direction: column;
}

.cropper-canvas-container {
  height: 55vh;
  min-height: 320px;
  width: 100%;
  position: relative;
  overflow: hidden;
}

.cropper-toolbar {
  background: rgba(15, 23, 42, 0.95);
  border-top: 1px solid #334155;
  padding: 14px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
}

.toolbar-label {
  color: #94a3b8;
  font-size: 0.88rem;
  font-weight: 600;
  background: #334155;
  padding: 6px 12px;
  border-radius: 20px;
}

.toolbar-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #1e293b;
  padding: 6px;
  border-radius: 12px;
  border: 1px solid #334155;
}

.tool-btn {
  background: transparent;
  border: none;
  color: #cbd5e1;
  width: 44px;
  height: 44px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.tool-btn:hover {
  background: #334155;
  color: #ffffff;
}

.tool-divider {
  width: 1px;
  height: 24px;
  background: #334155;
  margin: 0 4px;
}

.premium-cropper-footer {
  padding: 20px 28px;
  background: #ffffff;
  display: flex;
  justify-content: flex-end;
  gap: 16px;
  border-top: 1px solid #e2e8f0;
}
</style>
