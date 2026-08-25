import 'ol/ol.css';
import "ol-ext/dist/ol-ext.css";
import React, { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Autocomplete } from '@react-google-maps/api';
import { Box, Tabs, Tab, IconButton, Snackbar, Alert } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ListIcon from '@mui/icons-material/List';
import LayersIcon from '@mui/icons-material/Layers';
import Swal from 'sweetalert2';
import { fromLonLat } from 'ol/proj';
import { VectorTile as VectorTileLayer } from 'ol/layer';
import VectorTileSource from 'ol/source/VectorTile';
import MVT from 'ol/format/MVT';
import { useMap } from '../../hooks/useMap';
import { useAuthListener } from '../../hooks/useAuthListener';
import { useAuthReady } from '../../hooks/useAuthReady';
import { useLocation } from 'react-router-dom';
import { createBasemapLayer } from '../../utils/mapUtils';
import { handleSearch } from '../../utils/mapUtils';
import { getPercilStyle } from '../../utils/percilStyles';
import { createPetak, getPetakID, getPetakUser } from '../../actions/petakActions';
import { getDetailPeserta } from '../../actions/anggotaActions';
import BasemapSwitcher from './BasemapSwitcher';
import GeolocationControl from './GeolocationControl';
import Spinner from '../Spinner/Loading-spinner';
import DataPanel from './DataPanel';
import LayerPanel from './LayerPanel';

