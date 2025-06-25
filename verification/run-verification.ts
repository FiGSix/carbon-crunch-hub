
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
  console.log('└─ runQuickTest() - Quick health check');
  console.log('');
  console.log('🚀 Starting complete verification automatically...');
  console.log('');
  
  // Auto-execute complete verification as requested
  executeCompleteVerification().then(results => {
    console.log('\n🎉 VERIFICATION COMPLETE!');
    console.log(`Final Score: ${results.overallScore.toFixed(1)}/100`);
    
    if (results.overallScore >= 90) {
      console.log('🌟 Your refactored application is in excellent condition!');
    } else if (results.overallScore >= 80) {
      console.log('👍 Your refactored application is performing well!');
    } else {
      console.log('⚠️ Your application may need some attention.');
    }
    
  }).catch(error => {
    console.error('❌ Verification failed:', error);
  });
}

export { executeCompleteVerification, runQuickTest };
