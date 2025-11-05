import React, { useState, useEffect, useMemo } from 'react';
import type { Patient, Salutation, Sex, Visit, VisitTest } from '../types';
import { Input } from './form/Input';
import { Select } from './form/Select';
import { useAppContext } from '../context/AppContext';
import { CollectDueModal } from './CollectDueModal';
import { useAuth } from '../context/AuthContext';

type AgeUnit = 'Years' | 'Months' | 'Days';
type PaymentMode = 'Cash' | 'Card' | 'UPI' | '';

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
  selected_tests: number[]; // Array of TestTemplate IDs
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

const SuccessDisplay: React.FC<{ visit: Visit, isB2B: boolean, onNew: () => void }> = ({ visit, isB2B, onNew }) => {
    const canPrintInvoice = isB2B || visit.due_amount <= 0;
    
    return (
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-2xl mx-auto text-center">
            <svg className="mx-auto h-16 w-16 text-green-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="mt-4 text-2xl font-bold text-gray-800">Visit Created Successfully!</h2>
            <p className="mt-2 text-gray-600">Visit Code: <span className="font-semibold text-gray-900">{visit.visit_code}</span></p>
            
            <div className="mt-6 p-4 border rounded-lg bg-gray-50 text-left space-y-2">
                <p><strong>Patient:</strong> {visit.patient.name}</p>
                <p><strong>Total Cost:</strong> ₹{visit.total_cost.toFixed(2)}</p>
                <p><strong>Amount Paid:</strong> ₹{visit.amount_paid.toFixed(2)}</p>
                <p className="font-semibold"><strong>Amount Due:</strong> ₹{visit.due_amount.toFixed(2)}</p>
            </div>

            <div className="mt-8 flex justify-center space-x-4">
                <button
                    onClick={() => alert(`Printing invoice for visit ${visit.visit_code}...`)}
                    disabled={!canPrintInvoice}
                    className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    title={!canPrintInvoice ? "Invoice cannot be printed for unpaid visits." : "Print Invoice"}
                >
                    Print Invoice
                </button>
                <button
                    onClick={onNew}
                    className="px-6 py-2 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                    Create New Visit
                </button>
            </div>
        </div>
    );
};

const StatusBadge: React.FC<{ status: VisitTest['status'] }> = ({ status }) => {
  const baseClasses = "px-2 py-0.5 text-xs font-medium rounded-full inline-block";
  const statusMap: Record<VisitTest['status'], string> = {
    PENDING: "bg-yellow-100 text-yellow-800",
    SAMPLE_COLLECTED: "bg-blue-100 text-blue-800",
    AWAITING_APPROVAL: "bg-purple-100 text-purple-800",
    APPROVED: "bg-green-100 text-green-800",
    IN_PROGRESS: "bg-indigo-100 text-indigo-800",
    COMPLETED: "bg-gray-100 text-gray-800",
  };
  const colorClasses = statusMap[status] || "bg-gray-100 text-gray-800";
  
  return (
    <span className={`${baseClasses} ${colorClasses}`}>
      {status.replace('_', ' ')}
    </span>
  );
};


interface CreateVisitFormProps {
  onInitiateReport: (visit: Visit) => void;
}

