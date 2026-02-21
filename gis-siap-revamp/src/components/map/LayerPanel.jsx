import React from 'react';
import { Box, Typography, Switch, Slider, Divider, useTheme, useMediaQuery } from '@mui/material';
import OpacityIcon from "@mui/icons-material/Opacity";
import BasemapSwitcher from './BasemapSwitcher';

const LayerPanel = ({
  isPolygonVisible,
  setIsPolygonVisible,
  polygonOpacity,
  setPolygonOpacity,
  selectedBasemap,
  onBasemapChange,
  isMobile,
  isTablet,
}) => {
  const theme = useTheme();

  return (
    <Box sx={{ width: '100%', maxWidth: '100%', overflowX: 'hidden' }}>
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 1, 
        paddingTop: '15px',
        paddingBottom: '8px',
        flexWrap: 'nowrap',
        width: '100%',
        maxWidth: '100%'
      }}>
        <Typography variant="caption" sx={{ fontSize: '0.75rem', whiteSpace: 'nowrap', flexShrink: 0 }}>Layer Petak</Typography>
        <Switch
          checked={isPolygonVisible}
          onChange={(e) => setIsPolygonVisible(e.target.checked)}
          size="small"
          sx={{ flexShrink: 0 }}
        />
        <Box sx={{ flexGrow: 1 }} />
        <Divider orientation="vertical" flexItem sx={{ height: '20px', mx: 0.5 }} />
      </Box>

      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          width: '100%',
          maxWidth: '100%',
          mb: 2,
          px: 0
        }}
      >
        <OpacityIcon fontSize="small" sx={{ flexShrink: 0 }} />
        <Slider
          value={polygonOpacity}
          min={0}
          max={1}
          step={0.1}
          aria-label="Opacity"
          valueLabelDisplay='auto'
          onChange={(e, value) => setPolygonOpacity(value)}
          sx={{ flexGrow: 1, minWidth: 0 }}
          size="small"
        />
      </Box>

      <Divider sx={{ mb: 1 }} />

      <BasemapSwitcher
        selectedBasemap={selectedBasemap}
        onBasemapChange={onBasemapChange}
        isMobile={isMobile}
        isTablet={isTablet}
      />
    </Box>
  );
};

export default LayerPanel; 