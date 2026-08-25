import 'ol/ol.css';
import "ol-ext/dist/ol-ext.css";
import '../../styles/ol-overrides.css';
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Autocomplete } from '@react-google-maps/api';
import { useGooglePlacesReady } from '../../hooks/useGooglePlacesReady';
import { useAuthReady } from '../../hooks/useAuthReady';
import { Box, Tabs, Tab, IconButton, Snackbar, Alert, useTheme, useMediaQuery, Drawer, Fab, Button, CircularProgress, Typography } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ListIcon from '@mui/icons-material/List';
import LayersIcon from '@mui/icons-material/Layers';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import OpenWithIcon from '@mui/icons-material/OpenWith';
import RefreshIcon from '@mui/icons-material/Refresh';
import PentagonIcon from '@mui/icons-material/Pentagon';
import PlaceIcon from '@mui/icons-material/Place';
import UndoIcon from '@mui/icons-material/Undo';
import CheckIcon from '@mui/icons-material/Check';
import Swal from 'sweetalert2';
import { fromLonLat, toLonLat, transformExtent } from 'ol/proj';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import GeoJSON from 'ol/format/GeoJSON';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import { Draw, Modify, Snap, DoubleClickZoom } from 'ol/interaction';
import { click, doubleClick, never, primaryAction } from 'ol/events/condition';
import { Style, Fill, Stroke, Circle as CircleStyle, Text } from 'ol/style';
import { getArea as getGeodesicArea } from 'ol/sphere';
import { useMap } from '../../hooks/useMap';
import { useAuthListener } from '../../hooks/useAuthListener';
import { useLocation } from 'react-router-dom';
import useSwipeGesture from '../../hooks/useSwipeGesture';
import { createBasemapLayer } from '../../utils/mapUtils';
import { handleSearch, boundsToMapExtent, fitViewToExtent, toMapCoordinate } from '../../utils/mapUtils';
import { createPetak, getPetakUser, deletePetak, getPetakById, getCenterPetakUser } from '../../actions/petakActions';
import { processPetakPoints } from '../../services/petakGenService';
import PetakService from '../../services/petakService';
import { getDetailPeserta } from '../../actions/anggotaActions';
import BasemapSwitcher from './BasemapSwitcher';
import GeolocationControl from './GeolocationControl';
import Spinner from '../Spinner/Loading-spinner';
import DataPanel from './DataPanel';
import LayerPanel from './LayerPanel';

const geojsonFormat = new GeoJSON();

const addZDimension = (geometry) => {
  if (!geometry) return geometry;
  if (geometry.type === 'Point') {
    geometry.coordinates = geometry.coordinates.length > 2
      ? geometry.coordinates
      : [...geometry.coordinates, 0];
  } else if (geometry.type === 'Polygon') {
    geometry.coordinates = geometry.coordinates.map((ring) =>
      ring.map((coord) => (coord.length > 2 ? coord : [...coord, 0]))
    );
  } else if (geometry.type === 'MultiPolygon') {
    geometry.coordinates = geometry.coordinates.map((polygon) =>
      polygon.map((ring) =>
        ring.map((coord) => (coord.length > 2 ? coord : [...coord, 0]))
      )
    );
  }
  return geometry;
};

const getPointStyle = (feature) => {
  const label = String(feature.get('id') || feature.getId() || '');
  return new Style({
    image: new CircleStyle({
      radius: 4,
      fill: new Fill({ color: '#1976d2' }),
      stroke: new Stroke({ color: '#ffffff', width: 1.5 }),
    }),
    text: new Text({
      text: label,
      font: 'bold 9px Arial, sans-serif',
      fill: new Fill({ color: '#ffffff' }),
      offsetY: -10,
      stroke: new Stroke({ color: '#1976d2', width: 2 }),
    }),
  });
};

const VERTEX_DOT_LIMIT = 24;

const getOwnedPointStyle = (zoomRef) => (feature) => {
  const mine = Boolean(feature.get('mine'));
  const zoom = zoomRef?.current || 0;
  const styles = [
    new Style({
      image: new CircleStyle({
        radius: mine ? 6 : 5,
        fill: new Fill({ color: mine ? '#2E7D32' : '#F9A825' }),
        stroke: new Stroke({ color: '#ffffff', width: 1.5 }),
      }),
    }),
  ];
  if (zoom >= 16.5) {
    styles.push(
      new Style({
        text: new Text({
          text: mine ? 'Peserta' : 'Terdaftar',
          font: 'bold 9px Arial, sans-serif',
          offsetY: -12,
          fill: new Fill({ color: mine ? '#1B5E20' : '#E65100' }),
          stroke: new Stroke({ color: '#ffffff', width: 3 }),
        }),
      })
    );
  }
  return styles;
};

const createSavedPetakStyle = (hoveredIdRef) => (feature) => {
  const id = String(feature.get('idpetak') || feature.get('localId') || feature.getId() || '');
  const hovered = Boolean(hoveredIdRef?.current && String(hoveredIdRef.current) === id);
  const geomType = feature.getGeometry()?.getType();
  if (geomType === 'Point') {
    return new Style({
      image: new CircleStyle({
        radius: hovered ? 8 : 6,
        fill: new Fill({ color: hovered ? '#1565C0' : '#2E7D32' }),
        stroke: new Stroke({ color: '#ffffff', width: 2 }),
      }),
      text: new Text({
        text: hovered ? id : 'Tersimpan',
        font: 'bold 9px Arial, sans-serif',
        offsetY: -12,
        fill: new Fill({ color: hovered ? '#0D47A1' : '#1B5E20' }),
        stroke: new Stroke({ color: '#ffffff', width: 3 }),
      }),
    });
  }
  return new Style({
    fill: new Fill({
      color: hovered ? 'rgba(21, 101, 192, 0.38)' : 'rgba(46, 125, 50, 0.28)',
    }),
    stroke: new Stroke({
      color: hovered ? '#1565C0' : '#2E7D32',
      width: hovered ? 4 : 2.5,
    }),
    text: new Text({
      text: id,
      font: 'bold 10px Arial, sans-serif',
      fill: new Fill({ color: '#ffffff' }),
      stroke: new Stroke({ color: hovered ? '#0D47A1' : '#1B5E20', width: 3 }),
      overflow: true,
    }),
  });
};

const collectPolygonVertices = (geometry) => {
  if (!geometry) return [];
  const coordinates = [];
  const type = geometry.getType();
  if (type === 'Polygon') {
    geometry.getCoordinates().forEach((ring) => {
      ring.slice(0, -1).forEach((coord) => coordinates.push(coord));
    });
  } else if (type === 'MultiPolygon') {
    geometry.getCoordinates().forEach((polygon) => {
      polygon.forEach((ring) => {
        ring.slice(0, -1).forEach((coord) => coordinates.push(coord));
      });
    });
  }
  return coordinates;
};

const vertexHandleStyle = new Style({
  image: new CircleStyle({
    radius: 6,
    fill: new Fill({ color: '#ffffff' }),
    stroke: new Stroke({ color: '#FF5733', width: 2 }),
  }),
});

const vertexDeleteHandleStyle = new Style({
  image: new CircleStyle({
    radius: 8,
    fill: new Fill({ color: '#D32F2F' }),
    stroke: new Stroke({ color: '#ffffff', width: 2 }),
  }),
});

const createGeneratedPolygonStyle = (deleteModeRef, hoveredIdRef, zoomRef) => (feature) => {
  const id = String(feature.get('localId') || feature.getId() || '');
  const hovered = Boolean(hoveredIdRef?.current && String(hoveredIdRef.current) === id);
  const deleteMode = Boolean(deleteModeRef?.current);
  const zoom = zoomRef?.current || 0;
  const styles = [
    new Style({
      stroke: new Stroke({
        color: hovered ? '#1565C0' : deleteMode ? '#D32F2F' : '#FF5733',
        width: hovered ? 4 : 2.5,
      }),
      fill: new Fill({
        color: hovered
          ? 'rgba(21, 101, 192, 0.42)'
          : deleteMode
            ? 'rgba(211, 47, 47, 0.16)'
            : 'rgba(255, 87, 51, 0.18)',
      }),
      text: new Text({
        text: id,
        font: 'bold 10px Arial, sans-serif',
        fill: new Fill({ color: '#ffffff' }),
        stroke: new Stroke({ color: hovered ? '#0D47A1' : '#C62828', width: 3 }),
        overflow: true,
      }),
    }),
  ];

  const vertices = collectPolygonVertices(feature.getGeometry());
  const dense = vertices.length > VERTEX_DOT_LIMIT;
  const showDots = (hovered || deleteMode) && (!dense || zoom >= 17);

  if (showDots) {
    vertices.forEach((coord) => {
      styles.push(
        new Style({
          geometry: new Point(coord),
          image: new CircleStyle({
            radius: deleteMode ? 7 : 5,
            fill: new Fill({ color: deleteMode ? '#D32F2F' : '#ffffff' }),
            stroke: new Stroke({
              color: hovered ? '#1565C0' : deleteMode ? '#FFFFFF' : '#FF5733',
              width: 2,
            }),
          }),
        })
      );
    });
  }

  return styles;
};

