
/**
 * Main verification entry point
 * Provides both quick and complete verification options
 */

import { executeCompleteVerification } from './execute-verification';
import { runQuickTest } from './quick-test';

// Make verification functions available globally for easy access
if (typeof window !== 'undefined') {
  (window as any).runCompleteVerification = executeCompleteVerification;
  (window as any).runQuickTest = runQuickTest;
  
  console.log('🎯 VERIFICATION TOOLS LOADED');
  console.log('─'.repeat(30));
  console.log('Available commands:');
  console.log('├─ runCompleteVerification() - Full application audit');
  console.log('├─ runQuickTest() - Quick health check');
  console.log('└─ /testing - Navigate to Phase 4 Testing Suite');
  console.log('');
  console.log('🚀 Starting Phase 4 verification automatically...');
  console.log('');
  
  // Auto-execute complete verification as requested
  executeCompleteVerification().then(results => {
    console.log('\n🎉 PHASE 4 VERIFICATION COMPLETE!');
    console.log(`Final Score: ${results.overallScore.toFixed(1)}/100`);
    
    if (results.overallScore >= 90) {
      console.log('🌟 Your refactored application is in excellent condition!');
      console.log('✅ Phase 4: Comprehensive Testing - PASSED');
    } else if (results.overallScore >= 80) {
      console.log('👍 Your refactored application is performing well!');
      console.log('✅ Phase 4: Comprehensive Testing - PASSED with minor issues');
    } else {
      console.log('⚠️ Your application may need some attention.');
      console.log('⚠️ Phase 4: Comprehensive Testing - NEEDS ATTENTION');
    }
    
    console.log('\n🔧 For detailed testing and CSS failure simulation:');
    console.log('Navigate to /testing in your app for the full Phase 4 Testing Suite');
    
  }).catch(error => {
    console.error('❌ Phase 4 verification failed:', error);
  });
}

export { executeCompleteVerification, runQuickTest };
