import { useEffect, useRef } from 'react';
import Map from 'ol/Map';
import View from 'ol/View';
import { VectorTile as VectorTileLayer } from 'ol/layer';
import VectorTileSource from 'ol/source/VectorTile';
import MVT from 'ol/format/MVT';
import { fromLonLat } from 'ol/proj';
import TileLayer from 'ol/layer/Tile';
import XYZ from 'ol/source/XYZ';
import { toGeometry } from 'ol/render/Feature';
import GeoJSON from 'ol/format/GeoJSON';
import { createBasemapLayer } from '../utils/mapUtils';
import { getPercilStyle } from '../utils/percilStyles';

export const useMap = (isAuthenticated, googleApiKey, onPercilSelect, tileUrl) => {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const polygonLayerRef = useRef(null);
  const basemapLayerRef = useRef(null);
  const clickHandlerRef = useRef(null);

  useEffect(() => {
    if (!isAuthenticated || !mapRef.current) return;

    if (!basemapLayerRef.current) {
      basemapLayerRef.current = createBasemapLayer("map-switch-basic", googleApiKey);
    }

    // Create initial polygon layer with empty source
    if (tileUrl && typeof tileUrl === 'string' && tileUrl.trim() !== '') {
      polygonLayerRef.current = new VectorTileLayer({
        source: new VectorTileSource({
          format: new MVT(),
          url: `${process.env.REACT_APP_TILE_URL}/${tileUrl}`,
        }),
        style: getPercilStyle([], [], false),
      });
    } else {
      // Create a placeholder layer when tileUrl is not available
      polygonLayerRef.current = new VectorTileLayer({
        source: new VectorTileSource({
          format: new MVT(),
          url: '', // Empty URL to prevent 404 errors
        }),
        style: getPercilStyle([], [], false),
        visible: false, // Hide the layer until proper URL is set
      });
    }

    mapInstance.current = new Map({
      target: mapRef.current,
      layers: [basemapLayerRef.current, polygonLayerRef.current],
      view: new View({
        center: fromLonLat([107.6237476,  -6.3292777]),
        zoom: 16,
      }),
    });

    // Add click event handler
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

          const id = feature.get('psid');
          const petakid = feature.get('idpetak'); // Fix: use idpetak instead of petak_id
          const area = feature.get('luas');
          
          // Extract all feature properties
          const allProperties = feature.getProperties();
          
          // Create percilData object with all properties
          const percilData = {
            id,
            petakid,
            area,
            geometry: geometryGeoJSON,
            ...allProperties // Spread all other properties
          };

          onPercilSelect(percilData);
        } catch (err) {
          console.error('Error processing feature:', err);
        }

        return true;
      });
    };

    mapInstance.current.on('click', clickHandlerRef.current);

    return () => {
      if (mapInstance.current) {
        if (clickHandlerRef.current) {
          mapInstance.current.un('click', clickHandlerRef.current);
        }
        mapInstance.current.setTarget(null);
      }
    };
  }, [isAuthenticated, googleApiKey]);

  // Update click handler when onPercilSelect changes
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
  };
}; 