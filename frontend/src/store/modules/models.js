import { defineStore } from 'pinia'
import { getDefaultModelService, getPlatformService, getMode } from '@/utils/serviceFactory'
import emitter from '@/utils/emitter'

export const useModelsStore = defineStore('models', {
  state: () => ({
    models: [],
    platforms: [],
    loading: false,
    error: null,
    lastFetched: null,
    retryCount: 0,
    maxRetries: 3,
    cacheTimeout: 5 * 60 * 1000, // 5 minutes
    isInitialized: false
  }),

  getters: {
    // Group models by platform
    groupedModels: (state) => {
      const grouped = {}
      state.models.forEach(model => {
        const platformName = model.platform_name || 'Unknown'
        if (!grouped[platformName]) {
          grouped[platformName] = []
        }
        grouped[platformName].push(model)
      })
      return grouped
    },

    // Get only enabled models
    enabledModels: (state) => {
      return state.models.filter(model => model.enabled === true || model.enabled === 1)
    },

    // Get models by platform ID
    modelsByPlatform: (state) => {
      return (platformId) => {
        return state.models.filter(model => 
          model.platform_id === platformId || model.platform_id === String(platformId)
        )
      }
    },

    // Check if we have any data
    hasData: (state) => {
      return state.models.length > 0 || state.platforms.length > 0
    },

    // Check if currently loading
    isLoading: (state) => {
      return state.loading
    },

    // Check if there's an error
    hasError: (state) => {
      return state.error !== null
    },

    // Get platforms with model counts
    platformsWithModelCounts: (state) => {
      return state.platforms.map(platform => ({
        ...platform,
        modelCount: state.models.filter(model => 
          model.platform_id === platform.id || model.platform_id === String(platform.id)
        ).length
      }))
    },

    // Get default models by setting type
    defaultModelsByType: (state) => {
      const defaults = {}
      state.models.forEach(model => {
        if (model.is_default) {
          defaults[model.setting_type || 'general'] = model
        }
      })
      return defaults
    }
  },

  actions: {
    // Clear error state
    clearError() {
      this.error = null
      this.retryCount = 0
    },

    // Set loading state
    setLoading(loading) {
      this.loading = loading
      emitter.emit('models:loading', loading)
    },

    // Set error state
    setError(error) {
      this.error = error
      this.setLoading(false)
      emitter.emit('models:error', error)
      console.error('[ModelsStore] Error:', error)
    },

    // Check if cache is valid
    isCacheValid() {
      if (!this.lastFetched) return false
      return Date.now() - this.lastFetched < this.cacheTimeout
    },

    // Calculate retry delay with exponential backoff
    getRetryDelay() {
      return Math.min(1000 * Math.pow(2, this.retryCount), 10000) // Max 10 seconds
    },

    // Fetch models from service
    async fetchModels(forceRefresh = false) {
      // Use cache if valid and not forcing refresh
      if (!forceRefresh && this.isCacheValid() && this.models.length > 0) {
        console.log('[ModelsStore] Using cached models data')
        return this.models
      }

      this.setLoading(true)
      this.clearError()

      try {
        const service = await getDefaultModelService()
        console.log(`[ModelsStore] Fetching models in ${getMode()} mode`)

        const response = await service.getModels()
        
        // Handle different response formats
        let models = []
        if (Array.isArray(response)) {
          models = response
        } else if (response && response.data && Array.isArray(response.data)) {
          models = response.data
        } else if (response && Array.isArray(response.models)) {
          models = response.models
        } else {
          console.warn('[ModelsStore] Unexpected response format:', response)
          models = []
        }

        // Validate and normalize model data
        this.models = models.map(model => ({
          id: model.id,
          model_id: model.model_id || model.id,
          model_name: model.model_name || model.name || 'Unknown Model',
          platform_name: model.platform_name || model.platform || 'Unknown Platform',
          platform_id: model.platform_id,
          enabled: Boolean(model.enabled),
          is_default: Boolean(model.is_default),
          max_tokens: model.max_tokens || 4096,
          description: model.description || '',
          logo_url: model.logo_url || model.logo || '',
          setting_type: model.setting_type || 'general'
        }))

        this.lastFetched = Date.now()
        this.retryCount = 0
        this.setLoading(false)
        
        emitter.emit('models:updated', this.models)
        console.log(`[ModelsStore] Successfully fetched ${this.models.length} models`)
        
        return this.models
      } catch (error) {
        console.error('[ModelsStore] Failed to fetch models:', error)
        this.setError(`Failed to load models: ${error.message}`)
        throw error
      }
    },

    // Fetch platforms from service
    async fetchPlatforms(forceRefresh = false) {
      // Use cache if valid and not forcing refresh
      if (!forceRefresh && this.isCacheValid() && this.platforms.length > 0) {
        console.log('[ModelsStore] Using cached platforms data')
        return this.platforms
      }

      this.setLoading(true)
      this.clearError()

      try {
        const service = await getPlatformService()
        console.log(`[ModelsStore] Fetching platforms in ${getMode()} mode`)

        const response = await service.getPlatforms()
        
        // Handle different response formats
        let platforms = []
        if (Array.isArray(response)) {
          platforms = response
        } else if (response && response.data && Array.isArray(response.data)) {
          platforms = response.data
        } else if (response && Array.isArray(response.platforms)) {
          platforms = response.platforms
        } else {
          console.warn('[ModelsStore] Unexpected platforms response format:', response)
          platforms = []
        }

        // Validate and normalize platform data
        this.platforms = platforms.map(platform => ({
          id: platform.id,
          name: platform.name || 'Unknown Platform',
          api_key: platform.api_key || '',
          api_url: platform.api_url || '',
          enabled: Boolean(platform.enabled),
          description: platform.description || '',
          logo_url: platform.logo_url || platform.logo || '',
          created_at: platform.created_at,
          updated_at: platform.updated_at
        }))

        this.lastFetched = Date.now()
        this.retryCount = 0
        this.setLoading(false)
        
        emitter.emit('platforms:updated', this.platforms)
        console.log(`[ModelsStore] Successfully fetched ${this.platforms.length} platforms`)
        
        return this.platforms
      } catch (error) {
        console.error('[ModelsStore] Failed to fetch platforms:', error)
        this.setError(`Failed to load platforms: ${error.message}`)
        throw error
      }
    },

    // Update a model
    async updateModel(modelData) {
      this.setLoading(true)
      this.clearError()

      try {
        const service = await getDefaultModelService()
        console.log('[ModelsStore] Updating model:', modelData)

        const response = await service.updateModel(modelData)
        
        // Update local state
        const index = this.models.findIndex(m => m.id === modelData.id)
        if (index !== -1) {
          this.models[index] = { ...this.models[index], ...modelData }
        }

        this.setLoading(false)
        emitter.emit('model:updated', modelData)
        console.log('[ModelsStore] Model updated successfully')
        
        return response
      } catch (error) {
        console.error('[ModelsStore] Failed to update model:', error)
        this.setError(`Failed to update model: ${error.message}`)
        throw error
      }
    },

    // Retry failed operations with exponential backoff
    async retry() {
      if (this.retryCount >= this.maxRetries) {
        this.setError('Maximum retry attempts reached. Please refresh the page.')
        return
      }

      this.retryCount++
      const delay = this.getRetryDelay()
      
      console.log(`[ModelsStore] Retrying operation (attempt ${this.retryCount}/${this.maxRetries}) after ${delay}ms`)
      
      await new Promise(resolve => setTimeout(resolve, delay))
      
      try {
        await this.refreshData()
      } catch (error) {
        console.error(`[ModelsStore] Retry attempt ${this.retryCount} failed:`, error)
        if (this.retryCount >= this.maxRetries) {
          this.setError('All retry attempts failed. Please check your connection and try again.')
        }
      }
    },

    // Refresh all data
    async refreshData() {
      console.log('[ModelsStore] Refreshing all data')
      this.clearError()
      
      try {
        await Promise.all([
          this.fetchModels(true),
          this.fetchPlatforms(true)
        ])
        
        emitter.emit('data:refreshed')
        console.log('[ModelsStore] Data refresh completed successfully')
      } catch (error) {
        console.error('[ModelsStore] Failed to refresh data:', error)
        this.setError(`Failed to refresh data: ${error.message}`)
        throw error
      }
    },

    // Initialize store
    async initialize() {
      if (this.isInitialized) {
        return
      }

      console.log('[ModelsStore] Initializing store')
      
      try {
        await this.refreshData()
        this.isInitialized = true
        emitter.emit('store:initialized')
        console.log('[ModelsStore] Store initialized successfully')
      } catch (error) {
        console.error('[ModelsStore] Failed to initialize store:', error)
        // Don't throw here to allow the app to continue with empty state
      }
    },

    // Reset store state
    reset() {
      this.models = []
      this.platforms = []
      this.loading = false
      this.error = null
      this.lastFetched = null
      this.retryCount = 0
      this.isInitialized = false
      
      emitter.emit('store:reset')
      console.log('[ModelsStore] Store reset')
    },

    // Get model by ID
    getModelById(modelId) {
      return this.models.find(model => 
        model.id === modelId || model.model_id === modelId
      )
    },

    // Get platform by ID
    getPlatformById(platformId) {
      return this.platforms.find(platform => 
        platform.id === platformId || platform.id === String(platformId)
      )
    },

    // Check if data needs refresh
    needsRefresh() {
      return !this.isCacheValid() || (!this.models.length && !this.platforms.length)
    }
  },

  persist: {
    key: 'models-store',
    storage: localStorage,
    paths: ['models', 'platforms', 'lastFetched'],
    beforeRestore: (context) => {
      console.log('[ModelsStore] Restoring persisted state')
    },
    afterRestore: (context) => {
      console.log('[ModelsStore] Persisted state restored')
      // Check if cached data is still valid
      if (!context.store.isCacheValid()) {
        console.log('[ModelsStore] Cached data expired, will refresh on next access')
        context.store.lastFetched = null
      }
    }
  }
})