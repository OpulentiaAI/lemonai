import axios from "axios";
import { message } from 'ant-design-vue';

// 设置 post 请求头
axios.defaults.headers.post["Content-Type"] =
  "application/x-www-form-urlencoded;charset=UTF-8";
// 在跨域请求时，不会携带用户凭证；返回的 response 里也会忽略 cookie
axios.defaults.withCredentials = false;

console.log("环境变量", import.meta.env);
// 创建 axios 实例, 请求超时时间为 10 秒 baseURL: import.meta.env.BASE_URL,

const isDev = import.meta.env.MODE === 'development';

// Circuit breaker for tracking endpoint failures
const circuitBreaker = new Map();
const CIRCUIT_BREAKER_THRESHOLD = 5;
const CIRCUIT_BREAKER_TIMEOUT = 60000; // 1 minute

// Rate limiting for notifications
let lastNotificationTime = 0;
const NOTIFICATION_COOLDOWN = 3000; // 3 seconds

// Request correlation ID generator
let requestIdCounter = 0;
const generateRequestId = () => `req_${Date.now()}_${++requestIdCounter}`;

const instance = axios.create({
  baseURL: isDev ? undefined : import.meta.env.VITE_SERVICE_URL,  // 开发环境不设置 baseURL
  timeout: 100000,
});

// 请求发起前拦截
instance.interceptors.request.use(
  (config) => {
    // Add request correlation ID
    const requestId = generateRequestId();
    config.headers['X-Request-ID'] = requestId;
    config.metadata = { requestId, startTime: Date.now() };

    // Check circuit breaker
    const endpoint = `${config.method?.toUpperCase()} ${config.url}`;
    const circuitState = circuitBreaker.get(endpoint);
    if (circuitState && circuitState.isOpen && Date.now() - circuitState.lastFailure < CIRCUIT_BREAKER_TIMEOUT) {
      const error = new Error(`Circuit breaker open for ${endpoint}`);
      error.isCircuitBreakerError = true;
      return Promise.reject(error);
    }

    if (config.url === '/api/file/upload') {
      //上传图片到图库请求头处理
      config.headers['Content-Type'] = 'multipart/form-data'
    }

    const accessToken = localStorage.getItem('access_token');
    if (accessToken) {
      config.headers = {
        ...config.headers, // 保留原有的 headers 配置
        "Authorization": `Bearer ${accessToken}`
      };
    }
    
    return config;
  },
  (error) => {
    // Log request error with context
    console.error('Request interceptor error:', {
      error: error.message,
      timestamp: new Date().toISOString()
    });
    return Promise.reject(error);
  }
);




// 响应拦截（请求返回后拦截）
let isShowing401Error = false; // 标志位，用于控制 401 提示是否已显示

// Helper function to show rate-limited notifications
const showNotification = (type, message) => {
  const now = Date.now();
  if (now - lastNotificationTime > NOTIFICATION_COOLDOWN) {
    lastNotificationTime = now;
    if (type === 'error') {
      message.error(message);
    } else if (type === 'warning') {
      message.warning(message);
    }
  }
};

// Helper function to log errors with context
const logError = (error, config) => {
  const requestId = config?.headers?.['X-Request-ID'] || 'unknown';
  const duration = config?.metadata?.startTime ? Date.now() - config.metadata.startTime : 0;
  
  console.error('HTTP Error:', {
    requestId,
    url: config?.url,
    method: config?.method?.toUpperCase(),
    status: error.response?.status,
    statusText: error.response?.statusText,
    duration: `${duration}ms`,
    message: error.message,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    isNetworkError: !error.response,
    isTimeout: error.code === 'ECONNABORTED'
  });
};

// Helper function to update circuit breaker
const updateCircuitBreaker = (config, isSuccess = false) => {
  const endpoint = `${config?.method?.toUpperCase()} ${config?.url}`;
  const circuitState = circuitBreaker.get(endpoint) || { failures: 0, isOpen: false };
  
  if (isSuccess) {
    circuitState.failures = 0;
    circuitState.isOpen = false;
  } else {
    circuitState.failures++;
    if (circuitState.failures >= CIRCUIT_BREAKER_THRESHOLD) {
      circuitState.isOpen = true;
      circuitState.lastFailure = Date.now();
    }
  }
  
  circuitBreaker.set(endpoint, circuitState);
};

