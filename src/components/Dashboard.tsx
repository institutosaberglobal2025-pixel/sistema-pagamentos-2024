import { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  useTheme,
  Avatar,
} from '@mui/material';
import {
  Users,
  UserPlus,
  UsersRound,
  FileSpreadsheet,
  CreditCard,
  Menu as MenuIcon,
  ChevronLeft,
  LogOut,
  Home,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Groups from '../pages/Groups';
import { DashboardHome } from '../pages/DashboardHome';
import { Students } from '../pages/Students';
import Payments from '../pages/Payments';
import StudentPayments from '../pages/StudentPayments';
import { Reports } from '../pages/Reports';

const drawerWidth = 280;

export function Dashboard() {
  const [open, setOpen] = useState(window.innerWidth >= 600);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const theme = useTheme();
  const { isAdmin, signOut } = useAuth();

  useEffect(() => {
    const handleResize = () => {
      setOpen(window.innerWidth >= 600);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleDrawerToggle = () => {
    if (window.innerWidth < 600) {
      setMobileOpen(!mobileOpen);
    } else {
      setOpen(!open);
    }
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    if (window.innerWidth < 600) {
      setMobileOpen(false);
    }
  };

  const menuItems = [
    {
      text: 'Dashboard',
      icon: <Home size={24} />,
      path: '/dashboard/home',
    },
    {
      text: 'Grupos',
      icon: <UsersRound size={24} />,
      path: '/dashboard/groups',
    },
    {
      text: 'Alunos',
      icon: <Users size={24} />,
      path: '/dashboard/students',
    },
    {
      text: 'Planos de Pagamento',
      icon: <CreditCard size={24} />,
      path: '/dashboard/payments',
    },
    {
      text: 'Pagamentos',
      icon: <CreditCard size={24} />,
      path: '/dashboard/student-payments',
    },
    ...(isAdmin
      ? [
          {
            text: 'Relatórios',
            icon: <FileSpreadsheet size={24} />,
            path: '/dashboard/reports',
          },
        ]
      : []),
  ];

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Avatar
          src="https://i.imgur.com/LhHrGi1.jpeg"
          alt="Logo"
          sx={{ width: 40, height: 40 }}
        />
        <Typography
          variant="h6"
          noWrap
          component="div"
          sx={{ color: 'white', fontFamily: 'Poppins' }}
        >
          Saber Global
        </Typography>
      </Box>
      <Divider sx={{ bgcolor: 'rgba(255,255,255,0.12)' }} />
      <List sx={{ flex: 1, pt: 2 }}>
        {menuItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton
              onClick={() => handleNavigation(item.path)}
              sx={{
                py: 1.5,
                px: 3,
                '&:hover': {
                  backgroundColor: 'rgba(255,255,255,0.08)',
                },
              }}
            >
              <ListItemIcon sx={{ color: 'white', minWidth: 40 }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText
                primary={item.text}
                sx={{
                  '& .MuiListItemText-primary': {
                    color: 'white',
                    fontFamily: 'Inter',
                    fontWeight: 500,
                  },
                }}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      <Divider sx={{ bgcolor: 'rgba(255,255,255,0.12)' }} />
      <List>
        <ListItem disablePadding>
          <ListItemButton
            onClick={signOut}
            sx={{
              py: 1.5,
              px: 3,
              '&:hover': {
                backgroundColor: 'rgba(255,255,255,0.08)',
              },
            }}
          >
            <ListItemIcon sx={{ color: 'white', minWidth: 40 }}>
              <LogOut size={24} />
            </ListItemIcon>
            <ListItemText
              primary="Sair"
              sx={{
                '& .MuiListItemText-primary': {
                  color: 'white',
                  fontFamily: 'Inter',
                  fontWeight: 500,
                },
              }}
            />
          </ListItemButton>
        </ListItem>
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar
        position="fixed"
        sx={{
          display: { xs: 'block', sm: 'none' },
          bgcolor: 'white',
          boxShadow: 'none',
          borderBottom: '1px solid',
          borderColor: 'grey.200',
        }}
      >
        <Toolbar>
          <IconButton
            color="primary"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
          >
            <MenuIcon />
          </IconButton>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 1 }}>
            <Avatar
              src="https://i.imgur.com/LhHrGi1.jpeg"
              alt="Logo"
              sx={{ width: 32, height: 32 }}
            />
            <Typography
              variant="subtitle1"
              noWrap
              component="div"
              sx={{ color: 'primary.main', fontFamily: 'Poppins' }}
            >
              Saber Global
            </Typography>
          </Box>
        </Toolbar>
      </AppBar>

      <Box
        component="nav"
        sx={{
          width: { sm: drawerWidth },
          flexShrink: { sm: 0 },
        }}
      >
        {/* Mobile drawer */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile.
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
              bgcolor: 'primary.main',
            },
          }}
        >
          {drawer}
        </Drawer>

        {/* Desktop drawer */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
              bgcolor: 'primary.main',
              border: 'none',
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, sm: 3 },
          width: { xs: '100%', sm: `calc(100% - ${drawerWidth}px)` },
          bgcolor: 'background.default',
          mt: { xs: 8, sm: 0 },
          overflow: 'auto',
          minHeight: '100vh',
        }}
      >
        <Routes>
          <Route path="/" element={<Navigate to="home" replace />} />
          <Route path="home" element={<DashboardHome />} />
          <Route path="groups" element={<Groups />} />
              <Route path="students" element={<Students />} />
              <Route path="payments" element={<Payments />} />
              <Route path="student-payments" element={<StudentPayments />} />
              {isAdmin && <Route path="reports" element={<Reports />} />}
        </Routes>
      </Box>
    </Box>
  );
}