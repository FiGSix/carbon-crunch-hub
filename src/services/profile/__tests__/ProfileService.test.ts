
import { ProfileService } from '../ProfileService';
import { UserProfile } from '@/contexts/auth/types';
import { supabase } from '@/integrations/supabase/client';

// Mock Supabase
jest.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: jest.fn()
  }
}));

const mockSupabase = supabase as jest.Mocked<typeof supabase>;

describe('ProfileService', () => {
  let profileService: ProfileService;
  let mockCache: any;

  beforeEach(() => {
    mockCache = {
      get: jest.fn(),
      set: jest.fn(),
      invalidate: jest.fn()
    };
    
    profileService = new ProfileService({ cache: mockCache });
    
    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('getProfile', () => {
    const mockUserId = 'user-123';
    const mockProfileData = {
      id: mockUserId,
      first_name: 'John',
      last_name: 'Doe',
      email: 'john@example.com',
      phone: '+1234567890',
      company_name: 'Test Company',
      company_logo_url: null,
      avatar_url: null,
      role: 'client',
      terms_accepted_at: '2023-01-01T00:00:00Z',
      created_at: '2023-01-01T00:00:00Z',
      intro_video_viewed: false,
      intro_video_viewed_at: null
    };

    it('should return cached profile when available and not forcing refresh', async () => {
      const cachedProfile = { id: mockUserId, first_name: 'Cached' } as UserProfile;
      mockCache.get.mockReturnValue(cachedProfile);

      const result = await profileService.getProfile(mockUserId, false);

      expect(result).toEqual(cachedProfile);
      expect(mockCache.get).toHaveBeenCalledWith(`profile_${mockUserId}`);
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });

    it('should fetch from database when cache miss', async () => {
      mockCache.get.mockReturnValue(null);
      
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockProfileData, error: null })
      };
      
      mockSupabase.from.mockReturnValue(mockQuery as any);

      const result = await profileService.getProfile(mockUserId, false);

      expect(result).toMatchObject({
        id: mockUserId,
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com'
      });
      
      expect(mockCache.set).toHaveBeenCalledWith(
        `profile_${mockUserId}`,
        expect.any(Object),
        expect.any(Number)
      );
    });

    it('should force refresh when requested', async () => {
      const cachedProfile = { id: mockUserId, first_name: 'Cached' } as UserProfile;
      mockCache.get.mockReturnValue(cachedProfile);
      
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockProfileData, error: null })
      };
      
      mockSupabase.from.mockReturnValue(mockQuery as any);

      const result = await profileService.getProfile(mockUserId, true);

      expect(mockSupabase.from).toHaveBeenCalled();
      expect(result).toMatchObject({
        first_name: 'John',
        last_name: 'Doe'
      });
    });

    it('should handle database errors gracefully', async () => {
      mockCache.get.mockReturnValue(null);
      
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: new Error('Database error') })
      };
      
      mockSupabase.from.mockReturnValue(mockQuery as any);

      const result = await profileService.getProfile(mockUserId, false);

      expect(result).toBeNull();
      expect(mockCache.set).not.toHaveBeenCalled();
    });

    it('should return null when no profile data found', async () => {
      mockCache.get.mockReturnValue(null);
      
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null })
      };
      
      mockSupabase.from.mockReturnValue(mockQuery as any);

      const result = await profileService.getProfile(mockUserId, false);

      expect(result).toBeNull();
    });
  });

  describe('updateProfile', () => {
    const mockUserId = 'user-123';
    const mockUpdates = { first_name: 'Jane', last_name: 'Smith' };

    it('should successfully update profile', async () => {
      const mockQuery = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null })
      };
      
      mockSupabase.from.mockReturnValue(mockQuery as any);

      const result = await profileService.updateProfile(mockUserId, mockUpdates);

      expect(result).toEqual({ success: true });
      expect(mockQuery.update).toHaveBeenCalledWith(mockUpdates);
      expect(mockQuery.eq).toHaveBeenCalledWith('id', mockUserId);
      expect(mockCache.invalidate).toHaveBeenCalledWith(`profile_${mockUserId}`);
    });

    it('should handle update errors', async () => {
      const mockError = new Error('Update failed');
      const mockQuery = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: mockError })
      };
      
      mockSupabase.from.mockReturnValue(mockQuery as any);

      const result = await profileService.updateProfile(mockUserId, mockUpdates);

      expect(result).toEqual({ success: false, error: 'Update failed' });
      expect(mockCache.invalidate).not.toHaveBeenCalled();
    });
  });
});
