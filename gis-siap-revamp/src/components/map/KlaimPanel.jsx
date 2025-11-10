import React, { useState, useEffect, useCallback, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
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
  Paper,
} from '@mui/material';
import QueryStatsIcon from '@mui/icons-material/QueryStats';
import RefreshIcon from '@mui/icons-material/Refresh';
import { getPercilStyle } from '../../utils/percilStyles';
import { Style, Stroke, Fill } from 'ol/style';
import { getKlaimUser } from "../../actions/klaimActions";
import { getAnggotaKlaim, getAnggota } from "../../actions/anggotaActions";

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
}) => {
  const dispatch = useDispatch();
  const { anggotalist } = useSelector((state) => state.anggota);

  const [page, setPage] = useState(0);
  const [rowsPerPage] = useState(5);
  const [hoveredId, setHoveredId] = useState(null);
  const [debugInfo, setDebugInfo] = useState({});

  // Fetch default list when component mounts
  useEffect(() => {
    if (formData.idKelompok && formData.noPolis) {
      dispatch(getAnggota(formData.idKelompok));
      console.log("KlaimPanel - anggotalist:", anggotalist);
    }
  }, [dispatch, formData.idKelompok, formData.noPolis]);

  // Debug effect to log anggotalist changes
  useEffect(() => {
    console.log("KlaimPanel - anggotalist updated:", anggotalist);
    if (anggotalist && anggotalist.length > 0) {
      const firstKlaim = anggotalist[0];
      setDebugInfo({
        idkelompok: firstKlaim.idkelompok,
        idpolis: firstKlaim.idpolis,
        idklaim: firstKlaim.idklaim,
        nik: firstKlaim.nik,
        nopolis: firstKlaim.nopolis
      });
    }
  }, [anggotalist]);

  // Debug effect to log anggotalist changes
  useEffect(() => {
    console.log("KlaimPanel - anggotalist updated:", anggotalist);
  }, [anggotalist]);

  const handleReloadAnggota = () => {
    if (debugInfo.idkelompok && debugInfo.idklaim) {
      console.log("Reloading anggota data with idkelompok:", debugInfo.idkelompok, "idklaim:", debugInfo.idklaim);
      dispatch(getAnggotaKlaim(debugInfo.idkelompok, debugInfo.idklaim));
    } else {
      console.log("Cannot reload anggota - missing idkelompok or idklaim");
    }
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleMouseEnter = (id) => {
    setHoveredId(id);
    if (polygonLayerRef.current) {
      const hoverStyle = (feature) => {
        let featureId;
        if (source === 'MapView') {
          // For MVT features, get idpetak from properties
          const properties = feature.getProperties();
          featureId = properties.idpetak;
        } else {
          featureId = feature.get('id');
        }
        
    
        // Always apply hover style if IDs match
        if (featureId === id) {
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
        
        // Return default style for non-matching features
        return getPercilStyle(selectedPercils)(feature);
      };
      
      // Force style update
      polygonLayerRef.current.setStyle(hoverStyle);
      polygonLayerRef.current.changed();
    }
  };

  const handleMouseLeave = () => {
    setHoveredId(null);
    if (polygonLayerRef.current) {
      // Reset to default style
      polygonLayerRef.current.setStyle(getPercilStyle(selectedPercils));
      polygonLayerRef.current.changed();
    }
  };

  return (
    <Box p={2}>
      <Typography variant="body2">
        <strong>NIK:</strong> {formData.nik}
      </Typography>
      <Typography variant="body2">
        <strong>No. Polis:</strong> {formData.noPolis}
      </Typography>
      <Typography variant="body2">
        <strong>Nama:</strong> {formData.nama}
      </Typography>
      <Typography variant="body2">
        <strong>Luas Lahan:</strong> {formData.luasLahan}
      </Typography>
      <Typography variant="body2">
        <strong>Jumlah Petak:</strong> {formData.jmlPetak}
      </Typography>
      
      {/* Debug Information */}
      <Divider style={{ margin: '1rem 0' }} />
      <Paper elevation={1} sx={{ p: 1, mb: 2, backgroundColor: '#f5f5f5' }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
          Debug Info:
        </Typography>
        <Typography variant="caption" display="block">
          <strong>ID Kelompok:</strong> {debugInfo.idkelompok || 'N/A'}
        </Typography>
        <Typography variant="caption" display="block">
          <strong>ID Polis:</strong> {debugInfo.idpolis || 'N/A'}
        </Typography>
        <Typography variant="caption" display="block">
          <strong>ID Klaim:</strong> {debugInfo.idklaim || 'N/A'}
        </Typography>
        <Typography variant="caption" display="block">
          <strong>NIK:</strong> {debugInfo.nik || 'N/A'}
        </Typography>
        <Typography variant="caption" display="block">
          <strong>No Polis:</strong> {debugInfo.nopolis || 'N/A'}
        </Typography>
        
        <Button
          variant="outlined"
          size="small"
          startIcon={<RefreshIcon />}
          onClick={handleReloadAnggota}
          disabled={!debugInfo.idkelompok || !debugInfo.idklaim}
          sx={{ mt: 1 }}
        >
          Reload Anggota
        </Button>
      </Paper>

      {/* Anggota List */}
      {anggotalist && anggotalist.length > 0 && (
        <Paper elevation={1} sx={{ p: 1, mb: 2, backgroundColor: '#e8f5e8' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
            Anggota Data ({anggotalist.length} records):
          </Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell><Typography variant="caption"><strong>NIK</strong></Typography></TableCell>
                <TableCell><Typography variant="caption"><strong>Nama</strong></Typography></TableCell>
                <TableCell><Typography variant="caption"><strong>ID Kelompok</strong></Typography></TableCell>
                <TableCell><Typography variant="caption"><strong>ID Klaim</strong></Typography></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {anggotalist.slice(0, 3).map((anggota, index) => (
                <TableRow key={index}>
                  <TableCell><Typography variant="caption">{anggota.nik || 'N/A'}</Typography></TableCell>
                  <TableCell><Typography variant="caption">{anggota.nama || 'N/A'}</Typography></TableCell>
                  <TableCell><Typography variant="caption">{anggota.idkelompok || 'N/A'}</Typography></TableCell>
                  <TableCell><Typography variant="caption">{anggota.idklaim || 'N/A'}</Typography></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {anggotalist.length > 3 && (
            <Typography variant="caption" sx={{ fontStyle: 'italic' }}>
              ... and {anggotalist.length - 3} more records
            </Typography>
          )}
        </Paper>
      )}

      <Divider style={{ margin: '1rem 0' }} />

      {/* Selected Petak List - Only show in MapRegister or MapClaim */}
      <Typography variant="body2"><strong>Lahan Terpilih</strong></Typography>
      {anggotalist.length === 0 ? (
        <Typography variant="body2">Belum Ada Lahan Terpilih</Typography>
      ) : (
        <>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell><Typography variant="body2"><strong>ID Petak</strong></Typography></TableCell>
                <TableCell><Typography variant="body2"><strong>Luas</strong></Typography></TableCell>
                <TableCell align="right"><Typography variant="body2"><strong>Analisis</strong></Typography></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {anggotalist.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((p) => (
                <TableRow 
                  key={p.id}
                  onMouseEnter={() => handleMouseEnter(p.id)}
                  onMouseLeave={handleMouseLeave}
                  sx={{ 
                    cursor: 'pointer',
                    backgroundColor: hoveredId === p.id ? 'rgba(0, 0, 0, 0.04)' : 'inherit'
                  }}
                >
                  <TableCell><Typography variant="caption">{p.idpetak}</Typography></TableCell>
                  <TableCell><Typography variant="caption">{p.luas}</Typography></TableCell>
                  <TableCell align="right">
                    <IconButton
                      aria-label={`Hapus Lahan ${p.id}`}
                      onClick={() => {
                        const updated = selectedPercils.filter(
                          (item) => item.id !== p.id
                        );
                        setSelectedPercils(updated);
                        polygonLayerRef.current.setStyle(getPercilStyle(updated));
                      }}
                      size="small"
                    >
                      <QueryStatsIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Typography variant="body2" style={{ marginTop: '0.5rem' }}>
            <strong>Luas Total:</strong> {anggotalist.reduce((acc, p) => acc + p.luas, 0).toFixed(2)} ha
          </Typography>
          <TablePagination
            component="div"
            count={anggotalist.length}
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage}
            rowsPerPageOptions={[10]}
          />
        </>
      )}
    </Box>
  );
};

export default DataPanel;