import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
} from 'firebase/firestore';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  CircularProgress,
  TextField,
  Button,
  Grid,
  IconButton,
  Tooltip,
} from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import { Visibility } from '@material-ui/icons';
import { format } from 'date-fns';

const useStyles = makeStyles((theme) => ({
  root: {
    flexGrow: 1,
    padding: theme.spacing(3),
  },
  paper: {
    width: '100%',
    marginBottom: theme.spacing(2),
  },
  table: {
    minWidth: 750,
  },
  tableHead: {
    backgroundColor: theme.palette.primary.light,
    '& .MuiTableCell-head': {
      color: theme.palette.common.white,
      fontWeight: 'bold',
    },
  },
  searchBar: {
    marginBottom: theme.spacing(3),
  },
  loading: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '50vh',
  },
  title: {
    marginBottom: theme.spacing(2),
  },
}));

const CustomsRegistrations = () => {
  const classes = useStyles();
  const [registrations, setRegistrations] = useState([]);
  const [filteredRegistrations, setFilteredRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [yearFilter, setYearFilter] = useState('');

  useEffect(() => {
    const fetchRegistrations = async () => {
      try {
        // Fetch only completed/approved registrations
        const registrationsQuery = query(
          collection(db, 'registrations'),
          where('completed', '==', true),
          where('status', '==', 'complete')
        );
        const registrationsSnapshot = await getDocs(registrationsQuery);
        const registrationsData = [];
        
        registrationsSnapshot.forEach((doc) => {
          registrationsData.push({
            id: doc.id,
            ...doc.data(),
          });
        });
        
        // Sort by date (newest first)
        registrationsData.sort((a, b) => {
          return b.admin_signature_date?.seconds - a.admin_signature_date?.seconds;
        });
        
        setRegistrations(registrationsData);
        setFilteredRegistrations(registrationsData);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching registrations:', error);
        setLoading(false);
      }
    };

    fetchRegistrations();
  }, []);

  // Apply filters whenever search term or year filter changes
  useEffect(() => {
    filterRegistrations();
  }, [searchTerm, yearFilter, registrations]);

  const filterRegistrations = () => {
    let filtered = [...registrations];
    
    // Apply search term filter
    if (searchTerm) {
      const searchTermLower = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (reg) =>
          reg.name?.toLowerCase().includes(searchTermLower) ||
          reg.cert_no?.toString().includes(searchTermLower)
      );
    }
    
    // Apply year filter
    if (yearFilter) {
      filtered = filtered.filter((reg) => reg.year === yearFilter);
    }
    
    setFilteredRegistrations(filtered);
    setPage(0); // Reset to first page when filtering
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
  };

  const handleYearFilterChange = (event) => {
    setYearFilter(event.target.value);
  };

  const resetFilters = () => {
    setSearchTerm('');
    setYearFilter('');
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp.seconds * 1000);
    return format(date, 'MMM dd, yyyy');
  };

  const viewRegistrationCertificate = (registrationId) => {
    // Open certificate in a new tab
    window.open(`/registration-certificate/${registrationId}`, '_blank');
  };

  if (loading) {
    return (
      <div className={classes.loading}>
        <CircularProgress />
      </div>
    );
  }

  return (
    <div className={classes.root}>
      <Typography variant="h4" className={classes.title}>
        Approved Registrations
      </Typography>
      
      {/* Search and Filter Controls */}
      <Grid container spacing={2} className={classes.searchBar}>
        <Grid item xs={12} sm={4}>
          <TextField
            fullWidth
            label="Search by name or certificate number"
            variant="outlined"
            value={searchTerm}
            onChange={handleSearchChange}
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField
            fullWidth
            label="Filter by year"
            variant="outlined"
            value={yearFilter}
            onChange={handleYearFilterChange}
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <Button
            variant="contained"
            color="secondary"
            onClick={resetFilters}
            style={{ marginTop: 8 }}
          >
            Reset Filters
          </Button>
        </Grid>
      </Grid>
      
      <Paper className={classes.paper}>
        <TableContainer>
          <Table className={classes.table} size="medium">
            <TableHead className={classes.tableHead}>
              <TableRow>
                <TableCell>Certificate #</TableCell>
                <TableCell>Importer Name</TableCell>
                <TableCell>Year</TableCell>
                <TableCell>Approval Date</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredRegistrations
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((registration) => (
                  <TableRow key={registration.id}>
                    <TableCell>{registration.cert_no || 'N/A'}</TableCell>
                    <TableCell>{registration.name || 'N/A'}</TableCell>
                    <TableCell>{registration.year || 'N/A'}</TableCell>
                    <TableCell>
                      {formatDate(registration.admin_signature_date)}
                    </TableCell>
                    <TableCell>
                      {registration.download_ready && (
                        <Tooltip title="View Certificate">
                          <IconButton
                            color="primary"
                            onClick={() => viewRegistrationCertificate(registration.id)}
                          >
                            <Visibility />
                          </IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              {filteredRegistrations.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    No registrations found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={filteredRegistrations.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>
    </div>
  );
};

export default CustomsRegistrations;