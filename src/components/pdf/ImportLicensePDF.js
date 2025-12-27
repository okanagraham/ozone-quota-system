// src/components/pdf/ImportLicensePDF.js
import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  Svg,
  Rect,
} from '@react-pdf/renderer';

// Barcode generation utility - creates Code39 barcode as SVG paths
const generateCode39Barcode = (text) => {
  const CODE39_CHARS = {
    '0': 'nnnwwnwnn', '1': 'wnnwnnnnw', '2': 'nnwwnnnnw', '3': 'wnwwnnnnn',
    '4': 'nnnwwnnnw', '5': 'wnnwwnnnn', '6': 'nnwwwnnnn', '7': 'nnnwnnwnw',
    '8': 'wnnwnnwnn', '9': 'nnwwnnwnn', 'A': 'wnnnnwnnw', 'B': 'nnwnnwnnw',
    'C': 'wnwnnwnnn', 'D': 'nnnnwwnnw', 'E': 'wnnnwwnnn', 'F': 'nnwnwwnnn',
    'G': 'nnnnnwwnw', 'H': 'wnnnnwwnn', 'I': 'nnwnnwwnn', 'J': 'nnnnwwwnn',
    'K': 'wnnnnnnww', 'L': 'nnwnnnnww', 'M': 'wnwnnnnwn', 'N': 'nnnnwnnww',
    'O': 'wnnnwnnwn', 'P': 'nnwnwnnwn', 'Q': 'nnnnnnwww', 'R': 'wnnnnnwwn',
    'S': 'nnwnnnwwn', 'T': 'nnnnwnwwn', 'U': 'wwnnnnnnw', 'V': 'nwwnnnnnw',
    'W': 'wwwnnnnnn', 'X': 'nwnnwnnnw', 'Y': 'wwnnwnnnn', 'Z': 'nwwnwnnnn',
    '-': 'nwnnnnwnw', '.': 'wwnnnnwnn', ' ': 'nwwnnnwnn', '*': 'nwnnwnwnn',
    ':': 'nwnwnwnnn', '/': 'nwnwnnnwn', '+': 'nwnnnwnwn', '%': 'nnnwnwnwn',
  };

// Create styles
const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 10,
    fontFamily: 'Helvetica',
  },
  border: {
    border: '1pt solid #333333',
    padding: 20,
    minHeight: '95%',
  },
  // Flag colors header line
  flagLineContainer: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  flagLineBlue: {
    width: 50,
    height: 5,
    backgroundColor: '#0072C6',
  },
  flagLineYellow: {
    width: 50,
    height: 5,
    backgroundColor: '#FCD116',
  },
  flagLineGreen: {
    width: 50,
    height: 5,
    backgroundColor: '#009E60',
  },
  // Header section
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  countryName: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#444444',
  },
  unitName: {
    fontSize: 9,
    color: '#444444',
  },
  licenseTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#444444',
    textAlign: 'right',
  },
  licenseSubtitle: {
    fontSize: 9,
    color: '#444444',
    textAlign: 'right',
    marginTop: 2,
  },
  yearLabel: {
    fontSize: 9,
    color: '#444444',
    textAlign: 'right',
    marginTop: 5,
  },
  yearValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#009E60',
    textAlign: 'right',
  },
  licenseNoText: {
    fontSize: 6,
    color: '#444444',
    textAlign: 'right',
    marginTop: 5,
  },
  barcodeContainer: {
    marginTop: 5,
    alignItems: 'flex-end',
  },
  importerBarcodeContainer: {
    marginTop: 5,
    marginBottom: 10,
  },
  // Importer info section
  importerSection: {
    marginTop: 20,
    marginBottom: 20,
  },
  importerNoLabel: {
    fontSize: 6,
    color: '#444444',
  },
  certificationText: {
    fontSize: 10,
    color: '#444444',
    marginTop: 15,
    lineHeight: 1.5,
  },
  certificationBold: {
    fontWeight: 'bold',
  },
  // Items table
  itemsSection: {
    marginTop: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
    paddingBottom: 5,
    marginBottom: 5,
  },
  tableHeaderText: {
    fontSize: 6,
    fontWeight: 'bold',
    color: '#444444',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 3,
    borderBottomWidth: 0.5,
    borderBottomColor: '#eeeeee',
  },
  // Column widths for import items
  colCsName: { width: '12%' },
  colHsCode: { width: '10%' },
  colQty: { width: '8%' },
  colVolume: { width: '12%' },
  colMt: { width: '10%' },
  colChemical: { width: '20%' },
  colCo2: { width: '12%' },
  colCountry: { width: '16%' },
  tableCell: {
    fontSize: 7,
    color: '#444444',
  },
  // Footer/Signature section
  footerSection: {
    position: 'absolute',
    bottom: 50,
    left: 30,
    right: 30,
    border: '1pt solid #bfbfbf',
    padding: 15,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  footerLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#444444',
  },
  footerValue: {
    fontSize: 10,
    color: '#444444',
    marginTop: 5,
  },
  signatureImage: {
    width: 150,
    height: 50,
    objectFit: 'contain',
  },
  // Watermark
  watermark: {
    position: 'absolute',
    top: '40%',
    left: '30%',
    fontSize: 60,
    color: '#eeeeee',
    opacity: 0.3,
    transform: 'rotate(-45deg)',
  },
  // Totals row
  totalsRow: {
    flexDirection: 'row',
    paddingVertical: 5,
    borderTopWidth: 1,
    borderTopColor: '#333333',
    marginTop: 5,
  },
  totalsLabel: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#444444',
  },
  totalsValue: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#009E60',
  },
});

