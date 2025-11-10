import "ol/ol.css";
import "ol-ext/dist/ol-ext.css";
import "./MapAnalytic.css";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Autocomplete } from "@react-google-maps/api";
import { Box, Tabs, Tab, IconButton, Snackbar, Alert, Accordion, AccordionSummary, AccordionDetails, List, ListItem, ListItemText, ListItemAvatar, Avatar, Typography, Divider, Button, Dialog, DialogTitle, DialogContent, DialogActions, Card, CardContent, Grid } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import ListIcon from "@mui/icons-material/List";
import LayersIcon from "@mui/icons-material/Layers";
import PeopleIcon from "@mui/icons-material/People";
import VisibilityIcon from "@mui/icons-material/Visibility";
import AnalyticsIcon from "@mui/icons-material/Analytics";
import FullscreenIcon from "@mui/icons-material/Fullscreen";
import FullscreenExitIcon from "@mui/icons-material/FullscreenExit";
import Swal from "sweetalert2";
import { fromLonLat } from "ol/proj";
import { VectorTile as VectorTileLayer } from "ol/layer";
import VectorTileSource from "ol/source/VectorTile";
import MVT from "ol/format/MVT";
import { Rnd } from 'react-rnd';
import { useMap } from "../../hooks/useMap";
import { useAuthListener } from "../../hooks/useAuthListener";
import { useURLParams } from "../../hooks/useURLParams";
import { createBasemapLayer } from "../../utils/mapUtils";
import { handleSearch } from "../../utils/mapUtils";
import { getPercilStyle } from "../../utils/percilStyles";
import { createPetak, getPetakID, getPetakUser } from "../../actions/petakActions";
import { getAnggotaKlaim } from "../../actions/anggotaActions";
import { getKlaimUser } from "../../actions/klaimActions";
import BasemapSwitcher from "./BasemapSwitcher";
import GeolocationControl from "./GeolocationControl";
import Spinner from "../Spinner/Loading-spinner";
import KlaimPanel from "./KlaimPanel";
import LayerPanel from "./LayerPanel";
import Chip from "@mui/material/Chip";
import { LineChart } from "@mui/x-charts/LineChart";
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { fitExtent } from "ol/View";
import { buffer } from "ol/extent";

