import React, { useState, useEffect, useMemo } from 'react';
import type { Patient, Salutation, Sex, Visit } from '../types';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { PatientSearchModal } from './PatientSearchModal';

type AgeUnit = 'Years' | 'Months' | 'Days';
type PaymentMode = 'CASH' | 'CARD' | 'UPI' | 'CREDIT' | '';

type FormState = Omit<Patient, 'age_years' | 'age_months' | 'age_days'> & {
  age: number;
  age_unit: AgeUnit;
  ref_customer_id?: number;
  referred_doctor_id?: number;
  other_ref_doctor?: string;
  other_ref_customer?: string;
  registration_date: string;
  registration_time_hh: string;
  registration_time_mm: string;
  selected_tests: number[];
  amount_paid: number;
  payment_mode: PaymentMode;
};

const getDefaultTime = () => {
  const now = new Date();
  return {
    hh: String(now.getHours()).padStart(2, '0'),
    mm: String(now.getMinutes()).padStart(2, '0'),
  };
};

const initialFormState: FormState = {
  salutation: 'Mr',
  name: '',
  age: 0,
  age_unit: 'Years',
  sex: 'Male',
  guardian_name: '',
  phone: '',
  address: '',
  email: '',
  clinical_history: '',
  ref_customer_id: undefined,
  referred_doctor_id: undefined,
  other_ref_doctor: '',
  other_ref_customer: '',
  registration_date: new Date().toISOString().split('T')[0],
  registration_time_hh: getDefaultTime().hh,
  registration_time_mm: getDefaultTime().mm,
  selected_tests: [],
  amount_paid: 0,
  payment_mode: '',
};

interface CreateVisitFormNewProps {
  onInitiateReport: (visit: Visit) => void;
}

