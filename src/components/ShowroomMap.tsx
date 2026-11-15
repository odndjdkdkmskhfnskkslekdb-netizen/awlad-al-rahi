import React, { useState } from 'react';
import {
  APIProvider,
  AdvancedMarker,
  InfoWindow,
  Map as GoogleMap,
  Pin,
  useAdvancedMarkerRef,
} from '@vis.gl/react-google-maps';
import { ExternalLink, MapPin } from 'lucide-react';
import type { ShowroomSettings } from '../types/showroom.ts';
import {
  buildDirectionsUrl,
  buildStandardEmbedUrl,
  getParsedNumericCoords,
} from '../utils/maps.ts';

const MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

interface ShowroomMapProps {
  settings: ShowroomSettings;
  lang: 'en' | 'ar';
  heightClassName?: string;
}

const ShowroomMarkerCard: React.FC<{
  position: { lat: number; lng: number };
  settings: ShowroomSettings;
  lang: 'en' | 'ar';
  directionsUrl: string;
}> = ({ position, settings, lang, directionsUrl }) => {
  const [infoOpen, setInfoOpen] = useState(true);
  const [markerRef, marker] = useAdvancedMarkerRef();

  const addressLabel =
    lang === 'ar'
      ? settings.showroomAddressAr || settings.showroomAddressEn
      : settings.showroomAddressEn || settings.showroomAddressAr;

  return (
    <>
      <AdvancedMarker
        ref={markerRef}
        position={position}
        onClick={() => setInfoOpen(true)}
        title="AWLAD AL RAJHI – أولاد الراجحي للأثاث"
      >
        <Pin
          background="#1C1917"
          borderColor="#C8A97E"
          glyphColor="#C8A97E"
          scale={1.2}
        />
      </AdvancedMarker>

      {infoOpen && marker && (
        <InfoWindow
          anchor={marker}
          maxWidth={260}
          onCloseClick={() => setInfoOpen(false)}
        >
          <div dir={lang === 'ar' ? 'rtl' : 'ltr'} className="p-1 space-y-1.5 text-[#1C1917]">
            <p className="font-semibold text-xs tracking-wide">
              {lang === 'ar' ? 'معرض أولاد الراجحي للأثاث' : 'AWLAD AL RAJHI SHOWROOM'}
            </p>
            {addressLabel && <p className="text-[11px] text-[#3A2B22]">{addressLabel}</p>}
            {directionsUrl && (
              <a
                href={directionsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#B89362] underline"
              >
                <span>{lang === 'ar' ? 'فتح في خرائط جوجل' : 'Open in Google Maps'}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </InfoWindow>
      )}
    </>
  );
};

export const ShowroomMap: React.FC<ShowroomMapProps> = ({
  settings,
  lang,
  heightClassName = 'h-[360px] sm:h-[420px]',
}) => {
  const coords = getParsedNumericCoords(settings);
  const embedUrl = buildStandardEmbedUrl(settings, lang);
  const directionsUrl = buildDirectionsUrl(settings);

  // Use @vis.gl/react-google-maps SDK when API key and coordinates are available
  if (MAPS_API_KEY && coords) {
    return (
      <div className={`w-full ${heightClassName} rounded-lg overflow-hidden border border-[#D6CCC0] bg-[#F2ECE1]`}>
        <APIProvider apiKey={MAPS_API_KEY} libraries={['marker']} language={lang} region="EG">
          <GoogleMap
            mapId="DEMO_MAP_ID"
            defaultCenter={coords}
            center={coords}
            defaultZoom={16}
            gestureHandling="cooperative"
            internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
            style={{ width: '100%', height: '100%' }}
          >
            <ShowroomMarkerCard
              position={coords}
              settings={settings}
              lang={lang}
              directionsUrl={directionsUrl}
            />
          </GoogleMap>
        </APIProvider>
      </div>
    );
  }

  // Interactive iframe embed when coordinates/address/embed URL are configured
  if (embedUrl) {
    return (
      <div className={`w-full ${heightClassName} rounded-lg overflow-hidden border border-[#D6CCC0] bg-[#F2ECE1]`}>
        <iframe
          title="AWLAD AL RAJHI Showroom Map"
          src={embedUrl}
          className="w-full h-full border-0"
          loading="lazy"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
    );
  }

  // Fallback card if user linked a shortened Google Maps URL without resolved coords
  if (settings.googleMapsUrl) {
    return (
      <div className="w-full h-[320px] sm:h-[380px] rounded-lg border border-[#D6CCC0] bg-[#F2ECE1] flex flex-col items-center justify-center p-8 text-center space-y-4">
        <MapPin className="w-10 h-10 text-[#B89362]" />
        <div>
          <p className="font-display text-2xl text-[#1C1917]">AWLAD AL RAJHI · أولاد الراجحي</p>
          <p className="mt-1 text-xs text-[#3A2B22] font-arabic">
            {lang === 'ar' ? 'تم ربط رابط خرائط جوجل بنجاح' : 'Google Maps link connected'}
          </p>
        </div>
        <a
          href={settings.googleMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1C1917] text-[#FAF7F2] text-xs font-medium rounded hover:bg-[#3A2B22] transition-colors"
        >
          <span>{lang === 'ar' ? 'عرض الموقع على خرائط جوجل' : 'View on Google Maps'}</span>
          <ExternalLink className="w-4 h-4 text-[#C8A97E]" />
        </a>
      </div>
    );
  }

  return (
    <div className="w-full h-[320px] sm:h-[380px] rounded-lg border border-[#D6CCC0] bg-[#F2ECE1] flex flex-col items-center justify-center p-8 text-center">
      <MapPin className="w-10 h-10 text-[#B89362] mb-3" />
      <p className="font-display text-2xl text-[#1C1917]">AWLAD AL RAJHI · أولاد الراجحي</p>
      <p className="mt-2 text-xs uppercase tracking-[0.18em] text-[#8C7E70]">
        {lang === 'ar' ? 'بانتظار ربط موقع المعرض من لوحة التحكم' : 'Awaiting Owner Showroom Coordinates'}
      </p>
    </div>
  );
};
