import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

/**
 * Options for PDF generation
 */
export interface PDFExportOptions {
  orientation?: 'portrait' | 'landscape';
  format?: 'a4' | 'letter' | 'a3';
  scale?: number;
  quality?: number;
  margin?: number;
}

/**
 * Generate PDF from HTML element
 * @param elementId - ID of the HTML element to convert to PDF
 * @param fileName - Name of the PDF file to download
 * @param options - PDF generation options
 */
export const generateReportPDF = async (
  elementId: string,
  fileName: string,
  options: PDFExportOptions = {}
): Promise<void> => {
  try {
    const element = document.getElementById(elementId);
    if (!element) {
      throw new Error(`Element with ID "${elementId}" not found`);
    }

    // Show loading indicator
    const originalDisplay = element.style.display;
    element.style.display = 'block';

    // Convert HTML to canvas
    const canvas = await html2canvas(element, {
      scale: options.scale || 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      allowTaint: true,
    });

    // Restore original display
    element.style.display = originalDisplay;

    // Create PDF
    const imgData = canvas.toDataURL('image/png');
    const orientation = options.orientation || 'portrait';
    const format = options.format || 'a4';
    const margin = options.margin || 10; // mm

    const pdf = new jsPDF({
      orientation,
      unit: 'mm',
      format,
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pageWidth - margin * 2;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = margin;

    // Add first page
    pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight);
    heightLeft -= pageHeight - margin * 2;

    // Add additional pages if needed
    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight);
      heightLeft -= pageHeight - margin * 2;
    }

    // Download PDF
    pdf.save(fileName);
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
};

/**
 * Generate PDF with custom styling
 * Useful for reports that need specific formatting
 */
export const generateStyledReportPDF = async (
  elementId: string,
  fileName: string,
  styles?: string,
  options: PDFExportOptions = {}
): Promise<void> => {
  try {
    const element = document.getElementById(elementId);
    if (!element) {
      throw new Error(`Element with ID "${elementId}" not found`);
    }

    // Apply custom styles if provided
    if (styles) {
      const styleElement = document.createElement('style');
      styleElement.innerHTML = styles;
      document.head.appendChild(styleElement);
    }

    // Generate PDF
    await generateReportPDF(elementId, fileName, options);

    // Clean up styles
    if (styles) {
      const styleElements = document.querySelectorAll('style');
      styleElements.forEach(el => {
        if (el.innerHTML === styles) {
          el.remove();
        }
      });
    }
  } catch (error) {
    console.error('Error generating styled PDF:', error);
    throw error;
  }
};

/**
 * Generate multiple PDFs from different elements
 * Useful for batch report generation
 */
export const generateMultiplePDFs = async (
  elements: Array<{ elementId: string; fileName: string }>,
  options: PDFExportOptions = {}
): Promise<void> => {
  try {
    for (const { elementId, fileName } of elements) {
      await generateReportPDF(elementId, fileName, options);
      // Add small delay between PDFs to avoid browser issues
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  } catch (error) {
    console.error('Error generating multiple PDFs:', error);
    throw error;
  }
};

/**
 * Generate PDF and return as blob (for uploading or further processing)
 */
export const generateReportPDFBlob = async (
  elementId: string,
  options: PDFExportOptions = {}
): Promise<Blob> => {
  try {
    const element = document.getElementById(elementId);
    if (!element) {
      throw new Error(`Element with ID "${elementId}" not found`);
    }

    const canvas = await html2canvas(element, {
      scale: options.scale || 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
    });

    const imgData = canvas.toDataURL('image/png');
    const orientation = options.orientation || 'portrait';
    const format = options.format || 'a4';
    const margin = options.margin || 10;

    const pdf = new jsPDF({
      orientation,
      unit: 'mm',
      format,
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pageWidth - margin * 2;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = margin;

    pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight);
    heightLeft -= pageHeight - margin * 2;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight);
      heightLeft -= pageHeight - margin * 2;
    }

    return pdf.output('blob');
  } catch (error) {
    console.error('Error generating PDF blob:', error);
    throw error;
  }
};