const buildPersilId = (lon, lat) => {
  const lonDir = lon >= 0 ? 'T' : 'B';
  const latDir = lat < 0 ? 'S' : 'U';
  const lonPart = Math.round(Math.abs(Number(lon)) * 1e5);
  const latPart = Math.round(Math.abs(Number(lat)) * 1e5);
  return `${lonDir}${lonPart}_${latDir}${latPart}`;
};

const getFeatureLonLat = (feature) => {
  const geometry = feature.getGeometry();
  if (!geometry) return null;
  const type = geometry.getType();
  let coordinate;
  if (type === 'Point') {
    coordinate = geometry.getCoordinates();
  } else if (type === 'Polygon' && typeof geometry.getInteriorPoint === 'function') {
    coordinate = geometry.getInteriorPoint().getCoordinates();
  } else if (type === 'MultiPolygon' && typeof geometry.getInteriorPoints === 'function') {
    coordinate = geometry.getInteriorPoints().getCoordinates()[0];
  } else {
    const extent = geometry.getExtent();
    coordinate = [(extent[0] + extent[2]) / 2, (extent[1] + extent[3]) / 2];
  }
  return toLonLat(coordinate);
};

const geometryToPercil = (feature, localId) => {
  const geometryClone = feature.getGeometry().clone();
  geometryClone.transform('EPSG:3857', 'EPSG:4326');
  const geometryGeoJSON = addZDimension(geojsonFormat.writeGeometryObject(geometryClone));
  const areaM2 = getGeodesicArea(geometryClone, { projection: 'EPSG:4326' });
  const area = Number.isFinite(areaM2) ? areaM2 / 10000 : 0;
  const apiId = feature.get('id') ?? feature.getId();
  let lon = null;
  let lat = null;
  const type = geometryClone.getType();
  let center;
  if (type === 'Polygon' && typeof geometryClone.getInteriorPoint === 'function') {
    center = geometryClone.getInteriorPoint().getCoordinates();
  } else if (type === 'MultiPolygon' && typeof geometryClone.getInteriorPoints === 'function') {
    center = geometryClone.getInteriorPoints().getCoordinates()[0];
  } else {
    const extent = geometryClone.getExtent();
    center = [(extent[0] + extent[2]) / 2, (extent[1] + extent[3]) / 2];
  }
  if (Array.isArray(center) && center.length >= 2) {
    lon = Number(center[0]);
    lat = Number(center[1]);
  }

  return {
    id: localId,
    psid: localId,
    petak_id: localId,
    petakid: localId,
    idpetak: localId,
    area,
    lon,
    lat,
    longitude: lon,
    latitude: lat,
    geometry: geometryGeoJSON,
    sourcePointId: apiId,
  };
};

const pointToPercil = (point) => {
  const lon = Number(point.lon);
  const lat = Number(point.lat);
  const localId = point.persilId || buildPersilId(lon, lat);
  return {
    id: localId,
    psid: localId,
    petak_id: localId,
    petakid: localId,
    idpetak: localId,
    area: 0,
    lon,
    lat,
    longitude: lon,
    latitude: lat,
    isPointOnly: true,
    geometry: {
      type: 'Point',
      coordinates: [lon, lat, 0],
    },
  };
};

