// src/components/pdf/ImportLicensePDF.js
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
    borderTopColor: '#059669',
    paddingTop: 10,
    marginBottom: 15,
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
    color: '#059669',
  },
  unitName: {
    fontSize: 10,
    color: '#666',
  },
  licenseTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'right',
  },
  licenseSubtitle: {
    fontSize: 8,
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
    fontSize: 8,
    color: '#666',
  },
  yearValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#059669',
  },
  licenseNoSection: {
    alignItems: 'flex-end',
    marginTop: 5,
  },
  licenseNoLabel: {
    fontSize: 8,
    color: '#666',
  },
  licenseNoValue: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  infoSection: {
    marginTop: 15,
    padding: 10,
    backgroundColor: '#F9FAFB',
    borderRadius: 4,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  infoLabel: {
    width: 120,
    fontSize: 8,
    color: '#666',
    fontWeight: 'bold',
  },
  infoValue: {
    flex: 1,
    fontSize: 9,
  },
  certifyText: {
    marginTop: 15,
    marginBottom: 15,
    fontSize: 9,
    lineHeight: 1.6,
  },
  boldText: {
    fontWeight: 'bold',
  },
  itemsSection: {
    marginTop: 15,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#059669',
  },
  table: {
    marginTop: 5,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#ECFDF5',
    borderBottomWidth: 1,
    borderBottomColor: '#059669',
    paddingVertical: 6,
    paddingHorizontal: 3,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingVertical: 6,
    paddingHorizontal: 3,
  },
  tableCellHeader: {
    fontSize: 7,
    fontWeight: 'bold',
    color: '#065F46',
    textTransform: 'uppercase',
  },
  tableCell: {
    fontSize: 8,
  },
  colAshrae: { width: '12%' },
  colChemical: { width: '22%' },
  colHsCode: { width: '10%' },
  colQty: { width: '8%' },
  colVolume: { width: '10%' },
  colUnit: { width: '8%' },
  colCountry: { width: '15%' },
  colCo2: { width: '15%' },
  totalsSection: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#ECFDF5',
    borderRadius: 4,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  totalLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#065F46',
  },
  totalValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#059669',
  },
  signatureSection: {
    marginTop: 'auto',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 12,
  },
  signatureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  signatureLabel: {
    fontSize: 7,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 3,
  },
  signatureValue: {
    fontSize: 9,
  },
  signatureImage: {
    height: 45,
    width: 130,
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
  inspectionNote: {
    marginTop: 10,
    padding: 8,
    backgroundColor: '#FEF3C7',
    borderRadius: 4,
  },
  inspectionText: {
    fontSize: 8,
    color: '#92400E',
  },
});

