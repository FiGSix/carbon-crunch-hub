
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function useAgentIntroVideo() {
  const { profile, userRole, refreshUser } = useAuth();
  const { toast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Check if we should show the intro video modal
  useEffect(() => {
    if (userRole === 'agent' && profile && !profile.intro_video_viewed) {
      setIsModalOpen(true);
    }
  }, [userRole, profile]);

  const markVideoAsViewed = async () => {
    if (!profile?.id) return false;

    setIsUpdating(true);
    
    try {
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
      setIsModalOpen(false);
      
      toast({
        title: "Welcome to Crunch Carbon!",
        description: "You're all set to start creating proposals.",
      });

      return true;
    } catch (error) {
      console.error('Error marking video as viewed:', error);
      toast({
        title: "Error",
        description: "Failed to save video progress. Please try again.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsUpdating(false);
    }
  };

  const skipVideo = () => {
    markVideoAsViewed();
  };

  return {
    isModalOpen,
    isUpdating,
    markVideoAsViewed,
    skipVideo,
    closeModal: () => setIsModalOpen(false)
  };
}