const MapRegister = () => {

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));

  useAuthListener();

  const dispatch = useDispatch();
  const location = useLocation();
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);
  const { loading, errmessage } = useSelector((state) => state.auth);
  const { loading: petakLoading } = useSelector((state) => state.petak);
  const listPetak = useSelector((state) => state.petak.petaklist);
  const { isAuthReady, token: authToken } = useAuthReady();

  // Get nik and idKelompok from URL parameters

  const nikFromUrl = new URLSearchParams(location.search).get('nik') || '';
  const idKelompokFromUrl = new URLSearchParams(location.search).get('idkelompok') || '';



  const [isDataLoaded, setIsDataLoaded] = useState(!!(nikFromUrl || idKelompokFromUrl));
  const [token, setToken] = useState(authToken);
  const [isFetchingDetail, setIsFetchingDetail] = useState(false);
  // Store form response data from API
  const [formResponse, setFormResponse] = useState({
    nik: nikFromUrl,
    idKelompok: idKelompokFromUrl,
    nama: '',
    address: '',
    idkab: '',
    idkec: '',
    luasLahan: '',
    jmlPetak: '',
    musimTanam: '',
    tanggalTanam: '',
    tanggalPanen: '',
    noPolis: '',
    idKlaim: ''
  });

  // Listen for token from postMessage
  useEffect(() => {
    const handleMessage = (e) => {
      if (e.data && e.data.token) {
        setToken(e.data.token);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Update formResponse when URL parameters change
  useEffect(() => {
    
    const urlParams = new URLSearchParams(location.search);
    const nik = urlParams.get('nik') || '';
    const idKelompok = urlParams.get('idkelompok') || '';
    
    if (nik || idKelompok) {
      setFormResponse(prev => ({
        ...prev,
        ...(nik && { nik }),
        ...(idKelompok && { idKelompok })
      }));
      setIsDataLoaded(true);
    }
  }, [location.search]);

  // Fetch detail peserta when nik, idKelompok, and token are available
  useEffect(() => {
    const fetchDetailPeserta = async () => {
      const currentNik = formResponse.nik || nikFromUrl;
      const currentIdKelompok = formResponse.idKelompok || idKelompokFromUrl;
      
      if (currentNik && currentIdKelompok && isAuthReady && (token || authToken) && !isFetchingDetail) {
        setIsFetchingDetail(true);
        try {
          const result = await dispatch(getDetailPeserta(currentIdKelompok, currentNik, token || authToken));
          
          // Handle nested response structure: result.data.data.status and result.data.data.data
          if (result && result.data && result.data.status === 200 && result.data.data) {
            const data = result.data.data;
            // Normalize luasLahan: API might return luasLahan, luas_lahan, or luas
            const luasLahanFromApi = data.luasLahan ?? data.luas_lahan ?? data.luas;
            const hasLuasLahan = luasLahanFromApi !== undefined && luasLahanFromApi !== null && luasLahanFromApi !== '';
            // Store the API response data directly
            setFormResponse(prev => ({
              ...prev,
              nik: currentNik,
              idKelompok: currentIdKelompok,
              nama: data.nama || prev.nama,
              address: data.address || prev.address,
              idkab: data.idkab || prev.idkab,
              idkec: data.idkec || prev.idkec,
              luasLahan: hasLuasLahan ? String(luasLahanFromApi) : prev.luasLahan,
              jmlPetak: data.jmlPetak || prev.jmlPetak,
              musimTanam: data.musimTanam || prev.musimTanam,
              tanggalTanam: data.tanggalTanam || prev.tanggalTanam,
              tanggalPanen: data.tanggalPanen || prev.tanggalPanen,
              noPolis: data.noPolis || prev.noPolis,
              idKlaim: data.idKlaim || prev.idKlaim
            }));
            
            // Update search input when address is loaded
            if (data.address) {
              setSearchInput(data.address);
            }
            
            setIsDataLoaded(true);
          }
        } catch (error) {
          console.error('Error fetching detail peserta:', error);
        } finally {
          setIsFetchingDetail(false);
        }
      }
    };

    fetchDetailPeserta();
  }, [formResponse.nik, formResponse.idKelompok, token, authToken, isAuthReady, dispatch, nikFromUrl, idKelompokFromUrl]);

  // Keep local token in sync with Redux auth (iframe postMessage may arrive later)
  useEffect(() => {
    if (authToken && authToken !== token) {
      setToken(authToken);
    }
  }, [authToken, token]);
  
  // Create a ref to store the current jmlPetak value to avoid closure issues
  const jmlPetakRef = useRef(0);
  
  // Update jmlPetakRef when formResponse changes
  useEffect(() => {
    // console.log('MapRegister - useEffect triggered with formResponse.jmlPetak:', formResponse.jmlPetak, 'type:', typeof formResponse.jmlPetak);
    if (formResponse.jmlPetak) {
      const parsed = parseInt(formResponse.jmlPetak);
      // console.log('MapRegister - Parsed value:', parsed, 'isNaN:', isNaN(parsed), 'parsed > 0:', parsed > 0);
      if (!isNaN(parsed) && parsed > 0) {
        // console.log('MapRegister - Updating jmlPetakRef to:', parsed);
        jmlPetakRef.current = parsed;
      }
    }
  }, [formResponse.jmlPetak]);

  // Initialize all form values as reactive variables using useMemo from formResponse
  const formDataValues = useMemo(() => {
    // console.log('formDataValues useMemo - CALLED with formResponse:', formResponse);
    // console.log('formDataValues useMemo - formResponse.jmlPetak:', formResponse.jmlPetak, 'type:', typeof formResponse.jmlPetak);
    
    // Properly parse jmlPetak from string to number
    let parsedJmlPetak = 0;
    if (formResponse.jmlPetak) {
      const parsed = parseInt(formResponse.jmlPetak);
      parsedJmlPetak = isNaN(parsed) ? 0 : parsed;
    }
    
    let parsedLuasLahan = 0;
    if (formResponse.luasLahan) {
      const parsed = parseFloat(formResponse.luasLahan);
      parsedLuasLahan = isNaN(parsed) ? 0 : parsed;
    }
    
    // Return the form response data with parsed values
    return {
      nik: formResponse.nik || '',
      nama: formResponse.nama || '',
      address: formResponse.address || '',
      idkab: formResponse.idkab || '',
      idkec: formResponse.idkec || '',
      jmlPetak: parsedJmlPetak,
      luasLahan: parsedLuasLahan,
      noPolis: formResponse.noPolis || '',
      idKelompok: formResponse.idKelompok || '',
      idKlaim: formResponse.idKlaim || '',
      musimTanam: formResponse.musimTanam || '',
      tanggalTanam: formResponse.tanggalTanam || '',
      tanggalPanen: formResponse.tanggalPanen || ''
    };
  }, [formResponse]);

  // Destructure for easier access
  const { nik, nama, address, jmlPetak, luasLahan, noPolis, idKelompok, idKlaim } = formDataValues;

  const [searchInput, setSearchInput] = useState('');
  const [selectedPercils, setSelectedPercils] = useState([]);
  const [autocomplete, setAutocomplete] = useState(null);
  const [selectedBasemap, setSelectedBasemap] = useState("map-switch-basic");
  const [tabValue, setTabValue] = useState(0);
  const [isPolygonVisible, setIsPolygonVisible] = useState(true);
  const [polygonOpacity, setPolygonOpacity] = useState(1);
  const [totalArea, setTotalArea] = useState(0);
  const [isValid, setIsValid] = useState(true);
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [panelOpen, setPanelOpen] = useState(!isMobile); // Panel closed by default on mobile
  const [pointCount, setPointCount] = useState(0);
  const [markedPoints, setMarkedPoints] = useState([]);
  const [isProcessingPoints, setIsProcessingPoints] = useState(false);
  const googlePlacesReady = useGooglePlacesReady();

  const selectedPercilsRef = useRef([]);
  const remainingSlotsRef = useRef(0);
  const pointsSourceRef = useRef(null);
  const generatedSourceRef = useRef(null);
  const generatedLayerRef = useRef(null);
  const ownedSourceRef = useRef(null);
  const ownedLayerRef = useRef(null);
  const savedSourceRef = useRef(null);
  const savedLayerRef = useRef(null);
  const loadOwnedPointsRef = useRef(null);
  const loadSavedGeometriesRef = useRef(null);
  const nikRef = useRef(nik);
  const isModifyingRef = useRef(false);
  const pointIdRef = useRef(1);
  const vertexDeleteModeRef = useRef(false);
  const [vertexDeleteMode, setVertexDeleteMode] = useState(false);
  const [petakFetched, setPetakFetched] = useState(false);
  const drawModeRef = useRef(false);
  const [drawMode, setDrawMode] = useState(false);
  const [drawFallback, setDrawFallback] = useState(false);
  const drawInteractionRef = useRef(null);
  const modifyInteractionRef = useRef(null);
  const hoveredPetakIdRef = useRef(null);
  const mapZoomRef = useRef(0);
  const [hoveredPetakId, setHoveredPetakId] = useState(null);
  const listPetakRef = useRef(listPetak);
  const isAuthReadyRef = useRef(isAuthReady);

  useEffect(() => {
    isAuthReadyRef.current = isAuthReady;
    if (isAuthReady) {
      loadSavedGeometriesRef.current?.();
      loadOwnedPointsRef.current?.();
    }
  }, [isAuthReady, authToken]);

  const setHoveredPetak = useCallback((id) => {
    const next = id ? String(id) : null;
    if (hoveredPetakIdRef.current === next) return;
    hoveredPetakIdRef.current = next;
    setHoveredPetakId(next);
    generatedLayerRef.current?.changed();
    savedLayerRef.current?.changed();
  }, []);

  // Swipe gesture handlers
  const handleSwipeLeft = () => {
    if (isMobile && panelOpen) {
      setPanelOpen(false);
    }
  };

  const handleSwipeRight = () => {
    if (isMobile && !panelOpen) {
      setPanelOpen(true);
    }
  };

  // Use swipe gesture hook
  useSwipeGesture(handleSwipeLeft, handleSwipeRight);

  useEffect(() => {
    selectedPercilsRef.current = selectedPercils;
  }, [selectedPercils]);

  const remainingSlots = Math.max(
    0,
    (jmlPetak || 0) - (listPetak || []).length - selectedPercils.length
  );

  useEffect(() => {
    remainingSlotsRef.current = remainingSlots;
  }, [remainingSlots]);

  useEffect(() => {
    listPetakRef.current = listPetak;
  }, [listPetak]);

  useEffect(() => {
    nikRef.current = nik;
  }, [nik]);

  useEffect(() => {
    loadOwnedPointsRef.current?.();
    loadSavedGeometriesRef.current?.();
  }, [listPetak, nik, petakFetched]);

  const syncPointsFromSource = useCallback((source) => {
    if (!source) {
      setMarkedPoints([]);
      setPointCount(0);
      pointIdRef.current = 1;
      return;
    }
    const features = [...source.getFeatures()].sort(
      (a, b) => Number(a.get('id') || a.getId()) - Number(b.get('id') || b.getId())
    );
    features.forEach((feature, index) => {
      const id = index + 1;
      feature.set('id', id);
      feature.setId(id);
    });
    pointIdRef.current = features.length + 1;
    setPointCount(features.length);
    setMarkedPoints(
      features.map((feature) => {
        const [lon, lat] = toLonLat(feature.getGeometry().getCoordinates());
        return {
          id: feature.get('id'),
          lon,
          lat,
          persilId: buildPersilId(lon, lat),
        };
      })
    );
  }, []);

  // Martin petak tiles (petak_kabupaten) intentionally disabled on register map
  const { mapRef, mapInstance, polygonLayerRef, basemapLayerRef, mapReady } = useMap(
    isAuthenticated,
    process.env.REACT_APP_GOOGLE_API_KEY,
    () => {},
    '',
    { enableFeatureClick: false, initialZoom: 5, initialCenter: [118, -2] },
  );

  useEffect(() => {
    const map = mapInstance.current;
    if (!map || !mapReady || !isAuthenticated) return;

    const pointsSource = new VectorSource();
    const generatedSource = new VectorSource();
    pointsSourceRef.current = pointsSource;
    generatedSourceRef.current = generatedSource;

    const pointsLayer = new VectorLayer({
      className: 'ol-register-points',
      source: pointsSource,
      style: getPointStyle,
      zIndex: 20,
    });

    mapZoomRef.current = map.getView().getZoom() || 0;
    const generatedLayer = new VectorLayer({
      className: 'ol-register-generated',
      source: generatedSource,
      style: createGeneratedPolygonStyle(vertexDeleteModeRef, hoveredPetakIdRef, mapZoomRef),
      zIndex: 15,
    });
    generatedLayerRef.current = generatedLayer;

    const ownedSource = new VectorSource();
    ownedSourceRef.current = ownedSource;
    const ownedLayer = new VectorLayer({
      className: 'ol-register-owned',
      source: ownedSource,
      style: getOwnedPointStyle(mapZoomRef),
      zIndex: 12,
    });
    ownedLayerRef.current = ownedLayer;

    const savedSource = new VectorSource();
    savedSourceRef.current = savedSource;
    const savedLayer = new VectorLayer({
      className: 'ol-register-saved',
      source: savedSource,
      style: createSavedPetakStyle(hoveredPetakIdRef),
      zIndex: 13,
    });
    savedLayerRef.current = savedLayer;

    map.addLayer(pointsLayer);
    map.addLayer(generatedLayer);
    map.addLayer(ownedLayer);
    map.addLayer(savedLayer);

    const doubleClickZoom = map.getInteractions().getArray().find(
      (interaction) => interaction instanceof DoubleClickZoom
    );
    if (doubleClickZoom) {
      map.removeInteraction(doubleClickZoom);
    }

    const modify = new Modify({
      source: generatedSource,
      pixelTolerance: 18,
      condition: primaryAction,
      insertVertexCondition: () => !vertexDeleteModeRef.current,
      deleteCondition: (event) => (
        vertexDeleteModeRef.current ? click(event) : doubleClick(event)
      ),
      style: () => (vertexDeleteModeRef.current ? vertexDeleteHandleStyle : vertexHandleStyle),
    });
    const draw = new Draw({
      source: generatedSource,
      type: 'Polygon',
      minPoints: 3,
      freehandCondition: never,
      style: [
        new Style({
          fill: new Fill({ color: 'rgba(25, 118, 210, 0.12)' }),
          stroke: new Stroke({ color: '#1976d2', width: 2, lineDash: [6, 4] }),
        }),
        new Style({
          image: new CircleStyle({
            radius: 5,
            fill: new Fill({ color: '#1976d2' }),
            stroke: new Stroke({ color: '#ffffff', width: 1 }),
          }),
        }),
      ],
    });
    draw.setActive(false);
    const snap = new Snap({
      source: generatedSource,
      pixelTolerance: 14,
    });
    map.addInteraction(modify);
    map.addInteraction(draw);
    map.addInteraction(snap);
    modifyInteractionRef.current = modify;
    drawInteractionRef.current = draw;

    draw.on('drawend', (event) => {
      const feature = event.feature;
      const remaining = remainingSlotsRef.current;
      if (remaining <= 0) {
        window.setTimeout(() => generatedSource.removeFeature(feature), 0);
        setAlertMessage('Kuota petak sudah terisi. Hapus petak terpilih untuk menggambar petak baru.');
        setAlertOpen(true);
        drawModeRef.current = false;
        setDrawMode(false);
        draw.setActive(false);
        modify.setActive(true);
        return;
      }
      const lonLat = getFeatureLonLat(feature);
      const usedIds = new Set([
        ...selectedPercilsRef.current.map((item) => String(item.id)),
        ...(listPetakRef.current || []).map((item) => String(item.idpetak || item.id || '')),
      ]);
      let persilId = lonLat ? buildPersilId(lonLat[0], lonLat[1]) : `MANUAL_${Date.now()}`;
      if (usedIds.has(persilId)) {
        let suffix = 2;
        while (usedIds.has(`${persilId}_${suffix}`)) suffix += 1;
        persilId = `${persilId}_${suffix}`;
      }
      feature.set('localId', persilId);
      feature.setId(persilId);
      feature.set('manual', true);
      setSelectedPercils((prev) => [...prev, geometryToPercil(feature, persilId)]);
      if (remaining <= 1) {
        window.setTimeout(() => {
          draw.setActive(false);
          modify.setActive(true);
          drawModeRef.current = false;
          setDrawMode(false);
        }, 0);
      }
    });

    modify.on('modifystart', () => {
      isModifyingRef.current = true;
    });

    modify.on('modifyend', () => {
      const updated = generatedSource.getFeatures().map((feature) => {
        const localId = feature.get('localId') || feature.getId();
        return geometryToPercil(feature, localId);
      });
      setSelectedPercils(updated);
      generatedLayer.changed();
      setTimeout(() => {
        isModifyingRef.current = false;
      }, 0);
    });

    const handleMapClick = (evt) => {
      if (isModifyingRef.current || evt.dragging || vertexDeleteModeRef.current || drawModeRef.current) return;

      const hitPoint = map.forEachFeatureAtPixel(evt.pixel, (feature, layer) => {
        if (layer === pointsLayer) return feature;
        return undefined;
      }, { hitTolerance: 8 });

      if (hitPoint) {
        pointsSource.removeFeature(hitPoint);
        syncPointsFromSource(pointsSource);
        return;
      }

      const hitOwned = map.forEachFeatureAtPixel(evt.pixel, (feature, layer) => {
        if (layer === ownedLayer || layer === savedLayer) return feature;
        return undefined;
      }, { hitTolerance: 8 });
      if (hitOwned) {
        const ownedId = hitOwned.get('idpetak') || '';
        setAlertMessage(
          hitOwned.get('mine')
            ? `Petak ${ownedId} sudah terdaftar untuk peserta ini.`
            : `Petak ${ownedId} sudah ada pemiliknya.`
        );
        setAlertOpen(true);
        return;
      }

      const hitPolygon = map.forEachFeatureAtPixel(evt.pixel, (feature, layer) => {
        if (layer === generatedLayer) return feature;
        return undefined;
      });
      if (hitPolygon) return;

      const remaining = remainingSlotsRef.current;
      if (remaining <= 0 || pointsSource.getFeatures().length >= remaining) {
        setAlertMessage(
          remaining <= 0
            ? 'Kuota petak sudah terisi. Hapus petak terpilih untuk menandai titik baru.'
            : `Jumlah titik harus sesuai sisa petak (${remaining}).`
        );
        setAlertOpen(true);
        return;
      }

      const nextId = pointIdRef.current;
      pointIdRef.current += 1;
      const feature = new Feature({
        geometry: new Point(evt.coordinate),
        id: nextId,
      });
      feature.setId(nextId);
      pointsSource.addFeature(feature);
      syncPointsFromSource(pointsSource);
    };

    const handleMoveEnd = () => {
      mapZoomRef.current = map.getView().getZoom() || 0;
      generatedLayer.changed();
      ownedLayer.changed();
    };
    map.on('moveend', handleMoveEnd);

    let ownedLoadTimer;
    let ownedLoadSeq = 0;
    const loadOwnedPoints = async () => {
      if (!isAuthReadyRef.current) return;
      const source = ownedSourceRef.current;
      if (!source || !map.getSize()) return;
      const seq = ++ownedLoadSeq;
      const zoom = map.getView().getZoom() || 0;
      mapZoomRef.current = zoom;
      const extent3857 = map.getView().calculateExtent(map.getSize());
      const [minx, miny, maxx, maxy] = transformExtent(extent3857, 'EPSG:3857', 'EPSG:4326');

      const features = [];
      const seen = new Set();
      const addOwned = (idpetak, lon, lat, mine) => {
        if (mine) return;
        const lonNum = Number(lon);
        const latNum = Number(lat);
        if (!Number.isFinite(lonNum) || !Number.isFinite(latNum)) return;
        const key = String(idpetak || `${lonNum.toFixed(6)},${latNum.toFixed(6)}`);
        if (seen.has(key)) return;
        seen.add(key);
        const feature = new Feature({
          geometry: new Point(fromLonLat([lonNum, latNum])),
          idpetak: key,
          mine: false,
          owned: true,
        });
        feature.setId(`owned-${key}`);
        features.push(feature);
      };

      if (zoom >= 13) {
        try {
          const res = await PetakService.getPetakPointsByExtent({
            minx,
            miny,
            maxx,
            maxy,
            nik: nikRef.current,
          });
          if (seq !== ownedLoadSeq) return;
          (res.data?.data || []).forEach((item) => {
            addOwned(item.idpetak || item.id, item.longitude, item.latitude, item.mine);
          });
        } catch (error) {
          // Keep current-user points if extent fetch fails.
        }
      }

      if (seq !== ownedLoadSeq) return;
      source.clear();
      source.addFeatures(features);
    };
    loadOwnedPointsRef.current = () => {
      window.clearTimeout(ownedLoadTimer);
      ownedLoadTimer = window.setTimeout(loadOwnedPoints, 280);
    };
    map.on('moveend', loadOwnedPointsRef.current);
    if (isAuthReadyRef.current) {
      loadOwnedPoints();
    }

    let savedLoadSeq = 0;
    const loadSavedGeometries = async () => {
      if (!isAuthReadyRef.current) return;
      const source = savedSourceRef.current;
      if (!source) return;
      const seq = ++savedLoadSeq;
      const currentNik = nikRef.current;
      if (!currentNik) {
        source.clear();
        return;
      }
      try {
        const res = await PetakService.getPetakGeoJSON(currentNik);
        if (seq !== savedLoadSeq) return;
        const collection = res.data?.type === 'FeatureCollection'
          ? res.data
          : { type: 'FeatureCollection', features: [] };
        const features = geojsonFormat.readFeatures(collection, {
          dataProjection: 'EPSG:4326',
          featureProjection: map.getView().getProjection(),
        });
        const unique = [];
        const seen = new Set();
        features.forEach((feature) => {
          const id = String(feature.get('idpetak') || feature.getId() || '');
          if (!id || seen.has(id)) return;
          seen.add(id);
          feature.set('idpetak', id);
          feature.set('localId', id);
          feature.set('saved', true);
          feature.setId(id);
          unique.push(feature);
        });
        if (seq !== savedLoadSeq) return;
        source.clear(true);
        source.addFeatures(unique);
      } catch (error) {
        if (seq !== savedLoadSeq) return;
        source.clear(true);
      }
    };
    loadSavedGeometriesRef.current = loadSavedGeometries;

    const handlePointerMove = (evt) => {
      if (evt.dragging) return;
      const hit = map.forEachFeatureAtPixel(
        evt.pixel,
        (feature, layer) => {
          if (layer === generatedLayer || layer === ownedLayer || layer === savedLayer) return feature;
          return undefined;
        },
        { hitTolerance: 6 }
      );
      const nextId = hit
        ? String(hit.get('localId') || hit.get('idpetak') || hit.getId() || '')
        : null;
      const hitOwned = Boolean(hit && hit.get('owned'));
      if (hoveredPetakIdRef.current !== nextId) {
        hoveredPetakIdRef.current = nextId;
        setHoveredPetakId(nextId);
        generatedLayer.changed();
        savedLayer.changed();
      }
      const viewport = map.getViewport();
      if (viewport) {
        if (nextId || hitOwned || vertexDeleteModeRef.current) {
          viewport.style.cursor = 'pointer';
        } else {
          viewport.style.cursor = 'crosshair';
        }
      }
    };

    map.on('click', handleMapClick);
    map.on('pointermove', handlePointerMove);
    map.getViewport().style.cursor = 'crosshair';

    return () => {
      map.un('click', handleMapClick);
      map.un('pointermove', handlePointerMove);
      map.un('moveend', handleMoveEnd);
      if (loadOwnedPointsRef.current) {
        map.un('moveend', loadOwnedPointsRef.current);
      }
      window.clearTimeout(ownedLoadTimer);
      map.removeInteraction(modify);
      map.removeInteraction(draw);
      map.removeInteraction(snap);
      drawInteractionRef.current = null;
      modifyInteractionRef.current = null;
      if (doubleClickZoom) {
        map.addInteraction(doubleClickZoom);
      }
      map.removeLayer(pointsLayer);
      map.removeLayer(generatedLayer);
      map.removeLayer(ownedLayer);
      map.removeLayer(savedLayer);
      pointsSourceRef.current = null;
      generatedSourceRef.current = null;
      generatedLayerRef.current = null;
      ownedSourceRef.current = null;
      ownedLayerRef.current = null;
      savedSourceRef.current = null;
      savedLayerRef.current = null;
      loadOwnedPointsRef.current = null;
      loadSavedGeometriesRef.current = null;
    };
  }, [isAuthenticated, mapReady, mapInstance, syncPointsFromSource]);

  useEffect(() => {
    if (formResponse.address) {
      setSearchInput(formResponse.address);
    }
  }, [formResponse.address]);

  useEffect(() => {
    setTotalArea(selectedPercils.reduce(
      (sum, p) => sum + parseFloat(p.area || 0),
      0
    ));
  }, [selectedPercils]);

  useEffect(() => {
    // First check if all required data is loaded
    if (!isDataLoaded) {
      setIsValid(false);
      return;
    }

    // Only wait for the first petak fetch. Background refresh must not lock Save.
    if (!petakFetched) {
      setIsValid(false);
      return;
    }

    if (jmlPetak) {
      const totalRegisteredPetak = (listPetak || []).length;
      const totalPendingPetak = selectedPercils.length + markedPoints.length;
      const totalPetak = totalRegisteredPetak + totalPendingPetak;

      if (totalPetak > jmlPetak) {
        setAlertMessage(`Total petak (terdaftar: ${totalRegisteredPetak} + baru: ${totalPendingPetak} = ${totalPetak}) tidak dapat lebih dari ${jmlPetak}`);
        setAlertOpen(true);
        setIsValid(false);
        return;
      }

      const luasLahanFloat = parseFloat(luasLahan);
      const upperLimit = luasLahanFloat + (luasLahanFloat * 0.25);

      if (totalArea > upperLimit) {
        setAlertMessage(`Total area terpilih (${totalArea.toFixed(2)} ha) di luar batas toleransi yang diizinkan (${upperLimit.toFixed(2)} ha)`);
        setAlertOpen(true);
        setIsValid(false);
      } else {
        setIsValid(true);
      }
    }
  }, [selectedPercils, markedPoints, totalArea, jmlPetak, luasLahan, listPetak, isDataLoaded, petakFetched]);

  useEffect(() => {
    // Keep Martin MVT layer hidden; only toggle user-drawn/generated polygons
    if (polygonLayerRef.current) {
      polygonLayerRef.current.setVisible(false);
    }
    if (generatedLayerRef.current) {
      generatedLayerRef.current.setVisible(isPolygonVisible);
      generatedLayerRef.current.setOpacity(polygonOpacity);
    }
  }, [isPolygonVisible, polygonOpacity]);

  useEffect(() => {
    const source = generatedSourceRef.current;
    if (!source) return;
    const ids = new Set(selectedPercils.map((p) => String(p.id)));
    source.getFeatures().forEach((feature) => {
      const localId = String(feature.get('localId') || feature.getId());
      if (!ids.has(localId)) {
        source.removeFeature(feature);
      }
    });
  }, [selectedPercils]);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handlePlaceChange = () => {
    const place = autocomplete.getPlace();
    if (place.geometry) {
      const location = place.geometry.location;
      mapInstance.current.getView().animate({
        center: fromLonLat([location.lng(), location.lat()]),
        zoom: 15,
        duration: 1000,
      });
    }
  };

  const setVertexDeleteEnabled = useCallback((enabled) => {
    if (enabled) {
      try {
        drawInteractionRef.current?.abortDrawing();
      } catch (error) {
        // ignore
      }
      drawModeRef.current = false;
      setDrawMode(false);
      drawInteractionRef.current?.setActive(false);
      modifyInteractionRef.current?.setActive(true);
    }
    vertexDeleteModeRef.current = Boolean(enabled);
    setVertexDeleteMode(Boolean(enabled));
    generatedLayerRef.current?.changed();
    const viewport = mapInstance.current?.getViewport();
    if (viewport) {
      viewport.style.cursor = enabled ? 'pointer' : 'crosshair';
    }
  }, [mapInstance]);

  const setDrawModeEnabled = useCallback((enabled) => {
    if (enabled && remainingSlotsRef.current <= 0) {
      setAlertMessage('Kuota petak sudah terisi. Hapus petak terpilih untuk menggambar petak baru.');
      setAlertOpen(true);
      return;
    }
    if (enabled) {
      vertexDeleteModeRef.current = false;
      setVertexDeleteMode(false);
    } else {
      try {
        drawInteractionRef.current?.abortDrawing();
      } catch (error) {
        // ignore
      }
    }
    drawModeRef.current = Boolean(enabled);
    setDrawMode(Boolean(enabled));
    drawInteractionRef.current?.setActive(Boolean(enabled));
    modifyInteractionRef.current?.setActive(!enabled);
    generatedLayerRef.current?.changed();
    const viewport = mapInstance.current?.getViewport();
    if (viewport) {
      viewport.style.cursor = 'crosshair';
    }
  }, [mapInstance]);

  const handleUndoDrawVertex = useCallback(() => {
    drawInteractionRef.current?.removeLastPoint();
  }, []);

  const handleFinishDrawPolygon = useCallback(() => {
    try {
      drawInteractionRef.current?.finishDrawing();
    } catch (error) {
      setAlertMessage('Tambahkan minimal 3 titik, lalu klik Selesai atau klik titik pertama.');
      setAlertOpen(true);
    }
  }, []);

  useEffect(() => {
    if (selectedPercils.length === 0 && vertexDeleteMode) {
      setVertexDeleteEnabled(false);
    }
  }, [selectedPercils.length, vertexDeleteMode, setVertexDeleteEnabled]);

  useEffect(() => {
    if (remainingSlots <= 0 && drawMode) {
      setDrawModeEnabled(false);
    }
  }, [remainingSlots, drawMode, setDrawModeEnabled]);

  const handleClearPoints = () => {
    const source = pointsSourceRef.current;
    source?.clear();
    syncPointsFromSource(source);
  };

  const handleRemovePoint = (pointId) => {
    const source = pointsSourceRef.current;
    if (!source) return;
    const feature = source.getFeatures().find(
      (item) => Number(item.get('id') || item.getId()) === Number(pointId)
    );
    if (feature) source.removeFeature(feature);
    syncPointsFromSource(source);
  };

  const handleFocusPoint = (point) => {
    if (!mapInstance.current || !point) return;
    mapInstance.current.getView().animate({
      center: fromLonLat([point.lon, point.lat]),
      zoom: 18,
      duration: 500,
    });
  };

  const handleViewSavedPetak = useCallback(async (petakId) => {
    const map = mapInstance.current;
    const targetId = String(petakId || '');
    if (!map || !targetId) return;

    const findFeature = () => savedSourceRef.current?.getFeatures().find((item) => (
      String(item.get('idpetak') || item.get('localId') || item.getId() || '') === targetId
    ));

    let feature = findFeature();
    if (!feature && loadSavedGeometriesRef.current) {
      await loadSavedGeometriesRef.current();
      feature = findFeature();
    }
    setHoveredPetak(targetId);
    if (!feature) return;
    const geometry = feature.getGeometry();
    if (!geometry) return;
    const view = map.getView();
    if (geometry.getType() === 'Point') {
      view.animate({
        center: geometry.getCoordinates(),
        zoom: 18,
        duration: 600,
      });
      return;
    }
    view.fit(geometry.getExtent(), {
      duration: 600,
      padding: [72, 72, 72, 72],
      maxZoom: 19,
    });
  }, [mapInstance, setHoveredPetak]);

  const handleProcessPoints = async () => {
    const map = mapInstance.current;
    const pointsSource = pointsSourceRef.current;
    const generatedSource = generatedSourceRef.current;
    if (!map || !pointsSource || !generatedSource) return;

    const currentJmlPetak = jmlPetakRef.current;
    if (!currentJmlPetak || currentJmlPetak <= 0) {
      setAlertMessage('Data jumlah petak belum tersedia. Silakan tunggu data dimuat.');
      setAlertOpen(true);
      return;
    }

    setVertexDeleteEnabled(false);
    setDrawModeEnabled(false);

    const remaining =
      currentJmlPetak - (listPetak || []).length - selectedPercilsRef.current.length;
    if (remaining <= 0) {
      setAlertMessage(`Tidak dapat menambah petak lagi. Batas maksimum (${currentJmlPetak}) sudah tercapai.`);
      setAlertOpen(true);
      return;
    }

    const pointFeatures = pointsSource.getFeatures().sort(
      (a, b) => Number(a.get('id') || a.getId()) - Number(b.get('id') || b.getId())
    );
    if (pointFeatures.length !== remaining) {
      setAlertMessage(`Jumlah titik harus sama dengan sisa petak (${remaining}). Saat ini ${pointFeatures.length} titik.`);
      setAlertOpen(true);
      return;
    }

    const zoom = Math.round(map.getView().getZoom()) || 19;
    const payload = {
      zoom,
      geojson: {
        type: 'FeatureCollection',
        features: pointFeatures.map((feature) => {
          const id = Number(feature.get('id') || feature.getId());
          const [lon, lat] = toLonLat(feature.getGeometry().getCoordinates());
          return {
            type: 'Feature',
            id,
            properties: { id },
            geometry: {
              type: 'Point',
              coordinates: [lon, lat],
            },
          };
        }),
      },
    };

    setIsProcessingPoints(true);
    try {
      const response = await processPetakPoints(payload);
      const collection = response.data;
      const features = Array.isArray(collection?.features)
        ? collection.features
        : collection?.type === 'Feature'
          ? [collection]
          : [];
      const polygonFeatures = features.filter(
        (feature) =>
          feature?.geometry &&
          (feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon')
      );

      if (!polygonFeatures.length) {
        Swal.fire({
          icon: 'warning',
          title: 'Tidak ada petak',
          text: 'Generate gagal. Gambar polygon, atau simpan jika jumlah titik sudah sesuai kuota petak.',
        });
        setDrawFallback(true);
        setDrawModeEnabled(true);
        return;
      }

      const olFeatures = geojsonFormat.readFeatures(
        { type: 'FeatureCollection', features: polygonFeatures },
        {
          dataProjection: 'EPSG:4326',
          featureProjection: map.getView().getProjection(),
        }
      );

      const coordsByPointId = new Map();
      pointFeatures.forEach((feature) => {
        const id = Number(feature.get('id') || feature.getId());
        coordsByPointId.set(id, toLonLat(feature.getGeometry().getCoordinates()));
      });

      const usedIds = new Set([
        ...selectedPercilsRef.current.map((p) => String(p.id)),
        ...(listPetak || []).map((p) => String(p.idpetak || p.id || '')),
      ]);

      const accepted = [];
      olFeatures.forEach((olFeature) => {
        if (accepted.length >= remaining) return;
        const pointId = Number(olFeature.get('id') ?? olFeature.getId());
        const lonLat = coordsByPointId.get(pointId) || getFeatureLonLat(olFeature);
        let persilId = lonLat ? buildPersilId(lonLat[0], lonLat[1]) : 'T0_S0';
        if (usedIds.has(persilId)) {
          let suffix = 2;
          while (usedIds.has(`${persilId}_${suffix}`)) suffix += 1;
          persilId = `${persilId}_${suffix}`;
        }
        usedIds.add(persilId);
        olFeature.set('localId', persilId);
        olFeature.setId(persilId);
        generatedSource.addFeature(olFeature);
        accepted.push(geometryToPercil(olFeature, persilId));
      });

      setSelectedPercils((prev) => [...prev, ...accepted]);
      setDrawFallback(false);
      handleClearPoints();

      if (olFeatures.length > remaining) {
        setAlertMessage(`Hanya ${remaining} petak yang ditambahkan karena batas jumlah petak.`);
        setAlertOpen(true);
      }
    } catch (error) {
      console.error('Error processing points:', error);
      Swal.fire({
        icon: 'error',
        title: 'Gagal',
        text: 'Generate gagal. Gambar polygon, atau simpan jika jumlah titik sudah sesuai kuota petak.',
      });
      setDrawFallback(true);
      setDrawModeEnabled(true);
    } finally {
      setIsProcessingPoints(false);
    }
  };

  const handleSimpan = async () => {
    const defaults = {
      musim_tanam: formResponse.musimTanam || 'MT1',
      tgl_tanam: formResponse.tanggalTanam || new Date().toISOString().split('T')[0],
      tgl_panen: formResponse.tanggalPanen || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    };

    let dbList = listPetak || [];
    try {
      const fresh = await refreshPetakData();
      if (Array.isArray(fresh?.data)) {
        dbList = fresh.data;
      } else if (Array.isArray(fresh?.data?.data)) {
        dbList = fresh.data.data;
      }
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Gagal cek data',
        text: 'Tidak bisa memeriksa petak di database. Coba lagi.',
      });
      return;
    }

    const registeredCount = dbList.length;
    const need = Math.max(0, (jmlPetak || 0) - registeredCount);
    if (need <= 0) {
      Swal.fire({
        icon: 'info',
        title: 'Sudah lengkap',
        text: `Peserta ini sudah memiliki ${registeredCount} petak sesuai kuota.`,
      });
      return;
    }

    const usedIds = new Set(dbList.map((item) => String(item.idpetak || item.id || '')));
    const polygonItems = selectedPercils.map((p) => ({
      nik,
      idpetak: p.petak_id,
      luas: p.area ?? 0,
      longitude: p.lon ?? p.longitude,
      latitude: p.lat ?? p.latitude,
      ...defaults,
      geometry: p.geometry,
    }));
    polygonItems.forEach((item) => usedIds.add(String(item.idpetak)));

    const leftover = Math.max(0, need - polygonItems.length);
    const pointItems = markedPoints.slice(0, leftover).map((point) => {
      const item = pointToPercil(point);
      let idpetak = item.idpetak;
      if (usedIds.has(String(idpetak))) {
        let suffix = 2;
        while (usedIds.has(`${idpetak}_${suffix}`)) suffix += 1;
        idpetak = `${idpetak}_${suffix}`;
      }
      usedIds.add(String(idpetak));
      return {
        nik,
        idpetak,
        luas: 0,
        longitude: item.longitude,
        latitude: item.latitude,
        ...defaults,
        geometry: item.geometry,
      };
    });

    const payload = [...polygonItems, ...pointItems];
    if (payload.length !== need) {
      Swal.fire({
        icon: 'info',
        title: 'Jumlah petak belum sesuai',
        text: `Kuota sisa ${need} petak. Saat ini ada ${polygonItems.length} polygon dan ${pointItems.length} titik. Lengkapi hingga ${need} petak, lalu simpan.`,
      });
      return;
    }

    try {
      const check = await PetakService.checkPetakBatch({
        nik,
        jmlPetak,
        items: payload,
      });
      const checkData = check.data?.data || {};
      if (checkData.hasConflict) {
        const duplicateIds = [
          ...(checkData.existingIds || []).map((row) => row.idpetak),
          ...(checkData.existingCoords || []).map((row) => row.idpetak),
        ].filter(Boolean);
        const uniqueIds = [...new Set(duplicateIds)];
        Swal.fire({
          icon: 'warning',
          title: 'Sudah terdaftar',
          text: checkData.quotaExceeded
            ? `Kuota ${jmlPetak} petak sudah terpenuhi di database (${checkData.nikCount} tersimpan).`
            : `Petak sudah ada di database: ${uniqueIds.join(', ') || 'lokasi yang sama'}.`,
        });
        return;
      }

      await dispatch(createPetak(payload));

      setSelectedPercils([]);
      setVertexDeleteEnabled(false);
      generatedSourceRef.current?.clear();
      handleClearPoints();
      setDrawFallback(false);

      await refreshPetakData();
      await loadSavedGeometriesRef.current?.();
      loadOwnedPointsRef.current?.();

      Swal.fire({
        icon: 'success',
        title: 'Success',
        text: `${payload.length} petak berhasil disimpan.`,
      });
    } catch (error) {
      console.error('Error:', error);
      const duplicates = error?.response?.data?.duplicates;
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: duplicates?.length
          ? `Petak sudah ada di database: ${duplicates.join(', ')}.`
          : 'Gagal Menyimpan Data.',
      });
    }
  };

    const handleDeletePetak = async (petakId) => {
    try {
      await dispatch(deletePetak(petakId));
      await refreshPetakData();
      await loadSavedGeometriesRef.current?.();
      loadOwnedPointsRef.current?.();
    } catch (error) {
      console.error("Error deleting petak:", error);
      throw error; // Re-throw to be handled by the DataPanel
    }
  };



  // Function to zoom to exact petak data by ID
  const zoomToPetakData = useCallback(async (petakList) => {
    const map = mapInstance.current;
    if (!map || !nik) return false;

    try {
      if (!petakList || petakList.length === 0) return false;
      const view = map.getView();

      if (petakList.length === 1) {
        const petakId = petakList[0].id;
        const petakData = await dispatch(getPetakById(petakId));
        const data = petakData?.data;
        if (!data) return false;
        const extent = boundsToMapExtent(data.bounds);
        if (fitViewToExtent(view, extent)) return true;
        const centerCoord = data.center?.coordinates
          ? toMapCoordinate(data.center.coordinates[0], data.center.coordinates[1])
          : null;
        if (centerCoord) {
          view.animate({ center: centerCoord, zoom: 17, duration: 700 });
          return true;
        }
        return false;
      }

      const centerData = await dispatch(getCenterPetakUser(nik));
      const data = centerData?.data;
      if (!data) return false;
      const extent = boundsToMapExtent(data.bounds);
      if (fitViewToExtent(view, extent)) return true;
      const centerCoord = data.center?.coordinates
        ? toMapCoordinate(data.center.coordinates[0], data.center.coordinates[1])
        : null;
      if (centerCoord) {
        view.animate({ center: centerCoord, zoom: 16, duration: 700 });
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error zooming to petak data:", error);
      return false;
    }
  }, [mapInstance, nik, dispatch]);

  // Function to refresh petak data from database
  const refreshPetakData = useCallback(async () => {
    const currentNik = (nik || nikFromUrl || '').trim();
    if (!currentNik) {
      return null;
    }

    try {
      const result = await dispatch(getPetakUser(currentNik));
      setPetakFetched(true);
      return result;
    } catch (error) {
      console.error('Error refreshing petak data:', error);
      setPetakFetched(true);
      return null;
    }
  }, [nik, nikFromUrl, dispatch]);

  const zoomToPetakDataRef = useRef(zoomToPetakData);
  zoomToPetakDataRef.current = zoomToPetakData;
  const hasInitialZoomedRef = useRef(false);

  useEffect(() => {
    if (!isAuthReady) return;
    const currentNik = (nik || nikFromUrl || '').trim();
    if (!currentNik) return;

    let cancelled = false;
    refreshPetakData().then((result) => {
      if (cancelled || !result) return;
      loadSavedGeometriesRef.current?.();
    });

    return () => {
      cancelled = true;
    };
  }, [isAuthReady, authToken, nik, nikFromUrl, refreshPetakData]);

  useEffect(() => {
    if (!mapReady || hasInitialZoomedRef.current) return;
    const map = mapInstance.current;
    if (!map) return;

    const fitSaved = () => {
      const source = savedSourceRef.current;
      if (!source) return false;
      const features = source.getFeatures();
      if (!features.length) return false;
      return fitViewToExtent(map.getView(), source.getExtent());
    };

    let cancelled = false;
    const run = async () => {
      if (fitSaved()) {
        hasInitialZoomedRef.current = true;
        return;
      }

      const petakList = listPetakRef.current || [];
      if (petakList.length) {
        const ok = await zoomToPetakDataRef.current(petakList);
        if (!cancelled && ok) {
          hasInitialZoomedRef.current = true;
          return;
        }
      }

      if (!petakFetched) return;
      const address = (formResponse.address || searchInput || '').trim();
      if (address) {
        const ok = await handleSearch(address, map, process.env.REACT_APP_GOOGLE_API_KEY, { silent: true });
        if (!cancelled && ok) {
          hasInitialZoomedRef.current = true;
        }
      }
    };

    const timer = window.setTimeout(run, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [mapReady, petakFetched, listPetak, formResponse.address, searchInput]);

  if (errmessage) {
    return (
      <div>
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <h2>Akses Ditolak</h2>
          <p>Silakan login untuk melihat peta.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
      <div
        ref={mapRef}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#d7dce0' }}
      />
      {loading && (
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            zIndex: 2000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(255,255,255,0.72)',
          }}
        >
          <Spinner className="content-loader" />
        </Box>
      )}

      <GeolocationControl mapInstance={mapInstance.current} isMobile={isMobile} />

      <Box
        sx={{
          position: 'absolute',
          bottom: isMobile ? 16 : 88,
          left: isMobile ? 12 : 16,
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
          maxWidth: isMobile ? 'calc(100% - 24px)' : 340,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 1,
            p: 0.75,
            borderRadius: 2,
            backgroundColor: 'rgba(255,255,255,0.95)',
            boxShadow: '0 2px 10px rgba(0,0,0,0.15)',
          }}
        >
          <Typography variant="caption" sx={{ color: 'text.secondary', width: '100%', px: 0.5 }}>
            Buat petak
          </Typography>
          <Button
            size="small"
            variant={!drawMode ? 'contained' : 'outlined'}
            startIcon={<PlaceIcon />}
            onClick={() => {
              setDrawModeEnabled(false);
              setVertexDeleteEnabled(false);
            }}
          >
            Tandai titik
          </Button>
          <Button
            size="small"
            variant={drawMode ? 'contained' : 'outlined'}
            color={drawFallback && !drawMode ? 'warning' : 'primary'}
            startIcon={<PentagonIcon />}
            disabled={remainingSlots <= 0}
            onClick={() => setDrawModeEnabled(!drawMode)}
          >
            Gambar polygon
          </Button>
          {selectedPercils.length > 0 && (
            <>
              <Typography variant="caption" sx={{ color: 'text.secondary', width: '100%', px: 0.5, mt: 0.25 }}>
                Ubah petak
              </Typography>
              <Button
                size="small"
                variant={!drawMode && !vertexDeleteMode ? 'contained' : 'outlined'}
                startIcon={<OpenWithIcon />}
                onClick={() => {
                  setDrawModeEnabled(false);
                  setVertexDeleteEnabled(false);
                }}
              >
                Geser
              </Button>
              <Button
                size="small"
                color="error"
                variant={vertexDeleteMode ? 'contained' : 'outlined'}
                startIcon={<DeleteSweepIcon />}
                onClick={() => setVertexDeleteEnabled(!vertexDeleteMode)}
              >
                Hapus sudut
              </Button>
            </>
          )}
        </Box>
        {drawMode && (
          <Box
            sx={{
              display: 'flex',
              gap: 1,
              p: 0.75,
              borderRadius: 2,
              backgroundColor: 'rgba(255,255,255,0.95)',
              boxShadow: '0 2px 10px rgba(0,0,0,0.15)',
            }}
          >
            <Button size="small" startIcon={<UndoIcon />} onClick={handleUndoDrawVertex}>
              Undo
            </Button>
            <Button size="small" color="success" variant="contained" startIcon={<CheckIcon />} onClick={handleFinishDrawPolygon}>
              Selesai
            </Button>
            <Button size="small" color="inherit" onClick={() => setDrawModeEnabled(false)}>
              Batal
            </Button>
          </Box>
        )}
        {drawMode && (
          <Alert severity="info" sx={{ py: 0 }}>
            Klik peta untuk menambah sudut. Minimal 3 titik, lalu Selesai atau klik titik pertama.
          </Alert>
        )}
        {vertexDeleteMode && (
          <Alert severity="warning" sx={{ py: 0 }}>
            Klik sudut merah untuk menghapus. Jika sudut terlalu rapat, perbesar peta.
          </Alert>
        )}
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 1,
            px: 1,
            py: 0.5,
            borderRadius: 2,
            backgroundColor: 'rgba(255,255,255,0.95)',
            boxShadow: '0 2px 10px rgba(0,0,0,0.15)',
          }}
        >
          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#2E7D32', flexShrink: 0 }} />
          <Typography variant="caption">Petak tersimpan</Typography>
          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#F9A825', flexShrink: 0, ml: 0.5 }} />
          <Typography variant="caption">Sudah ada pemilik</Typography>
        </Box>
      </Box>

      {/* Disclaimer Box */}
      {!isMobile && (
      <div
        style={{
          position: 'absolute',
          bottom: '16px',
          left: '16px',
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          padding: '8px 12px',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          zIndex: 900,
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(0,0,0,0.1)',
          fontSize: '10px',
          color: '#666',
          fontWeight: '500',
          maxWidth: '280px',
          textAlign: 'center'
        }}
      >
        Peta ini menampilkan bentuk petak sawah secara indikatif. Perbedaan dengan kondisi sebenarnya di lapangan mungkin terjadi.
      </div>
      )}

      {/* Hamburger Menu Button - Only visible on mobile */}
      {isMobile && (
        <Fab
          color="primary"
          aria-label="menu"
          onClick={() => setPanelOpen(true)}
          sx={{
            position: 'absolute',
            top: 12,
            right: 12,
            zIndex: 1001,
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            color: '#1976d2',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 1)',
            },
          }}
        >
          <MenuIcon />
        </Fab>
      )}

      {/* Responsive Panel - Drawer on mobile, fixed panel on desktop */}
      {isMobile ? (
        <Drawer
          anchor="right"
          open={panelOpen}
          onClose={() => setPanelOpen(false)}
          PaperProps={{
            sx: {
              width: '100%',
              maxWidth: '370px',
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(10px)',
              borderLeft: '1px solid rgba(0, 0, 0, 0.1)',
              boxShadow: '-4px 0 20px rgba(0, 0, 0, 0.15)',
            }
          }}
          ModalProps={{
            keepMounted: true, // Better mobile performance
          }}
          BackdropProps={{
            sx: {
              backgroundColor: 'rgba(0, 0, 0, 0.3)',
              backdropFilter: 'blur(2px)',
            }
          }}
        >
          <Box sx={{
            p: 2,
            animation: 'slideInLeft 0.3s ease-out',
            '@keyframes slideInLeft': {
              '0%': { transform: 'translateX(100%)' },
              '100%': { transform: 'translateX(0)' },
            },
          }}>
            {/* Close button for mobile */}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
              <IconButton
                onClick={() => setPanelOpen(false)}
                size="small"
                sx={{
                  backgroundColor: 'rgba(0, 0, 0, 0.04)',
                  '&:hover': {
                    backgroundColor: 'rgba(0, 0, 0, 0.08)',
                  },
                  transition: 'all 0.2s ease',
                }}
              >
                <CloseIcon />
              </IconButton>
            </Box>

            <Tabs
              value={tabValue}
              onChange={handleTabChange}
              variant="fullWidth"
              sx={{
                '& .MuiTab-root': {
                  fontSize: '0.75rem',
                  minHeight: '40px',
                }
              }}
            >
              <Tab label="Data" icon={<ListIcon />} iconPosition="start" />
              <Tab label="Layers" icon={<LayersIcon />} iconPosition="start" />
            </Tabs>

            {tabValue === 0 && (
              <DataPanel
                formData={formDataValues}
                selectedPercils={selectedPercils}
                setSelectedPercils={setSelectedPercils}
                totalArea={totalArea}
                isValid={isValid}
                onSave={handleSimpan}
                polygonLayerRef={polygonLayerRef}
                source="MapRegister"
                listPetak={listPetak}
                isLoading={!petakFetched}
                onDeletePetak={handleDeletePetak}
                onRefreshData={refreshPetakData}
                isMobile={isMobile}
                isTablet={isTablet}
                mapInstance={mapInstance}
                markedPoints={markedPoints}
                remainingSlots={remainingSlots}
                onProcessPoints={handleProcessPoints}
                onClearPoints={handleClearPoints}
                onRemovePoint={handleRemovePoint}
                onFocusPoint={handleFocusPoint}
                isProcessingPoints={isProcessingPoints}
                isVertexDeleteMode={vertexDeleteMode}
                onSetVertexDeleteMode={setVertexDeleteEnabled}
                isDrawMode={drawMode}
                onSetDrawMode={setDrawModeEnabled}
                isDrawFallback={drawFallback}
                hoveredPetakId={hoveredPetakId}
                onHoverPetak={setHoveredPetak}
                onViewSavedPetak={handleViewSavedPetak}
              />
            )}

            {tabValue === 1 && (
              <LayerPanel
                isPolygonVisible={isPolygonVisible}
                setIsPolygonVisible={setIsPolygonVisible}
                polygonOpacity={polygonOpacity}
                setPolygonOpacity={setPolygonOpacity}
                selectedBasemap={selectedBasemap}
                onBasemapChange={(basemap) => {
                  const newBasemapLayer = createBasemapLayer(basemap, process.env.REACT_APP_GOOGLE_API_KEY);
                  if (basemapLayerRef.current) {
                    mapInstance.current.removeLayer(basemapLayerRef.current);
                  }
                  mapInstance.current.getLayers().insertAt(0, newBasemapLayer);
                  basemapLayerRef.current = newBasemapLayer;
                  setSelectedBasemap(basemap);
                }}
                isMobile={isMobile}
                isTablet={isTablet}
                mapInstance={mapInstance}
              />
            )}
          </Box>
        </Drawer>
      ) : (
        /* Desktop Fixed Panel */
        <div
          style={{
            position: 'absolute',
            top: '20px',
            right: '40px',
            width: '100%',
            maxWidth: '370px',
            background: 'rgba(255, 255, 255, 0.95)',
            borderRadius: '16px',
            padding: '0 10px 10px 10px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            zIndex: 1000,
            maxHeight: '90vh',
            overflowY: 'auto',
            backdropFilter: 'blur(10px)',
          }}
        >
          <Box>
            <Tabs
              value={tabValue}
              onChange={handleTabChange}
              variant="standard"
              sx={{
                '& .MuiTab-root': {
                  fontSize: '0.875rem',
                  minHeight: '48px',
                }
              }}
            >
              <Tab label="Data" icon={<ListIcon />} iconPosition="start" />
              <Tab label="Layers" icon={<LayersIcon />} iconPosition="start" />
            </Tabs>

            {tabValue === 0 && (
              <DataPanel
                formData={formDataValues}
                selectedPercils={selectedPercils}
                setSelectedPercils={setSelectedPercils}
                totalArea={totalArea}
                isValid={isValid}
                onSave={handleSimpan}
                polygonLayerRef={polygonLayerRef}
                source="MapRegister"
                listPetak={listPetak}
                isLoading={!petakFetched}
                onDeletePetak={handleDeletePetak}
                onRefreshData={refreshPetakData}
                isMobile={isMobile}
                isTablet={isTablet}
                mapInstance={mapInstance}
                markedPoints={markedPoints}
                remainingSlots={remainingSlots}
                onProcessPoints={handleProcessPoints}
                onClearPoints={handleClearPoints}
                onRemovePoint={handleRemovePoint}
                onFocusPoint={handleFocusPoint}
                isProcessingPoints={isProcessingPoints}
                isVertexDeleteMode={vertexDeleteMode}
                onSetVertexDeleteMode={setVertexDeleteEnabled}
                isDrawMode={drawMode}
                onSetDrawMode={setDrawModeEnabled}
                isDrawFallback={drawFallback}
                hoveredPetakId={hoveredPetakId}
                onHoverPetak={setHoveredPetak}
                onViewSavedPetak={handleViewSavedPetak}
              />
            )}

            {tabValue === 1 && (
              <LayerPanel
                isPolygonVisible={isPolygonVisible}
                setIsPolygonVisible={setIsPolygonVisible}
                polygonOpacity={polygonOpacity}
                setPolygonOpacity={setPolygonOpacity}
                selectedBasemap={selectedBasemap}
                onBasemapChange={(basemap) => {
                  const newBasemapLayer = createBasemapLayer(basemap, process.env.REACT_APP_GOOGLE_API_KEY);
                  if (basemapLayerRef.current) {
                    mapInstance.current.removeLayer(basemapLayerRef.current);
                  }
                  mapInstance.current.getLayers().insertAt(0, newBasemapLayer);
                  basemapLayerRef.current = newBasemapLayer;
                  setSelectedBasemap(basemap);
                }}
                isMobile={isMobile}
                isTablet={isTablet}
                mapInstance={mapInstance}
              />
            )}
          </Box>
        </div>
      )}

      {/* Responsive Search Bar */}
      <div
        style={{
          position: 'absolute',
          top: 12,
          left: 12,
          padding: isMobile ? '6px' : '8px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'rgba(255, 255, 255, 0.95)',
          borderRadius: '8px',
          width: isMobile ? 'calc(100% - 84px)' : '300px',
          backdropFilter: 'blur(10px)',
        }}
      >
        {googlePlacesReady ? (
          <Autocomplete
            onLoad={(autocompleteInstance) => setAutocomplete(autocompleteInstance)}
            onPlaceChanged={handlePlaceChange}
          >
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Cari alamat"
              style={{
                flex: 1,
                padding: isMobile ? '8px 12px' : '10px 15px',
                borderRadius: '5px',
                border: '1px solid #ccc',
                outline: 'none',
                width: '100%',
                fontSize: isMobile ? '14px' : '16px',
              }}
            />
          </Autocomplete>
        ) : (
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Cari alamat"
            style={{
              flex: 1,
              padding: isMobile ? '8px 12px' : '10px 15px',
              borderRadius: '5px',
              border: '1px solid #ccc',
              outline: 'none',
              width: '100%',
              fontSize: isMobile ? '14px' : '16px',
            }}
          />
        )}
        <IconButton
          onClick={() => handleSearch(searchInput, mapInstance.current, process.env.REACT_APP_GOOGLE_API_KEY)}
          style={{
            borderRadius: '25%',
            backgroundColor: '#1976d2',
            color: 'white',
            padding: isMobile ? '6px' : '7px',
            minWidth: isMobile ? '32px' : '36px',
            height: isMobile ? '32px' : '36px',
          }}
        >
          <SearchIcon fontSize={isMobile ? "small" : "medium"} />
        </IconButton>
      </div>

      <Snackbar
        open={alertOpen}
        onClose={() => setAlertOpen(false)}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'center',
        }}
      >
        <Alert onClose={() => setAlertOpen(false)} severity="error" sx={{ width: '100%' }}>
          {alertMessage}
        </Alert>
      </Snackbar>
    </div>
  );
};

export default MapRegister; 