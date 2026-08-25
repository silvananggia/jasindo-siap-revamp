import { fromLonLat, transformExtent } from 'ol/proj';
import TileLayer from 'ol/layer/Tile';
import XYZ from 'ol/source/XYZ';
import OSM from 'ol/source/OSM';
import { buffer } from 'ol/extent';

export const basemapOptions = [
  { key: "map-switch-default", label: "Plain" },
  { key: "map-switch-basic", label: "Road" },
  { key: "map-switch-satellite", label: "Imagery" },
  { key: "map-switch-topography", label: "Topography" },
];

const BASEMAP_BACKGROUND = '#d7dce0';

const createXyzLayer = (url, attributions, opaque = true) => new TileLayer({
  title: "Basemap",
  className: 'ol-basemap',
  zIndex: 0,
  background: BASEMAP_BACKGROUND,
  source: new XYZ({
    url,
    attributions,
    maxZoom: 21,
    transition: 0,
    opaque,
  }),
});

const createOsmLayer = () => new TileLayer({
  title: "Basemap",
  className: 'ol-basemap',
  zIndex: 0,
  background: BASEMAP_BACKGROUND,
  source: new OSM({
    transition: 0,
    opaque: true,
  }),
});

export const createBasemapLayer = (basemap, googleApiKey) => {
  switch (basemap) {
    case "map-switch-default":
      return createXyzLayer(
        "https://abcd.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
        "&copy; <a href='http://osm.org'>OpenStreetMap</a> contributors, &copy; <a href='https://carto.com/'>CARTO</a>",
      );

    case "map-switch-basic":
      if (!googleApiKey) {
        return createOsmLayer();
      }
      // Hybrid satellite (s,h): field imagery + labels. JPEG tiles otherwise
      // leave a black canvas until the first images arrive.
      return createXyzLayer(
        `https://mt1.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}&key=${googleApiKey}`,
        '© Google',
      );

    case "map-switch-topography":
      return createXyzLayer(
        "https://tile.opentopomap.org/{z}/{x}/{y}.png",
        "&copy;  <a href='https://openstreetmap.org/copyright'>OpenStreetMap</a> contributors, <a href='http://viewfinderpanoramas.org'>SRTM</a> | map style: © <a href='https://opentopomap.org'>OpenTopoMap</a> (<a href='https://creativecommons.org/licenses/by-sa/3.0/'>CC-BY-SA</a>)",
      );

    case "map-switch-satellite":
      if (!googleApiKey) {
        return createOsmLayer();
      }
      return createXyzLayer(
        `https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}&key=${googleApiKey}`,
        '© Google',
      );

    default:
      return createOsmLayer();
  }
};

export const handleSearch = async (query, mapInstance, googleApiKey, options = {}) => {
  if (!query) return false;
  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${googleApiKey}`
    );
    const data = await response.json();
    if (data.status === 'OK' && data.results.length > 0) {
      const location = data.results[0].geometry.location;
      const viewport = data.results[0].geometry.viewport;
      const view = mapInstance.getView();
      if (viewport?.southwest && viewport?.northeast) {
        const extent = transformExtent(
          [
            viewport.southwest.lng,
            viewport.southwest.lat,
            viewport.northeast.lng,
            viewport.northeast.lat,
          ],
          'EPSG:4326',
          'EPSG:3857',
        );
        view.fit(extent, {
          duration: 800,
          padding: [72, 72, 72, 72],
          maxZoom: 17,
        });
      } else {
        view.animate({
          center: fromLonLat([location.lng, location.lat]),
          zoom: 16,
          duration: 800,
        });
      }
      return true;
    }
    if (!options.silent) {
      alert('Alamat tidak ditemukan.');
    }
    return false;
  } catch (error) {
    console.error('Google Geocoding error:', error);
    return false;
  }
};

const looksLikeLonLat = (x, y) => Math.abs(Number(x)) <= 180 && Math.abs(Number(y)) <= 90;

export const toMapCoordinate = (x, y) => {
  const east = Number(x);
  const north = Number(y);
  if (!Number.isFinite(east) || !Number.isFinite(north)) return null;
  return looksLikeLonLat(east, north) ? fromLonLat([east, north]) : [east, north];
};

export const boundsToMapExtent = (bounds) => {
  if (!bounds) return null;
  const minX = Number(bounds.minX);
  const minY = Number(bounds.minY);
  const maxX = Number(bounds.maxX);
  const maxY = Number(bounds.maxY);
  if (![minX, minY, maxX, maxY].every(Number.isFinite)) return null;
  if (looksLikeLonLat(minX, minY) && looksLikeLonLat(maxX, maxY)) {
    return transformExtent([minX, minY, maxX, maxY], 'EPSG:4326', 'EPSG:3857');
  }
  return [minX, minY, maxX, maxY];
};

export const fitViewToExtent = (view, extent, options = {}) => {
  if (!view || !extent || extent.some((value) => !Number.isFinite(value))) return false;
  const buffered = buffer(extent, options.bufferMeters ?? 80);
  view.fit(buffered, {
    duration: options.duration ?? 700,
    padding: options.padding ?? [72, 72, 72, 72],
    maxZoom: options.maxZoom ?? 18,
  });
  return true;
}; 