const ImportLicensePDF = ({ importData, user, registration }) => {
  const items = importData.imported_items || [];
  
  // Calculate total CO2 equivalent
  const totalCO2 = items.reduce((sum, item) => {
    return sum + (parseFloat(item.co2_equivalent) || 0);
  }, 0);

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
            <Text style={styles.licenseTitle}>IMPORT LICENSE</Text>
            <Text style={styles.licenseSubtitle}>
              OZONE DEPLETING SUBSTANCES AND ALTERNATIVES
            </Text>
          </View>
        </View>

        {/* Year and License Number */}
        <View style={styles.yearSection}>
          <Text style={styles.yearLabel}>IMPORT YEAR</Text>
          <Text style={styles.yearValue}>{importData.import_year || 'N/A'}</Text>
        </View>

        <View style={styles.licenseNoSection}>
          <Text style={styles.licenseNoLabel}>LICENSE NO:</Text>
          <Text style={styles.licenseNoValue}>
            SVG-IMP-{importData.import_year}-{String(importData.import_number || 0).padStart(4, '0')}
          </Text>
        </View>

        {/* Importer Information */}
        <View style={styles.infoSection}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>IMPORTER:</Text>
            <Text style={styles.infoValue}>{importData.name || user?.enterprise_name || 'N/A'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>REGISTRATION CERT:</Text>
            <Text style={styles.infoValue}>
              {registration?.cert_no ? `SVG-NOU-${registration.year}-${String(registration.cert_no).padStart(4, '0')}` : 'N/A'}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>SUBMISSION DATE:</Text>
            <Text style={styles.infoValue}>
              {importData.submission_date ? new Date(importData.submission_date).toLocaleDateString() : 'N/A'}
            </Text>
          </View>
          {importData.inspection_date && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>INSPECTION DATE:</Text>
              <Text style={styles.infoValue}>
                {new Date(importData.inspection_date).toLocaleDateString()}
              </Text>
            </View>
          )}
        </View>

        {/* Certification Text */}
        <View style={styles.certifyText}>
          <Text>
            THIS LICENSE AUTHORIZES{' '}
            <Text style={styles.boldText}>
              {(importData.name || user?.enterprise_name || 'N/A').toUpperCase()}
            </Text>
            {' '}TO IMPORT THE FOLLOWING OZONE DEPLETING SUBSTANCES AND ALTERNATIVES 
            INTO ST. VINCENT AND THE GRENADINES FOR THE CALENDAR YEAR {importData.import_year}.
          </Text>
        </View>

        {/* Import Items Table */}
        <View style={styles.itemsSection}>
          <Text style={styles.sectionTitle}>LICENSED IMPORT ITEMS</Text>
          
          <View style={styles.table}>
            {/* Table Header */}
            <View style={styles.tableHeader}>
              <Text style={[styles.tableCellHeader, styles.colAshrae]}>ASHRAE</Text>
              <Text style={[styles.tableCellHeader, styles.colChemical]}>SUBSTANCE</Text>
              <Text style={[styles.tableCellHeader, styles.colHsCode]}>HS CODE</Text>
              <Text style={[styles.tableCellHeader, styles.colQty]}>QTY</Text>
              <Text style={[styles.tableCellHeader, styles.colVolume]}>VOLUME</Text>
              <Text style={[styles.tableCellHeader, styles.colUnit]}>UNIT</Text>
              <Text style={[styles.tableCellHeader, styles.colCountry]}>ORIGIN</Text>
              <Text style={[styles.tableCellHeader, styles.colCo2]}>CO2 EQ.</Text>
            </View>
            
            {/* Table Rows */}
            {items.map((item, index) => (
              <View key={index} style={styles.tableRow}>
                <Text style={[styles.tableCell, styles.colAshrae]}>{item.ashrae}</Text>
                <Text style={[styles.tableCell, styles.colChemical]}>{item.cs_name || item.chemical_name}</Text>
                <Text style={[styles.tableCell, styles.colHsCode]}>{item.hs_code}</Text>
                <Text style={[styles.tableCell, styles.colQty]}>{item.quantity}</Text>
                <Text style={[styles.tableCell, styles.colVolume]}>{item.volume}</Text>
                <Text style={[styles.tableCell, styles.colUnit]}>{item.designation}</Text>
                <Text style={[styles.tableCell, styles.colCountry]}>{item.export_country}</Text>
                <Text style={[styles.tableCell, styles.colCo2]}>{item.co2_equivalent}</Text>
              </View>
            ))}
          </View>

          {/* Totals */}
          <View style={styles.totalsSection}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>TOTAL CO2 EQUIVALENT:</Text>
              <Text style={styles.totalValue}>{totalCO2.toFixed(2)} CO2eq</Text>
            </View>
          </View>
        </View>

        {/* Inspection Note */}
        {importData.inspected && (
          <View style={styles.inspectionNote}>
            <Text style={styles.inspectionText}>
              ✓ This shipment has been inspected and verified by the National Ozone Unit.
            </Text>
          </View>
        )}

        {/* Signature Section */}
        <View style={styles.signatureSection}>
          <View style={styles.signatureRow}>
            <View>
              <Text style={styles.signatureLabel}>AUTHORIZED BY</Text>
              <Text style={styles.signatureValue}>{importData.admin_name || 'N/A'}</Text>
            </View>
            <View>
              <Text style={styles.signatureLabel}>ROLE</Text>
              <Text style={styles.signatureValue}>{importData.admin_role || 'NOU Administrator'}</Text>
            </View>
            <View>
              <Text style={styles.signatureLabel}>APPROVAL DATE</Text>
              <Text style={styles.signatureValue}>
                {importData.admin_signature_date 
                  ? new Date(importData.admin_signature_date).toLocaleDateString()
                  : 'N/A'}
              </Text>
            </View>
          </View>
          <View>
            <Text style={styles.signatureLabel}>SIGNATURE</Text>
            {importData.admin_signature ? (
              <Image src={importData.admin_signature} style={styles.signatureImage} />
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

export default ImportLicensePDF;