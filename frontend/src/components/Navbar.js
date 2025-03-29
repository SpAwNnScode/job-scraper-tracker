import { AppBar, Toolbar, Typography, Button, Box } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import WorkIcon from '@mui/icons-material/Work';

function Navbar() {
  return (
    <AppBar position="static">
      <Toolbar>
        <WorkIcon sx={{ mr: 2 }} />
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          Job Tracker
        </Typography>
        <Box>
          <Button color="inherit" component={RouterLink} to="/">
            Dashboard
          </Button>
          <Button color="inherit" component={RouterLink} to="/jobs">
            Jobs
          </Button>
          <Button 
            color="inherit" 
            component={RouterLink} 
            to="/jobs/new"
            variant="outlined"
            sx={{ ml: 2 }}
          >
            Add Job
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
}

export default Navbar; 