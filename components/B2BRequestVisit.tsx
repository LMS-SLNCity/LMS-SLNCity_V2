import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config/api';

interface Patient {
  id: number;
  name: string;
  age_years: number;
  sex: string;
  phone: string;
}

interface TestTemplate {
  id: number;
  name: string;
  price: number;
}

export const B2BRequestVisit: React.FC = () => {
  const { user } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [testTemplates, setTestTemplates] = useState<TestTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const clientId = (user as any)?.clientId;
  const clientName = (user as any)?.clientName;

  // Form state
  const [formData, setFormData] = useState({
    patientName: '',
    age: '',
    sex: 'Male',
    phone: '',
    selectedTests: [] as number[],
  });

  useEffect(() => {
    fetchTestTemplates();
  }, [clientId]);

  const fetchTestTemplates = async () => {
    try {
      const token = sessionStorage.getItem('authToken') || localStorage.getItem('authToken');

      // Fetch all test templates
      const response = await fetch(`${API_BASE_URL}/test-templates`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setTestTemplates(data);
      }
    } catch (error) {
      console.error('Error fetching test templates:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleTestToggle = (testId: number) => {
    setFormData(prev => ({
      ...prev,
      selectedTests: prev.selectedTests.includes(testId)
        ? prev.selectedTests.filter(id => id !== testId)
        : [...prev.selectedTests, testId]
    }));
  };

  const calculateTotal = () => {
    return formData.selectedTests.reduce((total, testId) => {
      const test = testTemplates.find(t => t.id === testId);
      return total + (test?.price || 0);
    }, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const token = sessionStorage.getItem('authToken') || localStorage.getItem('authToken');

      // First, create or find patient
      let patientId: number;

      // Check if patient exists by phone
      const patientsResponse = await fetch(`${API_BASE_URL}/patients`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (patientsResponse.ok) {
        const allPatients = await patientsResponse.json();
        const existingPatient = allPatients.find((p: Patient) => p.phone === formData.phone);

        if (existingPatient) {
          patientId = existingPatient.id;
        } else {
          // Create new patient
          const createPatientResponse = await fetch(`${API_BASE_URL}/patients`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              salutation: formData.sex === 'Male' ? 'Mr.' : 'Ms.',
              name: formData.patientName,
              ageYears: parseInt(formData.age),
              ageMonths: 0,
              ageDays: 0,
              sex: formData.sex,
              phone: formData.phone,
              email: '',
              address: '',
            }),
          });

          if (!createPatientResponse.ok) {
            throw new Error('Failed to create patient');
          }

          const newPatient = await createPatientResponse.json();
          patientId = newPatient.id;
        }
      } else {
        throw new Error('Failed to fetch patients');
      }

      // Create visit request
      const visitData = {
        patientId,
        refCustomerId: clientId,
        testTemplateIds: formData.selectedTests,
        registrationDatetime: new Date().toISOString(),
        paymentMode: 'CREDIT', // B2B clients always use credit
        amountPaid: 0, // No payment upfront for B2B
      };

      const visitResponse = await fetch(`${API_BASE_URL}/visits`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(visitData),
      });

      if (!visitResponse.ok) {
        const errorData = await visitResponse.json();
        throw new Error(errorData.error || 'Failed to create visit request');
      }

      const visit = await visitResponse.json();

      setSuccess(`Visit request created successfully! Visit Code: ${visit.visitCode}`);
      
      // Reset form
      setFormData({
        patientName: '',
        age: '',
        sex: 'Male',
        phone: '',
        selectedTests: [],
      });

    } catch (error: any) {
      console.error('Error creating visit request:', error);
      setError(error.message || 'Failed to create visit request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Request New Visit</h2>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-800">{success}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Patient Information */}
          <div className="border-b pb-4">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">Patient Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Patient Name *
                </label>
                <input
                  type="text"
                  name="patientName"
                  value={formData.patientName}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter patient name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  required
                  pattern="[0-9]{10}"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="10-digit phone number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Age (Years) *
                </label>
                <input
                  type="number"
                  name="age"
                  value={formData.age}
                  onChange={handleInputChange}
                  required
                  min="0"
                  max="150"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Age in years"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sex *
                </label>
                <select
                  name="sex"
                  value={formData.sex}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
          </div>

          {/* Test Selection */}
          <div>
            <h3 className="text-lg font-semibold text-gray-700 mb-4">Select Tests *</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto border border-gray-200 rounded-lg p-4">
              {testTemplates.map(test => (
                <label
                  key={test.id}
                  className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                    formData.selectedTests.includes(test.id)
                      ? 'bg-blue-50 border-blue-500'
                      : 'bg-white border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={formData.selectedTests.includes(test.id)}
                    onChange={() => handleTestToggle(test.id)}
                    className="mr-3 h-4 w-4 text-blue-600"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-800">{test.name}</div>
                    <div className="text-sm text-gray-600">₹{test.price.toFixed(2)}</div>
                  </div>
                </label>
              ))}
            </div>

            {formData.selectedTests.length === 0 && (
              <p className="text-sm text-red-600 mt-2">Please select at least one test</p>
            )}
          </div>

          {/* Total Cost */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold text-gray-700">Total Cost:</span>
              <span className="text-2xl font-bold text-blue-600">₹{calculateTotal().toFixed(2)}</span>
            </div>
            <p className="text-sm text-gray-600 mt-2">
              This amount will be added to your account balance
            </p>
          </div>

          {/* Submit Button */}
          <div className="flex gap-4">
            <button
              type="submit"
              disabled={loading || formData.selectedTests.length === 0}
              className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Creating Request...' : 'Submit Visit Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

