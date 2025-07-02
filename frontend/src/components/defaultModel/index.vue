<template>
    <div class="default-model-container">
        <!-- Loading State -->
        <div v-if="isLoading && !hasModels" class="loading-container">
            <div class="loading-spinner">
                <div class="spinner"></div>
                <p>{{ $t('setting.defaultModel.loadingModels') }}</p>
            </div>
        </div>

        <!-- Error State -->
        <div v-else-if="hasError && !hasModels" class="error-container">
            <div class="error-content">
                <ExclamationCircleOutlined class="error-icon" />
                <h3>{{ $t('setting.defaultModel.errorTitle') }}</h3>
                <p class="error-message">{{ errorMessage }}</p>
                <div class="error-actions">
                    <button 
                        class="retry-button" 
                        @click="retry" 
                        :disabled="retryCount >= maxRetries"
                    >
                        <ReloadOutlined :spin="isLoading" />
                        {{ $t('setting.defaultModel.retry') }}
                        <span v-if="retryCount > 0">({{ retryCount }}/{{ maxRetries }})</span>
                    </button>
                    <button class="refresh-button" @click="loadData">
                        {{ $t('setting.defaultModel.refresh') }}
                    </button>
                </div>
                <p class="error-help">
                    {{ $t('setting.defaultModel.errorHelp') }}
                </p>
            </div>
        </div>

        <!-- Empty State -->
        <div v-else-if="!hasModels && !isLoading" class="empty-container">
            <div class="empty-content">
                <h3>{{ $t('setting.defaultModel.noModelsTitle') }}</h3>
                <p>{{ $t('setting.defaultModel.noModelsMessage') }}</p>
                <button class="add-platforms-button" @click="$router.push('/settings/platforms')">
                    {{ $t('setting.defaultModel.addPlatforms') }}
                </button>
            </div>
        </div>

        <!-- Main Content -->
        <div v-else class="models-content">
            <!-- 助手模型 -->
            <div class="default-item assistant-container">
                <div class="item-header item">
                    <p class="item-title">{{ $t('setting.defaultModel.defaultAssistantModel') }}</p>
                    <div v-if="isLoading" class="item-loading">
                        <div class="mini-spinner"></div>
                    </div>
                </div>

                <div class="item-model item">
                    <selectModel 
                        class="select_model" 
                        :platform_models="platform_models"
                        :model_choose="assistant_model_number" 
                        :select_type="assistant_model.setting_type"
                        :loading="isLoading"
                        :error="hasError ? errorMessage : null"
                        :onRetry="retry"
                    />
                    <div class="assistant setting">
                        <SettingOutlined 
                            class="icon" 
                            @click="handleAssistantSetting" 
                            :class="{ disabled: isLoading }"
                        />
                    </div>
                </div>

                <div class="item-tips item">
                    <p>{{ $t('setting.defaultModel.assistantModelTips') }}</p>
                </div>
            </div>
            <!-- 命名模型 -->
            <div class="default-item topic-naming-contianer">
                <div class="item-header item">
                    <p class="item-title">{{ $t('setting.defaultModel.topicNamingModel') }}</p>
                    <div v-if="isLoading" class="item-loading">
                        <div class="mini-spinner"></div>
                    </div>
                </div>

                <div class="item-model item">
                    <selectModel 
                        class="select_model" 
                        :platform_models="platform_models"
                        :model_choose="topic_naming_model_number" 
                        :select_type="topic_naming_model.setting_type"
                        :loading="isLoading"
                        :error="hasError ? errorMessage : null"
                        :onRetry="retry"
                    />
                    <div class="topic_naming setting">
                        <SettingOutlined 
                            class="icon" 
                            @click="handleTopicNamingSetting" 
                            :class="{ disabled: isLoading }"
                        />
                    </div>
                </div>

                <div class="item-tips item">
                    <p>{{ $t('setting.defaultModel.topicNamingModelTips') }}</p>
                </div>
            </div>
        </div>
        <!-- 翻译模型 -->
<!--        <div class="default-item translation-contianer">-->

<!--            <div class="item-header item">-->
<!--                <p class="item-title">{{ $t('setting.defaultModel.translationModel') }}</p>-->
<!--            </div>-->
<!--            <div class="item-model item">-->
<!--                <selectModel class="select_model" :platform_models="platform_models"-->
<!--                    :model_choose="translation_model_number" :select_type="translation_model.setting_type" />-->
<!--                <div class="translation setting">-->
<!--                    <SettingOutlined class="icon" @click="handleTranslationSetting" />-->
<!--                </div>-->
<!--            </div>-->
<!--            <div class="item-tips item">-->
<!--                <p>{{ $t('setting.defaultModel.translationModelTips') }}</p>-->
<!--            </div>-->
<!--        </div>-->
<!--        <div class="default-item browser-use-contianer">-->

