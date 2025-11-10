import 'ol/ol.css';
import "ol-ext/dist/ol-ext.css";
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
// import { Autocomplete } from '@react-google-maps/api';
import { Box, Tabs, Tab, IconButton, Snackbar, Alert } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ListIcon from '@mui/icons-material/List';
import LayersIcon from '@mui/icons-material/Layers';
import RefreshIcon from '@mui/icons-material/Refresh';
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
import { createKlaim, getKlaimID, deleteKlaim, getKlaimUser } from '../../actions/klaimActions';
import BasemapSwitcher from './BasemapSwitcher';
import GeolocationControl from './GeolocationControl';
import Spinner from '../Spinner/Loading-spinner';
import DataPanel from './DataPanel';
import LayerPanel from './LayerPanel';

const MapRegister = () => {
  
  const dispatch = useDispatch();
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);
  const { loading, errmessage } = useSelector((state) => state.auth);
  const { loading: klaimLoading } = useSelector((state) => state.klaim);
  const listKlaim = useSelector((state) => state.klaim.klaimlist);

  const { formData, setFormData, isDataLoaded } = useURLParams();

  const [searchInput, setSearchInput] = useState(formData.address);
  const [selectedPercils, setSelectedPercils] = useState([]);
  const [autocomplete, setAutocomplete] = useState(null);
  const [autocompleteService, setAutocompleteService] = useState(null);
  const [placesService, setPlacesService] = useState(null);
  const [isGoogleMapsLoaded, setIsGoogleMapsLoaded] = useState(false);
  const [selectedBasemap, setSelectedBasemap] = useState("map-switch-basic");
  const [tabValue, setTabValue] = useState(0);
  const [isPolygonVisible, setIsPolygonVisible] = useState(true);
  const [polygonOpacity, setPolygonOpacity] = useState(1);
  const [totalArea, setTotalArea] = useState(0);
  const [isValid, setIsValid] = useState(true);
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [tileUrl, setTileUrl] = useState();

  // Check if Google Maps API is loaded
  useEffect(() => {
    let attempts = 0;
    const maxAttempts = 100; // 10 seconds max
    
    const checkGoogleMaps = () => {
      attempts++;
      if (window.google && window.google.maps && window.google.maps.places && window.google.maps.places.Autocomplete) {
        // Initialize Google Maps services
        const autocompleteService = new window.google.maps.places.AutocompleteService();
        const placesService = new window.google.maps.places.PlacesService(document.createElement('div'));
        setAutocompleteService(autocompleteService);
        setPlacesService(placesService);
        setIsGoogleMapsLoaded(true);
      } else if (attempts < maxAttempts) {
        // Retry after a short delay
        setTimeout(checkGoogleMaps, 100);
      } else {
        // Still set to true to show the input field without autocomplete
        setIsGoogleMapsLoaded(true);
      }
    };
    
    // Start checking after a small delay to allow the script to load
    setTimeout(checkGoogleMaps, 200);
  }, []);

  const handlePercilSelect = useCallback(async (percilData) => {
    try {
      // Check if user has already reached the maximum number of petak allowed
      const totalRegisteredKlaim = (listKlaim || []).length;
      const totalSelectedPetak = selectedPercils.length;
      const totalPetak = totalRegisteredKlaim + totalSelectedPetak;
      
    /*   if (totalPetak >= formData.jmlPetak) {
        setAlertMessage(`Tidak dapat menambah petak lagi. Total petak (terdaftar: ${totalRegisteredKlaim} + terpilih: ${totalSelectedPetak} = ${totalPetak}) sudah mencapai batas maksimum (${formData.jmlPetak})`);
        setAlertOpen(true);
        return;
      } */

      const idPetak = await dispatch(getKlaimID(percilData.id));
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
          const lockedIDs = (listKlaim || []).map(p => p.idpetak);
          const totalRegisteredKlaim = (listKlaim || []).length;
          const totalSelectedPetak = updated.length;
          const totalPetak = totalRegisteredKlaim + totalSelectedPetak;
          const isLimitReached = totalPetak >= formData.jmlPetak;
          
          
          polygonLayerRef.current.setStyle(getPercilStyle(updated, lockedIDs, isLimitReached));
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
  }, [dispatch, listKlaim, selectedPercils, formData.jmlPetak]);

  const { mapRef, mapInstance, polygonLayerRef, basemapLayerRef } = useMap(
    isAuthenticated,
    process.env.REACT_APP_GOOGLE_API_KEY,
    handlePercilSelect,
    `function_zxy_id_petakuser/{z}/{x}/{y}?id=${formData.nik}`,
  );

  useEffect(() => {
    const handleMessage = (e) => {
      // console.log("MapRegister - Received message:", e.data);
      // console.log("MapRegister - Message origin:", e.origin);
      
      if (e.data && e.data.nik) {
        // console.log("MapRegister - Valid message received, updating formData with:", e.data);
        setFormData(e.data);
        setSearchInput(e.data.address);
        // console.log("MapRegister - formData and searchInput updated");
        
        setTimeout(() => {
          if (mapInstance.current) {
            // console.log("MapRegister - Triggering search for address:", e.data.address);
            handleSearch(e.data.address, mapInstance.current, process.env.REACT_APP_GOOGLE_API_KEY);
          }
        }, 1000);
      } else {
        console.log("MapRegister - Invalid message format:", e.data);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [mapInstance, setFormData]);

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

    // Check if klaim data is still loading
    if (klaimLoading) {
      setIsValid(false);
      return;
    }

    const totalRegisteredKlaim = (listKlaim || []).length;
    const totalSelectedPetak = selectedPercils.length;
    const totalPetak = totalRegisteredKlaim + totalSelectedPetak;
    
    if (totalPetak > formData.jmlPetak) {
      setAlertMessage(`Total petak (terdaftar: ${totalRegisteredKlaim} + terpilih: ${totalSelectedPetak} = ${totalPetak}) tidak dapat lebih dari ${formData.jmlPetak}`);
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
  }, [selectedPercils, totalArea, formData.jmlPetak, formData.luasLahan, listKlaim, isDataLoaded, klaimLoading]);

  useEffect(() => {
    if (polygonLayerRef.current) {
      polygonLayerRef.current.setVisible(isPolygonVisible);
      polygonLayerRef.current.setOpacity(polygonOpacity);
    }
  }, [isPolygonVisible, polygonOpacity]);

  // Fetch klaim data when component mounts or formData changes
  useEffect(() => {
    if (formData.nik && formData.noPolis) {
      dispatch(getKlaimUser(formData.nik, formData.noPolis));
    }
  }, [formData.nik, formData.noPolis, dispatch]);

  // Style registered klaim in the main layer
  useEffect(() => {
    if (!polygonLayerRef.current) return;
    
    const currentListKlaim = listKlaim || [];
    const lockedIDs = currentListKlaim.map(p => p.idpetak);
    const totalRegisteredKlaim = currentListKlaim.length;
    const totalSelectedPetak = selectedPercils.length;
    const totalPetak = totalRegisteredKlaim + totalSelectedPetak;
    const isLimitReached = totalPetak >= formData.jmlPetak;
    
    polygonLayerRef.current.setStyle(getPercilStyle(selectedPercils, lockedIDs, isLimitReached));
    polygonLayerRef.current.changed();
    
    // Update cursor style based on limit
    if (mapInstance.current) {
      const mapElement = mapInstance.current.getViewport();
      if (isLimitReached) {
        mapElement.style.cursor = 'not-allowed';
      } else {
        mapElement.style.cursor = 'pointer';
      }
    }
  }, [selectedPercils, listKlaim, formData.jmlPetak, mapInstance]);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handlePlaceChange = (place) => {
    if (place && place.geometry) {
      const location = place.geometry.location;
      mapInstance.current.getView().animate({
        center: fromLonLat([location.lng(), location.lat()]),
        zoom: 15,
        duration: 1000,
      });
    }
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setSearchInput(value);
    
    if (value.length > 2 && autocompleteService) {
      autocompleteService.getPlacePredictions(
        {
          input: value,
          componentRestrictions: { country: 'id' }, // Restrict to Indonesia
        },
        (predictions, status) => {
          if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
            // You can implement a dropdown here if needed
            // For now, we'll just handle the search on Enter key
          }
        }
      );
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && searchInput.trim()) {
      handleSearch(searchInput, mapInstance.current, process.env.REACT_APP_GOOGLE_API_KEY);
    }
  };

  const handleSimpan = async () => {
    const payload = selectedPercils.map(p => ({
      nik: formData.nik,
      nopolis: formData.noPolis,
      idpetak: p.id,
      luas: p.area,
      geometry: p.geometry,
      tglKejadian: formData.tglKejadian,
    }));

    try {
      await dispatch(createKlaim(payload));
      
      // Clear selected petak after successful save
      setSelectedPercils([]);
      
      // Refresh the klaim list to show newly saved klaim in "Lahan Terdaftar"
      await dispatch(getKlaimUser(formData.nik, formData.noPolis));
      
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

  const handleDeleteKlaim = async (klaimId) => {
    try {
      // console.log('MapClaim.handleDeleteKlaim called with klaimId:', klaimId);
      await dispatch(deleteKlaim(klaimId));
      // console.log('MapClaim.handleDeleteKlaim: deleteKlaim completed');
      // Refresh the klaim list after deletion
      await dispatch(getKlaimUser(formData.nik, formData.noPolis));
      // console.log('MapClaim.handleDeleteKlaim: getKlaimUser completed');
    } catch (error) {
      console.error("Error deleting klaim:", error);
      throw error; // Re-throw to be handled by the DataPanel
    }
  };

  // Update polygon layer when formData changes
  useEffect(() => {
    if (!polygonLayerRef.current || !mapInstance.current || !formData.nik) return;

    const newTileUrl = `function_zxy_id_petakuser/{z}/{x}/{y}?id=${formData.nik}`;
    setTileUrl(newTileUrl);

    // Create new source with updated URL
    const newSource = new VectorTileSource({
      format: new MVT(),
      url: `${process.env.REACT_APP_TILE_URL}/${newTileUrl}`,
    });

    // Update the layer's source
    polygonLayerRef.current.setSource(newSource);
    polygonLayerRef.current.changed();
  }, [formData.idkec, formData.nik, formData.idkab, mapInstance, polygonLayerRef]);

  useAuthListener();

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
          maxWidth: '380px',
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
              listPetak={listKlaim}
              source="MapClaim"
              isLoading={klaimLoading}
              onDeletePetak={handleDeleteKlaim}
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
        <input
          type="text"
          value={searchInput}
          onChange={handleInputChange}
          onKeyPress={handleKeyPress}
          placeholder={isGoogleMapsLoaded ? "Cari alamat" : "Cari alamat (Loading...)"}
          style={{
            flex: 1,
            padding: '10px 15px',
            borderRadius: '5px',
            border: '1px solid #ccc',
            outline: 'none',
            width: '250px',
          }}
        />
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