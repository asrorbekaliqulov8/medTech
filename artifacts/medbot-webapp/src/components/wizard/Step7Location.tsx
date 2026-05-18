import { useEffect, useState } from 'react';
import { useOrderStore } from '../../store/useOrderStore';
import { useTranslation } from '../../hooks/useTranslation';
import { useListDistricts } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker, useMap, Polygon, Tooltip } from 'react-leaflet';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface Props {
  onNext: () => void;
}

function geojsonToLeaflet(geojson: any): [number, number][][] {
  if (!geojson) return [];
  if (geojson.type === 'Polygon') {
    return [geojson.coordinates[0].map((c: number[]) => [c[1], c[0]] as [number, number])];
  }
  if (geojson.type === 'MultiPolygon') {
    return geojson.coordinates.map((poly: number[][][]) =>
      poly[0].map((c: number[]) => [c[1], c[0]] as [number, number])
    );
  }
  return [];
}

export function Step7Location({ onNext }: Props) {
  const { t, lang } = useTranslation();
  const { updateField, districtId, latitude, longitude, addressNote } = useOrderStore();
  const { data: districts } = useListDistricts();

  const [activeTab, setActiveTab] = useState('map');
  const [nominatimCache, setNominatimCache] = useState<Record<string, [number, number][][]>>({});
  const [fetchingId, setFetchingId] = useState<string | null>(null);

  const selectedDistrict = districts?.find(d => d.id === districtId);

  const getName = (d: any) => lang === 'ru' ? d.nameRu : lang === 'en' ? d.nameEn : d.nameUz;

  const getPolygons = (d: any): [number, number][][] => {
    if (d.geojson) return geojsonToLeaflet(d.geojson);
    if (nominatimCache[d.id]) return nominatimCache[d.id];
    return [];
  };

  const fetchNominatim = async (d: any) => {
    if (d.geojson || nominatimCache[d.id] || fetchingId) return;
    setFetchingId(d.id);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(d.nameEn + ', Tashkent Region, Uzbekistan')}&format=json&polygon_geojson=1&limit=1`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const data = await res.json();
      if (data.length > 0 && data[0].geojson) {
        const geojson = data[0].geojson;
        const coords = geojsonToLeaflet(geojson);
        if (coords.length > 0) {
          setNominatimCache(prev => ({ ...prev, [d.id]: coords }));
        }
      }
    } catch {}
    setFetchingId(null);
  };

  useEffect(() => {
    if (selectedDistrict && !selectedDistrict.geojson && !nominatimCache[selectedDistrict.id]) {
      fetchNominatim(selectedDistrict);
    }
  }, [selectedDistrict?.id]);

  const handleDistrictSelect = (id: string, lat: number, lng: number) => {
    updateField('districtId', id);
    updateField('latitude', lat);
    updateField('longitude', lng);
    setActiveTab('map');
    const d = districts?.find(x => x.id === id);
    if (d && !d.geojson && !nominatimCache[id]) fetchNominatim(d);
  };

  const requestGeolocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(pos => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        updateField('latitude', lat);
        updateField('longitude', lng);
        if (!districtId && districts) {
          let closest = districts.filter(d => d.available)[0];
          let minD = Infinity;
          districts.forEach(d => {
            if (!d.available) return;
            const dist = Math.pow(d.lat - lat, 2) + Math.pow(d.lng - lng, 2);
            if (dist < minD) { minD = dist; closest = d; }
          });
          if (closest) updateField('districtId', closest.id);
        }
      }, console.error);
    }
  };

  const isValid = districtId && latitude && longitude;
  const activeDistricts = districts?.filter(d => d.available) ?? [];
  const inactiveDistricts = districts?.filter(d => !d.available) ?? [];

  return (
    <div className="space-y-4 flex flex-col h-[calc(100vh-140px)]">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="map">📍 {t('mapTab')}</TabsTrigger>
          <TabsTrigger value="list">📋 {t('listTab')}</TabsTrigger>
        </TabsList>

        <TabsContent value="map" className="flex-1 flex flex-col gap-4 mt-4 data-[state=active]:flex">
          <div className="relative flex-1 rounded-xl overflow-hidden border">
            <MapContainer
              center={[latitude || 41.2995, longitude || 69.2401]}
              zoom={10}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='© <a href="https://openstreetmap.org">OSM</a>' />

              <MapUpdater center={latitude && longitude ? [latitude, longitude] : null} />

              {/* Render all active district polygons */}
              {districts?.map(d => {
                const polys = getPolygons(d);
                const isSelected = d.id === districtId;
                const name = getName(d);
                if (polys.length > 0) {
                  return polys.map((coords, pi) => (
                    <Polygon key={`${d.id}-${pi}`}
                      positions={coords}
                      pathOptions={{
                        color: d.available ? (isSelected ? '#1d4ed8' : '#16a34a') : '#94a3b8',
                        fillColor: d.available ? (isSelected ? '#3b82f6' : '#22c55e') : '#cbd5e1',
                        fillOpacity: d.available ? (isSelected ? 0.35 : 0.2) : 0.1,
                        weight: isSelected ? 3 : 1.5,
                      }}
                      eventHandlers={{
                        click: () => d.available && handleDistrictSelect(d.id, d.lat, d.lng),
                      }}>
                      <Tooltip sticky>
                        <span className="font-medium">{name}</span>
                        {!d.available && <span className="ml-1 text-slate-400">(yaqinda)</span>}
                      </Tooltip>
                    </Polygon>
                  ));
                }
                return (
                  <Marker key={d.id} position={[d.lat, d.lng]}
                    opacity={d.available ? 1 : 0.4}
                    eventHandlers={{ click: () => d.available && handleDistrictSelect(d.id, d.lat, d.lng) }}>
                    <Tooltip>{name}</Tooltip>
                  </Marker>
                );
              })}

              {/* Draggable marker for exact location */}
              {latitude && longitude && (
                <Marker
                  position={[latitude, longitude]}
                  draggable={true}
                  eventHandlers={{
                    dragend: (e) => {
                      const pos = e.target.getLatLng();
                      updateField('latitude', pos.lat);
                      updateField('longitude', pos.lng);
                    }
                  }}
                />
              )}
            </MapContainer>

            <Button
              size="sm"
              variant="secondary"
              className="absolute bottom-4 right-4 z-[400] shadow-md"
              onClick={requestGeolocation}
            >
              🎯 {t('findLocation')}
            </Button>

            {/* Map legend */}
            <div className="absolute bottom-4 left-4 z-[400] bg-white/90 backdrop-blur-sm rounded-lg p-2 text-[10px] space-y-1 shadow">
              <div className="flex items-center gap-1.5"><div className="w-3 h-2 rounded-sm bg-green-500 opacity-70" /><span>Faol</span></div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-2 rounded-sm bg-blue-500 opacity-70" /><span>Tanlangan</span></div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-2 rounded-sm bg-slate-300" /><span>Yaqinda</span></div>
            </div>
          </div>

          <div className="space-y-3 shrink-0">
            {selectedDistrict && (
              <div className="p-3 bg-muted rounded-lg text-sm flex items-center justify-between">
                <span className="font-semibold">{getName(selectedDistrict)}</span>
                <span className="text-muted-foreground text-xs">
                  ({latitude?.toFixed(4)}, {longitude?.toFixed(4)})
                </span>
              </div>
            )}
            <Input
              placeholder={t('address')}
              value={addressNote}
              onChange={e => updateField('addressNote', e.target.value)}
              className="h-12"
            />
          </div>
        </TabsContent>

        <TabsContent value="list" className="flex-1 mt-4 data-[state=active]:flex flex-col">
          <div className="overflow-y-auto pr-2 space-y-2 flex-1">
            {activeDistricts.map(d => {
              const name = getName(d);
              const selected = districtId === d.id;
              return (
                <div key={d.id}
                  className={`p-4 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${selected ? 'border-primary bg-primary/5 shadow-sm' : 'hover:bg-muted/50'}`}
                  onClick={() => handleDistrictSelect(d.id, d.lat, d.lng)}>
                  <div className="flex items-center gap-3">
                    <div className={`w-2.5 h-2.5 rounded-full ${selected ? 'bg-primary' : 'bg-green-500'}`} />
                    <span className="font-medium">{name}</span>
                  </div>
                  {selected && <Badge variant="default">✓</Badge>}
                </div>
              );
            })}
            {inactiveDistricts.length > 0 && (
              <>
                <p className="text-xs text-muted-foreground px-1 pt-2 font-medium uppercase tracking-wide">Yaqinda</p>
                {inactiveDistricts.map(d => (
                  <div key={d.id} className="p-4 rounded-xl border flex items-center justify-between opacity-50 bg-muted/20">
                    <div className="flex items-center gap-3">
                      <div className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                      <span>{getName(d)}</span>
                    </div>
                    <Badge variant="secondary">{t('soon')}</Badge>
                  </div>
                ))}
              </>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <div className="pt-2 shrink-0">
        <Button
          className="w-full h-14 text-lg rounded-xl"
          onClick={onNext}
          disabled={!isValid}
        >
          ▶️ {t('continue')}
        </Button>
      </div>
    </div>
  );
}

function MapUpdater({ center }: { center: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.setView(center, 13, { animate: true });
  }, [center, map]);
  return null;
}
