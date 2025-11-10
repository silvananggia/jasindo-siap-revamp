import 'ol/ol.css';
import "ol-ext/dist/ol-ext.css";
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Autocomplete } from '@react-google-maps/api';
import { Box, Tabs, Tab, IconButton, Snackbar, Alert, useTheme, useMediaQuery, Drawer, Fab } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ListIcon from '@mui/icons-material/List';
import LayersIcon from '@mui/icons-material/Layers';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import RefreshIcon from '@mui/icons-material/Refresh';
import Swal from 'sweetalert2';
import { fromLonLat } from 'ol/proj';
import { VectorTile as VectorTileLayer } from 'ol/layer';
import VectorTileSource from 'ol/source/VectorTile';
import MVT from 'ol/format/MVT';
import { Style, Fill, Stroke } from 'ol/style';
import { buffer } from "ol/extent";
import { useMap } from '../../hooks/useMap';
import { useAuthListener } from '../../hooks/useAuthListener';
import { useURLParams } from '../../hooks/useURLParams';
import useSwipeGesture from '../../hooks/useSwipeGesture';
import { createBasemapLayer } from '../../utils/mapUtils';
import { handleSearch } from '../../utils/mapUtils';
import { getPercilStyle } from '../../utils/percilStyles';
import { createPetak, getPetakID, getPetakUser, deletePetak, getPetakById, getCenterPetakUser, checkPercilAvailability } from '../../actions/petakActions';
import BasemapSwitcher from './BasemapSwitcher';
import GeolocationControl from './GeolocationControl';
import Spinner from '../Spinner/Loading-spinner';
import DataPanel from './DataPanel';
import LayerPanel from './LayerPanel';

