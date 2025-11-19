import React, { useState, useEffect } from 'react';
import { useParams, useHistory } from 'react-router-dom';
import { db } from '../../firebase';
import {
  doc,
  getDoc,
} from 'firebase/firestore';
import {
  Box,
  Paper,
  Typography,
  Divider,
  Grid,
  Button,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Card,
  CardContent,
  Chip,
} from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import { format } from 'date-fns';
import {
  ArrowBack,
  Receipt,
  InsertDriveFile,
} from '@material-ui/icons';

const useStyles = makeStyles((theme) => ({
  root: {
    flexGrow: 1,
    padding: theme.spacing(3),
  },
  paper: {
    padding: theme.spacing(3),
    marginBottom: theme.spacing(3),
  },
  title: {
    marginBottom: theme.spacing(2),
  },
  divider: {
    margin: theme.spacing(2, 0),
  },
  loading: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '50vh',
  },
  button: {
    margin: theme.spacing(1),
  },
  detailsTable: {
    marginTop: theme.spacing(2),
  },
  detailRow: {
    '& > td': {
      borderBottom: 'none',
      padding: theme.spacing(1),
    },
    '& > th': {
      borderBottom: 'none',
      padding: theme.spacing(1),
      fontWeight: 'bold',
    },
  },
  chip: {
    margin: theme.spacing(0.5),
  },
  chipApproved: {
    backgroundColor: '#4caf50',
    color: 'white',
  },
  chipPending: {
    backgroundColor: '#ff9800',
    color: 'white',
  },
  tableTitle: {
    marginTop: theme.spacing(3),
    marginBottom: theme.spacing(1),
  },
}));

