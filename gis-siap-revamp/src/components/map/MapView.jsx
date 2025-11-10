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
import { useURLParams } from '../../hooks/useURLParams';
import { createBasemapLayer } from '../../utils/mapUtils';
import { handleSearch } from '../../utils/mapUtils';
import { getPercilStyle } from '../../utils/percilStyles';
import { createPetak, getPetakID, getPetakUser } from '../../actions/petakActions';
import BasemapSwitcher from './BasemapSwitcher';
import GeolocationControl from './GeolocationControl';
import Spinner from '../Spinner/Loading-spinner';
import DataPanel from './DataPanel';
import LayerPanel from './LayerPanel';

const MapRegister = () => {
  const dispatch = useDispatch();
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);
  const { loading, errmessage } = useSelector((state) => state.auth);
  const listPetak  = useSelector((state) => state.petak.petaklist);

  const { formData, setFormData, isDataLoaded } = useURLParams();

  const [searchInput, setSearchInput] = useState(formData.address);
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
    `function_zxy_id_petakuser/{z}/{x}/{y}?id=${formData.nik}`,
  );

  // Global message debug handler
  useEffect(() => {
    const debugMessageHandler = (e) => {
      console.log("MapView - DEBUG: All messages received:", e.data);
      console.log("MapView - DEBUG: Message origin:", e.origin);
      console.log("MapView - DEBUG: Message timestamp:", new Date().toISOString());
    };

    console.log("MapView - Adding debug message event listener");
    window.addEventListener('message', debugMessageHandler);
    
    return () => {
      console.log("MapView - Removing debug message event listener");
      window.removeEventListener('message', debugMessageHandler);
    };
  }, []);

  // Fallback message handler for iframe data
  useEffect(() => {
    const handleMessage = (e) => {
      console.log("MapView - Fallback message handler received:", e.data);
      console.log("MapView - Message origin:", e.origin);
      
      // Only process if useURLParams hasn't already processed this data
      if (e.data && (e.data.nik || e.data.idKelompok) && !isDataLoaded) {
        console.log("MapView - Processing message in fallback handler:", e.data);
        
        // Map tanggalTanam to tglKejadian if available
        const processedData = {
          ...e.data,
          tglKejadian: e.data.tanggalTanam || e.data.tglKejadian || ''
        };
        
        console.log("MapView - Setting formData via fallback:", processedData);
        setFormData(processedData);
        setSearchInput(processedData.address || '');
        
        // Trigger search if map is ready
        setTimeout(() => {
          if (mapInstance.current && processedData.address) {
            console.log("MapView - Triggering search from fallback:", processedData.address);
            handleSearch(processedData.address, mapInstance.current, process.env.REACT_APP_GOOGLE_API_KEY);
          }
        }, 1000);
      }
    };

    console.log("MapView - Adding fallback message event listener");
    window.addEventListener('message', handleMessage);
    
    return () => {
      console.log("MapView - Removing fallback message event listener");
      window.removeEventListener('message', handleMessage);
    };
  }, [isDataLoaded, mapInstance, setFormData]);

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

    if (selectedPercils.length > formData.jmlPetak) {
      setAlertMessage(`Jumlah petak terpilih saat ini ${selectedPercils.length}, tidak dapat lebih dari ${formData.jmlPetak}`);
      setAlertOpen(true);
      setIsValid(false);
      return;
    }

    const luasLahanFloat = parseFloat(formData.luasLahan);
    const areaLimit = luasLahanFloat + (luasLahanFloat * 0.25);
    
    if (totalArea > areaLimit) {
      setAlertMessage(`Total area terpilih (${totalArea.toFixed(2)} ha), batas toleransi yang diizinkan (${areaLimit.toFixed(2)} ha)`);
      setAlertOpen(true);
      setIsValid(false);
    } else {
      setIsValid(true);
    }
  }, [selectedPercils, totalArea, formData.jmlPetak, formData.luasLahan, isDataLoaded]);

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
      const isLimitReached = totalPetak >= formData.jmlPetak;
      polygonLayerRef.current.setStyle(getPercilStyle(selectedPercils, lockedIDs, isLimitReached));
      polygonLayerRef.current.changed();
    }
  }, [selectedPercils, listPetak, formData.jmlPetak]);

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
      nik: formData.nik,
      idpetak: p.id,
      luas: p.area,
      musim_tanam: formData.musimTanam || 'MT1', // Default value if not provided
      tgl_tanam: formData.tanggalTanam || new Date().toISOString().split('T')[0], // Default to today
      tgl_panen: formData.tanggalPanen || new Date(Date.now() + 90*24*60*60*1000).toISOString().split('T')[0], // Default to 90 days from now
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

  // Update polygon layer when formData changes
  useEffect(() => {
    if (!polygonLayerRef.current || !mapInstance.current) return;
    
    // Validate that we have the required data
    if (!formData.nik || formData.nik.trim() === '') {
      console.log("MapView - No NIK available, skipping tile layer update");
      return;
    }

    const newTileUrl = `function_zxy_id_petakuser/{z}/{x}/{y}?id=${formData.nik}`;
    console.log("MapView - Updating tile URL:", newTileUrl);
    
    // Check if REACT_APP_TILE_URL is defined
    const baseTileUrl = process.env.REACT_APP_TILE_URL;
    if (!baseTileUrl) {
      console.error("MapView - REACT_APP_TILE_URL environment variable is not defined");
      return;
    }

    setTileUrl(newTileUrl);

    // Create new source with updated URL
    const fullTileUrl = `${baseTileUrl}/${newTileUrl}`;
    console.log("MapView - Full tile URL:", fullTileUrl);
    
    const newSource = new VectorTileSource({
      format: new MVT(),
      url: fullTileUrl,
    });

    // Update the layer's source
    polygonLayerRef.current.setSource(newSource);
    polygonLayerRef.current.setVisible(true); // Make sure layer is visible
    polygonLayerRef.current.changed();

  }, [formData.idkec, formData.nik, formData.idkab, mapInstance, polygonLayerRef]);

  useAuthListener();

  useEffect(() => {
    console.log("MapView - Current formData:", formData);
    console.log("MapView - isDataLoaded:", isDataLoaded);
    console.log("MapView - Environment variables:", {
      REACT_APP_TILE_URL: process.env.REACT_APP_TILE_URL,
      REACT_APP_GOOGLE_API_KEY: process.env.REACT_APP_GOOGLE_API_KEY ? 'SET' : 'NOT SET'
    });
    
    if (formData.nik && formData.nik.trim() !== '') {
      console.log("MapView - Fetching petak data for NIK:", formData.nik);
      dispatch(getPetakUser(formData.nik));
    } else {
      console.log("MapView - No NIK available, skipping petak data fetch");
    }
  }, [formData.nik, dispatch, formData, isDataLoaded]);

  // Aggressive data request mechanism
  useEffect(() => {
    if (!isDataLoaded) {
      console.log("MapView - Data not loaded, requesting from parent iframe");
      
      const requestData = () => {
        console.log("MapView - Requesting data from parent iframe");
        if (window.parent && window.parent !== window) {
          window.parent.postMessage({ type: 'REQUEST_DATA' }, '*');
        }
      };
      
      // Request data multiple times with increasing intervals
      const intervals = [100, 500, 1000, 2000, 5000];
      intervals.forEach((delay, index) => {
        setTimeout(() => {
          if (!isDataLoaded) {
            console.log(`MapView - Data request attempt ${index + 1}`);
            requestData();
          }
        }, delay);
      });
    }
  }, [isDataLoaded]);

  // Manual data loading for debugging
  useEffect(() => {
    // Add a global function for manual testing
    window.testDataLoading = () => {
      console.log("MapView - Manual test: Setting test data");
      const testData = {
        nik: '312328-021093-0456',
        nama: 'Ata',
        address: 'Desa Dukuh',
        idkab: '3201',
        idkec: '320101',
        jmlPetak: 5,
        luasLahan: 2.5,
        musimTanam: 'MT1',
        tanggalTanam: '2025-09-09',
        tanggalPanen: '2025-12-31'
      };
      
      console.log("MapView - Manual test: Setting formData with test data:", testData);
      setFormData(testData);
      setSearchInput(testData.address);
    };
    
    console.log("MapView - Manual test function available: window.testDataLoading()");
  }, [setFormData]);

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
              formData={formData}
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