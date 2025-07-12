/**
 * Comprehensive User Testing Suite
 * Simulates real-world user interactions and identifies potential issues
 */

interface TestResult {
  category: string;
  testName: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  recommendations?: string[];
}

interface UserTestingReport {
  summary: {
    totalTests: number;
    passed: number;
    failed: number;
    warnings: number;
  };
  results: TestResult[];
  bugs: TestResult[];
  usabilityIssues: TestResult[];
  performanceIssues: TestResult[];
  securityIssues: TestResult[];
  accessibilityIssues: TestResult[];
}

export class ComprehensiveUserTesting {
  private results: TestResult[] = [];
  
  async runAllTests(): Promise<UserTestingReport> {
    console.log('🧪 Starting Comprehensive User Testing Suite...');
    
    // Clear previous results
    this.results = [];
    
    // Run all test categories
    await this.testUserJourneys();
    await this.testCrossBrowserCompatibility();
    await this.testResponsiveDesign();
    await this.testPerformance();
    await this.testUsability();
    await this.testErrorHandling();
    await this.testSecurity();
    await this.testAccessibility();
    await this.testIntegrations();
    
    return this.generateReport();
  }
  
  private async testUserJourneys(): Promise<void> {
    console.log('🔄 Testing User Journeys...');
    
    // Test registration flow
    await this.testRegistrationFlow();
    
    // Test login flow
    await this.testLoginFlow();
    
    // Test navigation
    await this.testNavigation();
    
    // Test core features
    await this.testCoreFeatures();
  }
  
