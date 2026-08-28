import 'ol/ol.css';
import 'ol-ext/dist/ol-ext.css';
import '../../styles/ol-overrides.css';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation, useSearchParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Drawer,
  IconButton,
  InputAdornment,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  Snackbar,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import EditIcon from '@mui/icons-material/Edit';
import CreateIcon from '@mui/icons-material/Create';
import SaveIcon from '@mui/icons-material/Save';
import UndoIcon from '@mui/icons-material/Undo';
import CheckIcon from '@mui/icons-material/Check';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import PlaceIcon from '@mui/icons-material/Place';
import PentagonIcon from '@mui/icons-material/Pentagon';
import Swal from 'sweetalert2';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import GeoJSON from 'ol/format/GeoJSON';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import { fromLonLat } from 'ol/proj';
import { Draw, Modify, Snap, DoubleClickZoom } from 'ol/interaction';
import { click, never, primaryAction } from 'ol/events/condition';
import { Style, Fill, Stroke, Circle as CircleStyle, Text } from 'ol/style';
import { getArea as getGeodesicArea } from 'ol/sphere';
import { useMap } from '../../hooks/useMap';
import { useAuthListener } from '../../hooks/useAuthListener';
import { useAuthReady } from '../../hooks/useAuthReady';
import { checkAuth } from '../../actions/authActions';
import PetakService from '../../services/petakService';
import GeolocationControl from './GeolocationControl';
import Spinner from '../Spinner/Loading-spinner';

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
      polygon.map((ring) => ring.map((coord) => (coord.length > 2 ? coord : [...coord, 0])))
    );
  }
  return geometry;
};

const createFeatureStyle = (hoveredIdRef, selectedIdsRef, editModeRef) => (feature) => {
  const id = String(feature.get('parentId') || feature.get('id') || feature.getId() || '');
  const hovered = String(hoveredIdRef.current || '') === id;
  const selected = selectedIdsRef.current.has(id);
  const editing = Boolean(editModeRef.current);
  const geomType = feature.getGeometry()?.getType();
  const pending = feature.get('status') === 'titik';

  if (geomType === 'Point') {
    if (feature.get('sourcePoint')) {
      return new Style({
        image: new CircleStyle({
          radius: hovered || selected ? 6 : 5,
          fill: new Fill({ color: selected ? '#1565C0' : '#90CAF9' }),
          stroke: new Stroke({ color: '#0D47A1', width: 1.5 }),
        }),
        text: new Text({
          text: hovered || selected ? String(feature.get('idpetak') || 'Asal') : 'Asal',
          font: 'bold 9px Arial, sans-serif',
          offsetY: -11,
          fill: new Fill({ color: '#0D47A1' }),
          stroke: new Stroke({ color: '#ffffff', width: 3 }),
        }),
      });
    }
    return [
      new Style({
        image: new CircleStyle({
          radius: hovered || selected ? 18 : 16,
          fill: new Fill({ color: 'rgba(230, 81, 0, 0.28)' }),
        }),
      }),
      new Style({
        image: new CircleStyle({
          radius: hovered || selected ? 9 : 8,
          fill: new Fill({ color: pending ? '#E65100' : '#F9A825' }),
          stroke: new Stroke({ color: '#ffffff', width: 2.5 }),
        }),
        text: new Text({
          text: 'Belum petak',
          font: 'bold 10px Arial, sans-serif',
          offsetY: -16,
          fill: new Fill({ color: '#BF360C' }),
          stroke: new Stroke({ color: '#ffffff', width: 3 }),
        }),
      }),
    ];
  }

  return new Style({
    fill: new Fill({
      color: selected
        ? 'rgba(21, 101, 192, 0.38)'
        : hovered
          ? 'rgba(46, 125, 50, 0.38)'
          : editing
            ? 'rgba(255, 87, 51, 0.18)'
            : 'rgba(46, 125, 50, 0.26)',
    }),
    stroke: new Stroke({
      color: selected ? '#1565C0' : hovered ? '#1B5E20' : editing ? '#FF5733' : '#2E7D32',
      width: selected || hovered ? 3.5 : 2.5,
    }),
    text: new Text({
      text: String(feature.get('idpetak') || ''),
      font: 'bold 10px Arial, sans-serif',
      fill: new Fill({ color: '#ffffff' }),
      stroke: new Stroke({ color: selected ? '#0D47A1' : '#1B5E20', width: 3 }),
      overflow: true,
    }),
  });
};

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' });
};

const isPendingPointFeature = (feature) => (
  Boolean(feature)
  && feature.get('status') === 'titik'
  && !feature.get('sourcePoint')
  && feature.getGeometry()?.getType() === 'Point'
);

const squaredDistance = (a, b) => {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  return dx * dx + dy * dy;
};

