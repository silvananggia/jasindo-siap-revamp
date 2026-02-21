import React from 'react';
import { Box, Typography, Divider, useTheme, useMediaQuery } from '@mui/material';
import { basemapOptions } from '../../utils/mapUtils';

const BasemapSwitcher = ({ selectedBasemap, onBasemapChange, isMobile, isTablet }) => {
  const theme = useTheme();

  return (
    <Box sx={{ width: '100%', maxWidth: '100%', overflowX: 'hidden' }}>
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 1, 
        paddingTop: '15px',
        paddingBottom: '8px',
        width: '100%',
        maxWidth: '100%'
      }}>
        <Typography variant="caption" sx={{ fontSize: '0.75rem', whiteSpace: 'nowrap', flexShrink: 0 }}>Basemap</Typography>
        <Box sx={{ flexGrow: 1 }} />
        <Divider orientation="vertical" flexItem sx={{ height: '20px', mx: 0.5 }} />
      </Box>
      <Divider sx={{ mb: 1 }} />
      <Box className="basemap-option" sx={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '8px',
        padding: '8px 0',
        width: '100%',
        maxWidth: '100%',
        boxSizing: 'border-box'
      }}>
        {basemapOptions.map((option) => (
          <Box key={option.key} className="button-container" sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px',
            width: '100%',
            maxWidth: '100%',
            minWidth: 0
          }}>
            <Box
              className={`image ${selectedBasemap === option.key ? "active" : ""}`}
              id={option.key}
              onClick={() => onBasemapChange(option.key)}
              sx={{
                width: '50px',
                height: '50px',
                cursor: 'pointer',
                borderRadius: '4px',
                border: selectedBasemap === option.key ? '2px solid #1976d2' : '1px solid #ddd',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                flexShrink: 0
              }}
            />
            <Box className={`label-basemap ${selectedBasemap === option.key ? "active" : ""}`} sx={{ width: '100%', textAlign: 'center' }}>
              <Typography 
                fontSize={9} 
                align="center"
                sx={{
                  color: selectedBasemap === option.key ? '#1976d2' : 'inherit',
                  fontWeight: selectedBasemap === option.key ? 'bold' : 'normal',
                  fontSize: '0.65rem',
                  lineHeight: 1.2,
                  wordBreak: 'break-word',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
              >
                {option.label}
              </Typography>
            </Box>
          </Box>
        ))}
      </Box>
      <Divider sx={{ mt: 1 }} />
    </Box>
  );
};

export default BasemapSwitcher; 