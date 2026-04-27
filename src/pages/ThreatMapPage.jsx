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
    let interval;

    const initMap = async () => {
      const L = await import('leaflet');
      await import('leaflet/dist/leaflet.css');

      if (!mapRef.current) return;

      map = L.map(mapRef.current, {
        center: [20, 0],
        zoom: 2,
        zoomControl,
      });

      L.tileLayer('https://threatmap.checkpoint.com/', {
        attribution: '&copy; OSM & CARTO',
      }).addTo(map);

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      const icon = L.divIcon({
        html: `<div style="width:12px;height:12px;background:hsl(180,100%,50%);border-radius:50%;box-shadow:0 0 10px hsl(180,100%,50%,0.6);"></div>`,
        className: '',
        iconSize: [12, 12],
      });

      const fetchThreats = async () => {
        try {
  const res = await fetch('https://threatmap.checkpoint.com/');  
          const data = await res.json();

          setThreats(data);

          // Remove old markers
          markers.forEach((m) => m.remove());
          markers = [];

          // Add new markers
          data.forEach((t) => {
            const marker = L.marker([t.lat, t.lng], { icon })
              .addTo(map)
              .bindPopup(`
                <div style="font-family:Inter,sans-serif;color:#e5e5e5;background:#1a1a2e;padding:8px 12px;border-radius:8px;min-width:160px;">
                  <strong style="color:hsl(180,100%,50%)">${t.type}</strong><br/>
                  <span style="font-size:12px;opacity:0.7">${t.location}</span><br/>
                  <span style="font-size:11px;opacity:0.5">${t.time}</span>
                </div>
              `);

            markers.push(marker);
          });

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
      if (map) map.remove();
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
        <h3 className="font-display text-sm font-bold mb-3">Recent Threats</h3>
        <div className="space-y-2">
          {threats.length === 0 ? (
            <div className="text-xs text-muted-foreground">No data</div>
          ) : (
            threats.map((t) => (
              <div
                key={t.id}
                className="p-2.5 rounded-lg bg-secondary/50 hover:bg-secondary/80 transition-colors cursor-pointer"
              >
                <div className="text-sm font-medium">{t.type}</div>
                <div className="text-xs text-muted-foreground flex items-center justify-between">
                  <span>{t.location}</span>
                  <span>{t.time}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}








