import axios from "axios";

// ✅ Nominatim Geocoding (forward & reverse)
export const getGeoCode = async (req, res) => {
  const { text, lat, lon } = req.query;

  try {
    let resp;

    if (text) {
      // Forward Geocoding
      console.log("🌍 Forward geocode request for:", text);

      resp = await axios.get("https://nominatim.openstreetmap.org/search", {
        params: { q: text, format: "json", limit: 1 },
        headers: { "User-Agent": "SyncFleet/1.0 shaikhmdsaad92@gmail.com" },
      });

      if (resp.data.length > 0) {
        const result = resp.data[0];
        return res.json({
          lat: parseFloat(result.lat),
          lng: parseFloat(result.lon),
          displayName: result.display_name,
        });
      }

      return res.status(404).json({ message: "Location not found" });
    } else if (lat && lon) {
      // Reverse Geocoding
      console.log("🌍 Reverse geocode request for:", lat, lon);

      resp = await axios.get("https://nominatim.openstreetmap.org/reverse", {
        params: { lat, lon, format: "json" },
        headers: { "User-Agent": "SyncFleet/1.0 shaikhmdsaad92@gmail.com" },
      });

      if (resp.data) {
        return res.json({
          lat: parseFloat(resp.data.lat),
          lng: parseFloat(resp.data.lon),
          displayName: resp.data.display_name,
        });
      }

      return res.status(404).json({ message: "Location not found" });
    } else {
      return res.status(400).json({ message: "Either 'text' or 'lat/lon' must be provided" });
    }
  } catch (error) {
    console.error("❌ Nominatim error:", error.message);
    return res.status(500).json({ message: "Geocode request failed" });
  }
};

// OSRM Directions
export const getDirections = async (req, res) => {
  const { startLat, startLng, endLat, endLng } = req.query;

  if (!startLat || !startLng || !endLat || !endLng) {
    return res.status(400).json({ message: "Start and end coordinates are required" });
  }

  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`;
    const resp = await axios.get(url);

    if (!resp.data.routes || resp.data.routes.length === 0) {
      return res.status(404).json({ message: "No route found" });
    }

    // Send the GeoJSON coordinates for Leaflet Polyline
    res.json({
      route: resp.data.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng]),
      distance: resp.data.routes[0].distance, // meters
      duration: resp.data.routes[0].duration, // seconds
    });
  } catch (error) {
    console.error("❌ OSRM Directions error:", error.message);
    res.status(500).json({ message: "Directions request failed" });
  }
};
