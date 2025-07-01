import axios from "axios";
import { message } from 'ant-design-vue';

// Set post request headers
axios.defaults.headers.post["Content-Type"] = "application/x-www-form-urlencoded;charset=UTF-8";
axios.defaults.withCredentials = false;

// For Vercel deployment, always use relative URLs
const instance = axios.create({
  baseURL: '', // Empty to use relative paths
  timeout: 100000,
});

// Request interceptor
instance.interceptors.request.use(
  (config) => {
    if (config.url === '/api/file/upload') {
      config.headers['Content-Type'] = 'multipart/form-data'
    }

    const accessToken = localStorage.getItem('access_token');
    if (accessToken) {
      config.headers = {
        ...config.headers,
        "Authorization": `Bearer ${accessToken}`
      };
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
let isShowing401Error = false;

instance.interceptors.response.use(
  (response) => {
    isShowing401Error = false;
    return response.data;
  },
  (error) => {
    if (error.response?.status === 401) {
      if (!isShowing401Error) {
        isShowing401Error = true;
        message.error('Authentication required. Please log in.');
        setTimeout(() => {
          isShowing401Error = false;
        }, 3000);
      }
    } else if (error.response?.status >= 500) {
      message.error('Server error. Please try again later.');
    }
    
    return Promise.reject(error);
  }
);

const http = {
  get(url, params) {
    return instance.get(url, { params });
  },
  
  post(url, data) {
    return instance.post(url, data);
  },
  
  put(url, data) {
    return instance.put(url, data);
  },
  
  del(url) {
    return instance.delete(url);
  }
};

export default http;