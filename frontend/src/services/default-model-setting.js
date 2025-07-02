import http from '@/utils/http.js'

// Custom error classes for better error handling
class ServiceError extends Error {
    constructor(message, code, originalError = null) {
        super(message);
        this.name = 'ServiceError';
        this.code = code;
        this.originalError = originalError;
    }
}

class ValidationError extends ServiceError {
    constructor(message, field = null) {
        super(message, 'VALIDATION_ERROR');
        this.field = field;
    }
}

// Helper function to validate response structure
const validateResponse = (response, expectedFields = []) => {
    if (!response) {
        throw new ServiceError('Empty response received', 'EMPTY_RESPONSE');
    }
    
    // Check for required fields if specified
    for (const field of expectedFields) {
        if (!(field in response)) {
            throw new ValidationError(`Missing required field: ${field}`, field);
        }
    }
    
    return true;
};

// Helper function to transform and validate model data
const transformModelData = (data) => {
    if (!data) return [];
    
    // Ensure data is an array for models
    if (Array.isArray(data)) {
        return data.map(model => ({
            id: model.id || null,
            name: model.name || 'Unknown Model',
            platform: model.platform || 'Unknown Platform',
            enabled: Boolean(model.enabled),
            ...model
        }));
    }
    
    // If it's a single object, wrap in array
    if (typeof data === 'object') {
        return [data];
    }
    
    return [];
};