instance.interceptors.response.use(
  (res) => {
    // Reset circuit breaker on success
    updateCircuitBreaker(res.config, true);
    
    // 判断URL 为 /api/file/read 不拦截
    if (res.config.url == '/api/file/read') {
      return res;
    } else if(res.config.url == '/api/model'){
      return res.data;
    }
    if (res.data.data) {
      return res.data.data;
    }
    return res;
  },
  (error) => {
    // Update circuit breaker on failure
    updateCircuitBreaker(error.config, false);
    
    // Log error with context
    logError(error, error.config);
    
    // Handle circuit breaker errors
    if (error.isCircuitBreakerError) {
      showNotification('error', 'Service temporarily unavailable. Please try again later.');
      return Promise.reject(error);
    }
    
    // Handle different error types
    if (error.response) {
      const status = error.response.status;
      
      switch (status) {
        case 401:
          if (!isShowing401Error) {
            isShowing401Error = true;
            showNotification('error', 'Authentication required. Please log in.');
            setTimeout(() => {
              isShowing401Error = false;
            }, 3000);
          }
          break;
          
        case 403:
          showNotification('error', 'Access forbidden. You don\'t have permission to perform this action.');
          break;
          
        case 404:
          showNotification('warning', 'Resource not found. Please check your request.');
          break;
          
        case 429:
          showNotification('warning', 'Too many requests. Please slow down and try again.');
          break;
          
        case 500:
        case 502:
        case 503:
        case 504:
          showNotification('error', 'Server error. Please try again later.');
          break;
          
        default:
          if (status >= 400) {
            const errorMessage = error.response.data?.message || error.response.data?.error || 'An error occurred';
            showNotification('error', errorMessage);
          }
      }
    } else if (error.code === 'ECONNABORTED') {
      // Timeout error
      showNotification('error', 'Request timeout. Please check your connection and try again.');
    } else if (error.code === 'ERR_NETWORK' || !navigator.onLine) {
      // Network error
      showNotification('error', 'Network error. Please check your internet connection.');
    } else {
      // Unknown error
      showNotification('error', 'An unexpected error occurred. Please try again.');
    }
    
    return Promise.reject(error);
  }
);

// Retry logic with exponential backoff
const retryRequest = async (config, retryCount = 0) => {
  const maxRetries = 3;
  const baseDelay = 1000; // 1 second
  
  try {
    return await instance.request(config);
  } catch (error) {
    // Only retry GET requests and specific error types
    const shouldRetry = config.method?.toLowerCase() === 'get' && 
                       retryCount < maxRetries && 
                       (error.code === 'ECONNABORTED' || 
                        error.code === 'ERR_NETWORK' || 
                        (error.response?.status >= 500 && error.response?.status < 600));
    
    if (shouldRetry) {
      const delay = baseDelay * Math.pow(2, retryCount); // Exponential backoff
      console.log(`Retrying request (${retryCount + 1}/${maxRetries}) after ${delay}ms:`, config.url);
      
      await new Promise(resolve => setTimeout(resolve, delay));
      return retryRequest(config, retryCount + 1);
    }
    
    throw error;
  }
};

const http = {
  async get(url, params) {
    const config = { 
      method: 'GET',
      url, 
      params: params 
    };
    return retryRequest(config);
  },
  post(url, params, header = {},responseType='json') {
    const options = {
      url,
      method: "POST",
      data: params,
      headers: Object.assign({ 'Content-Type': 'application/json' }, header),
      responseType:responseType,
    }
    return instance.request(options);
  },
  patch(url, params, header = {}) {
    const options = {
      url,
      method: "PATCH",
      data: params,
      headers: Object.assign({ 'Content-Type': 'application/json' }, header),
    };
    return instance.request(options);
  },
  put(url, params, header = {}) {
    const options = {
      url,
      method: "PUT",
      data: params,
      headers: Object.assign({ 'Content-Type': 'application/json' }, header),
    }
    return instance.request(options);
  },
  del(url, params, header = {}) {
    const options = {
      url,
      method: "DELETE",
      params: params,
      headers: Object.assign({ 'Content-Type': 'application/json' }, header),
    }
    return instance.request(options);
  },
};

export default http;
