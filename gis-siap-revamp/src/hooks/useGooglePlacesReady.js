import { useEffect, useState } from 'react';

const isPlacesReady = () =>
  typeof window !== 'undefined' &&
  Boolean(window.google?.maps?.places?.Autocomplete);

export const useGooglePlacesReady = () => {
  const [ready, setReady] = useState(isPlacesReady);

  useEffect(() => {
    if (ready) return undefined;
    let cancelled = false;

    const markReady = () => {
      if (!cancelled && isPlacesReady()) {
        setReady(true);
        return true;
      }
      return false;
    };

    const loadPlaces = async () => {
      if (markReady()) return;
      if (window.google?.maps?.importLibrary) {
        try {
          await window.google.maps.importLibrary('places');
          markReady();
        } catch (error) {
          console.error('Failed to load Google Places library:', error);
        }
      }
    };

    loadPlaces();
    const intervalId = window.setInterval(() => {
      if (markReady()) {
        window.clearInterval(intervalId);
      }
    }, 200);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [ready]);

  return ready;
};
