import { CLOUD_MODELS, DEFAULT_MODEL_SETTINGS } from '@/config/models-cloud';

const service = {
  // Get available models
  async getModels() {
    return {
      code: 200,
      data: CLOUD_MODELS,
      success: true
    };
  },

  // Get model settings by type
  async getModelBySetting() {
    return {
      code: 200,
      data: DEFAULT_MODEL_SETTINGS,
      success: true
    };
  },

  // Update model (store in localStorage for cloud mode)
  async updateModel(data) {
    // In cloud mode, store settings in localStorage
    localStorage.setItem('default_model_settings', JSON.stringify(data));
    return {
      code: 200,
      data: data,
      message: 'Settings saved locally',
      success: true
    };
  },

  // Check model availability
  async checkModel() {
    return {
      code: 200,
      data: { available: true, message: 'All cloud models configured' },
      success: true
    };
  }
};

export default service;