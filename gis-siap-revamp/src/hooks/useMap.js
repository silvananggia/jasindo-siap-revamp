import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import 'ol/ol.css';
import '../styles/ol-overrides.css';
import Map from 'ol/Map';
import View from 'ol/View';
import { VectorTile as VectorTileLayer } from 'ol/layer';
import VectorTileSource from 'ol/source/VectorTile';
import MVT from 'ol/format/MVT';
import { fromLonLat } from 'ol/proj';
import { toGeometry } from 'ol/render/Feature';
import GeoJSON from 'ol/format/GeoJSON';
import { getArea as getGeodesicArea } from 'ol/sphere';
import { createBasemapLayer } from '../utils/mapUtils';
import { getPercilStyle } from '../utils/percilStyles';

const hasUsableTileUrl = (tileUrl) => {
  if (!tileUrl || typeof tileUrl !== 'string' || !tileUrl.trim()) return false;
  const idMatch = tileUrl.match(/[?&]id=([^&]*)/);
  if (idMatch && !String(idMatch[1]).trim()) return false;
  return true;
};

const createPetakLayer = (tileUrl) => {
  const usable = hasUsableTileUrl(tileUrl);
  return new VectorTileLayer({
    className: 'ol-petak-mvt',
    source: new VectorTileSource({
      format: new MVT(),
      url: usable ? `${process.env.REACT_APP_TILE_URL}/${tileUrl}` : '',
    }),
    style: getPercilStyle([], [], false),
    visible: usable,
    renderMode: 'vector',
    useInterimTilesOnError: false,
    zIndex: 1,
  });
};

const DEFAULT_MAP_CENTER = [118, -2];
const DEFAULT_MAP_ZOOM = 5;

export const useMap = (isAuthenticated, googleApiKey, onPercilSelect, tileUrl, options = {}) => {
  const {
    enableFeatureClick = true,
    initialCenter = DEFAULT_MAP_CENTER,
    initialZoom = DEFAULT_MAP_ZOOM,
  } = options;
  const centerLon = initialCenter[0];
  const centerLat = initialCenter[1];
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const polygonLayerRef = useRef(null);
  const basemapLayerRef = useRef(null);
  const clickHandlerRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);

  useLayoutEffect(() => {
    if (!isAuthenticated || !mapRef.current) return undefined;

    if (!basemapLayerRef.current) {
      basemapLayerRef.current = createBasemapLayer("map-switch-basic", googleApiKey);
    }
    polygonLayerRef.current = createPetakLayer(tileUrl);

    const map = new Map({
      target: mapRef.current,
      layers: [basemapLayerRef.current],
      view: new View({
        center: fromLonLat([centerLon, centerLat]),
        zoom: initialZoom,
      }),
    });
    mapInstance.current = map;

    const updateMapSize = () => {
      if (!map.getTargetElement()) return;
      map.updateSize();
    };

    let ready = false;
    const markReady = () => {
      if (ready) return;
      ready = true;
      updateMapSize();
      if (
        polygonLayerRef.current &&
        !map.getLayers().getArray().includes(polygonLayerRef.current)
      ) {
        map.addLayer(polygonLayerRef.current);
      }
      setMapReady(true);
    };

    const rafId = requestAnimationFrame(updateMapSize);
    const sizeTimer = window.setTimeout(updateMapSize, 100);
    const readyTimer = window.setTimeout(markReady, 250);
    map.once('rendercomplete', markReady);

    const resizeObserver = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(updateMapSize)
      : null;
    resizeObserver?.observe(mapRef.current);
    window.addEventListener('resize', updateMapSize);

    if (enableFeatureClick) {
      const geojsonFormat = new GeoJSON();
      clickHandlerRef.current = (e) => {
        mapInstance.current.forEachFeatureAtPixel(e.pixel, async (feature) => {
          try {
            const geometry = toGeometry(feature.getGeometry());
            const sourceProjection = mapInstance.current.getView().getProjection();
            const targetProjection = 'EPSG:4326';

            const geometryClone = geometry.clone();
            geometryClone.transform(sourceProjection, targetProjection);

            let geometryGeoJSON = geojsonFormat.writeGeometryObject(geometryClone);

            function addZDimension(geometry) {
              if (geometry.type === 'Polygon') {
                geometry.coordinates = geometry.coordinates.map(ring =>
                  ring.map(coord => [...coord, 0])
                );
              }
              return geometry;
            }

            geometryGeoJSON = addZDimension(geometryGeoJSON);

            const allProperties = feature.getProperties();

            const psid =
              feature.get('psid') ??
              allProperties?.psid ??
              feature.get('id') ??
              allProperties?.id;

            const petak_id =
              feature.get('petak_id') ??
              allProperties?.petak_id ??
              feature.get('idpetak') ??
              allProperties?.idpetak ??
              feature.get('petakid') ??
              allProperties?.petakid;

            const areaM2 = getGeodesicArea(geometryClone, { projection: targetProjection });
            const area = Number.isFinite(areaM2) ? areaM2 / 10000 : 0;

            const percilData = {
              psid,
              id: psid,
              petak_id,
              petakid: petak_id,
              idpetak: petak_id,
              area,
              geometry: geometryGeoJSON,
              ...allProperties
            };

            onPercilSelect(percilData);
          } catch (err) {
            console.error('Error processing feature:', err);
          }

          return true;
        });
      };

      map.on('click', clickHandlerRef.current);
    }

    return () => {
      cancelAnimationFrame(rafId);
      window.clearTimeout(sizeTimer);
      window.clearTimeout(readyTimer);
      window.removeEventListener('resize', updateMapSize);
      resizeObserver?.disconnect();
      setMapReady(false);
      if (clickHandlerRef.current) {
        map.un('click', clickHandlerRef.current);
      }
      map.setTarget(null);
      map.dispose();
      if (mapInstance.current === map) {
        mapInstance.current = null;
      }
      polygonLayerRef.current = null;
      basemapLayerRef.current = null;
    };
  }, [isAuthenticated, googleApiKey, enableFeatureClick, centerLon, centerLat, initialZoom]);

  useEffect(() => {
    if (mapInstance.current && clickHandlerRef.current) {
      mapInstance.current.un('click', clickHandlerRef.current);
      mapInstance.current.on('click', clickHandlerRef.current);
    }
  }, [onPercilSelect]);

  return {
    mapRef,
    mapInstance,
    polygonLayerRef,
    basemapLayerRef,
    mapReady,
  };
};
