import { useEffect, useState, useRef } from 'react';
import { useOrderStore } from '../../store/useOrderStore';
import { useTranslation } from '../../hooks/useTranslation';
import { useListDistricts } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

// Leaflet
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker, useMap, Polygon } from 'react-leaflet';

// Fix default icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface Props {
  onNext: () => void;
}

export function Step7Location({ onNext }: Props) {
  const { t, lang } = useTranslation();
  const { updateField, districtId, latitude, longitude, addressNote } = useOrderStore();
  const { data: districts } = useListDistricts();
  
  const [activeTab, setActiveTab] = useState('map');
  const [polygonData, setPolygonData] = useState<any>(null);
  
  const selectedDistrict = districts?.find(d => d.id === districtId);

  // Fetch polygon when district selected
  useEffect(() => {
    if (selectedDistrict) {
      const name = lang === 'uz' ? selectedDistrict.nameUz : selectedDistrict.nameEn; // Nominatim prefers English or local
      fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(name)},Tashkent,Uzbekistan&format=json&polygon_geojson=1`)
        .then(res => res.json())
        .then(data => {
          if (data && data.length > 0 && data[0].geojson) {
            const geojson = data[0].geojson;
            if (geojson.type === 'Polygon' || geojson.type === 'MultiPolygon') {
              // Convert GeoJSON coords to Leaflet [lat, lng]
              const coords = geojson.type === 'Polygon' 
                ? geojson.coordinates[0].map((c: any) => [c[1], c[0]])
                : geojson.coordinates[0][0].map((c: any) => [c[1], c[0]]);
              setPolygonData(coords);
            }
          }
        })
        .catch(console.error);
    } else {
      setPolygonData(null);
    }
  }, [selectedDistrict, lang]);

  const handleDistrictSelect = (id: string, lat: number, lng: number) => {
    updateField('districtId', id);
    updateField('latitude', lat);
    updateField('longitude', lng);
    setActiveTab('map');
  };

  const handleLocationFound = (lat: number, lng: number) => {
    updateField('latitude', lat);
    updateField('longitude', lng);
    
    // Auto-select closest district if none
    if (!districtId && districts) {
      // Very basic distance check
      let closest = districts[0];
      let minD = Infinity;
      districts.forEach(d => {
        if (!d.available) return;
        const dist = Math.pow(d.lat - lat, 2) + Math.pow(d.lng - lng, 2);
        if (dist < minD) {
          minD = dist;
          closest = d;
        }
      });
      if (closest) {
        updateField('districtId', closest.id);
      }
    }
  };

  const requestGeolocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        position => {
          handleLocationFound(position.coords.latitude, position.coords.longitude);
        },
        err => console.error(err)
      );
    }
  };

  const isValid = districtId && latitude && longitude;

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
              zoom={11} 
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              
              <MapUpdater center={latitude && longitude ? [latitude, longitude] : null} />
              
              {districts?.map(d => (
                <Marker 
                  key={d.id} 
                  position={[d.lat, d.lng]} 
                  eventHandlers={{ click: () => d.available && handleDistrictSelect(d.id, d.lat, d.lng) }}
                  opacity={d.available ? 1 : 0.5}
                />
              ))}

              {polygonData && (
                <Polygon positions={polygonData} pathOptions={{ color: 'hsl(var(--primary))', fillColor: 'hsl(var(--primary))', fillOpacity: 0.2 }} />
              )}
              
              {latitude && longitude && (
                <Marker 
                  position={[latitude, longitude]} 
                  draggable={true}
                  eventHandlers={{
                    dragend: (e) => {
                      const marker = e.target;
                      const position = marker.getLatLng();
                      updateField('latitude', position.lat);
                      updateField('longitude', position.lng);
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
          </div>
          
          <div className="space-y-3 shrink-0">
            {selectedDistrict && (
              <div className="p-3 bg-muted rounded-lg text-sm">
                <span className="font-semibold">{lang === 'uz' ? selectedDistrict.nameUz : lang === 'ru' ? selectedDistrict.nameRu : selectedDistrict.nameEn}</span>
                <span className="text-muted-foreground ml-2">
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
            {districts?.map(d => {
              const name = lang === 'uz' ? d.nameUz : lang === 'ru' ? d.nameRu : d.nameEn;
              return (
                <div 
                  key={d.id}
                  className={`p-4 rounded-xl border flex items-center justify-between ${
                    d.available ? 'cursor-pointer hover:bg-muted/50' : 'opacity-60 bg-muted/30'
                  } ${districtId === d.id ? 'border-primary bg-primary/5' : ''}`}
                  onClick={() => d.available && handleDistrictSelect(d.id, d.lat, d.lng)}
                >
                  <span className="font-medium text-lg">{name}</span>
                  {!d.available && <Badge variant="secondary">{t('soon')}</Badge>}
                  {d.available && districtId === d.id && <Badge variant="default">✓</Badge>}
                </div>
              );
            })}
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
    if (center) {
      map.setView(center, 13, { animate: true });
    }
  }, [center, map]);
  return null;
}
