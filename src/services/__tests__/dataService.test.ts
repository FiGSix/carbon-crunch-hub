
import { DataService } from '../dataService';
import { ProfileService } from '../profile/ProfileService';
import { ProposalService } from '../proposal/ProposalService';
import { DashboardService } from '../dashboard/DashboardService';

// Mock the service modules
jest.mock('../profile/ProfileService');
jest.mock('../proposal/ProposalService');
jest.mock('../dashboard/DashboardService');

const MockedProfileService = ProfileService as jest.MockedClass<typeof ProfileService>;
const MockedProposalService = ProposalService as jest.MockedClass<typeof ProposalService>;
const MockedDashboardService = DashboardService as jest.MockedClass<typeof DashboardService>;

describe('DataService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getProfile', () => {
    it('should delegate to ProfileService', async () => {
      const mockProfile = { id: '123', first_name: 'John' };
      const mockGetProfile = jest.fn().mockResolvedValue(mockProfile);
      MockedProfileService.prototype.getProfile = mockGetProfile;

      const result = await DataService.getProfile('123', false);

      expect(mockGetProfile).toHaveBeenCalledWith('123', false);
      expect(result).toEqual(mockProfile);
    });
  });

  describe('updateProfile', () => {
    it('should delegate to ProfileService', async () => {
      const mockResult = { success: true };
      const mockUpdateProfile = jest.fn().mockResolvedValue(mockResult);
      MockedProfileService.prototype.updateProfile = mockUpdateProfile;

      const updates = { first_name: 'Jane' };
      const result = await DataService.updateProfile('123', updates);

      expect(mockUpdateProfile).toHaveBeenCalledWith('123', updates);
      expect(result).toEqual(mockResult);
    });
  });

  describe('getProposalsWithRelations', () => {
    it('should delegate to ProposalService', async () => {
      const mockProposals = [{ id: '1', title: 'Test' }];
      const mockGetProposals = jest.fn().mockResolvedValue(mockProposals);
      MockedProposalService.prototype.getProposalsWithRelations = mockGetProposals;

      const result = await DataService.getProposalsWithRelations('123', 'client', false);

      expect(mockGetProposals).toHaveBeenCalledWith('123', 'client', false);
      expect(result).toEqual(mockProposals);
    });
  });

  describe('batchUpdateProposals', () => {
    it('should delegate to ProposalService', async () => {
      const mockResult = { success: true, errors: [] };
      const mockBatchUpdate = jest.fn().mockResolvedValue(mockResult);
      MockedProposalService.prototype.batchUpdateProposals = mockBatchUpdate;

      const updates = [{ id: '1', data: { status: 'approved' } }];
      const result = await DataService.batchUpdateProposals(updates);

      expect(mockBatchUpdate).toHaveBeenCalledWith(updates);
      expect(result).toEqual(mockResult);
    });
  });

  describe('getDashboardData', () => {
    it('should delegate to DashboardService', async () => {
      const mockDashboardData = {
        proposals: [],
        portfolioSize: 0,
        totalRevenue: 0,
        co2Offset: 0
      };
      const mockGetDashboardData = jest.fn().mockResolvedValue(mockDashboardData);
      MockedDashboardService.prototype.getDashboardData = mockGetDashboardData;

      const result = await DataService.getDashboardData('123', 'client');

      expect(mockGetDashboardData).toHaveBeenCalledWith('123', 'client');
      expect(result).toEqual(mockDashboardData);
    });
  });
});
