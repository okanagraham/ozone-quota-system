import React, { useState, useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firebase';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
} from 'firebase/firestore';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Divider,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
} from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';

const useStyles = makeStyles((theme) => ({
  root: {
    flexGrow: 1,
    padding: theme.spacing(3),
  },
  card: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
  },
  cardContent: {
    flexGrow: 1,
  },
  title: {
    marginBottom: theme.spacing(2),
  },
  button: {
    marginTop: theme.spacing(2),
  },
  listItem: {
    borderBottom: '1px solid rgba(0, 0, 0, 0.12)',
    '&:last-child': {
      borderBottom: 'none',
    },
  },
  loading: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '50vh',
  },
}));

const CustomsDashboard = () => {
  const classes = useStyles();
  const history = useHistory();
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [recentRegistrations, setRecentRegistrations] = useState([]);
  const [recentImports, setRecentImports] = useState([]);
  const [stats, setStats] = useState({
    totalRegistrations: 0,
    totalImports: 0,
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch approved registrations
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
        
        setRecentRegistrations(registrationsData.slice(0, 5));
        
        // Fetch approved imports
        const importsQuery = query(
          collection(db, 'imports'),
          where('approved', '==', true)
        );
        const importsSnapshot = await getDocs(importsQuery);
        const importsData = [];
        
        for (const doc of importsSnapshot.docs) {
          const importData = doc.data();
          // Get registration data for each import
          if (importData.registration && importData.registration.path) {
            const regRef = doc.data().registration;
            const regDoc = await getDoc(regRef);
            
            if (regDoc.exists()) {
              importData.registrationData = regDoc.data();
            }
          }
          
          importsData.push({
            id: doc.id,
            ...importData,
          });
        }
        
        // Sort by submission date (newest first)
        importsData.sort((a, b) => {
          return b.submission_date?.seconds - a.submission_date?.seconds;
        });
        
        setRecentImports(importsData.slice(0, 5));
        
        // Set stats
        setStats({
          totalRegistrations: registrationsData.length,
          totalImports: importsData.length,
        });
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const navigateToRegistrations = () => {
    history.push('/customs/registrations');
  };

  const navigateToImports = () => {
    history.push('/customs/imports');
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
        Customs Dashboard
      </Typography>
      <Grid container spacing={3}>
        {/* Statistics Card */}
        <Grid item xs={12}>
          <Card className={classes.card}>
            <CardContent className={classes.cardContent}>
              <Typography variant="h5" component="h2">
                Statistics
              </Typography>
              <Divider style={{ margin: '16px 0' }} />
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="h6">
                    Total Approved Registrations: {stats.totalRegistrations}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="h6">
                    Total Approved Imports: {stats.totalImports}
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Registrations Card */}
        <Grid item xs={12} md={6}>
          <Card className={classes.card}>
            <CardContent className={classes.cardContent}>
              <Typography variant="h5" component="h2">
                Recent Approved Registrations
              </Typography>
              <Divider style={{ margin: '16px 0' }} />
              {recentRegistrations.length > 0 ? (
                <List>
                  {recentRegistrations.map((reg) => (
                    <ListItem key={reg.id} className={classes.listItem}>
                      <ListItemText
                        primary={reg.name}
                        secondary={`Certificate #: ${reg.cert_no} | Year: ${reg.year}`}
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography variant="body1">
                  No approved registrations found.
                </Typography>
              )}
              <Button
                variant="contained"
                color="primary"
                className={classes.button}
                onClick={navigateToRegistrations}
              >
                View All Registrations
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Imports Card */}
        <Grid item xs={12} md={6}>
          <Card className={classes.card}>
            <CardContent className={classes.cardContent}>
              <Typography variant="h5" component="h2">
                Recent Approved Imports
              </Typography>
              <Divider style={{ margin: '16px 0' }} />
              {recentImports.length > 0 ? (
                <List>
                  {recentImports.map((imp) => (
                    <ListItem key={imp.id} className={classes.listItem}>
                      <ListItemText
                        primary={imp.name}
                        secondary={`Import #: ${imp.import_number} | Year: ${imp.import_year}`}
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography variant="body1">
                  No approved imports found.
                </Typography>
              )}
              <Button
                variant="contained"
                color="primary"
                className={classes.button}
                onClick={navigateToImports}
              >
                View All Imports
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </div>
  );
};

export default CustomsDashboard;