// Unit conversion helper
const convertToMetricTons = (quantity, volume, unit) => {
  const qty = parseFloat(quantity) || 0;
  const vol = parseFloat(volume) || 0;
  const totalMass = qty * vol;
  
  const conversionFactors = {
    'g': 0.000001,
    'kg': 0.001,
    'lb': 0.000453592,
    'oz': 0.0000283495,
    'ton': 1,
    'mt': 1,
  };
  
  const factor = conversionFactors[unit?.toLowerCase()] || 0.001;
  return (totalMass * factor).toFixed(4);
};

const ImportLicensePDF = ({ importData, user }) => {
  const formatDate = (date) => {
    if (!date) return 'N/A';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const importedItems = importData?.imported_items || [];
  
  // Calculate total CO2 equivalent
  const totalCO2 = importedItems.reduce((sum, item) => {
    return sum + (parseFloat(item.co2_equivalent) || 0);
  }, 0);

  // Generate barcodes
  const pdf417Pattern = generatePDF417Visual(importData?.id || 'default');

  // Code39 Barcode Component
  const Code39Barcode = ({ data, width = 80, height = 25 }) => {
    const barcode = generateCode39Barcode(String(data));
    
    return (
      <Svg width={width} height={height} viewBox={`0 0 ${barcode.totalWidth} ${height}`}>
        {barcode.bars.map((bar, i) => (
          <Rect
            key={i}
            x={bar.x}
            y={0}
            width={bar.width}
            height={height}
            fill="#000000"
          />
        ))}
      </Svg>
    );
  };

  // PDF417-style Barcode Component
  const PDF417Barcode = ({ pattern, width = 130, height = 30 }) => {
    const cellWidth = width / 20;
    const cellHeight = height / pattern.length;
    
    return (
      <Svg width={width} height={height}>
        {pattern.map((row, rowIdx) => (
          row.map((filled, colIdx) => (
            filled && (
              <Rect
                key={`${rowIdx}-${colIdx}`}
                x={colIdx * cellWidth}
                y={rowIdx * cellHeight}
                width={cellWidth - 0.5}
                height={cellHeight - 0.5}
                fill="#000000"
              />
            )
          ))
        ))}
      </Svg>
    );
  };

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <View style={styles.border}>
          {/* Flag color lines */}
          <View style={styles.flagLineContainer}>
            <View style={styles.flagLineBlue} />
            <View style={styles.flagLineYellow} />
            <View style={styles.flagLineGreen} />
          </View>

          {/* Header */}
          <View style={styles.headerContainer}>
            <View style={styles.headerLeft}>
              <Text style={styles.countryName}>ST. VINCENT & THE GRENADINES</Text>
              <Text style={styles.unitName}>NATIONAL OZONE UNIT</Text>
            </View>
            <View style={styles.headerRight}>
              <Text style={styles.licenseTitle}>LICENSE TO IMPORT</Text>
              <Text style={styles.licenseSubtitle}>
                CONTROLLED SUBSTANCES / CONTROLLED SUBSTANCES ALTERNATIVES
              </Text>
              <Text style={styles.yearLabel}>#</Text>
              <Text style={styles.yearValue}>{importData?.import_year || new Date().getFullYear()}</Text>
              <Text style={styles.licenseNoText}>
                LICENSE NO: {importData?.import_year} - {importData?.import_number || 'N/A'}
              </Text>
              {/* PDF417-style barcode */}
              <View style={styles.barcodeContainer}>
                <PDF417Barcode pattern={pdf417Pattern} width={130} height={30} />
              </View>
            </View>
          </View>

          {/* Importer Information */}
          <View style={styles.importerSection}>
            <Text style={styles.importerNoLabel}>IMPORTER NO: {user?.importer_number || 'N/A'}</Text>
            {/* Code39 barcode for importer number */}
            <View style={styles.importerBarcodeContainer}>
              <Code39Barcode data={user?.importer_number || '0000'} width={80} height={20} />
            </View>
            <View style={{ marginTop: 10 }}>
              <Text style={styles.certificationText}>
                THIS CERTIFIES THAT{' '}
                <Text style={styles.certificationBold}>
                  {(user?.displayName || user?.display_name || 'N/A').toUpperCase()}
                </Text>{' '}
                OF{' '}
                <Text style={styles.certificationBold}>
                  {(user?.enterprise_name || 'N/A').toUpperCase()}
                </Text>{' '}
                AT{' '}
                <Text style={styles.certificationBold}>
                  {(user?.business_address || 'N/A').toUpperCase()}
                </Text>{' '}
                IS GRANTED A LICENSE TO IMPORT THE FOLLOWING CONTROLLED SUBSTANCES (CSs) / CONTROLLED SUBSTANCES ALTERNATIVES (CSAs):
              </Text>
            </View>
          </View>

          {/* Items Table */}
          <View style={styles.itemsSection}>
            {/* Table Header */}
            <View style={styles.tableHeader}>
              <View style={styles.colCsName}>
                <Text style={styles.tableHeaderText}>CS/CSA NAME</Text>
              </View>
              <View style={styles.colHsCode}>
                <Text style={styles.tableHeaderText}>HS CODE</Text>
              </View>
              <View style={styles.colQty}>
                <Text style={styles.tableHeaderText}>QTY</Text>
              </View>
              <View style={styles.colVolume}>
                <Text style={styles.tableHeaderText}>VOLUME</Text>
              </View>
              <View style={styles.colMt}>
                <Text style={styles.tableHeaderText}>MT</Text>
              </View>
              <View style={styles.colChemical}>
                <Text style={styles.tableHeaderText}>CHEMICAL NAME</Text>
              </View>
              <View style={styles.colCo2}>
                <Text style={styles.tableHeaderText}>CO2e USED</Text>
              </View>
              <View style={styles.colCountry}>
                <Text style={styles.tableHeaderText}>EXPORT COUNTRY</Text>
              </View>
            </View>

            {/* Table Rows */}
            {importedItems.map((item, index) => {
              const mt = convertToMetricTons(item.quantity, item.volume, item.designation);
              return (
                <View key={index} style={styles.tableRow}>
                  <View style={styles.colCsName}>
                    <Text style={styles.tableCell}>{item.ashrae || 'N/A'}</Text>
                  </View>
                  <View style={styles.colHsCode}>
                    <Text style={styles.tableCell}>{item.hs_code || 'N/A'}</Text>
                  </View>
                  <View style={styles.colQty}>
                    <Text style={styles.tableCell}>{item.quantity || '0'}</Text>
                  </View>
                  <View style={styles.colVolume}>
                    <Text style={styles.tableCell}>
                      {item.volume} {item.designation}(s)
                    </Text>
                  </View>
                  <View style={styles.colMt}>
                    <Text style={styles.tableCell}>{mt}</Text>
                  </View>
                  <View style={styles.colChemical}>
                    <Text style={styles.tableCell}>{item.cs_name || item.chemical_name || 'N/A'}</Text>
                  </View>
                  <View style={styles.colCo2}>
                    <Text style={styles.tableCell}>{item.co2_equivalent || '0'}</Text>
                  </View>
                  <View style={styles.colCountry}>
                    <Text style={styles.tableCell}>({item.export_country || 'N/A'})</Text>
                  </View>
                </View>
              );
            })}

            {/* Totals Row */}
            <View style={styles.totalsRow}>
              <View style={{ width: '72%' }}>
                <Text style={styles.totalsLabel}>TOTAL CO2 EQUIVALENT:</Text>
              </View>
              <View style={{ width: '28%' }}>
                <Text style={styles.totalsValue}>{totalCO2.toFixed(2)} CO2eq</Text>
              </View>
            </View>
          </View>

          {/* Watermark */}
          <Text style={styles.watermark}>OFFICIAL</Text>
        </View>

        {/* Footer/Signature Section */}
        <View style={styles.footerSection}>
          <View style={styles.footerRow}>
            <View>
              <Text style={styles.footerLabel}>NAME OF AUTHORIZED OFFICER</Text>
              <Text style={styles.footerValue}>
                {(importData?.admin_name || 'N/A').toUpperCase()}
              </Text>
            </View>
            <View>
              <Text style={styles.footerLabel}>TITLE OF AUTHORIZED OFFICER</Text>
              <Text style={styles.footerValue}>
                {(importData?.admin_role || 'NOU Administrator').toUpperCase()}
              </Text>
            </View>
          </View>
          <View style={styles.footerRow}>
            <View>
              <Text style={styles.footerLabel}>DATE</Text>
              <Text style={styles.footerValue}>
                {formatDate(importData?.admin_signature_date)}
              </Text>
            </View>
            <View>
              <Text style={styles.footerLabel}>SIGNATURE</Text>
              {importData?.admin_signature_url ? (
                <Image
                  style={styles.signatureImage}
                  src={importData.admin_signature_url}
                />
              ) : (
                <Text style={styles.footerValue}>_____________________</Text>
              )}
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
};
  
  const bars = [];
  const fullText = `*${text.toUpperCase()}*`;
  let x = 0;
  const narrowWidth = 1;
  const wideWidth = 2.5;
  const height = 30;
  
  for (const char of fullText) {
    const pattern = CODE39_CHARS[char] || CODE39_CHARS['*'];
    for (let i = 0; i < pattern.length; i++) {
      const isWide = pattern[i] === 'w';
      const width = isWide ? wideWidth : narrowWidth;
      if (i % 2 === 0) {
        bars.push({ x, width, height });
      }
      x += width;
    }
    x += narrowWidth;
  }
  
  return { bars, totalWidth: x };
};

