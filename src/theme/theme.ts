import { createTheme } from '@mui/material/styles';

declare module '@mui/material/styles' {
  interface Palette {
    status: {
      paid: string;
      pending: string;
      late: string;
    };
  }
  interface PaletteOptions {
    status: {
      paid: string;
      pending: string;
      late: string;
    };
  }
}

export const theme = createTheme({
  palette: {
    primary: {
      main: '#004B87',
      light: '#007BCE',
    },
    background: {
      default: '#F5F7FA',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#333C47',
    },
    grey: {
      300: '#C9CED6',
    },
    status: {
      paid: '#22C55E',
      pending: '#F59E0B',
      late: '#EF4444',
    },
  },
  typography: {
    fontFamily: 'Inter, sans-serif',
    h1: {
      fontFamily: 'Poppins, sans-serif',
      fontWeight: 600,
    },
    h2: {
      fontFamily: 'Poppins, sans-serif',
      fontWeight: 600,
    },
    h3: {
      fontFamily: 'Poppins, sans-serif',
      fontWeight: 600,
    },
    h4: {
      fontFamily: 'Poppins, sans-serif',
      fontWeight: 600,
    },
    h5: {
      fontFamily: 'Poppins, sans-serif',
      fontWeight: 600,
    },
    h6: {
      fontFamily: 'Poppins, sans-serif',
      fontWeight: 600,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: '8px',
          textTransform: 'none',
          fontWeight: 500,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: '16px',
          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: '16px',
        },
      },
    },
  },
});