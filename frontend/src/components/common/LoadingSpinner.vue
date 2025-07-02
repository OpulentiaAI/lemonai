<template>
  <div
    v-if="visible"
    :class="containerClasses"
    :aria-label="accessibilityLabel"
    role="status"
    aria-live="polite"
  >
    <!-- Overlay Background -->
    <div
      v-if="overlay"
      class="loading-overlay"
      @click="handleOverlayClick"
    />
    
    <!-- Main Loading Container -->
    <div :class="loadingClasses">
      <!-- Spinner Types -->
      <div v-if="type === 'spinner'" :class="spinnerClasses">
        <div class="spinner-circle"></div>
      </div>
      
      <div v-else-if="type === 'dots'" class="dots-spinner">
        <div class="dot" v-for="i in 3" :key="i"></div>
      </div>
      
      <div v-else-if="type === 'pulse'" class="pulse-spinner">
        <div class="pulse-circle"></div>
      </div>
      
      <div v-else-if="type === 'bars'" class="bars-spinner">
        <div class="bar" v-for="i in 4" :key="i"></div>
      </div>
      
      <!-- Progress Indicator -->
      <div v-else-if="type === 'progress'" class="progress-container">
        <div class="progress-bar">
          <div 
            class="progress-fill" 
            :style="{ width: `${progress}%` }"
          ></div>
        </div>
        <div v-if="showProgressText" class="progress-text">
          {{ progress }}%
        </div>
      </div>
      
      <!-- Skeleton Loading -->
      <div v-else-if="type === 'skeleton'" class="skeleton-container">
        <div v-if="skeletonType === 'list'" class="skeleton-list">
          <div 
            v-for="i in skeletonLines" 
            :key="i" 
            class="skeleton-line"
            :style="{ width: getSkeletonWidth(i) }"
          ></div>
        </div>
        
        <div v-else-if="skeletonType === 'card'" class="skeleton-card">
          <div class="skeleton-avatar"></div>
          <div class="skeleton-content">
            <div class="skeleton-title"></div>
            <div class="skeleton-subtitle"></div>
            <div class="skeleton-text"></div>
          </div>
        </div>
        
        <div v-else-if="skeletonType === 'form'" class="skeleton-form">
          <div v-for="i in 3" :key="i" class="skeleton-field">
            <div class="skeleton-label"></div>
            <div class="skeleton-input"></div>
          </div>
        </div>
        
        <div v-else class="skeleton-text-block">
          <div 
            v-for="i in skeletonLines" 
            :key="i" 
            class="skeleton-line"
            :style="{ width: getSkeletonWidth(i) }"
          ></div>
        </div>
      </div>
      
      <!-- Loading Message -->
      <div v-if="message && type !== 'skeleton'" class="loading-message">
        {{ currentMessage }}
      </div>
      
      <!-- Step Indicator for Multi-step Operations -->
      <div v-if="steps && steps.length > 1" class="steps-container">
        <div class="steps-progress">
          <div 
            v-for="(step, index) in steps" 
            :key="index"
            :class="getStepClasses(index)"
          >
            <div class="step-number">{{ index + 1 }}</div>
            <div class="step-label">{{ step }}</div>
          </div>
        </div>
      </div>
      
      <!-- Cancel Button -->
      <button
        v-if="cancellable && !cancelled"
        @click="handleCancel"
        class="cancel-button"
        :disabled="cancelling"
        aria-label="Cancel operation"
      >
        {{ cancelling ? 'Cancelling...' : 'Cancel' }}
      </button>
      
      <!-- Timeout Warning -->
      <div v-if="showTimeoutWarning" class="timeout-warning">
        <p>This is taking longer than expected...</p>
        <button @click="handleRetry" class="retry-button">
          Retry
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'

