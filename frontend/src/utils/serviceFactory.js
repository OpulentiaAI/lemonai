// Service factory for dynamic service selection based on deployment mode
class ServiceFactory {
  constructor() {
    this.defaultModelService = null;
    this.platformService = null;
    this.mode = null;
    this.initialized = false;
    this.initPromise = null;
  }

  /**
   * Get the current deployment mode
   * @returns {string} 'cloud' or 'local'
   */
  getMode() {
    if (this.mode === null) {
      this.mode = import.meta.env.VITE_CLOUD_MODE === 'true' ? 'cloud' : 'local';
    }
    return this.mode;
  }

  /**
   * Initialize services based on deployment mode
   * @returns {Promise<void>}
   */
  async initialize() {
    if (this.initialized) {
      return;
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this._doInitialize();
    return this.initPromise;
  }

  async _doInitialize() {
    try {
      const mode = this.getMode();
      console.log(`[ServiceFactory] Initializing services for ${mode} mode`);

      if (mode === 'cloud') {
        // Import cloud services
        const [defaultModelModule, platformModule] = await Promise.all([
          import('@/services/default-model-setting-cloud.js'),
          import('@/services/platforms-cloud.js')
        ]);

        this.defaultModelService = defaultModelModule.default;
        this.platformService = platformModule.default;
      } else {
        // Import local services
        const [defaultModelModule, platformModule] = await Promise.all([
          import('@/services/default-model-setting.js'),
          import('@/services/platforms.js')
        ]);

        this.defaultModelService = defaultModelModule.default;
        this.platformService = platformModule.default;
      }

      this.initialized = true;
      console.log(`[ServiceFactory] Services initialized successfully for ${mode} mode`);
    } catch (error) {
      console.error('[ServiceFactory] Failed to initialize services:', error);
      this.initPromise = null;
      throw new Error(`Failed to initialize services for ${this.getMode()} mode: ${error.message}`);
    }
  }

  /**
   * Get the default model service
   * @returns {Promise<Object>} Default model service instance
   */
  async getDefaultModelService() {
    await this.initialize();
    
    if (!this.defaultModelService) {
      throw new Error('Default model service not available');
    }

    return this.defaultModelService;
  }

  /**
   * Get the platform service
   * @returns {Promise<Object>} Platform service instance
   */
  async getPlatformService() {
    await this.initialize();
    
    if (!this.platformService) {
      throw new Error('Platform service not available');
    }

    return this.platformService;
  }

  /**
   * Reset the factory (useful for testing or mode changes)
   */
  reset() {
    this.defaultModelService = null;
    this.platformService = null;
    this.mode = null;
    this.initialized = false;
    this.initPromise = null;
  }

  /**
   * Check if services are initialized
   * @returns {boolean}
   */
  isInitialized() {
    return this.initialized;
  }

  /**
   * Get service information for debugging
   * @returns {Object}
   */
  getServiceInfo() {
    return {
      mode: this.getMode(),
      initialized: this.initialized,
      hasDefaultModelService: !!this.defaultModelService,
      hasPlatformService: !!this.platformService
    };
  }
}

// Create singleton instance
const serviceFactory = new ServiceFactory();

// Export factory methods
export const getDefaultModelService = () => serviceFactory.getDefaultModelService();
export const getPlatformService = () => serviceFactory.getPlatformService();
export const getMode = () => serviceFactory.getMode();
export const isInitialized = () => serviceFactory.isInitialized();
export const getServiceInfo = () => serviceFactory.getServiceInfo();
export const reset = () => serviceFactory.reset();

// Export the factory instance for advanced usage
export default serviceFactory;