import { useState, useRef, useEffect, useCallback } from 'react';

interface LatLng {
  lat: number;
  lng: number;
}

interface PolygonData {
  id: string;
  path: LatLng[];
  closed: boolean;
}

interface MapStepProps {
  mapsReady: boolean;
  address: string;
  lat: number;
  lng: number;
  onNext: (data: {
    polygons_json: string;
    footprint_sqft: number;
  }) => void;
  onBack: () => void;
}

export default function MapStep({ mapsReady, address, lat: centerLat, lng: centerLng, onNext, onBack }: MapStepProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const polylineRef = useRef<google.maps.Polyline | null>(null);
  const completedPolygonsRef = useRef<google.maps.Polygon[]>([]);

  const [mapReady, setMapReady] = useState(false);
  const [activePath, setActivePath] = useState<LatLng[]>([]);
  const [polygons, setPolygons] = useState<PolygonData[]>([]);
  const [footprintSqft, setFootprintSqft] = useState(0);
  const [error, setError] = useState('');

  // Initialize map when Maps API is ready
  useEffect(() => {
    if (!mapsReady || !mapRef.current || mapInstanceRef.current) return;

    try {
      const map = new google.maps.Map(mapRef.current, {
        center: { lat: centerLat, lng: centerLng },
        zoom: 20,
        mapTypeId: 'satellite',
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        zoomControl: true,
        gestureHandling: 'greedy',
        tilt: 0,
        styles: [
          { featureType: 'poi', stylers: [{ visibility: 'off' }] },
          { featureType: 'transit', stylers: [{ visibility: 'off' }] },
        ],
      });

      mapInstanceRef.current = map;
      setMapReady(true);
    } catch (e) {
      setError('Failed to initialize map: ' + (e as Error).message);
    }
  }, [mapsReady, centerLat, centerLng]);

  // Handle map click to add vertex
  const addVertex = useCallback((location: google.maps.LatLng) => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const latLng = { lat: location.lat(), lng: location.lng() };
    const newPath = [...activePath, latLng];
    setActivePath(newPath);

    // Add marker
    const marker = new google.maps.Marker({
      position: latLng,
      map,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 8,
        fillColor: '#f59e0b',
        fillOpacity: 1,
        strokeColor: '#fff',
        strokeWeight: 2,
      },
      label: {
        text: String(newPath.length),
        color: '#fff',
        fontSize: '11px',
        fontWeight: 'bold',
      },
    });
    markersRef.current.push(marker);

    // Update polyline
    if (polylineRef.current) polylineRef.current.setMap(null);
    const polyline = new google.maps.Polyline({
      path: newPath,
      strokeColor: '#f59e0b',
      strokeOpacity: 0.8,
      strokeWeight: 3,
      map,
    });
    polylineRef.current = polyline;
  }, [activePath]);

  // Set up click handler when map is ready
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapReady) return;

    const clickListener = map.addListener('click', (e: google.maps.MapMouseEvent) => {
      if (e.latLng) addVertex(e.latLng);
    });

    return () => google.maps.event.removeListener(clickListener);
  }, [mapReady, addVertex]);

  // Complete current polygon
  const completePolygon = () => {
    const map = mapInstanceRef.current;
    if (!map || activePath.length < 3) return;

    // Create the polygon on the map
    const polygon = new google.maps.Polygon({
      paths: activePath,
      strokeColor: '#3b82f6',
      strokeOpacity: 0.8,
      strokeWeight: 3,
      fillColor: '#3b82f6',
      fillOpacity: 0.15,
      map,
    });
    completedPolygonsRef.current.push(polygon);

    // Calculate area using computeArea
    const areaM2 = google.maps.geometry.spherical.computeArea(
      activePath.map(p => new google.maps.LatLng(p.lat, p.lng))
    );
    const areaSqft = areaM2 * 10.7639;

    // Update state
    const newPolygon: PolygonData = {
      id: `p${polygons.length + 1}`,
      path: activePath,
      closed: true,
    };
    setPolygons(prev => [...prev, newPolygon]);
    setFootprintSqft(prev => prev + areaSqft);

    // Clean up markers and polyline
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];
    if (polylineRef.current) polylineRef.current.setMap(null);
    polylineRef.current = null;
    setActivePath([]);
  };

  // Undo last vertex
  const undoVertex = () => {
    if (activePath.length === 0) return;

    const lastMarker = markersRef.current.pop();
    if (lastMarker) lastMarker.setMap(null);

    const newPath = activePath.slice(0, -1);
    setActivePath(newPath);

    if (polylineRef.current) {
      polylineRef.current.setMap(null);
      if (newPath.length > 0) {
        polylineRef.current = new google.maps.Polyline({
          path: newPath,
          strokeColor: '#f59e0b',
          strokeOpacity: 0.8,
          strokeWeight: 3,
          map: mapInstanceRef.current!,
        });
      } else {
        polylineRef.current = null;
      }
    }
  };

  // Clear current drawing
  const clearCurrent = () => {
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];
    if (polylineRef.current) polylineRef.current.setMap(null);
    polylineRef.current = null;
    setActivePath([]);
  };

  // Remove last completed polygon
  const removeLastPolygon = () => {
    const lastPolygon = completedPolygonsRef.current.pop();
    if (lastPolygon) {
      lastPolygon.setMap(null);
      setPolygons(prev => prev.slice(0, -1));
      // Recalculate area
      const totalArea = completedPolygonsRef.current.reduce((sum, p) => {
        const path = p.getPath();
        const latLngs: google.maps.LatLng[] = [];
        for (let i = 0; i < path.getLength(); i++) {
          latLngs.push(path.getAt(i));
        }
        return sum + google.maps.geometry.spherical.computeArea(latLngs);
      }, 0);
      setFootprintSqft(totalArea * 10.7639);
    }
  };

  // Continue to next step
  const handleContinue = () => {
    if (polygons.length === 0) return;

    const polygonsJson = JSON.stringify(
      polygons.map(p => ({ path: p.path }))
    );

    onNext({
      polygons_json: polygonsJson,
      footprint_sqft: footprintSqft,
    });
  };

  const hasCompletedPolygons = polygons.length > 0;
  const hasActivePoints = activePath.length >= 3;

  // Show loading while Maps API loads
  if (!mapsReady) {
    return (
      <div className="step-container">
        <div className="step-card map-card">
          <div className="step-icon">🗺️</div>
          <h2 className="step-title">Loading Map...</h2>
          <div className="loading-screen">
            <div className="loading-spinner">⏳</div>
            <p>Loading satellite imagery...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="step-container">
      <div className="step-card map-card">
        <div className="step-icon">✏️</div>
        <h2 className="step-title">Trace Your Roof</h2>
        <p className="step-subtitle">
          Tap on the satellite image to trace your roof outline.
          Tap each corner, then press <strong>"Complete Shape"</strong>.
          Add multiple sections for complex roofs.
        </p>

        {/* Error display */}
        {error && <div className="error-text form-error">{error}</div>}

        {/* Map container */}
        <div
          ref={mapRef}
          className="map-container"
        />

        {/* Address label */}
        <div className="map-address-label">
          📍 {address}
        </div>

        {/* Toolbar */}
        <div className="toolbar">
          <button
            className="toolbar-btn"
            onClick={undoVertex}
            disabled={activePath.length === 0}
            title="Undo last point"
          >
            ↩️ Undo
          </button>
          <button
            className="toolbar-btn"
            onClick={clearCurrent}
            disabled={activePath.length === 0}
            title="Clear current"
          >
            🗑️ Clear
          </button>
          {polygons.length > 0 && (
            <button
              className="toolbar-btn"
              onClick={removeLastPolygon}
              title="Remove last polygon"
            >
              ⬅️ Remove
            </button>
          )}
        </div>

        {/* Complete polygon button */}
        {hasActivePoints && (
          <button className="btn-accent" onClick={completePolygon}>
            ✓ Complete Shape ({activePath.length} points)
          </button>
        )}

        {/* Polygon count + area */}
        <div className="polygon-count">
          {polygons.length > 0 && (
            <span className="polygon-badge">
              {polygons.length} section(s) traced
            </span>
          )}
          {activePath.length > 0 && (
            <span className="polygon-badge active">
              Drawing: {activePath.length} point(s)
            </span>
          )}
          {footprintSqft > 0 && (
            <span className="polygon-badge area-badge">
              ~{Math.round(footprintSqft).toLocaleString()} sq ft
            </span>
          )}
        </div>

        <div className="step-actions">
          <button className="btn-secondary" onClick={onBack}>Back</button>
          <button className="btn-primary" onClick={handleContinue} disabled={!hasCompletedPolygons}>
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}