export default {
  name: 'LoadingSpinner',
  props: {
    // Visibility
    visible: {
      type: Boolean,
      default: true
    },
    
    // Spinner type
    type: {
      type: String,
      default: 'spinner',
      validator: (value) => ['spinner', 'dots', 'pulse', 'bars', 'progress', 'skeleton'].includes(value)
    },
    
    // Size variants
    size: {
      type: String,
      default: 'medium',
      validator: (value) => ['small', 'medium', 'large', 'xlarge'].includes(value)
    },
    
    // Display mode
    mode: {
      type: String,
      default: 'inline',
      validator: (value) => ['inline', 'overlay', 'fullscreen'].includes(value)
    },
    
    // Overlay settings
    overlay: {
      type: Boolean,
      default: false
    },
    
    overlayClickable: {
      type: Boolean,
      default: false
    },
    
    // Loading message
    message: {
      type: [String, Array],
      default: ''
    },
    
    // Progress (0-100)
    progress: {
      type: Number,
      default: 0,
      validator: (value) => value >= 0 && value <= 100
    },
    
    showProgressText: {
      type: Boolean,
      default: true
    },
    
    // Skeleton settings
    skeletonType: {
      type: String,
      default: 'text',
      validator: (value) => ['text', 'list', 'card', 'form'].includes(value)
    },
    
    skeletonLines: {
      type: Number,
      default: 3
    },
    
    // Multi-step operations
    steps: {
      type: Array,
      default: () => []
    },
    
    currentStep: {
      type: Number,
      default: 0
    },
    
    // Cancellation
    cancellable: {
      type: Boolean,
      default: false
    },
    
    // Timeout handling
    timeout: {
      type: Number,
      default: 0 // 0 means no timeout
    },
    
    // Accessibility
    ariaLabel: {
      type: String,
      default: ''
    },
    
    // Color theme
    color: {
      type: String,
      default: 'primary',
      validator: (value) => ['primary', 'secondary', 'success', 'warning', 'error'].includes(value)
    }
  },
  
  emits: ['cancel', 'timeout', 'retry', 'overlay-click'],
  
  setup(props, { emit }) {
    // Reactive state
    const cancelled = ref(false)
    const cancelling = ref(false)
    const showTimeoutWarning = ref(false)
    const messageIndex = ref(0)
    
    // Timers
    let timeoutTimer = null
    let messageTimer = null
    
    // Computed properties
    const containerClasses = computed(() => [
      'loading-container',
      `loading-${props.mode}`,
      `loading-${props.size}`,
      `loading-${props.color}`,
      {
        'loading-overlay-active': props.overlay,
        'loading-cancellable': props.cancellable,
        'loading-with-steps': props.steps.length > 1
      }
    ])
    
    const loadingClasses = computed(() => [
      'loading-content',
      `loading-content-${props.type}`,
      {
        'loading-content-centered': props.mode !== 'inline'
      }
    ])
    
    const spinnerClasses = computed(() => [
      'spinner',
      `spinner-${props.size}`,
      `spinner-${props.color}`
    ])
    
    const accessibilityLabel = computed(() => {
      if (props.ariaLabel) return props.ariaLabel
      if (props.type === 'progress') return `Loading progress: ${props.progress}%`
      if (props.steps.length > 1) return `Step ${props.currentStep + 1} of ${props.steps.length}: ${props.steps[props.currentStep] || 'Loading'}`
      return currentMessage.value || 'Loading'
    })
    
    const currentMessage = computed(() => {
      if (Array.isArray(props.message)) {
        return props.message[messageIndex.value] || ''
      }
      return props.message
    })
    
    // Methods
    const getSkeletonWidth = (index) => {
      const widths = ['100%', '85%', '70%', '95%', '60%']
      return widths[index % widths.length]
    }
    
    const getStepClasses = (index) => [
      'step',
      {
        'step-completed': index < props.currentStep,
        'step-active': index === props.currentStep,
        'step-pending': index > props.currentStep
      }
    ]
    
    const handleCancel = async () => {
      if (cancelling.value) return
      
      cancelling.value = true
      try {
        emit('cancel')
        await new Promise(resolve => setTimeout(resolve, 500)) // Simulate cancel delay
        cancelled.value = true
      } finally {
        cancelling.value = false
      }
    }
    
    const handleRetry = () => {
      showTimeoutWarning.value = false
      emit('retry')
    }
    
    const handleOverlayClick = () => {
      if (props.overlayClickable) {
        emit('overlay-click')
      }
    }
    
    const startTimeout = () => {
      if (props.timeout > 0) {
        timeoutTimer = setTimeout(() => {
          showTimeoutWarning.value = true
          emit('timeout')
        }, props.timeout)
      }
    }
    
    const clearTimeout = () => {
      if (timeoutTimer) {
        clearTimeout(timeoutTimer)
        timeoutTimer = null
      }
    }
    
    const startMessageRotation = () => {
      if (Array.isArray(props.message) && props.message.length > 1) {
        messageTimer = setInterval(() => {
          messageIndex.value = (messageIndex.value + 1) % props.message.length
        }, 3000)
      }
    }
    
    const clearMessageRotation = () => {
      if (messageTimer) {
        clearInterval(messageTimer)
        messageTimer = null
      }
    }
    
    // Watchers
    watch(() => props.visible, (newVal) => {
      if (newVal) {
        startTimeout()
        startMessageRotation()
      } else {
        clearTimeout()
        clearMessageRotation()
        showTimeoutWarning.value = false
        cancelled.value = false
        cancelling.value = false
      }
    })
    
    watch(() => props.message, () => {
      messageIndex.value = 0
      clearMessageRotation()
      startMessageRotation()
    })
    
    // Lifecycle
    onMounted(() => {
      if (props.visible) {
        startTimeout()
        startMessageRotation()
      }
    })
    
    onUnmounted(() => {
      clearTimeout()
      clearMessageRotation()
    })
    
    return {
      cancelled,
      cancelling,
      showTimeoutWarning,
      containerClasses,
      loadingClasses,
      spinnerClasses,
      accessibilityLabel,
      currentMessage,
      getSkeletonWidth,
      getStepClasses,
      handleCancel,
      handleRetry,
      handleOverlayClick
    }
  }
}
</script>

