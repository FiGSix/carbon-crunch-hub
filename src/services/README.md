
# Services Architecture

This directory contains the refactored service layer of the application, broken down into focused, testable modules with clear separation of concerns.

## Architecture Overview

### Core Services
- **CacheService**: In-memory caching with TTL support
- **ProfileService**: User profile management operations
- **ProposalService**: Proposal CRUD operations and transformations
- **DashboardService**: Dashboard data aggregation and calculations
- **DataService**: Main orchestrator that coordinates other services

### Key Principles
1. **Dependency Injection**: Services receive dependencies through constructors
2. **Single Responsibility**: Each service has a focused purpose
3. **Interface Segregation**: Services implement specific interfaces
4. **Testability**: All services are unit tested with mocks
5. **Caching Strategy**: Intelligent caching with configurable TTL

## Service Structure

```
services/
├── cache/
│   ├── CacheService.ts          # Core caching implementation
│   ├── types.ts                 # Cache interfaces and constants
│   └── __tests__/
│       └── CacheService.test.ts
├── profile/
│   ├── ProfileService.ts        # Profile operations
│   ├── types.ts                 # Profile interfaces
│   └── __tests__/
│       └── ProfileService.test.ts
├── proposal/
│   ├── ProposalService.ts       # Proposal operations
│   ├── ProposalTransformer.ts   # Data transformation logic
│   ├── types.ts                 # Proposal interfaces
│   └── __tests__/
│       ├── ProposalService.test.ts
│       └── ProposalTransformer.test.ts
├── dashboard/
│   ├── DashboardService.ts      # Dashboard data aggregation
│   ├── DashboardCalculator.ts   # Calculation logic
│   ├── types.ts                 # Dashboard interfaces
│   └── __tests__/
│       ├── DashboardService.test.ts
│       └── DashboardCalculator.test.ts
├── dataService.ts               # Main service orchestrator
└── __tests__/
    ├── dataService.test.ts
    ├── setup.ts                 # Test configuration
    └── runTests.ts              # Test runner utility
```

## Usage Examples

### Basic Service Usage

```typescript
// Using DataService (recommended for most cases)
import { DataService } from '@/services/dataService';

// Get user profile
const profile = await DataService.getProfile(userId);

// Get proposals
const proposals = await DataService.getProposalsWithRelations(userId, userRole);

// Get dashboard data
const dashboardData = await DataService.getDashboardData(userId, userRole);
```

### Direct Service Usage (for advanced cases)

```typescript
import { ProfileService } from '@/services/profile/ProfileService';
import { cacheService } from '@/services/cache/CacheService';

// Create service with dependencies
const profileService = new ProfileService({ cache: cacheService });

// Use service directly
const profile = await profileService.getProfile(userId, true); // force refresh
```

### Cache Management

```typescript
import { DataService } from '@/services/dataService';

// Clear specific cache patterns
DataService.invalidateCache('profile_');
DataService.invalidateCache('proposals_');

// Clear all cache
DataService.clearCache();
```

## Testing

### Running Tests

```bash
# Run all service tests
npm test -- --testPathPattern=src/services

# Run tests with coverage
npm test -- --coverage --testPathPattern=src/services

# Run specific service tests
npm test -- CacheService.test.ts
npm test -- ProfileService.test.ts
```

### Test Structure

Each service has comprehensive unit tests covering:
- Happy path scenarios
- Error handling
- Edge cases
- Cache behavior
- Dependency injection

### Test Examples

```typescript
// Example test structure
describe('ProfileService', () => {
  let profileService: ProfileService;
  let mockCache: jest.Mocked<CacheOperations>;

  beforeEach(() => {
    mockCache = {
      get: jest.fn(),
      set: jest.fn(),
      invalidate: jest.fn(),
      clear: jest.fn()
    };
    
    profileService = new ProfileService({ cache: mockCache });
  });

  it('should return cached profile when available', async () => {
    // Test implementation
  });
});
```

## Caching Strategy

### Cache Keys
- Profiles: `profile_{userId}`
- Proposals: `proposals_{userId}_{userRole}`
- Dashboard: `dashboard_{userId}_{userRole}`

### TTL Configuration
- **Short**: 2 minutes (dashboard data)
- **Medium**: 10 minutes (profiles)
- **Default**: 5 minutes (general purpose)
- **Long**: 30 minutes (rarely changing data)

### Cache Invalidation
- **Profile updates**: Invalidate `profile_{userId}`
- **Proposal updates**: Invalidate `proposals_*`
- **Manual**: Use `DataService.invalidateCache(pattern)`

## Performance Considerations

1. **Batch Operations**: Use `batchUpdateProposals` for multiple updates
2. **Cache First**: Services check cache before database queries
3. **Selective Refresh**: Use `forceRefresh` parameter when needed
4. **Memory Management**: Cache has automatic expiration

## Error Handling

Services implement consistent error handling:
- Database errors are logged but don't crash the application
- Failed operations return appropriate fallback values
- Error messages are descriptive and actionable

## Migration Guide

### From Old DataService

```typescript
// Old way
import { DataService } from '@/services/dataService';
const profile = await DataService.getProfile(userId);

// New way (same interface, better implementation)
import { DataService } from '@/services/dataService';
const profile = await DataService.getProfile(userId);
```

The public API remains the same, but the internal implementation is now more modular and testable.

## Contributing

When adding new services:

1. Create a new service directory with `types.ts` and the service implementation
2. Implement the service interface and use dependency injection
3. Add comprehensive unit tests
4. Update this README with usage examples
5. Export the service through the main `dataService.ts` if needed

## Performance Monitoring

Monitor service performance using:

```typescript
import { usePerformanceOptimization } from '@/hooks/usePerformanceOptimization';

const { trackApiCall } = usePerformanceOptimization();

// Track service calls
trackApiCall.start();
const result = await DataService.getProfile(userId);
trackApiCall.end(result !== null); // true if cache hit
```
