import React from 'react';
import { Box, Typography, Divider, useTheme, useMediaQuery } from '@mui/material';
import { basemapOptions } from '../../utils/mapUtils';

const BasemapSwitcher = ({ selectedBasemap, onBasemapChange, isMobile, isTablet }) => {
  const theme = useTheme();

  return (
    <Box>
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: isMobile ? 1 : 2, 
        paddingTop: isMobile ? '15px' : '20px' 
      }}>
        <Typography variant={isMobile ? "body2" : "caption"}>Basemap</Typography>
        <Divider />
      </Box>
      <Divider />
      <div className="basemap-option" style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : isTablet ? 'repeat(3, 1fr)' : 'repeat(4, 1fr)',
        gap: isMobile ? '8px' : '12px',
        padding: isMobile ? '8px 0' : '12px 0'
      }}>
        {basemapOptions.map((option) => (
          <div key={option.key} className="button-container" style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: isMobile ? '4px' : '6px'
          }}>
            <div
              className={`image ${selectedBasemap === option.key ? "active" : ""}`}
              id={option.key}
              onClick={() => onBasemapChange(option.key)}
              style={{
                width: isMobile ? '40px' : isTablet ? '50px' : '60px',
                height: isMobile ? '40px' : isTablet ? '50px' : '60px',
                cursor: 'pointer',
                borderRadius: '4px',
                border: selectedBasemap === option.key ? '2px solid #1976d2' : '1px solid #ddd',
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              }}
            />
            <div className={`label-basemap ${selectedBasemap === option.key ? "active" : ""}`}>
              <Typography 
                fontSize={isMobile ? 8 : isTablet ? 9 : 10} 
                align="center"
                sx={{
                  color: selectedBasemap === option.key ? '#1976d2' : 'inherit',
                  fontWeight: selectedBasemap === option.key ? 'bold' : 'normal'
                }}
              >
                {option.label}
              </Typography>
            </div>
          </div>
        ))}
      </div>
      <Divider />
    </Box>
  );
};

export default BasemapSwitcher; 