<style scoped>
/* Base Container Styles */
.loading-container {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.loading-inline {
  display: inline-flex;
}

.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.loading-fullscreen {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1001;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.9);
}

.loading-overlay::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(2px);
}

/* Content Container */
.loading-content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.loading-content-centered {
  min-width: 200px;
  max-width: 400px;
}

/* Size Variants */
.loading-small .loading-content {
  padding: 0.5rem;
  gap: 0.5rem;
}

.loading-large .loading-content {
  padding: 1.5rem;
  gap: 1.5rem;
}

.loading-xlarge .loading-content {
  padding: 2rem;
  gap: 2rem;
}

/* Spinner Styles */
.spinner {
  position: relative;
  display: inline-block;
}

.spinner-circle {
  border: 3px solid #f3f3f3;
  border-top: 3px solid #3498db;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.spinner-small .spinner-circle {
  width: 20px;
  height: 20px;
  border-width: 2px;
}

.spinner-medium .spinner-circle {
  width: 32px;
  height: 32px;
}

.spinner-large .spinner-circle {
  width: 48px;
  height: 48px;
  border-width: 4px;
}

.spinner-xlarge .spinner-circle {
  width: 64px;
  height: 64px;
  border-width: 5px;
}

/* Color Variants */
.loading-primary .spinner-circle {
  border-top-color: #3498db;
}

.loading-secondary .spinner-circle {
  border-top-color: #6c757d;
}

.loading-success .spinner-circle {
  border-top-color: #28a745;
}

.loading-warning .spinner-circle {
  border-top-color: #ffc107;
}

.loading-error .spinner-circle {
  border-top-color: #dc3545;
}

/* Dots Spinner */
.dots-spinner {
  display: flex;
  gap: 4px;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #3498db;
  animation: dotPulse 1.4s ease-in-out infinite both;
}

.dot:nth-child(1) { animation-delay: -0.32s; }
.dot:nth-child(2) { animation-delay: -0.16s; }

/* Pulse Spinner */
.pulse-spinner {
  position: relative;
}

.pulse-circle {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #3498db;
  animation: pulse 1.5s ease-in-out infinite;
}

/* Bars Spinner */
.bars-spinner {
  display: flex;
  gap: 3px;
  align-items: end;
}

.bar {
  width: 4px;
  height: 20px;
  background: #3498db;
  animation: barStretch 1.2s ease-in-out infinite;
}

.bar:nth-child(1) { animation-delay: -1.1s; }
.bar:nth-child(2) { animation-delay: -1.0s; }
.bar:nth-child(3) { animation-delay: -0.9s; }
.bar:nth-child(4) { animation-delay: -0.8s; }

/* Progress Bar */
.progress-container {
  width: 100%;
  max-width: 300px;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background: #f0f0f0;
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #3498db, #2980b9);
  border-radius: 4px;
  transition: width 0.3s ease;
}

.progress-text {
  text-align: center;
  margin-top: 0.5rem;
  font-size: 0.875rem;
  color: #666;
}

/* Skeleton Loading */
.skeleton-container {
  width: 100%;
  max-width: 400px;
}

.skeleton-line,
.skeleton-title,
.skeleton-subtitle,
.skeleton-text,
.skeleton-label,
.skeleton-input,
.skeleton-avatar {
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 4px;
}

.skeleton-line {
  height: 16px;
  margin-bottom: 8px;
}

.skeleton-list .skeleton-line:last-child {
  margin-bottom: 0;
}

