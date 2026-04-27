import { useEffect, useRef, useState } from 'react';
import { MapPin, Clock, Crosshair } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ThreatMapPage() {
  const mapRef = useRef(null);
  const [timeRange, setTimeRange] = useState('24h');
  const [threats, setThreats] = useState([]);

  useEffect(() => {
    let map;
    let markers = [];
    let polylines = [];
    let interval;

    const initMap = async () => {
      const L = await import('leaflet');
      await import('leaflet/dist/leaflet.css');

      if (!mapRef.current) return;

      map = L.map(mapRef.current, {
        center: [20, 0],
        zoom: 2,
        zoomControl: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // Icon for threat origin
      const originIcon = L.divIcon({
        html: `<div style="width:14px;height:14px;background:hsl(0,100%,50%);border-radius:50%;box-shadow:0 0 12px hsl(0,100%,50%,0.8);border:2px solid white;"></div>`,
        className: '',
        iconSize: [14, 14],
      });

      // Icon for threat target
      const targetIcon = L.divIcon({
        html: `<div style="width:14px;height:14px;background:hsl(180,100%,50%);border-radius:50%;box-shadow:0 0 12px hsl(180,100%,50%,0.8);border:2px solid white;"></div>`,
        className: '',
        iconSize: [14, 14],
      });

      const fetchThreats = async () => {
        try {
          const res = await fetch(`http://localhost:5000/threats?timeRange=${timeRange}`);
          const data = await res.json();

          if (data.success && Array.isArray(data.data)) {
            setThreats(data.data);

            // Remove old markers and polylines
            markers.forEach((m) => m.remove());
            polylines.forEach((p) => p.remove());
            markers = [];
            polylines = [];

            // Add new markers and threat lines
            data.data.forEach((t) => {
              // Origin marker
              const originMarker = L.marker([t.originLat, t.originLng], { icon: originIcon })
                .addTo(map)
                .bindPopup(`
                  <div style="font-family:Inter,sans-serif;color:#e5e5e5;background:#1a1a2e;padding:8px 12px;border-radius:8px;min-width:200px;">
                    <strong style="color:hsl(0,100%,50%)">🔴 Origin</strong><br/>
                    <span style="font-size:12px;font-weight:bold;">${t.origin}</span><br/>
                    <span style="font-size:11px;opacity:0.7;">Type: ${t.type}</span><br/>
                    <span style="font-size:11px;opacity:0.5;">${new Date(t.timestamp).toLocaleString()}</span>
                  </div>
                `);

              // Target marker
              const targetMarker = L.marker([t.targetLat, t.targetLng], { icon: targetIcon })
                .addTo(map)
                .bindPopup(`
                  <div style="font-family:Inter,sans-serif;color:#e5e5e5;background:#1a1a2e;padding:8px 12px;border-radius:8px;min-width:200px;">
                    <strong style="color:hsl(180,100%,50%)">🔵 Target</strong><br/>
                    <span style="font-size:12px;font-weight:bold;">${t.target}</span><br/>
                    <span style="font-size:11px;opacity:0.7;">Severity: ${t.severity}</span><br/>
                    <span style="font-size:11px;opacity:0.5;">${t.description}</span>
                  </div>
                `);

              // Attack flow line
              const polyline = L.polyline([
                [t.originLat, t.originLng],
                [t.targetLat, t.targetLng]
              ], {
                color: t.severity === 'critical' ? '#ff0000' : t.severity === 'high' ? '#ff9800' : '#ffc107',
                weight: 2,
                opacity: 0.7,
                dashArray: '5, 5',
                interactive: true
              }).addTo(map).bindPopup(`
                <div style="font-family:Inter,sans-serif;color:#e5e5e5;background:#1a1a2e;padding:8px 12px;border-radius:8px;min-width:200px;">
                  <strong style="color:${t.severity === 'critical' ? '#ff0000' : t.severity === 'high' ? '#ff9800' : '#ffc107'}">${t.type}</strong><br/>
                  <span style="font-size:12px;">From: ${t.origin}</span><br/>
                  <span style="font-size:12px;">To: ${t.target}</span><br/>
                  <span style="font-size:11px;opacity:0.7;">Severity: ${t.severity}</span><br/>
                  <span style="font-size:11px;opacity:0.5;">${new Date(t.timestamp).toLocaleString()}</span>
                </div>
              `);

              markers.push(originMarker);
              markers.push(targetMarker);
              polylines.push(polyline);
            });
          }
        } catch (err) {
          console.error('Error fetching threats:', err);
        }
      };

      // Initial fetch
      await fetchThreats();

      // Poll every 10 seconds
      interval = setInterval(fetchThreats, 10000);
    };

    initMap();

    return () => {
      if (interval) clearInterval(interval);
      if (mapRef.current && mapRef.current._leaflet_map) {
        mapRef.current._leaflet_map.remove();
      }
    };
  }, [timeRange]);

  return (
    <div className="relative h-[calc(100vh-4rem)]">
      <div ref={mapRef} className="absolute inset-0 z-0" />

      {/* Controls */}
      <div className="absolute top-4 left-4 z-10 space-y-3">
        <div className="glass rounded-xl p-4">
          <h2 className="font-display text-lg font-bold mb-3 flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" /> Global Threats
          </h2>
          <div className="flex gap-2">
            {['1h', '24h', '7d'].map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  timeRange === range
                    ? 'bg-primary/20 text-primary border border-primary/30'
                    : 'bg-secondary/50 text-muted-foreground'
                }`}
              >
                <Clock className="inline h-3 w-3 mr-1" />
                {range}
              </button>
            ))}
          </div>
        </div>

        <Button variant="cyber-outline" size="sm" className="glass">
          <Crosshair className="h-4 w-4" /> My Location
        </Button>
      </div>

      {/* Threat List */}
      <div className="absolute top-4 right-4 z-10 w-72 max-h-[60vh] overflow-y-auto glass rounded-xl p-4 hidden lg:block">
        <h3 className="font-display text-sm font-bold mb-3">Active Threats ({threats.length})</h3>
        <div className="space-y-2">
          {threats.length === 0 ? (
            <div className="text-xs text-muted-foreground">No active threats</div>
          ) : (
            threats.map((t) => (
              <div
                key={t.id}
                className="p-2.5 rounded-lg bg-secondary/50 hover:bg-secondary/80 transition-colors cursor-pointer"
              >
                <div className="text-sm font-medium flex items-center justify-between">
                  <span>{t.type}</span>
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    t.severity === 'critical' ? 'bg-red-500/20 text-red-400' : 
                    t.severity === 'high' ? 'bg-orange-500/20 text-orange-400' : 
                    'bg-yellow-500/20 text-yellow-400'
                  }`}>{t.severity}</span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  <div>🔴 {t.origin}</div>
                  <div>→</div>
                  <div>🔵 {t.target}</div>
                </div>
                <div className="text-xs text-muted-foreground mt-1 flex items-center justify-between">
                  <span>{new Date(t.timestamp).toLocaleTimeString()}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}