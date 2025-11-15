import React, { useEffect, useRef } from 'react';
import { VisitTest } from '../types';
import { X } from 'lucide-react';

interface BarcodeModalProps {
  test: VisitTest;
  onClose: () => void;
}

export const BarcodeModal: React.FC<BarcodeModalProps> = ({ test, onClose }) => {
  const barcodeRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (barcodeRef.current && typeof window !== 'undefined') {
      try {
        import('jsbarcode').then((JsBarcode) => {
          if (barcodeRef.current) {
            JsBarcode.default(barcodeRef.current, test.visitCode, {
              format: 'CODE128',
              width: 2,
              height: 80,
              displayValue: true,
              fontSize: 20,
              margin: 10,
            });
          }
        });
      } catch (error) {
        console.error('Error generating barcode:', error);
      }
    }
  }, [test.visitCode]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-gray-900">Sample Barcode</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="space-y-4">
            {/* Patient Info */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="text-sm">
                <span className="font-semibold text-gray-700">Patient:</span>
                <span className="ml-2 text-gray-900">{test.patientName}</span>
              </div>
              <div className="text-sm">
                <span className="font-semibold text-gray-700">Visit Code:</span>
                <span className="ml-2 text-gray-900">{test.visitCode}</span>
              </div>
              <div className="text-sm">
                <span className="font-semibold text-gray-700">Test:</span>
                <span className="ml-2 text-gray-900">{test.template.name}</span>
              </div>
              {test.specimen_type && (
                <div className="text-sm">
                  <span className="font-semibold text-gray-700">Sample Type:</span>
                  <span className="ml-2 text-gray-900">{test.specimen_type}</span>
                </div>
              )}
            </div>

            {/* Barcode */}
            <div className="bg-white border-2 border-gray-300 rounded-lg p-6 flex justify-center items-center">
              <svg ref={barcodeRef} style={{ maxWidth: '100%', height: 'auto' }}></svg>
            </div>

            {/* Print Instructions */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                💡 <strong>Tip:</strong> Click "Print Label" to print this barcode and attach it to the sample container.
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-6">
            <button
              onClick={handlePrint}
              className="flex-1 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition-colors"
            >
              Print Label
            </button>
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 font-semibold rounded-lg shadow-md hover:bg-gray-400 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Print-only styles */}
      <style>{`
        @media print {
          /* Hide everything */
          body * {
            visibility: hidden;
          }

          /* Show only the barcode SVG */
          svg {
            visibility: visible !important;
            position: absolute;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%);
          }

          /* Hide all other elements */
          .fixed, .bg-white, .rounded-xl, .shadow-2xl,
          button, h3, p, div:not(svg) {
            visibility: hidden !important;
          }
        }
      `}</style>
    </div>
  );
};