<!--            <div class="item-header item">-->
<!--                <p class="item-title">{{ $t('setting.defaultModel.browserUseModel') }}</p>-->
<!--            </div>-->
<!--            <div class="item-model item">-->
<!--                <selectModel class="select_model" :platform_models="platform_models"-->
<!--                    :model_choose="browser_use_model_number" :select_type="browser_use_model.setting_type" />-->
<!--                <div class="browser-use setting">-->
<!--                    <SettingOutlined class="icon" @click="handleTranslationSetting" />-->
<!--                </div>-->
<!--            </div>-->
<!--            <div class="item-tips item">-->
<!--                <p>{{ $t('setting.defaultModel.browserUseModelTips') }}</p>-->
<!--            </div>-->
<!--        </div>-->
    </div>

    <assistantSetting ref="assistantSettingRef" :model-value="assistant_model" />
    <topicNamingSetting ref="topicNamingSettingRef" :model-value="topic_naming_model" />
    <translationSetting ref="translationSettingRef" :model-value="translation_model" />


</template>

<script setup>
import selectModel from './selectModel.vue'
import assistantSetting from './assistantSetting.vue'
import topicNamingSetting from './TopicNaming.vue'
import translationSetting from './translation.vue'
import { ref, onMounted, onBeforeMount, onUnmounted, nextTick, computed } from 'vue'
import { useI18n } from 'vue-i18n'
const { t } = useI18n()
import { getDefaultModelService } from '@/utils/serviceFactory'
import { useModelsStore } from '@/store/modules/models'
import emitter from '@/utils/emitter'
import { message } from 'ant-design-vue'
import { SettingOutlined, ReloadOutlined, ExclamationCircleOutlined } from '@ant-design/icons-vue'
import { driver } from "driver.js";
import "driver.js/dist/driver.css";


// Initialize the models store
const modelsStore = useModelsStore()

// 定义相关变量
const platform_models = ref([])
const assistant_model_number = ref(Number())
const topic_naming_model_number = ref(Number())
const translation_model_number = ref(Number())
const browser_use_model_number = ref(Number())

// Loading and error states
const loading = ref(false)
const error = ref(null)
const retryCount = ref(0)
const maxRetries = 3


const assistant_model = ref({
    setting_type: 'assistant',
    config: {
        assistant_name: null,
        prompt: null,
        temperature: 1,
        top_p: 1,
        max_tokens: 5,
        enable_length_limit: false
    },
    model_id: Number()
})
const topic_naming_model = ref({
    setting_type: 'topic-naming',
    config: {
        auto_naming: false,
        prompt: ''
    },
    model_id: Number()
})
const translation_model = ref({
    setting_type: 'translation',
    config: {
        prompt: ''
    },
    model_id: Number()
})
const browser_use_model = ref({
    setting_type: 'browser-use',
    config: {
        
    },
    model_id: Number()
})


//子组件引用
const assistantSettingRef = ref()
const topicNamingSettingRef = ref()
const translationSettingRef = ref()
// 助手模型设置
const handleAssistantSetting = () => {
    assistantSettingRef.value.showModal()
}
// 命名模型设置
const handleTopicNamingSetting = () => {
    topicNamingSettingRef.value.showModal()
}
// 翻译模型设置
const handleTranslationSetting = () => {
    translationSettingRef.value.showModal()
}

const handleBrowserSetting = () => {

}

// Computed properties for better state management
const hasModels = computed(() => platform_models.value.length > 0)
const isLoading = computed(() => loading.value || modelsStore.isLoading)
const hasError = computed(() => error.value || modelsStore.hasError)
const errorMessage = computed(() => error.value || modelsStore.error)

// Helper function to handle errors
const handleError = (err, operation = 'operation') => {
    console.error(`[DefaultModel] ${operation} failed:`, err)
    error.value = err.message || `Failed to ${operation}`
    loading.value = false
}

// Helper function to clear errors
const clearError = () => {
    error.value = null
    retryCount.value = 0
    modelsStore.clearError()
}

// Retry function with exponential backoff
const retry = async () => {
    if (retryCount.value >= maxRetries) {
        error.value = 'Maximum retry attempts reached. Please refresh the page.'
        return
    }

    retryCount.value++
    const delay = Math.min(1000 * Math.pow(2, retryCount.value), 10000) // Max 10 seconds
    
    console.log(`[DefaultModel] Retrying operation (attempt ${retryCount.value}/${maxRetries}) after ${delay}ms`)
    
    await new Promise(resolve => setTimeout(resolve, delay))
    await loadData()
}

