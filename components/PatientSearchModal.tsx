import React, { useState } from 'react';
import { API_BASE_URL } from '../config/api';

interface Patient {
  id: number;
  salutation: string;
  name: string;
  age_years: number;
  age_months: number;
  age_days: number;
  sex: string;
  guardian_name?: string;
  phone?: string;
  address?: string;
  email?: string;
  clinical_history?: string;
}

interface PatientSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPatient: (patient: Patient) => void;
}

export const PatientSearchModal: React.FC<PatientSearchModalProps> = ({ isOpen, onClose, onSelectPatient }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Patient[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  if (!isOpen) return null;

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      alert('Please enter a phone number or patient name to search.');
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(`${API_BASE_URL}/patients/search/${encodeURIComponent(searchQuery.trim())}`);
      if (!response.ok) throw new Error('Search failed');

      const results = await response.json();
      setSearchResults(results);

      if (results.length === 0) {
        alert('No patients found. Please check the phone number or name and try again.');
      }
    } catch (error) {
      console.error('❌ Search error:', error);
      alert('Failed to search patients. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectPatient = (patient: Patient) => {
    onSelectPatient(patient);
    setSearchQuery('');
    setSearchResults([]);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-blue-600 text-white px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold">Search Existing Patient</h2>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 text-2xl font-bold"
          >
            ×
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-6 border-b">
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="Search by Phone or Name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              autoFocus
            />
            <button
              onClick={handleSearch}
              disabled={isSearching}
              className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSearching ? 'Searching...' : 'Search'}
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {searchResults.length === 0 ? (
            <div className="text-center text-gray-500 py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <p className="mt-4 text-lg">Search for a patient by phone or name</p>
            </div>
          ) : (
            <div className="space-y-3">
              {searchResults.map((patient) => (
                <button
                  key={patient.id}
                  onClick={() => handleSelectPatient(patient)}
                  className="w-full text-left p-4 bg-white border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {patient.salutation} {patient.name}
                      </h3>
                      <div className="mt-2 grid grid-cols-2 gap-2 text-sm text-gray-600">
                        <div>
                          <span className="font-medium">Age:</span> {patient.age_years}y {patient.age_months}m {patient.age_days}d
                        </div>
                        <div>
                          <span className="font-medium">Sex:</span> {patient.sex}
                        </div>
                        {patient.phone && (
                          <div>
                            <span className="font-medium">Phone:</span> {patient.phone}
                          </div>
                        )}
                        {patient.email && (
                          <div>
                            <span className="font-medium">Email:</span> {patient.email}
                          </div>
                        )}
                        {patient.guardian_name && (
                          <div className="col-span-2">
                            <span className="font-medium">Guardian:</span> {patient.guardian_name}
                          </div>
                        )}
                        {patient.address && (
                          <div className="col-span-2">
                            <span className="font-medium">Address:</span> {patient.address}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="ml-4">
                      <span className="inline-block px-3 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
                        Click to Load
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 flex justify-between items-center border-t">
          <p className="text-sm text-gray-600">
            {searchResults.length > 0 && `Found ${searchResults.length} patient(s)`}
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

