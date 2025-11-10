import React, { useState } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
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
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import RefreshIcon from '@mui/icons-material/Refresh';
import { getPercilStyle } from '../../utils/percilStyles';
import { Style, Stroke, Fill } from 'ol/style';
import { fromLonLat } from 'ol/proj';
import { buffer } from 'ol/extent';
import { getPetakById, getPetakByIdPetak, getPetakKlaimID } from '../../actions/petakActions';
import { useDispatch } from 'react-redux';
import Swal from 'sweetalert2';

const DataPanel = ({
  formData,
  selectedPercils,
  setSelectedPercils,
  totalArea,
  isValid,
  onSave,
  polygonLayerRef,
  listPetak,
  source, // 'MapView' or 'MapRegister'
  isLoading,
  onDeletePetak, // Function to delete petak from database
  onRefreshData, // Function to refresh data from database
  isMobile,
  isTablet,
  mapInstance, // Map instance for zoom functionality
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

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleMouseEnter = (id) => {
    setHoveredId(id);
    
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
        const lockedIDs = (listPetak || []).map(p => p.idpetak);
        const totalRegisteredPetak = (listPetak || []).length;
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
    
    // Reset main layer style
    if (polygonLayerRef.current) {
      const lockedIDs = (listPetak || []).map(p => p.idpetak);
      const totalRegisteredPetak = (listPetak || []).length;
      const totalSelectedPetak = selectedPercils.length;
      const totalPetak = totalRegisteredPetak + totalSelectedPetak;
      const isLimitReached = totalPetak >= formData.jmlPetak;
      polygonLayerRef.current.setStyle(getPercilStyle(selectedPercils, lockedIDs, isLimitReached));
      polygonLayerRef.current.changed();
    }
    

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
        const petakData = listPetak?.find(p => p.idpetak === petakId);
       
        if (!petakData) {
          // console.warn('Petak data not found for ID:', petakId);
          return;
        }
        exactPetakData = await dispatch(getPetakById(petakData.idpuser));
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
            const lockedIDs = (listPetak || []).map(p => p.idpetak);
            const totalRegisteredPetak = (listPetak || []).length;
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
    <Box p={isMobile ? 1 : 2}>
      {/* User Info Section */}
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
      
      {/* Combined Total Area */}
      {(source === 'MapRegister' || source === 'MapClaim') && (
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
              ((Array.isArray(listPetak) ? listPetak : []).reduce((sum, p) => sum + parseFloat(p.luas || 0), 0)) + 
              (selectedPercils.reduce((sum, p) => sum + parseFloat(p.area || 0), 0))
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

      {/* Status indicator for MapRegister */}
      {(source === 'MapRegister' || source === 'MapClaim') && (
        <Box mt={1} p={isMobile ? 1 : 1.5} borderRadius={1} sx={{ 
          backgroundColor: ((listPetak ? listPetak.length : 0) + selectedPercils.length) >= formData.jmlPetak ? '#ffebee' : '#e8f5e8',
          border: `1px solid ${((listPetak ? listPetak.length : 0) + selectedPercils.length) >= formData.jmlPetak ? '#f44336' : '#4caf50'}`,
          mb: 2
        }}>
          <Typography variant={isMobile ? "body2" : "body1"} sx={{ 
            color: ((listPetak ? listPetak.length : 0) + selectedPercils.length) >= formData.jmlPetak ? '#d32f2f' : '#2e7d32',
            fontWeight: 'bold',
            fontSize: isMobile ? '0.875rem' : '1rem'
          }}>
            Status: {isLoading ? 'Memuat data...' : (
              ((listPetak ? listPetak.length : 0) + selectedPercils.length) >= formData.jmlPetak 
                ? `Tidak dapat memilih petak baru (${(listPetak ? listPetak.length : 0) + selectedPercils.length}/${formData.jmlPetak})`
                : `Dapat memilih petak (${(listPetak ? listPetak.length : 0) + selectedPercils.length}/${formData.jmlPetak})`
            )}
          </Typography>
          {isLoading && (
            <Typography variant="caption" sx={{ color: '#666', display: 'block', mt: 0.5 }}>
              Memvalidasi data tersimpan...
            </Typography>
          )}
          {!isLoading && (
            <Typography variant="caption" sx={{ color: '#666', display: 'block', mt: 0.5 }}>
              Data terdaftar: {listPetak ? listPetak.length : 0} petak tersimpan
            </Typography>
          )}
        </Box>
      )}

      {/* Lahan Terdaftar Section */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2, mb: 0.5 }}>
        <Typography variant={isMobile ? "body2" : "body1"}>
          <strong>Lahan Terdaftar</strong>
        </Typography>
        {/* Debug info */}
   {/*      <Typography variant="caption" sx={{ color: 'red', fontSize: '10px' }}>
          Debug: {listPetak ? `Array(${listPetak.length})` : 'null/undefined'}
        </Typography> */}
        {onRefreshData && (
          <IconButton
            onClick={onRefreshData}
            size="small"
            color="primary"
            disabled={isLoading}
            title="Refresh data dari database"
          >
            <RefreshIcon fontSize="small" />
          </IconButton>
        )}
      </Box>
      
      {listPetak && listPetak.length > 0 ? (
        <>
          <Typography variant="caption" sx={{ color: 'text.secondary', mb: 1, display: 'block' }}>
            Total Luas: {(Array.isArray(listPetak) ? listPetak : []).reduce((sum, p) => sum + parseFloat(p.luas || 0), 0).toFixed(2)} ha
          </Typography>
          
          {isMobile ? (
            // Mobile Card Layout
            <Box sx={{ mb: 2 }}>
              {listPetak.map((p) => {
                const itemId = p.idpuser;
                const itemIdForDisplay = p.idpetak || 'N/A';
                
                return (
                  <Card 
                    key={itemId}
                    sx={{ 
                      mb: 1, 
                      cursor: 'pointer',
                      backgroundColor: hoveredId === itemIdForDisplay ? 'rgba(0, 0, 0, 0.04)' : 'inherit',
                      '&:hover': {
                        backgroundColor: 'rgba(0, 0, 0, 0.04)'
                      }
                    }}
                    onMouseEnter={() => handleMouseEnter(itemIdForDisplay)}
                    onMouseLeave={handleMouseLeave}
                  >
                    <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                            ID: {itemIdForDisplay}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Luas: {parseFloat(p.luas || 0).toFixed(2)} ha
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <IconButton
                            aria-label={`Zoom ke Lahan ${itemIdForDisplay}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleZoomToPetak(itemIdForDisplay);
                            }}
                            size="small"
                            color="primary"
                          >
                            <ZoomInIcon fontSize="small" />
                          </IconButton>
                          {(source === 'MapRegister' || source === 'MapClaim') && (
                            <IconButton
                              aria-label={`Hapus Lahan ${itemIdForDisplay}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeletePetak(p.id, true);
                              }}
                              size="small"
                              color="error"
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          )}
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                );
              })}
            </Box>
          ) : (
            // Desktop Table Layout
            <Table size={isTablet ? "small" : "medium"} sx={{ mb: 2 }}>
              <TableHead>
                <TableRow>
                  <TableCell><Typography variant={isMobile ? "body2" : "body1"}><strong>ID</strong></Typography></TableCell>
                  <TableCell><Typography variant={isMobile ? "body2" : "body1"}><strong>Luas</strong></Typography></TableCell>
                  <TableCell align="right"><Typography variant={isMobile ? "body2" : "body1"}><strong>Aksi</strong></Typography></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {listPetak.map((p) => {
                  const itemId = p.idpuser;
                  const itemIdForDisplay = p.idpetak || 'N/A';
                  
                  return (
                    <TableRow 
                      key={itemId}
                      onMouseEnter={() => handleMouseEnter(itemIdForDisplay)}
                      onMouseLeave={handleMouseLeave}
                      sx={{ 
                        cursor: 'pointer',
                        backgroundColor: hoveredId === itemIdForDisplay ? 'rgba(0, 0, 0, 0.04)' : 'inherit'
                      }}
                    >
                      <TableCell>
                        <Typography variant={isMobile ? "caption" : "body2"}>
                          {itemIdForDisplay}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant={isMobile ? "caption" : "body2"}>
                          {parseFloat(p.luas || 0).toFixed(2)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                          <IconButton
                            aria-label={`Zoom ke Lahan ${itemIdForDisplay}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleZoomToPetak(itemIdForDisplay);
                            }}
                            size="small"
                            color="primary"
                          >
                            <ZoomInIcon fontSize="small" />
                          </IconButton>
                          {(source === 'MapRegister' || source === 'MapClaim') && (
                            <IconButton
                              aria-label={`Hapus Lahan ${itemIdForDisplay}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeletePetak(p.id, true);
                              }}
                              size="small"
                              color="error"
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </>
      ) : (
        <Box>
          <Typography variant={isMobile ? "body2" : "body1"}>Belum Ada Lahan Terdaftar</Typography>
          {source === 'MapViewClaim' && !formData.noPolis && (
            <Typography variant="caption" sx={{ color: 'orange', display: 'block', mt: 1 }}>
              ⚠️ Nomor Polis tidak tersedia - tidak dapat memuat data klaim
            </Typography>
          )}
        </Box>
      )}

      <Divider style={{ margin: '1rem 0' }} />

      {/* Selected Petak List */}
      {(source === 'MapRegister' || source === 'MapClaim') && (() => {
        const availablePetak = Math.max(0, formData.jmlPetak - (listPetak ? listPetak.length : 0));
        
        if (availablePetak === 0 && selectedPercils.length === 0) {
          return null;
        }
        
        return (
          <>
            <Typography variant={isMobile ? "body2" : "body1"} style={{ marginBottom: '0.5rem' }}>
              <strong>Lahan Terpilih</strong>
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', mb: 1, display: 'block' }}>
              Total Luas: {selectedPercils.reduce((sum, p) => sum + parseFloat(p.area || 0), 0).toFixed(2)} ha
            </Typography>
            
            {((listPetak ? listPetak.length : 0) + selectedPercils.length) >= formData.jmlPetak && (
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
            
            <Typography variant="caption" sx={{ color: 'text.secondary', mb: 1 }}>
              {selectedPercils.length} petak terpilih dari maksimal {availablePetak} yang dapat dipilih
            </Typography>
            
            <Box sx={{ width: '100%', mb: 1 }}>
              <Box sx={{ 
                width: `${Math.min(100, (((listPetak ? listPetak.length : 0) + selectedPercils.length) / formData.jmlPetak) * 100)}%`,
                height: 4,
                backgroundColor: ((listPetak ? listPetak.length : 0) + selectedPercils.length) >= formData.jmlPetak ? '#f44336' : '#4caf50',
                borderRadius: 2,
                transition: 'width 0.3s ease'
              }} />
            </Box>
            
            {selectedPercils.length === 0 ? (
              <Typography variant={isMobile ? "body2" : "body1"}>Belum Ada Lahan Terpilih</Typography>
            ) : (
              <>
                {isMobile ? (
                  // Mobile Card Layout for Selected Petak
                  <Box sx={{ mb: 2 }}>
                    {selectedPercils.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((p) => (
                      <Card 
                        key={p.id}
                        sx={{ 
                          mb: 1, 
                          cursor: 'pointer',
                          backgroundColor: hoveredId === (p.id || p.petak_id) ? 'rgba(0, 0, 0, 0.04)' : 'inherit',
                          '&:hover': {
                            backgroundColor: 'rgba(0, 0, 0, 0.04)'
                          }
                        }}
                        onMouseEnter={() => handleMouseEnter(p.id || p.petak_id)}
                        onMouseLeave={handleMouseLeave}
                      >
                        <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Box>
                            <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                              ID: {p.petakid || p.petak_id || p.id || 'N/A'}
                            </Typography>
                              <Typography variant="body2" color="text.secondary">
                                Luas: {parseFloat(p.area || 0).toFixed(2)} ha
                              </Typography>
                            </Box>
                            <IconButton
                              aria-label={`Hapus Lahan ${p.petakid || p.petak_id || p.id || 'N/A'}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeletePetak(p.id || p.petak_id, false);
                              }}
                              size="small"
                              color="error"
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        </CardContent>
                      </Card>
                    ))}
                  </Box>
                ) : (
                  // Desktop Table Layout for Selected Petak
                  <Table size={isTablet ? "small" : "medium"} sx={{ mb: 2 }}>
                    <TableHead>
                      <TableRow>
                        <TableCell><Typography variant={isMobile ? "body2" : "body1"}><strong>ID</strong></Typography></TableCell>
                        <TableCell><Typography variant={isMobile ? "body2" : "body1"}><strong>Luas</strong></Typography></TableCell>
                        <TableCell align="right"><Typography variant={isMobile ? "body2" : "body1"}><strong>Aksi</strong></Typography></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {selectedPercils.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((p) => (
                        <TableRow 
                          key={p.id}
                        onMouseEnter={() => handleMouseEnter(p.id || p.petak_id)}
                        onMouseLeave={handleMouseLeave}
                        sx={{ 
                          cursor: 'pointer',
                          backgroundColor: hoveredId === (p.id || p.petak_id) ? 'rgba(0, 0, 0, 0.04)' : 'inherit'
                        }}
                        >
                          <TableCell><Typography variant={isMobile ? "caption" : "body2"}>{p.petakid || p.petak_id || p.id || 'N/A'}</Typography></TableCell>
                          <TableCell><Typography variant={isMobile ? "caption" : "body2"}>{parseFloat(p.area || 0).toFixed(2)}</Typography></TableCell>
                          <TableCell align="right">
                            <IconButton
                              aria-label={`Hapus Lahan ${p.petakid || p.petak_id || p.id || 'N/A'}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeletePetak(p.id || p.petak_id, false);
                              }}
                              size="small"
                              color="error"
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
                
                <Typography variant={isMobile ? "body2" : "body1"} style={{ marginTop: '0.5rem', marginBottom: '1rem' }}>
                  <strong>Luas Total:</strong> {totalArea.toFixed(2)} ha
                </Typography>
                
                <TablePagination
                  component="div"
                  count={selectedPercils.length}
                  page={page}
                  onPageChange={handleChangePage}
                  rowsPerPage={rowsPerPage}
                  rowsPerPageOptions={[isMobile ? 3 : 5]}
                  size={isMobile ? "small" : "medium"}
                />

                {selectedPercils.length > 0 && (
                  <Button
                    variant="contained"
                    color="primary"
                    fullWidth
                    startIcon={<SaveIcon />}
                    onClick={onSave}
                    sx={{ mt: 2 }}
                    disabled={!isValid}
                    size={isMobile ? "medium" : "large"}
                  >
                    Simpan
                  </Button>
                )}
              </>
            )}
          </>
        );
      })()}
    </Box>
  );
};

export default DataPanel;