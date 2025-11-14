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
  const [containerReady, setContainerReady] = useState(false);
  const [mapReady, setMapReady] = useState(false);

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
          console.log('Mapbox token fetched successfully');
          setMapboxToken(data.token);
        } else {
          console.error('Mapbox token is empty or missing');
          toast({
            title: "Configuration Error",
            description: "Map token is missing. Please contact support.",
            variant: "destructive"
          });
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

  // Watch for container dimensions using ResizeObserver
  useEffect(() => {
    if (!mapContainer.current) return;
    
    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      const rect = entry.contentRect;
      console.log('Container dimensions:', rect.width, 'x', rect.height);
      if (rect.width > 0 && rect.height > 0) {
        setContainerReady(true);
      }
    });
    
    resizeObserver.observe(mapContainer.current);
    return () => resizeObserver.disconnect();
  }, []);

  // Initialize map only when container is ready and token is available
  useEffect(() => {
    if (!mapContainer.current || !mapboxToken || !containerReady) {
      console.log('Waiting for dependencies:', { 
        hasContainer: !!mapContainer.current, 
        hasToken: !!mapboxToken, 
        containerReady 
      });
      return;
    }

    // Double-check container has dimensions
    const rect = mapContainer.current.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      console.warn('Container not ready yet, dimensions:', rect);
      return;
    }

    // Check WebGL support
    if (!mapboxgl.supported()) {
      console.error('WebGL not supported by browser');
      toast({
        title: "Browser Not Supported",
        description: "Your browser does not support WebGL, which is required for the map.",
        variant: "destructive"
      });
      return;
    }

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

      // Add error handler
      map.current.on('error', (e) => {
        console.error('Mapbox GL error:', e.error);
        toast({
          title: "Map Error",
          description: "An error occurred while loading the map. Please refresh.",
          variant: "destructive"
        });
      });

      console.log('Mapbox map initialized successfully');

      // Wait for map to fully load before adding interactive features
      map.current.on('load', () => {
        if (!map.current) return;

        console.log('Map loaded, adding controls and interactions');

        // Force resize to ensure proper dimensions
        setTimeout(() => {
          map.current?.resize();
          setMapReady(true);
        }, 100);

        // Add navigation controls
        map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
        
        // Add geolocate control
        map.current.addControl(new mapboxgl.GeolocateControl({
          positionOptions: { enableHighAccuracy: true },
          trackUserLocation: true
        }), 'top-right');

        // Add click handler with error boundary
        map.current.on('click', async (e) => {
          try {
            if (!map.current) return;
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
                try {
                  const lngLat = marker.current!.getLngLat();
                  setSelectedLocation({ lat: lngLat.lat, lng: lngLat.lng });
                  await performReverseGeocode(lngLat.lat, lngLat.lng);
                } catch (error) {
                  console.error('Marker drag handler error:', error);
                }
              });
            }

            await performReverseGeocode(lat, lng);
          } catch (error) {
            console.error('Map click handler error:', error);
          }
        });

        // Add initial marker if coordinates provided
        if (initialLat && initialLng && map.current) {
          try {
            marker.current = new mapboxgl.Marker({ color: '#10b981', draggable: true })
              .setLngLat([initialLng, initialLat])
              .addTo(map.current);

            marker.current.on('dragend', async () => {
              try {
                const lngLat = marker.current!.getLngLat();
                setSelectedLocation({ lat: lngLat.lat, lng: lngLat.lng });
                await performReverseGeocode(lngLat.lat, lngLat.lng);
              } catch (error) {
                console.error('Marker drag handler error:', error);
              }
            });
          } catch (error) {
            console.error('Initial marker creation error:', error);
          }
        }
      });
    } catch (error) {
      console.error('Failed to initialize Mapbox map:', error);
      toast({
        title: "Map Initialization Failed",
        description: "Could not load the interactive map. Please try again later.",
        variant: "destructive"
      });
      return;
    }

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
      setMapReady(false);
    };
  }, [mapboxToken, containerReady, initialLat, initialLng, toast]);

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
        try {
          map.current.flyTo({ center: [result.lng, result.lat], zoom: 14 });
          
          if (marker.current) {
            marker.current.setLngLat([result.lng, result.lat]);
          } else {
            marker.current = new mapboxgl.Marker({ color: '#10b981', draggable: true })
              .setLngLat([result.lng, result.lat])
              .addTo(map.current);

            marker.current.on('dragend', async () => {
              try {
                const lngLat = marker.current!.getLngLat();
                setSelectedLocation({ lat: lngLat.lat, lng: lngLat.lng });
                await performReverseGeocode(lngLat.lat, lngLat.lng);
              } catch (error) {
                console.error('Marker drag handler error:', error);
              }
            });
          }
        } catch (error) {
          console.error('Search flyTo error:', error);
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
        className="relative w-full h-[400px] rounded-lg border border-border"
      >
        {!mapReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/50 backdrop-blur-sm rounded-lg z-10">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Loading map...</p>
            </div>
          </div>
        )}
      </div>

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