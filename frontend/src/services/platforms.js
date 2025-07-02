import http from '@/utils/http.js'
import { getDefaults } from 'marked';

// Custom error classes for better error handling
class PlatformServiceError extends Error {
  constructor(message, code, operation, originalError = null) {
    super(message);
    this.name = 'PlatformServiceError';
    this.code = code;
    this.operation = operation;
    this.originalError = originalError;
    this.timestamp = new Date().toISOString();
  }
}

class ValidationError extends PlatformServiceError {
  constructor(message, field, operation) {
    super(message, 'VALIDATION_ERROR', operation);
    this.name = 'ValidationError';
    this.field = field;
  }
}

// Validation helpers
const validatePlatformData = (platformData, operation) => {
  if (!platformData || typeof platformData !== 'object') {
    throw new ValidationError('Platform data must be a valid object', 'platformData', operation);
  }
  
  if (operation === 'create' || operation === 'update') {
    if (!platformData.name || typeof platformData.name !== 'string' || platformData.name.trim().length === 0) {
      throw new ValidationError('Platform name is required and must be a non-empty string', 'name', operation);
    }
    
    if (platformData.name.length > 100) {
      throw new ValidationError('Platform name must be less than 100 characters', 'name', operation);
    }
  }
  
  if (operation === 'update' && (!platformData.id || typeof platformData.id !== 'number')) {
    throw new ValidationError('Platform ID is required for updates and must be a number', 'id', operation);
  }
};

const validateModelData = (modelData, operation) => {
  if (!modelData || typeof modelData !== 'object') {
    throw new ValidationError('Model data must be a valid object', 'modelData', operation);
  }
  
  if (operation === 'create' || operation === 'update') {
    if (!modelData.name || typeof modelData.name !== 'string' || modelData.name.trim().length === 0) {
      throw new ValidationError('Model name is required and must be a non-empty string', 'name', operation);
    }
    
    if (!modelData.platform_id || typeof modelData.platform_id !== 'number') {
      throw new ValidationError('Platform ID is required and must be a number', 'platform_id', operation);
    }
  }
  
  if (operation === 'update' && (!modelData.id || typeof modelData.id !== 'number')) {
    throw new ValidationError('Model ID is required for updates and must be a number', 'id', operation);
  }
};

const validateId = (id, type, operation) => {
  if (!id || (typeof id !== 'number' && typeof id !== 'string')) {
    throw new ValidationError(`${type} ID is required`, 'id', operation);
  }
  
  const numericId = typeof id === 'string' ? parseInt(id, 10) : id;
  if (isNaN(numericId) || numericId <= 0) {
    throw new ValidationError(`${type} ID must be a positive number`, 'id', operation);
  }
  
  return numericId;
};

// Response validation helpers
const validatePlatformResponse = (response, operation) => {
  if (operation === 'getPlatforms') {
    if (!Array.isArray(response)) {
      throw new PlatformServiceError('Invalid response format: expected array of platforms', 'INVALID_RESPONSE', operation);
    }
    return response.map(platform => {
      if (!platform || typeof platform !== 'object') {
        throw new PlatformServiceError('Invalid platform object in response', 'INVALID_RESPONSE', operation);
      }
      return {
        id: platform.id,
        name: platform.name || '',
        api_key: platform.api_key || '',
        base_url: platform.base_url || '',
        created_at: platform.created_at || null,
        updated_at: platform.updated_at || null,
        ...platform
      };
    });
  }
  
  if (operation === 'insertPlatform' || operation === 'updatePlatform') {
    if (!response || typeof response !== 'object') {
      throw new PlatformServiceError('Invalid response format: expected platform object', 'INVALID_RESPONSE', operation);
    }
    return {
      id: response.id,
      name: response.name || '',
      api_key: response.api_key || '',
      base_url: response.base_url || '',
      created_at: response.created_at || null,
      updated_at: response.updated_at || null,
      ...response
    };
  }
  
  return response;
};

const validateModelResponse = (response, operation) => {
  if (operation === 'getModels') {
    if (!Array.isArray(response)) {
      throw new PlatformServiceError('Invalid response format: expected array of models', 'INVALID_RESPONSE', operation);
    }
    return response.map(model => {
      if (!model || typeof model !== 'object') {
        throw new PlatformServiceError('Invalid model object in response', 'INVALID_RESPONSE', operation);
      }
      return {
        id: model.id,
        name: model.name || '',
        platform_id: model.platform_id,
        enabled: model.enabled || false,
        created_at: model.created_at || null,
        updated_at: model.updated_at || null,
        ...model
      };
    });
  }
  
  if (operation === 'insertModel' || operation === 'updateModel') {
    if (!response || typeof response !== 'object') {
      throw new PlatformServiceError('Invalid response format: expected model object', 'INVALID_RESPONSE', operation);
    }
    return {
      id: response.id,
      name: response.name || '',
      platform_id: response.platform_id,
      enabled: response.enabled || false,
      created_at: response.created_at || null,
      updated_at: response.updated_at || null,
      ...response
    };
  }
  
  return response;
};