// Load data function with error handling
const loadData = async () => {
    loading.value = true
    clearError()

    try {
        // Initialize store if needed
        if (!modelsStore.isInitialized) {
            await modelsStore.initialize()
        }

        // Get service dynamically
        const service = await getDefaultModelService()
        
        // Fetch models
        const modelsResponse = await service.getModels()
        platform_models.value = Array.isArray(modelsResponse) ? modelsResponse : []
        
        // Fetch model settings
        const modelsSettings = await service.getModelBySetting()
        const settingsArray = Array.isArray(modelsSettings) ? modelsSettings : [modelsSettings]
        
        settingsArray.forEach((model) => {
            if (model && model.setting_type) {
                switch (model.setting_type) {
                    case 'assistant':
                        assistant_model.value = model
                        assistant_model_number.value = model.model_id
                        break
                    case 'topic-naming':
                        topic_naming_model.value = model
                        topic_naming_model_number.value = model.model_id
                        break
                    case 'translation':
                        translation_model.value = model
                        translation_model_number.value = model.model_id
                        break
                    case 'browser-use':
                        browser_use_model.value = model
                        browser_use_model_number.value = model.model_id
                        break
                }
            }
        })

        loading.value = false
        retryCount.value = 0
        
        console.log('[DefaultModel] Data loaded successfully')
        
    } catch (err) {
        handleError(err, 'load data')
        
        // If this is a network error and we have cached data, use it
        if (err.code === 'NETWORK_ERROR' && modelsStore.hasData) {
            platform_models.value = modelsStore.models
            message.warning(t('setting.defaultModel.usingCachedData'))
            loading.value = false
        }
    }
}

onBeforeMount(async () => {
    await loadData()
})




let tourDriver = null; // 提升作用域，并初始化为空

const step1 = async () => {
  tourDriver = driver({
    animate: true,
    showProgress: true,
    prevBtnText: t('setting.prevStep'),
    nextBtnText: t('setting.nextStep'),
    doneBtnText: t('setting.doneStep'),
    steps: [
      {
        element: '.assistant-container',
        popover: {
          side: 'bottom',
          title: t('setting.defaultModel.defaultAssistantModel'),
          description: t('setting.defaultModel.assistantModelTips'),
          onNextClick: async () => {
            nextTick(() => { 
              tourDriver.moveNext();
            });
          },
        }
      },
      {
        element: '.topic-naming-contianer',
        popover: {
          side: 'bottom',
          title: t('setting.defaultModel.topicNamingModel'),
          description: t('setting.defaultModel.topicNamingModelTips'),
          onNextClick: async () => {
            nextTick(() => { 
              // 设置缓存，结束引导
              localStorage.setItem('tour_end', 'true');
              localStorage.setItem('tour', 'false');
              tourDriver.moveNext();
            });
          },
        }
      }
    ]
  });

  tourDriver.drive();
};

onMounted(async () => {
    // localStorage.setItem('tour', 'true');
    if (localStorage.getItem('tour') === 'true' && localStorage.getItem('tour_end') !== 'true') {
        step1();
    }
    emitter.on('default-assistant-setting-save', async (model_config) => {
        try {
            loading.value = true
            assistant_model.value.config = model_config
            console.log(assistant_model.value);
            
            const service = await getDefaultModelService()
            await service.updateModel(assistant_model.value)
            
            message.success(t('setting.defaultModel.saveSuccess'))
            loading.value = false
        } catch (err) {
            handleError(err, 'save assistant settings')
            message.error(t('setting.defaultModel.saveError'))
        }
    })

    emitter.on('default-topic_naming-setting-save', async (model_config) => {
        try {
            loading.value = true
            topic_naming_model.value.config = model_config
            
            const service = await getDefaultModelService()
            await service.updateModel(topic_naming_model.value)
            
            message.success(t('setting.defaultModel.saveSuccess'))
            loading.value = false
        } catch (err) {
            handleError(err, 'save topic naming settings')
            message.error(t('setting.defaultModel.saveError'))
        }
    })

    emitter.on('default-translation-setting-save', async (model_config) => {
        try {
            loading.value = true
            translation_model.value.config = model_config
            
            const service = await getDefaultModelService()
            await service.updateModel(translation_model.value)
            
            message.success(t('setting.defaultModel.saveSuccess'))
            loading.value = false
        } catch (err) {
            handleError(err, 'save translation settings')
            message.error(t('setting.defaultModel.saveError'))
        }
    })

    emitter.on('default-model-changed', async (newValue) => {
        try {
            loading.value = true
            const setting_type = newValue.setting_type
            const model_id = newValue.model_id
            
            const service = await getDefaultModelService()
            
            if (setting_type === 'assistant') {
                assistant_model_number.value = model_id
                assistant_model.value.model_id = model_id
                await service.updateModel(assistant_model.value)
            } else if (setting_type === 'topic-naming') {
                topic_naming_model_number.value = model_id
                topic_naming_model.value.model_id = model_id
                await service.updateModel(topic_naming_model.value)
            } else if (setting_type === 'translation') {
                translation_model_number.value = model_id
                translation_model.value.model_id = model_id
                await service.updateModel(translation_model.value)
            } else if (setting_type === 'browser-use') {
                browser_use_model_number.value = model_id
                browser_use_model.value.model_id = model_id
                await service.updateModel(browser_use_model.value)
            }
            
            loading.value = false
            console.log(`[DefaultModel] Model updated successfully for ${setting_type}`)
            
        } catch (err) {
            handleError(err, 'update model')
            message.error(t('setting.defaultModel.updateError'))
        }
    })

})