// PDF417-style barcode visual
const generatePDF417Visual = (text) => {
  const rows = [];
  const numRows = 4;
  const numCols = 20;
  
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash) + text.charCodeAt(i);
    hash = hash & hash;
  }
  
  for (let row = 0; row < numRows; row++) {
    const rowBars = [];
    for (let col = 0; col < numCols; col++) {
      const seed = (hash + row * numCols + col) % 7;
      rowBars.push(seed > 2);
    }
    rows.push(rowBars);
  }
  
  return rows;
};

// Create styles
const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 10,
    fontFamily: 'Helvetica',
  },
  border: {
    border: '1pt solid #333333',
    padding: 20,
    minHeight: '95%',
  },
  // Flag colors header line
  flagLineContainer: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  flagLineBlue: {
    width: 50,
    height: 5,
    backgroundColor: '#0072C6',
  },
  flagLineYellow: {
    width: 50,
    height: 5,
    backgroundColor: '#FCD116',
  },
  flagLineGreen: {
    width: 50,
    height: 5,
    backgroundColor: '#009E60',
  },
  // Header section
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  countryName: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#444444',
  },
  unitName: {
    fontSize: 9,
    color: '#444444',
  },
  licenseTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#444444',
    textAlign: 'right',
  },
  licenseSubtitle: {
    fontSize: 9,
    color: '#444444',
    textAlign: 'right',
    marginTop: 2,
  },
  yearLabel: {
    fontSize: 9,
    color: '#444444',
    textAlign: 'right',
    marginTop: 5,
  },
  yearValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#009E60',
    textAlign: 'right',
  },
  licenseNoText: {
    fontSize: 6,
    color: '#444444',
    textAlign: 'right',
    marginTop: 5,
  },
  // Importer info section
  importerSection: {
    marginTop: 20,
    marginBottom: 20,
  },
  importerNoLabel: {
    fontSize: 6,
    color: '#444444',
  },
  certificationText: {
    fontSize: 10,
    color: '#444444',
    marginTop: 15,
    lineHeight: 1.5,
  },
  certificationBold: {
    fontWeight: 'bold',
  },
  // Items table
  itemsSection: {
    marginTop: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
    paddingBottom: 5,
    marginBottom: 5,
  },
  tableHeaderText: {
    fontSize: 6,
    fontWeight: 'bold',
    color: '#444444',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 3,
    borderBottomWidth: 0.5,
    borderBottomColor: '#eeeeee',
  },
  // Column widths for import items
  colCsName: { width: '12%' },
  colHsCode: { width: '10%' },
  colQty: { width: '8%' },
  colVolume: { width: '12%' },
  colMt: { width: '10%' },
  colChemical: { width: '20%' },
  colCo2: { width: '12%' },
  colCountry: { width: '16%' },
  tableCell: {
    fontSize: 7,
    color: '#444444',
  },
  // Footer/Signature section
  footerSection: {
    position: 'absolute',
    bottom: 50,
    left: 30,
    right: 30,
    border: '1pt solid #bfbfbf',
    padding: 15,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  footerLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#444444',
  },
  footerValue: {
    fontSize: 10,
    color: '#444444',
    marginTop: 5,
  },
  signatureImage: {
    width: 150,
    height: 50,
    objectFit: 'contain',
  },
  // Watermark
  watermark: {
    position: 'absolute',
    top: '40%',
    left: '30%',
    fontSize: 60,
    color: '#eeeeee',
    opacity: 0.3,
    transform: 'rotate(-45deg)',
  },
  // Totals row
  totalsRow: {
    flexDirection: 'row',
    paddingVertical: 5,
    borderTopWidth: 1,
    borderTopColor: '#333333',
    marginTop: 5,
  },
  totalsLabel: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#444444',
  },
  totalsValue: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#009E60',
  },
});

