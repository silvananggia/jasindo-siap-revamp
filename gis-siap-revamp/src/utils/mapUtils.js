import { fromLonLat } from 'ol/proj';
import TileLayer from 'ol/layer/Tile';
import XYZ from 'ol/source/XYZ';
import OSM from 'ol/source/OSM';

export const basemapOptions = [
  { key: "map-switch-default", label: "Plain" },
  { key: "map-switch-basic", label: "Road" },
  { key: "map-switch-satellite", label: "Imagery" },
  { key: "map-switch-topography", label: "Topography" },
];

export const createBasemapLayer = (basemap, googleApiKey) => {
  
  switch (basemap) {
    case "map-switch-default":
      return new TileLayer({
        title: "Basemap",
        source: new XYZ({
          url: "https://abcd.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
          attributions: "&copy; <a href='http://osm.org'>OpenStreetMap</a> contributors, &copy; <a href='https://carto.com/'>CARTO</a>",
        }),
      });

    case "map-switch-basic":
      if (!googleApiKey) {
        return new TileLayer({
          title: "Basemap",
          source: new OSM(),
        });
      }
      return new TileLayer({
        title: "Basemap",
        source: new XYZ({
          url: `https://mt1.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}&key=${googleApiKey}`,
          attributions: '© Google',
        }),
      });

    case "map-switch-topography":
      return new TileLayer({
        title: "Basemap",
        source: new XYZ({
          url: "https://tile.opentopomap.org/{z}/{x}/{y}.png",
          attributions: "&copy;  <a href='https://openstreetmap.org/copyright'>OpenStreetMap</a> contributors, <a href='http://viewfinderpanoramas.org'>SRTM</a> | map style: © <a href='https://opentopomap.org'>OpenTopoMap</a> (<a href='https://creativecommons.org/licenses/by-sa/3.0/'>CC-BY-SA</a>)",
        }),
      });

    case "map-switch-satellite":
      if (!googleApiKey) {
        return new TileLayer({
          title: "Basemap",
          source: new OSM(),
        });
      }
      return new TileLayer({
        title: "Basemap",
        source: new XYZ({
          url: `https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}&key=${googleApiKey}`,
          attributions: '© Google',
        }),
      });

    default:
      return new TileLayer({
        title: "Basemap",
        source: new OSM(),
      });
  }
};

export const handleSearch = async (query, mapInstance, googleApiKey) => {
  if (!query) return;
  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${googleApiKey}`
    );
    const data = await response.json();
    if (data.status === 'OK' && data.results.length > 0) {
      const location = data.results[0].geometry.location;
      mapInstance.getView().animate({
        center: fromLonLat([location.lng, location.lat]),
        zoom: 17,
        duration: 1000,
      });
    } else {
      alert('Alamat tidak ditemukan.');
    }
  } catch (error) {
    console.error('Google Geocoding error:', error);
  }
}; 