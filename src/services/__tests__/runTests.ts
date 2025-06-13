
// Simple test runner utility
import { execSync } from 'child_process';

const runTests = () => {
  try {
    console.log('🧪 Running service tests...\n');
    
    const result = execSync('npm test -- --coverage --testPathPattern=src/services', {
      stdio: 'inherit',
      encoding: 'utf8'
    });
    
    console.log('\n✅ All tests completed successfully!');
  } catch (error) {
    console.error('\n❌ Tests failed:', error);
    process.exit(1);
  }
};

if (require.main === module) {
  runTests();
}

export { runTests };
