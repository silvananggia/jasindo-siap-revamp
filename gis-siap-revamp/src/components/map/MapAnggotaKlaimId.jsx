import "ol/ol.css";
import "ol-ext/dist/ol-ext.css";
import "./MapAnalytic.css";
import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Autocomplete } from "@react-google-maps/api";
import { Box, Tabs, Tab, IconButton, Snackbar, Alert, Accordion, AccordionSummary, AccordionDetails, List, ListItem, ListItemText, ListItemAvatar, Avatar, Typography, Divider, Button, Dialog, DialogTitle, DialogContent, DialogActions, Card, CardContent, Grid, Checkbox, FormControlLabel } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import ListIcon from "@mui/icons-material/List";
import LayersIcon from "@mui/icons-material/Layers";
import PeopleIcon from "@mui/icons-material/People";
import VisibilityIcon from "@mui/icons-material/Visibility";
import AnalyticsIcon from "@mui/icons-material/Analytics";
import FullscreenIcon from "@mui/icons-material/Fullscreen";
import FullscreenExitIcon from "@mui/icons-material/FullscreenExit";
import MenuIcon from "@mui/icons-material/Menu";
import ZoomInIcon from "@mui/icons-material/ZoomIn";
import Swal from "sweetalert2";
import { fromLonLat } from "ol/proj";
import { VectorTile as VectorTileLayer } from "ol/layer";
import VectorTileSource from "ol/source/VectorTile";
import MVT from "ol/format/MVT";
import { Rnd } from 'react-rnd';
import { useMap } from "../../hooks/useMap";
import { useAuthListener } from "../../hooks/useAuthListener";
import { useLocation } from 'react-router-dom';
import { createBasemapLayer } from "../../utils/mapUtils";
import { handleSearch } from "../../utils/mapUtils";
import { getPercilStyle } from "../../utils/percilStyles";
import { createPetak, getPetakID, getPetakUser, getCenterPetakUser, getPetakByIdPetak } from "../../actions/petakActions";
import { getAnggotaKlaimId } from "../../actions/anggotaActions";
import { getKlaimUser } from "../../actions/klaimActions";
import { setToken as setTokenAction } from "../../actions/authActions";
import { getTanamPetak, getNDPIAnalisis, getWaterAnalisis, getBareAnalisis } from "../../actions/analisisActions";
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
  const location = useLocation();
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);
  const { loading, errmessage, token: storedToken } = useSelector((state) => state.auth);
  const { anggotalist, loading: anggotaLoading } = useSelector((state) => state.anggota);
  const { petaklist, loading: petakLoading } = useSelector((state) => state.petak);

  const [token, setToken] = useState(storedToken || null);

  // Helper function to get current anggota from response
  const getCurrentAnggota = () => {
    const dataArray = anggotalist?.data?.data || [];
    if (dataArray && dataArray.length > 0) {
      return dataArray[currentAnggotaIndex] || null;
    }
    return null;
  };

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
  const [alertMessage, setAlertMessage] = useState("");
  const [tileUrl, setTileUrl] = useState();
  const [currentIndex, setCurrentIndex] = useState(0);
  const datesContainerRef = useRef(null);

  // New state for petak view functionality (removed analyticsPanelOpen - now using chartPanelVisible)
  const [selectedAnggota, setSelectedAnggota] = useState(null);
  const [petakLayerVisible, setPetakLayerVisible] = useState(false);
  const [loadingPetakData, setLoadingPetakData] = useState(false);

  // New state for anggota navigation
  const [currentAnggotaIndex, setCurrentAnggotaIndex] = useState(0);

  // New state for data panel visibility
  const [dataPanelVisible, setDataPanelVisible] = useState(true);

  // Panel state - simplified with react-rnd
  const [isPanelMaximized, setIsPanelMaximized] = useState(false);
  const [isChartMaximized, setIsChartMaximized] = useState(false);
  const [selectedPetakId, setSelectedPetakId] = useState(null);
  const [tanamCountLast2Years, setTanamCountLast2Years] = useState(null);

  // Chart series visibility
  const [showWater, setShowWater] = useState(true);
  const [showBare, setShowBare] = useState(true);
  const [showNdpi, setShowNdpi] = useState(true);
  
  // Chart panel visibility
  const [chartPanelVisible, setChartPanelVisible] = useState(false);
  
  // Petak list state
  const [petakList, setPetakList] = useState([]);
  const [loadingPetakList, setLoadingPetakList] = useState(false);

  // Helper: safely normalize API series data to an array
  const toArray = (value) => {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    // Try parse JSON string
    if (typeof value === "string") {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [parsed];
      } catch (e) {
        return [value];
      }
    }
    // For objects or primitives, wrap in array
    return [value];
  };

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

        // Load analytic chart data for the clicked petak
        try {
          const petakId = percilData.petakid;
          setSelectedPetakId(petakId);

          const [tanamRes, ndpiRes, waterRes, bareRes] = await Promise.all([
            dispatch(getTanamPetak(petakId)),
            dispatch(getNDPIAnalisis(petakId)),
            dispatch(getWaterAnalisis(petakId)),
            dispatch(getBareAnalisis(petakId)),
          ]);

          const tanamCount = tanamRes?.data?.tanam_last2th ?? null;
          const ndpiData = toArray(ndpiRes?.data?.ndpi_val_last2th);
          const waterData = toArray(waterRes?.data?.water_val_last2th);
          const bareData = toArray(bareRes?.data?.bare_val_last2th);
          const satEpoch = toArray(ndpiRes?.data?.sat_epoch ?? null);

          const maxLen = Math.max(
            ndpiData.length || 0,
            waterData.length || 0,
            bareData.length || 0
          );


          setChartData({
            dates: satEpoch,
            // Air chart uses Water index
            floodData: waterData,
            // Bera chart uses Bare index
            droughtData: bareData,
            // Vegetasi chart uses NDPI index
            rainfallData: ndpiData,
          });

          // Save tanam count (2 years) for ringkasan lahan
          setTanamCountLast2Years(tanamCount);

          // Open bottom chart panel when petak is clicked so charts are visible
          setChartPanelVisible(true);
          
          // Set selected anggota if not already set
          const currentAnggota = getCurrentAnggota();
          if (currentAnggota && (!selectedAnggota || selectedAnggota.nik !== currentAnggota.nik)) {
            setSelectedAnggota(currentAnggota);
          }
        } catch (apiError) {
          console.error("Error loading petak analytics:", apiError);
          Swal.fire({
            icon: "error",
            title: "Error",
            text: "Gagal memuat data analisis petak.",
          });
        }
      } catch (err) {
        Swal.fire({
          icon: "error",
          title: "Error",
          text: "An error occurred while processing.",
        });
      }
    },
    [dispatch]
  );

  // Helper function to get noPolis value with fallback
  const getClaimid = () => {
    // First try URL params
    const urlParams = new URLSearchParams(location.search);
    const claimidFromUrl = urlParams.get('claimid') || '';

    // Then try current anggota
    const currentAnggota = getCurrentAnggota();
    const noPolisFromAnggota = currentAnggota?.noPolis || currentAnggota?.nopolis || '';

    // Then try from anggotalist
    const noPolisFromList = anggotalist?.noPolis || anggotalist?.nopolis || '';

    return claimidFromUrl || noPolisFromAnggota || noPolisFromList || '';
  };

  const getNoPolis = () => {
    // First try URL params
    const urlParams = new URLSearchParams(location.search);
    const claimidFromUrl = urlParams.get('nopolis') || '';

    // Then try current anggota
    const currentAnggota = getCurrentAnggota();
    const noPolisFromAnggota = currentAnggota?.noPolis || currentAnggota?.nopolis || '';

    // Then try from anggotalist
    const noPolisFromList = anggotalist?.noPolis || anggotalist?.nopolis || '';

    return claimidFromUrl || noPolisFromAnggota || noPolisFromList || '';
  };
  // Helper function to get URL-encoded noPolis value
  const getEncodedClaimId = () => {
    const claimid = getClaimid();
    const encoded = encodeURIComponent(claimid);

    return encoded;
  };

  const getEncodedNoPolis = () => {
    const noPolis = getNoPolis();
    const encoded = encodeURIComponent(noPolis);

    return encoded;
  };

  const { mapRef, mapInstance, polygonLayerRef, basemapLayerRef } = useMap(
    isAuthenticated,
    process.env.REACT_APP_GOOGLE_API_KEY,
    handlePercilSelect,
    (() => {
      const currentAnggota = getCurrentAnggota();
      return petakLayerVisible && currentAnggota?.nik
        ? `function_zxy_id_petakuserklaim/{z}/{x}/{y}?id=${currentAnggota.nik}&nopolis=${getEncodedNoPolis()}`
        : "";
    })()
  );

  // Initialize search input from URL params
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const address = urlParams.get('address') || '';

    if (address) {
      setSearchInput(address);
    }
  }, [location.search]);

  useEffect(() => {
    if (storedToken && storedToken !== token) {
      setToken(storedToken);
    }
  }, [storedToken, token]);

  useEffect(() => {
    const handleMessage = (e) => {
      if (e.data && e.data.token) {
        const tokenValue = e.data.token;
        setToken(tokenValue);
        dispatch(setTokenAction(tokenValue));
      }
      if (e.data && e.data.address) {
        setSearchInput(e.data.address);
        setTimeout(() => {
          if (mapInstance.current && e.data.address) {
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
  }, [mapInstance, dispatch]);

  useEffect(() => {
    setTotalArea(
      selectedPercils.reduce((sum, p) => sum + parseFloat(p.area || 0), 0)
    );
  }, [selectedPercils]);

  useEffect(() => {
    const currentAnggota = getCurrentAnggota();
    if (!currentAnggota) return;

    if (selectedPercils.length > (currentAnggota.jmlPetak || 0)) {
      setAlertMessage(
        `Jumlah petak terpilih saat ini ${selectedPercils.length}, tidak dapat lebih dari ${currentAnggota.jmlPetak || 0}`
      );
      setAlertOpen(true);
      setIsValid(false);
      return;
    }

    const luasLahanFloat = parseFloat(currentAnggota.luasLahan || 0);
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
  }, [selectedPercils, totalArea, anggotalist, currentAnggotaIndex]);

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
    const currentAnggota = getCurrentAnggota();
    if (!currentAnggota || !currentAnggota.nik) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Data anggota tidak tersedia.",
      });
      return;
    }

    const payload = selectedPercils.map((p) => ({
      nik: currentAnggota.nik,
      idpetak: p.id,
      luas: p.area,
      musim_tanam: currentAnggota.musimTanam || 'MT1', // Default value if not provided
      tgl_tanam: currentAnggota.tanggalTanam || new Date().toISOString().split('T')[0], // Default to today
      tgl_panen: currentAnggota.tanggalPanen || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Default to 90 days from now
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
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Gagal Menyimpan Data.",
      });
    }
  };


  useEffect(() => {
    // Get noPolis from multiple sources
    const urlParams = new URLSearchParams(location.search);
    const claimidFromUrl = urlParams.get('claimid') || '';

    const currentAnggota = getCurrentAnggota();
    const noPolisFromAnggota = currentAnggota?.noPolis || currentAnggota?.nopolis || '';

    const noPolisFromList = anggotalist?.noPolis || anggotalist?.nopolis || '';

    const nopolis = claimidFromUrl || noPolisFromAnggota || noPolisFromList || '';


    const claimIdValue = getClaimid();

    if (claimIdValue && token) {
      //console.log('Dispatching getAnggotaKlaim:', { nopolis, token });
      dispatch(getAnggotaKlaimId(claimIdValue, token));
    } else {
      // console.log('Not dispatching getAnggotaKlaim - missing:', { nopolis: !nopolis, token: !token });
    }
  }, [location.search, currentAnggotaIndex, token, dispatch]);

  // Update search input from response
  useEffect(() => {
    const currentAnggota = getCurrentAnggota();
    if (currentAnggota?.address) {
      setSearchInput(currentAnggota.address);
    }
  }, [anggotalist, currentAnggotaIndex]);


  // Update polygon layer when current anggota changes
  useEffect(() => {
    const currentAnggota = getCurrentAnggota();
    if (!polygonLayerRef.current || !mapInstance.current || !currentAnggota?.nik) return;

    const tileUrlPath = `function_zxy_id_petakuserklaim/{z}/{x}/{y}?id=${currentAnggota.nik}&nopolis=${getEncodedNoPolis()}`;

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
    anggotalist,
    currentAnggotaIndex,
    mapInstance,
    polygonLayerRef,
  ]);

  // Update map style when selectedPetakId changes to highlight selected petak using same style as selection
  useEffect(() => {
    if (!polygonLayerRef.current || !petakLayerVisible) {
      // Reset to default style when layer is not visible
      if (polygonLayerRef.current) {
        polygonLayerRef.current.setStyle(getPercilStyle([]));
        polygonLayerRef.current.changed();
      }
      return;
    }

    // Use getPercilStyle with selectedPetakId as selection (same style as when selecting on map)
    const selection = selectedPetakId ? [{ id: selectedPetakId, petakid: selectedPetakId }] : [];
    polygonLayerRef.current.setStyle(getPercilStyle(selection));
    polygonLayerRef.current.changed();
  }, [selectedPetakId, petakLayerVisible, polygonLayerRef]);

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
    // Prevent multiple clicks while loading
    if (loadingPetakData) {
      return;
    }

    if (selectedAnggota?.nik === anggota.nik && petakLayerVisible) {
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
        const result = await dispatch(getPetakUser(anggota.nik));

        // Check if petak data exists using the result directly, not the state
        if (!result || !result.data || result.data.length === 0) {
          // Mark this anggota as having no petak data
          setAnggotaPetakStatus(prev => ({ ...prev, [anggota.nik]: false }));

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
        setAnggotaPetakStatus(prev => ({ ...prev, [anggota.nik]: true }));

        // Show the petak layer and update the map tile URL to show petak data for the selected NIK
        setPetakLayerVisible(true);
        if (mapInstance.current && polygonLayerRef.current) {
          const newTileUrl = `function_zxy_id_petakuserklaim/{z}/{x}/{y}?id=${anggota.nik}&nopolis=${getEncodedNoPolis()}`;
          const fullUrl = `${process.env.REACT_APP_TILE_URL}/${newTileUrl}`;

          const newSource = new VectorTileSource({
            format: new MVT(),
            url: fullUrl,
          });

          // Add error handling for the source
          newSource.on('tileloaderror', (event) => {
            console.error('Debug tile load error:', {
              url: event.tile.src_,
              error: event
            });
          });

          newSource.on('tileloadend', (event) => {

          });

          // Set up the layer first
          polygonLayerRef.current.setSource(newSource);
          polygonLayerRef.current.setVisible(true);
          polygonLayerRef.current.changed();



          // Use the new center petak API for precise zooming
          const performPreciseZoom = async () => {
            try {
              const centerData = await dispatch(getCenterPetakUser(anggota.nik));

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
        setAnggotaPetakStatus(prev => ({ ...prev, [anggota.nik]: false }));

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

  // Load petak list for selected anggota
  const loadPetakList = async (nik) => {
    if (!nik) return;
    
    setLoadingPetakList(true);
    try {
      const result = await dispatch(getPetakUser(nik));
      if (result && result.data && result.data.length > 0) {
        setPetakList(result.data);
      } else {
        setPetakList([]);
      }
    } catch (error) {
      console.error("Error loading petak list:", error);
      setPetakList([]);
    } finally {
      setLoadingPetakList(false);
    }
  };

  // Zoom to petak function
  const zoomToPetak = async (petak) => {
    if (!mapInstance.current) return;

    try {
      const petakId = petak.idpetak || petak.id;
      if (!petakId) {
        console.error("Petak ID not found");
        return;
      }

      // Get petak data with geometry from API
      const petakData = await dispatch(getPetakByIdPetak(petakId));
      
      if (petakData && petakData.data) {
        const data = petakData.data;
        const view = mapInstance.current.getView();

        // Use bounds if available (more accurate)
        if (data.bounds) {
          const { minX, minY, maxX, maxY } = data.bounds;
          const extent = [
            fromLonLat([minX, minY])[0],
            fromLonLat([minX, minY])[1],
            fromLonLat([maxX, maxY])[0],
            fromLonLat([maxX, maxY])[1]
          ];

          const bufferedExtent = buffer(extent, 50);
          view.fit(bufferedExtent, {
            duration: 2000,
            padding: [20, 20, 20, 20],
            maxZoom: 22
          });
          return true;
        }
        // Fallback: use center if bounds not available
        else if (data.center && data.center.coordinates) {
          const centerCoords = fromLonLat([data.center.coordinates[0], data.center.coordinates[1]]);
          view.animate({
            center: centerCoords,
            zoom: 18,
            duration: 2000
          });
          return true;
        }
        // Fallback: use geometry if available
        else if (data.geometry) {
          let geometry = data.geometry;
          if (typeof geometry === 'string') {
            geometry = JSON.parse(geometry);
          }

          if (geometry.type === 'Polygon' && geometry.coordinates) {
            const coords = geometry.coordinates[0];
            const lons = coords.map(c => c[0]);
            const lats = coords.map(c => c[1]);
            
            const minLon = Math.min(...lons);
            const maxLon = Math.max(...lons);
            const minLat = Math.min(...lats);
            const maxLat = Math.max(...lats);

            const extent = [
              fromLonLat([minLon, minLat])[0],
              fromLonLat([minLon, minLat])[1],
              fromLonLat([maxLon, maxLat])[0],
              fromLonLat([maxLon, maxLat])[1]
            ];

            const bufferedExtent = buffer(extent, 50);
            view.fit(bufferedExtent, {
              duration: 2000,
              padding: [20, 20, 20, 20],
              maxZoom: 22
            });
            return true;
          }
        }
      }
    } catch (geoError) {
      console.error("Error zooming to petak:", geoError);
    }
    return false;
  };

  // Handle petak click - load analytic data and zoom to petak
  const handlePetakClick = async (petak) => {
    try {
      const petakId = petak.idpetak || petak.id;
      setSelectedPetakId(petakId);

      // Load analytic chart data for the clicked petak
      const [tanamRes, ndpiRes, waterRes, bareRes] = await Promise.all([
        dispatch(getTanamPetak(petakId)),
        dispatch(getNDPIAnalisis(petakId)),
        dispatch(getWaterAnalisis(petakId)),
        dispatch(getBareAnalisis(petakId)),
      ]);

      const tanamCount = tanamRes?.data?.tanam_last2th ?? null;
      const ndpiData = toArray(ndpiRes?.data?.ndpi_val_last2th);
      const waterData = toArray(waterRes?.data?.water_val_last2th);
      const bareData = toArray(bareRes?.data?.bare_val_last2th);
      const satEpoch = toArray(ndpiRes?.data?.sat_epoch ?? null);

      setChartData({
        dates: satEpoch,
        floodData: waterData,
        droughtData: bareData,
        rainfallData: ndpiData,
      });

      setTanamCountLast2Years(tanamCount);

      // Zoom to petak
      await zoomToPetak(petak);

      // Ensure chart panel is visible
      setChartPanelVisible(true);
    } catch (apiError) {
      console.error("Error loading petak analytics:", apiError);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Gagal memuat data analisis petak.",
      });
    }
  };

  const handleViewAnalytics = (anggota) => {
    // Check if petak data is available before opening analytics
    if (anggotaPetakStatus[anggota.nik] === false) {
      Swal.fire({
        icon: "info",
        title: "Analytics Tidak Tersedia",
        text: "Data petak belum tersedia untuk anggota ini. Analytics membutuhkan data petak untuk ditampilkan.",
        confirmButtonText: "OK"
      });
      return;
    }

    // Set selected anggota and toggle bottom chart panel
    setSelectedAnggota(anggota);
    
    if (selectedAnggota?.nik === anggota.nik && chartPanelVisible) {
      // If clicking the same anggota and panel is open, close it
      setChartPanelVisible(false);
    } else {
      // Open bottom panel for new anggota or if panel is closed
      setChartPanelVisible(true);
      // Load petak list when opening analytics
      loadPetakList(anggota.nik);
    }
  };

  // Panel handlers - simplified with react-rnd
  const handleMaximizePanel = () => {
    if (!isPanelMaximized) {
      // Store current position and size before maximizing
      setPanelState({
        x: window.innerWidth - 300, // Position on the right side
        y: 15,
        width: 280,
        height: window.innerHeight * 0.75,
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
        x: window.innerWidth - 300, // Position on the right side
        y: 15,
        width: 280,
        height: window.innerHeight * 0.75,
      });
    }
    setIsPanelMaximized(!isPanelMaximized);
  };

  const handleMaximizeChart = () => {
    setIsChartMaximized(!isChartMaximized);
  };

  // State to track which anggotas have petak data
  const [anggotaPetakStatus, setAnggotaPetakStatus] = useState({});

  // Panel state - simplified with react-rnd
  const [panelState, setPanelState] = useState({
    x: window.innerWidth - 300, // Position on the right side
    y: 15,
    width: 280,
    height: window.innerHeight * 0.75,
  });

  // Helper function to check if petak data exists for an anggota
  const hasPetakData = (anggota) => {
    const status = anggotaPetakStatus[anggota.nik];
    // If status is undefined, we haven't checked yet, so allow the button to be enabled
    // If status is false, we know there's no data, so disable the button
    // If status is true, we know there's data, so enable the button
    return status !== false;
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

  // Removed window resize handler for analytics panel (panel removed)

  // Removed scroll detection for analytics panel (panel removed)

  // Pre-check petak data availability for all anggotas
  useEffect(() => {
    const dataArray = anggotalist?.data?.data || [];
    if (dataArray && dataArray.length > 0) {
      // Initialize all anggotas as potentially having petak data
      const initialStatus = {};
      dataArray.forEach(anggota => {
        initialStatus[anggota.nik] = undefined; // undefined means not checked yet
      });
      setAnggotaPetakStatus(initialStatus);

      // Set the first anggota as selected by default to show analytics panel
      if (!selectedAnggota) {
        const firstAnggota = dataArray[0];
        setSelectedAnggota(firstAnggota);
        setCurrentAnggotaIndex(0);
      }
    }
  }, [anggotalist, selectedAnggota]);

  // Update selectedAnggota when currentAnggotaIndex changes
  useEffect(() => {
    const dataArray = anggotalist?.data?.data || [];
    if (dataArray && dataArray.length > 0) {
      const currentAnggota = dataArray[currentAnggotaIndex];
      if (currentAnggota && (!selectedAnggota || selectedAnggota.nik !== currentAnggota.nik)) {
        setSelectedAnggota(currentAnggota);
        // Load petak list when anggota changes and analytics panel is open
        if (chartPanelVisible) {
          loadPetakList(currentAnggota.nik);
        }
      }
    }
  }, [currentAnggotaIndex, anggotalist, selectedAnggota, chartPanelVisible]);

  // Keyboard navigation support
  useEffect(() => {
    const handleKeyDown = (event) => {
      const dataArray = anggotalist?.data?.data || [];
      if (dataArray && dataArray.length > 0) {
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
    const dataArray = anggotalist?.data?.data || [];
    if (dataArray && dataArray.length > 0) {
      const newIndex = Math.max(0, currentAnggotaIndex - 1);
      setCurrentAnggotaIndex(newIndex);
      const newAnggota = dataArray[newIndex];
      setSelectedAnggota(newAnggota);

      // Reset panels when changing anggota
      setPetakLayerVisible(false);
      setChartPanelVisible(false);
    }
  };

  const handleNextAnggota = () => {
    const dataArray = anggotalist?.data?.data || [];
    if (dataArray && dataArray.length > 0) {
      const newIndex = Math.min(dataArray.length - 1, currentAnggotaIndex + 1);
      setCurrentAnggotaIndex(newIndex);
      const newAnggota = dataArray[newIndex];
      setSelectedAnggota(newAnggota);

      // Reset panels when changing anggota
      setPetakLayerVisible(false);
      setChartPanelVisible(false);
    }
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

  // Generate sample data for the charts (used as initial placeholder before API data loads)
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

  const [chartData, setChartData] = useState(() => generateChartData());
  const dates = chartData.dates || [];

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
          startIcon={<MenuIcon sx={{ fontSize: '16px', textAlign: 'center' }} />}
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
            background: "rgba(255, 255, 255, 0.98)",
            borderRadius: "12px",
            padding: "0",
            boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
            zIndex: 1000,
            maxHeight: chartPanelVisible ? (isChartMaximized ? `calc(50vh - 20px)` : `calc(100vh - 340px)`) : "85vh",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            border: "1px solid rgba(0,0,0,0.08)",
          }}
        >
          {/* Fixed Tab Header */}
          <Box sx={{
            position: "sticky",
            top: 0,
            zIndex: 10,
            backgroundColor: "#ffffff",
            borderRadius: "12px 12px 0 0",
            borderBottom: "2px solid rgba(0,0,0,0.08)",
            backdropFilter: "blur(10px)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "4px 0"
          }}>
            <Tabs 
              value={tabValue} 
              onChange={handleTabChange} 
              sx={{ 
                minHeight: '44px',
                '& .MuiTab-root': {
                  minHeight: '44px',
                  fontSize: '0.8rem',
                  fontWeight: 500,
                  textTransform: 'none',
                  padding: '8px 16px'
                }
              }}
            >
              <Tab label="Anggota" icon={<PeopleIcon sx={{ fontSize: '18px' }} />} iconPosition="start" />
              <Tab label="Layers" icon={<LayersIcon sx={{ fontSize: '18px' }} />} iconPosition="start" />
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
            padding: "10px",
            '&::-webkit-scrollbar': {
              width: '6px',
            },
            '&::-webkit-scrollbar-track': {
              background: 'transparent',
            },
            '&::-webkit-scrollbar-thumb': {
              background: 'rgba(0,0,0,0.2)',
              borderRadius: '3px',
            },
            '&::-webkit-scrollbar-thumb:hover': {
              background: 'rgba(0,0,0,0.3)',
            },
          }}>
            {tabValue === 0 && (
              <Box sx={{ padding: '0' }}>


                {anggotaLoading ? (
                  <Box sx={{ textAlign: 'center', padding: '20px' }}>
                    <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>Loading anggota...</Typography>
                  </Box>
                ) : (() => {
                  const dataArray = anggotalist?.data?.data || [];
                  return dataArray && dataArray.length > 0 ? (
                    <Box>
                      {/* Current Anggota Display */}
                      {(() => {
                        const currentAnggota = dataArray[currentAnggotaIndex];
                        return (
                          <Card
                            key={`anggota-${currentAnggotaIndex}`}
                            sx={{
                              border: '1px solid rgba(0,0,0,0.08)',
                              borderRadius: '8px',
                              transition: 'all 0.2s ease',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                              overflow: 'hidden',
                              '&:hover': {
                                boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                                borderColor: '#1976d2'
                              }
                            }}
                          >
                            <CardContent sx={{ padding: '12px', '&:last-child': { paddingBottom: '12px' } }}>
                              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                <Box>
                                  <Typography variant="subtitle2" component="div" sx={{ fontSize: '0.85rem', fontWeight: 600, mb: 0.5, color: '#212529' }}>
                                    {currentAnggota.nama || 'Nama tidak tersedia'}
                                  </Typography>
                                  <Typography component="div" variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', display: 'block' }}>
                                    NIK: {currentAnggota.nik || 'Tidak tersedia'}
                                  </Typography>
                                </Box>


                                {/* Action Buttons */}
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, mt: 0.5 }}>
                                  <Button
                                    size="small"
                                    variant={selectedAnggota?.nik === currentAnggota.nik && petakLayerVisible ? "contained" : "outlined"}
                                    startIcon={<VisibilityIcon sx={{ fontSize: '14px' }} />}
                                    onClick={() => handleViewPetak(currentAnggota)}
                                    disabled={!hasPetakData(currentAnggota) || loadingPetakData}
                                    sx={{
                                      minWidth: 'auto',
                                      fontSize: '0.7rem',
                                      padding: '6px 12px',
                                      height: '32px',
                                      opacity: anggotaPetakStatus[currentAnggota.nik] === false ? 0.5 : 1,
                                      backgroundColor: selectedAnggota?.nik === currentAnggota.nik && petakLayerVisible
                                        ? '#1976d2'
                                        : 'transparent',
                                      color: selectedAnggota?.nik === currentAnggota.nik && petakLayerVisible
                                        ? 'white'
                                        : '#1976d2',
                                      borderColor: '#1976d2',
                                      '&:hover': {
                                        backgroundColor: selectedAnggota?.nik === currentAnggota.nik && petakLayerVisible
                                          ? '#1565c0'
                                          : 'rgba(25, 118, 210, 0.08)',
                                        borderColor: '#1976d2'
                                      },
                                      '&:disabled': {
                                        borderColor: '#e0e0e0',
                                        color: '#9e9e9e'
                                      }
                                    }}
                                    title={anggotaPetakStatus[currentAnggota.nik] === false ? "Data panel belum tersedia" : loadingPetakData ? "Loading..." : "View Petak"}
                                  >
                                    {loadingPetakData && selectedAnggota?.nik === currentAnggota.nik
                                      ? 'Loading...'
                                      : selectedAnggota?.nik === currentAnggota.nik && petakLayerVisible
                                        ? 'Hide Petak'
                                        : 'View Petak'}
                                  </Button>

                                  {anggotaPetakStatus[currentAnggota.nik] === false && (
                                    <Typography
                                      variant="caption"
                                      color="text.secondary"
                                      sx={{
                                        fontSize: '0.65rem',
                                        textAlign: 'center',
                                        fontStyle: 'italic',
                                        padding: '4px 0'
                                      }}
                                    >
                                      Data petak belum tersedia
                                    </Typography>
                                  )}

                                  <Button
                                    size="small"
                                    variant={selectedAnggota?.nik === currentAnggota.nik && chartPanelVisible ? "contained" : "outlined"}
                                    startIcon={<AnalyticsIcon sx={{ fontSize: '14px' }} />}
                                    onClick={() => handleViewAnalytics(currentAnggota)}
                                    disabled={anggotaPetakStatus[currentAnggota.nik] === false}
                                    sx={{
                                      minWidth: 'auto',
                                      fontSize: '0.7rem',
                                      padding: '6px 12px',
                                      height: '32px',
                                      opacity: anggotaPetakStatus[currentAnggota.nik] === false ? 0.5 : 1,
                                      backgroundColor: selectedAnggota?.nik === currentAnggota.nik && chartPanelVisible
                                        ? '#4caf50'
                                        : 'transparent',
                                      color: selectedAnggota?.nik === currentAnggota.nik && chartPanelVisible
                                        ? 'white'
                                        : '#4caf50',
                                      borderColor: '#4caf50',
                                      '&:hover': {
                                        backgroundColor: selectedAnggota?.nik === currentAnggota.nik && chartPanelVisible
                                          ? '#388e3c'
                                          : 'rgba(76, 175, 80, 0.08)',
                                        borderColor: '#4caf50'
                                      },
                                      '&:disabled': {
                                        borderColor: '#e0e0e0',
                                        color: '#9e9e9e'
                                      }
                                    }}
                                    title={anggotaPetakStatus[currentAnggota.nik] === false ? "Data petak belum tersedia" : "View Analytics"}
                                  >
                                    {selectedAnggota?.nik === currentAnggota.nik && chartPanelVisible ? 'Analytics On' : 'Analytics'}
                                  </Button>

                                  {anggotaPetakStatus[currentAnggota.nik] === false && (
                                    <Typography
                                      variant="caption"
                                      color="text.secondary"
                                      sx={{
                                        fontSize: '0.65rem',
                                        textAlign: 'center',
                                        fontStyle: 'italic',
                                        padding: '4px 0'
                                      }}
                                    >
                                      Analytics tidak tersedia - data petak diperlukan
                                    </Typography>
                                  )}
                                </Box>
                              </Box>
                            </CardContent>
                            
                            {/* Navigation Controls at bottom of card */}
                            <Box sx={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '8px 12px',
                              backgroundColor: 'rgba(25, 118, 210, 0.06)',
                              borderRadius: '0 0 8px 8px',
                              borderTop: '1px solid rgba(25, 118, 210, 0.15)'
                            }}>
                              <Button
                                variant="text"
                                size="small"
                                onClick={handlePrevAnggota}
                                disabled={currentAnggotaIndex === 0}
                                startIcon={<span style={{ fontSize: '14px' }}>‹</span>}
                                sx={{
                                  minWidth: 'auto',
                                  fontSize: '0.7rem',
                                  padding: '4px 8px',
                                  height: '28px',
                                  color: '#1976d2',
                                  '&:hover': {
                                    backgroundColor: 'rgba(25, 118, 210, 0.08)',
                                  },
                                  '&:disabled': {
                                    color: '#9e9e9e'
                                  }
                                }}
                              >
                                Prev
                              </Button>

                              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, fontSize: '0.7rem' }}>
                                {currentAnggotaIndex + 1} dari {dataArray.length}
                              </Typography>

                              <Button
                                variant="text"
                                size="small"
                                onClick={handleNextAnggota}
                                disabled={currentAnggotaIndex === dataArray.length - 1}
                                endIcon={<span style={{ fontSize: '14px' }}>›</span>}
                                sx={{
                                  minWidth: 'auto',
                                  fontSize: '0.7rem',
                                  padding: '4px 8px',
                                  height: '28px',
                                  color: '#1976d2',
                                  '&:hover': {
                                    backgroundColor: 'rgba(25, 118, 210, 0.08)',
                                  },
                                  '&:disabled': {
                                    color: '#9e9e9e'
                                  }
                                }}
                              >
                                Next
                              </Button>
                            </Box>
                          </Card>
                        );
                      })()}
                    </Box>
                  ) : (
                    <Box sx={{ textAlign: 'center', padding: '20px' }}>
                      <Typography color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                        Tidak ada data anggota untuk kelompok ini
                      </Typography>
                    </Box>
                  );
                })()}
              </Box>
            )}

            {tabValue === 1 && (
              <Box sx={{ padding: '0', width: '100%', maxWidth: '100%', overflowX: 'hidden' }}>
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
              </Box>
            )}
          </Box>
        </div>
      )}


      {/* Bottom Panel - Split Layout: Ringkasan Lahan (left) and Chart (right) */}
      {chartPanelVisible && selectedAnggota ? (
        <Box
          sx={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: isChartMaximized ? '50vh' : '320px',
            marginBottom: dataPanelVisible ? '0' : '0',
            backgroundColor: 'rgba(255, 255, 255, 0.98)',
            borderTop: '2px solid rgba(0,0,0,0.1)',
            boxShadow: '0 -4px 16px rgba(0,0,0,0.12)',
            zIndex: 999,
            display: 'flex',
            flexDirection: 'column',
            transition: 'height 0.3s ease',
          }}
        >
          {/* Panel Header */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '3px 10px',
              borderBottom: '2px solid rgba(0,0,0,0.08)',
              backgroundColor: '#ffffff',
              flexShrink: 0,
              boxShadow: '0 2px 4px rgba(0,0,0,0.04)'
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Typography variant="subtitle2" sx={{ fontSize: '0.9rem', fontWeight: 600, color: '#212529' }}>
                Analisis Petak
              </Typography>
             
            </Box>
            <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
    
              <IconButton
                size="small"
                onClick={() => setChartPanelVisible(false)}
                sx={{ 
                  color: 'text.secondary', 
                  padding: '6px',
                  '&:hover': {
                    backgroundColor: 'rgba(0,0,0,0.04)',
                    color: 'text.primary'
                  }
                }}
                title="Hide Panel"
              >
                <span style={{ fontSize: '18px' }}>×</span>
              </IconButton>
            </Box>
          </Box>

          {/* Split Content: Left (List Petak), Middle (Chart), Right (Ringkasan Lahan) */}
          <Box
            sx={{
              flex: 1,
              display: 'flex',
              overflow: 'hidden',
            }}
          >
            {/* Left Side - List Petak */}
            <Box
              sx={{
                width: '25%',
                minWidth: '220px',
                borderRight: '2px solid rgba(0,0,0,0.08)',
                backgroundColor: '#fafafa',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
              }}
            >
              <Box
                sx={{
                  padding: '3px 10px',
                  borderBottom: '1px solid rgba(0,0,0,0.08)',
                  backgroundColor: '#f8f9fa',
                }}
              >
                <Typography variant="subtitle2" sx={{ fontSize: '0.85rem', fontWeight: 600, color: '#212529' }}>
                  Daftar Petak
                </Typography>
              </Box>
              <Box
                sx={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: '8px',
                  '&::-webkit-scrollbar': {
                    width: '6px',
                  },
                  '&::-webkit-scrollbar-track': {
                    background: 'transparent',
                  },
                  '&::-webkit-scrollbar-thumb': {
                    background: 'rgba(0,0,0,0.2)',
                    borderRadius: '3px',
                  },
                  '&::-webkit-scrollbar-thumb:hover': {
                    background: 'rgba(0,0,0,0.3)',
                  },
                }}
              >
                {loadingPetakList ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
                    <Typography variant="body2" sx={{ fontSize: '0.75rem', color: '#6c757d' }}>
                      Loading...
                    </Typography>
                  </Box>
                ) : petakList.length === 0 ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
                    <Typography variant="body2" sx={{ fontSize: '0.75rem', color: '#6c757d', textAlign: 'center' }}>
                      Tidak ada data petak
                    </Typography>
                  </Box>
                ) : (
                  <List sx={{ padding: 0 }}>
                    {petakList.map((petak, index) => (
                      <ListItem
                        key={petak.idpetak || petak.id || index}
                        onClick={() => handlePetakClick(petak)}
                        sx={{
                          backgroundColor: selectedPetakId === (petak.idpetak || petak.id) ? '#e3f2fd' : 'transparent',
                          border: selectedPetakId === (petak.idpetak || petak.id) ? '1px solid #1976d2' : '1px solid transparent',
                          borderRadius: '6px',
                          marginBottom: '4px',
                          padding: '8px 12px',
                          cursor: 'pointer',
                          '&:hover': {
                            backgroundColor: selectedPetakId === (petak.idpetak || petak.id) ? '#e3f2fd' : '#f5f5f5',
                            borderColor: '#1976d2',
                          },
                          transition: 'all 0.2s ease',
                        }}
                      >
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="body2" sx={{ fontSize: '0.75rem', fontWeight: 500 }}>
                                Petak {index + 1}
                              </Typography>
                              {petak.luas && (
                                <Typography variant="caption" sx={{ fontSize: '0.65rem', color: '#6c757d' }}>
                                  ({parseFloat(petak.luas).toFixed(4)} ha)
                                </Typography>
                              )}
                            </Box>
                          }
                          secondary={
                            <Typography variant="caption" sx={{ fontSize: '0.65rem', color: '#6c757d', fontFamily: 'monospace' }}>
                              ID: {petak.idpetak || petak.id || '-'}
                            </Typography>
                          }
                        />
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            // Zoom to petak when zoom icon is clicked
                            zoomToPetak(petak);
                          }}
                          sx={{
                            padding: '4px',
                            color: '#1976d2',
                            '&:hover': {
                              backgroundColor: 'rgba(25, 118, 210, 0.1)',
                            },
                          }}
                          title="Zoom ke Petak"
                        >
                          <ZoomInIcon sx={{ fontSize: '18px' }} />
                        </IconButton>
                      </ListItem>
                    ))}
                  </List>
                )}
              </Box>
            </Box>

            {/* Middle Side - Chart */}
            <Box
              sx={{
                width: '50%',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                backgroundColor: '#ffffff',
                borderRight: '2px solid rgba(0,0,0,0.08)',
              }}
            >
              {selectedPetakId ? (
                <>
                  {/* Chart Header with Controls */}
                  <Box
                    sx={{
                      padding: '0 10px',
                      borderBottom: '1px solid rgba(0,0,0,0.08)',
                      backgroundColor: '#f8f9fa',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Typography variant="subtitle2" sx={{ fontSize: '0.85rem', fontWeight: 600, color: '#212529' }}>
                      Grafik Analisis Petak
                    </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, alignItems: 'center' }}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        size="small"
                        checked={showBare}
                        onChange={(e) => setShowBare(e.target.checked)}
                        sx={{ padding: '4px' }}
                      />
                    }
                    label={<Typography sx={{ fontSize: '0.7rem' }}>Bera (Bare)</Typography>}
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        size="small"
                        checked={showNdpi}
                        onChange={(e) => setShowNdpi(e.target.checked)}
                        sx={{ padding: '4px' }}
                      />
                    }
                    label={<Typography sx={{ fontSize: '0.7rem' }}>Vegetasi (NDPI)</Typography>}
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        size="small"
                        checked={showWater}
                        onChange={(e) => setShowWater(e.target.checked)}
                        sx={{ padding: '4px' }}
                      />
                    }
                    label={<Typography sx={{ fontSize: '0.7rem' }}>Air (Water)</Typography>}
                  />
                </Box>
              </Box>

              {/* Chart Content */}
              <Box
                sx={{
                  flex: 1,
                  padding: '16px',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  overflow: 'auto',
                }}
              >
                <Box
                  className="chart-container"
                  sx={{
                    position: 'relative',
                    width: '100%',
                    maxWidth: '100%',
                    height: '100%',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <LineChart
                    xAxis={[
                      {
                        data: chartData.dates.map((d) => new Date(d)),
                        scaleType: "time",
                        valueFormatter: (value) =>
                          value.toLocaleDateString("en-GB", {
                            day: "2-digit",
                            month: "short",
                            year: "2-digit",
                          }), // dd mm yy
                        tickMinStep: 1000 * 60 * 60 * 24 * 30, // sekitar 1 bulan
                      },
                    ]}
                    series={[
                      ...(showBare
                        ? [
                          {
                            data: chartData.droughtData,
                            label: "Bera (Bare)",
                            color: "#e15759",
                            showMark: false,
                            curve: "linear",
                          },
                        ]
                        : []),
                      ...(showNdpi
                        ? [
                          {
                            data: chartData.rainfallData,
                            label: "Vegetasi (NDPI)",
                            color: "#59a14f",
                            showMark: false,
                            curve: "linear",
                          },
                        ]
                        : []),
                      ...(showWater
                        ? [
                          {
                            data: chartData.floodData,
                            label: "Air (Water)",
                            color: "#4e79a7",
                            showMark: false,
                            curve: "linear",
                          },
                        ]
                        : []),
                    ]}
                    height={isChartMaximized ? 400 : 220}
                    width={Math.max(500, typeof window !== 'undefined' ? (window.innerWidth * 0.5) - 100 : 500)}
                    slotProps={{
                      legend: {
                        direction: 'column',
                        position: { vertical: 'middle', horizontal: 'right' },
                        padding: 8,
                        itemMarkWidth: 12,
                        itemMarkHeight: 12,
                        markGap: 8,
                        itemGap: 12,
                        labelStyle: {
                          fontSize: '0.7rem',
                        },
                      },
                    }}
                    sx={{
                      '.MuiChartsAxis-tickLabel': {
                        fontSize: '0.65rem',
                      }
                    }}
                  />
                </Box>
              </Box>
            </>
          ) : (
            <Box
              sx={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '32px',
              }}
            >
              <Typography variant="body2" sx={{ color: '#6c757d', fontSize: '0.85rem', textAlign: 'center' }}>
                Pilih petak di peta untuk melihat analisis chart
              </Typography>
            </Box>
          )}
            </Box>

            {/* Right Side - Ringkasan Lahan */}
            <Box
              sx={{
                width: '25%',
                minWidth: '220px',
                backgroundColor: '#fafafa',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
              }}
            >
              <Box
                sx={{
                  padding: '3px 10px',
                  borderBottom: '1px solid rgba(0,0,0,0.08)',
                  backgroundColor: '#f8f9fa',
                }}
              >
                <Typography variant="subtitle2" sx={{ fontSize: '0.85rem', fontWeight: 600, color: '#212529' }}>
                  Ringkasan Lahan
                </Typography>
              </Box>
              <Box
                sx={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: '16px',
                  '&::-webkit-scrollbar': {
                    width: '6px',
                  },
                  '&::-webkit-scrollbar-track': {
                    background: 'transparent',
                  },
                  '&::-webkit-scrollbar-thumb': {
                    background: 'rgba(0,0,0,0.2)',
                    borderRadius: '3px',
                  },
                  '&::-webkit-scrollbar-thumb:hover': {
                    background: 'rgba(0,0,0,0.3)',
                  },
                }}
              >
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  

                  {/* Riwayat Tanam */}
                  <Box sx={{ 
                    display: 'flex', 
                    flexDirection: 'column',
                    padding: '10px',
                    backgroundColor: '#fff3cd',
                    borderRadius: '6px',
                    border: '1px solid #ffc107',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                  }}>
                    <Typography variant="caption" sx={{ 
                      fontSize: '0.65rem', 
                      color: '#856404',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      fontWeight: 600,
                      marginBottom: '4px'
                    }}>
                      Riwayat Tanam (2 Tahun Terakhir)
                    </Typography>
                    <Typography variant="body2" sx={{ 
                      fontSize: '0.95rem', 
                      fontWeight: 600,
                      color: '#856404'
                    }}>
                      {tanamCountLast2Years != null
                        ? `${tanamCountLast2Years} kali tanam`
                        : 'Tidak ada data'}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </Box>
          </Box>
        </Box>
      ) : null}

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
