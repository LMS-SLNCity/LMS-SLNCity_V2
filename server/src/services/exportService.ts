/**
 * Export Service
 * 
 * Provides PDF and Excel export functionality for B2B financial reports and audit logs.
 */

import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import { Response } from 'express';

interface InvoiceData {
  client: {
    id: number;
    name: string;
    currentBalance: number;
  };
  invoicePeriod: {
    startDate: string | null;
    endDate: string | null;
  };
  visits: Array<{
    id: number;
    visitCode: string;
    registrationDate: string;
    totalCost: number;
    amountPaid: number;
    dueAmount: number;
    patientName: string;
    testNames: string[];
  }>;
  summary: {
    totalVisits: number;
    totalAmount: number;
    totalPaid: number;
    totalDue: number;
  };
  generatedAt: string;
}

interface AuditLogData {
  id: number;
  timestamp: string;
  username: string;
  action: string;
  details: string;
  resource?: string;
  resourceId?: number;
}

/**
 * Generate PDF invoice for B2B client
 */
export const generateInvoicePDF = (data: InvoiceData, res: Response): void => {
  const doc = new PDFDocument({ margin: 50 });

  // Set response headers
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=invoice-${data.client.name.replace(/\s+/g, '-')}-${Date.now()}.pdf`);

  // Pipe PDF to response
  doc.pipe(res);

  // Header
  doc.fontSize(20).text('INVOICE', { align: 'center' });
  doc.moveDown();

  // Client Information
  doc.fontSize(14).text('Bill To:', { underline: true });
  doc.fontSize(12).text(data.client.name);
  doc.text(`Client ID: ${data.client.id}`);
  doc.text(`Current Balance: ₹${data.client.currentBalance.toFixed(2)}`);
  doc.moveDown();

  // Invoice Period
  if (data.invoicePeriod.startDate || data.invoicePeriod.endDate) {
    doc.fontSize(12).text('Invoice Period:');
    if (data.invoicePeriod.startDate) {
      doc.text(`From: ${new Date(data.invoicePeriod.startDate).toLocaleDateString()}`);
    }
    if (data.invoicePeriod.endDate) {
      doc.text(`To: ${new Date(data.invoicePeriod.endDate).toLocaleDateString()}`);
    }
    doc.moveDown();
  }

  // Table Header
  const tableTop = doc.y;
  const col1X = 50;
  const col2X = 150;
  const col3X = 300;
  const col4X = 400;
  const col5X = 480;

  doc.fontSize(10).font('Helvetica-Bold');
  doc.text('Visit Code', col1X, tableTop);
  doc.text('Patient', col2X, tableTop);
  doc.text('Date', col3X, tableTop);
  doc.text('Amount', col4X, tableTop);
  doc.text('Due', col5X, tableTop);

  doc.moveTo(col1X, tableTop + 15).lineTo(550, tableTop + 15).stroke();

  // Table Rows
  let y = tableTop + 25;
  doc.font('Helvetica').fontSize(9);

  data.visits.forEach((visit, index) => {
    if (y > 700) {
      doc.addPage();
      y = 50;
    }

    doc.text(visit.visitCode, col1X, y, { width: 90 });
    doc.text(visit.patientName, col2X, y, { width: 140 });
    doc.text(new Date(visit.registrationDate).toLocaleDateString(), col3X, y, { width: 90 });
    doc.text(`₹${visit.totalCost.toFixed(2)}`, col4X, y, { width: 70 });
    doc.text(`₹${visit.dueAmount.toFixed(2)}`, col5X, y, { width: 70 });

    y += 20;
  });

  // Summary
  doc.moveDown();
  y = doc.y + 20;
  doc.moveTo(col1X, y).lineTo(550, y).stroke();
  y += 10;

  doc.fontSize(11).font('Helvetica-Bold');
  doc.text('Summary:', col1X, y);
  y += 20;

  doc.fontSize(10).font('Helvetica');
  doc.text(`Total Visits: ${data.summary.totalVisits}`, col1X, y);
  y += 15;
  doc.text(`Total Amount: ₹${data.summary.totalAmount.toFixed(2)}`, col1X, y);
  y += 15;
  doc.text(`Total Paid: ₹${data.summary.totalPaid.toFixed(2)}`, col1X, y);
  y += 15;
  doc.fontSize(12).font('Helvetica-Bold');
  doc.text(`Total Due: ₹${data.summary.totalDue.toFixed(2)}`, col1X, y);

  // Footer
  doc.fontSize(8).font('Helvetica').text(
    `Generated on: ${new Date(data.generatedAt).toLocaleString()}`,
    50,
    750,
    { align: 'center' }
  );

  doc.end();
};

/**
 * Generate Excel invoice for B2B client
 */
export const generateInvoiceExcel = async (data: InvoiceData, res: Response): Promise<void> => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Invoice');

  // Set column widths
  worksheet.columns = [
    { header: 'Visit Code', key: 'visitCode', width: 15 },
    { header: 'Patient Name', key: 'patientName', width: 25 },
    { header: 'Registration Date', key: 'registrationDate', width: 20 },
    { header: 'Tests', key: 'tests', width: 40 },
    { header: 'Total Cost', key: 'totalCost', width: 15 },
    { header: 'Amount Paid', key: 'amountPaid', width: 15 },
    { header: 'Due Amount', key: 'dueAmount', width: 15 },
  ];

  // Add title
  worksheet.mergeCells('A1:G1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = 'INVOICE';
  titleCell.font = { size: 16, bold: true };
  titleCell.alignment = { horizontal: 'center' };

  // Add client info
  worksheet.addRow([]);
  worksheet.addRow(['Client Name:', data.client.name]);
  worksheet.addRow(['Client ID:', data.client.id]);
  worksheet.addRow(['Current Balance:', `₹${data.client.currentBalance.toFixed(2)}`]);

  // Add invoice period
  if (data.invoicePeriod.startDate || data.invoicePeriod.endDate) {
    worksheet.addRow([]);
    worksheet.addRow(['Invoice Period:']);
    if (data.invoicePeriod.startDate) {
      worksheet.addRow(['From:', new Date(data.invoicePeriod.startDate).toLocaleDateString()]);
    }
    if (data.invoicePeriod.endDate) {
      worksheet.addRow(['To:', new Date(data.invoicePeriod.endDate).toLocaleDateString()]);
    }
  }

  // Add empty row before table
  worksheet.addRow([]);

  // Add header row
  const headerRow = worksheet.addRow([
    'Visit Code',
    'Patient Name',
    'Registration Date',
    'Tests',
    'Total Cost',
    'Amount Paid',
    'Due Amount',
  ]);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFD3D3D3' },
  };

  // Add data rows
  data.visits.forEach(visit => {
    worksheet.addRow([
      visit.visitCode,
      visit.patientName,
      new Date(visit.registrationDate).toLocaleDateString(),
      visit.testNames.join(', '),
      visit.totalCost,
      visit.amountPaid,
      visit.dueAmount,
    ]);
  });

  // Add summary
  worksheet.addRow([]);
  worksheet.addRow(['Summary']);
  worksheet.addRow(['Total Visits:', data.summary.totalVisits]);
  worksheet.addRow(['Total Amount:', data.summary.totalAmount]);
  worksheet.addRow(['Total Paid:', data.summary.totalPaid]);
  const totalDueRow = worksheet.addRow(['Total Due:', data.summary.totalDue]);
  totalDueRow.font = { bold: true };

  // Add footer
  worksheet.addRow([]);
  worksheet.addRow([`Generated on: ${new Date(data.generatedAt).toLocaleString()}`]);

  // Set response headers
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=invoice-${data.client.name.replace(/\s+/g, '-')}-${Date.now()}.xlsx`);

  // Write to response
  await workbook.xlsx.write(res);
  res.end();
};