const CustomsImportDetails = () => {
  const classes = useStyles();
  const { id } = useParams();
  const history = useHistory();
  const [loading, setLoading] = useState(true);
  const [importData, setImportData] = useState(null);
  const [registrationData, setRegistrationData] = useState(null);

  useEffect(() => {
    const fetchImportData = async () => {
      try {
        const importRef = doc(db, 'imports', id);
        const importSnap = await getDoc(importRef);
        
        if (importSnap.exists()) {
          const data = importSnap.data();
          setImportData({
            id: importSnap.id,
            ...data,
          });
          
          // Fetch registration data if available
          if (data.registration) {
            try {
              const regSnap = await getDoc(data.registration);
              if (regSnap.exists()) {
                setRegistrationData({
                  id: regSnap.id,
                  ...regSnap.data(),
                });
              }
            } catch (error) {
              console.error('Error fetching registration data:', error);
            }
          }
        } else {
          console.log('No such import document!');
          history.push('/customs/imports');
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching import data:', error);
        setLoading(false);
      }
    };

    fetchImportData();
  }, [id, history]);

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp.seconds * 1000);
    return format(date, 'MMM dd, yyyy');
  };

  const viewDocument = (url) => {
    if (url) {
      window.open(url, '_blank');
    }
  };

  const viewImportLicense = () => {
    if (importData && importData.download_ready) {
      window.open(`/import-license/${importData.id}`, '_blank');
    }
  };

  const goBack = () => {
    history.goBack();
  };

  const calculateTotalCO2 = (items) => {
    if (!items || !items.length) return 0;
    return items.reduce((total, item) => {
      const co2Value = parseFloat(item.co2_equivalent) || 0;
      return total + co2Value;
    }, 0).toFixed(2);
  };

  if (loading) {
    return (
      <div className={classes.loading}>
        <CircularProgress />
      </div>
    );
  }

  if (!importData) {
    return (
      <div className={classes.root}>
        <Typography variant="h6">Import data not found.</Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<ArrowBack />}
          onClick={goBack}
          className={classes.button}
        >
          Back to Imports
        </Button>
      </div>
    );
  }

  return (
    <div className={classes.root}>
      <Button
        variant="contained"
        color="primary"
        startIcon={<ArrowBack />}
        onClick={goBack}
        className={classes.button}
      >
        Back to Imports
      </Button>
      
      <Typography variant="h4" className={classes.title}>
        Import Details - #{importData.import_number}
      </Typography>
      
      <Paper className={classes.paper}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Typography variant="h6">Import Information</Typography>
            <Divider className={classes.divider} />
            <TableContainer>
              <Table size="small">
                <TableBody>
                  <TableRow className={classes.detailRow}>
                    <TableCell component="th">Import Number:</TableCell>
                    <TableCell>{importData.import_number || 'N/A'}</TableCell>
                  </TableRow>
                  <TableRow className={classes.detailRow}>
                    <TableCell component="th">Status:</TableCell>
                    <TableCell>
                      <Chip 
                        label={importData.approved ? "Approved" : "Pending"} 
                        className={importData.approved ? classes.chipApproved : classes.chipPending}
                      />
                    </TableCell>
                  </TableRow>
                  <TableRow className={classes.detailRow}>
                    <TableCell component="th">Import Year:</TableCell>
                    <TableCell>{importData.import_year || 'N/A'}</TableCell>
                  </TableRow>
                  <TableRow className={classes.detailRow}>
                    <TableCell component="th">Submission Date:</TableCell>
                    <TableCell>{formatDate(importData.submission_date)}</TableCell>
                  </TableRow>
                  <TableRow className={classes.detailRow}>
                    <TableCell component="th">Shipment Arrived:</TableCell>
                    <TableCell>{importData.arrived ? 'Yes' : 'No'}</TableCell>
                  </TableRow>
                  {importData.inspection_date && (
                    <TableRow className={classes.detailRow}>
                      <TableCell component="th">Inspection Date:</TableCell>
                      <TableCell>{formatDate(importData.inspection_date)}</TableCell>
                    </TableRow>
                  )}
                  {importData.approved && (
                    <TableRow className={classes.detailRow}>
                      <TableCell component="th">Approval Date:</TableCell>
                      <TableCell>{formatDate(importData.admin_signature_date)}</TableCell>
                    </TableRow>
                  )}
                  <TableRow className={classes.detailRow}>
                    <TableCell component="th">Total CO2 Equivalent:</TableCell>
                    <TableCell>{calculateTotalCO2(importData.imported_items)} tons</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Typography variant="h6">Importer Information</Typography>
            <Divider className={classes.divider} />
            <TableContainer>
              <Table size="small">
                <TableBody>
                  <TableRow className={classes.detailRow}>
                    <TableCell component="th">Name:</TableCell>
                    <TableCell>{importData.name || 'N/A'}</TableCell>
                  </TableRow>
                  {registrationData && (
                    <>
                      <TableRow className={classes.detailRow}>
                        <TableCell component="th">Registration Certificate:</TableCell>
                        <TableCell>{registrationData.cert_no || 'N/A'}</TableCell>
                      </TableRow>
                      <TableRow className={classes.detailRow}>
                        <TableCell component="th">Registration Year:</TableCell>
                        <TableCell>{registrationData.year || 'N/A'}</TableCell>
                      </TableRow>
                    </>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            
            <Box mt={3}>
              <Typography variant="h6">Documents</Typography>
              <Divider className={classes.divider} />
              <Box display="flex" flexDirection="column">
                {importData.invoice_uploaded && (
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<Receipt />}
                    onClick={() => viewDocument(importData.invoice_url)}
                    className={classes.button}
                  >
                    View Invoice
                  </Button>
                )}
                {importData.download_ready && (
                  <Button
                    variant="contained"
                    color="secondary"
                    startIcon={<InsertDriveFile />}
                    onClick={viewImportLicense}
                    className={classes.button}
                  >
                    View Import License
                  </Button>
                )}
              </Box>
            </Box>
          </Grid>
        </Grid>
        
        <Typography variant="h6" className={classes.tableTitle}>
          Imported Items
        </Typography>
        <Divider className={classes.divider} />
        
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Item</TableCell>
                <TableCell>HS Code</TableCell>
                <TableCell>Origin</TableCell>
                <TableCell>Quantity</TableCell>
                <TableCell>Volume</TableCell>
                <TableCell>Unit</TableCell>
                <TableCell>CO2 Equivalent</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {importData.imported_items && importData.imported_items.map((item, index) => (
                <TableRow key={index}>
                  <TableCell>{item.ashrae} - {item.cs_name}</TableCell>
                  <TableCell>{item.hs_code}</TableCell>
                  <TableCell>{item.export_country}</TableCell>
                  <TableCell>{item.quantity}</TableCell>
                  <TableCell>{item.volume}</TableCell>
                  <TableCell>{item.designation}</TableCell>
                  <TableCell>{item.co2_equivalent}</TableCell>
                </TableRow>
              ))}
              {(!importData.imported_items || importData.imported_items.length === 0) && (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    No items found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </div>
  );
};

export default CustomsImportDetails;