  private async testRegistrationFlow(): Promise<void> {
    try {
      // Only test registration flow if we're on the registration page
      if (window.location.pathname !== '/register') {
        this.addResult({
          category: 'User Journey',
          testName: 'Registration Form Fields',
          status: 'pass',
          severity: 'low',
          message: 'Registration form tests skipped - not on registration page'
        });
        return;
      }

      // Check if registration form exists
      const registerForm = document.querySelector('form');
      if (!registerForm) {
        this.addResult({
          category: 'User Journey',
          testName: 'Registration Form Presence',
          status: 'fail',
          severity: 'critical',
          message: 'Registration form not found on /register page',
          recommendations: ['Ensure RegisterForm component is properly mounted', 'Check routing configuration']
        });
        return;
      }
      
      // Test form fields presence
      const requiredFields = ['firstName', 'lastName', 'email', 'password', 'confirmPassword'];
      const missingFields = requiredFields.filter(field => !document.querySelector(`[name="${field}"]`));
      
      if (missingFields.length > 0) {
        this.addResult({
          category: 'User Journey',
          testName: 'Registration Form Fields',
          status: 'fail',
          severity: 'high',
          message: `Missing required fields: ${missingFields.join(', ')}`,
          recommendations: ['Add missing form fields', 'Ensure proper field naming']
        });
      } else {
        this.addResult({
          category: 'User Journey',
          testName: 'Registration Form Fields',
          status: 'pass',
          severity: 'low',
          message: 'All required registration fields present'
        });
      }
      
      // Test password validation
      const passwordField = document.querySelector('[name="password"]') as HTMLInputElement;
      const confirmPasswordField = document.querySelector('[name="confirmPassword"]') as HTMLInputElement;
      
      if (passwordField && confirmPasswordField) {
        // Simulate password mismatch
        passwordField.value = 'password123';
        passwordField.dispatchEvent(new Event('input', { bubbles: true }));
        
        confirmPasswordField.value = 'password456';
        confirmPasswordField.dispatchEvent(new Event('input', { bubbles: true }));
        
        // Check if validation message appears
        setTimeout(() => {
          const errorMessage = document.querySelector('[data-testid="password-mismatch"]') || 
                             document.querySelector('*:contains("Passwords do not match")');
          
          if (errorMessage) {
            this.addResult({
              category: 'User Journey',
              testName: 'Password Validation',
              status: 'pass',
              severity: 'low',
              message: 'Password mismatch validation working'
            });
          } else {
            this.addResult({
              category: 'User Journey',
              testName: 'Password Validation',
              status: 'warning',
              severity: 'medium',
              message: 'Password mismatch validation may not be visible',
              recommendations: ['Ensure error messages are properly displayed', 'Add aria-live regions for screen readers']
            });
          }
        }, 100);
      }
      
      // Test terms acceptance
      const termsCheckbox = document.querySelector('[type="checkbox"]');
      if (!termsCheckbox) {
        this.addResult({
          category: 'User Journey',
          testName: 'Terms Acceptance',
          status: 'warning',
          severity: 'medium',
          message: 'Terms acceptance checkbox not found',
          recommendations: ['Add terms and conditions checkbox', 'Ensure legal compliance']
        });
      }
      
    } catch (error) {
      this.addResult({
        category: 'User Journey',
        testName: 'Registration Flow Test',
        status: 'fail',
        severity: 'high',
        message: `Registration flow test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        recommendations: ['Debug registration component errors', 'Check console for detailed errors']
      });
    }
  }
  
  private async testLoginFlow(): Promise<void> {
    try {
      // Test login page accessibility
      if (window.location.pathname === '/login') {
        const emailField = document.querySelector('[type="email"]');
        const passwordField = document.querySelector('[type="password"]');
        const submitButton = document.querySelector('[type="submit"]');
        
        if (!emailField || !passwordField || !submitButton) {
          this.addResult({
            category: 'User Journey',
            testName: 'Login Form Elements',
            status: 'fail',
            severity: 'critical',
            message: 'Essential login form elements missing',
            recommendations: ['Ensure email, password fields and submit button exist', 'Check form component structure']
          });
        } else {
          this.addResult({
            category: 'User Journey',
            testName: 'Login Form Elements',
            status: 'pass',
            severity: 'low',
            message: 'All essential login elements present'
          });
        }
        
        // Test remember me option
        const rememberMeCheckbox = document.querySelector('[name="rememberMe"]');
        if (!rememberMeCheckbox) {
          this.addResult({
            category: 'User Journey',
            testName: 'Remember Me Option',
            status: 'warning',
            severity: 'low',
            message: '"Remember Me" option not found',
            recommendations: ['Consider adding remember me functionality for better UX']
          });
        }
      }
    } catch (error) {
      this.addResult({
        category: 'User Journey',
        testName: 'Login Flow Test',
        status: 'fail',
        severity: 'high',
        message: `Login flow test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  }
  
  private async testNavigation(): Promise<void> {
    try {
      // Test navigation elements
      const navElement = document.querySelector('nav') || document.querySelector('[role="navigation"]');
      if (!navElement) {
        this.addResult({
          category: 'Navigation',
          testName: 'Navigation Presence',
          status: 'fail',
          severity: 'high',
          message: 'Main navigation not found',
          recommendations: ['Add proper navigation structure', 'Use semantic nav element or role="navigation"']
        });
      }
      
      // Test for mobile menu
      const mobileMenuTrigger = document.querySelector('[aria-label*="menu"]') || 
                               document.querySelector('.hamburger') ||
                               document.querySelector('[data-testid="mobile-menu"]');
      
      if (!mobileMenuTrigger && window.innerWidth <= 768) {
        this.addResult({
          category: 'Navigation',
          testName: 'Mobile Navigation',
          status: 'warning',
          severity: 'medium',
          message: 'Mobile menu trigger not found',
          recommendations: ['Add mobile menu for better mobile experience', 'Ensure responsive navigation']
        });
      }
      
      // Test breadcrumbs
      const breadcrumbs = document.querySelector('[aria-label="breadcrumb"]') ||
                         document.querySelector('.breadcrumb');
      
      if (!breadcrumbs && window.location.pathname.split('/').length > 2) {
        this.addResult({
          category: 'Navigation',
          testName: 'Breadcrumbs',
          status: 'warning',
          severity: 'low',
          message: 'Breadcrumbs not found on deep pages',
          recommendations: ['Consider adding breadcrumbs for better navigation', 'Helps users understand their location']
        });
      }
      
    } catch (error) {
      this.addResult({
        category: 'Navigation',
        testName: 'Navigation Test',
        status: 'fail',
        severity: 'medium',
        message: `Navigation test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  }
  
  private async testCoreFeatures(): Promise<void> {
    // Test based on current route
    const currentPath = window.location.pathname;
    
    if (currentPath === '/dashboard') {
      await this.testDashboardFeatures();
    } else if (currentPath === '/proposals') {
      await this.testProposalsFeatures();
    } else if (currentPath === '/calculator') {
      await this.testCalculatorFeatures();
    }
  }
  
  private async testDashboardFeatures(): Promise<void> {
    try {
      const dashboardCards = document.querySelectorAll('[data-testid*="card"], .card, [class*="card"]');
      if (dashboardCards.length === 0) {
        this.addResult({
          category: 'Core Features',
          testName: 'Dashboard Cards',
          status: 'warning',
          severity: 'medium',
          message: 'No dashboard cards found',
          recommendations: ['Ensure dashboard statistics are displayed', 'Add visual cards for key metrics']
        });
      }
      
      const chartElements = document.querySelectorAll('svg, canvas, [class*="chart"]');
      if (chartElements.length === 0) {
        this.addResult({
          category: 'Core Features',
          testName: 'Dashboard Charts',
          status: 'warning',
          severity: 'low',
          message: 'No charts found on dashboard',
          recommendations: ['Consider adding visual charts for data representation']
        });
      }
      
    } catch (error) {
      this.addResult({
        category: 'Core Features',
        testName: 'Dashboard Features',
        status: 'fail',
        severity: 'medium',
        message: `Dashboard test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  }
  
  private async testProposalsFeatures(): Promise<void> {
    try {
      const proposalsList = document.querySelector('[data-testid="proposals-list"]') ||
                            document.querySelector('table') ||
                            document.querySelectorAll('[class*="proposal"]');
      
      if (!proposalsList || (proposalsList instanceof NodeList && proposalsList.length === 0)) {
        this.addResult({
          category: 'Core Features',
          testName: 'Proposals List',
          status: 'warning',
          severity: 'medium',
          message: 'Proposals list not found or empty',
          recommendations: ['Ensure proposals are displayed when available', 'Show empty state message when no proposals exist']
        });
      }
      
    } catch (error) {
      this.addResult({
        category: 'Core Features',
        testName: 'Proposals Features',
        status: 'fail',
        severity: 'medium',
        message: `Proposals test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  }
  
  private async testCalculatorFeatures(): Promise<void> {
    try {
      const calculatorInputs = document.querySelectorAll('input[type="number"], input[type="range"]');
      if (calculatorInputs.length === 0) {
        this.addResult({
          category: 'Core Features',
          testName: 'Calculator Inputs',
          status: 'fail',
          severity: 'high',
          message: 'No calculator inputs found on calculator page',
          recommendations: ['Add numeric inputs for calculations', 'Ensure calculator functionality is implemented']
        });
      }
      
      const calculateButton = document.querySelector('button[type="submit"]') ||
                             document.querySelector('button:contains("Calculate")');
      
      if (!calculateButton) {
        this.addResult({
          category: 'Core Features',
          testName: 'Calculate Button',
          status: 'warning',
          severity: 'medium',
          message: 'Calculate button not found',
          recommendations: ['Add clear action button for calculations']
        });
      }
      
    } catch (error) {
      this.addResult({
        category: 'Core Features',
        testName: 'Calculator Features',
        status: 'fail',
        severity: 'medium',
        message: `Calculator test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  }
  
  private async testCrossBrowserCompatibility(): Promise<void> {
    try {
      // Test browser-specific features
      const userAgent = navigator.userAgent;
      const isChrome = userAgent.includes('Chrome');
      const isFirefox = userAgent.includes('Firefox');
      const isSafari = userAgent.includes('Safari') && !userAgent.includes('Chrome');
      const isEdge = userAgent.includes('Edg');
      
      // Test CSS Grid support
      const testElement = document.createElement('div');
      testElement.style.display = 'grid';
      if (testElement.style.display !== 'grid') {
        this.addResult({
          category: 'Cross-Browser',
          testName: 'CSS Grid Support',
          status: 'fail',
          severity: 'medium',
          message: 'CSS Grid not supported in this browser',
          recommendations: ['Add fallback layouts for older browsers', 'Consider flexbox alternatives']
        });
      }
      
      // Test Flexbox support
      testElement.style.display = 'flex';
      if (testElement.style.display !== 'flex') {
        this.addResult({
          category: 'Cross-Browser',
          testName: 'Flexbox Support',
          status: 'fail',
          severity: 'high',
          message: 'Flexbox not supported in this browser',
          recommendations: ['Critical layout feature missing', 'Add polyfills or fallbacks']
        });
      }
      
      // Test modern JavaScript features
      try {
        const testArrowFunction = () => {};
        const testPromise = new Promise(resolve => resolve(true));
        const testMap = new Map();
        
        this.addResult({
          category: 'Cross-Browser',
          testName: 'Modern JavaScript Support',
          status: 'pass',
          severity: 'low',
          message: 'Modern JavaScript features supported'
        });
      } catch (error) {
        this.addResult({
          category: 'Cross-Browser',
          testName: 'Modern JavaScript Support',
          status: 'fail',
          severity: 'high',
          message: 'Modern JavaScript features not supported',
          recommendations: ['Add polyfills for older browsers', 'Consider transpiling code']
        });
      }
      
    } catch (error) {
      this.addResult({
        category: 'Cross-Browser',
        testName: 'Browser Compatibility',
        status: 'fail',
        severity: 'medium',
        message: `Browser compatibility test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  }
  
  private async testResponsiveDesign(): Promise<void> {
    try {
      const viewport = {
        width: window.innerWidth,
        height: window.innerHeight
      };
      
      // Test viewport meta tag
      const viewportMeta = document.querySelector('meta[name="viewport"]');
      if (!viewportMeta) {
        this.addResult({
          category: 'Responsive Design',
          testName: 'Viewport Meta Tag',
          status: 'fail',
          severity: 'high',
          message: 'Viewport meta tag missing',
          recommendations: ['Add viewport meta tag for mobile responsiveness']
        });
      }
      
      // Test responsive breakpoints
      const breakpoints = [
        { name: 'Mobile', width: 320 },
        { name: 'Tablet', width: 768 },
        { name: 'Desktop', width: 1024 }
      ];
      
      // Test current viewport
      let currentBreakpoint = 'Desktop';
      if (viewport.width <= 768) currentBreakpoint = viewport.width <= 320 ? 'Mobile' : 'Tablet';
      
      // Test for responsive images
      const images = document.querySelectorAll('img');
      const hasResponsiveImages = Array.from(images).some(img => 
        img.hasAttribute('srcset') || 
        img.style.maxWidth === '100%' ||
        img.classList.contains('responsive')
      );
      
      if (images.length > 0 && !hasResponsiveImages) {
        this.addResult({
          category: 'Responsive Design',
          testName: 'Responsive Images',
          status: 'warning',
          severity: 'medium',
          message: 'Images may not be responsive',
          recommendations: ['Add max-width: 100% to images', 'Consider using srcset for different screen sizes']
        });
      }
      
      // Test for horizontal scrolling
      const bodyScrollWidth = document.body.scrollWidth;
      const viewportWidth = window.innerWidth;
      
      if (bodyScrollWidth > viewportWidth) {
        this.addResult({
          category: 'Responsive Design',
          testName: 'Horizontal Scrolling',
          status: 'warning',
          severity: 'medium',
          message: 'Horizontal scrolling detected',
          recommendations: ['Check for fixed-width elements', 'Ensure content fits viewport width']
        });
      }
      
    } catch (error) {
      this.addResult({
        category: 'Responsive Design',
        testName: 'Responsive Design Test',
        status: 'fail',
        severity: 'medium',
        message: `Responsive design test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  }
  
  private async testPerformance(): Promise<void> {
    try {
      // Test page load time
      const navigationStart = performance.timing.navigationStart;
      const loadComplete = performance.timing.loadEventEnd;
      const loadTime = loadComplete - navigationStart;
      
      if (loadTime > 3000) {
        this.addResult({
          category: 'Performance',
          testName: 'Page Load Time',
          status: 'warning',
          severity: 'medium',
          message: `Page load time: ${loadTime}ms (slow)`,
          recommendations: ['Optimize images and assets', 'Enable compression', 'Minimize JavaScript bundles']
        });
      } else if (loadTime > 1000) {
        this.addResult({
          category: 'Performance',
          testName: 'Page Load Time',
          status: 'warning',
          severity: 'low',
          message: `Page load time: ${loadTime}ms (moderate)`,
          recommendations: ['Consider further optimization']
        });
      } else {
        this.addResult({
          category: 'Performance',
          testName: 'Page Load Time',
          status: 'pass',
          severity: 'low',
          message: `Page load time: ${loadTime}ms (good)`
        });
      }
      
      // Test for large images
      const images = document.querySelectorAll('img');
      const largeImages = Array.from(images).filter(img => {
        const rect = img.getBoundingClientRect();
        return rect.width > 1920 || rect.height > 1080;
      });
      
      if (largeImages.length > 0) {
        this.addResult({
          category: 'Performance',
          testName: 'Large Images',
          status: 'warning',
          severity: 'medium',
          message: `${largeImages.length} potentially oversized images found`,
          recommendations: ['Optimize image sizes', 'Use appropriate image formats (WebP, AVIF)']
        });
      }
      
      // Test for unused CSS
      const stylesheets = document.querySelectorAll('link[rel="stylesheet"], style');
      if (stylesheets.length > 5) {
        this.addResult({
          category: 'Performance',
          testName: 'CSS Resources',
          status: 'warning',
          severity: 'low',
          message: `${stylesheets.length} CSS resources loaded`,
          recommendations: ['Consider bundling CSS files', 'Remove unused styles']
        });
      }
      
    } catch (error) {
      this.addResult({
        category: 'Performance',
        testName: 'Performance Test',
        status: 'fail',
        severity: 'medium',
        message: `Performance test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  }
  
  private async testUsability(): Promise<void> {
    try {
      // Test for loading states
      const loadingElements = document.querySelectorAll('[class*="loading"], [class*="spinner"], .animate-spin');
      if (loadingElements.length === 0) {
        this.addResult({
          category: 'Usability',
          testName: 'Loading States',
          status: 'warning',
          severity: 'medium',
          message: 'No loading indicators found',
          recommendations: ['Add loading states for better user feedback', 'Show spinners during async operations']
        });
      }
      
      // Test for empty states
      const emptyStateElements = document.querySelectorAll('[class*="empty"], [data-testid*="empty"]');
      // This is more of a warning since empty states might not be visible
      
      // Test for form labels
      const inputs = document.querySelectorAll('input, textarea, select');
      const inputsWithoutLabels = Array.from(inputs).filter(input => {
        const id = input.getAttribute('id');
        const label = id ? document.querySelector(`label[for="${id}"]`) : null;
        const ariaLabel = input.getAttribute('aria-label');
        const ariaLabelledBy = input.getAttribute('aria-labelledby');
        
        return !label && !ariaLabel && !ariaLabelledBy;
      });
      
      if (inputsWithoutLabels.length > 0) {
        this.addResult({
          category: 'Usability',
          testName: 'Form Labels',
          status: 'fail',
          severity: 'high',
          message: `${inputsWithoutLabels.length} form inputs without proper labels`,
          recommendations: ['Add labels to all form inputs', 'Use aria-label for inputs without visible labels']
        });
      }
      
      // Test for button states
      const buttons = document.querySelectorAll('button');
      const disabledButtons = Array.from(buttons).filter(btn => btn.disabled);
      disabledButtons.forEach(btn => {
        if (!btn.getAttribute('aria-label') && !btn.title) {
          this.addResult({
            category: 'Usability',
            testName: 'Disabled Button States',
            status: 'warning',
            severity: 'low',
            message: 'Disabled buttons without explanation',
            recommendations: ['Add tooltips or labels explaining why buttons are disabled']
          });
        }
      });
      
      // Test for focus management
      const focusableElements = document.querySelectorAll(
        'button, input, select, textarea, a[href], [tabindex]:not([tabindex="-1"])'
      );
      
      if (focusableElements.length === 0) {
        this.addResult({
          category: 'Usability',
          testName: 'Keyboard Navigation',
          status: 'fail',
          severity: 'high',
          message: 'No focusable elements found',
          recommendations: ['Ensure interactive elements are keyboard accessible']
        });
      }
      
    } catch (error) {
      this.addResult({
        category: 'Usability',
        testName: 'Usability Test',
        status: 'fail',
        severity: 'medium',
        message: `Usability test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  }
  
  private async testErrorHandling(): Promise<void> {
    try {
      // Test for error boundaries
      const errorBoundaries = document.querySelectorAll('[data-error-boundary]');
      
      // Test for toast/notification system
      const toastContainer = document.querySelector('[data-sonner-toaster]') || 
                            document.querySelector('[data-toast-viewport]') ||
                            document.querySelector('.toast-container');
      
      if (!toastContainer) {
        this.addResult({
          category: 'Error Handling',
          testName: 'Toast System',
          status: 'warning',
          severity: 'medium',
          message: 'Toast notification system not found',
          recommendations: ['Implement toast notifications for user feedback', 'Show success/error messages']
        });
      }
      
      // Test for form validation
      const forms = document.querySelectorAll('form');
      let hasFormValidation = false;
      
      forms.forEach(form => {
        const requiredInputs = form.querySelectorAll('[required]');
        if (requiredInputs.length > 0) {
          hasFormValidation = true;
        }
      });
      
      if (forms.length > 0 && !hasFormValidation) {
        this.addResult({
          category: 'Error Handling',
          testName: 'Form Validation',
          status: 'warning',
          severity: 'medium',
          message: 'Forms without validation found',
          recommendations: ['Add client-side validation', 'Mark required fields appropriately']
        });
      }
      
      // Test for 404 handling
      const notFoundElements = document.querySelectorAll('[data-testid="404"], [class*="not-found"]');
      // This is informational since we can't easily test 404 scenarios
      
    } catch (error) {
      this.addResult({
        category: 'Error Handling',
        testName: 'Error Handling Test',
        status: 'fail',
        severity: 'medium',
        message: `Error handling test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  }
  
  private async testSecurity(): Promise<void> {
    try {
      // Test for HTTPS
      if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
        this.addResult({
          category: 'Security',
          testName: 'HTTPS Protocol',
          status: 'fail',
          severity: 'critical',
          message: 'Site not served over HTTPS',
          recommendations: ['Enable HTTPS for production deployment', 'Protect user data in transit']
        });
      }
      
      // Test for password field autocomplete
      const passwordFields = document.querySelectorAll('input[type="password"]');
      passwordFields.forEach((field, index) => {
        const autocomplete = field.getAttribute('autocomplete');
        if (!autocomplete) {
          this.addResult({
            category: 'Security',
            testName: 'Password Autocomplete',
            status: 'warning',
            severity: 'low',
            message: `Password field ${index + 1} missing autocomplete attribute`,
            recommendations: ['Add autocomplete="current-password" or "new-password"', 'Improve password manager compatibility']
          });
        }
      });
      
      // Test for sensitive data in localStorage
      try {
        const localStorageKeys = Object.keys(localStorage);
        const sensitivePatterns = ['password', 'token', 'secret', 'key'];
        const sensitiveKeys = localStorageKeys.filter(key => 
          sensitivePatterns.some(pattern => key.toLowerCase().includes(pattern))
        );
        
        if (sensitiveKeys.length > 0) {
          this.addResult({
            category: 'Security',
            testName: 'Sensitive Data Storage',
            status: 'warning',
            severity: 'high',
            message: `Potentially sensitive data in localStorage: ${sensitiveKeys.join(', ')}`,
            recommendations: ['Review data storage practices', 'Use secure storage for sensitive information']
          });
        }
      } catch (error) {
        // localStorage might not be available
      }
      
      // Test for CSP headers (informational)
      const cspMeta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
      if (!cspMeta) {
        this.addResult({
          category: 'Security',
          testName: 'Content Security Policy',
          status: 'warning',
          severity: 'medium',
          message: 'No CSP meta tag found',
          recommendations: ['Implement Content Security Policy', 'Set CSP headers at server level']
        });
      }
      
    } catch (error) {
      this.addResult({
        category: 'Security',
        testName: 'Security Test',
        status: 'fail',
        severity: 'medium',
        message: `Security test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  }
  
  private async testAccessibility(): Promise<void> {
    try {
      // Test for alt text on images
      const images = document.querySelectorAll('img');
      const imagesWithoutAlt = Array.from(images).filter(img => !img.getAttribute('alt'));
      
      if (imagesWithoutAlt.length > 0) {
        this.addResult({
          category: 'Accessibility',
          testName: 'Image Alt Text',
          status: 'fail',
          severity: 'high',
          message: `${imagesWithoutAlt.length} images without alt text`,
          recommendations: ['Add descriptive alt text to all images', 'Use empty alt="" for decorative images']
        });
      }
      
      // Test for heading hierarchy
      const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
      const headingLevels = Array.from(headings).map(h => parseInt(h.tagName.charAt(1)));
      
      let hasH1 = headingLevels.includes(1);
      if (!hasH1) {
        this.addResult({
          category: 'Accessibility',
          testName: 'Heading Hierarchy',
          status: 'fail',
          severity: 'medium',
          message: 'No H1 heading found',
          recommendations: ['Add main H1 heading to page', 'Ensure proper heading hierarchy']
        });
      }
      
      // Test for color contrast (basic check)
      const elementsWithBackgroundColor = document.querySelectorAll('*');
      // This is a simplified test - real color contrast testing requires more sophisticated analysis
      
      // Test for skip links
      const skipLinks = document.querySelectorAll('a[href="#main"], a[href="#content"], [class*="skip"]');
      if (skipLinks.length === 0) {
        this.addResult({
          category: 'Accessibility',
          testName: 'Skip Links',
          status: 'warning',
          severity: 'medium',
          message: 'No skip links found',
          recommendations: ['Add skip link for keyboard navigation', 'Improve accessibility for screen reader users']
        });
      }
      
      // Test for aria-labels and roles
      const interactiveElements = document.querySelectorAll('button, a, input, select, textarea');
      const elementsWithoutAriaLabel = Array.from(interactiveElements).filter(el => {
        const hasAriaLabel = el.getAttribute('aria-label');
        const hasRole = el.getAttribute('role');
        const hasTitle = el.getAttribute('title');
        const hasVisibleText = el.textContent?.trim();
        const hasAssociatedLabel = el.id && document.querySelector(`label[for="${el.id}"]`);
        
        return !hasAriaLabel && !hasRole && !hasTitle && !hasVisibleText && !hasAssociatedLabel;
      });
      
      if (elementsWithoutAriaLabel.length > 0) {
        this.addResult({
          category: 'Accessibility',
          testName: 'ARIA Labels',
          status: 'warning',
          severity: 'medium',
          message: `${elementsWithoutAriaLabel.length} interactive elements without labels`,
          recommendations: ['Add aria-label or visible text to interactive elements', 'Improve screen reader experience']
        });
      }
      
    } catch (error) {
      this.addResult({
        category: 'Accessibility',
        testName: 'Accessibility Test',
        status: 'fail',
        severity: 'medium',
        message: `Accessibility test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  }
  
  private async testIntegrations(): Promise<void> {
    try {
      // Test for external API calls (basic check)
      const scripts = document.querySelectorAll('script[src]');
      const externalScripts = Array.from(scripts).filter(script => {
        const src = script.getAttribute('src');
        return src && !src.startsWith('/') && !src.includes(window.location.hostname);
      });
      
      if (externalScripts.length > 0) {
        this.addResult({
          category: 'Integrations',
          testName: 'External Scripts',
          status: 'pass',
          severity: 'low',
          message: `${externalScripts.length} external scripts detected`,
          recommendations: ['Monitor external dependencies', 'Ensure fallbacks for critical integrations']
        });
      }
      
      // Test for iframe integrations
      const iframes = document.querySelectorAll('iframe');
      if (iframes.length > 0) {
        this.addResult({
          category: 'Integrations',
          testName: 'Iframe Integrations',
          status: 'pass',
          severity: 'low',
          message: `${iframes.length} iframe(s) found`,
          recommendations: ['Ensure iframes have proper sandbox attributes', 'Test iframe content loading']
        });
      }
      
      // Test for service worker
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(registrations => {
          if (registrations.length > 0) {
            this.addResult({
              category: 'Integrations',
              testName: 'Service Worker',
              status: 'pass',
              severity: 'low',
              message: 'Service worker registered',
              recommendations: ['Ensure offline functionality works correctly']
            });
          }
        });
      }
      
    } catch (error) {
      this.addResult({
        category: 'Integrations',
        testName: 'Integrations Test',
        status: 'fail',
        severity: 'low',
        message: `Integrations test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  }
  
  private addResult(result: TestResult): void {
    this.results.push(result);
  }
  
  private generateReport(): UserTestingReport {
    const summary = {
      totalTests: this.results.length,
      passed: this.results.filter(r => r.status === 'pass').length,
      failed: this.results.filter(r => r.status === 'fail').length,
      warnings: this.results.filter(r => r.status === 'warning').length
    };
    
    const bugs = this.results.filter(r => r.status === 'fail');
    const usabilityIssues = this.results.filter(r => r.category === 'Usability' && r.status !== 'pass');
    const performanceIssues = this.results.filter(r => r.category === 'Performance' && r.status !== 'pass');
    const securityIssues = this.results.filter(r => r.category === 'Security' && r.status !== 'pass');
    const accessibilityIssues = this.results.filter(r => r.category === 'Accessibility' && r.status !== 'pass');
    
    return {
      summary,
      results: this.results,
      bugs,
      usabilityIssues,
      performanceIssues,
      securityIssues,
      accessibilityIssues
    };
  }
}