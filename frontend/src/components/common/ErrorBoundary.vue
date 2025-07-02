<template>
  <div class="error-boundary" :class="[`error-boundary--${displayMode}`, { 'error-boundary--animated': animated }]">
    <!-- Inline Error Display -->
    <div v-if="displayMode === 'inline'" class="error-boundary__inline">
      <div class="error-boundary__content">
        <div class="error-boundary__icon">
          <svg v-if="errorType === 'network'" viewBox="0 0 24 24" fill="currentColor" class="error-icon">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM13 17h-2v-6h2v6zm0-8h-2V7h2v2z"/>
          </svg>
          <svg v-else-if="errorType === 'api'" viewBox="0 0 24 24" fill="currentColor" class="error-icon">
            <path d="M11 15h2v2h-2zm0-8h2v6h-2zm.99-5C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z"/>
          </svg>
          <svg v-else-if="errorType === 'validation'" viewBox="0 0 24 24" fill="currentColor" class="error-icon">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
          </svg>
          <svg v-else viewBox="0 0 24 24" fill="currentColor" class="error-icon">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
        </div>
        <div class="error-boundary__message">
          <h4 class="error-boundary__title">{{ errorTitle }}</h4>
          <p class="error-boundary__description">{{ errorMessage }}</p>
          <p v-if="suggestion" class="error-boundary__suggestion">{{ suggestion }}</p>
        </div>
        <div class="error-boundary__actions">
          <button 
            v-if="showRetry"
            @click="handleRetry"
            :disabled="isRetrying"
            class="error-boundary__button error-boundary__button--primary"
            :aria-label="`Retry ${errorTitle.toLowerCase()}`"
          >
            <svg v-if="isRetrying" class="error-boundary__spinner" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="31.416" stroke-dashoffset="31.416">
                <animate attributeName="stroke-dasharray" dur="2s" values="0 31.416;15.708 15.708;0 31.416" repeatCount="indefinite"/>
                <animate attributeName="stroke-dashoffset" dur="2s" values="0;-15.708;-31.416" repeatCount="indefinite"/>
              </circle>
            </svg>
            <span v-else>{{ retryText }}</span>
          </button>
          <button 
            v-if="showHelp"
            @click="showHelpModal = true"
            class="error-boundary__button error-boundary__button--secondary"
            aria-label="Get help with this error"
          >
            Get Help
          </button>
        </div>
      </div>
    </div>

    <!-- Modal Error Display -->
    <teleport to="body" v-if="displayMode === 'modal' && showModal">
      <div class="error-boundary__modal-overlay" @click="closeModal" role="dialog" aria-modal="true" aria-labelledby="error-modal-title">
        <div class="error-boundary__modal" @click.stop>
          <div class="error-boundary__modal-header">
            <h3 id="error-modal-title" class="error-boundary__modal-title">{{ errorTitle }}</h3>
            <button @click="closeModal" class="error-boundary__close-button" aria-label="Close error dialog">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
              </svg>
            </button>
          </div>
          <div class="error-boundary__modal-body">
            <div class="error-boundary__modal-icon">
              <svg viewBox="0 0 24 24" fill="currentColor" class="error-icon error-icon--large">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM13 17h-2v-6h2v6zm0-8h-2V7h2v2z"/>
              </svg>
            </div>
            <p class="error-boundary__modal-message">{{ errorMessage }}</p>
            <p v-if="suggestion" class="error-boundary__modal-suggestion">{{ suggestion }}</p>
            <details v-if="errorDetails && isDevelopment" class="error-boundary__details">
              <summary>Technical Details</summary>
              <pre class="error-boundary__error-details">{{ errorDetails }}</pre>
            </details>
          </div>
          <div class="error-boundary__modal-footer">
            <button 
              v-if="showRetry"
              @click="handleRetry"
              :disabled="isRetrying"
              class="error-boundary__button error-boundary__button--primary"
            >
              <svg v-if="isRetrying" class="error-boundary__spinner" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="31.416" stroke-dashoffset="31.416">
                  <animate attributeName="stroke-dasharray" dur="2s" values="0 31.416;15.708 15.708;0 31.416" repeatCount="indefinite"/>
                  <animate attributeName="stroke-dashoffset" dur="2s" values="0;-15.708;-31.416" repeatCount="indefinite"/>
                </circle>
              </svg>
              <span v-else>{{ retryText }}</span>
            </button>
            <button @click="closeModal" class="error-boundary__button error-boundary__button--secondary">
              Close
            </button>
          </div>
        </div>
      </div>
    </teleport>

    <!-- Full Page Error Display -->
    <div v-if="displayMode === 'fullpage'" class="error-boundary__fullpage">
      <div class="error-boundary__fullpage-content">
        <div class="error-boundary__fullpage-icon">
          <svg viewBox="0 0 24 24" fill="currentColor" class="error-icon error-icon--xlarge">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM13 17h-2v-6h2v6zm0-8h-2V7h2v2z"/>
          </svg>
        </div>
        <h1 class="error-boundary__fullpage-title">{{ errorTitle }}</h1>
        <p class="error-boundary__fullpage-message">{{ errorMessage }}</p>
        <p v-if="suggestion" class="error-boundary__fullpage-suggestion">{{ suggestion }}</p>
        
        <div class="error-boundary__fullpage-actions">
          <button 
            v-if="showRetry"
            @click="handleRetry"
            :disabled="isRetrying"
            class="error-boundary__button error-boundary__button--primary error-boundary__button--large"
          >
            <svg v-if="isRetrying" class="error-boundary__spinner" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="31.416" stroke-dashoffset="31.416">
                <animate attributeName="stroke-dasharray" dur="2s" values="0 31.416;15.708 15.708;0 31.416" repeatCount="indefinite"/>
                <animate attributeName="stroke-dashoffset" dur="2s" values="0;-15.708;-31.416" repeatCount="indefinite"/>
              </circle>
            </svg>
            <span v-else>{{ retryText }}</span>
          </button>
          <button 
            @click="goHome"
            class="error-boundary__button error-boundary__button--secondary error-boundary__button--large"
          >
            Go to Home
          </button>
          <button 
            @click="showHelpModal = true"
            class="error-boundary__button error-boundary__button--outline error-boundary__button--large"
          >
            Contact Support
          </button>
        </div>

        <details v-if="errorDetails && isDevelopment" class="error-boundary__fullpage-details">
          <summary>Technical Details</summary>
          <pre class="error-boundary__error-details">{{ errorDetails }}</pre>
        </details>
      </div>
    </div>

    <!-- Help Modal -->
    <teleport to="body" v-if="showHelpModal">
      <div class="error-boundary__modal-overlay" @click="showHelpModal = false" role="dialog" aria-modal="true" aria-labelledby="help-modal-title">
        <div class="error-boundary__modal error-boundary__help-modal" @click.stop>
          <div class="error-boundary__modal-header">
            <h3 id="help-modal-title" class="error-boundary__modal-title">Get Help</h3>
            <button @click="showHelpModal = false" class="error-boundary__close-button" aria-label="Close help dialog">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
              </svg>
            </button>
          </div>
          <div class="error-boundary__modal-body">
            <p class="error-boundary__help-intro">
              We're here to help! If this error persists, please try the following:
            </p>
            <ul class="error-boundary__help-list">
              <li>Refresh the page and try again</li>
              <li>Check your internet connection</li>
              <li>Clear your browser cache and cookies</li>
              <li>Try using a different browser</li>
            </ul>
            <div class="error-boundary__contact-info">
              <h4>Still need help?</h4>
              <p>Contact our support team:</p>
              <div class="error-boundary__contact-methods">
                <a href="mailto:support@traycer.ai" class="error-boundary__contact-link">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.89 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                  </svg>
                  support@traycer.ai
                </a>
                <a href="https://traycer.ai/discord" target="_blank" rel="noopener noreferrer" class="error-boundary__contact-link">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                  </svg>
                  Discord Community
                </a>
              </div>
            </div>
            <div v-if="errorId" class="error-boundary__error-id">
              <p><strong>Error ID:</strong> {{ errorId }}</p>
              <p class="error-boundary__error-id-note">
                Please include this ID when contacting support.
              </p>
            </div>
          </div>
        </div>
      </div>
    </teleport>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import emitter from '@/utils/emitter'

