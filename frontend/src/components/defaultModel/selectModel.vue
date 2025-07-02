<template>
  <div class="select-model">
    <!-- Loading State -->
    <div v-if="loading" class="loading-container">
      <a-spin size="small" />
      <span class="loading-text">{{ t('common.loading') }}</span>
    </div>
    
    <!-- Error State -->
    <div v-else-if="error" class="error-container" role="alert" aria-live="polite">
      <div class="error-message">
        <span class="error-icon">⚠️</span>
        <span class="error-text">{{ error }}</span>
      </div>
      <a-button 
        v-if="onRetry" 
        type="link" 
        size="small" 
        @click="handleRetry"
        :loading="retryLoading"
        class="retry-button"
        :aria-label="t('common.retry')"
      >
        {{ t('common.retry') }}
      </a-button>
    </div>
    
    <!-- Empty State -->
    <div v-else-if="!hasModels && !loading" class="empty-container" role="status" aria-live="polite">
      <div class="empty-content">
        <span class="empty-icon">📋</span>
        <p class="empty-title">{{ t('setting.defaultModel.noModelsAvailable') }}</p>
        <p class="empty-description">{{ t('setting.defaultModel.addPlatformsGuidance') }}</p>
      </div>
    </div>
    
    <!-- Model Select -->
    <a-select
      v-else
      v-model:value="selectedModel"
      style="width: 97%"
      :placeholder="getPlaceholderText"
      :disabled="isSelectDisabled"
      class="select_model_ed"
      :aria-label="t('setting.defaultModel.selectModelLabel')"
      :aria-describedby="hasModels ? 'model-select-help' : undefined"
    >
      <a-select-opt-group v-for="group in groupedModels" :key="group.name" :label="group.name">
        <a-select-option
          v-for="model in group.models"
          :key="model.id"
          :value="model.name"
          :aria-label="`${model.model_name} from ${model.group_name}`"
        >
          {{ model.model_name }} | {{ model.group_name }}
        </a-select-option>
      </a-select-opt-group>
    </a-select>
    
    <!-- Screen reader help text -->
    <div v-if="hasModels" id="model-select-help" class="sr-only">
      {{ t('setting.defaultModel.selectModelHelp') }}
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, defineProps } from 'vue'
import emitter from '@/utils/emitter'
import { useI18n } from 'vue-i18n'
const { t } = useI18n();

const props = defineProps({
  platform_models: {
    type: Array,
    default: () => []
  },
  model_choose: {
    type: Number,
    default: () => 0
  },
  select_type: {
    type: String,
    default: () => 'assistant'
  },
  loading: {
    type: Boolean,
    default: false
  },
  error: {
    type: String,
    default: null
  },
  onRetry: {
    type: Function,
    default: null
  }
})

const retryLoading = ref(false)

const hasModels = computed(() => {
  return !props.loading && !props.error && Array.isArray(props.platform_models) && props.platform_models.length > 0
})

const isSelectDisabled = computed(() => {
  return props.loading || !!props.error || !hasModels.value
})

const getPlaceholderText = computed(() => {
  if (props.loading) {
    return t('common.loading')
  }
  if (props.error) {
    return t('common.errorOccurred')
  }
  if (!hasModels.value) {
    return t('setting.defaultModel.noModelsAvailable')
  }
  return t('setting.defaultModel.emptymodelTips')
})

const handleRetry = async () => {
  if (props.onRetry && !retryLoading.value) {
    retryLoading.value = true
    try {
      await props.onRetry()
    } catch (error) {
      console.error('Retry failed:', error)
    } finally {
      retryLoading.value = false
    }
  }
}

const selectedModel = ref(hasModels.value ? props.model_choose : null)

watch(() => props.model_choose, (newValue) => {
  if (hasModels.value) {
    selectedModel.value = newValue
  }
})

const groupedModels = computed(() => {
  /**
   * result: [
   *   {
   *     name: 'platform_name',
   *     models: [
   *       {
   *         id: 'model_id',
   *         model_name: 'model_name',
   *         group_name: 'group_name'
   *       }
   *     ]
   *   }
   * ]
   */
  const result = [];
  if (hasModels.value) {
    for (const item of props.platform_models) {
      // 查找是否已经有这个 platform_name 的组
      let group = result.find(group => group.name === item.platform_name);
      // 如果没有找到，则新建一个组并加入结果数组
      if (!group) {
        group = {
          name: item.platform_name,
          models: []
        };
        result.push(group);
      }
      // 将当前模型加入对应的组中
      group.models.push({
        id: item.id,
        model_name: item.model_name,
        group_name: item.group_name,
        model_id: item.model_id,
        // 你可以根据需要选择性地添加其他字段
      });
    }
  }

  return result;
});

watch(selectedModel, async (newValue) => {
  if (newValue) {
    emitter.emit(`default-model-changed`, {
      setting_type: props.select_type,
      model_id: Number(newValue)
    })
  }
})
</script>

<style scoped>
.select-model {
  width: 90%;
  height: 100%;
  position: relative;
}

.loading-container {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  gap: 8px;
  background: #fafafa;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  min-height: 32px;
}

.loading-text {
  color: #666;
  font-size: 14px;
}

.error-container {
  padding: 12px;
  background: #fff2f0;
  border: 1px solid #ffccc7;
  border-radius: 6px;
  margin-bottom: 8px;
}

.error-message {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.error-icon {
  font-size: 16px;
}

.error-text {
  color: #ff4d4f;
  font-size: 14px;
  flex: 1;
}

.retry-button {
  padding: 0;
  height: auto;
  font-size: 12px;
}

.empty-container {
  padding: 24px 16px;
  text-align: center;
  background: #fafafa;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  border-style: dashed;
}

.empty-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.empty-icon {
  font-size: 32px;
  opacity: 0.6;
}

.empty-title {
  margin: 0;
  font-size: 16px;
  font-weight: 500;
  color: #262626;
}

.empty-description {
  margin: 0;
  font-size: 14px;
  color: #8c8c8c;
  line-height: 1.4;
}

.select_model_ed {
  transition: all 0.3s ease;
}

.select_model_ed:focus-within {
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
}

/* Screen reader only content */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* Loading animation */
@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.loading-container {
  animation: pulse 1.5s ease-in-out infinite;
}

/* Responsive design */
@media (max-width: 768px) {
  .empty-container {
    padding: 16px 12px;
  }
  
  .empty-icon {
    font-size: 24px;
  }
  
  .empty-title {
    font-size: 14px;
  }
  
  .empty-description {
    font-size: 12px;
  }
}

/* High contrast mode support */
@media (prefers-contrast: high) {
  .error-container {
    border-width: 2px;
  }
  
  .empty-container {
    border-width: 2px;
  }
  
  .loading-container {
    border-width: 2px;
  }
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  .loading-container {
    animation: none;
  }
  
  .select_model_ed {
    transition: none;
  }
}
</style>