onUnmounted(() => {
    emitter.off('default-assistant-setting-save')
    emitter.off('default-topic_naming-setting-save')
    emitter.off('default-translation-setting-save')
    emitter.off('default-model-changed')
    
    // Clean up store subscriptions if any
    if (modelsStore && typeof modelsStore.$dispose === 'function') {
        modelsStore.$dispose()
    }
})


</script>

<style scoped>
.default-model-container {
    display: flex;
    flex-direction: column;
}

.default-item {
    padding: 16px;
    margin-bottom: 10px;
    background-color: rgb(255, 255, 255);
    width: 70%;
    border: 1px solid #c6c6c6;
    border-radius: 10px;
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.item-header p {
    font-size: 18px;
}

.item-model {
    display: flex;
    align-items: center;
}

.item-tips {
    align-items: center;
}

.item-tips p {
    font-size: 12px;
    color: #5f5f5f;
}

.select_model {
    width: 95%;
    height: 100%;
    justify-content: start;
    align-items: center;
    display: flex;
}

.setting {
    color: #ffffff;
    height: 100%;
    display: flex;
    align-items: center;
}

.icon {
    color: #3c3c46c5;
    transition: color 0.3s ease;
}

.icon.disabled {
    color: #d9d9d9;
    cursor: not-allowed;
}

/* Loading States */
.loading-container {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 200px;
    padding: 40px;
}

.loading-spinner {
    text-align: center;
}

.spinner {
    width: 40px;
    height: 40px;
    border: 4px solid #f3f3f3;
    border-top: 4px solid #1890ff;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto 16px;
}

.mini-spinner {
    width: 16px;
    height: 16px;
    border: 2px solid #f3f3f3;
    border-top: 2px solid #1890ff;
    border-radius: 50%;
    animation: spin 1s linear infinite;
}

@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

.item-loading {
    margin-left: 8px;
}

/* Error States */
.error-container {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 300px;
    padding: 40px;
}

.error-content {
    text-align: center;
    max-width: 500px;
}

.error-icon {
    font-size: 48px;
    color: #ff4d4f;
    margin-bottom: 16px;
}

.error-message {
    color: #666;
    margin-bottom: 24px;
    font-size: 14px;
}

.error-actions {
    display: flex;
    gap: 12px;
    justify-content: center;
    margin-bottom: 16px;
}

.retry-button, .refresh-button {
    padding: 8px 16px;
    border: 1px solid #d9d9d9;
    border-radius: 6px;
    background: white;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
    transition: all 0.3s ease;
}

.retry-button:hover, .refresh-button:hover {
    border-color: #1890ff;
    color: #1890ff;
}

.retry-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.error-help {
    font-size: 12px;
    color: #999;
}

/* Empty States */
.empty-container {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 200px;
    padding: 40px;
}

.empty-content {
    text-align: center;
}

.add-platforms-button {
    padding: 12px 24px;
    background: #1890ff;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    margin-top: 16px;
    transition: background 0.3s ease;
}

.add-platforms-button:hover {
    background: #40a9ff;
}

@media screen and (max-width: 768px) {
    .default-model-container {
        margin: 0 !important;
    }

    .default-item {
        width: 100% !important;
        margin: 0 !important;
        margin-bottom: 16px !important;
        height: 100% !important;
    }

    .error-actions {
        flex-direction: column;
        align-items: center;
    }

    .retry-button, .refresh-button {
        width: 100%;
        max-width: 200px;
    }
}
</style>
