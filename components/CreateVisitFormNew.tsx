import React, { useState, useEffect, useMemo } from 'react';
import type { Patient, Salutation, Sex, Visit, VisitTest } from '../types';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { PatientSearchModal } from './PatientSearchModal';
import { SearchableSelect } from './form/SearchableSelect';
import { API_BASE_URL } from '../config/api';
import { StatusBadgeFromTest } from './StatusBadge';
import { DateFilter, DateFilterOption, filterByDate } from './DateFilter';

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
  age: 1,
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
  const { addVisit, testTemplates, clients, clientPrices, referralDoctors, visits, visitTests, loadTestTemplates, loadClients, loadClientPrices, loadBranches, loadReferralDoctors, loadVisits, loadVisitTests } = useAppContext();
  const { user: actor } = useAuth();
  const [formData, setFormData] = useState<FormState>(initialFormState);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [testSearchQuery, setTestSearchQuery] = useState('');
  const [recentRegistrationsFilter, setRecentRegistrationsFilter] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilterOption>('today');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Calculate if this is a B2B client - MUST be defined before useEffects that use it
  const isB2BClient = useMemo(() => formData.ref_customer_id !== undefined && formData.ref_customer_id > 0, [formData.ref_customer_id]);

  // LAZY LOADING: Load data only when this component mounts
  useEffect(() => {
    console.log('🔥 CreateVisitForm: Component MOUNTED');
    console.log('📦 CreateVisitForm: Loading required data...');
    Promise.all([
      loadTestTemplates(),
      loadClients(),
      loadBranches(),
      loadReferralDoctors(), // FIX: Use AppContext function instead of direct fetch
      loadVisits(), // Load visits for the recent registrations table
      loadVisitTests(), // Load visit tests for status display
    ]).then(() => {
      console.log('✅ CreateVisitForm: Data loaded');
    });

    return () => {
      console.log('💀 CreateVisitForm: Component UNMOUNTED');
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Load client prices when B2B client is selected
  useEffect(() => {
    if (formData.ref_customer_id && isB2BClient) {
      console.log(`📦 Loading prices for client ${formData.ref_customer_id}...`);
      loadClientPrices(formData.ref_customer_id);
    }
  }, [formData.ref_customer_id, isB2BClient]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-set sex based on salutation
  useEffect(() => {
    const salutation = formData.salutation;
    let newSex: Sex = formData.sex;
    if (['Mr', 'Master'].includes(salutation)) {
      newSex = 'Male';
    } else if (['Ms', 'Mrs', 'Baby'].includes(salutation)) {
      newSex = 'Female';
    }
    // For 'Baby of', keep the current sex selection (don't auto-change)
    if (newSex !== formData.sex && salutation !== 'Baby of') {
      setFormData(prev => ({ ...prev, sex: newSex }));
    }
  }, [formData.salutation]);

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

  // Calculate pending tests count - ALL tests that are not yet printed (across all dates)
  const pendingTestsCount = useMemo(() => {
    return visitTests.filter(test =>
      test.status !== 'PRINTED' &&
      test.status !== 'COMPLETED' &&
      test.status !== 'CANCELLED'
    ).length;
  }, [visitTests]);

  // Sort visits by created_at DESC (most recent first), filter by date and search, and limit to 20
  const sortedVisits = useMemo(() => {
    // First apply date filter
    let filtered = filterByDate(visits, dateFilter, customStartDate, customEndDate);

    // Then apply search filter if search query exists
    if (recentRegistrationsFilter) {
      const query = recentRegistrationsFilter.toLowerCase();
      filtered = filtered.filter(visit =>
        visit.visit_code.toLowerCase().includes(query) ||
        visit.patient.name.toLowerCase().includes(query) ||
        new Date(visit.created_at).toLocaleDateString().includes(query)
      );
    }

    return filtered
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 20);
  }, [visits, recentRegistrationsFilter, dateFilter, customStartDate, customEndDate]);

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

    if (formData.age < 1) {
      alert('Age must be at least 1.');
      return;
    }

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

  const isGuardianVisible = ['Baby', 'Master', 'Baby of'].includes(formData.salutation);

  return (
    <>
      <div className="h-[calc(100vh-140px)] overflow-hidden bg-gray-50">
        <form onSubmit={handleSubmit} className="h-full flex flex-col">
          {/* Header with Full Branding */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-2 sm:px-4 py-2 sm:py-3 flex justify-between items-center shadow-md">
            <div>
              <h1 className="text-base sm:text-lg font-bold text-white">New Visit Registration (SLNCity)</h1>
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
                          <option value="Baby of">Baby of</option>
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
                        <input type="number" name="age" value={formData.age} onChange={handleChange} required min="1" className="w-full px-1.5 sm:px-2 py-1 border border-gray-300 rounded text-[10px] sm:text-xs" />
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
                          <SearchableSelect
                            options={referralDoctors.map(d => ({
                                value: d.id,
                                label: d.designation ? `${d.name}, ${d.designation}` : d.name
                            }))}
                            value={formData.referred_doctor_id || ''}
                            onChange={(value) => handleChange({ target: { name: 'referred_doctor_id', value: value === '' ? '' : Number(value) } } as any)}
                            placeholder="--Select--"
                            className="text-[10px] sm:text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] sm:text-xs font-medium text-gray-700 mb-0.5">B2B Client</label>
                          <SearchableSelect
                            options={clients.map(c => ({ value: c.id, label: c.name }))}
                            value={formData.ref_customer_id || ''}
                            onChange={(value) => handleChange({ target: { name: 'ref_customer_id', value: value === '' ? '' : Number(value) } } as any)}
                            placeholder="--Select--"
                            className="text-[10px] sm:text-xs"
                          />
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

      {/* Pending Tests Summary */}
      <div className="bg-gradient-to-r from-yellow-50 to-orange-50 p-4 sm:p-6 rounded-xl shadow-lg mt-4 border-l-4 border-yellow-500">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-1">Pending Tests</h3>
            <p className="text-sm text-gray-600">All tests pending until report is printed (across all dates)</p>
          </div>
          <div className="text-right">
            <div className="text-3xl sm:text-4xl font-bold text-yellow-600">{pendingTestsCount}</div>
            <p className="text-xs text-gray-500 mt-1">Total Pending</p>
          </div>
        </div>
      </div>

      {/* Recent Registrations Table */}
      <div className="bg-white p-4 sm:p-6 rounded-xl shadow-lg mt-4">
        <div className="flex flex-col gap-4 mb-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <h3 className="text-lg sm:text-xl font-bold text-gray-800">Recent Registrations</h3>
            <input
              type="text"
              placeholder="Search by visit code, patient name, or date..."
              value={recentRegistrationsFilter}
              onChange={(e) => setRecentRegistrationsFilter(e.target.value)}
              className="w-full sm:w-64 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Date Filter */}
          <DateFilter
            selectedFilter={dateFilter}
            onFilterChange={setDateFilter}
            customStartDate={customStartDate}
            customEndDate={customEndDate}
            onCustomDateChange={(start, end) => {
              setCustomStartDate(start);
              setCustomEndDate(end);
            }}
          />
        </div>
        <div className="overflow-x-auto border rounded-lg">
          <table className="min-w-full bg-white">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Visit Code</th>
                <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Patient</th>
                <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Test Statuses</th>
                <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment</th>
                <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {sortedVisits.map(visit => {
                const visitTestsForVisit = visit.tests.map(testId => visitTests.find(vt => vt.id === testId)).filter(Boolean) as VisitTest[];
                const client = clients.find(c => c.id === visit.ref_customer_id);
                const isB2BVisit = client?.type === 'REFERRAL_LAB';
                const allTestsApproved = visitTestsForVisit.length > 0 && visitTestsForVisit.every(vt => vt.status === 'APPROVED');

                const canPrintDirectly = isB2BVisit || visit.due_amount <= 0;
                const needsDueCollection = !isB2BVisit && visit.due_amount > 0;

                let button;
                if (allTestsApproved) {
                  if (canPrintDirectly) {
                    button = (
                      <button
                        onClick={() => onInitiateReport(visit)}
                        className="px-2 sm:px-3 py-1 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors text-xs"
                      >
                        Print Report
                      </button>
                    );
                  } else if (needsDueCollection) {
                    button = (
                      <button
                        disabled
                        title="Collect due payment before printing"
                        className="px-2 sm:px-3 py-1 bg-gray-400 text-white font-semibold rounded-lg shadow-md cursor-not-allowed text-xs"
                      >
                        Collect Due
                      </button>
                    );
                  }
                } else {
                  button = (
                    <button
                      disabled
                      title="Report cannot be printed until all tests are approved."
                      className="px-2 sm:px-3 py-1 bg-gray-400 text-white font-semibold rounded-lg shadow-md cursor-not-allowed text-xs"
                    >
                      Print Report
                    </button>
                  );
                }

                return (
                  <tr key={visit.id} className="hover:bg-gray-50">
                    <td className="px-3 sm:px-4 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm font-medium text-gray-900">{visit.visit_code}</td>
                    <td className="px-3 sm:px-4 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-600">{visit.patient.name}</td>
                    <td className="px-3 sm:px-4 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-600">{new Date(visit.created_at).toLocaleDateString()}</td>
                    <td className="px-3 sm:px-4 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-600">
                      <div className="flex flex-wrap gap-1">
                        {visitTestsForVisit.map(vt => <StatusBadgeFromTest key={vt.id} test={vt} />)}
                      </div>
                    </td>
                    <td className="px-3 sm:px-4 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm">
                      {visit.due_amount > 0 ? (
                        <span className="text-red-600 font-semibold">Due: ₹{visit.due_amount.toFixed(2)}</span>
                      ) : (
                        <span className="text-green-600 font-semibold">Paid</span>
                      )}
                    </td>
                    <td className="px-3 sm:px-4 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm">
                      {button}
                    </td>
                  </tr>
                );
              })}
              {sortedVisits.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-xs sm:text-sm text-gray-500">No visits have been created yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};

