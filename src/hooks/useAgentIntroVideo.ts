
import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/auth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Local storage key for tracking video view status
const INTRO_VIDEO_STORAGE_KEY = 'agent_intro_video_viewed';
const INTRO_VIDEO_SESSION_KEY = 'agent_intro_video_session_viewed';

export function useAgentIntroVideo() {
  const { profile, userRole, refreshUser } = useAuth();
  const { toast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const hasTriggeredRef = useRef(false);
  const updateInProgressRef = useRef(false);

  // Check local storage for cached status
  const getLocalVideoStatus = useCallback(() => {
    try {
      const localStatus = localStorage.getItem(INTRO_VIDEO_STORAGE_KEY);
      const sessionStatus = sessionStorage.getItem(INTRO_VIDEO_SESSION_KEY);
      return localStatus === 'true' || sessionStatus === 'true';
    } catch {
      return false;
    }
  }, []);

  // Set local storage status
  const setLocalVideoStatus = useCallback((viewed: boolean) => {
    try {
      localStorage.setItem(INTRO_VIDEO_STORAGE_KEY, viewed.toString());
      sessionStorage.setItem(INTRO_VIDEO_SESSION_KEY, viewed.toString());
    } catch {
      // Silently fail if localStorage is not available
    }
  }, []);

  // Determine if modal should be shown with multi-layer protection
  const shouldShowModal = useCallback(() => {
    // Layer 1: Check if already triggered in this session
    if (hasTriggeredRef.current) {
      return false;
    }

    // Layer 2: Check user role
    if (userRole !== 'agent') {
      return false;
    }

    // Layer 3: Check if profile exists
    if (!profile?.id) {
      return false;
    }

    // Layer 4: Check local storage cache first (fastest check)
    if (getLocalVideoStatus()) {
      return false;
    }

    // Layer 5: Check database value
    if (profile.intro_video_viewed) {
      // Sync local storage with database value
      setLocalVideoStatus(true);
      return false;
    }

    // Layer 6: Check if update is in progress
    if (updateInProgressRef.current) {
      return false;
    }

    return true;
  }, [userRole, profile, getLocalVideoStatus, setLocalVideoStatus]);

  // Check if we should show the intro video modal with debouncing
  useEffect(() => {
    if (shouldShowModal()) {
      // Debounce to prevent rapid-fire triggers
      const timer = setTimeout(() => {
        if (shouldShowModal()) {
          hasTriggeredRef.current = true;
          setIsModalOpen(true);
        }
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [shouldShowModal]);

  const markVideoAsViewed = useCallback(async () => {
    // Prevent multiple simultaneous calls
    if (!profile?.id || updateInProgressRef.current) {
      return false;
    }

    // Immediately update local cache to prevent re-triggering
    setLocalVideoStatus(true);
    hasTriggeredRef.current = true;
    updateInProgressRef.current = true;
    setIsUpdating(true);
    setIsModalOpen(false); // Close modal immediately for better UX
    
    try {
      // Check if already updated in database (race condition protection)
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('intro_video_viewed')
        .eq('id', profile.id)
        .single();

      if (currentProfile?.intro_video_viewed) {
        // Already marked as viewed, just sync local state
        return true;
      }

      // Update database
      const { error } = await supabase
        .from('profiles')
        .update({
          intro_video_viewed: true,
          intro_video_viewed_at: new Date().toISOString()
        })
        .eq('id', profile.id);

      if (error) {
        throw error;
      }

      // Refresh user profile to get updated data
      await refreshUser();
      
      toast({
        title: "Welcome to Crunch Carbon!",
        description: "You're all set to start creating proposals.",
      });

      return true;
    } catch (error) {
      console.error('Error marking video as viewed:', error);
      
      // Reset local cache on error
      setLocalVideoStatus(false);
      hasTriggeredRef.current = false;
      
      toast({
        title: "Error",
        description: "Failed to save video progress. Please try again.",
        variant: "destructive",
      });
      return false;
    } finally {
      updateInProgressRef.current = false;
      setIsUpdating(false);
    }
  }, [profile?.id, setLocalVideoStatus, refreshUser, toast]);

  const skipVideo = useCallback(() => {
    markVideoAsViewed();
  }, [markVideoAsViewed]);

  const closeModal = useCallback(() => {
    // Prevent closing if update is in progress
    if (!updateInProgressRef.current) {
      setIsModalOpen(false);
      hasTriggeredRef.current = true; // Prevent re-opening
    }
  }, []);

  return {
    isModalOpen,
    isUpdating,
    markVideoAsViewed,
    skipVideo,
    closeModal
  };
}