const MapRegister = () => {
  const dispatch = useDispatch();
  const location = useLocation();
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);
  const { loading, errmessage } = useSelector((state) => state.auth);
  const listPetak  = useSelector((state) => state.petak.petaklist);
  const { isAuthReady, token } = useAuthReady();

  // Get nik and idKelompok from URL parameters
  const nikFromUrl = new URLSearchParams(location.search).get('nik') || '';
  const idKelompokFromUrl = new URLSearchParams(location.search).get('idkelompok') || '';

  const [isDataLoaded, setIsDataLoaded] = useState(!!(nikFromUrl || idKelompokFromUrl));
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

  // Track if detail peserta has been fetched to prevent re-fetching
  const detailPesertaFetchedRef = React.useRef(false);
  
  // Fetch detail peserta when nik, idKelompok, and token are available (only once)
  useEffect(() => {
    const fetchDetailPeserta = async () => {
      const currentNik = nikFromUrl || formResponse.nik;
      const currentIdKelompok = idKelompokFromUrl || formResponse.idKelompok;
      
      // Prevent re-fetching if already fetched for this combination
      const fetchKey = `${currentNik}-${currentIdKelompok}`;
      if (detailPesertaFetchedRef.current === fetchKey) {
        return;
      }
      
      // Wait until auth + token are ready before protected API calls
      if (currentNik && currentIdKelompok && isAuthReady && !isFetchingDetail) {
        setIsFetchingDetail(true);
        try {
          // Token is automatically added by axios interceptor, no need to pass it explicitly
          const result = await dispatch(getDetailPeserta(currentIdKelompok, currentNik));
          
          // Handle nested response structure: result.data.data.status and result.data.data.data
          if (result && result.data && result.data.status === 200 && result.data.data) {
            const data = result.data.data;
            // Store the API response data directly
            setFormResponse(prev => ({
              ...prev,
              nik: currentNik,
              idKelompok: currentIdKelompok,
              nama: data.nama || prev.nama,
              address: data.address || prev.address,
              idkab: data.idkab || prev.idkab,
              idkec: data.idkec || prev.idkec,
              luasLahan: data.luasLahan || prev.luasLahan,
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
            // Mark as fetched for this combination
            detailPesertaFetchedRef.current = fetchKey;
          }
        } catch (error) {
          console.error('Error fetching detail peserta:', error);
        } finally {
          setIsFetchingDetail(false);
        }
      }
    };

    fetchDetailPeserta();
  }, [dispatch, nikFromUrl, idKelompokFromUrl, isAuthReady]);

  // Initialize all form values as reactive variables using useMemo from formResponse
  const formDataValues = React.useMemo(() => {
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
  const { nik, nama, address, idkab, idkec, jmlPetak, luasLahan, noPolis, idKelompok, idKlaim } = formDataValues;

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
  const [tileUrl, setTileUrl] = useState();

  const handlePercilSelect = useCallback(async (percilData) => {
    try {
      const idPetak = await dispatch(getPetakID(percilData.id));
      if (Array.isArray(idPetak) && idPetak.length > 0) {
        setAlertMessage(`Tidak Dapat Dipilih, Lahan ini sudah didaftarkan sebelumnya`);
        setAlertOpen(true);
        return;
      }

      setSelectedPercils((prev) => {
        const exists = prev.find((p) => p.id === percilData.id);
        const updated = exists
          ? prev.filter((p) => p.id !== percilData.id)
          : [...prev, percilData];

        if (polygonLayerRef.current) {
          const lockedIDs = (listPetak || []).map(p => p.idpetak || p.id);
          polygonLayerRef.current.setStyle(getPercilStyle(updated, lockedIDs));
          polygonLayerRef.current.changed();
        }
        return updated;
      });
    } catch (err) {
      console.error('Error processing feature:', err);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'An error occurred while processing.',
      });
    }
  }, [dispatch]);

  const { mapRef, mapInstance, polygonLayerRef, basemapLayerRef } = useMap(
    isAuthenticated,
    process.env.REACT_APP_GOOGLE_API_KEY,
    handlePercilSelect,
    nik ? `function_zxy_petakuser_by_nik/{z}/{x}/{y}?nik=${nik}` : "",
  );

  useEffect(() => {
    // Handle search input update when formResponse changes
    if (formResponse.address) {
      setSearchInput(formResponse.address);
      setTimeout(() => {
        if (mapInstance.current) {
          handleSearch(formResponse.address, mapInstance.current, process.env.REACT_APP_GOOGLE_API_KEY);
        }
      }, 1000);
    }
  }, [formResponse.address, mapInstance]);

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

    if (jmlPetak && selectedPercils.length > jmlPetak) {
      setAlertMessage(`Jumlah petak terpilih saat ini ${selectedPercils.length}, tidak dapat lebih dari ${jmlPetak}`);
      setAlertOpen(true);
      setIsValid(false);
      return;
    }

    const luasLahanFloat = parseFloat(luasLahan);
    const areaLimit = luasLahanFloat + (luasLahanFloat * 0.25);
    
    if (totalArea > areaLimit) {
      setAlertMessage(`Total area terpilih (${totalArea.toFixed(2)} ha), batas toleransi yang diizinkan (${areaLimit.toFixed(2)} ha)`);
      setAlertOpen(true);
      setIsValid(false);
    } else {
      setIsValid(true);
    }
  }, [selectedPercils, totalArea, jmlPetak, luasLahan, isDataLoaded]);

  useEffect(() => {
    if (polygonLayerRef.current) {
      polygonLayerRef.current.setVisible(isPolygonVisible);
      polygonLayerRef.current.setOpacity(polygonOpacity);
    }
  }, [isPolygonVisible, polygonOpacity]);

  // Update map style when listPetak changes
  useEffect(() => {
    if (polygonLayerRef.current) {
      const lockedIDs = (listPetak || []).map(p => p.idpetak || p.id);
      const totalRegisteredPetak = (listPetak || []).length;
      const totalSelectedPetak = selectedPercils.length;
      const totalPetak = totalRegisteredPetak + totalSelectedPetak;
      const isLimitReached = totalPetak >= jmlPetak;
      polygonLayerRef.current.setStyle(getPercilStyle(selectedPercils, lockedIDs, isLimitReached));
      polygonLayerRef.current.changed();
    }
  }, [selectedPercils, listPetak, jmlPetak]);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handlePlaceChange = () => {
    const place = autocomplete.getPlace();
    if (place.geometry) {
      const location = place.geometry.location;
      mapInstance.current.getView().animate({
        center: fromLonLat([location.lng(), location.lat()]),
        zoom: 17,
        duration: 1000,
      });
    }
  };

  const handleSimpan = async () => {
    const payload = selectedPercils.map(p => ({
      nik: nik,
      idpetak: p.id,
      luas: p.area,
      musim_tanam: formResponse.musimTanam || 'MT1', // Default value if not provided
      tgl_tanam: formResponse.tanggalTanam || new Date().toISOString().split('T')[0], // Default to today
      tgl_panen: formResponse.tanggalPanen || new Date(Date.now() + 90*24*60*60*1000).toISOString().split('T')[0], // Default to 90 days from now
      geometry: p.geometry,
    }));

    try {
      await dispatch(createPetak(payload));
      Swal.fire({
        icon: "success",
        title: "Success",
        text: "Data Berhasil Disimpan.",
      });
    } catch (error) {
      console.error("Error:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Gagal Menyimpan Data.",
      });
    }
  };

  // Update polygon layer when nik changes
  useEffect(() => {
    if (!polygonLayerRef.current || !mapInstance.current) return;
    
    // Validate that we have the required data
    if (!nik || nik.trim() === '') {
      //console.log("MapView - No NIK available, skipping tile layer update");
      return;
    }

    const newTileUrl = `function_zxy_petakuser_by_nik/{z}/{x}/{y}?nik=${nik}`;
    //console.log("MapView - Updating tile URL:", newTileUrl);
    
    // Check if REACT_APP_TILE_URL is defined
    const baseTileUrl = process.env.REACT_APP_TILE_URL;
    if (!baseTileUrl) {
     // console.error("MapView - REACT_APP_TILE_URL environment variable is not defined");
      return;
    }

    setTileUrl(newTileUrl);

    // Create new source with updated URL
    const fullTileUrl = `${baseTileUrl}/${newTileUrl}`;
    //("MapView - Full tile URL:", fullTileUrl);
    
    const newSource = new VectorTileSource({
      format: new MVT(),
      url: fullTileUrl,
    });

    // Update the layer's source
    polygonLayerRef.current.setSource(newSource);
    polygonLayerRef.current.setVisible(true); // Make sure layer is visible
    polygonLayerRef.current.changed();

  }, [idkec, nik, idkab, mapInstance, polygonLayerRef]);

  useAuthListener();

  useEffect(() => {
    if (!isAuthReady) return;
    const currentNik = (nik || '').trim();
    if (!currentNik) return;

    dispatch(getPetakUser(currentNik));
  }, [isAuthReady, nik, dispatch]);

  if (loading) {
    return <Spinner className="content-loader" />;
  }

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
      {isAuthenticated && (
        <div
          ref={mapRef}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />
      )}

      <GeolocationControl mapInstance={mapInstance.current} />

      <div
        style={{
          position: 'absolute',
          top: '20px',
          right: '40px',
          width: '100%',
          maxWidth: '320px',
          background: 'rgba(255, 255, 255, 0.95)',
          borderRadius: '16px',
          padding: '0 10px 10px 10px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          zIndex: 1000,
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        <Box>
          <Tabs value={tabValue} onChange={handleTabChange}>
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
              listPetak={listPetak}
              source="MapView"
              mapInstance={mapInstance}
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
            />
          )}
        </Box>
      </div>

      <div
        style={{
          position: 'absolute',
          top: '10px',
          left: '20px',
          padding: '10px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
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
              padding: '10px 15px',
              borderRadius: '5px',
              border: '1px solid #ccc',
              outline: 'none',
              width: '250px',
            }}
          />
        </Autocomplete>
        <IconButton
          onClick={() => handleSearch(searchInput, mapInstance.current, process.env.REACT_APP_GOOGLE_API_KEY)}
          style={{
            borderRadius: '25%',
            backgroundColor: '#1976d2',
            color: 'white',
            padding: '7px',
          }}
        >
          <SearchIcon />
        </IconButton>
      </div>

      <Snackbar open={alertOpen} onClose={() => setAlertOpen(false)}>
        <Alert onClose={() => setAlertOpen(false)} severity="error" sx={{ width: '100%' }}>
          {alertMessage}
        </Alert>
      </Snackbar>
    </div>
  );
};

export default MapRegister; 