const findTargetTitikFeature = (source, polygonGeometry, selectedIds) => {
  const pending = (source?.getFeatures() || []).filter(isPendingPointFeature);
  if (!pending.length) return null;
  const selectedPending = pending.filter((feature) => selectedIds.has(String(feature.getId())));
  const contained = pending.filter((feature) => (
    polygonGeometry.intersectsCoordinate(feature.getGeometry().getCoordinates())
  ));
  if (contained.length === 1) return contained[0];
  if (contained.length > 1) {
    const interior = polygonGeometry.getInteriorPoint().getCoordinates();
    return [...contained].sort((a, b) => (
      squaredDistance(a.getGeometry().getCoordinates(), interior)
      - squaredDistance(b.getGeometry().getCoordinates(), interior)
    ))[0];
  }
  if (selectedPending.length === 1) return selectedPending[0];
  return null;
};

const MapDashboard = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const dispatch = useDispatch();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);
  const { loading } = useSelector((state) => state.auth);
  const { isAuthReady } = useAuthReady();

  useAuthListener();

  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [listData, setListData] = useState({ items: [], summary: {}, total: 0, limit: 20 });
  const [listLoading, setListLoading] = useState(false);
  const [selectedNik, setSelectedNik] = useState(searchParams.get('nik') || '');
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [hoveredId, setHoveredId] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [drawMode, setDrawMode] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [localOverrides, setLocalOverrides] = useState({});
  const [busy, setBusy] = useState(false);
  const [listOpen, setListOpen] = useState(!isMobile);
  const [detailOpen, setDetailOpen] = useState(true);
  const [sourceReady, setSourceReady] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');

  const sourceRef = useRef(null);
  const layerRef = useRef(null);
  const modifyRef = useRef(null);
  const drawInteractionRef = useRef(null);
  const hoveredIdRef = useRef(null);
  const selectedIdsRef = useRef(selectedIds);
  const editModeRef = useRef(false);
  const drawModeRef = useRef(false);

  selectedIdsRef.current = selectedIds;
  hoveredIdRef.current = hoveredId;
  editModeRef.current = editMode;
  drawModeRef.current = drawMode;

  useEffect(() => {
    const tokenFromUrl = new URLSearchParams(location.search).get('token');
    if (tokenFromUrl) {
      dispatch(checkAuth(tokenFromUrl));
    }
  }, [dispatch, location.search]);

  const { mapRef, mapInstance, mapReady } = useMap(
    isAuthenticated,
    process.env.REACT_APP_GOOGLE_API_KEY,
    () => {},
    '',
    {
      enableFeatureClick: false,
      enablePetakLayer: false,
      initialZoom: 5,
      initialCenter: [118, -2],
    }
  );

  const loadList = useCallback(async () => {
    if (!isAuthReady) return;
    setListLoading(true);
    try {
      const res = await PetakService.getPetakMonitor({
        search: searchInput,
        status: statusFilter,
        page,
        limit: 20,
      });
      setListData(res.data?.data || { items: [], summary: {}, total: 0, limit: 20 });
    } catch (error) {
      console.error(error);
      setAlertMessage('Gagal memuat daftar pendaftaran.');
      setAlertOpen(true);
    } finally {
      setListLoading(false);
    }
  }, [isAuthReady, page, searchInput, statusFilter]);

  useEffect(() => {
    const timer = window.setTimeout(loadList, 250);
    return () => window.clearTimeout(timer);
  }, [loadList]);

  const loadDetail = useCallback(async (nik) => {
    if (!isAuthReady || !nik) return;
    setDetailLoading(true);
    try {
      const res = await PetakService.getPetakMonitorByNik(nik);
      setDetail(res.data?.data || null);
      setSelectedIds(new Set());
      setLocalOverrides({});
      setDirty(false);
      setEditMode(false);
      setDrawMode(false);
      drawModeRef.current = false;
      drawInteractionRef.current?.setActive(false);
      modifyRef.current?.setActive(true);
    } catch (error) {
      console.error(error);
      setAlertMessage('Gagal memuat data NIK.');
      setAlertOpen(true);
    } finally {
      setDetailLoading(false);
    }
  }, [isAuthReady]);

  useEffect(() => {
    if (selectedNik && isAuthReady) {
      loadDetail(selectedNik);
    }
    if (!selectedNik) {
      setDetail(null);
      sourceRef.current?.clear(true);
    }
  }, [selectedNik, isAuthReady, loadDetail]);

  useEffect(() => {
    const map = mapInstance.current;
    const source = sourceRef.current;
    if (!map || !mapReady || !source) return;
    if (!detail?.geojson) {
      source.clear(true);
      return;
    }
    const features = geojsonFormat.readFeatures(detail.geojson, {
      dataProjection: 'EPSG:4326',
      featureProjection: map.getView().getProjection(),
    });
    features.forEach((feature) => {
      const id = String(feature.get('id') || feature.getId() || '');
      feature.setId(id);
      feature.set('id', id);
    });
    (detail.items || []).forEach((item) => {
      if (item.status !== 'petak') return;
      const lon = Number(item.longitude);
      const lat = Number(item.latitude);
      if (!Number.isFinite(lon) || !Number.isFinite(lat)) return;
      const point = new Feature({
        geometry: new Point(fromLonLat([lon, lat])),
        id: `src-${item.id}`,
        parentId: String(item.id),
        idpetak: item.idpetak,
        status: 'petak',
        sourcePoint: true,
      });
      point.setId(`src-${item.id}`);
      features.push(point);
    });
    source.clear(true);
    source.addFeatures(features);
    if (features.length) {
      const extent = source.getExtent();
      if (extent && Number.isFinite(extent[0])) {
        map.getView().fit(extent, { duration: 500, padding: [72, 72, 72, 72], maxZoom: 18 });
      }
    }
  }, [detail, mapInstance, mapReady, sourceReady]);

  useEffect(() => {
    const map = mapInstance.current;
    if (!map || !mapReady || !isAuthenticated) return undefined;

    const source = new VectorSource();
    sourceRef.current = source;
    setSourceReady(true);
    const layer = new VectorLayer({
      source,
      style: createFeatureStyle(hoveredIdRef, selectedIdsRef, editModeRef),
      zIndex: 12,
      renderOrder: (a, b) => {
        const rank = (feature) => {
          if (feature.get('status') === 'titik') return 3;
          if (feature.get('sourcePoint')) return 2;
          return 1;
        };
        return rank(a) - rank(b);
      },
    });
    layerRef.current = layer;
    map.addLayer(layer);

    const modify = new Modify({
      source,
      pixelTolerance: 16,
      condition: (event) => {
        if (drawModeRef.current || !editModeRef.current || !primaryAction(event)) return false;
        const hit = map.forEachFeatureAtPixel(event.pixel, (feature) => feature, { hitTolerance: 8 });
        const type = hit?.getGeometry()?.getType();
        return type === 'Polygon' || type === 'MultiPolygon';
      },
      insertVertexCondition: () => editModeRef.current && !drawModeRef.current,
      deleteCondition: (event) => (editModeRef.current && !drawModeRef.current ? click(event) : never(event)),
    });
    const draw = new Draw({
      source,
      type: 'Polygon',
      minPoints: 3,
      stopClick: true,
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
    const snap = new Snap({ source, pixelTolerance: 16 });
    map.addInteraction(modify);
    map.addInteraction(draw);
    map.addInteraction(snap);
    modifyRef.current = modify;
    drawInteractionRef.current = draw;
    modify.on('modifyend', () => setDirty(true));

    draw.on('drawend', (event) => {
      const drawn = event.feature;
      const polygonGeometry = drawn.getGeometry();
      const target = findTargetTitikFeature(source, polygonGeometry, selectedIdsRef.current);
      window.setTimeout(() => {
        if (source.getFeatures().includes(drawn)) source.removeFeature(drawn);
      }, 0);
      if (!target || !polygonGeometry) {
        setAlertMessage('Pilih titik oranye atau gambar polygon yang mengelilingi titik tersebut.');
        setAlertOpen(true);
        return;
      }
      const targetId = String(target.getId());
      const nextGeometry = polygonGeometry.clone();
      target.setGeometry(nextGeometry);
      target.set('status', 'petak');
      const areaGeom = nextGeometry.clone();
      areaGeom.transform('EPSG:3857', 'EPSG:4326');
      const areaM2 = getGeodesicArea(areaGeom, { projection: 'EPSG:4326' });
      const luas = Number.isFinite(areaM2) ? areaM2 / 10000 : 0;
      setLocalOverrides((prev) => ({
        ...prev,
        [targetId]: { status: 'petak', luas },
      }));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.add(targetId);
        return next;
      });
      setDirty(true);
      layer.changed();
      const stillPending = source.getFeatures().some(isPendingPointFeature);
      if (!stillPending) {
        draw.setActive(false);
        drawModeRef.current = false;
        setDrawMode(false);
        modify.setActive(true);
        const dblZoom = map.getInteractions().getArray().find((item) => item instanceof DoubleClickZoom);
        if (dblZoom) dblZoom.setActive(true);
        const viewport = map.getViewport();
        if (viewport) viewport.style.cursor = '';
      }
    });

    const onClick = (evt) => {
      if (editModeRef.current || drawModeRef.current) return;
      const hit = map.forEachFeatureAtPixel(evt.pixel, (feature) => feature, { hitTolerance: 8 });
      if (!hit) return;
      const id = String(hit.get('parentId') || hit.get('id') || hit.getId() || '');
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
      layer.changed();
    };
    const onMove = (evt) => {
      if (evt.dragging) return;
      const hit = map.forEachFeatureAtPixel(evt.pixel, (feature) => feature, { hitTolerance: 8 });
      const nextId = hit ? String(hit.get('parentId') || hit.get('id') || hit.getId() || '') : null;
      hoveredIdRef.current = nextId;
      setHoveredId(nextId);
      layer.changed();
    };
    map.on('singleclick', onClick);
    map.on('pointermove', onMove);

    return () => {
      map.un('singleclick', onClick);
      map.un('pointermove', onMove);
      map.removeInteraction(modify);
      map.removeInteraction(draw);
      map.removeInteraction(snap);
      map.removeLayer(layer);
      sourceRef.current = null;
      layerRef.current = null;
      modifyRef.current = null;
      drawInteractionRef.current = null;
      setSourceReady(false);
    };
  }, [isAuthenticated, mapInstance, mapReady]);

  useEffect(() => {
    layerRef.current?.changed();
  }, [hoveredId, selectedIds, editMode, drawMode]);

  const setDoubleClickZoom = useCallback((enabled) => {
    const map = mapInstance.current;
    const dblZoom = map?.getInteractions().getArray().find((item) => item instanceof DoubleClickZoom);
    if (dblZoom) dblZoom.setActive(enabled);
  }, [mapInstance]);

  const setDrawModeEnabled = useCallback((enabled) => {
    if (enabled) {
      const hasPending = (sourceRef.current?.getFeatures() || []).some(isPendingPointFeature);
      if (!hasPending) {
        Swal.fire({
          icon: 'info',
          title: 'Tidak ada titik',
          text: 'Gambar polygon membutuhkan titik yang belum punya petak. Pilih NIK yang masih punya titik oranye.',
        });
        return;
      }
      setEditMode(false);
    } else {
      try {
        drawInteractionRef.current?.abortDrawing();
      } catch (error) {
        // ignore incomplete sketch
      }
    }
    drawModeRef.current = Boolean(enabled);
    setDrawMode(Boolean(enabled));
    drawInteractionRef.current?.setActive(Boolean(enabled));
    modifyRef.current?.setActive(!enabled);
    setDoubleClickZoom(!enabled);
    const viewport = mapInstance.current?.getViewport();
    if (viewport) viewport.style.cursor = enabled ? 'crosshair' : '';
    layerRef.current?.changed();
  }, [mapInstance, setDoubleClickZoom]);

  const handleUndoDrawVertex = useCallback(() => {
    drawInteractionRef.current?.removeLastPoint();
  }, []);

  const handleFinishDrawPolygon = useCallback(() => {
    try {
      drawInteractionRef.current?.finishDrawing();
    } catch (error) {
      setAlertMessage('Tambahkan minimal 3 sudut, lalu Selesai atau klik titik pertama.');
      setAlertOpen(true);
    }
  }, []);

  const selectNik = (nik) => {
    setDrawModeEnabled(false);
    setSelectedNik(nik);
    const next = new URLSearchParams(searchParams);
    if (nik) next.set('nik', nik);
    else next.delete('nik');
    setSearchParams(next, { replace: true });
    if (nik) setDetailOpen(true);
    if (isMobile) setListOpen(false);
  };

  const displayItems = useMemo(() => (
    (detail?.items || []).map((item) => ({
      ...item,
      ...(localOverrides[String(item.id)] || {}),
    }))
  ), [detail, localOverrides]);
  const selectedItems = useMemo(() => {
    if (!displayItems.length) return [];
    if (!selectedIds.size) return displayItems;
    return displayItems.filter((item) => selectedIds.has(String(item.id)));
  }, [displayItems, selectedIds]);

  const pendingTitik = displayItems.filter((item) => item.status === 'titik');
  const existingPetak = displayItems.filter((item) => item.status === 'petak');
  const selectedTitik = selectedItems.filter((item) => item.status === 'titik');
  const selectedPetak = selectedItems.filter((item) => item.status === 'petak');
  const generateFromPetakOnly = !dirty && pendingTitik.length === 0 && existingPetak.length > 0;
  const polygonGenerateIds = selectedIds.size
    ? selectedTitik.map((item) => item.id)
    : pendingTitik.map((item) => item.id);
  const titikGenerateIds = selectedIds.size
    ? selectedPetak.map((item) => item.id)
    : existingPetak.map((item) => item.id);
  const regenerateIds = (selectedIds.size ? selectedItems : displayItems)
    .map((item) => item.id);
  const titikCount = pendingTitik.length;
  const petakCount = existingPetak.length;
  const totalLuas = displayItems.reduce((sum, item) => sum + Number(item.luas || 0), 0);

  const zoomToItem = (item) => {
    const map = mapInstance.current;
    const source = sourceRef.current;
    if (!map || !source || !item?.id) return;
    const feature = source.getFeatureById(String(item.id));
    const geometry = feature?.getGeometry();
    if (!geometry) return;
    if (geometry.getType() === 'Point') {
      map.getView().animate({ center: geometry.getCoordinates(), zoom: 18, duration: 400 });
      return;
    }
    map.getView().fit(geometry.getExtent(), { duration: 400, padding: [72, 72, 72, 72], maxZoom: 19 });
  };

  const handleGeneratePolygon = async (ids, title) => {
    if (!selectedNik || !ids.length) {
      Swal.fire({ icon: 'info', title: 'Tidak ada data', text: 'Pilih titik yang belum punya petak untuk digenerate menjadi polygon.' });
      return;
    }
    const confirm = await Swal.fire({
      icon: 'question',
      title,
      text: title === 'Generate ulang polygon'
        ? `${ids.length} data akan digenerate ulang menjadi polygon petak.`
        : `${ids.length} titik akan digenerate menjadi polygon petak.`,
      showCancelButton: true,
      confirmButtonText: 'Generate polygon',
      cancelButtonText: 'Batal',
    });
    if (!confirm.isConfirmed) return;
    setBusy(true);
    try {
      const zoom = Math.round(mapInstance.current?.getView()?.getZoom() || 19);
      const res = await PetakService.generatePetakMonitor({ nik: selectedNik, ids, zoom });
      const generated = res.data?.data?.generated || 0;
      await loadDetail(selectedNik);
      await loadList();
      Swal.fire({ icon: 'success', title: 'Selesai', text: `${generated} polygon petak berhasil digenerate.` });
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Generate polygon gagal',
        text: error?.response?.data?.data || 'Layanan generate petak tidak merespons.',
      });
    } finally {
      setBusy(false);
    }
  };

  const handleGenerateTitik = async () => {
    const ids = titikGenerateIds;
    if (!selectedNik || !ids.length) {
      Swal.fire({ icon: 'info', title: 'Tidak ada data', text: 'Pilih polygon petak untuk dibuat titik centroid.' });
      return;
    }
    const confirm = await Swal.fire({
      icon: 'question',
      title: 'Generate titik',
      text: `${ids.length} petak akan diisi longitude/latitude dari centroid polygon. Data dan polygon yang sudah ada tidak diganti.`,
      showCancelButton: true,
      confirmButtonText: 'Generate titik',
      cancelButtonText: 'Batal',
    });
    if (!confirm.isConfirmed) return;
    setBusy(true);
    try {
      const res = await PetakService.generateTitikMonitor({ nik: selectedNik, ids });
      const generated = res.data?.data?.generated || 0;
      await loadDetail(selectedNik);
      await loadList();
      Swal.fire({
        icon: 'success',
        title: 'Selesai',
        text: generated
          ? `${generated} petak diperbarui titik centroidnya. Polygon tidak diubah.`
          : 'Tidak ada polygon yang bisa diisi centroid.',
      });
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Generate titik gagal',
        text: error?.response?.data?.data || 'Tidak bisa membuat titik dari centroid polygon.',
      });
    } finally {
      setBusy(false);
    }
  };

  const handleSaveEdits = async () => {
    const source = sourceRef.current;
    if (!source) return;
    const overrideIds = new Set(Object.keys(localOverrides));
    const items = source.getFeatures()
      .filter((feature) => !feature.get('sourcePoint'))
      .filter((feature) => {
        const id = String(feature.getId() || '');
        if (overrideIds.has(id)) return true;
        if (selectedIds.size === 0) return true;
        return selectedIds.has(id);
      })
      .filter((feature) => {
        const type = feature.getGeometry()?.getType();
        return type === 'Polygon' || type === 'MultiPolygon';
      })
      .map((feature) => {
        const clone = feature.getGeometry().clone();
        clone.transform('EPSG:3857', 'EPSG:4326');
        const geometry = addZDimension(geojsonFormat.writeGeometryObject(clone));
        const areaM2 = getGeodesicArea(clone, { projection: 'EPSG:4326' });
        return {
          id: String(feature.getId()),
          geometry,
          luas: Number.isFinite(areaM2) ? areaM2 / 10000 : 0,
          status: 'petak',
        };
      });
    if (!items.length) {
      Swal.fire({ icon: 'info', title: 'Tidak ada perubahan', text: 'Tidak ada polygon yang bisa disimpan.' });
      return;
    }
    setBusy(true);
    try {
      await PetakService.updatePetakGeometries({ items });
      setDirty(false);
      setEditMode(false);
      setDrawModeEnabled(false);
      await loadDetail(selectedNik);
      await loadList();
      Swal.fire({ icon: 'success', title: 'Tersimpan', text: `${items.length} petak berhasil diperbarui.` });
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Gagal', text: 'Tidak bisa menyimpan perubahan petak.' });
    } finally {
      setBusy(false);
    }
  };

  const summary = listData.summary || {};
  const pageCount = Math.max(1, Math.ceil((listData.total || 0) / (listData.limit || 20)));

  const listPanel = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <Box sx={{ p: 2, pb: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant="h6">Monitor Pendaftaran</Typography>
            <Typography variant="caption" color="text.secondary">
              Pantau titik terdaftar, generate petak, dan sunting polygon per NIK.
            </Typography>
          </Box>
          <Tooltip title="Sembunyikan panel">
            <IconButton size="small" aria-label="Sembunyikan daftar" onClick={() => setListOpen(false)}>
              {isMobile ? <CloseIcon fontSize="small" /> : <ChevronLeftIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
        </Box>
        <Stack spacing={1} sx={{ mt: 1.5 }}>
          <Stack direction="row" spacing={1}>
            <Paper variant="outlined" sx={{ flex: 1, p: 1 }}>
              <Typography variant="caption" color="text.secondary">NIK</Typography>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{summary.total_nik || 0}</Typography>
            </Paper>
            <Paper variant="outlined" sx={{ flex: 1, p: 1 }}>
              <Typography variant="caption" color="text.secondary">Petak</Typography>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#2E7D32' }}>{summary.petak || 0}</Typography>
            </Paper>
          </Stack>
          <Paper
            variant="outlined"
            sx={{
              p: 1,
              borderColor: (summary.titik || 0) > 0 ? '#E65100' : 'divider',
              bgcolor: (summary.titik || 0) > 0 ? 'rgba(230, 81, 0, 0.10)' : undefined,
            }}
          >
            <Typography variant="caption" color="text.secondary">Titik belum punya petak</Typography>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#E65100' }}>
              {summary.titik || 0}
            </Typography>
          </Paper>
        </Stack>
        <TextField
          size="small"
          fullWidth
          placeholder="Cari NIK"
          value={searchInput}
          onChange={(event) => {
            setPage(1);
            setSearchInput(event.target.value);
          }}
          sx={{ mt: 1.5 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
        />
        <ToggleButtonGroup
          exclusive
          fullWidth
          size="small"
          value={statusFilter}
          onChange={(_, value) => {
            if (!value) return;
            setPage(1);
            setStatusFilter(value);
          }}
          sx={{ mt: 1 }}
        >
          <ToggleButton value="all">Semua</ToggleButton>
          <ToggleButton value="titik">Perlu generate</ToggleButton>
          <ToggleButton value="petak">Sudah petak</ToggleButton>
        </ToggleButtonGroup>
      </Box>
      <Divider />
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {listLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={28} />
          </Box>
        ) : (
          <List dense disablePadding>
            {(listData.items || []).map((item) => (
              <ListItemButton
                key={item.nik}
                selected={item.nik === selectedNik}
                onClick={() => selectNik(item.nik)}
                sx={{
                  alignItems: 'flex-start',
                  py: 1.25,
                  borderLeft: item.titik > 0 ? '4px solid #E65100' : '4px solid transparent',
                  bgcolor: item.nik === selectedNik
                    ? undefined
                    : item.titik > 0
                      ? 'rgba(230, 81, 0, 0.10)'
                      : undefined,
                }}
              >
                <ListItemText
                  primary={item.nik}
                  secondary={
                    <Box component="span" sx={{ display: 'block' }}>
                      <Typography variant="caption" color="text.secondary" component="span">
                        {item.total} data · {Number(item.total_luas || 0).toFixed(2)} ha
                        {` · ${item.titik_coord ?? item.titik ?? 0} titik`}
                        {item.titik > 0 ? ` · ${item.titik} belum petak` : ''}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5, flexWrap: 'wrap' }}>
                        <Chip
                          size="small"
                          color="primary"
                          variant="outlined"
                          icon={<PlaceIcon />}
                          label={`${item.titik_coord ?? item.titik ?? 0} titik`}
                        />
                        <Chip
                          size="small"
                          color={item.titik > 0 ? 'warning' : 'default'}
                          label={`${item.titik} belum petak`}
                        />
                        <Chip size="small" color="success" icon={<PentagonIcon />} label={`${item.petak} petak`} />
                      </Box>
                      <Typography variant="caption" color="text.secondary" component="span" sx={{ display: 'block', mt: 0.5 }}>
                        {formatDate(item.last_created)}
                      </Typography>
                    </Box>
                  }
                />
              </ListItemButton>
            ))}
            {!listData.items?.length && (
              <Typography variant="body2" color="text.secondary" sx={{ px: 2, py: 3 }}>
                Belum ada pendaftaran yang sesuai filter.
              </Typography>
            )}
          </List>
        )}
      </Box>
      <Divider />
      <Box sx={{ p: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="caption">{listData.total || 0} NIK</Typography>
        <Box>
          <Button size="small" disabled={page <= 1} onClick={() => setPage((prev) => Math.max(1, prev - 1))}>Prev</Button>
          <Typography variant="caption" sx={{ mx: 1 }}>{page}/{pageCount}</Typography>
          <Button size="small" disabled={page >= pageCount} onClick={() => setPage((prev) => prev + 1)}>Next</Button>
        </Box>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <Box ref={mapRef} sx={{ position: 'absolute', inset: 0, bgcolor: '#d7dce0' }} />
      {(loading || !isAuthenticated) && (
        <Box sx={{
          position: 'absolute', inset: 0, zIndex: 2000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          bgcolor: 'rgba(255,255,255,0.72)',
        }}>
          <Spinner className="content-loader" />
        </Box>
      )}

      <GeolocationControl mapInstance={mapInstance.current} isMobile={isMobile} />

      {selectedNik && (
        <Box
          sx={{
            position: 'absolute',
            bottom: isMobile ? 16 : 24,
            left: isMobile || !listOpen ? 12 : 412,
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
            maxWidth: isMobile ? 'calc(100% - 24px)' : 360,
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
              Buat petak dari titik
            </Typography>
            <Button
              size="small"
              variant={drawMode ? 'contained' : 'outlined'}
              startIcon={<CreateIcon />}
              disabled={busy || !pendingTitik.length}
              onClick={() => setDrawModeEnabled(!drawMode)}
            >
              Gambar polygon
            </Button>
            <Button
              size="small"
              variant="contained"
              startIcon={busy ? <CircularProgress size={14} color="inherit" /> : <PentagonIcon />}
              disabled={busy || !polygonGenerateIds.length}
              onClick={() => handleGeneratePolygon(polygonGenerateIds, 'Generate polygon')}
            >
              Generate polygon
            </Button>
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
              Klik peta untuk menambah sudut. Snap ke titik oranye, minimal 3, lalu Selesai.
            </Alert>
          )}
        </Box>
      )}

      {isMobile ? (
        <Drawer open={listOpen} onClose={() => setListOpen(false)} PaperProps={{ sx: { width: 340 } }}>
          {listPanel}
        </Drawer>
      ) : listOpen ? (
        <Paper elevation={8} sx={{
          position: 'absolute', top: 16, left: 16, bottom: 16, width: 380, zIndex: 1100,
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          {listPanel}
        </Paper>
      ) : null}

      {!listOpen && (
        <Tooltip title="Tampilkan daftar">
          <IconButton
            onClick={() => setListOpen(true)}
            aria-label="Tampilkan daftar"
            sx={{ position: 'absolute', top: 16, left: 16, zIndex: 1200, bgcolor: '#fff', boxShadow: 2 }}
          >
            <MenuIcon />
          </IconButton>
        </Tooltip>
      )}

      {selectedNik && !detailOpen && (
        <Paper elevation={8} sx={{
          position: 'absolute',
          top: 16,
          right: 16,
          zIndex: 1100,
          maxWidth: isMobile ? 'calc(100% - 72px)' : 280,
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, pl: 1.25, pr: 0.5, py: 0.5 }}>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography variant="caption" noWrap sx={{ fontWeight: 700, display: 'block' }}>
                {selectedNik}
              </Typography>
              <Typography variant="caption" color="text.secondary" noWrap>
                {detail ? `${titikCount} belum petak · ${petakCount} petak` : 'Memuat...'}
              </Typography>
            </Box>
            <Tooltip title="Tampilkan panel">
              <IconButton size="small" aria-label="Tampilkan panel detail" onClick={() => setDetailOpen(true)}>
                <ChevronLeftIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </Paper>
      )}

      {selectedNik && detailOpen && (
        <Paper elevation={8} sx={{
          position: 'absolute',
          top: 16,
          right: 16,
          width: isMobile ? 'calc(100% - 32px)' : 420,
          maxHeight: isMobile ? '46vh' : 'calc(100% - 32px)',
          zIndex: 1100,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}>
          <Box sx={{ p: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography variant="subtitle1" noWrap sx={{ fontWeight: 700 }}>{selectedNik}</Typography>
              <Typography variant="caption" color="text.secondary">
                {detail ? `${titikCount} belum petak · ${petakCount} petak · ${totalLuas.toFixed(2)} ha` : 'Memuat...'}
              </Typography>
            </Box>
            <Tooltip title="Muat ulang">
              <span>
                <IconButton size="small" onClick={() => { loadDetail(selectedNik); loadList(); }} disabled={detailLoading || busy}>
                  <RefreshIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Sembunyikan panel">
              <IconButton size="small" aria-label="Sembunyikan panel detail" onClick={() => setDetailOpen(false)}>
                <ChevronRightIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Tutup NIK">
              <IconButton size="small" onClick={() => selectNik('')}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
          <Divider />
          <Stack direction="row" spacing={0.75} sx={{ p: 1, flexWrap: 'wrap', gap: 0.75 }}>
            <Button
              size="small"
              variant="contained"
              startIcon={busy ? <CircularProgress size={14} color="inherit" /> : <PentagonIcon />}
              disabled={busy || !polygonGenerateIds.length}
              onClick={() => handleGeneratePolygon(polygonGenerateIds, 'Generate polygon')}
            >
              Generate polygon
            </Button>
            <Button
              size="small"
              color={drawMode ? 'warning' : 'primary'}
              variant={drawMode ? 'contained' : 'outlined'}
              startIcon={<CreateIcon />}
              disabled={busy || !pendingTitik.length}
              onClick={() => setDrawModeEnabled(!drawMode)}
            >
              {drawMode ? 'Selesai gambar' : 'Gambar polygon'}
            </Button>
            <Button
              size="small"
              variant="outlined"
              startIcon={<PlaceIcon />}
              disabled={busy || !titikGenerateIds.length}
              onClick={handleGenerateTitik}
            >
              Generate titik
            </Button>
            <Button
              size="small"
              variant="outlined"
              startIcon={<AutoFixHighIcon />}
              disabled={busy || !regenerateIds.length}
              onClick={() => handleGeneratePolygon(regenerateIds, 'Generate ulang polygon')}
            >
              Generate ulang
            </Button>
            <Button
              size="small"
              color={editMode ? 'warning' : 'primary'}
              variant={editMode ? 'contained' : 'outlined'}
              startIcon={<EditIcon />}
              disabled={busy || (selectedIds.size > 0 && selectedPetak.length === 0)}
              onClick={() => {
                setDrawModeEnabled(false);
                setEditMode((prev) => !prev);
              }}
            >
              {editMode ? 'Selesai edit' : 'Edit petak'}
            </Button>
            <Button
              size="small"
              color="success"
              variant="contained"
              startIcon={<SaveIcon />}
              disabled={busy || !dirty}
              onClick={handleSaveEdits}
            >
              Simpan
            </Button>
          </Stack>
          {pendingTitik.length > 0 && (
            <Alert severity="warning" sx={{ mx: 1, mb: 1, py: 0 }}>
              {pendingTitik.length} titik belum punya petak. Generate polygon, atau gambar polygon sendiri dari titik oranye.
            </Alert>
          )}
          {drawMode && (
            <Alert severity="info" sx={{ mx: 1, mb: 1, py: 0 }}>
              Pilih titik oranye, lalu klik peta untuk menambah sudut. Snap ke titik, minimal 3 sudut, lalu Selesai.
            </Alert>
          )}
          {dirty && !drawMode && (
            <Alert severity="warning" sx={{ mx: 1, mb: 1, py: 0 }}>
              Ada polygon yang belum disimpan. Klik Simpan agar petak tercatat.
            </Alert>
          )}
          {generateFromPetakOnly && (
            <Alert severity="info" sx={{ mx: 1, mb: 1, py: 0 }}>
              NIK ini hanya punya petak. Generate titik mengisi lon/lat dari centroid, tanpa menambah baris baru.
            </Alert>
          )}
          {editMode && (
            <Alert severity="info" sx={{ mx: 1, mb: 1, py: 0 }}>
              Geser sudut polygon untuk mengubah bentuk, lalu simpan.
            </Alert>
          )}
          <Box sx={{ flex: 1, overflow: 'auto', px: 1, pb: 1 }}>
            {detailLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                <CircularProgress size={24} />
              </Box>
            ) : displayItems.map((item) => {
              const selected = selectedIds.has(String(item.id));
              const pending = item.status === 'titik';
              const unsaved = Boolean(localOverrides[String(item.id)]);
              return (
                <Paper
                  key={item.id}
                  variant="outlined"
                  onMouseEnter={() => { setHoveredId(String(item.id)); hoveredIdRef.current = String(item.id); layerRef.current?.changed(); }}
                  onClick={() => {
                    setSelectedIds((prev) => {
                      const next = new Set(prev);
                      const key = String(item.id);
                      if (next.has(key)) next.delete(key);
                      else next.add(key);
                      return next;
                    });
                    layerRef.current?.changed();
                  }}
                  sx={{
                    p: 1,
                    mb: 0.75,
                    cursor: 'pointer',
                    borderColor: selected ? 'primary.main' : pending ? '#E65100' : 'divider',
                    bgcolor: selected
                      ? 'rgba(21, 101, 192, 0.06)'
                      : pending
                        ? 'rgba(230, 81, 0, 0.12)'
                        : '#fff',
                    boxShadow: pending ? '0 0 0 1px rgba(230, 81, 0, 0.35)' : undefined,
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography variant="caption" sx={{ fontWeight: 700, display: 'block' }}>
                        {item.idpetak}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 0.5, mt: 0.25, flexWrap: 'wrap' }}>
                        <Chip
                          size="small"
                          color={pending ? 'warning' : 'success'}
                          label={pending ? 'Belum petak' : 'Sudah petak'}
                        />
                        {unsaved && <Chip size="small" color="warning" label="Belum disimpan" />}
                        <Chip size="small" label={`${Number(item.luas || 0).toFixed(2)} ha`} />
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        {Number(item.longitude || 0).toFixed(6)}, {Number(item.latitude || 0).toFixed(6)}
                      </Typography>
                    </Box>
                    <IconButton size="small" onClick={(event) => { event.stopPropagation(); zoomToItem(item); }}>
                      <ZoomInIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Paper>
              );
            })}
          </Box>
        </Paper>
      )}

      <Snackbar open={alertOpen} autoHideDuration={4000} onClose={() => setAlertOpen(false)}>
        <Alert severity="error" onClose={() => setAlertOpen(false)}>{alertMessage}</Alert>
      </Snackbar>
    </Box>
  );
};

export default MapDashboard;
