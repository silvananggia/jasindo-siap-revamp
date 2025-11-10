import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  breakpoints: {
    values: {
      xs: 0,
      sm: 600,
      md: 960,
      lg: 1280,
      xl: 1920,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
          fontWeight: 600,
          transition: 'all 0.2s ease',
          '&:hover': {
            transform: 'translateY(-1px)',
            boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          transition: 'all 0.2s ease',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          },
        },
      },
    },
    MuiTable: {
      styleOverrides: {
        root: {
          '& .MuiTableCell-root': {
            borderBottom: '1px solid rgba(224, 224, 224, 1)',
            padding: '12px 16px',
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          fontSize: '0.875rem',
        },
        head: {
          fontWeight: 600,
          backgroundColor: 'rgba(0, 0, 0, 0.02)',
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        root: {
          '& .MuiTab-root': {
            minHeight: 48,
            fontSize: '0.875rem',
            fontWeight: 500,
            textTransform: 'none',
          },
        },
      },
    },
    MuiSlider: {
      styleOverrides: {
        root: {
          '& .MuiSlider-thumb': {
            transition: 'all 0.2s ease',
            '&:hover': {
              transform: 'scale(1.2)',
              boxShadow: '0 0 0 8px rgba(25, 118, 210, 0.16)',
            },
          },
        },
      },
    },
    MuiSwitch: {
      styleOverrides: {
        root: {
          '& .MuiSwitch-thumb': {
            transition: 'all 0.2s ease',
          },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          transition: 'all 0.2s ease',
          '&:hover': {
            transform: 'scale(1.1)',
            backgroundColor: 'rgba(0, 0, 0, 0.04)',
          },
        },
      },
    },
  },
  typography: {
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
    h1: {
      fontSize: '2.5rem',
      fontWeight: 600,
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 600,
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 600,
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 600,
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 600,
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 600,
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.5,
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.43,
    },
    caption: {
      fontSize: '0.75rem',
      lineHeight: 1.2,
    },
  },
  palette: {
    primary: {
      main: '#1976d2',
      light: '#42a5f5',
      dark: '#1565c0',
      contrastText: '#fff',
    },
    secondary: {
      main: '#dc004e',
      light: '#ff5983',
      dark: '#9a0036',
      contrastText: '#fff',
    },
    error: {
      main: '#f44336',
      light: '#e57373',
      dark: '#d32f2f',
    },
    warning: {
      main: '#ff9800',
      light: '#ffb74d',
      dark: '#f57c00',
    },
    info: {
      main: '#2196f3',
      light: '#64b5f6',
      dark: '#1976d2',
    },
    success: {
      main: '#4caf50',
      light: '#81c784',
      dark: '#388e3c',
    },
    background: {
      default: '#fafafa',
      paper: '#fff',
    },
    text: {
      primary: 'rgba(0, 0, 0, 0.87)',
      secondary: 'rgba(0, 0, 0, 0.6)',
      disabled: 'rgba(0, 0, 0, 0.38)',
    },
  },
  shape: {
    borderRadius: 8,
  },
  shadows: [
    'none',
    '0px 2px 1px -1px rgba(0,0,0,0.2),0px 1px 1px 0px rgba(0,0,0,0.14),0px 1px 3px 0px rgba(0,0,0,0.12)',
    '0px 3px 1px -2px rgba(0,0,0,0.2),0px 2px 2px 0px rgba(0,0,0,0.14),0px 1px 5px 0px rgba(0,0,0,0.12)',
    '0px 3px 3px -2px rgba(0,0,0,0.2),0px 3px 4px 0px rgba(0,0,0,0.14),0px 1px 8px 0px rgba(0,0,0,0.12)',
    '0px 2px 4px -1px rgba(0,0,0,0.2),0px 4px 5px 0px rgba(0,0,0,0.14),0px 1px 10px 0px rgba(0,0,0,0.12)',
    '0px 3px 5px -1px rgba(0,0,0,0.2),0px 5px 8px 0px rgba(0,0,0,0.14),0px 1px 14px 0px rgba(0,0,0,0.12)',
    '0px 3px 5px -1px rgba(0,0,0,0.2),0px 6px 10px 0px rgba(0,0,0,0.14),0px 1px 18px 0px rgba(0,0,0,0.12)',
    '0px 4px 5px -2px rgba(0,0,0,0.2),0px 7px 10px 1px rgba(0,0,0,0.14),0px 2px 16px 1px rgba(0,0,0,0.12)',
    '0px 5px 5px -3px rgba(0,0,0,0.2),0px 8px 10px 1px rgba(0,0,0,0.14),0px 3px 14px 2px rgba(0,0,0,0.12)',
    '0px 5px 6px -3px rgba(0,0,0,0.2),0px 9px 12px 1px rgba(0,0,0,0.14),0px 3px 16px 2px rgba(0,0,0,0.12)',
    '0px 6px 6px -3px rgba(0,0,0,0.2),0px 10px 14px 1px rgba(0,0,0,0.14),0px 4px 18px 3px rgba(0,0,0,0.12)',
    '0px 6px 7px -4px rgba(0,0,0,0.2),0px 11px 15px 1px rgba(0,0,0,0.14),0px 4px 20px 3px rgba(0,0,0,0.12)',
    '0px 7px 8px -4px rgba(0,0,0,0.2),0px 12px 17px 2px rgba(0,0,0,0.14),0px 5px 22px 4px rgba(0,0,0,0.12)',
    '0px 7px 8px -4px rgba(0,0,0,0.2),0px 13px 19px 2px rgba(0,0,0,0.14),0px 5px 24px 4px rgba(0,0,0,0.12)',
    '0px 7px 9px -4px rgba(0,0,0,0.2),0px 14px 21px 2px rgba(0,0,0,0.14),0px 5px 26px 4px rgba(0,0,0,0.12)',
    '0px 8px 9px -5px rgba(0,0,0,0.2),0px 15px 22px 2px rgba(0,0,0,0.14),0px 6px 28px 5px rgba(0,0,0,0.12)',
    '0px 8px 10px -5px rgba(0,0,0,0.2),0px 16px 24px 2px rgba(0,0,0,0.14),0px 6px 30px 5px rgba(0,0,0,0.12)',
    '0px 8px 11px -5px rgba(0,0,0,0.2),0px 17px 26px 2px rgba(0,0,0,0.14),0px 6px 32px 5px rgba(0,0,0,0.12)',
    '0px 9px 11px -5px rgba(0,0,0,0.2),0px 18px 28px 2px rgba(0,0,0,0.14),0px 7px 34px 6px rgba(0,0,0,0.12)',
    '0px 9px 12px -6px rgba(0,0,0,0.2),0px 19px 29px 2px rgba(0,0,0,0.14),0px 7px 36px 6px rgba(0,0,0,0.12)',
    '0px 10px 13px -6px rgba(0,0,0,0.2),0px 20px 31px 3px rgba(0,0,0,0.14),0px 8px 38px 7px rgba(0,0,0,0.12)',
    '0px 10px 13px -6px rgba(0,0,0,0.2),0px 21px 33px 3px rgba(0,0,0,0.14),0px 8px 40px 7px rgba(0,0,0,0.12)',
    '0px 10px 14px -6px rgba(0,0,0,0.2),0px 22px 35px 3px rgba(0,0,0,0.14),0px 8px 42px 7px rgba(0,0,0,0.12)',
    '0px 11px 14px -7px rgba(0,0,0,0.2),0px 23px 36px 3px rgba(0,0,0,0.14),0px 9px 44px 8px rgba(0,0,0,0.12)',
    '0px 11px 15px -7px rgba(0,0,0,0.2),0px 24px 38px 3px rgba(0,0,0,0.14),0px 9px 46px 8px rgba(0,0,0,0.12)',
    '0px 12px 16px -8px rgba(0,0,0,0.2),0px 25px 40px 3px rgba(0,0,0,0.14),0px 10px 48px 9px rgba(0,0,0,0.12)',
    '0px 12px 17px -8px rgba(0,0,0,0.2),0px 26px 42px 4px rgba(0,0,0,0.14),0px 10px 50px 9px rgba(0,0,0,0.12)',
    '0px 13px 18px -8px rgba(0,0,0,0.2),0px 27px 44px 4px rgba(0,0,0,0.14),0px 11px 52px 10px rgba(0,0,0,0.12)',
    '0px 13px 19px -9px rgba(0,0,0,0.2),0px 28px 46px 4px rgba(0,0,0,0.14),0px 11px 54px 10px rgba(0,0,0,0.12)',
    '0px 14px 20px -9px rgba(0,0,0,0.2),0px 29px 48px 4px rgba(0,0,0,0.14),0px 12px 56px 11px rgba(0,0,0,0.12)',
    '0px 14px 21px -9px rgba(0,0,0,0.2),0px 30px 50px 4px rgba(0,0,0,0.14),0px 12px 58px 11px rgba(0,0,0,0.12)',
    '0px 15px 22px -10px rgba(0,0,0,0.2),0px 31px 52px 5px rgba(0,0,0,0.14),0px 13px 60px 12px rgba(0,0,0,0.12)',
    '0px 15px 23px -10px rgba(0,0,0,0.2),0px 32px 54px 5px rgba(0,0,0,0.14),0px 13px 62px 12px rgba(0,0,0,0.12)',
    '0px 16px 24px -11px rgba(0,0,0,0.2),0px 33px 56px 5px rgba(0,0,0,0.14),0px 14px 64px 13px rgba(0,0,0,0.12)',
    '0px 16px 25px -11px rgba(0,0,0,0.2),0px 34px 58px 5px rgba(0,0,0,0.14),0px 14px 66px 13px rgba(0,0,0,0.12)',
    '0px 17px 26px -11px rgba(0,0,0,0.2),0px 35px 60px 5px rgba(0,0,0,0.14),0px 15px 68px 14px rgba(0,0,0,0.12)',
    '0px 17px 27px -12px rgba(0,0,0,0.2),0px 36px 62px 6px rgba(0,0,0,0.14),0px 15px 70px 14px rgba(0,0,0,0.12)',
    '0px 18px 28px -12px rgba(0,0,0,0.2),0px 37px 64px 6px rgba(0,0,0,0.14),0px 16px 72px 15px rgba(0,0,0,0.12)',
    '0px 18px 29px -12px rgba(0,0,0,0.2),0px 38px 66px 6px rgba(0,0,0,0.14),0px 16px 74px 15px rgba(0,0,0,0.12)',
    '0px 19px 30px -13px rgba(0,0,0,0.2),0px 39px 68px 6px rgba(0,0,0,0.14),0px 17px 76px 16px rgba(0,0,0,0.12)',
    '0px 19px 31px -13px rgba(0,0,0,0.2),0px 40px 70px 6px rgba(0,0,0,0.14),0px 17px 78px 16px rgba(0,0,0,0.12)',
    '0px 20px 32px -14px rgba(0,0,0,0.2),0px 41px 72px 7px rgba(0,0,0,0.14),0px 18px 80px 17px rgba(0,0,0,0.12)',
    '0px 20px 33px -14px rgba(0,0,0,0.2),0px 42px 74px 7px rgba(0,0,0,0.14),0px 18px 82px 17px rgba(0,0,0,0.12)',
    '0px 21px 34px -14px rgba(0,0,0,0.2),0px 43px 76px 7px rgba(0,0,0,0.14),0px 19px 84px 18px rgba(0,0,0,0.12)',
    '0px 21px 35px -14px rgba(0,0,0,0.2),0px 44px 78px 7px rgba(0,0,0,0.14),0px 19px 86px 18px rgba(0,0,0,0.12)',
    '0px 22px 36px -15px rgba(0,0,0,0.2),0px 45px 80px 7px rgba(0,0,0,0.14),0px 20px 88px 19px rgba(0,0,0,0.12)',
    '0px 22px 37px -15px rgba(0,0,0,0.2),0px 46px 82px 7px rgba(0,0,0,0.14),0px 20px 90px 19px rgba(0,0,0,0.12)',
    '0px 23px 38px -16px rgba(0,0,0,0.2),0px 47px 84px 8px rgba(0,0,0,0.14),0px 21px 92px 20px rgba(0,0,0,0.12)',
    '0px 23px 39px -16px rgba(0,0,0,0.2),0px 48px 86px 8px rgba(0,0,0,0.14),0px 21px 94px 20px rgba(0,0,0,0.12)',
    '0px 24px 40px -17px rgba(0,0,0,0.2),0px 49px 88px 8px rgba(0,0,0,0.14),0px 22px 96px 21px rgba(0,0,0,0.12)',
    '0px 24px 41px -17px rgba(0,0,0,0.2),0px 50px 90px 8px rgba(0,0,0,0.14),0px 22px 98px 21px rgba(0,0,0,0.12)',
    '0px 25px 42px -18px rgba(0,0,0,0.2),0px 51px 92px 8px rgba(0,0,0,0.14),0px 23px 100px 22px rgba(0,0,0,0.12)',
    '0px 25px 43px -18px rgba(0,0,0,0.2),0px 52px 94px 8px rgba(0,0,0,0.14),0px 23px 102px 22px rgba(0,0,0,0.12)',
    '0px 26px 44px -19px rgba(0,0,0,0.2),0px 53px 96px 9px rgba(0,0,0,0.14),0px 24px 104px 23px rgba(0,0,0,0.12)',
    '0px 26px 45px -19px rgba(0,0,0,0.2),0px 54px 98px 9px rgba(0,0,0,0.14),0px 24px 106px 23px rgba(0,0,0,0.12)',
    '0px 27px 46px -20px rgba(0,0,0,0.2),0px 55px 100px 9px rgba(0,0,0,0.14),0px 25px 108px 24px rgba(0,0,0,0.12)',
    '0px 27px 47px -20px rgba(0,0,0,0.2),0px 56px 102px 9px rgba(0,0,0,0.14),0px 25px 110px 24px rgba(0,0,0,0.12)',
    '0px 28px 48px -21px rgba(0,0,0,0.2),0px 57px 104px 9px rgba(0,0,0,0.14),0px 26px 112px 25px rgba(0,0,0,0.12)',
    '0px 28px 49px -21px rgba(0,0,0,0.2),0px 58px 106px 9px rgba(0,0,0,0.14),0px 26px 114px 25px rgba(0,0,0,0.12)',
    '0px 29px 50px -22px rgba(0,0,0,0.2),0px 59px 108px 10px rgba(0,0,0,0.14),0px 27px 116px 26px rgba(0,0,0,0.12)',
    '0px 29px 51px -22px rgba(0,0,0,0.2),0px 60px 110px 10px rgba(0,0,0,0.14),0px 27px 118px 26px rgba(0,0,0,0.12)',
    '0px 30px 52px -23px rgba(0,0,0,0.2),0px 61px 112px 10px rgba(0,0,0,0.14),0px 28px 120px 27px rgba(0,0,0,0.12)',
    '0px 30px 53px -23px rgba(0,0,0,0.2),0px 62px 114px 10px rgba(0,0,0,0.14),0px 28px 122px 27px rgba(0,0,0,0.12)',
    '0px 31px 54px -24px rgba(0,0,0,0.2),0px 63px 116px 10px rgba(0,0,0,0.14),0px 29px 124px 28px rgba(0,0,0,0.12)',
    '0px 31px 55px -24px rgba(0,0,0,0.2),0px 64px 118px 10px rgba(0,0,0,0.14),0px 29px 126px 28px rgba(0,0,0,0.12)',
    '0px 32px 56px -25px rgba(0,0,0,0.2),0px 65px 120px 11px rgba(0,0,0,0.14),0px 30px 128px 29px rgba(0,0,0,0.12)',
    '0px 32px 57px -25px rgba(0,0,0,0.2),0px 66px 122px 11px rgba(0,0,0,0.14),0px 30px 130px 29px rgba(0,0,0,0.12)',
    '0px 33px 58px -26px rgba(0,0,0,0.2),0px 67px 124px 11px rgba(0,0,0,0.14),0px 31px 132px 30px rgba(0,0,0,0.12)',
    '0px 33px 59px -26px rgba(0,0,0,0.2),0px 68px 126px 11px rgba(0,0,0,0.14),0px 31px 134px 30px rgba(0,0,0,0.12)',
    '0px 34px 60px -27px rgba(0,0,0,0.2),0px 69px 128px 11px rgba(0,0,0,0.14),0px 32px 136px 31px rgba(0,0,0,0.12)',
    '0px 34px 61px -27px rgba(0,0,0,0.2),0px 70px 130px 11px rgba(0,0,0,0.14),0px 32px 138px 31px rgba(0,0,0,0.12)',
    '0px 35px 62px -28px rgba(0,0,0,0.2),0px 71px 132px 12px rgba(0,0,0,0.14),0px 33px 140px 32px rgba(0,0,0,0.12)',
    '0px 35px 63px -28px rgba(0,0,0,0.2),0px 72px 134px 12px rgba(0,0,0,0.14),0px 33px 142px 32px rgba(0,0,0,0.12)',
    '0px 36px 64px -29px rgba(0,0,0,0.2),0px 73px 136px 12px rgba(0,0,0,0.14),0px 34px 144px 33px rgba(0,0,0,0.12)',
    '0px 36px 65px -29px rgba(0,0,0,0.2),0px 74px 138px 12px rgba(0,0,0,0.14),0px 34px 146px 33px rgba(0,0,0,0.12)',
    '0px 37px 66px -30px rgba(0,0,0,0.2),0px 75px 140px 12px rgba(0,0,0,0.14),0px 35px 148px 34px rgba(0,0,0,0.12)',
    '0px 37px 67px -30px rgba(0,0,0,0.2),0px 76px 142px 12px rgba(0,0,0,0.14),0px 35px 150px 34px rgba(0,0,0,0.12)',
    '0px 38px 68px -31px rgba(0,0,0,0.2),0px 77px 144px 13px rgba(0,0,0,0.14),0px 36px 152px 35px rgba(0,0,0,0.12)',
    '0px 38px 69px -31px rgba(0,0,0,0.2),0px 78px 146px 13px rgba(0,0,0,0.14),0px 36px 154px 35px rgba(0,0,0,0.12)',
    '0px 39px 70px -32px rgba(0,0,0,0.2),0px 79px 148px 13px rgba(0,0,0,0.14),0px 37px 156px 36px rgba(0,0,0,0.12)',
    '0px 39px 71px -32px rgba(0,0,0,0.2),0px 80px 150px 13px rgba(0,0,0,0.14),0px 37px 158px 36px rgba(0,0,0,0.12)',
    '0px 40px 72px -33px rgba(0,0,0,0.2),0px 81px 152px 13px rgba(0,0,0,0.14),0px 38px 160px 37px rgba(0,0,0,0.12)',
    '0px 40px 73px -33px rgba(0,0,0,0.2),0px 82px 154px 13px rgba(0,0,0,0.14),0px 38px 162px 37px rgba(0,0,0,0.12)',
    '0px 41px 74px -34px rgba(0,0,0,0.2),0px 83px 156px 14px rgba(0,0,0,0.14),0px 39px 164px 38px rgba(0,0,0,0.12)',
    '0px 41px 75px -34px rgba(0,0,0,0.2),0px 84px 158px 14px rgba(0,0,0,0.14),0px 39px 166px 38px rgba(0,0,0,0.12)',
    '0px 42px 76px -35px rgba(0,0,0,0.2),0px 85px 160px 14px rgba(0,0,0,0.14),0px 40px 168px 39px rgba(0,0,0,0.12)',
    '0px 42px 77px -35px rgba(0,0,0,0.2),0px 86px 162px 14px rgba(0,0,0,0.14),0px 40px 170px 39px rgba(0,0,0,0.12)',
    '0px 43px 78px -36px rgba(0,0,0,0.2),0px 87px 164px 14px rgba(0,0,0,0.14),0px 41px 172px 40px rgba(0,0,0,0.12)',
    '0px 43px 79px -36px rgba(0,0,0,0.2),0px 88px 166px 14px rgba(0,0,0,0.14),0px 41px 174px 40px rgba(0,0,0,0.12)',
    '0px 44px 80px -37px rgba(0,0,0,0.2),0px 89px 168px 15px rgba(0,0,0,0.14),0px 42px 176px 41px rgba(0,0,0,0.12)',
    '0px 44px 81px -37px rgba(0,0,0,0.2),0px 90px 170px 15px rgba(0,0,0,0.14),0px 42px 178px 41px rgba(0,0,0,0.12)',
    '0px 45px 82px -38px rgba(0,0,0,0.2),0px 91px 172px 15px rgba(0,0,0,0.14),0px 43px 180px 42px rgba(0,0,0,0.12)',
    '0px 45px 83px -38px rgba(0,0,0,0.2),0px 92px 174px 15px rgba(0,0,0,0.14),0px 43px 182px 42px rgba(0,0,0,0.12)',
    '0px 46px 84px -39px rgba(0,0,0,0.2),0px 93px 176px 15px rgba(0,0,0,0.14),0px 44px 184px 43px rgba(0,0,0,0.12)',
    '0px 46px 85px -39px rgba(0,0,0,0.2),0px 94px 178px 15px rgba(0,0,0,0.14),0px 44px 186px 43px rgba(0,0,0,0.12)',
    '0px 47px 86px -40px rgba(0,0,0,0.2),0px 95px 180px 16px rgba(0,0,0,0.14),0px 45px 188px 44px rgba(0,0,0,0.12)',
    '0px 47px 87px -40px rgba(0,0,0,0.2),0px 96px 182px 16px rgba(0,0,0,0.14),0px 45px 190px 44px rgba(0,0,0,0.12)',
    '0px 48px 88px -41px rgba(0,0,0,0.2),0px 97px 184px 16px rgba(0,0,0,0.14),0px 46px 192px 45px rgba(0,0,0,0.12)',
    '0px 48px 89px -41px rgba(0,0,0,0.2),0px 98px 186px 16px rgba(0,0,0,0.14),0px 46px 194px 45px rgba(0,0,0,0.12)',
    '0px 49px 90px -42px rgba(0,0,0,0.2),0px 99px 188px 16px rgba(0,0,0,0.14),0px 47px 196px 46px rgba(0,0,0,0.12)',
    '0px 49px 91px -42px rgba(0,0,0,0.2),0px 100px 190px 16px rgba(0,0,0,0.14),0px 47px 198px 46px rgba(0,0,0,0.12)',
    '0px 50px 92px -43px rgba(0,0,0,0.2),0px 101px 192px 17px rgba(0,0,0,0.14),0px 48px 200px 47px rgba(0,0,0,0.12)',
    '0px 50px 93px -43px rgba(0,0,0,0.2),0px 102px 194px 17px rgba(0,0,0,0.14),0px 48px 202px 47px rgba(0,0,0,0.12)',
    '0px 51px 94px -44px rgba(0,0,0,0.2),0px 103px 196px 17px rgba(0,0,0,0.14),0px 49px 204px 48px rgba(0,0,0,0.12)',
    '0px 51px 95px -44px rgba(0,0,0,0.2),0px 104px 198px 17px rgba(0,0,0,0.14),0px 49px 206px 48px rgba(0,0,0,0.12)',
    '0px 52px 96px -45px rgba(0,0,0,0.2),0px 105px 200px 17px rgba(0,0,0,0.14),0px 50px 208px 49px rgba(0,0,0,0.12)',
    '0px 52px 97px -45px rgba(0,0,0,0.2),0px 106px 202px 17px rgba(0,0,0,0.14),0px 50px 210px 49px rgba(0,0,0,0.12)',
    '0px 53px 98px -46px rgba(0,0,0,0.2),0px 107px 204px 18px rgba(0,0,0,0.14),0px 51px 212px 50px rgba(0,0,0,0.12)',
    '0px 53px 99px -46px rgba(0,0,0,0.2),0px 108px 206px 18px rgba(0,0,0,0.14),0px 51px 214px 50px rgba(0,0,0,0.12)',
    '0px 54px 100px -47px rgba(0,0,0,0.2),0px 109px 208px 18px rgba(0,0,0,0.14),0px 52px 216px 51px rgba(0,0,0,0.12)',
  ],
});

export default theme;
