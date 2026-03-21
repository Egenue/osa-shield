import { useEffect, useRef, useState } from 'react';
import { MapPin, Clock, Crosshair } from 'lucide-react';
import { Button } from '@/components/ui/button';

const mockThreats = [
  { id: 1, lat: 40.7128, lng: -74.0060, type: 'Phishing Email', location: 'New York, US', time: '2 min ago' },
  { id: 2, lat: 51.5074, lng: -0.1278, type: 'SMS Scam', location: 'London, UK', time: '15 min ago' },
  { id: 3, lat: 6.5244, lng: 3.3792, type: 'URL Redirect', location: 'Lagos, NG', time: '1 hour ago' },
  { id: 4, lat: 19.0760, lng: 72.8777, type: 'Phone Scam', location: 'Mumbai, IN', time: '3 hours ago' },
  { id: 5, lat: 35.6762, lng: 139.6503, type: 'Phishing Email', location: 'Tokyo, JP', time: '5 hours ago' },
  { id: 6, lat: -33.8688, lng: 151.2093, type: 'Investment Scam', location: 'Sydney, AU', time: '8 hours ago' },
  { id: 7, lat: 48.8566, lng: 2.3522, type: 'SMS Scam', location: 'Paris, FR', time: '12 hours ago' },
  { id: 8, lat: 55.7558, lng: 37.6173, type: 'Ransomware', location: 'Moscow, RU', time: '1 day ago' },
];

export default function ThreatMapPage() {
  const mapRef = useRef<HTMLDivElement>(null);
  const [timeRange, setTimeRange] = useState('24h');
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    let map: any;
    const initMap = async () => {
      const L = await import('leaflet');
      await import('leaflet/dist/leaflet.css');

      if (!mapRef.current) return;

      map = L.map(mapRef.current, {
        center: [20, 0],
        zoom: 2,
        zoomControl: false,
      });

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OSM & CARTO',
      }).addTo(map);

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      const icon = L.divIcon({
        html: `<div style="width:12px;height:12px;background:hsl(180,100%,50%);border-radius:50%;box-shadow:0 0 10px hsl(180,100%,50%,0.6);"></div>`,
        className: '',
        iconSize: [12, 12],
      });

      mockThreats.forEach((t) => {
        L.marker([t.lat, t.lng], { icon })
          .addTo(map)
          .bindPopup(`
            <div style="font-family:Inter,sans-serif;color:#e5e5e5;background:#1a1a2e;padding:8px 12px;border-radius:8px;min-width:160px;">
              <strong style="color:hsl(180,100%,50%)">${t.type}</strong><br/>
              <span style="font-size:12px;opacity:0.7">${t.location}</span><br/>
              <span style="font-size:11px;opacity:0.5">${t.time}</span>
            </div>
          `, { className: 'dark-popup' });
      });

      setMapLoaded(true);
    };

    initMap();
    return () => { map?.remove(); };
  }, []);

  return (
    <div className="relative h-[calc(100vh-4rem)]">
      <div ref={mapRef} className="absolute inset-0 z-0" />

      {/* Controls overlay */}
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
                  timeRange === range ? 'bg-primary/20 text-primary border border-primary/30' : 'bg-secondary/50 text-muted-foreground'
                }`}
              >
                <Clock className="inline h-3 w-3 mr-1" />{range}
              </button>
            ))}
          </div>
        </div>

        <Button variant="cyber-outline" size="sm" className="glass">
          <Crosshair className="h-4 w-4" /> My Location
        </Button>
      </div>

      {/* Threat list */}
      <div className="absolute top-4 right-4 z-10 w-72 max-h-[60vh] overflow-y-auto glass rounded-xl p-4 hidden lg:block">
        <h3 className="font-display text-sm font-bold mb-3">Recent Threats</h3>
        <div className="space-y-2">
          {mockThreats.map((t) => (
            <div key={t.id} className="p-2.5 rounded-lg bg-secondary/50 hover:bg-secondary/80 transition-colors cursor-pointer">
              <div className="text-sm font-medium">{t.type}</div>
              <div className="text-xs text-muted-foreground flex items-center justify-between">
                <span>{t.location}</span>
                <span>{t.time}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
