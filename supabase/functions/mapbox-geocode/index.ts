import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ReverseGeocodeRequest {
  operation: 'reverse' | 'forward' | 'get_token';
  lat?: number;
  lng?: number;
  query?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { operation, lat, lng, query }: ReverseGeocodeRequest = await req.json();
    const mapboxToken = Deno.env.get('MAPBOX_ACCESS_TOKEN');

    if (!mapboxToken) {
      throw new Error('Mapbox token not configured');
    }

    // Return token for client-side map initialization
    if (operation === 'get_token') {
      return new Response(
        JSON.stringify({ token: mapboxToken }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Reverse geocoding: coordinates to address
    if (operation === 'reverse' && lat !== undefined && lng !== undefined) {
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${mapboxToken}&types=address,place,locality`;
      
      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(`Mapbox API error: ${data.message || 'Unknown error'}`);
      }

      const address = data.features?.[0]?.place_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;

      return new Response(
        JSON.stringify({ address, features: data.features }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Forward geocoding: address/query to coordinates
    if (operation === 'forward' && query) {
      // Check if query looks like coordinates (e.g., "-25.7461, 28.1881")
      const coordMatch = query.match(/^(-?\d+\.?\d*),\s*(-?\d+\.?\d*)$/);
      if (coordMatch) {
        const parsedLng = parseFloat(coordMatch[2]);
        const parsedLat = parseFloat(coordMatch[1]);
        
        // Validate coordinates are in South Africa's general region
        if (parsedLat >= -35 && parsedLat <= -22 && parsedLng >= 16 && parsedLng <= 33) {
          // Do reverse geocode to get address name
          const reverseUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${parsedLng},${parsedLat}.json?access_token=${mapboxToken}&types=address,place,locality`;
          const reverseResponse = await fetch(reverseUrl);
          const reverseData = await reverseResponse.json();
          
          return new Response(
            JSON.stringify({
              lat: parsedLat,
              lng: parsedLng,
              address: reverseData.features?.[0]?.place_name || query
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      // Regular address search
      const encodedQuery = encodeURIComponent(query);
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedQuery}.json?access_token=${mapboxToken}&country=ZA&types=address,place,locality`;
      
      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(`Mapbox API error: ${data.message || 'Unknown error'}`);
      }

      const firstResult = data.features?.[0];
      if (!firstResult) {
        return new Response(
          JSON.stringify({ error: 'No results found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({
          lat: firstResult.center[1],
          lng: firstResult.center[0],
          address: firstResult.place_name
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    throw new Error('Invalid request parameters');

  } catch (error) {
    console.error('Geocoding error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
