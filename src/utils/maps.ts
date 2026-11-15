import type { ShowroomSettings } from '../types/showroom.ts';

export interface ParsedMapsCoordinates {
  latitude: string;
  longitude: string;
  embedUrl?: string;
}

/**
 * Extracts latitude/longitude or iframe src from any pasted Google Maps link or embed snippet.
 */
export function parseGoogleMapsInput(rawInput: string): ParsedMapsCoordinates | null {
  const input = rawInput.trim();
  if (!input) return null;

  // Handle pasted <iframe src="..."> HTML snippet
  const iframeSrcMatch = input.match(/src=["']([^"']+)["']/i);
  const candidate = iframeSrcMatch ? iframeSrcMatch[1] : input;

  const result: ParsedMapsCoordinates = {
    latitude: '',
    longitude: '',
  };

  if (candidate.includes('/maps/embed')) {
    result.embedUrl = candidate;
  }

  // Pattern 1: @lat,lng (e.g. /@31.41754,31.81445,17z)
  const atMatch = candidate.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (atMatch) {
    result.latitude = atMatch[1];
    result.longitude = atMatch[2];
    return result;
  }

  // Pattern 2: !3dLAT!4dLNG (Google Maps place data parameter)
  const dataMatch = candidate.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
  if (dataMatch) {
    result.latitude = dataMatch[1];
    result.longitude = dataMatch[2];
    return result;
  }

  // Pattern 3: ?q=lat,lng or &query=lat,lng or &ll=lat,lng or &center=lat,lng
  const queryCoordMatch = candidate.match(/[?&](?:q|query|ll|center)=(-?\d+\.\d+)[,%2C]+(-?\d+\.\d+)/i);
  if (queryCoordMatch) {
    result.latitude = queryCoordMatch[1];
    result.longitude = queryCoordMatch[2];
    return result;
  }

  // Pattern 4: Direct "lat, lng" coordinate pair pasted directly
  const directMatch = candidate.match(/^(-?\d{1,2}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)$/);
  if (directMatch) {
    result.latitude = directMatch[1];
    result.longitude = directMatch[2];
    return result;
  }

  return result.embedUrl ? result : null;
}

export function getParsedNumericCoords(settings: ShowroomSettings): { lat: number; lng: number } | null {
  const latNum = Number.parseFloat(settings.latitude);
  const lngNum = Number.parseFloat(settings.longitude);
  if (Number.isFinite(latNum) && Number.isFinite(lngNum) && Math.abs(latNum) <= 90 && Math.abs(lngNum) <= 180) {
    return { lat: latNum, lng: lngNum };
  }
  if (settings.googleMapsUrl) {
    const parsed = parseGoogleMapsInput(settings.googleMapsUrl);
    if (parsed?.latitude && parsed?.longitude) {
      const pLat = Number.parseFloat(parsed.latitude);
      const pLng = Number.parseFloat(parsed.longitude);
      if (Number.isFinite(pLat) && Number.isFinite(pLng)) {
        return { lat: pLat, lng: pLng };
      }
    }
  }
  return null;
}

export function buildStandardEmbedUrl(settings: ShowroomSettings, lang: 'en' | 'ar'): string {
  if (settings.googleMapsEmbedUrl) {
    return settings.googleMapsEmbedUrl;
  }
  const coords = getParsedNumericCoords(settings);
  if (coords) {
    return `https://maps.google.com/maps?q=${encodeURIComponent(
      `${coords.lat},${coords.lng}`
    )}&hl=${lang}&z=16&output=embed`;
  }
  const addressQuery = settings.showroomAddressAr || settings.showroomAddressEn;
  if (addressQuery.trim()) {
    return `https://maps.google.com/maps?q=${encodeURIComponent(addressQuery.trim())}&hl=${lang}&z=15&output=embed`;
  }
  if (settings.googleMapsUrl && settings.googleMapsUrl.includes('google.com/maps')) {
    const parsed = parseGoogleMapsInput(settings.googleMapsUrl);
    if (parsed?.embedUrl) return parsed.embedUrl;
  }
  return '';
}

export function buildDirectionsUrl(settings: ShowroomSettings): string {
  if (settings.googleMapsUrl && settings.googleMapsUrl.startsWith('http')) {
    return settings.googleMapsUrl;
  }
  const coords = getParsedNumericCoords(settings);
  if (coords) {
    return `https://www.google.com/maps/dir/?api=1&destination=${coords.lat},${coords.lng}`;
  }
  const addressQuery = settings.showroomAddressEn || settings.showroomAddressAr;
  if (addressQuery.trim()) {
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(addressQuery.trim())}`;
  }
  return '';
}
