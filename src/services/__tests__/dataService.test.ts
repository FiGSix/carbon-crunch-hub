
import { DataService } from '../dataService';
import { UnifiedDataService } from '../unified/UnifiedDataService';

// Mock the UnifiedDataService
jest.mock('../unified/UnifiedDataService');

const MockedUnifiedDataService = UnifiedDataService as jest.MockedClass<typeof UnifiedDataService>;

describe('DataService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getProfile', () => {
    it('should delegate to UnifiedDataService', async () => {
      const mockProfile = { id: '123', first_name: 'John', email: 'john@example.com', role: 'client' };
      MockedUnifiedDataService.getProfile = jest.fn().mockResolvedValue(mockProfile);

      const result = await DataService.getProfile('123', false);

      expect(MockedUnifiedDataService.getProfile).toHaveBeenCalledWith('123', false);
      expect(result).toEqual(mockProfile);
    });
  });

  describe('updateProfile', () => {
    it('should delegate to UnifiedDataService', async () => {
      const mockResult = { success: true };
      MockedUnifiedDataService.updateProfile = jest.fn().mockResolvedValue(mockResult);

      const updates = { first_name: 'Jane' };
      const result = await DataService.updateProfile('123', updates);

      expect(MockedUnifiedDataService.updateProfile).toHaveBeenCalledWith('123', updates);
      expect(result).toEqual(mockResult);
    });
  });

  describe('getProposalsWithRelations', () => {
    it('should delegate to UnifiedDataService', async () => {
      const mockProposals = [{ id: '1', title: 'Test', client: 'John Doe' }];
      MockedUnifiedDataService.getProposals = jest.fn().mockResolvedValue(mockProposals);

      const result = await DataService.getProposalsWithRelations('123', 'client', false);

      expect(MockedUnifiedDataService.getProposals).toHaveBeenCalledWith('123', 'client', false);
      expect(result).toEqual(mockProposals);
    });
  });

  describe('getDashboardData', () => {
    it('should delegate to UnifiedDataService', async () => {
      const mockDashboardData = {
        proposals: [],
        portfolioSize: 0,
        totalRevenue: 0,
        co2Offset: 0
      };
      MockedUnifiedDataService.getDashboardData = jest.fn().mockResolvedValue(mockDashboardData);

      const result = await DataService.getDashboardData('123', 'client');

      expect(MockedUnifiedDataService.getDashboardData).toHaveBeenCalledWith('123', 'client');
      expect(result).toEqual(mockDashboardData);
    });
  });
});
