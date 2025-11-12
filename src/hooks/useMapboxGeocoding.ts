import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ReverseGeocodeResult {
  address: string;
  success: boolean;
  error?: string;
}

export function useMapboxGeocoding() {
  const [loading, setLoading] = useState(false);

  const reverseGeocode = async (lat: number, lng: number): Promise<ReverseGeocodeResult> => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('mapbox-geocode', {
        body: { lat, lng, operation: 'reverse' }
      });

      if (error) throw error;

      return {
        success: true,
        address: data.address || `${lat.toFixed(6)}, ${lng.toFixed(6)}`
      };
    } catch (error) {
      console.error('Reverse geocoding failed:', error);
      return {
        success: false,
        address: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
        error: error instanceof Error ? error.message : 'Failed to geocode location'
      };
    } finally {
      setLoading(false);
    }
  };

  const searchAddress = async (query: string): Promise<{ lat: number; lng: number; address: string } | null> => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('mapbox-geocode', {
        body: { query, operation: 'forward' }
      });

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Forward geocoding failed:', error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { reverseGeocode, searchAddress, loading };
}
