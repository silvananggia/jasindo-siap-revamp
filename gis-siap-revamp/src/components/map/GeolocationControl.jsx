import React, { useEffect, useRef } from 'react';
import Geolocation from 'ol/Geolocation';
import GeolocationButton from 'ol-ext/control/GeolocationButton';

const GeolocationControl = ({ mapInstance, isMobile }) => {
  const geolocation = useRef(null);

  useEffect(() => {
    if (!mapInstance) return;

    geolocation.current = new Geolocation({
      tracking: false,
      projection: mapInstance.getView().getProjection(),
      trackingOptions: {
        enableHighAccuracy: true,
      },
    });

    const geoControl = new GeolocationButton({
      geolocation: geolocation.current,
      className: 'geolocation-control',
      tipLabel: 'Get Location',
    });

    

    mapInstance.addControl(geoControl);

    return () => {
      if (geolocation.current) {
        geolocation.current = null;
      }
    };
  }, [mapInstance, isMobile]);

  return null;
};

export default GeolocationControl; 