// Unit conversion helper
const convertToMetricTons = (quantity, volume, unit) => {
  const qty = parseFloat(quantity) || 0;
  const vol = parseFloat(volume) || 0;
  const totalMass = qty * vol;
  
  const conversionFactors = {
    'g': 0.000001,
    'kg': 0.001,
    'lb': 0.000453592,
    'oz': 0.0000283495,
    'ton': 1,
    'mt': 1,
  };
  
  const factor = conversionFactors[unit?.toLowerCase()] || 0.001;
  return (totalMass * factor).toFixed(4);
};

const ImportLicensePDF = ({ importData, user }) => {
  const formatDate = (date) => {
    if (!date) return 'N/A';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const importedItems = importData?.imported_items || [];
  
  // Calculate total CO2 equivalent
  const totalCO2 = importedItems.reduce((sum, item) => {
    return sum + (parseFloat(item.co2_equivalent) || 0);
  }, 0);

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <View style={styles.border}>
          {/* Flag color lines */}
          <View style={styles.flagLineContainer}>
            <View style={styles.flagLineBlue} />
            <View style={styles.flagLineYellow} />
            <View style={styles.flagLineGreen} />
          </View>

          {/* Header */}
          <View style={styles.headerContainer}>
            <View style={styles.headerLeft}>
              <Text style={styles.countryName}>ST. VINCENT & THE GRENADINES</Text>
              <Text style={styles.unitName}>NATIONAL OZONE UNIT</Text>
            </View>
            <View style={styles.headerRight}>
              <Text style={styles.licenseTitle}>LICENSE TO IMPORT</Text>
              <Text style={styles.licenseSubtitle}>
                CONTROLLED SUBSTANCES / CONTROLLED SUBSTANCES ALTERNATIVES
              </Text>
              <Text style={styles.yearLabel}>#</Text>
              <Text style={styles.yearValue}>{importData?.import_year || new Date().getFullYear()}</Text>
              <Text style={styles.licenseNoText}>
                LICENSE NO: {importData?.import_year} - {importData?.import_number || 'N/A'}
              </Text>
            </View>
          </View>

          {/* Importer Information */}
          <View style={styles.importerSection}>
            <Text style={styles.importerNoLabel}>IMPORTER NO: {user?.importer_number || 'N/A'}</Text>
            <View style={{ marginTop: 20 }}>
              <Text style={styles.certificationText}>
                THIS CERTIFIES THAT{' '}
                <Text style={styles.certificationBold}>
                  {(user?.displayName || user?.display_name || 'N/A').toUpperCase()}
                </Text>{' '}
                OF{' '}
                <Text style={styles.certificationBold}>
                  {(user?.enterprise_name || 'N/A').toUpperCase()}
                </Text>{' '}
                AT{' '}
                <Text style={styles.certificationBold}>
                  {(user?.business_address || 'N/A').toUpperCase()}
                </Text>{' '}
                IS GRANTED A LICENSE TO IMPORT THE FOLLOWING CONTROLLED SUBSTANCES (CSs) / CONTROLLED SUBSTANCES ALTERNATIVES (CSAs):
              </Text>
            </View>
          </View>

          {/* Items Table */}
          <View style={styles.itemsSection}>
            {/* Table Header */}
            <View style={styles.tableHeader}>
              <View style={styles.colCsName}>
                <Text style={styles.tableHeaderText}>CS/CSA NAME</Text>
              </View>
              <View style={styles.colHsCode}>
                <Text style={styles.tableHeaderText}>HS CODE</Text>
              </View>
              <View style={styles.colQty}>
                <Text style={styles.tableHeaderText}>QTY</Text>
              </View>
              <View style={styles.colVolume}>
                <Text style={styles.tableHeaderText}>VOLUME</Text>
              </View>
              <View style={styles.colMt}>
                <Text style={styles.tableHeaderText}>MT</Text>
              </View>
              <View style={styles.colChemical}>
                <Text style={styles.tableHeaderText}>CHEMICAL NAME</Text>
              </View>
              <View style={styles.colCo2}>
                <Text style={styles.tableHeaderText}>CO2e USED</Text>
              </View>
              <View style={styles.colCountry}>
                <Text style={styles.tableHeaderText}>EXPORT COUNTRY</Text>
              </View>
            </View>

            {/* Table Rows */}
            {importedItems.map((item, index) => {
              const mt = convertToMetricTons(item.quantity, item.volume, item.designation);
              return (
                <View key={index} style={styles.tableRow}>
                  <View style={styles.colCsName}>
                    <Text style={styles.tableCell}>{item.ashrae || 'N/A'}</Text>
                  </View>
                  <View style={styles.colHsCode}>
                    <Text style={styles.tableCell}>{item.hs_code || 'N/A'}</Text>
                  </View>
                  <View style={styles.colQty}>
                    <Text style={styles.tableCell}>{item.quantity || '0'}</Text>
                  </View>
                  <View style={styles.colVolume}>
                    <Text style={styles.tableCell}>
                      {item.volume} {item.designation}(s)
                    </Text>
                  </View>
                  <View style={styles.colMt}>
                    <Text style={styles.tableCell}>{mt}</Text>
                  </View>
                  <View style={styles.colChemical}>
                    <Text style={styles.tableCell}>{item.cs_name || item.chemical_name || 'N/A'}</Text>
                  </View>
                  <View style={styles.colCo2}>
                    <Text style={styles.tableCell}>{item.co2_equivalent || '0'}</Text>
                  </View>
                  <View style={styles.colCountry}>
                    <Text style={styles.tableCell}>({item.export_country || 'N/A'})</Text>
                  </View>
                </View>
              );
            })}

            {/* Totals Row */}
            <View style={styles.totalsRow}>
              <View style={{ width: '72%' }}>
                <Text style={styles.totalsLabel}>TOTAL CO2 EQUIVALENT:</Text>
              </View>
              <View style={{ width: '28%' }}>
                <Text style={styles.totalsValue}>{totalCO2.toFixed(2)} CO2eq</Text>
              </View>
            </View>
          </View>

          {/* Watermark */}
          <Text style={styles.watermark}>OFFICIAL</Text>
        </View>

        {/* Footer/Signature Section */}
        <View style={styles.footerSection}>
          <View style={styles.footerRow}>
            <View>
              <Text style={styles.footerLabel}>NAME OF AUTHORIZED OFFICER</Text>
              <Text style={styles.footerValue}>
                {(importData?.admin_name || 'N/A').toUpperCase()}
              </Text>
            </View>
            <View>
              <Text style={styles.footerLabel}>TITLE OF AUTHORIZED OFFICER</Text>
              <Text style={styles.footerValue}>
                {(importData?.admin_role || 'NOU Administrator').toUpperCase()}
              </Text>
            </View>
          </View>
          <View style={styles.footerRow}>
            <View>
              <Text style={styles.footerLabel}>DATE</Text>
              <Text style={styles.footerValue}>
                {formatDate(importData?.admin_signature_date)}
              </Text>
            </View>
            <View>
              <Text style={styles.footerLabel}>SIGNATURE</Text>
              {importData?.admin_signature_url ? (
                <Image
                  style={styles.signatureImage}
                  src={importData.admin_signature_url}
                />
              ) : (
                <Text style={styles.footerValue}>_____________________</Text>
              )}
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
};

export default ImportLicensePDF;