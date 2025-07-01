import { CLOUD_MODELS, CLOUD_PLATFORMS } from '@/config/models-cloud';

const service = {
  // Get user platform information
  async getPlatforms() {
    return {
      code: 200,
      data: CLOUD_PLATFORMS,
      success: true
    };
  },

  // Get model list
  async getModels(platformId) {
    const models = platformId 
      ? CLOUD_MODELS.filter(m => m.platform_id === platformId)
      : CLOUD_MODELS;
    
    return {
      code: 200,
      data: models,
      success: true
    };
  },

  // Stub methods for compatibility
  async insertPlatform(platformData) {
    console.warn('Platform insertion not supported in cloud mode');
    return { code: 200, message: 'Not supported in cloud mode' };
  },

  async updatePlatform(platformData) {
    console.warn('Platform update not supported in cloud mode');
    return { code: 200, message: 'Not supported in cloud mode' };
  },

  async deletePlatform(platform_id) {
    console.warn('Platform deletion not supported in cloud mode');
    return { code: 200, message: 'Not supported in cloud mode' };
  },

  async deleteModel(modelId) {
    console.warn('Model deletion not supported in cloud mode');
    return { code: 200, message: 'Not supported in cloud mode' };
  },

  async insertModel(modelData) {
    console.warn('Model insertion not supported in cloud mode');
    return { code: 200, message: 'Not supported in cloud mode' };
  },

  async updateModel(modelData) {
    console.warn('Model update not supported in cloud mode');
    return { code: 200, message: 'Not supported in cloud mode' };
  },

  async checkApiAvailability(params) {
    return { code: 200, available: true, message: 'Cloud mode - all APIs configured' };
  }
};

export default service;