/**
 * Generate Excel export for audit logs
 */
export const generateAuditLogsExcel = async (logs: AuditLogData[], res: Response): Promise<void> => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Audit Logs');

  // Set column widths
  worksheet.columns = [
    { header: 'ID', key: 'id', width: 10 },
    { header: 'Timestamp', key: 'timestamp', width: 20 },
    { header: 'Username', key: 'username', width: 20 },
    { header: 'Action', key: 'action', width: 25 },
    { header: 'Details', key: 'details', width: 50 },
    { header: 'Resource', key: 'resource', width: 20 },
    { header: 'Resource ID', key: 'resourceId', width: 15 },
  ];

  // Add title
  worksheet.mergeCells('A1:G1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = 'AUDIT LOGS';
  titleCell.font = { size: 16, bold: true };
  titleCell.alignment = { horizontal: 'center' };

  // Add empty row
  worksheet.addRow([]);

  // Add header row
  const headerRow = worksheet.addRow([
    'ID',
    'Timestamp',
    'Username',
    'Action',
    'Details',
    'Resource',
    'Resource ID',
  ]);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFD3D3D3' },
  };

  // Add data rows
  logs.forEach(log => {
    worksheet.addRow([
      log.id,
      new Date(log.timestamp).toLocaleString(),
      log.username,
      log.action,
      log.details,
      log.resource || '',
      log.resourceId || '',
    ]);
  });

  // Add footer
  worksheet.addRow([]);
  worksheet.addRow([`Generated on: ${new Date().toLocaleString()}`]);
  worksheet.addRow([`Total Records: ${logs.length}`]);

  // Set response headers
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=audit-logs-${Date.now()}.xlsx`);

  // Write to response
  await workbook.xlsx.write(res);
  res.end();
};

export default {
  generateInvoicePDF,
  generateInvoiceExcel,
  generateAuditLogsExcel,
};