const MapRegister = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));

  const dispatch = useDispatch();
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);
  const { loading, errmessage } = useSelector((state) => state.auth);
  const { loading: petakLoading } = useSelector((state) => state.petak);
  const listPetak = useSelector((state) => state.petak.petaklist);


  const { formData, setFormData, isDataLoaded } = useURLParams();
  
  // Create a ref to store the current jmlPetak value to avoid closure issues
  const jmlPetakRef = useRef(0);
  
  // Update jmlPetakRef when formData changes
  useEffect(() => {
    // console.log('MapRegister - useEffect triggered with formData.jmlPetak:', formData.jmlPetak, 'type:', typeof formData.jmlPetak);
    if (formData.jmlPetak) {
      const parsed = parseInt(formData.jmlPetak);
      // console.log('MapRegister - Parsed value:', parsed, 'isNaN:', isNaN(parsed), 'parsed > 0:', parsed > 0);
      if (!isNaN(parsed) && parsed > 0) {
        // console.log('MapRegister - Updating jmlPetakRef to:', parsed);
        jmlPetakRef.current = parsed;
      }
    }
  }, [formData.jmlPetak]);

  // Debug: Track when jmlPetakRef changes
  useEffect(() => {
    // console.log('MapRegister - jmlPetakRef.current changed to:', jmlPetakRef.current, 'type:', typeof jmlPetakRef.current);
  }, [formData.jmlPetak]);

  // Initialize all formData values as reactive variables using useMemo
  const formDataValues = useMemo(() => {
    // console.log('formDataValues useMemo - CALLED with formData:', formData);
    // console.log('formDataValues useMemo - formData.jmlPetak:', formData.jmlPetak, 'type:', typeof formData.jmlPetak);
    
    // Properly parse jmlPetak from string to number
    let parsedJmlPetak = 0;
    if (formData.jmlPetak) {
      const parsed = parseInt(formData.jmlPetak);
      parsedJmlPetak = isNaN(parsed) ? 0 : parsed;
    }
    
    let parsedLuasLahan = 0;
    if (formData.luasLahan) {
      const parsed = parseFloat(formData.luasLahan);
      parsedLuasLahan = isNaN(parsed) ? 0 : parsed;
    }
    
    // console.log('formDataValues useMemo - parsedJmlPetak:', parsedJmlPetak, 'type:', typeof parsedJmlPetak);
    // console.log('formDataValues useMemo - formData.jmlPetak raw:', formData.jmlPetak, 'isNaN check:', isNaN(parseInt(formData.jmlPetak)));

    const result = {
      nik: formData.nik || '',
      nama: formData.nama || '',
      address: formData.address || '',
      idkab: formData.idkab || '',
      idkec: formData.idkec || '',
      jmlPetak: parsedJmlPetak,
      luasLahan: parsedLuasLahan,
      noPolis: formData.noPolis || '',
      idKelompok: formData.idKelompok || '',
      idKlaim: formData.idKlaim || ''
    };
    
    // console.log('formDataValues useMemo - final result:', result);
    return result;
  }, [formData]);

  // Destructure for easier access
  const { nik, nama, address, idkab, idkec, jmlPetak, luasLahan, noPolis, idKelompok, idKlaim } = formDataValues;

  // Debug: Track when formData changes
  useEffect(() => {
    // console.log('MapRegister - formData changed:', formData);
    // console.log('MapRegister - formData.jmlPetak:', formData.jmlPetak, 'type:', typeof formData.jmlPetak);
  }, [formData]);

  const [searchInput, setSearchInput] = useState(address);
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
  const [panelOpen, setPanelOpen] = useState(!isMobile); // Panel closed by default on mobile

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

  // Debug: Log jmlPetak value when callback is created
  // console.log('MapRegister - Creating handlePercilSelect callback with jmlPetakRef.current:', jmlPetakRef.current, 'type:', typeof jmlPetakRef.current);

  const handlePercilSelect = useCallback(async (percilData) => {
    try {
      // Log all parcel attributes to console
      console.log('=== PARCEL SELECTED - ALL ATTRIBUTES ===');
      console.log('Percil Data:', percilData);
      console.log('All Properties:', Object.keys(percilData));
      console.log('Property Details:');
      Object.entries(percilData).forEach(([key, value]) => {
        console.log(`  ${key}:`, value, `(type: ${typeof value})`);
      });
      console.log('==========================================');
      
      // Use the ref to get the current jmlPetak value
      const currentJmlPetak = jmlPetakRef.current;
      
      // Debug logging
      // console.log('handlePercilSelect - jmlPetakRef.current:', jmlPetakRef.current, 'type:', typeof jmlPetakRef.current);
      // console.log('handlePercilSelect - currentJmlPetak:', currentJmlPetak, 'type:', typeof currentJmlPetak);
      
      // Check if jmlPetak is valid and properly loaded
      if (!currentJmlPetak || currentJmlPetak <= 0) {
        // console.log('jmlPetakRef.current is invalid or not loaded:', currentJmlPetak);
        setAlertMessage('Data jumlah petak belum tersedia. Silakan tunggu data dimuat.');
        setAlertOpen(true);
        return;
      }

      // Check if user has already reached the maximum number of petak allowed
      const totalRegisteredPetak = (listPetak || []).length;
      const totalSelectedPetak = selectedPercils.length;
      const totalPetak = totalRegisteredPetak + totalSelectedPetak;
     
      if (totalPetak >= currentJmlPetak) {
        setAlertMessage(`Tidak dapat menambah petak lagi. Total petak (terdaftar: ${totalRegisteredPetak} + terpilih: ${totalSelectedPetak} = ${totalPetak}) sudah mencapai batas maksimum (${currentJmlPetak})`);
        setAlertOpen(true);
        return;
      }

      if (percilData.psid) {
        const idPetak = await dispatch(getPetakID(percilData.psid));
        if (Array.isArray(idPetak) && idPetak.length > 0) {
          setAlertMessage(`Tidak Dapat Dipilih, Lahan ini sudah didaftarkan sebelumnya`);
          setAlertOpen(true);
          return;
        }
      }

      // Check if user already has this percil for the same musim_tanam and year
      const currentMusimTanam = formData.musimTanam || 'MT1';
      const currentTanggalTanam = formData.tanggalTanam || new Date().toISOString().split('T')[0];
      
      // Debug: Log the values being used for validation
      const percilId = percilData.petak_id || percilData.psid || percilData.id || percilData.persilid;
/*       console.log('=== VALIDATION DEBUG ===');
      console.log('percilId (petak_id):', percilId);
      console.log('currentMusimTanam:', currentMusimTanam);
      console.log('currentTanggalTanam:', currentTanggalTanam);
      console.log('========================'); */
      
      try {
        const availabilityCheck = await dispatch(checkPercilAvailability(
          percilId, 
          currentMusimTanam, 
          currentTanggalTanam
        ));
        
        console.log('Availability check result:', availabilityCheck);
        
        if (!availabilityCheck.data.isAvailable) {
          const year = new Date(currentTanggalTanam).getFullYear();
          setAlertMessage(`Tidak dapat memilih lahan ini. Lahan sudah terdaftar untuk musim tanam ${currentMusimTanam} tahun ${year}.`);
          setAlertOpen(true);
          return;
        }
      } catch (error) {
        console.error('Error checking percil availability:', error);
        // Continue with selection if check fails (graceful degradation)
      }

      setSelectedPercils((prev) => {
        const exists = prev.find((p) => p.psid === percilData.psid);
        const updated = exists
          ? prev.filter((p) => p.psid !== percilData.psid)
          : [...prev, percilData];

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
  }, [dispatch, listPetak, selectedPercils]);

  const { mapRef, mapInstance, polygonLayerRef, basemapLayerRef } = useMap(
    isAuthenticated,
    process.env.REACT_APP_GOOGLE_API_KEY,
    handlePercilSelect,

    `petak_kecamatan/{z}/{x}/{y}?id=${idkec}`,
  );

  useEffect(() => {
    // Handle search input update when formData changes
    if (formData.address) {
      setSearchInput(formData.address);
      setTimeout(() => {
        if (mapInstance.current) {
          handleSearch(formData.address, mapInstance.current, process.env.REACT_APP_GOOGLE_API_KEY);
        }
      }, 1000);
    }
  }, [formData.address, mapInstance]);

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

    // Check if registered land data is still loading
    if (petakLoading) {
      setIsValid(false);
      return;
    }

    if (jmlPetak) {
      const totalRegisteredPetak = (listPetak || []).length;
      const totalSelectedPetak = selectedPercils.length;
      const totalPetak = totalRegisteredPetak + totalSelectedPetak;

      if (totalPetak > jmlPetak) {
        setAlertMessage(`Total petak (terdaftar: ${totalRegisteredPetak} + terpilih: ${totalSelectedPetak} = ${totalPetak}) tidak dapat lebih dari ${jmlPetak}`);
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
  }, [selectedPercils, totalArea, jmlPetak, luasLahan, listPetak, isDataLoaded, petakLoading]);

  useEffect(() => {
    if (polygonLayerRef.current) {
      polygonLayerRef.current.setVisible(isPolygonVisible);
      polygonLayerRef.current.setOpacity(polygonOpacity);
    }
  }, [isPolygonVisible, polygonOpacity]);

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

  const handleSimpan = async () => {
    const payload = selectedPercils.map(p => ({
      nik: nik,
      idpetak: p.petak_id,
      luas: p.area,
      musim_tanam: formData.musimTanam || 'MT1', // Default value if not provided
      tgl_tanam: formData.tanggalTanam || new Date().toISOString().split('T')[0], // Default to today
      tgl_panen: formData.tanggalPanen || new Date(Date.now() + 90*24*60*60*1000).toISOString().split('T')[0], // Default to 90 days from now
      geometry: p.geometry,
    }));

    try {
      await dispatch(createPetak(payload));

      // Clear selected petak after successful save
      setSelectedPercils([]);

      // Refresh the petak list to show newly saved petak in "Lahan Terdaftar"
      await refreshPetakData();

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

    const handleDeletePetak = async (petakId) => {
    try {
      await dispatch(deletePetak(petakId));
      
      // Refresh the petak list after deletion
      await refreshPetakData();
    } catch (error) {
      console.error("Error deleting petak:", error);
      throw error; // Re-throw to be handled by the DataPanel
    }
  };


  // Separate effect for tile URL updates (only when kecamatan changes)
  useEffect(() => {
    if (!polygonLayerRef.current || !mapInstance.current || !idkec) return;

    const newTileUrl = `petak_kecamatan/{z}/{x}/{y}?id=${idkec}`;
    setTileUrl(newTileUrl);

    // Create new source with updated URL
    const newSource = new VectorTileSource({
      format: new MVT(),
      url: `${process.env.REACT_APP_TILE_URL}/${newTileUrl}`,
    });

    // Update the layer's source and make it visible
    polygonLayerRef.current.setSource(newSource);
    polygonLayerRef.current.setVisible(true);
    polygonLayerRef.current.changed();
  }, [idkec, mapInstance, polygonLayerRef]);



  // Style registered petak in the main layer
  useEffect(() => {
    if (!polygonLayerRef.current) return;

    // Use a more stable approach - get the current listPetak from Redux state
    const currentListPetak = listPetak || [];
    const lockedIDs = currentListPetak.map(p => p.idpetak || p.id);
    const totalRegisteredPetak = currentListPetak.length;
    const totalSelectedPetak = selectedPercils.length;
    const totalPetak = totalRegisteredPetak + totalSelectedPetak;
    const isLimitReached = totalPetak >= jmlPetak;



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
  }, [selectedPercils, listPetak, jmlPetak, mapInstance]);

  useAuthListener();

  // Function to zoom to exact petak data by ID
  const zoomToPetakData = useCallback(async (petakList) => {
    if (!mapInstance.current || !nik) return;

    try {
      if (!petakList || petakList.length === 0) {
        // console.log('No petak data found for user');
        return;
      }

      // If there's only one petak, zoom to it exactly
      if (petakList.length === 1) {
        const petakId = petakList[0].id;
        const petakData = await dispatch(getPetakById(petakId));
        
        if (petakData && petakData.data) {
          const { center, bounds } = petakData.data;
          
          if (center && center.coordinates) {
            const view = mapInstance.current.getView();
            view.animate({
              center: fromLonLat([center.coordinates[0], center.coordinates[1]]),
              zoom: 18,
              duration: 1000
            });
          }
        }
      } else {
        // For multiple petak, use the center API to get the overall extent
        const centerData = await dispatch(getCenterPetakUser(nik));
        
        if (centerData && centerData.data && centerData.data.center) {
          const { center, bounds } = centerData.data;
          
          if (center && center.coordinates) {
            const view = mapInstance.current.getView();
            
            if (bounds) {
              // Use bounds for better fitting of multiple petak
              const extent = [
                bounds.minX, bounds.minY,
                bounds.maxX, bounds.maxY
              ];
              const bufferedExtent = buffer(extent, 50); // Add 50 meter buffer
              view.fit(bufferedExtent, {
                duration: 1000,
                padding: [50, 50, 50, 50]
              });
            } else {
              // Fallback to center point
              view.animate({
                center: fromLonLat([center.coordinates[0], center.coordinates[1]]),
                zoom: 16,
                duration: 1000
              });
            }
          }
        }
      }
    } catch (error) {
      console.error("Error zooming to petak data:", error);
      // Fallback: zoom to a reasonable level
      const view = mapInstance.current.getView();
      view.animate({
        zoom: 16,
        duration: 1000
      });
    }
  }, [mapInstance, nik, dispatch]);

  // Function to refresh petak data from database
  const refreshPetakData = useCallback(async () => {
    if (!nik || typeof nik !== 'string' || nik.trim() === '') return;
    
    try {
      const result = await dispatch(getPetakUser(nik));
      console.log('Petak data refreshed from database:', result?.data?.data?.length || 0, 'records');
      return result;
    } catch (error) {
      console.error('Error refreshing petak data:', error);
      return null;
    }
  }, [nik, dispatch]);

  useEffect(() => {
    // Ensure nik is loaded and map is ready before attempting to fetch and zoom
    if (!mapInstance.current) return;
    if (!nik || typeof nik !== 'string' || nik.trim() === '') return;

    refreshPetakData().then((result) => {
      if (result) {
        // After getting petak data, zoom to the data extent
        setTimeout(() => {
          // Pass the petak list directly to avoid dependency on listPetak state
          // getPetakUser returns res.data => { code, status, data: [...] }
          const petakList = result?.data?.data || [];
          zoomToPetakData(petakList);
        }, 500); // Small delay to ensure data is loaded
      }
    });
  }, [nik, dispatch, zoomToPetakData, mapInstance, refreshPetakData]);

  // Periodic refresh of petak data to ensure real-time validation
  useEffect(() => {
    if (!nik || typeof nik !== 'string' || nik.trim() === '') return;

    // Refresh data every 30 seconds to ensure real-time validation
    const refreshInterval = setInterval(() => {
      console.log('Periodic refresh of petak data...');
      refreshPetakData();
    }, 30000); // 30 seconds

    return () => clearInterval(refreshInterval);
  }, [nik, refreshPetakData]);

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

      <GeolocationControl mapInstance={mapInstance.current} isMobile={isMobile} />

      {/* Disclaimer Box */}
      <div
        style={{
          position: 'absolute',
          bottom: '20px',
          left: '20px',
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          padding: '8px 12px',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          zIndex: 1000,
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(0,0,0,0.1)',
          fontSize: '10px',
          color: '#666',
          fontWeight: '500',
          maxWidth: '300px',
          textAlign: 'center'
        }}
      >
        Peta ini menampilkan bentuk petak sawah secara indikatif. Perbedaan dengan kondisi sebenarnya di lapangan mungkin terjadi.
      </div>

      {/* Hamburger Menu Button - Only visible on mobile */}
      {isMobile && (
        <Fab
          color="primary"
          aria-label="menu"
          onClick={() => setPanelOpen(true)}
          sx={{
            position: 'absolute',
            top: 20,
            right: 20,
            zIndex: 1001,
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            color: '#1976d2',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 1)',
              transform: 'scale(1.1)',
            },
            transition: 'all 0.2s ease',
            animation: panelOpen ? 'none' : 'pulse 2s infinite',
            '@keyframes pulse': {
              '0%': { transform: 'scale(1)' },
              '50%': { transform: 'scale(1.05)' },
              '100%': { transform: 'scale(1)' },
            },
          }}
        >
          <MenuIcon />
        </Fab>
      )}

      {/* Swipe Hint - Only visible on mobile when panel is closed */}
      {isMobile && !panelOpen && (
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            right: '20px',
            transform: 'translateY(-50%)',
            zIndex: 999,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            color: 'white',
            padding: '8px 12px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: 500,
            backdropFilter: 'blur(10px)',
            animation: 'slideInRight 0.5s ease-out',
            '@keyframes slideInRight': {
              '0%': { transform: 'translateX(100%) translateY(-50%)' },
              '100%': { transform: 'translateX(0) translateY(-50%)' },
            },
          }}
        >
          ← Swipe right to open panel
        </Box>
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
                isLoading={petakLoading}
                onDeletePetak={handleDeletePetak}
                onRefreshData={refreshPetakData}
                isMobile={isMobile}
                isTablet={isTablet}
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
                isLoading={petakLoading}
                onDeletePetak={handleDeletePetak}
                onRefreshData={refreshPetakData}
                isMobile={isMobile}
                isTablet={isTablet}
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
          top: isMobile ? '10px' : '10px',
          left: isMobile ? '10px' : '20px',
          right: isMobile ? 'auto' : 'auto',
          padding: isMobile ? '8px' : '10px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'rgba(255, 255, 255, 0.95)',
          borderRadius: '8px',
          width: isMobile ? 'calc(100% - 20px)' : 'auto',
          backdropFilter: 'blur(10px)',
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
              padding: isMobile ? '8px 12px' : '10px 15px',
              borderRadius: '5px',
              border: '1px solid #ccc',
              outline: 'none',
              width: isMobile ? '100%' : '250px',
              fontSize: isMobile ? '14px' : '16px',
            }}
          />
        </Autocomplete>
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
          vertical: isMobile ? 'bottom' : 'top',
          horizontal: isMobile ? 'center' : 'right',
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