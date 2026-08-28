import React, { useState } from 'react';
import {
  Box,
  Typography,
  IconButton,
  TablePagination,
  Button,
  Divider,
  useTheme,
  useMediaQuery,
  Card,
  CardContent,
  Grid,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert,
  Tooltip,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import RefreshIcon from '@mui/icons-material/Refresh';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import OpenWithIcon from '@mui/icons-material/OpenWith';
import PentagonIcon from '@mui/icons-material/Pentagon';
import CircularProgress from '@mui/material/CircularProgress';
import { getPercilStyle } from '../../utils/percilStyles';
import { Style, Stroke, Fill } from 'ol/style';
import { fromLonLat } from 'ol/proj';
import { buffer } from 'ol/extent';
import { getPetakById, getPetakByIdPetak, getPetakKlaimID } from '../../actions/petakActions';
import { useDispatch } from 'react-redux';
import Swal from 'sweetalert2';

const TruncatedText = ({ children, title, sx = {} }) => (
  <Tooltip title={title || children || ''} placement="top" enterDelay={250}>
    <Typography
      component="span"
      sx={{
        display: 'block',
        minWidth: 0,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        ...sx,
      }}
    >
      {children}
    </Typography>
  </Tooltip>
);

const MaybeAccordion = ({ enable, title, children }) => {
  if (!enable) return children;
  return (
    <Accordion
      disableGutters
      elevation={0}
      sx={{
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        '&:before': { display: 'none' },
        mb: 1,
      }}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography variant="body2" sx={{ fontWeight: 700 }}>{title}</Typography>
      </AccordionSummary>
      <AccordionDetails sx={{ pt: 0 }}>{children}</AccordionDetails>
    </Accordion>
  );
};

const DataPanel = ({
  formData,
  selectedPercils,
  setSelectedPercils,
  totalArea,
  isValid,
  onSave,
  polygonLayerRef,
  listPetak,
  klaimList = [],
  source, // 'MapView' or 'MapRegister'
  isLoading,
  onDeletePetak, // Function to delete petak from database
  onRefreshData, // Function to refresh data from database
  isMobile,
  isTablet,
  mapInstance, // Map instance for zoom functionality
  markedPoints = [],
  remainingSlots = 0,
  onClearPoints,
  onRemovePoint,
  onFocusPoint,
  isVertexDeleteMode = false,
  onSetVertexDeleteMode,
  isDrawMode = false,
  onSetDrawMode,
  hoveredPetakId = null,
  onHoverPetak,
  onViewSavedPetak,
}) => {
  // Debug: Log listPetak data structure
  // console.log('DataPanel received listPetak:', listPetak);
  // console.log('DataPanel source:', source);
  // console.log('DataPanel isLoading:', isLoading);
  const theme = useTheme();
  const dispatch = useDispatch();
  const [page, setPage] = useState(0);
  const [rowsPerPage] = useState(isMobile ? 3 : 5);
  const [hoveredId, setHoveredId] = useState(null);
  const normalizeId = (value) => (value === null || value === undefined ? '' : String(value));
  const isMapRegister = source === 'MapRegister';
  const isMapClaim = source === 'MapClaim';
  const registeredListRaw = isMapClaim ? (Array.isArray(klaimList) ? klaimList : []) : (Array.isArray(listPetak) ? listPetak : []);
  const registeredList = registeredListRaw.filter((item, index, arr) => {
    const key = String(item?.id || item?.idpuser || item?.idpetak || '');
    if (!key) return false;
    return arr.findIndex((row) => String(row?.id || row?.idpuser || row?.idpetak || '') === key) === index;
  });
  const uniqueListPetak = (Array.isArray(listPetak) ? listPetak : []).filter((item, index, arr) => {
    const key = String(item?.id || item?.idpuser || item?.idpetak || '');
    if (!key) return false;
    return arr.findIndex((row) => String(row?.id || row?.idpuser || row?.idpetak || '') === key) === index;
  });
  const registeredCount = registeredList.length;
  const registeredTotalArea = registeredList.reduce((sum, p) => sum + parseFloat(p.luas || 0), 0);
  // Area shown in "Lahan Terdaftar" follows the visible petak list (MapClaim shows all petak user)
  const displayedListArea = uniqueListPetak.reduce((sum, p) => sum + parseFloat(p.luas || 0), 0);
  const lahanTerdaftarArea = isMapClaim ? displayedListArea : registeredTotalArea;
  const lockedIDs = registeredList.map((p) => p.idpetak || p.id).filter(Boolean);
  const klaimByPetakId = (Array.isArray(klaimList) ? klaimList : []).reduce((acc, item) => {
    const key = normalizeId(item.idpetak);
    if (key) acc[key] = item;
    return acc;
  }, {});
  const formatLonLat = (item) => {
    const lon = item?.lon ?? item?.longitude;
    const lat = item?.lat ?? item?.latitude;
    const lonNum = Number(lon);
    const latNum = Number(lat);
    if (!Number.isFinite(lonNum) || !Number.isFinite(latNum)) return null;
    return `${lonNum.toFixed(6)}, ${latNum.toFixed(6)}`;
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleMouseEnter = (id) => {
    setHoveredId(id);
    if (onHoverPetak) onHoverPetak(id);
    
    // Update main layer style
    if (polygonLayerRef.current) {
      const hoverStyle = (feature) => {
        const featureId = feature.get('psid');
        const properties = feature.getProperties();
        
        // Try different property names that might contain the petak ID
        const possibleIds = [
          properties.petak_id,
          properties.psid,
          properties.kel_id,
          featureId
        ].filter(Boolean);
        
        // Check for matches using the same logic as the styling function
        const isMatch = possibleIds.some(possibleId => 
          possibleId == id || possibleId.toString() === id || possibleId === id.toString()
        );
        

        
        // Always apply hover style if IDs match
        if (isMatch) {
          return new Style({
            stroke: new Stroke({
              color: '#FF0000',
              width: 3,
            }),
            fill: new Fill({
              color: 'rgba(255, 0, 0, 0.3)',
            }),
          });
        }
        
        // Return default style for non-matching features using the same logic
        const totalRegisteredPetak = registeredCount;
        const totalSelectedPetak = selectedPercils.length;
        const totalPetak = totalRegisteredPetak + totalSelectedPetak;
        const isLimitReached = totalPetak >= formData.jmlPetak;
        return getPercilStyle(selectedPercils, lockedIDs, isLimitReached)(feature);
      };
      
      // Force style update
      polygonLayerRef.current.setStyle(hoverStyle);
      polygonLayerRef.current.changed();
    }
    

  };

  const handleMouseLeave = () => {
    setHoveredId(null);
    if (onHoverPetak) onHoverPetak(null);
    
    // Reset main layer style
    if (polygonLayerRef.current) {
      const totalRegisteredPetak = registeredCount;
      const totalSelectedPetak = selectedPercils.length;
      const totalPetak = totalRegisteredPetak + totalSelectedPetak;
      const isLimitReached = totalPetak >= formData.jmlPetak;
      polygonLayerRef.current.setStyle(getPercilStyle(selectedPercils, lockedIDs, isLimitReached));
      polygonLayerRef.current.changed();
    }
    

  };

  const viewRegisteredPetak = (id) => {
    if (onViewSavedPetak) {
      onViewSavedPetak(id);
      return;
    }
    handleZoomToPetak(id);
  };

  const handleZoomToPetak = async (petakId) => {
    if (!mapInstance || !mapInstance.current) {
      // console.warn('Map instance not available for zooming');
      return;
    }

    try {
      let exactPetakData;

      if (source === 'MapViewClaim') {
        // For MapViewClaim, use getPetakKlaimID
        const petakData = listPetak?.find(p => p.idpetak === petakId);
       
        if (!petakData) {
          // console.warn('Petak data not found for ID:', petakId);
          return;
        }
       
        exactPetakData = await dispatch(getPetakById(petakData.idpuser));
       
      } else if (source === 'MapClaim') {
        // For MapClaim, use getPetakById
        const petakData = listPetak?.find(
          p => normalizeId(p.idpetak || p.id || p.petak_id) === normalizeId(petakId)
        );
       
        if (!petakData) {
          // console.warn('Petak data not found for ID:', petakId);
          return;
        }
        const dbId = petakData.idpuser || petakData.id;
        if (!dbId) return;
        exactPetakData = await dispatch(getPetakById(dbId));
      } else {
        // For other sources, find the petak data to get the database ID
        const petakData = listPetak?.find(p => p.idpetak === petakId || p.id === petakId);
        
        if (!petakData) {
          // console.warn('Petak data not found for ID:', petakId);
          return;
        }

        // Use the database ID to get exact petak data with geometry
        const dbId = petakData.id;
        if (!dbId) {
          // console.warn('Database ID not found for petak:', petakId);
          return;
        }

        // Call the API to get exact petak data
        // console.log('Getting exact petak data for ID:', dbId);
        // console.log('source:', source);
        exactPetakData = await dispatch(getPetakById(dbId));
        // console.log('end')
      }
      
      if (exactPetakData && exactPetakData.data) {
        const view = mapInstance.current.getView();
        
        // Handle different data structures based on source
        if (source === 'MapViewClaim') {
          // For MapViewClaim, exactPetakData.data is an array
          // console.log('MapViewClaim zoom - processing data:', exactPetakData.data);
          const petakData = Array.isArray(exactPetakData.data) ? exactPetakData.data[0] : exactPetakData.data;
          // console.log('MapViewClaim zoom - extracted petakData:', petakData);
          
          if (petakData && petakData.center && petakData.center.coordinates) {
            // Use the exact center point
            // console.log('MapViewClaim zoom - using center coordinates:', petakData.center.coordinates);
            view.animate({
              center: fromLonLat([petakData.center.coordinates[0], petakData.center.coordinates[1]]),
              zoom: 20,
              duration: 1000
            });
            // console.log('MapViewClaim zoom - animated to center');
          } else if (petakData && petakData.bounds) {
            // Use bounds if center is not available
            // console.log('MapViewClaim zoom - using bounds:', petakData.bounds);
            const extent = [
              petakData.bounds.minX, petakData.bounds.minY,
              petakData.bounds.maxX, petakData.bounds.maxY
            ];
            const bufferedExtent = buffer(extent, 25); // Add 25 meter buffer
            view.fit(bufferedExtent, {
              duration: 1000,
              padding: [25, 25, 25, 25]
            });
            // console.log('MapViewClaim zoom - fitted to bounds');
          } else {
            // Fallback: zoom to a reasonable level
            // console.log('MapViewClaim zoom - using fallback zoom (no center or bounds)');
            view.animate({
              zoom: 18,
              duration: 1000
            });
          }
        } else {
          // For other sources, exactPetakData.data is a single object
          const { center, bounds } = exactPetakData.data;
          
          if (center && center.coordinates) {
            // Use the exact center point
            view.animate({
              center: fromLonLat([center.coordinates[0], center.coordinates[1]]),
              zoom: 20,
              duration: 1000
            });
          } else if (bounds) {
            // Use bounds if center is not available
            const extent = [
              bounds.minX, bounds.minY,
              bounds.maxX, bounds.maxY
            ];
            const bufferedExtent = buffer(extent, 25); // Add 25 meter buffer
            view.fit(bufferedExtent, {
              duration: 1000,
              padding: [25, 25, 25, 25]
            });
          } else {
            // Fallback: zoom to a reasonable level
            view.animate({
              zoom: 18,
              duration: 1000
            });
          }
        }
      } else {
        // console.warn('Could not get exact petak data, using fallback');
        // Fallback: zoom to a reasonable level
        const view = mapInstance.current.getView();
        view.animate({
          zoom: 18,
          duration: 1000
        });
      }
    } catch (error) {
      // console.error('Error zooming to petak:', error);
      // console.error('Error details:', error.message, error.stack);
      // Fallback: zoom to a reasonable level
      const view = mapInstance.current.getView();
      view.animate({
        zoom: 18,
        duration: 1000
      });
    }
  };

  const handleDeletePetak = async (petakId, isFromDatabase = false) => {
    try {
      // console.log('DataPanel.handleDeletePetak called with:', { petakId, isFromDatabase });
      const result = await Swal.fire({
        title: 'Konfirmasi Hapus',
        text: `Apakah Anda yakin ingin menghapus petak?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Ya, Hapus!',
        cancelButtonText: 'Batal'
      });

      if (result.isConfirmed) {
        if (isFromDatabase) {
          // Delete from database
          // console.log('DataPanel: Deleting from database with ID:', petakId);
          if (onDeletePetak) {
            await onDeletePetak(petakId);
            // console.log('DataPanel: Database delete completed');
          } else {
            // console.warn('onDeletePetak function not provided');
          }
        } else {
          // Remove from selected list
          const updated = selectedPercils.filter((item) => item.id !== petakId);
          setSelectedPercils(updated);
          
          // Update map style
          if (polygonLayerRef.current) {
            const totalRegisteredPetak = registeredCount;
            const totalSelectedPetak = updated.length;
            const totalPetak = totalRegisteredPetak + totalSelectedPetak;
            const isLimitReached = totalPetak >= formData.jmlPetak;
            polygonLayerRef.current.setStyle(getPercilStyle(updated, lockedIDs, isLimitReached));
            polygonLayerRef.current.changed();
          }
        }

        Swal.fire(
          'Terhapus!',
          'Petak berhasil dihapus.',
          'success'
        );
      }
    } catch (error) {
      // console.error('Error deleting petak:', error);
      Swal.fire(
        'Error!',
        'Gagal menghapus petak.',
        'error'
      );
    }
  };

  return (
    <Box p={isMobile ? 1 : 2} sx={{ display: 'flex', flexDirection: 'column' }}>
      {/* User Info Section */}
      {isMapRegister ? (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
            {formData.nama || 'Peserta'}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
            NIK {formData.nik}
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mt: 1 }}>
            <Chip
              size="small"
              color={(registeredCount + selectedPercils.length) >= formData.jmlPetak ? 'error' : 'primary'}
              label={`${registeredCount + selectedPercils.length}/${formData.jmlPetak} petak`}
            />
            <Chip
              size="small"
              variant="outlined"
              label={`${(
                registeredTotalArea +
                selectedPercils.reduce((sum, p) => sum + parseFloat(p.area || 0), 0)
              ).toFixed(2)} / ${parseFloat(formData.luasLahan || 0).toFixed(2)} ha`}
            />
          </Box>
        </Box>
      ) : (
      <Box sx={{ mb: 2 }}>
        <Typography variant={isMobile ? "body2" : "body1"} sx={{ mb: 0.5 }}>
          <strong>NIK:</strong> {formData.nik}
        </Typography>
        <Typography variant={isMobile ? "body2" : "body1"} sx={{ mb: 0.5 }}>
          <strong>Nama:</strong> {formData.nama}
        </Typography>
        <Typography variant={isMobile ? "body2" : "body1"} sx={{ mb: 0.5 }}>
          <strong>Luas Lahan:</strong> {parseFloat(formData.luasLahan || 0).toFixed(2)} ha
        </Typography>
        <Typography variant={isMobile ? "body2" : "body1"} sx={{ mb: 0.5 }}>
          <strong>Jumlah Petak:</strong> {formData.jmlPetak}
        </Typography>
        {source === 'MapClaim' && (
          <Typography variant={isMobile ? "body2" : "body1"} sx={{ mb: 0.5 }}>
            <strong>Nomor Polis:</strong> {formData.noPolis}
          </Typography>
        )}
      </Box>
      )}
      
      {/* Combined Total Area */}
      {(source === 'MapClaim') && (
        <Box mt={1} p={isMobile ? 1 : 1.5} borderRadius={1} sx={{ 
          backgroundColor: '#f3f4f6',
          border: '1px solid #d1d5db',
          mb: 2
        }}>
          <Typography variant={isMobile ? "body2" : "body1"} sx={{ 
            color: '#374151',
            fontWeight: 'bold',
            fontSize: isMobile ? '0.875rem' : '1rem'
          }}>
            Total Luas Keseluruhan: {(
              (
                registeredTotalArea +
                selectedPercils.reduce((sum, p) => sum + parseFloat(p.area || 0), 0)
              )
            ).toFixed(2)} ha
          </Typography>
        </Box>
      )}

      {/* Total Area for MapViewClaim */}
      {source === 'MapViewClaim' && (
        <Box mt={1} p={isMobile ? 1 : 1.5} borderRadius={1} sx={{ 
          backgroundColor: '#e3f2fd',
          border: '1px solid #90caf9',
          mb: 2
        }}>
          <Typography variant={isMobile ? "body2" : "body1"} sx={{ 
            color: '#1565c0',
            fontWeight: 'bold',
            fontSize: isMobile ? '0.875rem' : '1rem'
          }}>
            Total Luas Terdaftar: {(
              (Array.isArray(listPetak) ? listPetak : []).reduce((sum, p) => sum + parseFloat(p.luas || 0), 0)
            ).toFixed(2)} ha
          </Typography>
        </Box>
      )}

      {/* Status indicator for MapClaim */}
      {source === 'MapClaim' && (
        <Box mt={1} p={isMobile ? 1 : 1.5} borderRadius={1} sx={{ 
          backgroundColor: (registeredCount + selectedPercils.length) >= formData.jmlPetak ? '#ffebee' : '#e8f5e8',
          border: `1px solid ${(registeredCount + selectedPercils.length) >= formData.jmlPetak ? '#f44336' : '#4caf50'}`,
          mb: 2
        }}>
          <Typography variant={isMobile ? "body2" : "body1"} sx={{ 
            color: (registeredCount + selectedPercils.length) >= formData.jmlPetak ? '#d32f2f' : '#2e7d32',
            fontWeight: 'bold',
            fontSize: isMobile ? '0.875rem' : '1rem'
          }}>
            Status: {isLoading ? 'Memuat data...' : (
              (registeredCount + selectedPercils.length) >= formData.jmlPetak 
                ? `Tidak dapat memilih petak baru (${registeredCount + selectedPercils.length}/${formData.jmlPetak})`
                : `Dapat memilih petak (${registeredCount + selectedPercils.length}/${formData.jmlPetak})`
            )}
          </Typography>
          {isLoading && (
            <Typography variant="caption" sx={{ color: '#666', display: 'block', mt: 0.5 }}>
              Memvalidasi data tersimpan...
            </Typography>
          )}
          {!isLoading && (
            <Typography variant="caption" sx={{ color: '#666', display: 'block', mt: 0.5 }}>
              Data terdaftar: {registeredCount} petak tersimpan
            </Typography>
          )}
        </Box>
      )}

      {source === 'MapRegister' && (
        <Box sx={{ mb: 2, order: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Box sx={{
              width: 22, height: 22, borderRadius: '50%', bgcolor: 'primary.main', color: '#fff',
              fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>1</Box>
            <Typography variant={isMobile ? 'body2' : 'body1'} sx={{ fontWeight: 700 }}>
              Buat petak
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
            <Button
              size="small"
              fullWidth
              variant={!isDrawMode ? 'contained' : 'outlined'}
              onClick={() => onSetDrawMode && onSetDrawMode(false)}
            >
              Tandai titik
            </Button>
            <Button
              size="small"
              fullWidth
              variant={isDrawMode ? 'contained' : 'outlined'}
              onClick={() => onSetDrawMode && onSetDrawMode(!isDrawMode)}
              disabled={remainingSlots <= 0}
              startIcon={<PentagonIcon />}
            >
              Gambar polygon
            </Button>
          </Box>
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1 }}>
            {isDrawMode
              ? 'Klik peta untuk menambah sudut. Minimal 3 titik, lalu tekan Selesai di toolbar peta.'
              : remainingSlots > 0
                ? `Klik peta untuk menandai ${remainingSlots} titik. Satu titik = satu petak, lalu simpan.`
                : 'Kuota petak sudah terisi. Hapus petak terpilih jika ingin menandai ulang.'}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1 }}>
            {markedPoints.length}/{remainingSlots} titik
          </Typography>
          <Box sx={{ width: '100%', mb: 1 }}>
            <Box
              sx={{
                width: `${remainingSlots > 0 ? Math.min(100, (markedPoints.length / remainingSlots) * 100) : 0}%`,
                height: 4,
                backgroundColor: markedPoints.length === remainingSlots && remainingSlots > 0 ? '#4caf50' : '#1976d2',
                borderRadius: 2,
                transition: 'width 0.3s ease',
              }}
            />
          </Box>
          {remainingSlots === 0 ? (
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Kuota petak sudah terisi. Hapus petak terpilih jika ingin menandai titik baru.
            </Typography>
          ) : isDrawMode ? null : markedPoints.length === 0 ? (
            <Typography variant={isMobile ? 'body2' : 'body1'}>
              Klik peta untuk menandai {remainingSlots} titik petak.
            </Typography>
          ) : (
            <Box sx={{ mb: 1, maxHeight: 220, overflowY: 'auto' }}>
              {markedPoints.map((point) => (
                <Card key={point.id} sx={{ mb: 1 }}>
                  <CardContent sx={{ p: 1.25, '&:last-child': { pb: 1.25 } }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="caption" sx={{ fontWeight: 'bold', display: 'block' }}>
                          Titik {point.id} · {point.persilId}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary', wordBreak: 'break-all' }}>
                          {Number(point.lon).toFixed(6)}, {Number(point.lat).toFixed(6)}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', flexShrink: 0 }}>
                        {onFocusPoint && (
                          <IconButton size="small" color="primary" onClick={() => onFocusPoint(point)} aria-label={`Zoom ke titik ${point.id}`}>
                            <ZoomInIcon fontSize="small" />
                          </IconButton>
                        )}
                        {onRemovePoint && (
                          <IconButton size="small" color="error" onClick={() => onRemovePoint(point.id)} aria-label={`Hapus titik ${point.id}`}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        )}
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Box>
          )}
          {remainingSlots > 0 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 1 }}>
              <Button
                variant="outlined"
                fullWidth
                onClick={onClearPoints}
                disabled={markedPoints.length === 0}
                size="small"
              >
                Hapus Semua Titik
              </Button>
              {markedPoints.length > 0 && markedPoints.length !== remainingSlots && (
                <Typography variant="caption" sx={{ color: '#856404' }}>
                  Tandai {remainingSlots - markedPoints.length} titik lagi agar sesuai jumlah petak.
                </Typography>
              )}
            </Box>
          )}
        </Box>
      )}

      {/* Lahan Terdaftar Section */}
      <Box sx={{ order: isMapRegister ? 3 : 2 }}>
      <MaybeAccordion
        enable={isMapRegister}
        title={`Lahan sudah tersimpan (${isLoading && !registeredCount ? '...' : registeredCount})${registeredCount ? ` · ${registeredTotalArea.toFixed(2)} ha` : ''}`}
      >
      {!isMapRegister && (
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2, mb: 0.75 }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant={isMobile ? "body2" : "body1"} sx={{ fontWeight: 700, lineHeight: 1.3 }}>
            Lahan Terdaftar
          </Typography>
          {uniqueListPetak.length > 0 && (
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {uniqueListPetak.length} petak · {lahanTerdaftarArea.toFixed(2)} ha
            </Typography>
          )}
        </Box>
        {onRefreshData && (
          <IconButton
            onClick={onRefreshData}
            size="small"
            color="primary"
            disabled={isLoading}
            title="Refresh data dari database"
            sx={{ flexShrink: 0 }}
          >
            {isLoading ? <CircularProgress size={16} /> : <RefreshIcon fontSize="small" />}
          </IconButton>
        )}
      </Box>
      )}
      {uniqueListPetak.length > 0 ? (
        <>
          {isMapRegister && onRefreshData && (
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
              <IconButton
                onClick={onRefreshData}
                size="small"
                color="primary"
                disabled={isLoading}
                title="Refresh data dari database"
                sx={{ p: 0.5 }}
              >
                <RefreshIcon fontSize="small" />
              </IconButton>
            </Box>
          )}

          <Box sx={{ mb: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
            {uniqueListPetak.map((p) => {
              const itemId = p.id || p.idpuser || p.idpetak;
              const itemIdForDisplay = p.idpetak || 'N/A';
              const klaimRecord = klaimByPetakId[normalizeId(itemIdForDisplay)];
              const isKlaimTerdaftar = Boolean(klaimRecord);
              const coords = formatLonLat(p);
              const isHovered = hoveredId === itemIdForDisplay;
              const luasVal = parseFloat(p.luas || 0);
              const canDelete =
                (source === 'MapRegister' && Boolean(p.id)) ||
                (isMapClaim && isKlaimTerdaftar);

              return (
                <Box
                  key={itemId}
                  onMouseEnter={() => handleMouseEnter(itemIdForDisplay)}
                  onMouseLeave={handleMouseLeave}
                  onClick={() => viewRegisteredPetak(itemIdForDisplay)}
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(0, 1fr) auto',
                    columnGap: 1,
                    alignItems: 'center',
                    p: 1.25,
                    border: isHovered ? '2px solid #1565C0' : '1px solid #e5e7eb',
                    borderRadius: 1.5,
                    backgroundColor: isHovered ? 'rgba(21, 101, 192, 0.08)' : '#fff',
                    boxShadow: isHovered ? '0 0 0 2px rgba(21, 101, 192, 0.18)' : 'none',
                    cursor: 'pointer',
                  }}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5, flexWrap: 'wrap' }}>
                      <TruncatedText
                        title={itemIdForDisplay}
                        sx={{
                          fontWeight: 700,
                          fontSize: 12.5,
                          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                          maxWidth: '100%',
                        }}
                      >
                        {itemIdForDisplay}
                      </TruncatedText>
                      {isMapClaim && isKlaimTerdaftar && (
                        <Chip
                          label="Klaim"
                          size="small"
                          color="success"
                          variant="outlined"
                          sx={{ height: 20, fontSize: 10, flexShrink: 0 }}
                        />
                      )}
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                      <Chip
                        size="small"
                        label={luasVal > 0 ? `${luasVal.toFixed(2)} ha` : 'Titik'}
                        sx={{ height: 20, fontSize: 10, flexShrink: 0 }}
                      />
                      {coords && (
                        <TruncatedText
                          title={coords}
                          sx={{
                            color: 'text.secondary',
                            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                            fontSize: 11,
                            flex: 1,
                            minWidth: 0,
                          }}
                        >
                          {coords}
                        </TruncatedText>
                      )}
                    </Box>
                  </Box>

                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: '28px 28px',
                      columnGap: 0.25,
                      justifyItems: 'center',
                      alignItems: 'center',
                      flexShrink: 0,
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <IconButton
                      aria-label={`Zoom ke lahan ${itemIdForDisplay}`}
                      onClick={() => viewRegisteredPetak(itemIdForDisplay)}
                      size="small"
                      color="primary"
                      sx={{ p: 0.5 }}
                    >
                      <ZoomInIcon fontSize="small" />
                    </IconButton>
                    {canDelete ? (
                      <IconButton
                        aria-label={`Hapus lahan ${itemIdForDisplay}`}
                        onClick={() => {
                          if (source === 'MapRegister') {
                            handleDeletePetak(p.id, true);
                          } else if (isMapClaim && klaimRecord) {
                            handleDeletePetak(klaimRecord.id, true);
                          }
                        }}
                        size="small"
                        color="error"
                        sx={{ p: 0.5 }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    ) : (
                      <Box sx={{ width: 28, height: 28 }} />
                    )}
                  </Box>
                </Box>
              );
            })}
          </Box>
        </>
      ) : (
        <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
          <Typography variant={isMobile ? "body2" : "body1"}>
            {isLoading ? 'Memuat lahan terdaftar...' : 'Belum Ada Lahan Terdaftar'}
          </Typography>
          {isMapRegister && onRefreshData && (
            <IconButton
              onClick={onRefreshData}
              size="small"
              color="primary"
              disabled={isLoading}
              title="Refresh data dari database"
            >
              {isLoading ? <CircularProgress size={16} /> : <RefreshIcon fontSize="small" />}
            </IconButton>
          )}
        </Box>
          {source === 'MapViewClaim' && !formData.noPolis && (
            <Typography variant="caption" sx={{ color: 'orange', display: 'block', mt: 1 }}>
              ⚠️ Nomor Polis tidak tersedia - tidak dapat memuat data klaim
            </Typography>
          )}
        </Box>
      )}
      </MaybeAccordion>
      </Box>

      {!isMapRegister && <Divider style={{ margin: '1rem 0' }} />}

      {/* Selected Petak List */}
      {(source === 'MapRegister' || source === 'MapClaim') && (() => {
        const availablePetak = Math.max(0, formData.jmlPetak - registeredCount);
        const pendingCount = selectedPercils.length + (isMapRegister ? markedPoints.length : 0);
        const canSaveQuota = pendingCount === availablePetak && availablePetak > 0;
        
        if (availablePetak === 0 && selectedPercils.length === 0 && !(isMapRegister && markedPoints.length > 0)) {
          return null;
        }
        
        return (
          <Box sx={{ order: isMapRegister ? 2 : 3 }}>
            {isMapRegister && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Box sx={{
                  width: 22, height: 22, borderRadius: '50%', bgcolor: selectedPercils.length ? 'primary.main' : 'grey.400', color: '#fff',
                  fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>2</Box>
                <Typography variant={isMobile ? 'body2' : 'body1'} sx={{ fontWeight: 700 }}>
                  Hasil petak
                </Typography>
              </Box>
            )}
            {!isMapRegister && (
            <Typography variant={isMobile ? "body2" : "body1"} style={{ marginBottom: '0.5rem' }}>
              <strong>Lahan Terpilih</strong>
            </Typography>
            )}
            {isMapRegister && selectedPercils.length > 0 && (
              <Box sx={{ display: 'flex', gap: 1, mb: 1.5 }}>
                <Button
                  size="small"
                  fullWidth
                  variant={!isVertexDeleteMode ? 'contained' : 'outlined'}
                  startIcon={<OpenWithIcon />}
                  onClick={() => onSetVertexDeleteMode && onSetVertexDeleteMode(false)}
                >
                  Geser
                </Button>
                <Button
                  size="small"
                  fullWidth
                  color="error"
                  variant={isVertexDeleteMode ? 'contained' : 'outlined'}
                  startIcon={<DeleteSweepIcon />}
                  onClick={() => onSetVertexDeleteMode && onSetVertexDeleteMode(!isVertexDeleteMode)}
                >
                  Hapus sudut
                </Button>
              </Box>
            )}
            {isMapRegister && isVertexDeleteMode && (
              <Alert severity="warning" sx={{ mb: 1.5, py: 0 }}>
                Klik sudut merah di peta untuk menghapus. Jika sudut terlalu rapat, perbesar peta. Tekan Geser untuk memindahkan sudut.
              </Alert>
            )}
            <Typography variant="caption" sx={{ color: 'text.secondary', mb: 1, display: 'block' }}>
              {isMapRegister
                ? (selectedPercils.length === 0
                    ? 'Titik yang ditandai akan disimpan ke petak user. Lengkapi kuota, lalu simpan.'
                    : isVertexDeleteMode
                      ? 'Mode hapus sudut aktif. Sudut ditampilkan saat petak di-hover atau peta diperbesar.'
                      : 'Geser sudut untuk mengubah bentuk. Tarik garis tepi untuk menambah sudut. Sudut hanya tampil saat petak di-hover agar peta tetap rapi.')
                : 'Tarik titik putih untuk geser. Tarik garis tepi untuk menambah sudut. Klik dua kali titik untuk menghapus sudut.'}
            </Typography>
            
            {(registeredCount + selectedPercils.length) >= formData.jmlPetak && (
              <Box mt={1} p={isMobile ? 1 : 1.5} borderRadius={1} sx={{ 
                backgroundColor: '#fff3cd',
                border: '1px solid #ffeaa7',
                mb: 1
              }}>
                <Typography variant="caption" sx={{ color: '#856404', fontWeight: 'bold' }}>
                  ⚠️ Limit tercapai! Tidak dapat memilih petak baru lagi. Anda masih dapat menghapus petak yang sudah dipilih.
                </Typography>
              </Box>
            )}
            
            <Typography variant="caption" sx={{ color: 'text.secondary', mb: 0.5, display: 'block' }}>
              {isMapRegister
                ? `${pendingCount}/${availablePetak} petak baru (${selectedPercils.length} polygon, ${markedPoints.length} titik)`
                : `${selectedPercils.length} petak terpilih dari maksimal ${availablePetak} · ${selectedPercils.reduce((sum, p) => sum + parseFloat(p.area || 0), 0).toFixed(2)} ha`}
            </Typography>
            
            <Box sx={{ width: '100%', mb: 1 }}>
              <Box sx={{ 
                width: `${Math.min(100, ((registeredCount + pendingCount) / formData.jmlPetak) * 100)}%`,
                height: 4,
                backgroundColor: (registeredCount + pendingCount) >= formData.jmlPetak ? '#f44336' : '#4caf50',
                borderRadius: 2,
                transition: 'width 0.3s ease'
              }} />
            </Box>
            
            {selectedPercils.length === 0 ? (
              <Typography variant={isMobile ? "body2" : "body1"}>
                {isMapRegister && markedPoints.length > 0
                  ? `${markedPoints.length} titik siap disimpan ke petak user.`
                  : 'Belum Ada Lahan Terpilih'}
              </Typography>
            ) : (
              <>
                <Box sx={{ mb: 1.5, display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {(isMapRegister ? selectedPercils : selectedPercils.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)).map((p) => {
                    const petakId = p.petakid || p.petak_id || p.id || 'N/A';
                    const coords = formatLonLat(p);
                    const hoverKey = p.id || p.petak_id;
                    const isHovered = String(hoveredId || hoveredPetakId || '') === String(hoverKey);
                    return (
                      <Box
                        key={p.id}
                        onMouseEnter={() => handleMouseEnter(hoverKey)}
                        onMouseLeave={handleMouseLeave}
                        sx={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 1,
                          p: 1.25,
                          border: isHovered ? '2px solid #1565C0' : '1px solid #e5e7eb',
                          borderRadius: 1.5,
                          backgroundColor: isHovered ? 'rgba(21, 101, 192, 0.08)' : '#fff',
                          boxShadow: isHovered ? '0 0 0 2px rgba(21, 101, 192, 0.18)' : 'none',
                          cursor: 'pointer',
                        }}
                      >
                        <Box sx={{ minWidth: 0, flex: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5 }}>
                            <TruncatedText
                              title={petakId}
                              sx={{
                                fontWeight: 700,
                                fontSize: 12.5,
                                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                                flex: 1,
                              }}
                            >
                              {petakId}
                            </TruncatedText>
                            <Chip
                              size="small"
                              label={`${parseFloat(p.area || 0).toFixed(2)} ha`}
                              sx={{ height: 22, fontSize: 11, flexShrink: 0 }}
                            />
                          </Box>
                          {coords && (
                            <TruncatedText
                              title={coords}
                              sx={{
                                color: 'text.secondary',
                                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                                fontSize: 11,
                              }}
                            >
                              {coords}
                            </TruncatedText>
                          )}
                        </Box>
                        <IconButton
                          aria-label={`Hapus Lahan ${petakId}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeletePetak(p.id || p.petak_id, false);
                          }}
                          size="small"
                          color="error"
                          sx={{ mt: -0.5 }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    );
                  })}
                </Box>

                {!isMapRegister && (
                <TablePagination
                  component="div"
                  count={selectedPercils.length}
                  page={page}
                  onPageChange={handleChangePage}
                  rowsPerPage={rowsPerPage}
                  rowsPerPageOptions={[isMobile ? 3 : 5]}
                  size={isMobile ? "small" : "medium"}
                />
                )}
              </>
            )}

            {isMapRegister ? (
              <>
                {!canSaveQuota && availablePetak > 0 && (
                  <Typography variant="caption" sx={{ color: '#856404', display: 'block', mt: 1 }}>
                    Lengkapi hingga {availablePetak} petak (polygon dan/atau titik) sebelum menyimpan.
                  </Typography>
                )}
                <Button
                  variant="contained"
                  color="primary"
                  fullWidth
                  startIcon={<SaveIcon />}
                  onClick={onSave}
                  sx={{ mt: 2 }}
                  disabled={!canSaveQuota || isLoading || (selectedPercils.length > 0 && !isValid)}
                  size={isMobile ? 'medium' : 'large'}
                >
                  {isLoading ? 'Menyiapkan data petak...' : `Simpan ${availablePetak} petak`}
                </Button>
              </>
            ) : selectedPercils.length > 0 && (
              <Button
                variant="contained"
                color="primary"
                fullWidth
                startIcon={<SaveIcon />}
                onClick={onSave}
                sx={{ mt: 2 }}
                disabled={!isValid}
                size={isMobile ? 'medium' : 'large'}
              >
                {isLoading ? 'Menyiapkan data petak...' : 'Simpan'}
              </Button>
            )}
          </Box>
        );
      })()}
    </Box>
  );
};

export default DataPanel;