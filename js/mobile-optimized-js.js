/**
 * CBS Mobile Optimization Utilities
 * Verbesserte Touch-Interaktionen und mobile UX
 */

class CBSMobileOptimizer {
    constructor() {
        this.deviceInfo = this.detectDevice();
        this.touchStartCoords = null;
        this.isScrolling = false;
        this.activeElement = null;
        
        this.init();
    }

    /**
     * Geräteerkennung für optimierte Erfahrung
     */
    detectDevice() {
        const userAgent = navigator.userAgent.toLowerCase();
        const platform = navigator.platform.toLowerCase();
        
        return {
            // Device Types
            isIOS: /ipad|iphone|ipod/.test(userAgent) || (platform === 'macintel' && navigator.maxTouchPoints > 1),
            isAndroid: /android/.test(userAgent),
            isTablet: /ipad|android(?!.*mobile)|tablet/.test(userAgent) || (platform === 'macintel' && navigator.maxTouchPoints > 1),
            isMobile: /mobile|android|iphone|ipod|blackberry|opera|mini|windows\sce|palm|smartphone|iemobile/.test(userAgent),
            
            // Browser Detection
            isChrome: /chrome/.test(userAgent) && !/edge|edg/.test(userAgent),
            isEdge: /edge|edg/.test(userAgent),
            isFirefox: /firefox/.test(userAgent),
            isSafari: /safari/.test(userAgent) && !/chrome/.test(userAgent),
            isSamsungInternet: /samsungbrowser/.test(userAgent),
            isBrave: navigator.brave && navigator.brave.isBrave,
            isOpera: /opr/.test(userAgent),
            
            // Capabilities
            hasTouch: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
            supportsVibration: 'vibrate' in navigator,
            supportsServiceWorker: 'serviceWorker' in navigator,
            supportsWebGL: (() => {
                try {
                    const canvas = document.createElement('canvas');
                    return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
                } catch (e) {
                    return false;
                }
            })(),
            
            // Screen Info
            pixelRatio: window.devicePixelRatio || 1,
            screenWidth: window.screen.width,
            screenHeight: window.screen.height,
            viewportWidth: window.innerWidth,
            viewportHeight: window.innerHeight
        };
    }

    /**
     * Initialisierung aller mobilen Optimierungen
     */
    init() {
        this.setupViewport();
        this.setupTouchOptimizations();
        this.setupFormOptimizations();
        this.setupNavigationOptimizations();
        this.setupPerformanceOptimizations();
        this.setupAccessibilityEnhancements();
        this.setupBrowserSpecificOptimizations();
        
        // Device-specific initializations
        if (this.deviceInfo.isIOS) {
            this.initIOSOptimizations();
        }
        
        if (this.deviceInfo.isAndroid) {
            this.initAndroidOptimizations();
        }
        
        this.logDeviceInfo();
    }

    /**
     * Viewport-Optimierungen
     */
    setupViewport() {
        // Dynamic viewport height fix für mobile Browser
        const setVH = () => {
            const vh = window.innerHeight * 0.01;
            document.documentElement.style.setProperty('--vh', `${vh}px`);
        };
        
        setVH();
        window.addEventListener('resize', this.debounce(setVH, 100));
        window.addEventListener('orientationchange', () => {
            setTimeout(setVH, 100);
        });

        // Prevent zoom on focus (iOS Safari)
        if (this.deviceInfo.isIOS) {
            const viewport = document.querySelector('meta[name="viewport"]');
            if (viewport) {
                const content = viewport.getAttribute('content');
                
                const preventZoom = () => {
                    viewport.setAttribute('content', content + ', user-scalable=no');
                };
                
                const allowZoom = () => {
                    viewport.setAttribute('content', content);
                };

                // Prevent zoom during form interaction
                document.addEventListener('focusin', preventZoom);
                document.addEventListener('focusout', allowZoom);
            }
        }
    }

    /**
     * Touch-Interaktionen optimieren
     */
    setupTouchOptimizations() {
        if (!this.deviceInfo.hasTouch) return;

        // Enhanced touch feedback
        this.setupTouchFeedback();
        
        // Prevent accidental interactions
        this.preventAccidentalTouches();
        
        // Optimize scroll behavior
        this.optimizeScrolling();
        
        // Custom gesture handling
        this.setupGestureHandling();
    }

