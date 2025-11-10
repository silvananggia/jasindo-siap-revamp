import "ol/ol.css";
import "ol-ext/dist/ol-ext.css";
import "./MapAnalytic.css";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Autocomplete } from "@react-google-maps/api";
import { Box, Tabs, Tab, IconButton, Snackbar, Alert, Typography, Button, Card, CardContent } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import ListIcon from "@mui/icons-material/List";
import LayersIcon from "@mui/icons-material/Layers";
import PeopleIcon from "@mui/icons-material/People";
import VisibilityIcon from "@mui/icons-material/Visibility";
import FullscreenIcon from "@mui/icons-material/Fullscreen";
import FullscreenExitIcon from "@mui/icons-material/FullscreenExit";
import MenuIcon from "@mui/icons-material/Menu";
import Swal from "sweetalert2";
import { fromLonLat } from "ol/proj";
import { VectorTile as VectorTileLayer } from "ol/layer";
import VectorTileSource from "ol/source/VectorTile";
import MVT from "ol/format/MVT";
import { useMap } from "../../hooks/useMap";
import { useAuthListener } from "../../hooks/useAuthListener";
import { useURLParams } from "../../hooks/useURLParams";
import { createBasemapLayer } from "../../utils/mapUtils";
import { handleSearch } from "../../utils/mapUtils";
import { getPercilStyle } from "../../utils/percilStyles";
import { createPetak, getPetakID, getPetakUser, getCenterPetakUser, deletePetak, getPetakById } from "../../actions/petakActions";
import { getAnggota, getAnggotaDisetujui } from "../../actions/anggotaActions";
import { getKlaimUser } from "../../actions/klaimActions";
import BasemapSwitcher from "./BasemapSwitcher";
import GeolocationControl from "./GeolocationControl";
import Spinner from "../Spinner/Loading-spinner";
import KlaimPanel from "./KlaimPanel";
import LayerPanel from "./LayerPanel";
import DataPanel from "./DataPanel";
import { buffer } from "ol/extent";
import { Rnd } from 'react-rnd';