export default {
  name: 'ErrorBoundary',
  props: {
    error: {
      type: [Error, Object, String],
      default: null
    },
    errorType: {
      type: String,
      default: 'unknown',
      validator: (value) => ['network', 'api', 'validation', 'unknown'].includes(value)
    },
    displayMode: {
      type: String,
      default: 'inline',
      validator: (value) => ['inline', 'modal', 'fullpage'].includes(value)
    },
    showRetry: {
      type: Boolean,
      default: true
    },
    showHelp: {
      type: Boolean,
      default: true
    },
    retryText: {
      type: String,
      default: 'Try Again'
    },
    customMessage: {
      type: String,
      default: null
    },
    customSuggestion: {
      type: String,
      default: null
    },
    onRetry: {
      type: Function,
      default: null
    },
    animated: {
      type: Boolean,
      default: true
    },
    autoReport: {
      type: Boolean,
      default: true
    }
  },
  emits: ['retry', 'close', 'error-reported'],
  setup(props, { emit }) {
    const router = useRouter()
    const isRetrying = ref(false)
    const showModal = ref(props.displayMode === 'modal')
    const showHelpModal = ref(false)
    const errorId = ref(null)
    const retryCount = ref(0)
    const maxRetries = 3

    const isDevelopment = computed(() => {
      return import.meta.env.MODE === 'development'
    })

    const errorTitle = computed(() => {
      switch (props.errorType) {
        case 'network':
          return 'Connection Problem'
        case 'api':
          return 'Service Unavailable'
        case 'validation':
          return 'Invalid Data'
        default:
          return 'Something Went Wrong'
      }
    })

    const errorMessage = computed(() => {
      if (props.customMessage) {
        return props.customMessage
      }

      switch (props.errorType) {
        case 'network':
          return 'Unable to connect to our servers. Please check your internet connection and try again.'
        case 'api':
          return 'Our service is temporarily unavailable. We\'re working to fix this issue.'
        case 'validation':
          return 'The information provided is not valid. Please check your input and try again.'
        default:
          return 'An unexpected error occurred. Please try again or contact support if the problem persists.'
      }
    })

    const suggestion = computed(() => {
      if (props.customSuggestion) {
        return props.customSuggestion
      }

      switch (props.errorType) {
        case 'network':
          return 'Check your internet connection and refresh the page.'
        case 'api':
          return 'Please wait a moment and try again. If the problem continues, contact support.'
        case 'validation':
          return 'Review your input for any errors and ensure all required fields are filled correctly.'
        default:
          return 'Refresh the page or try again later. Contact support if the issue persists.'
      }
    })

    const errorDetails = computed(() => {
      if (!props.error) return null
      
      if (typeof props.error === 'string') {
        return props.error
      }
      
      if (props.error instanceof Error) {
        return `${props.error.name}: ${props.error.message}\n${props.error.stack || ''}`
      }
      
      return JSON.stringify(props.error, null, 2)
    })

    const generateErrorId = () => {
      return `ERR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    }

    const reportError = async () => {
      if (!props.autoReport || !props.error) return

      try {
        const errorReport = {
          id: errorId.value,
          type: props.errorType,
          message: errorMessage.value,
          details: errorDetails.value,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          url: window.location.href,
          userId: null, // Could be populated from auth store
          sessionId: sessionStorage.getItem('sessionId') || 'anonymous'
        }

        // In production, this would send to an error reporting service
        if (isDevelopment.value) {
          console.error('Error Report:', errorReport)
        } else {
          // Example: await errorReportingService.report(errorReport)
          console.warn('Error reporting not configured for production')
        }

        emit('error-reported', errorReport)
      } catch (reportingError) {
        console.error('Failed to report error:', reportingError)
      }
    }

    const handleRetry = async () => {
      if (isRetrying.value || retryCount.value >= maxRetries) return

      isRetrying.value = true
      retryCount.value++

      try {
        if (props.onRetry) {
          await props.onRetry()
        }
        emit('retry', retryCount.value)
        
        // If retry is successful, close modal
        if (props.displayMode === 'modal') {
          showModal.value = false
        }
      } catch (retryError) {
        console.error('Retry failed:', retryError)
        // Could emit a retry-failed event here
      } finally {
        isRetrying.value = false
      }
    }

    const closeModal = () => {
      showModal.value = false
      emit('close')
    }

    const goHome = () => {
      router.push('/')
    }

    // Global error handler
    const handleGlobalError = (event) => {
      if (props.displayMode === 'fullpage') {
        event.preventDefault()
        console.error('Global error caught by ErrorBoundary:', event.error)
      }
    }

    const handleUnhandledRejection = (event) => {
      if (props.displayMode === 'fullpage') {
        event.preventDefault()
        console.error('Unhandled promise rejection caught by ErrorBoundary:', event.reason)
      }
    }

    onMounted(() => {
      errorId.value = generateErrorId()
      
      if (props.error) {
        reportError()
      }

      // Add global error listeners for fullpage mode
      if (props.displayMode === 'fullpage') {
        window.addEventListener('error', handleGlobalError)
        window.addEventListener('unhandledrejection', handleUnhandledRejection)
      }

      // Emit error boundary mounted event
      emitter.emit('error-boundary-mounted', {
        errorId: errorId.value,
        errorType: props.errorType,
        displayMode: props.displayMode
      })
    })

    onUnmounted(() => {
      if (props.displayMode === 'fullpage') {
        window.removeEventListener('error', handleGlobalError)
        window.removeEventListener('unhandledrejection', handleUnhandledRejection)
      }

      emitter.emit('error-boundary-unmounted', {
        errorId: errorId.value
      })
    })

    return {
      isRetrying,
      showModal,
      showHelpModal,
      errorId,
      retryCount,
      maxRetries,
      isDevelopment,
      errorTitle,
      errorMessage,
      suggestion,
      errorDetails,
      handleRetry,
      closeModal,
      goHome,
      router
    }
  }
}
</script>

<style scoped>
.error-boundary {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.error-boundary--animated {
  animation: fadeIn 0.3s ease-in-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Inline Error Styles */
.error-boundary__inline {
  border: 1px solid #fecaca;
  border-radius: 8px;
  background-color: #fef2f2;
  padding: 16px;
  margin: 16px 0;
}

.error-boundary__content {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.error-boundary__icon {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  color: #dc2626;
}

.error-boundary__message {
  flex: 1;
  min-width: 0;
}

.error-boundary__title {
  margin: 0 0 8px 0;
  font-size: 16px;
  font-weight: 600;
  color: #991b1b;
}

.error-boundary__description {
  margin: 0 0 8px 0;
  font-size: 14px;
  color: #7f1d1d;
  line-height: 1.5;
}

.error-boundary__suggestion {
  margin: 0;
  font-size: 13px;
  color: #a21caf;
  font-style: italic;
}

.error-boundary__actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

/* Modal Styles */
.error-boundary__modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 16px;
}

.error-boundary__modal {
  background: white;
  border-radius: 12px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  max-width: 500px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  animation: modalSlideIn 0.3s ease-out;
}

@keyframes modalSlideIn {
  from { opacity: 0; transform: scale(0.95) translateY(-20px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}

.error-boundary__modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px 16px;
  border-bottom: 1px solid #e5e7eb;
}

.error-boundary__modal-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #111827;
}

.error-boundary__close-button {
  background: none;
  border: none;
  padding: 4px;
  cursor: pointer;
  color: #6b7280;
  border-radius: 4px;
  transition: all 0.2s;
}

.error-boundary__close-button:hover {
  background-color: #f3f4f6;
  color: #374151;
}

.error-boundary__close-button svg {
  width: 20px;
  height: 20px;
}

.error-boundary__modal-body {
  padding: 16px 24px;
}

.error-boundary__modal-icon {
  display: flex;
  justify-content: center;
  margin-bottom: 16px;
}

.error-boundary__modal-message {
  text-align: center;
  color: #374151;
  font-size: 16px;
  line-height: 1.6;
  margin: 0 0 12px 0;
}

.error-boundary__modal-suggestion {
  text-align: center;
  color: #6b7280;
  font-size: 14px;
  margin: 0 0 16px 0;
  font-style: italic;
}

.error-boundary__modal-footer {
  display: flex;
  gap: 12px;
  padding: 16px 24px 20px;
  justify-content: center;
}

/* Full Page Error Styles */
.error-boundary__fullpage {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.error-boundary__fullpage-content {
  background: white;
  border-radius: 16px;
  padding: 48px 32px;
  text-align: center;
  max-width: 600px;
  width: 100%;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
}

.error-boundary__fullpage-icon {
  margin-bottom: 24px;
}

.error-boundary__fullpage-title {
  font-size: 32px;
  font-weight: 700;
  color: #111827;
  margin: 0 0 16px 0;
}

.error-boundary__fullpage-message {
  font-size: 18px;
  color: #374151;
  line-height: 1.6;
  margin: 0 0 12px 0;
}

.error-boundary__fullpage-suggestion {
  font-size: 16px;
  color: #6b7280;
  margin: 0 0 32px 0;
  font-style: italic;
}

.error-boundary__fullpage-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: center;
}

.error-boundary__fullpage-details {
  margin-top: 32px;
  text-align: left;
}

/* Button Styles */
.error-boundary__button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid transparent;
  min-height: 36px;
}

.error-boundary__button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.error-boundary__button--primary {
  background-color: #3b82f6;
  color: white;
  border-color: #3b82f6;
}

.error-boundary__button--primary:hover:not(:disabled) {
  background-color: #2563eb;
  border-color: #2563eb;
}

.error-boundary__button--secondary {
  background-color: #6b7280;
  color: white;
  border-color: #6b7280;
}

.error-boundary__button--secondary:hover:not(:disabled) {
  background-color: #4b5563;
  border-color: #4b5563;
}

.error-boundary__button--outline {
  background-color: transparent;
  color: #374151;
  border-color: #d1d5db;
}

.error-boundary__button--outline:hover:not(:disabled) {
  background-color: #f9fafb;
  border-color: #9ca3af;
}

.error-boundary__button--large {
  padding: 12px 24px;
  font-size: 16px;
  min-height: 48px;
  min-width: 140px;
}

/* Icon Styles */
.error-icon {
  width: 24px;
  height: 24px;
}

.error-icon--large {
  width: 48px;
  height: 48px;
}

.error-icon--xlarge {
  width: 64px;
  height: 64px;
}

/* Spinner Styles */
.error-boundary__spinner {
  width: 16px;
  height: 16px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Details Styles */
.error-boundary__details,
.error-boundary__fullpage-details {
  margin-top: 16px;
}

.error-boundary__details summary,
.error-boundary__fullpage-details summary {
  cursor: pointer;
  font-weight: 500;
  color: #374151;
  padding: 8px 0;
}

.error-boundary__error-details {
  background-color: #f3f4f6;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  padding: 12px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 12px;
  color: #374151;
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-word;
  margin-top: 8px;
}

/* Help Modal Styles */
.error-boundary__help-modal {
  max-width: 600px;
}

.error-boundary__help-intro {
  font-size: 16px;
  color: #374151;
  margin: 0 0 16px 0;
  line-height: 1.6;
}

.error-boundary__help-list {
  list-style: none;
  padding: 0;
  margin: 0 0 24px 0;
}

.error-boundary__help-list li {
  padding: 8px 0;
  padding-left: 24px;
  position: relative;
  color: #374151;
}

.error-boundary__help-list li::before {
  content: '•';
  color: #3b82f6;
  font-weight: bold;
  position: absolute;
  left: 8px;
}

.error-boundary__contact-info {
  background-color: #f8fafc;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
}

.error-boundary__contact-info h4 {
  margin: 0 0 8px 0;
  font-size: 16px;
  color: #111827;
}

.error-boundary__contact-info p {
  margin: 0 0 12px 0;
  color: #6b7280;
}

.error-boundary__contact-methods {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.error-boundary__contact-link {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #3b82f6;
  text-decoration: none;
  padding: 8px 12px;
  border-radius: 6px;
  transition: background-color 0.2s;
}

.error-boundary__contact-link:hover {
  background-color: #eff6ff;
}

.error-boundary__contact-link svg {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.error-boundary__error-id {
  background-color: #f1f5f9;
  border-radius: 6px;
  padding: 12px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 12px;
}

.error-boundary__error-id-note {
  color: #64748b;
  font-size: 11px;
  margin-top: 4px;
}

/* Responsive Design */
@media (max-width: 640px) {
  .error-boundary__modal {
    margin: 16px;
    max-width: calc(100vw - 32px);
  }
  
  .error-boundary__fullpage-content {
    padding: 32px 20px;
  }
  
  .error-boundary__fullpage-title {
    font-size: 24px;
  }
  
  .error-boundary__fullpage-actions {
    flex-direction: column;
    width: 100%;
  }
  
  .error-boundary__button--large {
    width: 100%;
  }
  
  .error-boundary__contact-methods {
    gap: 4px;
  }
  
  .error-boundary__actions {
    flex-direction: column;
  }
  
  .error-boundary__button {
    width: 100%;
    justify-content: center;
  }
}

/* High contrast mode support */
@media (prefers-contrast: high) {
  .error-boundary__inline {
    border-width: 2px;
  }
  
  .error-boundary__button {
    border-width: 2px;
  }
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  .error-boundary--animated,
  .error-boundary__modal,
  .error-boundary__spinner {
    animation: none;
  }
  
  .error-boundary__button {
    transition: none;
  }
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .error-boundary__modal,
  .error-boundary__fullpage-content {
    background-color: #1f2937;
    color: #f9fafb;
  }
  
  .error-boundary__modal-title,
  .error-boundary__fullpage-title {
    color: #f9fafb;
  }
  
  .error-boundary__modal-message,
  .error-boundary__fullpage-message {
    color: #d1d5db;
  }
  
  .error-boundary__modal-suggestion,
  .error-boundary__fullpage-suggestion {
    color: #9ca3af;
  }
  
  .error-boundary__modal-header {
    border-bottom-color: #374151;
  }
  
  .error-boundary__close-button {
    color: #9ca3af;
  }
  
  .error-boundary__close-button:hover {
    background-color: #374151;
    color: #d1d5db;
  }
  
  .error-boundary__contact-info {
    background-color: #374151;
  }
  
  .error-boundary__error-details {
    background-color: #374151;
    border-color: #4b5563;
    color: #d1d5db;
  }
  
  .error-boundary__error-id {
    background-color: #374151;
  }
}
</style>