    /**
     * Touch-Feedback System
     */
    setupTouchFeedback() {
        const feedbackElements = '.btn, .nav-link, .card, .list-group-item, .form-check-label';
        
        document.addEventListener('touchstart', (e) => {
            const target = e.target.closest(feedbackElements);
            if (!target) return;
            
            this.activeElement = target;
            target.classList.add('touch-active');
            
            // Haptic feedback (wenn unterstützt)
            if (this.deviceInfo.supportsVibration) {
                navigator.vibrate(10);
            }
            
            // Visual feedback
            this.addRippleEffect(target, e.touches[0]);
        }, { passive: true });

        document.addEventListener('touchend', () => {
            if (this.activeElement) {
                this.activeElement.classList.remove('touch-active');
                this.activeElement = null;
            }
        }, { passive: true });

        document.addEventListener('touchcancel', () => {
            if (this.activeElement) {
                this.activeElement.classList.remove('touch-active');
                this.activeElement = null;
            }
        }, { passive: true });
    }

    /**
     * Ripple-Effekt für Touch-Feedback
     */
    addRippleEffect(element, touch) {
        const rect = element.getBoundingClientRect();
        const ripple = document.createElement('div');
        
        const size = Math.max(rect.width, rect.height);
        const x = touch.clientX - rect.left - size / 2;
        const y = touch.clientY - rect.top - size / 2;
        
        ripple.style.cssText = `
            position: absolute;
            width: ${size}px;
            height: ${size}px;
            left: ${x}px;
            top: ${y}px;
            background: radial-gradient(circle, rgba(255,255,255,0.3) 0%, transparent 70%);
            border-radius: 50%;
            pointer-events: none;
            animation: ripple 0.6s ease-out;
            z-index: 1;
        `;
        
        element.style.position = 'relative';
        element.style.overflow = 'hidden';
        element.appendChild(ripple);
        
        setTimeout(() => {
            if (ripple.parentNode) {
                ripple.parentNode.removeChild(ripple);
            }
        }, 600);
    }

    /**
     * Versehentliche Touches verhindern
     */
    preventAccidentalTouches() {
        let lastTouchTime = 0;
        const minTouchInterval = 100; // ms
        
        document.addEventListener('touchstart', (e) => {
            const now = Date.now();
            if (now - lastTouchTime < minTouchInterval) {
                e.preventDefault();
                return;
            }
            lastTouchTime = now;
            
            this.touchStartCoords = {
                x: e.touches[0].clientX,
                y: e.touches[0].clientY,
                time: now
            };
        }, { passive: false });

        // Prevent accidental clicks during scroll
        document.addEventListener('touchmove', (e) => {
            if (!this.touchStartCoords) return;
            
            const touch = e.touches[0];
            const deltaX = Math.abs(touch.clientX - this.touchStartCoords.x);
            const deltaY = Math.abs(touch.clientY - this.touchStartCoords.y);
            
            if (deltaX > 10 || deltaY > 10) {
                this.isScrolling = true;
            }
        }, { passive: true });

        document.addEventListener('touchend', (e) => {
            if (this.isScrolling) {
                e.preventDefault();
                this.isScrolling = false;
            }
            this.touchStartCoords = null;
        }, { passive: false });
    }

