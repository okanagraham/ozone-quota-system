import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  doc,
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
  Chip,
} from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import { 
  Visibility, 
  DescriptionOutlined,
  Receipt 
} from '@material-ui/icons';
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
  chipApproved: {
    backgroundColor: '#4caf50',
    color: 'white',
  },
  chipPending: {
    backgroundColor: '#ff9800',
    color: 'white',
  },
}));

const CustomsImports = () => {
  const classes = useStyles();
  const [imports, setImports] = useState([]);
  const [filteredImports, setFilteredImports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('approved');

  useEffect(() => {
    const fetchImports = async () => {
      try {
        // Query based on status filter
        let importsQuery;
        if (statusFilter === 'approved') {
          importsQuery = query(
            collection(db, 'imports'),
            where('approved', '==', true)
          );
        } else {
          // For 'all' view
          importsQuery = collection(db, 'imports');
        }
        
        const importsSnapshot = await getDocs(importsQuery);
        const importsData = [];
        
        for (const docSnapshot of importsSnapshot.docs) {
          const importData = docSnapshot.data();
          
          // Get registration data if available
          if (importData.registration) {
            try {
              const regDoc = await getDoc(importData.registration);
              if (regDoc.exists()) {
                importData.registrationData = regDoc.data();
              }
            } catch (err) {
              console.error("Error fetching registration", err);
            }
          }
          
          importsData.push({
            id: docSnapshot.id,
            ...importData,
          });
        }
        
        // Sort by submission date (newest first)
        importsData.sort((a, b) => {
          return (b.submission_date?.seconds || 0) - (a.submission_date?.seconds || 0);
        });
        
        setImports(importsData);
        setFilteredImports(importsData);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching imports:', error);
        setLoading(false);
      }
    };

    fetchImports();
  }, [statusFilter]);

  // Apply filters whenever search term or year filter changes
  useEffect(() => {
    filterImports();
  }, [searchTerm, yearFilter, imports]);

  const filterImports = () => {
    let filtered = [...imports];
    
    // Apply search term filter
    if (searchTerm) {
      const searchTermLower = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (imp) =>
          imp.name?.toLowerCase().includes(searchTermLower) ||
          imp.import_number?.toString().includes(searchTermLower)
      );
    }
    
    // Apply year filter
    if (yearFilter) {
      filtered = filtered.filter((imp) => imp.import_year === yearFilter);
    }
    
    setFilteredImports(filtered);
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

  const handleStatusFilterChange = (status) => {
    setStatusFilter(status);
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

  const viewImportLicense = (importId) => {
    // Open license in a new tab
    window.open(`/import-license/${importId}`, '_blank');
  };

  const viewInvoice = (url) => {
    if (url) {
      window.open(url, '_blank');
    }
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
        Import Licenses
      </Typography>
      
      {/* Search and Filter Controls */}
      <Grid container spacing={2} className={classes.searchBar}>
        <Grid item xs={12} sm={3}>
          <TextField
            fullWidth
            label="Search by name or number"
            variant="outlined"
            value={searchTerm}
            onChange={handleSearchChange}
          />
        </Grid>
        <Grid item xs={12} sm={3}>
          <TextField
            fullWidth
            label="Filter by year"
            variant="outlined"
            value={yearFilter}
            onChange={handleYearFilterChange}
          />
        </Grid>
        <Grid item xs={12} sm={3}>
          <Button
            variant="contained"
            color={statusFilter === 'approved' ? 'primary' : 'default'}
            onClick={() => handleStatusFilterChange('approved')}
            style={{ marginRight: 8, marginTop: 8 }}
          >
            Approved Only
          </Button>
          <Button
            variant="contained"
            color={statusFilter === 'all' ? 'primary' : 'default'}
            onClick={() => handleStatusFilterChange('all')}
            style={{ marginTop: 8 }}
          >
            View All
          </Button>
        </Grid>
        <Grid item xs={12} sm={3}>
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
                <TableCell>Import #</TableCell>
                <TableCell>Importer Name</TableCell>
                <TableCell>Year</TableCell>
                <TableCell>Submission Date</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredImports
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((importItem) => (
                  <TableRow key={importItem.id}>
                    <TableCell>{importItem.import_number || 'N/A'}</TableCell>
                    <TableCell>{importItem.name || 'N/A'}</TableCell>
                    <TableCell>{importItem.import_year || 'N/A'}</TableCell>
                    <TableCell>
                      {formatDate(importItem.submission_date)}
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={importItem.approved ? "Approved" : "Pending"} 
                        className={importItem.approved ? classes.chipApproved : classes.chipPending}
                      />
                    </TableCell>
                    <TableCell>
                      <Box display="flex">
                        {importItem.download_ready && (
                          <Tooltip title="View License">
                            <IconButton
                              color="primary"
                              onClick={() => viewImportLicense(importItem.id)}
                            >
                              <Visibility />
                            </IconButton>
                          </Tooltip>
                        )}
                        {importItem.invoice_uploaded && (
                          <Tooltip title="View Invoice">
                            <IconButton
                              color="secondary"
                              onClick={() => viewInvoice(importItem.invoice_url)}
                            >
                              <Receipt />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              {filteredImports.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    No imports found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={filteredImports.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>
    </div>
  );
};

export default CustomsImports;