.skeleton-card {
  display: flex;
  gap: 1rem;
  padding: 1rem;
}

.skeleton-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  flex-shrink: 0;
}

.skeleton-content {
  flex: 1;
}

.skeleton-title {
  height: 20px;
  width: 70%;
  margin-bottom: 8px;
}

.skeleton-subtitle {
  height: 16px;
  width: 50%;
  margin-bottom: 8px;
}

.skeleton-text {
  height: 14px;
  width: 90%;
}

.skeleton-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.skeleton-field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.skeleton-label {
  height: 16px;
  width: 30%;
}

.skeleton-input {
  height: 40px;
  width: 100%;
}

/* Loading Message */
.loading-message {
  text-align: center;
  color: #666;
  font-size: 0.875rem;
  max-width: 300px;
}

/* Steps Container */
.steps-container {
  width: 100%;
  max-width: 400px;
}

.steps-progress {
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: relative;
}

.steps-progress::before {
  content: '';
  position: absolute;
  top: 15px;
  left: 15px;
  right: 15px;
  height: 2px;
  background: #e0e0e0;
  z-index: 0;
}

.step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  position: relative;
  z-index: 1;
}

.step-number {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: bold;
  background: #e0e0e0;
  color: #666;
  transition: all 0.3s ease;
}

.step-completed .step-number {
  background: #28a745;
  color: white;
}

.step-active .step-number {
  background: #3498db;
  color: white;
  animation: pulse 1.5s ease-in-out infinite;
}

.step-label {
  font-size: 0.75rem;
  color: #666;
  text-align: center;
  max-width: 80px;
  line-height: 1.2;
}

.step-active .step-label {
  color: #3498db;
  font-weight: 500;
}

/* Buttons */
.cancel-button,
.retry-button {
  padding: 0.5rem 1rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: white;
  color: #666;
  cursor: pointer;
  font-size: 0.875rem;
  transition: all 0.2s ease;
}

.cancel-button:hover,
.retry-button:hover {
  background: #f8f9fa;
  border-color: #adb5bd;
}

.cancel-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.retry-button {
  background: #3498db;
  color: white;
  border-color: #3498db;
}

.retry-button:hover {
  background: #2980b9;
  border-color: #2980b9;
}

/* Timeout Warning */
.timeout-warning {
  text-align: center;
  padding: 1rem;
  background: #fff3cd;
  border: 1px solid #ffeaa7;
  border-radius: 4px;
  color: #856404;
}

.timeout-warning p {
  margin: 0 0 0.5rem 0;
  font-size: 0.875rem;
}

/* Animations */
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@keyframes dotPulse {
  0%, 80%, 100% {
    transform: scale(0);
    opacity: 0.5;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}

@keyframes pulse {
  0% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.1);
    opacity: 0.7;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

@keyframes barStretch {
  0%, 40%, 100% {
    transform: scaleY(0.4);
  }
  20% {
    transform: scaleY(1);
  }
}

@keyframes shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}

/* Responsive Design */
@media (max-width: 768px) {
  .loading-content {
    max-width: 90vw;
    padding: 1rem;
  }
  
  .skeleton-card {
    flex-direction: column;
    align-items: center;
    text-align: center;
  }
  
  .steps-progress {
    flex-direction: column;
    gap: 1rem;
  }
  
  .steps-progress::before {
    display: none;
  }
  
  .step-label {
    max-width: none;
  }
}

@media (max-width: 480px) {
  .loading-content {
    padding: 0.75rem;
    gap: 0.75rem;
  }
  
  .loading-message {
    font-size: 0.8rem;
  }
  
  .cancel-button,
  .retry-button {
    padding: 0.4rem 0.8rem;
    font-size: 0.8rem;
  }
}

/* High contrast mode support */
@media (prefers-contrast: high) {
  .spinner-circle {
    border-width: 4px;
  }
  
  .loading-content {
    border: 2px solid #000;
  }
  
  .skeleton-line,
  .skeleton-title,
  .skeleton-subtitle,
  .skeleton-text,
  .skeleton-label,
  .skeleton-input,
  .skeleton-avatar {
    background: #ccc;
  }
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  .spinner-circle,
  .dot,
  .pulse-circle,
  .bar,
  .step-number,
  .progress-fill {
    animation: none;
  }
  
  .skeleton-line,
  .skeleton-title,
  .skeleton-subtitle,
  .skeleton-text,
  .skeleton-label,
  .skeleton-input,
  .skeleton-avatar {
    animation: none;
    background: #f0f0f0;
  }
}
</style>