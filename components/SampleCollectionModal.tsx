import React, { useState } from 'react';
import { VisitTest } from '../types';
import { Select } from './form/Select';

interface SampleCollectionModalProps {
  test: VisitTest;
  onClose: () => void;
  onConfirm: (sampleType: string) => void;
}

export const SampleCollectionModal: React.FC<SampleCollectionModalProps> = ({ test, onClose, onConfirm }) => {
  // Pre-fill with template's default sample type if available
  const defaultSampleType = test.template.sampleType || '';
  const [sampleType, setSampleType] = useState(defaultSampleType);
  const [customSampleType, setCustomSampleType] = useState('');

  // Common sample types based on test category
  const getSampleTypeOptions = () => {
    const category = test.template.category.toLowerCase();
    
    // Common sample types for different test categories
    const commonTypes: { [key: string]: string[] } = {
      'hematology': ['WB EDTA', 'WB Citrate', 'WB Heparin', 'Capillary Blood'],
      'biochemistry': ['Serum', 'Plasma EDTA', 'Plasma Heparin', 'Plasma Fluoride'],
      'microbiology': ['Urine', 'Stool', 'Sputum', 'Blood Culture', 'Swab', 'Pus', 'CSF'],
      'serology': ['Serum', 'Plasma'],
      'immunology': ['Serum', 'Plasma'],
      'clinical pathology': ['Urine', 'Stool', 'Semen', 'Body Fluid'],
      'molecular': ['WB EDTA', 'Serum', 'Plasma', 'Tissue'],
      'histopathology': ['Tissue', 'Biopsy', 'FNAC'],
      'cytology': ['Body Fluid', 'Aspirate', 'Smear'],
    };

    // Find matching category
    for (const [key, types] of Object.entries(commonTypes)) {
      if (category.includes(key)) {
        return types;
      }
    }

    // Default common types
    return ['WB EDTA', 'Serum', 'Plasma', 'Urine', 'Stool', 'Other'];
  };

  const sampleTypeOptions = getSampleTypeOptions();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const finalSampleType = sampleType === 'Other' ? customSampleType.trim() : sampleType;
    
    if (!finalSampleType) {
      alert('Please select or enter a sample type.');
      return;
    }

    onConfirm(finalSampleType);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Collect Sample</h2>
        
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-gray-700">
            <span className="font-semibold">Visit:</span> {test.visitCode}
          </p>
          <p className="text-sm text-gray-700">
            <span className="font-semibold">Patient:</span> {test.patientName}
          </p>
          <p className="text-sm text-gray-700">
            <span className="font-semibold">Test:</span> {test.template.name}
          </p>
          <p className="text-sm text-gray-700">
            <span className="font-semibold">Category:</span> {test.template.category}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {test.template.sampleType && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-sm text-green-800">
                <strong>Recommended Sample Type:</strong> {test.template.sampleType}
              </p>
              <p className="text-xs text-green-700 mt-1">
                This is the default sample type for this test. You can change it if needed.
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sample Type <span className="text-red-500">*</span>
            </label>
            <select
              value={sampleType}
              onChange={(e) => setSampleType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">-- Select Sample Type --</option>
              {sampleTypeOptions.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          {sampleType === 'Other' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Specify Sample Type <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={customSampleType}
                onChange={(e) => setCustomSampleType(e.target.value)}
                placeholder="Enter sample type"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          )}

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-xs text-yellow-800">
              <strong>Note:</strong> Ensure the sample is properly labeled with patient name, visit code, and collection time.
            </p>
          </div>

          <div className="flex space-x-3 pt-2">
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
            >
              Confirm Collection
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 font-semibold rounded-lg shadow-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