const MapAnalytic = () => {
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
  const [analyticsPanelOpen, setAnalyticsPanelOpen] = useState(false);
  const [selectedAnggota, setSelectedAnggota] = useState(null);
  const [petakLayerVisible, setPetakLayerVisible] = useState(false);
  const [loadingPetakData, setLoadingPetakData] = useState(false);
  const [petakData, setPetakData] = useState([]);
  
  // New state for anggota navigation
  const [currentAnggotaIndex, setCurrentAnggotaIndex] = useState(0);
  
  // New state for data panel visibility
  const [dataPanelVisible, setDataPanelVisible] = useState(true);
  
  // Panel state - improved precision positioning with react-rnd
  const [isPanelMaximized, setIsPanelMaximized] = useState(false);
  const [panelState, setPanelState] = useState({
    x: Math.max(0, window.innerWidth - 350), // More precise right positioning
    y: 15,
    width: 350,
    height: Math.min(window.innerHeight * 0.8, 700), // Better height calculation
  });
  
  // State to track which anggotas have petak data
  const [anggotaPetakStatus, setAnggotaPetakStatus] = useState({});

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
    petakLayerVisible ? `function_zxy_id_petakuser/{z}/{x}/{y}?id=${formData.nik}` : ""
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
   /*  if (selectedPercils.length > formData.jmlPetak) {
      setAlertMessage(
        `Jumlah petak terpilih saat ini ${selectedPercils.length}, tidak dapat lebih dari ${formData.jmlPetak}`
      );
      setAlertOpen(true);
      setIsValid(false);
      return;
    } */

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
    
    if (formData && formData.idKelompok) {
      // console.log('formData:', formData);
      // console.log('formData.idKelompok:', formData.idKelompok);
      dispatch(getAnggota(formData.idKelompok));
    }
  },[formData.idKelompok]);
  // Update polygon layer when formData changes
  useEffect(() => {
    if (!polygonLayerRef.current || !mapInstance.current || !formData.nik) return;

    const tileUrlPath = `function_zxy_id_petakuser/{z}/{x}/{y}?id=${formData.nik}`;
    setTileUrl(tileUrlPath);

    // Create new source with updated URL
    const newSource = new VectorTileSource({
      format: new MVT(),
      url: `${process.env.REACT_APP_TILE_URL}/${tileUrlPath}`,
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

  // Handle window resize with improved precision
  useEffect(() => {
    const handleResize = () => {
      const newWidth = window.innerWidth;
      const newHeight = window.innerHeight;
      
      if (isPanelMaximized) {
        // Maximized state - full screen
        setPanelState({
          x: 0,
          y: 0,
          width: newWidth,
          height: newHeight,
        });
      } else if (analyticsPanelOpen) {
        // Normal state - maintain right positioning with better calculations
        const panelWidth = Math.min(350, newWidth * 0.4); // Responsive width
        const panelHeight = Math.min(newHeight * 0.8, 700);
        const panelX = Math.max(0, newWidth - panelWidth - 15); // 15px margin from right
        const panelY = Math.min(15, newHeight - panelHeight - 15); // Ensure panel fits
        
        setPanelState(prev => ({
          ...prev,
          x: panelX,
          y: panelY,
          width: panelWidth,
          height: panelHeight,
        }));
      }
    };

    // Debounce resize events for better performance
    let timeoutId;
    const debouncedResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(handleResize, 100);
    };

    window.addEventListener('resize', debouncedResize);
    return () => {
      window.removeEventListener('resize', debouncedResize);
      clearTimeout(timeoutId);
    };
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
        initialStatus[anggota.NIK] = undefined; // undefined means not checked yet
      });
      setAnggotaPetakStatus(initialStatus);
      
      // Set the first anggota as selected by default to show analytics panel
      if (!selectedAnggota) {
        const firstAnggota = anggotalist.data[0];
        setSelectedAnggota(firstAnggota);
        setCurrentAnggotaIndex(0);
      }
    }
  }, [anggotalist, selectedAnggota]);

  // Update selectedAnggota when currentAnggotaIndex changes
  useEffect(() => {
    if (anggotalist && anggotalist.data && anggotalist.data.length > 0) {
      const currentAnggota = anggotalist.data[currentAnggotaIndex];
      if (currentAnggota && (!selectedAnggota || selectedAnggota.NIK !== currentAnggota.NIK)) {
        setSelectedAnggota(currentAnggota);
      }
    }
  }, [currentAnggotaIndex, anggotalist, selectedAnggota]);

  // Keyboard navigation support
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (anggotalist && anggotalist.data && anggotalist.data.length > 0) {
        if (event.key === 'ArrowLeft') {
          event.preventDefault();
          handlePrevAnggota();
        } else if (event.key === 'ArrowRight') {
          event.preventDefault();
          handleNextAnggota();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentAnggotaIndex, anggotalist]);

  // Navigation functions for anggota
  const handlePrevAnggota = () => {
    if (anggotalist && anggotalist.data && anggotalist.data.length > 0) {
      const newIndex = Math.max(0, currentAnggotaIndex - 1);
      setCurrentAnggotaIndex(newIndex);
      const newAnggota = anggotalist.data[newIndex];
      setSelectedAnggota(newAnggota);
      
      // Reset panels when changing anggota
      setPetakLayerVisible(false);
      setAnalyticsPanelOpen(false);
    }
  };

  const handleNextAnggota = () => {
    if (anggotalist && anggotalist.data && anggotalist.data.length > 0) {
      const newIndex = Math.min(anggotalist.data.length - 1, currentAnggotaIndex + 1);
      setCurrentAnggotaIndex(newIndex);
      const newAnggota = anggotalist.data[newIndex];
      setSelectedAnggota(newAnggota);
      
      // Reset panels when changing anggota
      setPetakLayerVisible(false);
      setAnalyticsPanelOpen(false);
    }
  };

  // Handler functions for petak view and analytics
  const handleViewPetak = async (anggota) => {
    // Prevent multiple clicks while loading
    if (loadingPetakData) {
      return;
    }

    if (selectedAnggota?.NIK === anggota.NIK && petakLayerVisible) {
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
      setLoadingPetakData(true);
      
      try {
        const result = await dispatch(getPetakUser(anggota.NIK));
        // console.log('getPetakUser result:', result);
        
        // Check if petak data exists using the result directly, not the state
        if (!result || !result.data || result.data.length === 0) {
          // console.log('No petak data found for NIK:', anggota.NIK);
          // Mark this anggota as having no petak data
          setAnggotaPetakStatus(prev => ({ ...prev, [anggota.NIK]: false }));
          
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
        setAnggotaPetakStatus(prev => ({ ...prev, [anggota.NIK]: true }));
        
        // Show the petak layer and update the map tile URL to show petak data for the selected NIK
        setPetakLayerVisible(true);
        if (mapInstance.current && polygonLayerRef.current) {
          const newTileUrl = `function_zxy_id_petakuser/{z}/{x}/{y}?id=${anggota.NIK}`;
          const newSource = new VectorTileSource({
            format: new MVT(),
            url: `${process.env.REACT_APP_TILE_URL}/${newTileUrl}`,
          });
          
          // Set up the layer first
          polygonLayerRef.current.setSource(newSource);
          polygonLayerRef.current.setVisible(true);
          polygonLayerRef.current.changed();
          
          // Use the new center petak API for precise zooming
          const performPreciseZoom = async () => {
            try {
              const centerData = await dispatch(getCenterPetakUser(anggota.NIK));
              
              if (centerData && centerData.data) {
                const { center, bounds } = centerData.data;
                const view = mapInstance.current.getView();
                
                // Convert center coordinates to map projection
                const centerCoords = fromLonLat([center.coordinates[0], center.coordinates[1]]);
                
                // Calculate extent from bounds
                const extent = [
                  fromLonLat([bounds.minX, bounds.minY])[0], // minX
                  fromLonLat([bounds.minX, bounds.minY])[1], // minY
                  fromLonLat([bounds.maxX, bounds.maxY])[0], // maxX
                  fromLonLat([bounds.maxX, bounds.maxY])[1]  // maxY
                ];
                
                
                // Add small buffer for better view
                const bufferedExtent = buffer(extent, 50); // 50 meter buffer
                
                view.fit(bufferedExtent, {
                  duration: 2000,
                  padding: [20, 20, 20, 20],
                  maxZoom: 22
                });
                
                return true;
              }
            } catch (error) {
              console.log('Center petak API failed, using fallback:', error);
            }
            
            // Fallback: Use high zoom level
            const view = mapInstance.current.getView();
            view.animate({
              zoom: 20,
              duration: 2000
            });
            return false;
          };
          
          // Perform precise zoom
          performPreciseZoom();
        }
      } catch (error) {
        console.error("Error fetching petak data:", error);
        
        // Mark this anggota as having no petak data due to error
        setAnggotaPetakStatus(prev => ({ ...prev, [anggota.NIK]: false }));
        
        Swal.fire({
          icon: "error",
          title: "Error",
          text: "Gagal mengambil data petak.",
        });
        setSelectedAnggota(null);
      } finally {
        setLoadingPetakData(false);
      }
    }
  };

  const handleViewAnalytics = async (anggota) => {
    // Check if petak data is available before opening data panel
    if (anggotaPetakStatus[anggota.NIK] === false) {
      Swal.fire({
        icon: "info",
        title: "Data Petak Tidak Tersedia",
        text: "Data petak belum tersedia untuk anggota ini.",
        confirmButtonText: "OK"
      });
      return;
    }

    if (selectedAnggota?.NIK === anggota.NIK && analyticsPanelOpen) {
      // If clicking the same anggota and panel is open, close it
      setAnalyticsPanelOpen(false);
      setSelectedAnggota(null);
      setPetakData([]);
    } else {
      // Initialize panel position for precision
      const panelWidth = Math.min(350, window.innerWidth * 0.4);
      const panelHeight = Math.min(window.innerHeight * 0.8, 700);
      const panelX = Math.max(0, window.innerWidth - panelWidth - 15);
      const panelY = Math.min(15, window.innerHeight - panelHeight - 15);
      
      setPanelState({
        x: panelX,
        y: panelY,
        width: panelWidth,
        height: panelHeight,
      });
      
      // Open panel for new anggota or if panel is closed
      setSelectedAnggota(anggota);
      setLoadingPetakData(true);
      
      try {
        const result = await dispatch(getPetakUser(anggota.NIK));
        
        if (result && result.data && result.data.length > 0) {
          setPetakData(result.data);
          setAnalyticsPanelOpen(true);
        } else {
          Swal.fire({
            icon: "info",
            title: "Data Petak",
            text: "Data petak belum tersedia untuk anggota ini.",
            confirmButtonText: "OK"
          });
        }
      } catch (error) {
        console.error("Error fetching petak data:", error);
        Swal.fire({
          icon: "error",
          title: "Error",
          text: "Gagal mengambil data petak.",
        });
      } finally {
        setLoadingPetakData(false);
      }
    }
  };

  const handleCloseAnalyticsPanel = () => {
    setAnalyticsPanelOpen(false);
    setSelectedAnggota(null);
    setPetakData([]);
  };

  // Functions needed for DataPanel functionality
  const handleDeletePetak = async (petakId) => {
    try {
      await dispatch(deletePetak(petakId));
      
      // Refresh the petak data after deletion
      if (selectedAnggota) {
        const result = await dispatch(getPetakUser(selectedAnggota.NIK));
        if (result && result.data && result.data.length > 0) {
          setPetakData(result.data);
        } else {
          setPetakData([]);
        }
      }
    } catch (error) {
      console.error("Error deleting petak:", error);
      throw error; // Re-throw to be handled by the DataPanel
    }
  };

  const refreshPetakData = useCallback(async () => {
    if (!selectedAnggota?.NIK) return;
    
    try {
      const result = await dispatch(getPetakUser(selectedAnggota.NIK));
      if (result && result.data && result.data.length > 0) {
        setPetakData(result.data);
      } else {
        setPetakData([]);
      }
      return result;
    } catch (error) {
      console.error('Error refreshing petak data:', error);
      return null;
    }
  }, [selectedAnggota?.NIK, dispatch]);

  // Helper function to check if petak data exists for an anggota
  const hasPetakData = (anggota) => {
    const status = anggotaPetakStatus[anggota.NIK];
    // If status is undefined, we haven't checked yet, so allow the button to be enabled
    // If status is false, we know there's no data, so disable the button
    // If status is true, we know there's data, so enable the button
    return status !== false;
  };

  // Panel handlers - improved precision with react-rnd
  const handleMaximizePanel = () => {
    if (!isPanelMaximized) {
      // Store current position and size before maximizing
      const currentState = {
        x: Math.max(0, window.innerWidth - 350),
        y: 15,
        width: 350,
        height: Math.min(window.innerHeight * 0.8, 700),
      };
      
      // Maximize to fullscreen with precise calculations
      setPanelState({
        x: 0,
        y: 0,
        width: window.innerWidth,
        height: window.innerHeight,
      });
    } else {
      // Restore to calculated position and size
      const panelWidth = Math.min(350, window.innerWidth * 0.4);
      const panelHeight = Math.min(window.innerHeight * 0.8, 700);
      const panelX = Math.max(0, window.innerWidth - panelWidth - 15);
      const panelY = Math.min(15, window.innerHeight - panelHeight - 15);
      
      setPanelState({
        x: panelX,
        y: panelY,
        width: panelWidth,
        height: panelHeight,
      });
    }
    setIsPanelMaximized(!isPanelMaximized);
  };


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

      {/* Data Panel Toggle Button */}
      <Box sx={{
        position: 'absolute',
        top: '15px',
        left: '30px',
        zIndex: 1000
      }}>
        <Button
          variant="contained"
          size="small"
          onClick={() => setDataPanelVisible(!dataPanelVisible)}
          sx={{
            minWidth: 'auto',
            padding: '6px',
            fontSize: '0.7rem',
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            color: 'text.primary',
            border: '1px solid rgba(0,0,0,0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 1)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
            },
            transition: 'all 0.2s ease'
          }}
          startIcon={<MenuIcon sx={{ fontSize: '16px',textAlign: 'center' }} />}
        >
         
        </Button>
      </Box>

      {/* Data Panel */}
      {dataPanelVisible && (
        <div
          style={{
            position: "absolute",
            top: "15px",
            left: "30px",
            width: "100%",
            maxWidth: "300px",
            background: "rgba(255, 255, 255, 0.95)",
            borderRadius: "12px",
            padding: "0",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            zIndex: 1000,
            maxHeight: "85vh",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Fixed Tab Header */}
          <Box sx={{ 
            position: "sticky", 
            top: 0, 
            zIndex: 10,
            backgroundColor: "rgba(255, 255, 255, 0.95)",
            borderRadius: "12px 12px 0 0",
            borderBottom: "1px solid rgba(0,0,0,0.1)",
            backdropFilter: "blur(10px)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}>
            <Tabs value={tabValue} onChange={handleTabChange} sx={{ minHeight: '40px' }}>
              <Tab label="Anggota" icon={<PeopleIcon />} iconPosition="start" sx={{ fontSize: '0.8rem', minHeight: '40px' }} />
              <Tab label="Layers" icon={<LayersIcon />} iconPosition="start" sx={{ fontSize: '0.8rem', minHeight: '40px' }} />
            </Tabs>
            
            {/* Hide Button on Panel */}
            <IconButton
              size="small"
              onClick={() => setDataPanelVisible(false)}
              sx={{
                color: 'text.secondary',
                padding: '4px',
                marginRight: '8px',
                '&:hover': {
                  backgroundColor: 'rgba(0,0,0,0.04)',
                  color: 'text.primary'
                },
                transition: 'all 0.2s ease'
              }}
              title="Hide Panel"
            >
              <span style={{ fontSize: '14px' }}>×</span>
            </IconButton>
          </Box>

          {/* Scrollable Content Area */}
          <Box sx={{ 
            flex: 1, 
            overflowY: "auto", 
            padding: "8px",
            paddingTop: "8px"
          }}>
            {tabValue === 0 && (
              <div style={{ padding: '8px 0' }}>
                <Typography variant="subtitle1" gutterBottom sx={{ fontSize: '0.9rem', mb: 1 }}>
                  Daftar Anggota Kelompok
                </Typography>
                
                {anggotaLoading ? (
                  <div style={{ textAlign: 'center', padding: '15px' }}>
                    <Typography sx={{ fontSize: '0.8rem' }}>Loading anggota...</Typography>
                  </div>
                ) : anggotalist && anggotalist.data && anggotalist.data.length > 0 ? (
                  <div>
                    {/* Navigation Controls */}
                    <Box sx={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      mb: 1.5,
                      p: 1.5,
                      backgroundColor: 'rgba(25, 118, 210, 0.08)',
                      borderRadius: '8px',
                      border: '1px solid rgba(25, 118, 210, 0.2)'
                    }}>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={handlePrevAnggota}
                        disabled={currentAnggotaIndex === 0}
                        startIcon={<span style={{ fontSize: '14px' }}>‹</span>}
                        sx={{
                          minWidth: '60px',
                          fontSize: '0.7rem',
                          padding: '4px 8px',
                          '&:hover': {
                            backgroundColor: 'rgba(25, 118, 210, 0.1)',
                            transform: 'translateX(-1px)',
                            transition: 'all 0.2s ease'
                          },
                          transition: 'all 0.2s ease'
                        }}
                      >
                        Prev
                      </Button>
                      
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold', fontSize: '0.7rem' }}>
                          {currentAnggotaIndex + 1} dari {anggotalist.data.length}
                        </Typography>
                      </Box>
                      
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={handleNextAnggota}
                        disabled={currentAnggotaIndex === anggotalist.data.length - 1}
                        endIcon={<span style={{ fontSize: '14px' }}>›</span>}
                        sx={{
                          minWidth: '60px',
                          fontSize: '0.7rem',
                          padding: '4px 8px',
                          '&:hover': {
                            backgroundColor: 'rgba(25, 118, 210, 0.1)',
                            transform: 'translateX(1px)',
                            transition: 'all 0.2s ease'
                          },
                          transition: 'all 0.2s ease'
                        }}
                      >
                        Next
                      </Button>
                    </Box>

                    {/* Current Anggota Display */}
                    <Typography variant="caption" style={{ padding: '8px 12px', fontWeight: 'bold', mb: 1.5, fontSize: '0.75rem' }}>
                      ID Polis: {anggotalist.noPolis}
                    </Typography>
                    
                    {(() => {
                      const currentAnggota = anggotalist.data[currentAnggotaIndex];
                      return (
                        <Card 
                          key={`anggota-${currentAnggotaIndex}`}
                          sx={{ 
                            mb: 1.5, 
                            border: '1px solid #e0e0e0',
                            transition: 'all 0.3s ease',
                            '&:hover': {
                              boxShadow: '0 2px 12px rgba(0,0,0,0.1)',
                              transform: 'translateY(-1px)'
                            }
                          }}
                        >
                          <CardContent sx={{ padding: '12px' }}>
                            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                              
                              <Box sx={{ flex: 1 }}>
                                <Typography variant="subtitle2" component="div" gutterBottom sx={{ fontSize: '0.85rem', mb: 1 }}>
                                  {currentAnggota.Nama || 'Nama tidak tersedia'}
                                </Typography>
                                
                                <Typography component="div" variant="caption" color="text.primary" sx={{ mb: 0.5, fontSize: '0.7rem' }}>
                                  <strong>NIK:</strong> {currentAnggota.NIK || 'Tidak tersedia'}
                                </Typography>
                                
                                <Typography component="div" variant="caption" color="text.secondary" sx={{ mb: 0.5, fontSize: '0.7rem' }}>
                                  <strong>Luas Lahan:</strong> {currentAnggota.LuasLahan || '0'} ha
                                </Typography>
                                
                                <Typography component="div" variant="caption" color="text.secondary" sx={{ mb: 0.5, fontSize: '0.7rem' }}>
                                  <strong>Jumlah Petak:</strong> {currentAnggota.JumlahPetakAlami || '0'}
                                </Typography>
                                
                                <Typography component="div" variant="caption" color="text.secondary" sx={{ mb: 0.5, fontSize: '0.7rem' }}>
                                  <strong>Jenis Lahan:</strong> {currentAnggota.JenisLahan || 'Tidak tersedia'}
                                </Typography>
                                
                                {currentAnggota.AlamatLahan && (
                                  <Typography component="div" variant="caption" color="text.secondary" sx={{ mb: 1.5, fontSize: '0.7rem' }}>
                                    <strong>Alamat:</strong> {currentAnggota.AlamatLahan}, {currentAnggota.Desa}, {currentAnggota.Kecamatan}
                                  </Typography>
                                )}
                                
                                {/* Action Buttons */}
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mt: 1.5 }}>
                                  <Button
                                    size="small"
                                    variant={selectedAnggota?.NIK === currentAnggota.NIK && petakLayerVisible ? "contained" : "outlined"}
                                    startIcon={<VisibilityIcon sx={{ fontSize: '16px' }} />}
                                    onClick={() => handleViewPetak(currentAnggota)}
                                    disabled={!hasPetakData(currentAnggota) || loadingPetakData}
                                    sx={{ 
                                      minWidth: 'auto', 
                                      fontSize: '0.65rem',
                                      padding: '4px 8px',
                                      opacity: anggotaPetakStatus[currentAnggota.NIK] === false ? 0.5 : 1,
                                      backgroundColor: selectedAnggota?.NIK === currentAnggota.NIK && petakLayerVisible 
                                        ? '#1976d2' 
                                        : anggotaPetakStatus[currentAnggota.NIK] === false 
                                          ? '#f5f5f5' 
                                          : 'inherit',
                                      color: selectedAnggota?.NIK === currentAnggota.NIK && petakLayerVisible 
                                        ? 'white' 
                                        : 'inherit',
                                      borderColor: selectedAnggota?.NIK === currentAnggota.NIK && petakLayerVisible 
                                        ? '#1976d2' 
                                        : '#1976d2',
                                      '&:hover': {
                                        backgroundColor: selectedAnggota?.NIK === currentAnggota.NIK && petakLayerVisible 
                                          ? '#1565c0' 
                                          : 'rgba(25, 118, 210, 0.1)',
                                        borderColor: '#1976d2'
                                      }
                                    }}
                                    title={anggotaPetakStatus[currentAnggota.NIK] === false ? "Data panel belum tersedia" : loadingPetakData ? "Loading..." : "View Petak"}
                                  >
                                    {loadingPetakData && selectedAnggota?.NIK === currentAnggota.NIK 
                                      ? 'Loading...' 
                                      : selectedAnggota?.NIK === currentAnggota.NIK && petakLayerVisible 
                                        ? 'Hide Petak' 
                                        : 'View Petak'}
                                  </Button>
                                  
                                  {anggotaPetakStatus[currentAnggota.NIK] === false && (
                                    <Typography 
                                      variant="caption" 
                                      color="text.secondary" 
                                      sx={{ 
                                        fontSize: '0.6rem', 
                                        textAlign: 'center',
                                        fontStyle: 'italic'
                                      }}
                                    >
                                      Data petak belum tersedia
                                    </Typography>
                                  )}
                                  
                                  <Button
                                    size="small"
                                    variant={selectedAnggota?.NIK === currentAnggota.NIK && analyticsPanelOpen ? "contained" : "outlined"}
                                    startIcon={<ListIcon sx={{ fontSize: '16px' }} />}
                                    onClick={() => handleViewAnalytics(currentAnggota)}
                                    disabled={anggotaPetakStatus[currentAnggota.NIK] === false || loadingPetakData}
                                    sx={{ 
                                      minWidth: 'auto', 
                                      fontSize: '0.65rem',
                                      padding: '4px 8px',
                                      opacity: anggotaPetakStatus[currentAnggota.NIK] === false ? 0.5 : 1,
                                      backgroundColor: selectedAnggota?.NIK === currentAnggota.NIK && analyticsPanelOpen 
                                        ? '#4caf50' 
                                        : anggotaPetakStatus[currentAnggota.NIK] === false 
                                          ? '#f5f5f5' 
                                          : 'inherit',
                                      color: selectedAnggota?.NIK === currentAnggota.NIK && analyticsPanelOpen 
                                        ? 'white' 
                                        : 'inherit',
                                      borderColor: selectedAnggota?.NIK === currentAnggota.NIK && analyticsPanelOpen 
                                        ? '#4caf50' 
                                        : '#4caf50',
                                      '&:hover': {
                                        backgroundColor: selectedAnggota?.NIK === currentAnggota.NIK && analyticsPanelOpen 
                                          ? '#388e3c' 
                                          : 'rgba(76, 175, 80, 0.1)',
                                        borderColor: '#4caf50'
                                      }
                                    }}
                                    title={anggotaPetakStatus[currentAnggota.NIK] === false ? "Data petak belum tersedia" : loadingPetakData ? "Loading..." : "View Petak Data"}
                                  >
                                    {loadingPetakData && selectedAnggota?.NIK === currentAnggota.NIK 
                                      ? 'Loading...' 
                                      : selectedAnggota?.NIK === currentAnggota.NIK && analyticsPanelOpen 
                                        ? 'Data Panel On' 
                                        : 'Data Petak'}
                                  </Button>
                                  
                                  {anggotaPetakStatus[currentAnggota.NIK] === false && (
                                    <Typography 
                                      variant="caption" 
                                      color="text.secondary" 
                                      sx={{ 
                                        fontSize: '0.6rem', 
                                        textAlign: 'center',
                                        fontStyle: 'italic',
                                        marginTop: '2px'
                                      }}
                                    >
                                      Data petak tidak tersedia
                                    </Typography>
                                  )}
                                </Box>
                              </Box>
                            </Box>
                          </CardContent>
                        </Card>
                      );
                    })()}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '15px' }}>
                    <Typography color="text.secondary" sx={{ fontSize: '0.8rem' }}>
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
      )}

      {/* Analytics Panel */}
      {analyticsPanelOpen && selectedAnggota && (
        <Rnd
          position={{ x: panelState.x, y: panelState.y }}
          size={{ width: panelState.width, height: panelState.height }}
          minWidth={isPanelMaximized ? window.innerWidth : 300}
          minHeight={isPanelMaximized ? window.innerHeight : 400}
          maxWidth={isPanelMaximized ? window.innerWidth : Math.min(window.innerWidth * 0.5, 600)}
          maxHeight={isPanelMaximized ? window.innerHeight : Math.min(window.innerHeight * 0.9, 800)}
          bounds={isPanelMaximized ? "parent" : "window"}
          disableDragging={isPanelMaximized}
          disableResizing={isPanelMaximized}
          dragGrid={[10, 10]} // Snap to 10px grid for precision
          resizeGrid={[10, 10]} // Snap resize to 10px grid
          onDragStop={(e, d) => {
            if (!isPanelMaximized) {
              // Ensure panel stays within bounds with margin
              const maxX = window.innerWidth - panelState.width - 15;
              const maxY = window.innerHeight - panelState.height - 15;
              const constrainedX = Math.max(15, Math.min(d.x, maxX));
              const constrainedY = Math.max(15, Math.min(d.y, maxY));
              
              setPanelState(prev => ({ 
                ...prev, 
                x: constrainedX, 
                y: constrainedY 
              }));
            }
          }}
          onResizeStop={(e, direction, ref, delta, position) => {
            if (!isPanelMaximized) {
              // Ensure panel stays within bounds
              const maxWidth = window.innerWidth - position.x - 15;
              const maxHeight = window.innerHeight - position.y - 15;
              const constrainedWidth = Math.min(ref.offsetWidth, maxWidth);
              const constrainedHeight = Math.min(ref.offsetHeight, maxHeight);
              
              setPanelState({
                x: position.x,
                y: position.y,
                width: constrainedWidth,
                height: constrainedHeight,
              });
            }
          }}
          style={{
            background: "#ffffff",
            borderRadius: isPanelMaximized ? "0" : "12px",
            padding: "0",
            boxShadow: isPanelMaximized ? "none" : "0 4px 20px rgba(0,0,0,0.15)",
            zIndex: 1000,
            overflow: "hidden",
            border: isPanelMaximized ? "none" : "1px solid rgba(0,0,0,0.1)",
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
                padding: '12px',
                borderBottom: '1px solid #e0e0e0',
                backgroundColor: '#ffffff',
                position: 'sticky',
                top: 0,
                zIndex: 10,
                flexShrink: 0
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, paddingLeft: '8px' }}>
                <Typography variant="subtitle1" sx={{ fontSize: '0.9rem' }}>
                  Data Petak - {selectedAnggota.Nama}
                </Typography>

              </Box>
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                <IconButton 
                  size="small" 
                  onClick={handleMaximizePanel}
                  sx={{ color: 'text.secondary', padding: '4px' }}
                  title={isPanelMaximized ? "Restore Panel" : "Maximize Panel"}
                >
                  {isPanelMaximized ? <FullscreenExitIcon sx={{ fontSize: '18px' }} /> : <FullscreenIcon sx={{ fontSize: '18px' }} />}
                </IconButton>
                <IconButton 
                  size="small" 
                  onClick={handleCloseAnalyticsPanel}
                  sx={{ color: 'text.secondary', padding: '4px' }}
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
                padding: '0',
                paddingTop: '0'
              }}
            >
              {loadingPetakData ? (
                <Box sx={{ textAlign: 'center', padding: '20px' }}>
                  <Typography sx={{ fontSize: '0.8rem' }}>Loading data petak...</Typography>
                </Box>
              ) : (
                <DataPanel
                  formData={{
                    nik: selectedAnggota.NIK,
                    nama: selectedAnggota.Nama,
                    luasLahan: selectedAnggota.LuasLahan,
                    jmlPetak: selectedAnggota.JumlahPetakAlami
                  }}
                  selectedPercils={[]}
                  setSelectedPercils={() => {}}
                  totalArea={0}
                  isValid={true}
                  onSave={handleSimpan}
                  polygonLayerRef={polygonLayerRef}
                  listPetak={petakData}
                  source="MapAnggota"
                  isLoading={loadingPetakData}
                  onDeletePetak={handleDeletePetak}
                  onRefreshData={refreshPetakData}
                  isMobile={false}
                  isTablet={false}
                  mapInstance={mapInstance}
                />
              )}
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

export default MapAnalytic;
