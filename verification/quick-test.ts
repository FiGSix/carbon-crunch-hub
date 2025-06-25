
/**
 * Quick Test Runner for Immediate Feedback
 * Runs essential tests for rapid verification
 */

import { testRunner } from './test-runner';
import { verificationRunner } from './verification-runner';

async function runQuickTest() {
  console.log('⚡ QUICK APPLICATION HEALTH CHECK');
  console.log('─'.repeat(40));
  
  try {
    // Run quick health check
    const healthCheck = await verificationRunner.quickHealthCheck();
    
    console.log(`\n🎯 HEALTH CHECK RESULTS:`);
    console.log(`Status: ${healthCheck.status}`);
    console.log(`Score: ${healthCheck.score.toFixed(1)}/100`);
    
    if (healthCheck.critical.length > 0) {
      console.log('\n🚨 CRITICAL ISSUES:');
      healthCheck.critical.forEach(issue => {
        console.log(`   • ${issue}`);
      });
    }
    
    // Quick calculation test
    console.log('\n🧮 TESTING CORE CALCULATIONS...');
    try {
      const { UnifiedCarbonService } = await import('@/services/calculations/UnifiedCarbonService');
      
      const testSize = 100;
      const energy = UnifiedCarbonService.calculateAnnualEnergy(testSize);
      const credits = UnifiedCarbonService.calculateCarbonCredits(testSize);
      
      console.log(`✅ Core calculations working: ${testSize}kWp → ${energy.toLocaleString()}kWh → ${credits.toFixed(2)}t CO₂`);
      
    } catch (error) {
      console.log(`❌ Core calculation error: ${error}`);
    }
    
    // Quick cache test
    console.log('\n💾 TESTING CACHE SYSTEM...');
    try {
      const { optimizedCache } = await import('@/services/cache/OptimizedCacheService');
      
      optimizedCache.set('test-key', 'test-value');
      const retrieved = optimizedCache.get('test-key');
      
      if (retrieved === 'test-value') {
        console.log('✅ Cache system working correctly');
      } else {
        console.log('❌ Cache system not working properly');
      }
      
    } catch (error) {
      console.log(`❌ Cache system error: ${error}`);
    }
    
    return healthCheck;
    
  } catch (error) {
    console.error('❌ Quick test failed:', error);
    return { score: 0, critical: ['Quick test failed'], status: 'Error' };
  }
}

// Execute immediately when this file is run
if (typeof window !== 'undefined') {
  runQuickTest().catch(console.error);
}

export { runQuickTest };