// Logging helper
const logOperation = (operation, params, result, error = null) => {
  const logData = {
    operation,
    timestamp: new Date().toISOString(),
    params: params ? JSON.stringify(params) : null,
    success: !error,
    error: error ? {
      message: error.message,
      code: error.code,
      name: error.name
    } : null
  };
  
  if (error) {
    console.error(`Platform Service Error [${operation}]:`, logData);
  } else {
    console.log(`Platform Service Success [${operation}]:`, logData);
  }
};

const service = {
  // 获取用户平台信息
  async getPlatforms() {
    const operation = 'getPlatforms';
    const uri = `/api/platform`;
    
    try {
      console.log(`[${operation}] Fetching platforms from: ${uri}`);
      
      const response = await http.get(uri);
      
      if (response === null || response === undefined) {
        throw new PlatformServiceError('No response received from server', 'NO_RESPONSE', operation);
      }
      
      const validatedResponse = validatePlatformResponse(response, operation);
      logOperation(operation, null, validatedResponse);
      
      return validatedResponse;
      
    } catch (error) {
      const serviceError = error instanceof PlatformServiceError ? error : 
        new PlatformServiceError(
          `Failed to fetch platforms: ${error.message}`,
          'FETCH_ERROR',
          operation,
          error
        );
      
      logOperation(operation, null, null, serviceError);
      throw serviceError;
    }
  },

  // 新增平台信息
  async insertPlatform(platformData) {
    const operation = 'insertPlatform';
    const uri = `/api/platform`;
    
    try {
      // Validate input data
      validatePlatformData(platformData, 'create');
      
      console.log(`[${operation}] Creating platform:`, platformData.name);
      
      const response = await http.post(uri, platformData);
      
      if (response === null || response === undefined) {
        throw new PlatformServiceError('No response received from server', 'NO_RESPONSE', operation);
      }
      
      const validatedResponse = validatePlatformResponse(response, operation);
      logOperation(operation, platformData, validatedResponse);
      
      return validatedResponse;
      
    } catch (error) {
      const serviceError = error instanceof PlatformServiceError || error instanceof ValidationError ? error :
        new PlatformServiceError(
          `Failed to create platform: ${error.message}`,
          'CREATE_ERROR',
          operation,
          error
        );
      
      logOperation(operation, platformData, null, serviceError);
      throw serviceError;
    }
  },

  // 更新平台信息
  async updatePlatform(platformData) {
    const operation = 'updatePlatform';
    
    try {
      // Validate input data
      validatePlatformData(platformData, 'update');
      
      const platformId = validateId(platformData.id, 'Platform', operation);
      const uri = `/api/platform/${platformId}`;
      
      console.log(`[${operation}] Updating platform ID ${platformId}:`, platformData.name);
      
      const response = await http.put(uri, platformData);
      
      if (response === null || response === undefined) {
        throw new PlatformServiceError('No response received from server', 'NO_RESPONSE', operation);
      }
      
      // Handle both response.data and direct response formats
      const responseData = response.data || response;
      const validatedResponse = validatePlatformResponse(responseData, operation);
      logOperation(operation, platformData, validatedResponse);
      
      return validatedResponse;
      
    } catch (error) {
      const serviceError = error instanceof PlatformServiceError || error instanceof ValidationError ? error :
        new PlatformServiceError(
          `Failed to update platform: ${error.message}`,
          'UPDATE_ERROR',
          operation,
          error
        );
      
      logOperation(operation, platformData, null, serviceError);
      throw serviceError;
    }
  },

  // 删除平台信息
  async deletePlatform(platform_id) {
    const operation = 'deletePlatform';
    
    try {
      const platformId = validateId(platform_id, 'Platform', operation);
      const uri = `/api/platform/${platformId}`;
      
      console.log(`[${operation}] Deleting platform ID: ${platformId}`);
      
      const response = await http.del(uri);
      
      if (response === null || response === undefined) {
        throw new PlatformServiceError('No response received from server', 'NO_RESPONSE', operation);
      }
      
      // Handle both response.data and direct response formats
      const responseData = response.data || response;
      logOperation(operation, { platform_id: platformId }, responseData);
      
      return responseData;
      
    } catch (error) {
      const serviceError = error instanceof PlatformServiceError || error instanceof ValidationError ? error :
        new PlatformServiceError(
          `Failed to delete platform: ${error.message}`,
          'DELETE_ERROR',
          operation,
          error
        );
      
      logOperation(operation, { platform_id }, null, serviceError);
      throw serviceError;
    }
  },

  // 获取模型列表
  async getModels(platformId) {
    const operation = 'getModels';
    
    try {
      const validPlatformId = validateId(platformId, 'Platform', operation);
      const uri = `/api/model/list/${validPlatformId}`;
      
      console.log(`[${operation}] Fetching models for platform ID: ${validPlatformId}`);
      
      const response = await http.get(uri);
      
      if (response === null || response === undefined) {
        throw new PlatformServiceError('No response received from server', 'NO_RESPONSE', operation);
      }
      
      const validatedResponse = validateModelResponse(response, operation);
      logOperation(operation, { platformId: validPlatformId }, validatedResponse);
      
      return validatedResponse;
      
    } catch (error) {
      const serviceError = error instanceof PlatformServiceError || error instanceof ValidationError ? error :
        new PlatformServiceError(
          `Failed to fetch models: ${error.message}`,
          'FETCH_ERROR',
          operation,
          error
        );
      
      logOperation(operation, { platformId }, null, serviceError);
      throw serviceError;
    }
  },

  // 删除模型
  async deleteModel(modelId) {
    const operation = 'deleteModel';
    
    try {
      const validModelId = validateId(modelId, 'Model', operation);
      const uri = `/api/model/${validModelId}`;
      
      console.log(`[${operation}] Deleting model ID: ${validModelId}`);
      
      const response = await http.del(uri, { id: validModelId });
      
      if (response === null || response === undefined) {
        throw new PlatformServiceError('No response received from server', 'NO_RESPONSE', operation);
      }
      
      // Handle both response.data and direct response formats
      const responseData = response.data || response;
      logOperation(operation, { modelId: validModelId }, responseData);
      
      return responseData;
      
    } catch (error) {
      const serviceError = error instanceof PlatformServiceError || error instanceof ValidationError ? error :
        new PlatformServiceError(
          `Failed to delete model: ${error.message}`,
          'DELETE_ERROR',
          operation,
          error
        );
      
      logOperation(operation, { modelId }, null, serviceError);
      throw serviceError;
    }
  },

  // 新增模型
  async insertModel(modelData) {
    const operation = 'insertModel';
    const uri = `/api/model`;
    
    try {
      // Validate input data
      validateModelData(modelData, 'create');
      
      console.log(`[${operation}] Creating model:`, modelData.name);
      
      const response = await http.post(uri, modelData);
      
      if (response === null || response === undefined) {
        throw new PlatformServiceError('No response received from server', 'NO_RESPONSE', operation);
      }
      
      const validatedResponse = validateModelResponse(response, operation);
      logOperation(operation, modelData, validatedResponse);
      
      return validatedResponse;
      
    } catch (error) {
      const serviceError = error instanceof PlatformServiceError || error instanceof ValidationError ? error :
        new PlatformServiceError(
          `Failed to create model: ${error.message}`,
          'CREATE_ERROR',
          operation,
          error
        );
      
      logOperation(operation, modelData, null, serviceError);
      throw serviceError;
    }
  },

  // 更新模型
  async updateModel(modelData) {
    const operation = 'updateModel';
    
    try {
      // Validate input data
      validateModelData(modelData, 'update');
      
      const modelId = validateId(modelData.id, 'Model', operation);
      const uri = `/api/model/${modelId}`;
      
      console.log(`[${operation}] Updating model ID ${modelId}:`, modelData.name);
      
      const response = await http.put(uri, modelData);
      
      if (response === null || response === undefined) {
        throw new PlatformServiceError('No response received from server', 'NO_RESPONSE', operation);
      }
      
      // Handle both response.data and direct response formats
      const responseData = response.data || response;
      const validatedResponse = validateModelResponse(responseData, operation);
      logOperation(operation, modelData, validatedResponse);
      
      return validatedResponse;
      
    } catch (error) {
      const serviceError = error instanceof PlatformServiceError || error instanceof ValidationError ? error :
        new PlatformServiceError(
          `Failed to update model: ${error.message}`,
          'UPDATE_ERROR',
          operation,
          error
        );
      
      logOperation(operation, modelData, null, serviceError);
      throw serviceError;
    }
  },
  // 检查API可用性
  async checkApiAvailability(params) {
    const operation = 'checkApiAvailability';
    const uri = `/api/platform/check_api_availability`;
    
    try {
      // Validate input parameters
      if (!params || typeof params !== 'object') {
        throw new ValidationError('API availability check parameters must be a valid object', 'params', operation);
      }
      
      if (!params.platform_id || typeof params.platform_id !== 'number') {
        throw new ValidationError('Platform ID is required and must be a number', 'platform_id', operation);
      }
      
      console.log(`[${operation}] Checking API availability for platform ID: ${params.platform_id}`);
      
      const response = await http.post(uri, params);
      
      if (response === null || response === undefined) {
        throw new PlatformServiceError('No response received from server', 'NO_RESPONSE', operation);
      }
      
      // Validate response structure for API availability check
      if (typeof response !== 'object') {
        throw new PlatformServiceError('Invalid response format: expected object', 'INVALID_RESPONSE', operation);
      }
      
      const result = {
        available: response.available || false,
        message: response.message || '',
        status_code: response.status_code || null,
        response_time: response.response_time || null,
        error: response.error || null,
        ...response
      };
      
      logOperation(operation, params, result);
      return result;
      
    } catch (error) {
      const serviceError = error instanceof PlatformServiceError || error instanceof ValidationError ? error :
        new PlatformServiceError(
          `Failed to check API availability: ${error.message}`,
          'API_CHECK_ERROR',
          operation,
          error
        );
      
      logOperation(operation, params, null, serviceError);
      throw serviceError;
    }
  },

}

export default service