export const CreateVisitForm: React.FC<CreateVisitFormProps> = ({ onInitiateReport }) => {
  const { addVisit, visits, visitTests, collectDuePayment, testTemplates, clients, clientPrices, patients } = useAppContext();
  const { user: actor } = useAuth();
  const [formData, setFormData] = useState<FormState>(initialFormState);
  const [isGuardianVisible, setGuardianVisible] = useState(false);
  const [isSexDisabled, setSexDisabled] = useState(true);
  const [submissionStatus, setSubmissionStatus] = useState<'idle' | 'submitted' | 'error'>('idle');
  const [searchQuery, setSearchQuery] = useState('');
  const [isPatientLoaded, setIsPatientLoaded] = useState(false);
  const [testSearchQuery, setTestSearchQuery] = useState('');
  const [referralDoctors, setReferralDoctors] = useState<any[]>([]);
  const [isB2BClient, setIsB2BClient] = useState(false);
  const [visitToCollectDue, setVisitToCollectDue] = useState<Visit | null>(null);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  // Get the most recently created visit (visits are sorted by created_at DESC from backend)
  const lastSubmittedVisit = useMemo(() => submissionStatus === 'submitted' && visits.length > 0 ? visits[0] : null, [visits, submissionStatus]);


  useEffect(() => {
    const salutation = formData.salutation;
    let newSex: Sex = formData.sex;
    let sexDisabled = true;
    let guardianVisible = false;

    if (['Mr', 'Master'].includes(salutation)) {
      newSex = 'Male';
    } else if (['Ms', 'Mrs', 'Baby'].includes(salutation)) {
      newSex = 'Female';
    } else if (salutation === 'Baby of') {
      newSex = formData.sex === 'Male' || formData.sex === 'Female' || formData.sex === 'Other' ? formData.sex : '';
      sexDisabled = false;
      guardianVisible = true;
    }

    setFormData(prev => ({ ...prev, sex: newSex }));
    setSexDisabled(sexDisabled);
    setGuardianVisible(guardianVisible);
  }, [formData.salutation]);

  useEffect(() => {
    const fetchReferralDoctors = async () => {
      try {
        const response = await fetch('http://localhost:5001/api/referral-doctors');
        if (!response.ok) throw new Error('Failed to fetch referral doctors');
        const data = await response.json();
        console.log('✅ Loaded referral doctors:', data);
        setReferralDoctors(data);
      } catch (error) {
        console.error('❌ Failed to fetch referral doctors:', error);
      }
    };
    fetchReferralDoctors();
  }, []);
  
  const totalCost = useMemo(() => {
    const selectedClientId = formData.ref_customer_id;
    return formData.selected_tests.reduce((acc, testId) => {
      const test = testTemplates.find(t => t.id === testId);
      if (!test) return acc;
      
      // Pricing Hierarchy: Client-Specific > Default B2B > Walk-in
      if (isB2BClient && selectedClientId) {
          const clientSpecificPrice = clientPrices.find(p => p.clientId === selectedClientId && p.testTemplateId === testId);
          if (clientSpecificPrice) {
              return acc + clientSpecificPrice.price;
          }
          return acc + test.b2b_price; // Fallback to default B2B price
      }
      return acc + test.price; // Walk-in price
    }, 0);
  }, [formData.selected_tests, testTemplates, isB2BClient, formData.ref_customer_id, clientPrices]);

  useEffect(() => {
    if (formData.ref_customer_id) {
        const client = clients.find(c => c.id === Number(formData.ref_customer_id));
        if (client && client.type === 'REFERRAL_LAB') {
            setIsB2BClient(true);
            setFormData(prev => ({...prev, amount_paid: totalCost, payment_mode: ''}));
        } else {
            setIsB2BClient(false);
            // Reset amount_paid if user switches from B2B to non-B2B and cost changes
            if(isB2BClient) setFormData(prev => ({...prev, amount_paid: 0}));
        }
    } else {
        setIsB2BClient(false);
        if(isB2BClient) setFormData(prev => ({...prev, amount_paid: 0}));
    }
  }, [formData.ref_customer_id, totalCost, clients, isB2BClient]);
  
  const amountDue = useMemo(() => totalCost - formData.amount_paid, [totalCost, formData.amount_paid]);

  const filteredTests = useMemo(() => {
    const activeTests = testTemplates.filter(t => t.isActive);
    if (!testSearchQuery) {
        return activeTests;
    }
    return activeTests.filter(test => 
        test.name.toLowerCase().includes(testSearchQuery.toLowerCase()) || 
        test.code.toLowerCase().includes(testSearchQuery.toLowerCase())
    );
  }, [testSearchQuery, testTemplates]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    // Convert value to number for specific fields
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

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
        alert("Please enter a phone number or patient name to search.");
        return;
    }

    setIsSearching(true);
    setSearchResults([]);

    try {
      const response = await fetch(`http://localhost:5001/api/patients/search/${encodeURIComponent(searchQuery.trim())}`);
      if (!response.ok) throw new Error('Search failed');

      const results = await response.json();
      console.log('🔍 Search results:', results);

      if (results.length === 0) {
        alert('No patients found. Please check the phone number or name and try again.');
        setIsPatientLoaded(false);
      } else if (results.length === 1) {
        // Auto-load if only one result
        loadPatientData(results[0]);
      } else {
        // Show multiple results
        setSearchResults(results);
      }
    } catch (error) {
      console.error('❌ Search error:', error);
      alert('Failed to search patients. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const loadPatientData = (foundPatient: any) => {
    let age = 0;
    let age_unit: AgeUnit = 'Years';
    if (foundPatient.age_years > 0) {
        age = foundPatient.age_years;
        age_unit = 'Years';
    } else if (foundPatient.age_months > 0) {
        age = foundPatient.age_months;
        age_unit = 'Months';
    } else {
        age = foundPatient.age_days;
        age_unit = 'Days';
    }

    setFormData(prev => ({
        ...prev,
        salutation: foundPatient.salutation,
        name: foundPatient.name,
        age: age,
        age_unit: age_unit,
        sex: foundPatient.sex,
        guardian_name: foundPatient.guardian_name || '',
        phone: foundPatient.phone,
        address: foundPatient.address || '',
        email: foundPatient.email || '',
        clinical_history: foundPatient.clinical_history || '',
    }));
    setIsPatientLoaded(true);
    setSearchResults([]);
  };

  const handleClearForm = () => {
      setFormData(initialFormState);
      setIsPatientLoaded(false);
      setSearchQuery('');
      setTestSearchQuery('');
      setSearchResults([]);
  };

  const handleStartNewVisit = () => {
    handleClearForm();
    setSubmissionStatus('idle');
  }


  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!actor) {
        alert("User session has expired. Please log in again.");
        return;
    }

    if (formData.selected_tests.length === 0) {
        alert("Please select at least one test.");
        return;
    }

    const { age, age_unit, ...restOfForm } = formData;

    const newVisitData = {
        patient: {
            salutation: restOfForm.salutation,
            name: restOfForm.name,
            age_years: age_unit === 'Years' ? age : 0,
            age_months: age_unit === 'Months' ? age : 0,
            age_days: age_unit === 'Days' ? age : 0,
            sex: restOfForm.sex,
            guardian_name: restOfForm.guardian_name,
            phone: restOfForm.phone,
            address: restOfForm.address,
            email: restOfForm.email,
            clinical_history: restOfForm.clinical_history,
        },
        ref_customer_id: restOfForm.ref_customer_id,
        referred_doctor_id: restOfForm.referred_doctor_id,
        other_ref_doctor: restOfForm.other_ref_doctor,
        other_ref_customer: restOfForm.other_ref_customer,
        registration_datetime: `${restOfForm.registration_date} ${restOfForm.registration_time_hh}:${restOfForm.registration_time_mm}`,
        testIds: restOfForm.selected_tests,
        total_cost: totalCost,
        amount_paid: isB2BClient ? 0 : restOfForm.amount_paid, // B2B clients don't pay upfront
        payment_mode: isB2BClient ? '' : restOfForm.payment_mode,
    };

    try {
      await addVisit(newVisitData, actor);
      setSubmissionStatus('submitted');
    } catch (error) {
      console.error('Failed to create visit:', error);
      alert('Failed to create visit. Please try again.');
      setSubmissionStatus('error');
    }
  };

  const handleCollectDueSuccess = (visitId: number, amount: number, mode: PaymentMode) => {
    if (!actor) {
        alert("User session has expired. Please log in again.");
        return;
    }
    collectDuePayment(visitId, amount, mode, actor);
    setVisitToCollectDue(null);
    const updatedVisit = visits.find(v => v.id === visitId);
    if (updatedVisit) {
      const finalVisitState = {
        ...updatedVisit,
        amount_paid: updatedVisit.amount_paid + amount,
        due_amount: updatedVisit.due_amount - amount
      };
      onInitiateReport(finalVisitState);
    }
  };
  
  const salutationOptions = ['Mr', 'Ms', 'Mrs', 'Master', 'Baby', 'Baby of'];
  const sexOptions = ['Male', 'Female', 'Other'];
  const ageUnitOptions: AgeUnit[] = ['Years', 'Months', 'Days'];
  const hourOptions = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
  const minuteOptions = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));
  const paymentModeOptions: { label: string, value: PaymentMode }[] = [
    { label: '--Select Mode--', value: ''},
    { label: 'Cash', value: 'Cash' },
    { label: 'Card', value: 'Card' },
    { label: 'UPI', value: 'UPI' },
  ];

  if (submissionStatus === 'submitted' && lastSubmittedVisit) {
    const client = clients.find(c => c.id === lastSubmittedVisit.ref_customer_id);
    const isB2B = client?.type === 'REFERRAL_LAB';
    return <SuccessDisplay visit={lastSubmittedVisit} isB2B={isB2B} onNew={handleStartNewVisit} />
  }

  const sortedVisits = [...visits].sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return (
    <>
    {visitToCollectDue && (
        <CollectDueModal 
            visit={visitToCollectDue}
            onClose={() => setVisitToCollectDue(null)}
            onSuccess={handleCollectDueSuccess}
        />
    )}
    <div className="space-y-8 max-w-7xl mx-auto">
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-lg space-y-6">
        
        <fieldset>
            <legend className="text-xl font-bold text-gray-800 flex items-center">
                New Patient Registration
                {isPatientLoaded && <span className="ml-3 text-sm font-normal text-green-700">(Loaded)</span>}
            </legend>
            <div className="mt-4 border rounded-lg p-4 space-y-4">
                {/* Search Row */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-end">
                    <Input
                        name="patient_search_mobile"
                        label=""
                        placeholder="Search by Phone or Name"
                        className="sm:col-span-6"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    />
                    <button
                        type="button"
                        onClick={handleSearch}
                        disabled={isSearching}
                        className="sm:col-span-3 px-4 py-2 bg-green-500 text-white font-semibold rounded-md shadow-sm hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSearching ? 'Searching...' : 'Search Patient'}
                    </button>
                    <button
                        type="button"
                        onClick={handleClearForm}
                        className="sm:col-span-3 px-4 py-2 bg-gray-200 text-gray-700 font-semibold rounded-md shadow-sm hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400"
                    >
                        Clear Form
                    </button>
                </div>

                {/* Search Results */}
                {searchResults.length > 0 && (
                    <div className="border rounded-lg p-4 bg-blue-50">
                        <h4 className="font-semibold text-gray-800 mb-3">Found {searchResults.length} patient(s). Click to load:</h4>
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                            {searchResults.map((patient) => (
                                <button
                                    key={patient.id}
                                    type="button"
                                    onClick={() => loadPatientData(patient)}
                                    className="w-full text-left p-3 bg-white rounded-md hover:bg-blue-100 border border-gray-200 transition-colors"
                                >
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="font-semibold text-gray-900">{patient.salutation} {patient.name}</p>
                                            <p className="text-sm text-gray-600">
                                                {patient.sex} • {patient.age_years}y {patient.age_months}m {patient.age_days}d
                                            </p>
                                            <p className="text-sm text-gray-500">📞 {patient.phone}</p>
                                        </div>
                                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Click to load</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Patient Info Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 pt-4 border-t">
                    <div className="sm:col-span-2">
                        <label htmlFor="salutation" className="block text-sm font-medium text-gray-700 mb-1">Initial</label>
                        <Select name="salutation" label="" value={formData.salutation} onChange={handleChange} options={salutationOptions} required />
                    </div>
                    <Input name="name" label="Patient Name" value={formData.name} onChange={handleChange} required className="sm:col-span-10"/>

                    <div className="sm:col-span-3 grid grid-cols-2 gap-2">
                        <Input name="age" label="Age" type="number" value={String(formData.age)} onChange={handleChange} required min="0" />
                        <Select name="age_unit" label="" value={formData.age_unit} onChange={handleChange} options={ageUnitOptions} required className="self-end"/>
                    </div>

                    <Select name="sex" label="Gender" value={formData.sex} onChange={handleChange} options={sexOptions} required disabled={isSexDisabled} className="sm:col-span-2" />
                    
                    <Input name="registration_date" label="Registration Date" type="date" value={formData.registration_date} onChange={handleChange} required className="sm:col-span-3"/>
                    
                    <div className="sm:col-span-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Registration Time (HH:MM)</label>
                        <div className="grid grid-cols-2 gap-2">
                            <Select name="registration_time_hh" label="" value={formData.registration_time_hh} onChange={handleChange} options={hourOptions} required />
                            <Select name="registration_time_mm" label="" value={formData.registration_time_mm} onChange={handleChange} options={minuteOptions} required />
                        </div>
                    </div>

                    {isGuardianVisible && <Input name="guardian_name" label="Guardian Name" value={formData.guardian_name || ''} onChange={handleChange} required={isGuardianVisible} className="sm:col-span-12"/>}

                    <Select name="referred_doctor_id" label="Ref Doctor" value={String(formData.referred_doctor_id || '')} onChange={handleChange} options={[{label: '--Select Doctor--', value: ''}, ...referralDoctors.map(d => ({ label: d.name, value: d.id }))]} className="sm:col-span-6"/>
                    <Select name="ref_customer_id" label="B2B Client / Customer" value={String(formData.ref_customer_id || '')} onChange={handleChange} options={[{label: '--Select Customer--', value: ''}, ...clients.map(c => ({ label: c.name, value: c.id }))]} className="sm:col-span-6"/>
                    
                    <Input name="other_ref_doctor" label="Other Ref. Doctor" value={formData.other_ref_doctor || ''} onChange={handleChange} className="sm:col-span-6"/>
                    <Input name="other_ref_customer" label="Other Ref. Customer" value={formData.other_ref_customer || ''} onChange={handleChange} className="sm:col-span-6"/>

                    <Input name="phone" label="Mobile" value={formData.phone} onChange={handleChange} required className="sm:col-span-6"/>
                    <Input name="email" label="Email" type="email" value={formData.email || ''} onChange={handleChange} className="sm:col-span-6"/>

                    <div className="sm:col-span-12">
                    <label htmlFor="clinical_history" className="block text-sm font-medium text-gray-700 mb-1">Clinical History</label>
                    <textarea
                        id="clinical_history"
                        name="clinical_history"
                        value={formData.clinical_history || ''}
                        onChange={handleChange}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 bg-white text-gray-900 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
                    />
                    </div>
                </div>
            </div>
        </fieldset>

        <fieldset>
            <legend className="text-lg font-semibold text-gray-700 mb-2">Test Selection</legend>
            <div className="p-4 border rounded-lg bg-gray-50 space-y-4">
                <Input 
                    name="test_search"
                    label=""
                    placeholder="Search for a test by name or code..."
                    value={testSearchQuery}
                    onChange={(e) => setTestSearchQuery(e.target.value)}
                />
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-h-60 overflow-y-auto border-t pt-4">
                {filteredTests.map(test => {
                    const price = isB2BClient ? (clientPrices.find(p => p.clientId === formData.ref_customer_id && p.testTemplateId === test.id)?.price || test.b2b_price) : test.price;
                    return (
                        <label key={test.id} className="flex items-center space-x-3 p-3 rounded-lg hover:bg-green-50 cursor-pointer transition-colors">
                        <input
                            type="checkbox"
                            checked={formData.selected_tests.includes(test.id)}
                            onChange={() => handleTestSelection(test.id)}
                            className="h-5 w-5 rounded border-gray-300 text-green-600 focus:ring-green-500"
                        />
                        <span className="text-sm font-medium text-gray-700">{test.name}</span>
                        <span className="text-xs text-gray-500 ml-auto">₹{price}</span>
                        </label>
                    );
                })}
                {filteredTests.length === 0 && (
                    <p className="col-span-full text-center text-sm text-gray-500">No tests found matching your search.</p>
                )}
                </div>
            </div>
        </fieldset>
        
        {!isB2BClient ? (
            <fieldset>
                <legend className="text-lg font-semibold text-gray-700">Payment Details</legend>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4 p-4 border rounded-lg">
                    <Input name="amount_paid" label="Amount Paid" type="number" value={String(formData.amount_paid)} onChange={handleChange} min="0" />
                    <Select name="payment_mode" label="Payment Mode" value={formData.payment_mode} onChange={handleChange} options={paymentModeOptions} />
                    <div className="flex items-end">
                        <div className="text-lg font-bold">
                            Amount Due: <span className="text-red-600">₹{amountDue.toFixed(2)}</span>
                        </div>
                    </div>
                </div>
            </fieldset>
        ) : (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-blue-800 text-sm">
                <p><span className="font-semibold">B2B Client Selected:</span> Payment will be handled via the B2B ledger, not at the time of registration.</p>
            </div>
        )}


        <div className="flex items-center justify-between pt-6 border-t">
            <div className="text-xl font-bold">
            Total Cost: <span className="text-green-600">₹{totalCost.toFixed(2)}</span>
            </div>
            <button type="submit" className="px-8 py-3 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors">
            Create Visit
            </button>
        </div>

        </form>

        {/* Recent Registrations Table */}
        <div className="bg-white p-6 rounded-xl shadow-lg">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Recent Registrations</h3>
            <div className="overflow-x-auto border rounded-lg">
                <table className="min-w-full bg-white">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Visit Code</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Patient</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Test Statuses</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
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
                                    className="px-3 py-1 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors text-xs"
                                  >
                                    Print Report
                                  </button>
                                );
                             } else if (needsDueCollection) {
                                button = (
                                  <button
                                    onClick={() => setVisitToCollectDue(visit)}
                                    className="px-3 py-1 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors text-xs"
                                  >
                                    Collect Due & Print
                                  </button>
                                );
                             }
                           } else {
                                button = (
                                  <button
                                    disabled
                                    title="Report cannot be printed until all tests are approved."
                                    className="px-3 py-1 bg-gray-400 text-white font-semibold rounded-lg shadow-md cursor-not-allowed text-xs"
                                  >
                                    Print Report
                                  </button>
                                );
                           }

                           return (
                            <tr key={visit.id} className="hover:bg-gray-50">
                                <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{visit.visit_code}</td>
                                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">{visit.patient.name}</td>
                                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">{new Date(visit.created_at).toLocaleDateString()}</td>
                                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                                    <div className="flex flex-wrap gap-1">
                                        {visitTestsForVisit.map(vt => <StatusBadge key={vt.id} status={vt.status} />)}
                                    </div>
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap text-sm">
                                    {visit.due_amount > 0 ? (
                                        <span className="text-red-600 font-semibold">Due: ₹{visit.due_amount.toFixed(2)}</span>
                                    ) : (
                                        <span className="text-green-600 font-semibold">Paid</span>
                                    )}
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap text-sm">
                                    {button}
                                </td>
                            </tr>
                           );
                        })}
                         {sortedVisits.length === 0 && (
                            <tr>
                                <td colSpan={6} className="text-center py-8 text-sm text-gray-500">No visits have been created yet.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
    </>
  );
};