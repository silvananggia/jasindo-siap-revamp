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
    <Box>
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: isMobile ? 1 : 2, 
        paddingTop: isMobile ? '15px' : '20px',
        flexWrap: isMobile ? 'wrap' : 'nowrap'
      }}>
        <Typography variant={isMobile ? "body2" : "caption"}>Layer Petak</Typography>
        <Switch
          checked={isPolygonVisible}
          onChange={(e) => setIsPolygonVisible(e.target.checked)}
          size={isMobile ? "small" : "medium"}
        />
        <Divider />
      </Box>

      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: isMobile ? 1 : 2,
          width: isMobile ? '100%' : isTablet ? '280px' : '300px',
          mb: 2,
        }}
      >
        <OpacityIcon fontSize={isMobile ? "small" : "medium"} />
        <Slider
          value={polygonOpacity}
          min={0}
          max={1}
          step={0.1}
          aria-label="Opacity"
          valueLabelDisplay='auto'
          onChange={(e, value) => setPolygonOpacity(value)}
          sx={{ flexGrow: 1 }}
          size={isMobile ? "small" : "medium"}
        />
      </Box>

      <Divider />

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