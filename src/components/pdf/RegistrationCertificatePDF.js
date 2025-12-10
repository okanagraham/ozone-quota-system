// src/components/pdf/RegistrationCertificatePDF.js
import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 10,
    fontFamily: 'Helvetica',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 4,
    borderTopColor: '#1E40AF',
    paddingTop: 10,
    marginBottom: 20,
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  countryName: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#1E40AF',
  },
  unitName: {
    fontSize: 10,
    color: '#666',
  },
  certificateTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'right',
  },
  certificateSubtitle: {
    fontSize: 9,
    textAlign: 'right',
    color: '#666',
    marginTop: 2,
    maxWidth: 250,
  },
  yearSection: {
    alignItems: 'flex-end',
    marginTop: 10,
  },
  yearLabel: {
    fontSize: 9,
    color: '#666',
  },
  yearValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#F59E0B',
  },
  certNoSection: {
    alignItems: 'flex-end',
    marginTop: 5,
  },
  certNoLabel: {
    fontSize: 8,
    color: '#666',
  },
  certNoValue: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  barcodeSection: {
    marginTop: 20,
    marginBottom: 20,
  },
  importerNoLabel: {
    fontSize: 8,
    marginBottom: 5,
  },
  barcodePlaceholder: {
    height: 40,
    backgroundColor: '#000',
    width: 120,
  },
  certifyText: {
    marginTop: 20,
    marginBottom: 30,
    fontSize: 10,
    lineHeight: 1.6,
  },
  boldText: {
    fontWeight: 'bold',
  },
  refrigerantsSection: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#1E40AF',
  },
  table: {
    marginTop: 10,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    paddingVertical: 8,
    paddingHorizontal: 5,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingVertical: 8,
    paddingHorizontal: 5,
  },
  tableCellHeader: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#374151',
    textTransform: 'uppercase',
  },
  tableCell: {
    fontSize: 9,
  },
  colRefrigerant: { width: '20%' },
  colChemical: { width: '35%' },
  colHsCode: { width: '20%' },
  colGwp: { width: '25%' },
  signatureSection: {
    marginTop: 'auto',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 15,
  },
  signatureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  signatureLabel: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 5,
  },
  signatureValue: {
    fontSize: 10,
  },
  signatureImage: {
    height: 50,
    width: 150,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    textAlign: 'center',
    fontSize: 8,
    color: '#666',
  },
});

const RegistrationCertificatePDF = ({ registration, user }) => {
  const refrigerants = registration.refrigerants || [];
  
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.countryName}>ST. VINCENT & THE GRENADINES</Text>
            <Text style={styles.unitName}>NATIONAL OZONE UNIT</Text>
            <Text style={styles.unitName}>Ministry of Health, Wellness and the Environment</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.certificateTitle}>CERTIFICATE OF REGISTRATION</Text>
            <Text style={styles.certificateSubtitle}>
              TO IMPORT OZONE DEPLETING SUBSTANCES AND ALTERNATIVES
            </Text>
          </View>
        </View>

        {/* Year and Certificate Number */}
        <View style={styles.yearSection}>
          <Text style={styles.yearLabel}>REGISTRATION YEAR</Text>
          <Text style={styles.yearValue}>{registration.year || 'N/A'}</Text>
        </View>

        <View style={styles.certNoSection}>
          <Text style={styles.certNoLabel}>CERTIFICATE NO:</Text>
          <Text style={styles.certNoValue}>
            SVG-NOU-{registration.year}-{String(registration.cert_no || 0).padStart(4, '0')}
          </Text>
        </View>

        {/* Importer Number */}
        <View style={styles.barcodeSection}>
          <Text style={styles.importerNoLabel}>
            IMPORTER NO: {user?.importer_number || 'N/A'}
          </Text>
          <View style={styles.barcodePlaceholder} />
        </View>

        {/* Certification Text */}
        <View style={styles.certifyText}>
          <Text>
            THIS IS TO CERTIFY THAT{' '}
            <Text style={styles.boldText}>
              {(registration.name || user?.enterprise_name || 'N/A').toUpperCase()}
            </Text>
            {' '}OF{' '}
            <Text style={styles.boldText}>
              {(user?.business_address || 'N/A').toUpperCase()}
            </Text>
            {' '}IS HEREBY REGISTERED AS AN IMPORTER OF OZONE DEPLETING SUBSTANCES 
            AND ALTERNATIVES FOR THE CALENDAR YEAR {registration.year}.
          </Text>
          <Text style={{ marginTop: 10 }}>
            THIS REGISTRATION IS VALID FROM JANUARY 1, {registration.year} TO 
            DECEMBER 31, {registration.year}.
          </Text>
        </View>

        {/* Approved Refrigerants Table */}
        <View style={styles.refrigerantsSection}>
          <Text style={styles.sectionTitle}>APPROVED CONTROLLED SUBSTANCES</Text>
          
          <View style={styles.table}>
            {/* Table Header */}
            <View style={styles.tableHeader}>
              <Text style={[styles.tableCellHeader, styles.colRefrigerant]}>ASHRAE</Text>
              <Text style={[styles.tableCellHeader, styles.colChemical]}>CHEMICAL NAME</Text>
              <Text style={[styles.tableCellHeader, styles.colHsCode]}>HS CODE</Text>
              <Text style={[styles.tableCellHeader, styles.colGwp]}>GWP VALUE</Text>
            </View>
            
            {/* Table Rows */}
            {refrigerants.map((ref, index) => (
              <View key={index} style={styles.tableRow}>
                <Text style={[styles.tableCell, styles.colRefrigerant]}>{ref.ashrae}</Text>
                <Text style={[styles.tableCell, styles.colChemical]}>{ref.refrigerant || ref.chemical_name}</Text>
                <Text style={[styles.tableCell, styles.colHsCode]}>{ref.hs_code}</Text>
                <Text style={[styles.tableCell, styles.colGwp]}>{ref.quota || ref.gwp_value}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Signature Section */}
        <View style={styles.signatureSection}>
          <View style={styles.signatureRow}>
            <View>
              <Text style={styles.signatureLabel}>AUTHORIZED BY</Text>
              <Text style={styles.signatureValue}>{registration.admin_name || 'N/A'}</Text>
            </View>
            <View>
              <Text style={styles.signatureLabel}>ROLE</Text>
              <Text style={styles.signatureValue}>{registration.admin_role || 'NOU Administrator'}</Text>
            </View>
            <View>
              <Text style={styles.signatureLabel}>DATE</Text>
              <Text style={styles.signatureValue}>
                {registration.admin_signature_date 
                  ? new Date(registration.admin_signature_date).toLocaleDateString()
                  : 'N/A'}
              </Text>
            </View>
          </View>
          <View>
            <Text style={styles.signatureLabel}>SIGNATURE</Text>
            {registration.admin_signature ? (
              <Image src={registration.admin_signature} style={styles.signatureImage} />
            ) : (
              <Text style={styles.signatureValue}>_______________________</Text>
            )}
          </View>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          National Ozone Unit • Ministry of Health, Wellness and the Environment • St. Vincent & The Grenadines
        </Text>
      </Page>
    </Document>
  );
};

export default RegistrationCertificatePDF;