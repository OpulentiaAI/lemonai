import { CLOUD_MODELS, DEFAULT_MODEL_SETTINGS } from '@/config/models-cloud';

const service = {
  // Get available models
  async getModels() {
    // Return the array directly to match the expected format
    return CLOUD_MODELS.map(model => ({
      id: model.id,
      model_id: model.model_id,
      model_name: model.name,
      platform_name: model.platform,
      platform_id: model.platform_id,
      enabled: model.enabled,
      is_default: model.is_default || false,
      max_tokens: model.max_tokens,
      description: model.description,
      logo_url: model.logo
    }));
  },

  // Get model settings by type
  async getModelBySetting() {
    // Transform DEFAULT_MODEL_SETTINGS to match expected format
    return Object.entries(DEFAULT_MODEL_SETTINGS).map(([settingType, setting]) => ({
      setting_type: settingType,
      model_id: setting.model_id,
      model_name: setting.model_name,
      platform: setting.platform,
      platform_id: setting.platform_id
    }));
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
    // Return format matching backend expectations
    return {
      has_default_platform: true,
      has_enabled_platform: true,
      has_search_setting: true
    };
  }
};

export default service;