import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Navigation, Search } from 'lucide-react';
import { useMapboxGeocoding } from '@/hooks/useMapboxGeocoding';
import { useToast } from '@/hooks/use-toast';

interface MapAddressPickerProps {
  onLocationSelect: (lat: number, lng: number, address: string) => void;
  initialLat?: number;
  initialLng?: number;
}

export function MapAddressPicker({ onLocationSelect, initialLat, initialLng }: MapAddressPickerProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const marker = useRef<mapboxgl.Marker | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(
    initialLat && initialLng ? { lat: initialLat, lng: initialLng } : null
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [generatedAddress, setGeneratedAddress] = useState('');
  const { reverseGeocode, searchAddress, loading } = useMapboxGeocoding();
  const { toast } = useToast();
  const [mapboxToken, setMapboxToken] = useState<string>('');

  // Fetch Mapbox token from edge function
  useEffect(() => {
    const fetchToken = async () => {
      try {
        const { supabase } = await import('@/integrations/supabase/client');
        const { data, error } = await supabase.functions.invoke('mapbox-geocode', {
          body: { operation: 'get_token' }
        });
        
        if (error) throw error;
        if (data?.token) {
          setMapboxToken(data.token);
        }
      } catch (error) {
        console.error('Failed to fetch Mapbox token:', error);
        toast({
          title: "Configuration Error",
          description: "Unable to load map. Please contact support.",
          variant: "destructive"
        });
      }
    };
    fetchToken();
  }, [toast]);

  useEffect(() => {
    if (!mapContainer.current || !mapboxToken) return;

    try {
      mapboxgl.accessToken = mapboxToken;

      const center: [number, number] = initialLat && initialLng 
        ? [initialLng, initialLat]
        : [24.9916, -28.4793]; // Center of South Africa

      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/satellite-streets-v12',
        center,
        zoom: initialLat && initialLng ? 14 : 5,
      });
    } catch (error) {
      console.error('Failed to initialize Mapbox map:', error);
      toast({
        title: "Map Error",
        description: "Failed to load the map. Please try again or contact support.",
        variant: "destructive"
      });
      return;
    }

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
    map.current.addControl(new mapboxgl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: true
    }), 'top-right');

    // Add click handler
    map.current.on('click', async (e) => {
      const { lng, lat } = e.lngLat;
      setSelectedLocation({ lat, lng });

      // Update or create marker
      if (marker.current) {
        marker.current.setLngLat([lng, lat]);
      } else {
        marker.current = new mapboxgl.Marker({ color: '#10b981', draggable: true })
          .setLngLat([lng, lat])
          .addTo(map.current!);

        marker.current.on('dragend', async () => {
          const lngLat = marker.current!.getLngLat();
          setSelectedLocation({ lat: lngLat.lat, lng: lngLat.lng });
          await performReverseGeocode(lngLat.lat, lngLat.lng);
        });
      }

      await performReverseGeocode(lat, lng);
    });

    // Add initial marker if coordinates provided
    if (initialLat && initialLng) {
      marker.current = new mapboxgl.Marker({ color: '#10b981', draggable: true })
        .setLngLat([initialLng, initialLat])
        .addTo(map.current);

      marker.current.on('dragend', async () => {
        const lngLat = marker.current!.getLngLat();
        setSelectedLocation({ lat: lngLat.lat, lng: lngLat.lng });
        await performReverseGeocode(lngLat.lat, lngLat.lng);
      });
    }

    return () => {
      map.current?.remove();
    };
  }, [mapboxToken, initialLat, initialLng]);

  const performReverseGeocode = async (lat: number, lng: number) => {
    const result = await reverseGeocode(lat, lng);
    if (result.success) {
      setGeneratedAddress(result.address);
    } else {
      setGeneratedAddress(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
      toast({
        title: "Geocoding Limited",
        description: "Could not find address name. Using coordinates.",
        variant: "default"
      });
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    const result = await searchAddress(searchQuery);
    if (result) {
      setSelectedLocation({ lat: result.lat, lng: result.lng });
      setGeneratedAddress(result.address);
      
      if (map.current) {
        map.current.flyTo({ center: [result.lng, result.lat], zoom: 14 });
        
        if (marker.current) {
          marker.current.setLngLat([result.lng, result.lat]);
        } else {
          marker.current = new mapboxgl.Marker({ color: '#10b981', draggable: true })
            .setLngLat([result.lng, result.lat])
            .addTo(map.current);

          marker.current.on('dragend', async () => {
            const lngLat = marker.current!.getLngLat();
            setSelectedLocation({ lat: lngLat.lat, lng: lngLat.lng });
            await performReverseGeocode(lngLat.lat, lngLat.lng);
          });
        }
      }
    } else {
      toast({
        title: "Location Not Found",
        description: "Could not find the specified location.",
        variant: "destructive"
      });
    }
  };

  const handleConfirm = () => {
    if (selectedLocation) {
      onLocationSelect(selectedLocation.lat, selectedLocation.lng, generatedAddress);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="flex-1">
          <Input
            placeholder="Search for a location or enter coordinates (e.g., -25.7461, 28.1881)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
        </div>
        <Button type="button" onClick={handleSearch} disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
        </Button>
      </div>

      <div 
        ref={mapContainer} 
        className="w-full h-[400px] rounded-lg border border-border"
      />

      {selectedLocation && (
        <div className="space-y-3 p-4 bg-muted rounded-lg">
          <div>
            <Label className="text-sm font-medium">Selected Coordinates</Label>
            <p className="text-sm text-muted-foreground">
              {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}
            </p>
          </div>
          
          {generatedAddress && (
            <div>
              <Label className="text-sm font-medium">Address</Label>
              <p className="text-sm text-muted-foreground">{generatedAddress}</p>
            </div>
          )}

          <Button 
            type="button" 
            onClick={handleConfirm}
            className="w-full"
          >
            <Navigation className="w-4 h-4 mr-2" />
            Use This Location
          </Button>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Click anywhere on the map to drop a pin, or search for a location. The marker can be dragged to adjust the position.
      </p>
    </div>
  );
}
