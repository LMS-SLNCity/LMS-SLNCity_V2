/**
 * QR Code Generation Utility
 * 
 * Generates QR codes as base64 data URLs for embedding in reports
 */

import QRCode from 'qrcode';

/**
 * Generate a QR code as a base64 data URL
 * @param text - The text to encode in the QR code
 * @param size - The size of the QR code in pixels (default: 100)
 * @returns Promise<string> - Base64 data URL of the QR code image
 */
export async function generateQRCode(text: string, size: number = 100): Promise<string> {
  try {
    const qrCodeDataUrl = await QRCode.toDataURL(text, {
      width: size,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    return qrCodeDataUrl;
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw new Error('Failed to generate QR code');
  }
}

/**
 * Generate a verification URL for a visit
 * @param visitCode - The visit code
 * @param baseUrl - The base URL of the frontend (e.g., 'http://localhost:3000')
 * @returns string - The verification URL
 */
export function generateVerificationUrl(visitCode: string, baseUrl: string): string {
  return `${baseUrl}/verify-report/${visitCode}`;
}