// Helper function to log service operations
const logOperation = (operation, uri, data = null, error = null) => {
    const logData = {
        operation,
        uri,
        timestamp: new Date().toISOString(),
        requestId: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
    
    if (data) logData.requestData = data;
    if (error) logData.error = error.message;
    
    if (error) {
        console.error('Service operation failed:', logData);
    } else {
        console.log('Service operation completed:', logData);
    }
};

const service = {
    // 获取可选模型信息
    async getModels() {
        const uri = `/api/model/enabled`;
        
        try {
            logOperation('getModels', uri);
            
            const response = await http.get(uri);
            
            // Validate response structure
            validateResponse(response);
            
            // Transform and validate model data
            const models = transformModelData(response);
            
            logOperation('getModels', uri, null, null);
            return models;
            
        } catch (error) {
            logOperation('getModels', uri, null, error);
            
            // Handle different error types
            if (error instanceof ServiceError || error instanceof ValidationError) {
                throw error;
            }
            
            // Handle HTTP errors
            if (error.response) {
                const status = error.response.status;
                if (status === 404) {
                    throw new ServiceError('Models endpoint not found', 'ENDPOINT_NOT_FOUND', error);
                } else if (status >= 500) {
                    throw new ServiceError('Server error while fetching models', 'SERVER_ERROR', error);
                } else {
                    throw new ServiceError(`Failed to fetch models: ${error.response.statusText}`, 'HTTP_ERROR', error);
                }
            }
            
            // Handle network errors
            if (error.code === 'ERR_NETWORK' || !navigator.onLine) {
                throw new ServiceError('Network error while fetching models. Please check your connection.', 'NETWORK_ERROR', error);
            }
            
            // Handle timeout errors
            if (error.code === 'ECONNABORTED') {
                throw new ServiceError('Request timeout while fetching models. Please try again.', 'TIMEOUT_ERROR', error);
            }
            
            // Generic error fallback
            throw new ServiceError('Failed to fetch models', 'UNKNOWN_ERROR', error);
        }
    },

    // 获取类型模型信息
    async getModelBySetting() {
        const uri = `/api/default_model_setting`;
        
        try {
            logOperation('getModelBySetting', uri);
            
            const response = await http.get(uri);
            
            // Validate response structure
            validateResponse(response);
            
            // Ensure response has expected structure for model settings
            const modelSetting = {
                id: response.id || null,
                chatModel: response.chatModel || null,
                embeddingModel: response.embeddingModel || null,
                imageModel: response.imageModel || null,
                ...response
            };
            
            logOperation('getModelBySetting', uri, null, null);
            return modelSetting;
            
        } catch (error) {
            logOperation('getModelBySetting', uri, null, error);
            
            // Handle different error types
            if (error instanceof ServiceError || error instanceof ValidationError) {
                throw error;
            }
            
            // Handle HTTP errors
            if (error.response) {
                const status = error.response.status;
                if (status === 404) {
                    throw new ServiceError('Model settings not found', 'SETTINGS_NOT_FOUND', error);
                } else if (status >= 500) {
                    throw new ServiceError('Server error while fetching model settings', 'SERVER_ERROR', error);
                } else {
                    throw new ServiceError(`Failed to fetch model settings: ${error.response.statusText}`, 'HTTP_ERROR', error);
                }
            }
            
            // Handle network errors
            if (error.code === 'ERR_NETWORK' || !navigator.onLine) {
                throw new ServiceError('Network error while fetching model settings. Please check your connection.', 'NETWORK_ERROR', error);
            }
            
            // Handle timeout errors
            if (error.code === 'ECONNABORTED') {
                throw new ServiceError('Request timeout while fetching model settings. Please try again.', 'TIMEOUT_ERROR', error);
            }
            
            // Generic error fallback
            throw new ServiceError('Failed to fetch model settings', 'UNKNOWN_ERROR', error);
        }
    },

    //更新模型
    async updateModel(data) {
        const uri = `/api/default_model_setting`;
        
        try {
            // Validate input data
            if (!data || typeof data !== 'object') {
                throw new ValidationError('Invalid data provided for model update');
            }
            
            // Validate required fields for update
            const requiredFields = ['chatModel', 'embeddingModel', 'imageModel'];
            const missingFields = requiredFields.filter(field => !data[field]);
            if (missingFields.length > 0) {
                throw new ValidationError(`Missing required fields: ${missingFields.join(', ')}`);
            }
            
            logOperation('updateModel', uri, data);
            
            const response = await http.put(uri, data);
            
            // Validate response structure
            validateResponse(response);
            
            // Extract and validate the updated data
            const updatedData = response.data || response;
            
            logOperation('updateModel', uri, data, null);
            return updatedData;
            
        } catch (error) {
            logOperation('updateModel', uri, data, error);
            
            // Handle different error types
            if (error instanceof ServiceError || error instanceof ValidationError) {
                throw error;
            }
            
            // Handle HTTP errors
            if (error.response) {
                const status = error.response.status;
                if (status === 400) {
                    throw new ValidationError('Invalid model data provided', null);
                } else if (status === 404) {
                    throw new ServiceError('Model settings not found for update', 'SETTINGS_NOT_FOUND', error);
                } else if (status === 422) {
                    throw new ValidationError('Model validation failed', null);
                } else if (status >= 500) {
                    throw new ServiceError('Server error while updating model settings', 'SERVER_ERROR', error);
                } else {
                    throw new ServiceError(`Failed to update model settings: ${error.response.statusText}`, 'HTTP_ERROR', error);
                }
            }
            
            // Handle network errors
            if (error.code === 'ERR_NETWORK' || !navigator.onLine) {
                throw new ServiceError('Network error while updating model settings. Please check your connection.', 'NETWORK_ERROR', error);
            }
            
            // Handle timeout errors
            if (error.code === 'ECONNABORTED') {
                throw new ServiceError('Request timeout while updating model settings. Please try again.', 'TIMEOUT_ERROR', error);
            }
            
            // Generic error fallback
            throw new ServiceError('Failed to update model settings', 'UNKNOWN_ERROR', error);
        }
    },

    //api/default_model_setting/check
    async checkModel() {
        const uri = `/api/default_model_setting/check`;
        
        try {
            logOperation('checkModel', uri);
            
            const response = await http.get(uri);
            
            // Validate response structure
            validateResponse(response);
            
            // Ensure response has expected structure for model check
            const checkResult = {
                isValid: Boolean(response.isValid || response.valid),
                errors: Array.isArray(response.errors) ? response.errors : [],
                warnings: Array.isArray(response.warnings) ? response.warnings : [],
                ...response
            };
            
            logOperation('checkModel', uri, null, null);
            return checkResult;
            
        } catch (error) {
            logOperation('checkModel', uri, null, error);
            
            // Handle different error types
            if (error instanceof ServiceError || error instanceof ValidationError) {
                throw error;
            }
            
            // Handle HTTP errors
            if (error.response) {
                const status = error.response.status;
                if (status === 404) {
                    throw new ServiceError('Model check endpoint not found', 'ENDPOINT_NOT_FOUND', error);
                } else if (status >= 500) {
                    throw new ServiceError('Server error while checking model settings', 'SERVER_ERROR', error);
                } else {
                    throw new ServiceError(`Failed to check model settings: ${error.response.statusText}`, 'HTTP_ERROR', error);
                }
            }
            
            // Handle network errors
            if (error.code === 'ERR_NETWORK' || !navigator.onLine) {
                throw new ServiceError('Network error while checking model settings. Please check your connection.', 'NETWORK_ERROR', error);
            }
            
            // Handle timeout errors
            if (error.code === 'ECONNABORTED') {
                throw new ServiceError('Request timeout while checking model settings. Please try again.', 'TIMEOUT_ERROR', error);
            }
            
            // Generic error fallback
            throw new ServiceError('Failed to check model settings', 'UNKNOWN_ERROR', error);
        }
    },
}

// Export error classes for use in components
export { ServiceError, ValidationError };
export default service;