    /**
     * Scroll-Verhalten optimieren
     */
    optimizeScrolling() {
        // Smooth scrolling für alle Links
        document.addEventListener('click', (e) => {
            const target = e.target.closest('a[href^="#"]');
            if (!target) return;
            
            e.preventDefault();
            const href = target.getAttribute('href');
            const element = document.querySelector(href);
            
            if (element) {
                element.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });

        // Momentum scrolling für iOS
        if (this.deviceInfo.isIOS) {
            const scrollElements = '.table-responsive, .modal-body, .overflow-auto';
            document.querySelectorAll(scrollElements).forEach(el => {
                el.style.webkitOverflowScrolling = 'touch';
            });
        }

        // Prevent overscroll
        document.addEventListener('touchmove', (e) => {
            const target = e.target.closest('.prevent-overscroll');
            if (target) {
                e.preventDefault();
            }
        }, { passive: false });
    }

    /**
     * Gesten-Handling
     */
    setupGestureHandling() {
        let touchData = {};

        document.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                touchData = {
                    startX: e.touches[0].clientX,
                    startY: e.touches[0].clientY,
                    startTime: Date.now()
                };
            }
        }, { passive: true });

        document.addEventListener('touchend', (e) => {
            if (!touchData.startX) return;

            const endX = e.changedTouches[0].clientX;
            const endY = e.changedTouches[0].clientY;
            const deltaX = endX - touchData.startX;
            const deltaY = endY - touchData.startY;
            const deltaTime = Date.now() - touchData.startTime;

            // Swipe detection
            if (Math.abs(deltaX) > 50 && deltaTime < 300) {
                const direction = deltaX > 0 ? 'right' : 'left';
                this.handleSwipe(direction, e.target);
            }

            touchData = {};
        }, { passive: true });
    }

    /**
     * Swipe-Gesten behandeln
     */
    handleSwipe(direction, target) {
        // Table row actions
        const tableRow = target.closest('tr');
        if (tableRow && tableRow.dataset.entryId) {
            if (direction === 'right') {
                // Mark as completed
                this.triggerTableAction(tableRow, 'status');
            } else if (direction === 'left') {
                // Show actions menu
                this.showTableActions(tableRow);
            }
        }

        // Navigation
        const navbar = target.closest('.navbar');
        if (navbar && direction === 'right') {
            const navToggler = navbar.querySelector('.navbar-toggler');
            if (navToggler && !navToggler.classList.contains('collapsed')) {
                navToggler.click();
            }
        }
    }

    /**
     * Formular-Optimierungen
     */
    setupFormOptimizations() {
        // Input type optimization
        this.optimizeInputTypes();
        
        // Auto-focus management
        this.setupAutoFocus();
        
        // Form validation improvements
        this.enhanceFormValidation();
        
        // Input assistance
        this.setupInputAssistance();
    }

    /**
     * Input-Typen für mobile Tastaturen optimieren
     */
    optimizeInputTypes() {
        const inputOptimizations = {
            'input[name="telefonnummer"], input[type="tel"]': {
                inputmode: 'tel',
                pattern: '[0-9 +-()]*'
            },
            'input[name="inputMoney"], input[data-type="currency"]': {
                inputmode: 'decimal',
                pattern: '[0-9.,]*'
            },
            'input[name="cb_anzahl"], input[type="number"]': {
                inputmode: 'numeric',
                pattern: '[0-9]*'
            },
            'input[type="email"]': {
                inputmode: 'email',
                autocomplete: 'email'
            },
            'input[name="name"]': {
                autocomplete: 'name',
                autocapitalize: 'words'
            },
            'input[name="inputAddress"]': {
                autocomplete: 'street-address',
                autocapitalize: 'words'
            }
        };

        Object.entries(inputOptimizations).forEach(([selector, attributes]) => {
            document.querySelectorAll(selector).forEach(input => {
                Object.entries(attributes).forEach(([attr, value]) => {
                    input.setAttribute(attr, value);
                });
            });
        });
    }

    /**
     * Auto-Focus Management
     */
    setupAutoFocus() {
        // Prevent auto-focus on mobile (can cause zoom)
        if (this.deviceInfo.isMobile) {
            document.querySelectorAll('input[autofocus]').forEach(input => {
                input.removeAttribute('autofocus');
            });
        }

        // Smart focus management
        document.addEventListener('submit', (e) => {
            const form = e.target;
            const firstInvalidInput = form.querySelector('.is-invalid, :invalid');
            
            if (firstInvalidInput) {
                e.preventDefault();
                setTimeout(() => {
                    firstInvalidInput.focus();
                    firstInvalidInput.scrollIntoView({
                        behavior: 'smooth',
                        block: 'center'
                    });
                }, 100);
            }
        });
    }

    /**
     * Form-Validierung verbessern
     */
    enhanceFormValidation() {
        // Real-time validation with debouncing
        const validationInputs = document.querySelectorAll('input[required], select[required], textarea[required]');
        
        validationInputs.forEach(input => {
            const validateInput = this.debounce(() => {
                this.validateField(input);
            }, 500);

            input.addEventListener('input', validateInput);
            input.addEventListener('blur', () => this.validateField(input));
        });
    }

    /**
     * Feld-Validierung
     */
    validateField(input) {
        const isValid = input.checkValidity();
        const feedback = input.parentNode.querySelector('.invalid-feedback');
        
        if (isValid) {
            input.classList.remove('is-invalid');
            input.classList.add('is-valid');
        } else {
            input.classList.remove('is-valid');
            input.classList.add('is-invalid');
            
            // Custom error messages
            if (feedback) {
                feedback.textContent = this.getCustomErrorMessage(input);
            }
        }
    }

    /**
     * Benutzerdefinierte Fehlermeldungen
     */
    getCustomErrorMessage(input) {
        const validity = input.validity;
        const fieldName = input.labels[0]?.textContent || input.name || 'Dieses Feld';
        
        if (validity.valueMissing) {
            return `${fieldName} ist erforderlich.`;
        }
        if (validity.typeMismatch) {
            return `Bitte geben Sie ein gültiges ${input.type === 'email' ? 'E-Mail' : input.type} ein.`;
        }
        if (validity.patternMismatch) {
            return `${fieldName} hat ein ungültiges Format.`;
        }
        if (validity.rangeUnderflow) {
            return `${fieldName} muss mindestens ${input.min} sein.`;
        }
        if (validity.rangeOverflow) {
            return `${fieldName} darf maximal ${input.max} sein.`;
        }
        if (validity.tooShort) {
            return `${fieldName} muss mindestens ${input.minLength} Zeichen lang sein.`;
        }
        if (validity.tooLong) {
            return `${fieldName} darf maximal ${input.maxLength} Zeichen lang sein.`;
        }
        
        return `${fieldName} ist ungültig.`;
    }

    /**
     * Input-Assistenz
     */
    setupInputAssistance() {
        // Auto-format phone numbers
        document.querySelectorAll('input[type="tel"], input[name="telefonnummer"]').forEach(input => {
            input.addEventListener('input', (e) => {
                let value = e.target.value.replace(/\D/g, '');
                
                // German phone number formatting
                if (value.startsWith('49')) {
                    value = '+' + value;
                } else if (value.startsWith('0')) {
                    value = value.replace(/^0/, '+49 ');
                }
                
                // Format with spaces
                if (value.length > 3) {
                    value = value.replace(/(\+49\s?)(\d{2,4})(\d{0,8})/, '$1$2 $3');
                }
                
                e.target.value = value.trim();
            });
        });

        // Auto-format currency
        document.querySelectorAll('input[name="inputMoney"]').forEach(input => {
            input.addEventListener('blur', (e) => {
                const value = parseFloat(e.target.value);
                if (!isNaN(value)) {
                    e.target.value = value.toFixed(2);
                }
            });
        });
    }

    /**
     * Navigation-Optimierungen
     */
    setupNavigationOptimizations() {
        // Enhanced navbar toggle for touch
        const navToggler = document.querySelector('.navbar-toggler');
        if (navToggler) {
            navToggler.addEventListener('click', (e) => {
                e.preventDefault();
                const target = document.querySelector(navToggler.dataset.bsTarget);
                
                if (target) {
                    const isExpanded = navToggler.getAttribute('aria-expanded') === 'true';
                    
                    if (isExpanded) {
                        target.classList.remove('show');
                        navToggler.setAttribute('aria-expanded', 'false');
                    } else {
                        target.classList.add('show');
                        navToggler.setAttribute('aria-expanded', 'true');
                    }
                }
            });
        }

        // Close mobile menu on link click
        document.querySelectorAll('.navbar-nav .nav-link').forEach(link => {
            link.addEventListener('click', () => {
                const navCollapse = document.querySelector('.navbar-collapse.show');
                if (navCollapse && this.deviceInfo.isMobile) {
                    navCollapse.classList.remove('show');
                    const toggler = document.querySelector('.navbar-toggler');
                    if (toggler) {
                        toggler.setAttribute('aria-expanded', 'false');
                    }
                }
            });
        });
    }

    /**
     * Performance-Optimierungen
     */
    setupPerformanceOptimizations() {
        // Lazy loading für Bilder
        this.setupLazyLoading();
        
        // Intersection Observer für Animationen
        this.setupIntersectionObserver();
        
        // Memory management
        this.setupMemoryManagement();
        
        // Network-aware loading
        this.setupNetworkAwareLoading();
    }

    /**
     * Lazy Loading Setup
     */
    setupLazyLoading() {
        if ('IntersectionObserver' in window) {
            const imageObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        if (img.dataset.src) {
                            img.src = img.dataset.src;
                            img.removeAttribute('data-src');
                            imageObserver.unobserve(img);
                        }
                    }
                });
            });

            document.querySelectorAll('img[data-src]').forEach(img => {
                imageObserver.observe(img);
            });
        }
    }

    /**
     * Intersection Observer für Animationen
     */
    setupIntersectionObserver() {
        if ('IntersectionObserver' in window) {
            const animationObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('animate-in');
                        animationObserver.unobserve(entry.target);
                    }
                });
            }, {
                threshold: 0.1,
                rootMargin: '20px'
            });

            document.querySelectorAll('.animate-on-scroll').forEach(el => {
                animationObserver.observe(el);
            });
        }
    }

    /**
     * Memory Management
     */
    setupMemoryManagement() {
        // Clean up event listeners on page unload
        window.addEventListener('beforeunload', () => {
            this.cleanup();
        });

        // Memory usage monitoring
        if ('memory' in performance) {
            setInterval(() => {
                const memory = performance.memory;
                if (memory.usedJSHeapSize / memory.jsHeapSizeLimit > 0.9) {
                    console.warn('High memory usage detected');
                    this.optimizeMemory();
                }
            }, 30000);
        }
    }

    /**
     * Network-Aware Loading
     */
    setupNetworkAwareLoading() {
        if ('connection' in navigator) {
            const connection = navigator.connection;
            
            // Adjust loading strategy based on connection
            if (connection.effectiveType === '2g' || connection.effectiveType === 'slow-2g') {
                document.body.classList.add('slow-connection');
                this.enableDataSaver();
            }
            
            connection.addEventListener('change', () => {
                if (connection.effectiveType === '2g' || connection.effectiveType === 'slow-2g') {
                    this.enableDataSaver();
                } else {
                    this.disableDataSaver();
                }
            });
        }
    }

    /**
     * Accessibility-Verbesserungen
     */
    setupAccessibilityEnhancements() {
        // Enhanced focus management
        this.setupFocusManagement();
        
        // Screen reader optimizations
        this.setupScreenReaderOptimizations();
        
        // Reduced motion support
        this.setupReducedMotionSupport();
    }

    /**
     * Focus Management
     */
    setupFocusManagement() {
        let focusRing = true;
        
        // Hide focus ring for mouse users
        document.addEventListener('mousedown', () => {
            focusRing = false;
        });
        
        // Show focus ring for keyboard users
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                focusRing = true;
            }
        });
        
        // Apply focus ring visibility
        document.addEventListener('focus', (e) => {
            if (focusRing) {
                e.target.classList.add('focus-visible');
            }
        }, true);
        
        document.addEventListener('blur', (e) => {
            e.target.classList.remove('focus-visible');
        }, true);
    }

    /**
     * Screen Reader Optimierungen
     */
    setupScreenReaderOptimizations() {
        // Live region for dynamic content
        const liveRegion = document.createElement('div');
        liveRegion.setAttribute('aria-live', 'polite');
        liveRegion.setAttribute('aria-atomic', 'true');
        liveRegion.className = 'sr-only';
        liveRegion.id = 'live-region';
        document.body.appendChild(liveRegion);

        // Announce important changes
        window.announceToScreenReader = (message) => {
            liveRegion.textContent = message;
            setTimeout(() => {
                liveRegion.textContent = '';
            }, 1000);
        };
    }

    /**
     * Reduced Motion Support
     */
    setupReducedMotionSupport() {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            document.body.classList.add('reduced-motion');
            
            // Disable smooth scrolling
            document.documentElement.style.scrollBehavior = 'auto';
            
            // Reduce animation durations
            const style = document.createElement('style');
            style.textContent = `
                *, *::before, *::after {
                    animation-duration: 0.01ms !important;
                    animation-iteration-count: 1 !important;
                    transition-duration: 0.01ms !important;
                }
            `;
            document.head.appendChild(style);
        }
    }

    /**
     * Browser-spezifische Optimierungen
     */
    setupBrowserSpecificOptimizations() {
        // Chrome/Edge specific
        if (this.deviceInfo.isChrome || this.deviceInfo.isEdge) {
            this.setupChromiumOptimizations();
        }
        
        // Firefox specific
        if (this.deviceInfo.isFirefox) {
            this.setupFirefoxOptimizations();
        }
        
        // Safari specific
        if (this.deviceInfo.isSafari) {
            this.setupSafariOptimizations();
        }
        
        // Samsung Internet specific
        if (this.deviceInfo.isSamsungInternet) {
            this.setupSamsungInternetOptimizations();
        }
    }

    /**
     * Chromium-spezifische Optimierungen
     */
    setupChromiumOptimizations() {
        // Chrome-specific optimizations
        document.body.classList.add('browser-chrome');
    }

    /**
     * Firefox-spezifische Optimierungen
     */
    setupFirefoxOptimizations() {
        // Firefox-specific optimizations
        document.body.classList.add('browser-firefox');
    }

    /**
     * Safari-spezifische Optimierungen
     */
    setupSafariOptimizations() {
        // Safari-specific optimizations
        document.body.classList.add('browser-safari');
    }

    /**
     * Samsung Internet-spezifische Optimierungen
     */
    setupSamsungInternetOptimizations() {
        // Samsung Internet-specific optimizations
        document.body.classList.add('browser-samsung');
    }

    /**
     * iOS-spezifische Optimierungen
     */
    initIOSOptimizations() {
        // Prevent bounce scrolling
        document.addEventListener('touchmove', (e) => {
            if (e.target.closest('.no-bounce')) {
                e.preventDefault();
            }
        }, { passive: false });

        // Handle safe areas
        if (CSS.supports('padding-top: env(safe-area-inset-top)')) {
            document.body.classList.add('has-safe-areas');
        }

        // iOS keyboard handling
        window.addEventListener('resize', () => {
            if (document.activeElement.tagName === 'INPUT') {
                setTimeout(() => {
                    document.activeElement.scrollIntoView({
                        behavior: 'smooth',
                        block: 'center'
                    });
                }, 300);
            }
        });
    }

    /**
     * Android-spezifische Optimierungen
     */
    initAndroidOptimizations() {
        // Android keyboard handling
        const originalHeight = window.innerHeight;
        
        window.addEventListener('resize', () => {
            const currentHeight = window.innerHeight;
            const heightDifference = originalHeight - currentHeight;
            
            if (heightDifference > 150) {
                // Keyboard is probably open
                document.body.classList.add('keyboard-open');
            } else {
                document.body.classList.remove('keyboard-open');
            }
        });

        // Android Chrome address bar handling
        let lastScrollTop = 0;
        window.addEventListener('scroll', () => {
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            if (scrollTop > lastScrollTop) {
                document.body.classList.add('scrolling-down');
            } else {
                document.body.classList.remove('scrolling-down');
            }
            lastScrollTop = scrollTop;
        }, { passive: true });
    }

    /**
     * Utility Methods
     */
    enableDataSaver() {
        document.body.classList.add('data-saver');
        // Disable autoplay, reduce quality, etc.
    }

    disableDataSaver() {
        document.body.classList.remove('data-saver');
    }

    optimizeMemory() {
        // Clean up unused DOM nodes, clear caches, etc.
        console.log('Optimizing memory usage...');
    }

    cleanup() {
        // Remove event listeners, clear timers, etc.
    }

    triggerTableAction(row, action) {
        const button = row.querySelector(`.btn-${action}`);
        if (button) {
            button.click();
        }
    }

    showTableActions(row) {
        // Show context menu or action sheet
        console.log('Show actions for row:', row.dataset.entryId);
    }

    logDeviceInfo() {
        console.log('CBS Mobile Optimizer initialized for:', this.deviceInfo);
    }

    /**
     * Debounce function
     */
    debounce(func, wait, immediate) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                timeout = null;
                if (!immediate) func(...args);
            };
            const callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) func(...args);
        };
    }
}

// Auto-Initialisierung
document.addEventListener('DOMContentLoaded', () => {
    window.cbsMobileOptimizer = new CBSMobileOptimizer();
});

// Export für Modul-Verwendung
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CBSMobileOptimizer;
}