export const CreateVisitFormNew: React.FC<CreateVisitFormNewProps> = ({ onInitiateReport }) => {
  const { addVisit, testTemplates, clients, clientPrices } = useAppContext();
  const { user: actor } = useAuth();
  const [formData, setFormData] = useState<FormState>(initialFormState);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [referralDoctors, setReferralDoctors] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [testSearchQuery, setTestSearchQuery] = useState('');

  // Load referral doctors
  useEffect(() => {
    const fetchReferralDoctors = async () => {
      try {
        const response = await fetch('http://localhost:5001/api/referral-doctors');
        if (!response.ok) throw new Error('Failed to fetch referral doctors');
        const data = await response.json();
        setReferralDoctors(data);
      } catch (error) {
        console.error('❌ Failed to fetch referral doctors:', error);
      }
    };
    fetchReferralDoctors();
  }, []);

  // Auto-set sex based on salutation
  useEffect(() => {
    const salutation = formData.salutation;
    let newSex: Sex = formData.sex;
    if (['Mr', 'Master'].includes(salutation)) {
      newSex = 'Male';
    } else if (['Ms', 'Mrs', 'Baby'].includes(salutation)) {
      newSex = 'Female';
    }
    if (newSex !== formData.sex) {
      setFormData(prev => ({ ...prev, sex: newSex }));
    }
  }, [formData.salutation]);

  const isB2BClient = useMemo(() => formData.ref_customer_id !== undefined && formData.ref_customer_id > 0, [formData.ref_customer_id]);

  const totalCost = useMemo(() => {
    const selectedClientId = formData.ref_customer_id;
    return formData.selected_tests.reduce((acc, testId) => {
      const test = testTemplates.find(t => t.id === testId);
      if (!test) return acc;
      
      if (isB2BClient && selectedClientId) {
        const clientSpecificPrice = clientPrices.find(p => p.clientId === selectedClientId && p.testTemplateId === testId);
        if (clientSpecificPrice) {
          return acc + clientSpecificPrice.price;
        }
        return acc + test.b2b_price;
      }
      return acc + test.price;
    }, 0);
  }, [formData.selected_tests, formData.ref_customer_id, testTemplates, clientPrices, isB2BClient]);

  const amountDue = useMemo(() => totalCost - formData.amount_paid, [totalCost, formData.amount_paid]);

  const filteredTests = useMemo(() => {
    const activeTests = testTemplates.filter(t => t.isActive);
    if (!testSearchQuery) return activeTests;
    return activeTests.filter(test => 
      test.name.toLowerCase().includes(testSearchQuery.toLowerCase()) || 
      test.code.toLowerCase().includes(testSearchQuery.toLowerCase())
    );
  }, [testSearchQuery, testTemplates]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const numericFields = ['age', 'amount_paid', 'ref_customer_id', 'referred_doctor_id'];
    const parsedValue = numericFields.includes(name) && value !== '' ? Number(value) : value;
    setFormData(prev => ({ ...prev, [name]: parsedValue }));
  };

  const handleTestSelection = (testId: number) => {
    setFormData(prev => {
      const selected_tests = prev.selected_tests.includes(testId)
        ? prev.selected_tests.filter(id => id !== testId)
        : [...prev.selected_tests, testId];
      return { ...prev, selected_tests };
    });
  };

  const handleSelectPatient = (patient: any) => {
    let age = 0;
    let age_unit: AgeUnit = 'Years';
    if (patient.age_years > 0) {
      age = patient.age_years;
      age_unit = 'Years';
    } else if (patient.age_months > 0) {
      age = patient.age_months;
      age_unit = 'Months';
    } else {
      age = patient.age_days;
      age_unit = 'Days';
    }

    setFormData(prev => ({
      ...prev,
      salutation: patient.salutation,
      name: patient.name,
      age,
      age_unit,
      sex: patient.sex,
      guardian_name: patient.guardian_name || '',
      phone: patient.phone || '',
      address: patient.address || '',
      email: patient.email || '',
      clinical_history: patient.clinical_history || '',
    }));
  };

  const handleClearForm = () => {
    setFormData(initialFormState);
    setTestSearchQuery('');
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (formData.selected_tests.length === 0) {
      alert('Please select at least one test.');
      return;
    }

    if (!isB2BClient && !formData.payment_mode) {
      alert('Please select a payment mode.');
      return;
    }

    setIsSubmitting(true);

    try {
      const { age, age_unit, selected_tests, registration_date, registration_time_hh, registration_time_mm, ...restOfForm } = formData;

      let age_years = 0, age_months = 0, age_days = 0;
      if (age_unit === 'Years') age_years = age;
      else if (age_unit === 'Months') age_months = age;
      else age_days = age;

      const newVisitData = {
        patient: { ...restOfForm, age_years, age_months, age_days },
        ref_customer_id: restOfForm.ref_customer_id,
        referred_doctor_id: restOfForm.referred_doctor_id,
        other_ref_doctor: restOfForm.other_ref_doctor,
        other_ref_customer: restOfForm.other_ref_customer,
        registration_datetime: `${registration_date} ${registration_time_hh}:${registration_time_mm}`,
        testIds: selected_tests,
        total_cost: totalCost,
        amount_paid: isB2BClient ? 0 : formData.amount_paid,
        payment_mode: isB2BClient ? 'CREDIT' : formData.payment_mode,
      };

      await addVisit(newVisitData, actor);
      alert('Visit created successfully!');
      handleClearForm();
    } catch (error) {
      console.error('Failed to create visit:', error);
      alert('Failed to create visit. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isGuardianVisible = ['Baby', 'Master'].includes(formData.salutation);

  return (
    <>
      <div className="h-[calc(100vh-140px)] overflow-hidden bg-gray-50">
        <form onSubmit={handleSubmit} className="h-full flex flex-col">
          {/* Header with Full Branding */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-2 sm:px-4 py-1.5 sm:py-2 flex justify-between items-center shadow-md">
            <div>
              <h1 className="text-sm sm:text-base font-bold text-white">Sri Lakshmi Narasimha City Diagnostic Center</h1>
              <p className="text-[10px] sm:text-xs text-blue-100">New Visit Registration (SLNCity)</p>
            </div>
            <div className="flex gap-1 sm:gap-2">
              <button
                type="button"
                onClick={() => setIsSearchModalOpen(true)}
                className="px-2 sm:px-3 py-1 bg-white text-blue-600 text-xs sm:text-sm font-semibold rounded hover:bg-blue-50"
              >
                🔍 <span className="hidden sm:inline">Search Patient</span>
              </button>
              <button
                type="button"
                onClick={handleClearForm}
                className="px-2 sm:px-3 py-1 bg-blue-800 text-white text-xs sm:text-sm font-semibold rounded hover:bg-blue-900"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Main Content - Responsive 2 Column Layout */}
          <div className="flex-1 overflow-hidden p-2 sm:p-3">
            <div className="h-full grid grid-cols-1 lg:grid-cols-2 gap-2 sm:gap-3">
              {/* Left Column - All Patient & Registration Details */}
              <div className="bg-white rounded shadow overflow-hidden flex flex-col max-h-full">
                <div className="overflow-y-auto flex-1">
                <div className="p-2 sm:p-3 space-y-2 sm:space-y-3">
                  {/* Patient Information - Responsive Grid */}
                  <div>
                    <h2 className="text-xs sm:text-sm font-bold text-gray-800 mb-1 sm:mb-2 pb-1 border-b">Patient Information</h2>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2">
                      <div>
                        <label className="block text-[10px] sm:text-xs font-medium text-gray-700 mb-0.5">Salutation *</label>
                        <select name="salutation" value={formData.salutation} onChange={handleChange} required className="w-full px-1.5 sm:px-2 py-1 border border-gray-300 rounded text-[10px] sm:text-xs">
                          <option value="Mr">Mr</option>
                          <option value="Ms">Ms</option>
                          <option value="Mrs">Mrs</option>
                          <option value="Master">Master</option>
                          <option value="Baby">Baby</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] sm:text-xs font-medium text-gray-700 mb-0.5">Sex *</label>
                        <select name="sex" value={formData.sex} onChange={handleChange} required className="w-full px-1.5 sm:px-2 py-1 border border-gray-300 rounded text-[10px] sm:text-xs">
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] sm:text-xs font-medium text-gray-700 mb-0.5">Age *</label>
                        <input type="number" name="age" value={formData.age} onChange={handleChange} required className="w-full px-1.5 sm:px-2 py-1 border border-gray-300 rounded text-[10px] sm:text-xs" />
                      </div>
                      <div>
                        <label className="block text-[10px] sm:text-xs font-medium text-gray-700 mb-0.5">Unit *</label>
                        <select name="age_unit" value={formData.age_unit} onChange={handleChange} required className="w-full px-1.5 sm:px-2 py-1 border border-gray-300 rounded text-[10px] sm:text-xs">
                          <option value="Years">Years</option>
                          <option value="Months">Months</option>
                          <option value="Days">Days</option>
                        </select>
                      </div>
                      <div className="col-span-2 sm:col-span-4">
                        <label className="block text-[10px] sm:text-xs font-medium text-gray-700 mb-0.5">Name *</label>
                        <input type="text" name="name" value={formData.name} onChange={handleChange} required className="w-full px-1.5 sm:px-2 py-1 border border-gray-300 rounded text-[10px] sm:text-xs" />
                      </div>
                      {isGuardianVisible && (
                        <div className="col-span-2 sm:col-span-4">
                          <label className="block text-[10px] sm:text-xs font-medium text-gray-700 mb-0.5">Guardian Name</label>
                          <input type="text" name="guardian_name" value={formData.guardian_name || ''} onChange={handleChange} className="w-full px-1.5 sm:px-2 py-1 border border-gray-300 rounded text-[10px] sm:text-xs" />
                        </div>
                      )}
                      <div className="col-span-1 sm:col-span-2">
                        <label className="block text-[10px] sm:text-xs font-medium text-gray-700 mb-0.5">Phone</label>
                        <input type="text" name="phone" value={formData.phone} onChange={handleChange} className="w-full px-1.5 sm:px-2 py-1 border border-gray-300 rounded text-[10px] sm:text-xs" />
                      </div>
                      <div className="col-span-1 sm:col-span-2">
                        <label className="block text-[10px] sm:text-xs font-medium text-gray-700 mb-0.5">Email</label>
                        <input type="email" name="email" value={formData.email || ''} onChange={handleChange} className="w-full px-1.5 sm:px-2 py-1 border border-gray-300 rounded text-[10px] sm:text-xs" />
                      </div>
                      <div className="col-span-2 sm:col-span-4">
                        <label className="block text-[10px] sm:text-xs font-medium text-gray-700 mb-0.5">Address</label>
                        <input type="text" name="address" value={formData.address} onChange={handleChange} className="w-full px-1.5 sm:px-2 py-1 border border-gray-300 rounded text-[10px] sm:text-xs" />
                      </div>
                      <div className="col-span-2 sm:col-span-4">
                        <label className="block text-[10px] sm:text-xs font-medium text-gray-700 mb-0.5">Clinical History</label>
                        <input type="text" name="clinical_history" value={formData.clinical_history || ''} onChange={handleChange} className="w-full px-1.5 sm:px-2 py-1 border border-gray-300 rounded text-[10px] sm:text-xs" />
                      </div>
                    </div>
                  </div>

                  {/* Referral & Registration - Responsive Side by Side */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                    {/* Referral Information */}
                    <div>
                      <h2 className="text-xs sm:text-sm font-bold text-gray-800 mb-1 sm:mb-2 pb-1 border-b">Referral</h2>
                      <div className="space-y-1.5 sm:space-y-2">
                        <div>
                          <label className="block text-[10px] sm:text-xs font-medium text-gray-700 mb-0.5">Ref. Doctor</label>
                          <select name="referred_doctor_id" value={String(formData.referred_doctor_id || '')} onChange={handleChange} className="w-full px-1.5 sm:px-2 py-1 border border-gray-300 rounded text-[10px] sm:text-xs">
                            <option value="">--Select--</option>
                            {referralDoctors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] sm:text-xs font-medium text-gray-700 mb-0.5">B2B Client</label>
                          <select name="ref_customer_id" value={String(formData.ref_customer_id || '')} onChange={handleChange} className="w-full px-1.5 sm:px-2 py-1 border border-gray-300 rounded text-[10px] sm:text-xs">
                            <option value="">--Select--</option>
                            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] sm:text-xs font-medium text-gray-700 mb-0.5">Other Ref. Dr</label>
                          <input type="text" name="other_ref_doctor" value={formData.other_ref_doctor || ''} onChange={handleChange} className="w-full px-1.5 sm:px-2 py-1 border border-gray-300 rounded text-[10px] sm:text-xs" />
                        </div>
                        <div>
                          <label className="block text-[10px] sm:text-xs font-medium text-gray-700 mb-0.5">Other Ref. Cust</label>
                          <input type="text" name="other_ref_customer" value={formData.other_ref_customer || ''} onChange={handleChange} className="w-full px-1.5 sm:px-2 py-1 border border-gray-300 rounded text-[10px] sm:text-xs" />
                        </div>
                      </div>
                    </div>

                    {/* Registration Details */}
                    <div>
                      <h2 className="text-xs sm:text-sm font-bold text-gray-800 mb-1 sm:mb-2 pb-1 border-b">Registration</h2>
                      <div className="space-y-1.5 sm:space-y-2">
                        <div>
                          <label className="block text-[10px] sm:text-xs font-medium text-gray-700 mb-0.5">Date *</label>
                          <input type="date" name="registration_date" value={formData.registration_date} onChange={handleChange} required className="w-full px-1.5 sm:px-2 py-1 border border-gray-300 rounded text-[10px] sm:text-xs" />
                        </div>
                        <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                          <div>
                            <label className="block text-[10px] sm:text-xs font-medium text-gray-700 mb-0.5">Hour *</label>
                            <input type="text" name="registration_time_hh" value={formData.registration_time_hh} onChange={handleChange} required className="w-full px-1.5 sm:px-2 py-1 border border-gray-300 rounded text-[10px] sm:text-xs" />
                          </div>
                          <div>
                            <label className="block text-[10px] sm:text-xs font-medium text-gray-700 mb-0.5">Min *</label>
                            <input type="text" name="registration_time_mm" value={formData.registration_time_mm} onChange={handleChange} required className="w-full px-1.5 sm:px-2 py-1 border border-gray-300 rounded text-[10px] sm:text-xs" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Payment Summary - Responsive */}
                  <div className="px-2 sm:px-3 pb-2">
                    <h2 className="text-xs sm:text-sm font-bold text-gray-800 mb-1 sm:mb-2 pb-1 border-b">Payment</h2>
                    {!isB2BClient ? (
                      <div className="space-y-1.5 sm:space-y-2">
                        <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                          <div>
                            <label className="block text-[10px] sm:text-xs font-medium text-gray-700 mb-0.5">Mode *</label>
                            <select name="payment_mode" value={formData.payment_mode} onChange={handleChange} required className="w-full px-1.5 sm:px-2 py-1 border border-gray-300 rounded text-[10px] sm:text-xs">
                              <option value="">--Select--</option>
                              <option value="CASH">Cash</option>
                              <option value="CARD">Card</option>
                              <option value="UPI">UPI</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] sm:text-xs font-medium text-gray-700 mb-0.5">Amount Paid</label>
                            <input type="number" name="amount_paid" value={formData.amount_paid} onChange={handleChange} className="w-full px-1.5 sm:px-2 py-1 border border-gray-300 rounded text-[10px] sm:text-xs" />
                          </div>
                        </div>
                        <div className="bg-yellow-50 p-1.5 sm:p-2 rounded border border-yellow-200">
                          <div className="flex justify-between text-[10px] sm:text-xs font-semibold">
                            <span className="text-green-600">Total: ₹{totalCost.toFixed(2)}</span>
                            <span className="text-red-600">Due: ₹{amountDue.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-blue-100 p-1.5 sm:p-2 rounded text-[10px] sm:text-xs text-blue-800 font-semibold">
                        B2B Credit: ₹{totalCost.toFixed(2)}
                      </div>
                    )}
                  </div>

                  {/* Create Visit Button - Responsive */}
                  <div className="px-2 sm:px-3 pb-2 sm:pb-3">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-1.5 sm:py-2 bg-green-600 text-white font-semibold text-xs sm:text-sm rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? '⏳ Creating...' : '✓ Create Visit'}
                    </button>
                  </div>
                </div>
              </div>
              </div>

              {/* Right Column - Split into Available & Selected Tests - Responsive */}
              <div className="bg-white rounded shadow overflow-hidden grid grid-cols-2 gap-0 max-h-full">
                {/* Left Half - Available Tests */}
                <div className="border-r flex flex-col overflow-hidden">
                  <div className="bg-blue-600 text-white px-1.5 sm:px-2 py-1 text-[10px] sm:text-xs font-bold">
                    Available Tests
                  </div>
                  <div className="p-1.5 sm:p-2 border-b">
                    <input
                      type="text"
                      placeholder="🔍 Search tests..."
                      value={testSearchQuery}
                      onChange={(e) => setTestSearchQuery(e.target.value)}
                      className="w-full px-1.5 sm:px-2 py-1 border border-gray-300 rounded text-[10px] sm:text-xs"
                    />
                  </div>
                  <div className="flex-1 overflow-y-auto p-1.5 sm:p-2">
                    <div className="space-y-1">
                      {filteredTests.map(test => {
                        const isSelected = formData.selected_tests.includes(test.id);
                        const price = isB2BClient ? (clientPrices.find(p => p.clientId === formData.ref_customer_id && p.testTemplateId === test.id)?.price || test.b2b_price) : test.price;
                        return (
                          <div
                            key={test.id}
                            onDoubleClick={() => handleTestSelection(test.id)}
                            className={`p-1.5 sm:p-2 rounded cursor-pointer text-[10px] sm:text-xs ${
                              isSelected
                                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                : 'bg-white border border-gray-300 hover:bg-blue-50 hover:border-blue-400'
                            }`}
                            title={isSelected ? 'Already selected' : 'Double-click to add'}
                          >
                            <div className="flex justify-between items-start">
                              <div className="flex-1 min-w-0">
                                <div className="font-semibold truncate">{test.name}</div>
                                <div className="text-gray-500 text-[9px] sm:text-[10px]">{test.code}</div>
                              </div>
                              <div className="font-bold text-green-600 ml-1 sm:ml-2 flex-shrink-0">₹{price}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Right Half - Selected Tests - Responsive */}
                <div className="flex flex-col overflow-hidden">
                  <div className="bg-green-600 text-white px-1.5 sm:px-2 py-1 text-[10px] sm:text-xs font-bold flex justify-between items-center">
                    <span>Selected ({formData.selected_tests.length})</span>
                    <span className="hidden sm:inline">Total: ₹{totalCost.toFixed(2)}</span>
                    <span className="sm:hidden">₹{totalCost.toFixed(2)}</span>
                  </div>
                  <div className="flex-1 overflow-y-auto p-1.5 sm:p-2">
                    {formData.selected_tests.length === 0 ? (
                      <div className="text-center text-gray-400 text-[10px] sm:text-xs mt-4 sm:mt-8">
                        <div className="text-xl sm:text-2xl mb-1 sm:mb-2">👉</div>
                        <div>Double-click tests</div>
                        <div>from left to add</div>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {formData.selected_tests.map(testId => {
                          const test = testTemplates.find(t => t.id === testId);
                          if (!test) return null;
                          const price = isB2BClient ? (clientPrices.find(p => p.clientId === formData.ref_customer_id && p.testTemplateId === test.id)?.price || test.b2b_price) : test.price;
                          return (
                            <div
                              key={testId}
                              onDoubleClick={() => handleTestSelection(testId)}
                              className="p-1.5 sm:p-2 bg-green-50 border border-green-300 rounded cursor-pointer hover:bg-green-100 text-[10px] sm:text-xs"
                              title="Double-click to remove"
                            >
                              <div className="flex justify-between items-start">
                                <div className="flex-1 min-w-0">
                                  <div className="font-semibold text-gray-800 truncate">{test.name}</div>
                                  <div className="text-gray-500 text-[9px] sm:text-[10px]">{test.code}</div>
                                </div>
                                <div className="font-bold text-green-600 ml-1 sm:ml-2 flex-shrink-0">₹{price}</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>

      <PatientSearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        onSelectPatient={handleSelectPatient}
      />
    </>
  );
};

