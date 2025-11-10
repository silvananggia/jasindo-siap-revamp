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
import { createPetak, getPetakID, getPetakUser } from "../../actions/petakActions";
import { getAnggota } from "../../actions/anggotaActions";
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

const MapAnalytic = () => {
  const dispatch = useDispatch();
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);
  const { loading, errmessage } = useSelector((state) => state.auth);
  const { anggotalist, loading: anggotaLoading } = useSelector((state) => state.anggota);
  const { petaklist, loading: petakLoading } = useSelector((state) => state.petak);

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
  const [alertMessage, setAlertMessage] = useState("");
  const [tileUrl, setTileUrl] = useState();
  const [currentIndex, setCurrentIndex] = useState(0);
  const datesContainerRef = useRef(null);
  
  // New state for petak view functionality
  const [analyticsPanelOpen, setAnalyticsPanelOpen] = useState(false);
  const [selectedAnggota, setSelectedAnggota] = useState(null);
  const [petakLayerVisible, setPetakLayerVisible] = useState(false);

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
    // First check if all required data is loaded
    if (!isDataLoaded) {
      setIsValid(false);
      return;
    }

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
  }, [selectedPercils, totalArea, formData.jmlPetak, formData.luasLahan, isDataLoaded]);

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
      console.log('formData:', formData);
      console.log('formData.idKelompok:', formData.idKelompok);
      dispatch(getAnggota(formData.idKelompok));
    }
  },[formData.idKelompok]);
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
      try {
        await dispatch(getPetakUser(anggota.NIK));
        // Show the petak layer and update the map tile URL to show petak data for the selected NIK
        setPetakLayerVisible(true);
        if (mapInstance.current && polygonLayerRef.current) {
          const newTileUrl = `function_zxy_id_petakuserklaim/{z}/{x}/{y}?id=${anggota.NIK}&nopolis=${formData.noPolis}`;
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
        Swal.fire({
          icon: "error",
          title: "Error",
          text: "Gagal mengambil data petak.",
        });
      }
    }
  };

  const handleViewAnalytics = (anggota) => {
    if (selectedAnggota?.NIK === anggota.NIK && analyticsPanelOpen) {
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
            <Tab label="Data" icon={<ListIcon />} iconPosition="start" />
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
                    <React.Fragment key={anggota.NIK || index}>
                      <ListItem 
                        alignItems="flex-start"
                        sx={{
                          backgroundColor: selectedAnggota?.NIK === anggota.NIK && (petakLayerVisible || analyticsPanelOpen) ? 'rgba(25, 118, 210, 0.08)' : 'transparent',
                          borderLeft: selectedAnggota?.NIK === anggota.NIK && (petakLayerVisible || analyticsPanelOpen) ? '4px solid #1976d2' : 'none',
                          borderRadius: selectedAnggota?.NIK === anggota.NIK && (petakLayerVisible || analyticsPanelOpen) ? '4px' : '0',
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
                                NIK: {anggota.NIK || 'Tidak tersedia'}
                              </Typography>
                              <Typography component="div" variant="body2" color="text.secondary">
                                Luas Lahan: {anggota['Luas Lahan'] || '0'} ha
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
                            variant={selectedAnggota?.NIK === anggota.NIK && petakLayerVisible ? "contained" : "outlined"}
                            startIcon={<VisibilityIcon />}
                            onClick={() => handleViewPetak(anggota)}
                            sx={{ minWidth: 'auto', fontSize: '0.75rem' }}
                          >
                            {selectedAnggota?.NIK === anggota.NIK && petakLayerVisible ? 'Hide Petak' : 'View Petak'}
                          </Button>
                          <Button
                            size="small"
                            variant={selectedAnggota?.NIK === anggota.NIK && analyticsPanelOpen ? "contained" : "outlined"}
                            startIcon={<AnalyticsIcon />}
                            onClick={() => handleViewAnalytics(anggota)}
                            sx={{ minWidth: 'auto', fontSize: '0.75rem' }}
                          >
                            {selectedAnggota?.NIK === anggota.NIK && analyticsPanelOpen ? 'Analytics On' : 'Analytics'}
                          </Button>
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

          {tabValue === 2 && (
            <KlaimPanel
              formData={formData}
              selectedPercils={selectedPercils}
              setSelectedPercils={setSelectedPercils}
              totalArea={totalArea}
              isValid={isValid}
              onSave={handleSimpan}
              polygonLayerRef={polygonLayerRef}
              source="MapAnalytic"
            />
          )}
        </Box>
      </div>

      {/* Analytics Panel */}
      {analyticsPanelOpen && selectedAnggota && (
        <div
          style={{
            position: "absolute",
            top: "20px",
            right: "40px",
            width: "100%",
            maxWidth: "320px",
            background: "#ffffff",
            borderRadius: "16px",
            padding: "0 10px 10px 10px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
            zIndex: 1000,
            maxHeight: "90vh",
            overflowY: "auto",
          }}
        >
          <Box sx={{ maxHeight: '80vh', overflowY: 'auto' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0' }}>
              <Typography variant="h6">
                Analisis - {selectedAnggota.Nama}
              </Typography>
              <IconButton 
                size="small" 
                onClick={() => setAnalyticsPanelOpen(false)}
                sx={{ color: 'text.secondary' }}
              >
                ×
              </IconButton>
            </Box>
            
            <Accordion defaultExpanded>
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                aria-controls="summary-content"
                id="summary-header"
              >
                <Typography>Ringkasan Lahan</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="body2" color="text.secondary">
                  Luas Total: {selectedAnggota['Luas Lahan'] || '0'} ha
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Jumlah Petak: {selectedAnggota['Jumlah Petak Alami'] || '0'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Jenis Lahan: {selectedAnggota['Jenis lahan'] || 'Tidak tersedia'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  NIK: {selectedAnggota.NIK || 'Tidak tersedia'}
                </Typography>
              </AccordionDetails>
            </Accordion>

            <Accordion>
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                aria-controls="productivity-content"
                id="productivity-header"
              >
                <Typography>Analisis Banjir</Typography>
              </AccordionSummary>
              <AccordionDetails>
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
                  height={300}
                  sx={{
                    '.MuiChartsAxis-tickLabel': {
                      fontSize: '0.75rem',
                    }
                  }}
                />
              </AccordionDetails>
            </Accordion>

            <Accordion>
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                aria-controls="drought-content"
                id="drought-header"
              >
                <Typography>Analisis Kekeringan</Typography>
              </AccordionSummary>
              <AccordionDetails>
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
                  height={300}
                  sx={{
                    '.MuiChartsAxis-tickLabel': {
                      fontSize: '0.75rem',
                    }
                  }}
                />
              </AccordionDetails>
            </Accordion>

            <Accordion>
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                aria-controls="rainfall-content"
                id="rainfall-header"
              >
                <Typography>Analisis Curah Hujan</Typography>
              </AccordionSummary>
              <AccordionDetails>
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
                  height={300}
                  sx={{
                    '.MuiChartsAxis-tickLabel': {
                      fontSize: '0.75rem',
                    }
                  }}
                />
              </AccordionDetails>
            </Accordion>
          </Box>
        </div>
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