const MapAnggotaKlaim = () => {
  const dispatch = useDispatch();
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);
  const { loading, errmessage } = useSelector((state) => state.auth);
  const { anggotalist, loading: anggotaLoading } = useSelector((state) => state.anggota);
  const { petaklist, loading: petakLoading } = useSelector((state) => state.petak);

  const { formData, setFormData } = useURLParams();

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
  const [alertMessage, setAlertMessage] = useState("");
  const [tileUrl, setTileUrl] = useState();
  const [currentIndex, setCurrentIndex] = useState(0);
  const datesContainerRef = useRef(null);
  
  // New state for petak view functionality
  const [analyticsPanelOpen, setAnalyticsPanelOpen] = useState(true);
  const [selectedAnggota, setSelectedAnggota] = useState(null);
  const [petakLayerVisible, setPetakLayerVisible] = useState(false);
  
  // Panel state - simplified with react-rnd
  const [isPanelMaximized, setIsPanelMaximized] = useState(false);
  const [isChartMaximized, setIsChartMaximized] = useState(false);

  const handlePercilSelect = useCallback(
    async (percilData) => {
      try {
        const idPetak = await dispatch(getPetakID(percilData.id));
        if (Array.isArray(idPetak) && idPetak.length > 0) {
          setAlertMessage(
            `Tidak Dapat Dipilih, Lahan ini sudah didaftarkan sebelumnya`
          );
          setAlertOpen(true);
          return;
        }

        setSelectedPercils((prev) => {
          // Check if this percil is already selected
          const exists = prev.find((p) => p.id === percilData.id);
          
          if (exists) {
            // If already selected, remove it (toggle off)
            const updated = prev.filter((p) => p.id !== percilData.id);
            if (polygonLayerRef.current) {
              polygonLayerRef.current.setStyle(getPercilStyle(updated));
              polygonLayerRef.current.changed();
            }
            return updated;
          } else {
            // If not selected, replace the entire selection with just this one
            const updated = [percilData];
            if (polygonLayerRef.current) {
              polygonLayerRef.current.setStyle(getPercilStyle(updated));
              polygonLayerRef.current.changed();
            }
            return updated;
          }
        });
      } catch (err) {
        console.error("Error processing feature:", err);
        Swal.fire({
          icon: "error",
          title: "Error",
          text: "An error occurred while processing.",
        });
      }
    },
    [dispatch]
  );

  const { mapRef, mapInstance, polygonLayerRef, basemapLayerRef } = useMap(
    isAuthenticated,
    process.env.REACT_APP_GOOGLE_API_KEY,
    handlePercilSelect,
    petakLayerVisible ? `function_zxy_id_petakuserklaim/{z}/{x}/{y}?id=${formData.nik}&nopolis=${formData.noPolis}` : ""
  );

  useEffect(() => {
    const handleMessage = (e) => {
      if (e.data && e.data.nik) {
        setFormData(e.data);
        setSearchInput(e.data.address);
        setTimeout(() => {
          if (mapInstance.current) {
            handleSearch(
              e.data.address,
              mapInstance.current,
              process.env.REACT_APP_GOOGLE_API_KEY
            );
          }
        }, 1000);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [mapInstance, setFormData]);

  useEffect(() => {
    setTotalArea(
      selectedPercils.reduce((sum, p) => sum + parseFloat(p.area || 0), 0)
    );
  }, [selectedPercils]);

  useEffect(() => {
    if (selectedPercils.length > formData.jmlPetak) {
      setAlertMessage(
        `Jumlah petak terpilih saat ini ${selectedPercils.length}, tidak dapat lebih dari ${formData.jmlPetak}`
      );
      setAlertOpen(true);
      setIsValid(false);
      return;
    }

    const luasLahanFloat = parseFloat(formData.luasLahan);
    const areaLimit = luasLahanFloat + luasLahanFloat * 0.25;

    if (totalArea > areaLimit) {
      setAlertMessage(
        `Total area terpilih (${totalArea.toFixed(
          2
        )} ha), batas toleransi yang diizinkan (${areaLimit.toFixed(2)} ha)`
      );
      setAlertOpen(true);
      setIsValid(false);
    } else {
      setIsValid(true);
    }
  }, [selectedPercils, totalArea, formData.jmlPetak, formData.luasLahan]);

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
    const payload = selectedPercils.map((p) => ({
      nik: formData.nik,
      idpetak: p.id,
      luas: p.area,
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

  const dates = [
    "29 Mar'24",
    "03 Apr'24",
    "08 Apr'24",
    "13 Apr'24",
    "18 Apr'24",
    "28 Apr'24",
    "03 May'24",
    "08 May'24",
    "13 May'24",
    "29 Mar'24",
    "03 Apr'24",
    "08 Apr'24",
    "13 Apr'24",
    "18 Apr'24",
    "28 Apr'24",
    "03 May'24",
    "08 May'24",
    "13 May'24",
    "18 May'24",
  ];

  useEffect( () => {
    if (formData && formData.idKelompok && formData.idKlaim) {
      dispatch(getAnggotaKlaim(formData.idKelompok, formData.idKlaim));
    }
  },[formData.idKelompok, formData.idKlaim]);


  // Update polygon layer when formData changes
  useEffect(() => {
    if (!polygonLayerRef.current || !mapInstance.current) return;

    setTileUrl(`function_zxy_id_petakuserklaim/{z}/{x}/{y}?id=${formData.nik}&nopolis=${formData.noPolis}`);

    // Create new source with updated URL
    const newSource = new VectorTileSource({
      format: new MVT(),
      url: `${process.env.REACT_APP_TILE_URL}/${tileUrl}`,
    });

    // Update the layer's source
    polygonLayerRef.current.setSource(newSource);
    polygonLayerRef.current.changed();
  }, [
    formData.idkec,
    formData.nik,
    formData.idkab,
    mapInstance,
    polygonLayerRef,
    tileUrl,
  ]);

  const scrollToDate = (index) => {
    if (datesContainerRef.current) {
      const container = datesContainerRef.current;
      const dateButton = container.children[index];
      if (dateButton) {
        const containerWidth = container.offsetWidth;
        const buttonLeft = dateButton.offsetLeft;
        const buttonWidth = dateButton.offsetWidth;

        // Calculate scroll position to center the button
        const scrollLeft = buttonLeft - containerWidth / 2 + buttonWidth / 2;

        container.scrollTo({
          left: scrollLeft,
          behavior: "smooth",
        });
      }
    }
  };

  const handlePrevDate = () => {
    const newIndex = Math.max(0, currentIndex - 1);
    setCurrentIndex(newIndex);
    scrollToDate(newIndex);
  };

  const handleNextDate = () => {
    const newIndex = Math.min(dates.length - 1, currentIndex + 1);
    setCurrentIndex(newIndex);
    scrollToDate(newIndex);
  };

  const handleDateClick = (index) => {
    setCurrentIndex(index);
    scrollToDate(index);
  };

  const ArrowButton = ({ direction, onClick, disabled }) => (
    <div className="arrow-button" onClick={onClick} disabled={disabled}>
      {direction === "left" ? "<" : ">"}
    </div>
  );

  useAuthListener();

  // Handler functions for petak view and analytics
  const handleViewPetak = async (anggota) => {
    if (selectedAnggota?.Nik === anggota.Nik && petakLayerVisible) {
      // If clicking the same anggota and layer is visible, hide it
      setPetakLayerVisible(false);
      setSelectedAnggota(null);
      if (mapInstance.current && polygonLayerRef.current) {
        polygonLayerRef.current.setVisible(false);
        polygonLayerRef.current.changed();
      }
    } else {
      // Show layer for new anggota or if layer is hidden
      setSelectedAnggota(anggota);
      try {
        await dispatch(getPetakUser(anggota.Nik));
        
        // Check if petak data exists
        if (!petaklist || petaklist.length === 0) {
          // Mark this anggota as having no petak data
          setAnggotaPetakStatus(prev => ({ ...prev, [anggota.Nik]: false }));
          
          Swal.fire({
            icon: "info",
            title: "Data Petak",
            text: "Data petak belum tersedia untuk anggota ini.",
            confirmButtonText: "OK"
          });
          setSelectedAnggota(null);
          return;
        }
        
        // Mark this anggota as having petak data
        setAnggotaPetakStatus(prev => ({ ...prev, [anggota.Nik]: true }));
        
        // Show the petak layer and update the map tile URL to show petak data for the selected NIK
        setPetakLayerVisible(true);
        if (mapInstance.current && polygonLayerRef.current) {
          const newTileUrl = `function_zxy_id_petakuserklaim/{z}/{x}/{y}?id=${anggota.Nik}&nopolis=${formData.noPolis}`;
          const newSource = new VectorTileSource({
            format: new MVT(),
            url: `${process.env.REACT_APP_TILE_URL}/${newTileUrl}`,
          });
          
          // Add event listener for when tiles are loaded
          const handleTileLoad = () => {
            // Try to zoom to the data extent
            try {
              const extent = newSource.getExtent();
              if (extent && extent[0] !== Infinity && extent[1] !== Infinity && 
                  extent[2] !== Infinity && extent[3] !== Infinity) {
                const view = mapInstance.current.getView();
                const bufferedExtent = buffer(extent, 50); // Add 50 meter buffer
                view.fit(bufferedExtent, {
                  duration: 1000,
                  padding: [50, 50, 50, 50]
                });
              } else {
                // Fallback: zoom to a reasonable level
                const view = mapInstance.current.getView();
                view.animate({
                  zoom: 18,
                  duration: 1000
                });
              }
            } catch (error) {
              console.log('Could not zoom to extent, using fallback zoom');
              const view = mapInstance.current.getView();
              view.animate({
                zoom: 18,
                duration: 1000
              });
            }
            // Remove the event listener after first load
            newSource.un('tileloadend', handleTileLoad);
          };
          
          newSource.on('tileloadend', handleTileLoad);
          
          polygonLayerRef.current.setSource(newSource);
          polygonLayerRef.current.setVisible(true);
          polygonLayerRef.current.changed();
        }
      } catch (error) {
        console.error("Error fetching petak data:", error);
        
        // Mark this anggota as having no petak data due to error
        setAnggotaPetakStatus(prev => ({ ...prev, [anggota.Nik]: false }));
        
        Swal.fire({
          icon: "error",
          title: "Error",
          text: "Gagal mengambil data petak.",
        });
        setSelectedAnggota(null);
      }
    }
  };

  const handleViewAnalytics = (anggota) => {
    // Check if petak data is available before opening analytics
    if (anggotaPetakStatus[anggota.Nik] === false) {
      Swal.fire({
        icon: "info",
        title: "Analytics Tidak Tersedia",
        text: "Data petak belum tersedia untuk anggota ini. Analytics membutuhkan data petak untuk ditampilkan.",
        confirmButtonText: "OK"
      });
      return;
    }

    if (selectedAnggota?.Nik === anggota.Nik && analyticsPanelOpen) {
      // If clicking the same anggota and panel is open, close it
      setAnalyticsPanelOpen(false);
      setSelectedAnggota(null);
    } else {
      // Open panel for new anggota or if panel is closed
      setSelectedAnggota(anggota);
      setAnalyticsPanelOpen(true);
    }
  };

  const handleCloseAnalyticsPanel = () => {
    setAnalyticsPanelOpen(false);
    setSelectedAnggota(null);
  };

  // State to track which anggotas have petak data
  const [anggotaPetakStatus, setAnggotaPetakStatus] = useState({});

  // Helper function to check if petak data exists for an anggota
  const hasPetakData = (anggota) => {
    const status = anggotaPetakStatus[anggota.Nik];
    // If status is undefined, we haven't checked yet, so allow the button to be enabled
    // If status is false, we know there's no data, so disable the button
    // If status is true, we know there's data, so enable the button
    return status !== false;
  };

  // Panel handlers - simplified with react-rnd
  const [panelState, setPanelState] = useState({
    x: window.innerWidth - 340, // Position on the right side
    y: 20,
    width: 320,
    height: window.innerHeight * 0.8,
  });

  const handleMaximizePanel = () => {
    if (!isPanelMaximized) {
      // Store current position and size before maximizing
      setPanelState({
        x: window.innerWidth - 340, // Position on the right side
        y: 20,
        width: 320,
        height: window.innerHeight * 0.8,
      });
      // Maximize to fullscreen
      setPanelState({
        x: 0,
        y: 0,
        width: window.innerWidth,
        height: window.innerHeight,
      });
    } else {
      // Restore to previous position and size
      setPanelState({
        x: window.innerWidth - 340, // Position on the right side
        y: 20,
        width: 320,
        height: window.innerHeight * 0.8,
      });
    }
    setIsPanelMaximized(!isPanelMaximized);
  };

  // Handle window resize when maximized
  useEffect(() => {
    const handleResize = () => {
      if (isPanelMaximized) {
        setPanelState({
          x: 0,
          y: 0,
          width: window.innerWidth,
          height: window.innerHeight,
        });
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isPanelMaximized]);

  // Handle window resize to keep panel on right side
  useEffect(() => {
    const handleResize = () => {
      if (!isPanelMaximized && analyticsPanelOpen) {
        setPanelState(prev => ({
          ...prev,
          x: window.innerWidth - 340, // Keep panel on the right side
        }));
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isPanelMaximized, analyticsPanelOpen]);

  // Handle scroll detection to show/hide scrollbar
  useEffect(() => {
    const panel = document.querySelector('.analytics-panel');
    if (panel) {
      const checkScroll = () => {
        const hasScroll = panel.scrollHeight > panel.clientHeight;
        if (hasScroll) {
          panel.classList.add('scrollable');
        } else {
          panel.classList.remove('scrollable');
        }
      };
      
      // Check initially
      checkScroll();
      
      // Check on content changes
      const observer = new MutationObserver(checkScroll);
      observer.observe(panel, { childList: true, subtree: true });
      
      // Check on window resize
      window.addEventListener('resize', checkScroll);
      
      return () => {
        observer.disconnect();
        window.removeEventListener('resize', checkScroll);
      };
    }
  }, []);

  // Pre-check petak data availability for all anggotas
  useEffect(() => {
    if (anggotalist && anggotalist.data && anggotalist.data.length > 0) {
      // Initialize all anggotas as potentially having petak data
      const initialStatus = {};
      anggotalist.data.forEach(anggota => {
        initialStatus[anggota.Nik] = undefined; // undefined means not checked yet
      });
      setAnggotaPetakStatus(initialStatus);
      
      // Set the first anggota as selected by default to show analytics panel
      if (!selectedAnggota) {
        setSelectedAnggota(anggotalist.data[0]);
      }
    }
  }, [anggotalist, selectedAnggota]);

  const handleMaximizeChart = () => {
    setIsChartMaximized(!isChartMaximized);
  };



  // Generate data for the last 2 months
  const generateLastTwoMonthsData = () => {
    const dates = [];
    const today = new Date();
    
    // Generate dates for the last 2 months (approximately 60 days)
    for (let i = 59; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      dates.push(date);
    }
    
    return dates;
  };

  // Generate sample data for the charts (you can replace this with real API data)
  const generateChartData = () => {
    const dates = generateLastTwoMonthsData();
    const floodData = dates.map(() => Math.random() * 10 + 1); // Random flood data
    const droughtData = dates.map(() => Math.random() * 5 + 0.5); // Random drought data
    const rainfallData = dates.map(() => Math.random() * 200 + 50); // Random rainfall data (mm)
    
    return {
      dates: dates.map(date => date.toLocaleDateString('id-ID', { 
        day: '2-digit', 
        month: 'short' 
      })),
      floodData,
      droughtData,
      rainfallData
    };
  };

  const chartData = generateChartData();

  if (loading) {
    return <Spinner className="content-loader" />;
  }

  if (errmessage) {
    return (
      <div>
        <div style={{ padding: "2rem", textAlign: "center" }}>
          <h2>Akses Ditolak</h2>
          <p>Silakan login untuk melihat peta.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: "relative", width: "100vw", height: "100vh" }}>
      {/* Custom CSS for panel controls and clean scroll */}
      <style>
        {`
          .panel-controls {
            cursor: default;
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
            border-radius: 8px;
            padding: 8px;
            margin: -8px -8px 8px -8px;
          }
          .panel-controls * {
            cursor: default;
          }
          .maximized-panel {
            border-radius: 0 !important;
            box-shadow: none !important;
          }
          .maximized-panel .panel-controls {
            border-radius: 0 !important;
            margin: -8px -8px 8px -8px;
          }
          
          /* Clean scrollbar styling - hidden by default */
          .analytics-panel::-webkit-scrollbar {
            width: 0px;
            background: transparent;
          }
          .analytics-panel::-webkit-scrollbar-track {
            background: transparent;
          }
          .analytics-panel::-webkit-scrollbar-thumb {
            background: transparent;
            border-radius: 4px;
            border: 2px solid transparent;
            background-clip: content-box;
          }
          .analytics-panel::-webkit-scrollbar-thumb:hover {
            background: transparent;
            background-clip: content-box;
          }
          
          /* Show scrollbar only when needed */
          .analytics-panel.scrollable::-webkit-scrollbar {
            width: 8px;
          }
          .analytics-panel.scrollable::-webkit-scrollbar-thumb {
            background: rgba(0, 0, 0, 0.2);
          }
          .analytics-panel.scrollable::-webkit-scrollbar-thumb:hover {
            background: rgba(0, 0, 0, 0.3);
          }
          
          /* Firefox scrollbar - hidden by default */
          .analytics-panel {
            scrollbar-width: none;
            scrollbar-color: transparent transparent;
          }
          
          /* Show Firefox scrollbar only when needed */
          .analytics-panel.scrollable {
            scrollbar-width: thin;
            scrollbar-color: rgba(0, 0, 0, 0.2) transparent;
          }
          
          /* Accordion container styling */
          .accordion-container {
            padding: 0 8px;
            margin-top: 8px;
          }
          
          /* Remove default accordion margins */
          .MuiAccordion-root {
            margin: 0 0 8px 0 !important;
            box-shadow: none !important;
          }
          
          .MuiAccordion-root:last-child {
            margin-bottom: 0 !important;
          }
        `}
      </style>
      {/* Map */}
      {isAuthenticated && (
        <div
          ref={mapRef}
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
        />
      )}

      {/* Geolocation Control */}
      <GeolocationControl mapInstance={mapInstance.current} />

      {/* Data Panel */}
      <div
        style={{
          position: "absolute",
          top: "20px",
          left: "40px",
          width: "100%",
          maxWidth: "320px",
          background: "rgba(255, 255, 255, 0.95)",
          borderRadius: "16px",
          padding: "0 10px 10px 10px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
          zIndex: 1000,
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        <Box>
          <Tabs value={tabValue} onChange={handleTabChange}>
            <Tab label="Anggota" icon={<PeopleIcon />} iconPosition="start" />
            <Tab label="Layers" icon={<LayersIcon />} iconPosition="start" />
            
          </Tabs>

          {tabValue === 0 && (
            <div style={{ padding: '10px 0' }}>
              <Typography variant="h6" gutterBottom>
                Daftar Anggota Kelompok
              </Typography>
              
              {anggotaLoading ? (
                <div style={{ textAlign: 'center', padding: '20px' }}>
                  <Typography>Loading anggota...</Typography>
                </div>
              ) : anggotalist && anggotalist.data && anggotalist.data.length > 0 ? (
                <List sx={{ width: '100%', bgcolor: 'background.paper' }}>
                  <Typography variant="subtitle2" style={{ padding: '10px 16px', fontWeight: 'bold' }}>
                    ID Polis: {anggotalist.noPolis}
                  </Typography>
                  {anggotalist.data.map((anggota, index) => (
                    <React.Fragment key={anggota.Nik || index}>
                      <ListItem 
                        alignItems="flex-start"
                        sx={{
                          backgroundColor: selectedAnggota?.Nik === anggota.Nik && (petakLayerVisible || analyticsPanelOpen) ? 'rgba(25, 118, 210, 0.08)' : 'transparent',
                          borderLeft: selectedAnggota?.Nik === anggota.Nik && (petakLayerVisible || analyticsPanelOpen) ? '4px solid #1976d2' : 'none',
                          borderRadius: selectedAnggota?.Nik === anggota.Nik && (petakLayerVisible || analyticsPanelOpen) ? '4px' : '0',
                        }}
                      >
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: 'primary.main' }}>
                            {anggota.Nama ? anggota.Nama.charAt(0).toUpperCase() : 'A'}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <Typography variant="subtitle1" component="div">
                              {anggota.Nama || 'Nama tidak tersedia'}
                            </Typography>
                          }
                          secondary={
                            <React.Fragment>
                              <Typography component="span" variant="body2" color="text.primary">
                                NIK: {anggota.Nik || 'Tidak tersedia'}
                              </Typography>
                              <Typography component="div" variant="body2" color="text.secondary">
                                Luas Lahan: {anggota['Luas lahan'] || '0'} ha
                              </Typography>
                              <Typography component="div" variant="body2" color="text.secondary">
                                Jumlah Petak: {anggota['Jumlah Petak Alami'] || '0'}
                              </Typography>
                              <Typography component="div" variant="body2" color="text.secondary">
                                Jenis Lahan: {anggota['Jenis lahan'] || 'Tidak tersedia'}
                              </Typography>
                              {anggota.Alamat && (
                                <Typography component="div" variant="body2" color="text.secondary">
                                  {anggota.Alamat}, {anggota.Desa}, {anggota.Kecamatan}
                                </Typography>
                              )}
                            </React.Fragment>
                          }
                        />
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                          <Button
                            size="small"
                            variant={selectedAnggota?.Nik === anggota.Nik && petakLayerVisible ? "contained" : "outlined"}
                            startIcon={<VisibilityIcon />}
                            onClick={() => handleViewPetak(anggota)}
                            disabled={!hasPetakData(anggota)}
                            sx={{ 
                              minWidth: 'auto', 
                              fontSize: '0.75rem',
                              opacity: anggotaPetakStatus[anggota.Nik] === false ? 0.5 : 1,
                              backgroundColor: anggotaPetakStatus[anggota.Nik] === false ? '#f5f5f5' : 'inherit'
                            }}
                            title={anggotaPetakStatus[anggota.Nik] === false ? "Data petak belum tersedia" : "View Petak"}
                          >
                            {selectedAnggota?.Nik === anggota.Nik && petakLayerVisible ? 'Hide Petak' : 'View Petak'}
                          </Button>
                          {anggotaPetakStatus[anggota.Nik] === false && (
                            <Typography 
                              variant="caption" 
                              color="text.secondary" 
                              sx={{ 
                                fontSize: '0.7rem', 
                                textAlign: 'center',
                                fontStyle: 'italic'
                              }}
                            >
                              Data petak belum tersedia
                            </Typography>
                          )}
                          <Button
                            size="small"
                            variant={selectedAnggota?.Nik === anggota.Nik && analyticsPanelOpen ? "contained" : "outlined"}
                            startIcon={<AnalyticsIcon />}
                            onClick={() => handleViewAnalytics(anggota)}
                            disabled={anggotaPetakStatus[anggota.Nik] === false}
                            sx={{ 
                              minWidth: 'auto', 
                              fontSize: '0.75rem',
                              opacity: anggotaPetakStatus[anggota.Nik] === false ? 0.5 : 1,
                              backgroundColor: anggotaPetakStatus[anggota.Nik] === false ? '#f5f5f5' : 'inherit'
                            }}
                            title={anggotaPetakStatus[anggota.Nik] === false ? "Data petak belum tersedia" : "View Analytics"}
                          >
                            {selectedAnggota?.Nik === anggota.Nik && analyticsPanelOpen ? 'Analytics On' : 'Analytics'}
                          </Button>
                          {anggotaPetakStatus[anggota.Nik] === false && (
                            <Typography 
                              variant="caption" 
                              color="text.secondary" 
                              sx={{ 
                                fontSize: '0.7rem', 
                                textAlign: 'center',
                                fontStyle: 'italic',
                                marginTop: '4px'
                              }}
                            >
                              Analytics tidak tersedia - data petak diperlukan
                            </Typography>
                          )}
                        </Box>
                      </ListItem>
                      {index < anggotalist.data.length - 1 && <Divider variant="inset" component="li" />}
                    </React.Fragment>
                  ))}
                </List>
              ) : (
                <div style={{ textAlign: 'center', padding: '20px' }}>
                  <Typography color="text.secondary">
                    Tidak ada data anggota untuk kelompok ini
                  </Typography>
                </div>
              )}
            </div>
          )}

          {tabValue === 1 && (
            <LayerPanel
              isPolygonVisible={isPolygonVisible}
              setIsPolygonVisible={setIsPolygonVisible}
              polygonOpacity={polygonOpacity}
              setPolygonOpacity={setPolygonOpacity}
              selectedBasemap={selectedBasemap}
              onBasemapChange={(basemap) => {
                const newBasemapLayer = createBasemapLayer(
                  basemap,
                  process.env.REACT_APP_GOOGLE_API_KEY
                );
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

      {/* Analytics Panel */}
      {analyticsPanelOpen && selectedAnggota && (
        <Rnd
          position={{ x: panelState.x, y: panelState.y }}
          size={{ width: panelState.width, height: panelState.height }}
          minWidth={isPanelMaximized ? window.innerWidth : 280}
          minHeight={isPanelMaximized ? window.innerHeight : window.innerHeight * 0.6}
          maxWidth={isPanelMaximized ? window.innerWidth : 600}
          maxHeight={isPanelMaximized ? window.innerHeight : 800}
          bounds={isPanelMaximized ? "parent" : "window"}
          disableDragging={isPanelMaximized}
          disableResizing={isPanelMaximized}
          onDragStop={(e, d) => {
            if (!isPanelMaximized) {
              setPanelState(prev => ({ ...prev, x: d.x, y: d.y }));
            }
          }}
          onResizeStop={(e, direction, ref, delta, position) => {
            if (!isPanelMaximized) {
              setPanelState({
                x: position.x,
                y: position.y,
                width: ref.offsetWidth,
                height: ref.offsetHeight,
              });
            }
          }}
          style={{
            background: "#ffffff",
            borderRadius: isPanelMaximized ? "0" : "16px",
            padding: "0",
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
            zIndex: 1000,
            overflow: "hidden",
          }}
          className={`analytics-panel ${isPanelMaximized ? 'maximized-panel' : ''}`}
        >
          <Box sx={{ 
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            {/* Fixed Header */}
            <Box 
              className="panel-controls"
              sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                padding: '16px',
                borderBottom: '1px solid #e0e0e0',
                backgroundColor: '#ffffff',
                position: 'sticky',
                top: 0,
                zIndex: 10,
                flexShrink: 0
              }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, paddingLeft: '10px' }}>
                  <Typography variant="h6">
                    Analisis - {selectedAnggota.Nama}
                  </Typography>

                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <IconButton 
                    size="small" 
                    onClick={handleMaximizeChart}
                    sx={{ color: 'text.secondary' }}
                    title={isChartMaximized ? "Restore Chart" : "Maximize Chart"}
                  >
                    {isChartMaximized ? <FullscreenExitIcon /> : <FullscreenIcon />}
                  </IconButton>
                  <IconButton 
                    size="small" 
                    onClick={handleMaximizePanel}
                    sx={{ color: 'text.secondary' }}
                    title={isPanelMaximized ? "Restore Panel" : "Maximize Panel"}
                  >
                    {isPanelMaximized ? <FullscreenExitIcon /> : <FullscreenIcon />}
                  </IconButton>
                  <IconButton 
                    size="small" 
                    onClick={handleCloseAnalyticsPanel}
                    sx={{ color: 'text.secondary' }}
                    title="Close Panel"
                  >
                    ×
                  </IconButton>
                </Box>
              </Box>
            
            {/* Scrollable Content */}
            <Box 
              className="accordion-container" 
              sx={{ 
                flex: 1, 
                overflowY: 'auto',
                padding: '16px',
                paddingTop: '8px'
              }}
            >
              <Accordion 
                defaultExpanded 
                sx={{ 
                  width: '100%',
                  border: '1px solid #e0e0e0',
                  borderRadius: '8px',
                  '&:before': { display: 'none' }
                }}
              >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                aria-controls="summary-content"
                id="summary-header"
                sx={{ 
            
                  backgroundColor: '#f8f9fa',
                  borderTopLeftRadius: '8px',
                  borderTopRightRadius: '8px'
                }}
              >
                <Typography sx={{ fontWeight: 600 }}>Ringkasan Lahan</Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ width: '100%', padding: '16px' }}>
                <Typography variant="body2" color="text.secondary" sx={{ marginBottom: '8px' }}>
                  Luas Total: {selectedAnggota['Luas lahan'] || '0'} ha
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ marginBottom: '8px' }}>
                  Jumlah Petak: {selectedAnggota['Jumlah Petak Alami'] || '0'}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ marginBottom: '8px' }}>
                  Jenis Lahan: {selectedAnggota['Jenis lahan'] || 'Tidak tersedia'}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ marginBottom: '8px' }}>
                  NIK: {selectedAnggota.Nik || 'Tidak tersedia'}
                </Typography>
              </AccordionDetails>
            </Accordion>

            <Accordion sx={{ width: '100%' }}>
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                aria-controls="productivity-content"
                id="productivity-header"
                sx={{ width: '100%' }}
              >
                <Typography>Analisis Banjir</Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ width: '100%', padding: '16px' }}>
                <Box className="chart-container">
                  <IconButton
                    size="small"
                    onClick={handleMaximizeChart}
                    sx={{ 
                      position: 'absolute', 
                      top: 5, 
                      right: 5, 
                      zIndex: 1,
                      backgroundColor: 'rgba(255,255,255,0.8)',
                      '&:hover': { backgroundColor: 'rgba(255,255,255,0.9)' }
                    }}
                    title={isChartMaximized ? "Restore Chart" : "Maximize Chart"}
                  >
                    {isChartMaximized ? "⛶" : "⛶"}
                  </IconButton>
                  <LineChart
                    xAxis={[{ 
                      data: chartData.dates,
                      scaleType: 'band'
                    }]}
                    series={[
                      {
                        data: chartData.floodData,
                        label: "Banjir",
                        color: "#4e79a7",
                      },
                    ]}
                    height={isChartMaximized ? 500 : 300}
                    width={300}
                    sx={{
                      '.MuiChartsAxis-tickLabel': {
                        fontSize: '0.75rem',
                      }
                    }}
                  />
                </Box>
              </AccordionDetails>
            </Accordion>

            <Accordion sx={{ width: '100%' }}>
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                aria-controls="drought-content"
                id="drought-header"
                sx={{ width: '100%' }}
              >
                <Typography>Analisis Kekeringan</Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ width: '100%', padding: '16px' }}>
                <Box className="chart-container">
                  <IconButton
                    size="small"
                    onClick={handleMaximizeChart}
                    sx={{ 
                      position: 'absolute', 
                      top: 5, 
                      right: 5, 
                      zIndex: 1,
                      backgroundColor: 'rgba(255,255,255,0.8)',
                      '&:hover': { backgroundColor: 'rgba(255,255,255,0.9)' }
                    }}
                    title={isChartMaximized ? "Restore Chart" : "Maximize Chart"}
                  >
                    {isChartMaximized ? "⛶" : "⛶"}
                  </IconButton>
                  <LineChart
                    xAxis={[{ 
                      data: chartData.dates,
                        scaleType: 'band'
                    }]}
                    series={[
                      {
                        data: chartData.droughtData,
                        label: "Kekeringan",
                        color: "#e15759",
                      },
                    ]}
                    height={isChartMaximized ? 500 : 300}
                    width={300}
                    sx={{
                      '.MuiChartsAxis-tickLabel': {
                        fontSize: '0.75rem',
                      }
                    }}
                  />
                </Box>
              </AccordionDetails>
            </Accordion>

            <Accordion sx={{ width: '100%' }}>
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                aria-controls="rainfall-content"
                id="rainfall-header"
                sx={{ width: '100%' }}
              >
                <Typography>Analisis Curah Hujan</Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ width: '100%', padding: '16px' }}>
                <Box className="chart-container">
                  <IconButton
                    size="small"
                    onClick={handleMaximizeChart}
                    sx={{ 
                      position: 'absolute', 
                      top: 5, 
                      right: 5, 
                      zIndex: 1,
                      backgroundColor: 'rgba(255,255,255,0.8)',
                      '&:hover': { backgroundColor: 'rgba(255,255,255,0.9)' }
                    }}
                    title={isChartMaximized ? "Restore Chart" : "Maximize Chart"}
                  >
                    {isChartMaximized ? "⛶" : "⛶"}
                  </IconButton>
                  <LineChart
                    xAxis={[{ 
                      data: chartData.dates,
                      scaleType: 'band'
                    }]}
                    series={[
                      {
                        data: chartData.rainfallData,
                        label: "Curah Hujan (mm)",
                        color: "#59a14f",
                      },
                    ]}
                    height={isChartMaximized ? 500 : 300}
                    width={300}
                    sx={{
                      '.MuiChartsAxis-tickLabel': {
                        fontSize: '0.75rem',
                      }
                    }}
                  />
                </Box>
              </AccordionDetails>
            </Accordion>
            </Box>
          </Box>
        </Rnd>
      )}



      {/* Slider */}
     {/*  <div className="navigation-container">
        <div className="navigation-bar">
          <ArrowButton
            direction="left"
            onClick={handlePrevDate}
            disabled={currentIndex === 0}
          />

          <div className="dates-scroll-container" ref={datesContainerRef}>
            {dates.map((date, index) => (
              <div
                key={index}
                className={`date-button ${
                  index === currentIndex ? "active" : ""
                }`}
                onClick={() => handleDateClick(index)}
              >
                <span className={`date-text ${index === currentIndex ? "active" : ""}`}>{date}</span>
                <span className="sattelite-text">
                  <Chip label="S2" color="success" size="small" />
                </span>
              </div>
            ))}
          </div>

          <ArrowButton
            direction="right"
            onClick={handleNextDate}
            disabled={currentIndex === dates.length - 1}
          />
        </div>
      </div> */}

      {/* Snackbar */}
      <Snackbar open={alertOpen} onClose={() => setAlertOpen(false)}>
        <Alert
          onClose={() => setAlertOpen(false)}
          severity="error"
          sx={{ width: "100%" }}
        >
          {alertMessage}
        </Alert>
      </Snackbar>
    </div>
  );
};

export default MapAnggotaKlaim;
