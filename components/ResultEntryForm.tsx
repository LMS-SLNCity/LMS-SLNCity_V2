import React, { useState, useEffect } from 'react';
import { VisitTest, TestTemplateParameter, CultureResult, SensitivityResult, Antibiotic } from '../types';
import { useAppContext } from '../context/AppContext';
import { Input } from './form/Input';
import { Select } from './form/Select';
import { useAuth } from '../context/AuthContext';

interface ResultEntryFormProps {
  test: VisitTest;
  onClose: () => void;
  isEditMode?: boolean;
  editReason?: string;
}

const StandardResultForm: React.FC<{ test: VisitTest, onClose: () => void, isEditMode?: boolean, editReason?: string }> = ({ test, onClose, isEditMode = false, editReason }) => {
    const { addTestResult, editTestResult } = useAppContext();
    const { user } = useAuth();
    const [results, setResults] = useState<Record<string, string | number>>(test.results || {});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type } = e.target;
        setResults(prev => ({
            ...prev,
            [name]: type === 'number' ? parseFloat(value) || '' : value,
        }));
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!user) {
            alert("User session has expired. Please log in again.");
            return;
        };
        if (!isEditMode && test.status !== 'SAMPLE_COLLECTED') {
            alert(`Cannot enter results. Test status is ${test.status}. Only SAMPLE_COLLECTED tests can have results entered.`);
            return;
        }
        if (isSubmitting) return;

        // Validate that all required parameters are filled (excluding headings)
        if (!isEditMode && test.template.parameters?.fields) {
            const requiredFields = test.template.parameters.fields.filter(f => f.type !== 'heading');
            const missingFields = requiredFields.filter(field => {
                const value = results[field.name];
                return value === undefined || value === null || value === '';
            });

            if (missingFields.length > 0) {
                alert(`⚠️ Partially Tested - Cannot send to approval.\n\nPlease fill in all parameters:\n${missingFields.map(f => `• ${f.name}`).join('\n')}\n\nAll test parameters must be completed before sending for approval.`);
                return;
            }
        }

        setIsSubmitting(true);
        try {
            if (isEditMode) {
                if (!editReason) {
                    alert("Cannot save edit without a reason.");
                    return;
                }
                await editTestResult(test.id, { results }, editReason, user);
            } else {
                await addTestResult(test.id, { results }, user);
            }
            onClose();
        } catch (error) {
            console.error('Error submitting results:', error);
            alert('Failed to submit results. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const renderField = (field: TestTemplateParameter) => {
        // Skip heading type parameters - they're only for report display
        if (field.type === 'heading') {
            return (
                <div key={field.name} className="col-span-3 py-2 px-3 bg-blue-50 border-l-4 border-blue-500">
                    <p className="text-sm font-semibold text-blue-900 uppercase">{field.name}</p>
                </div>
            );
        }

        const value = results[field.name] || '';
        return (
            <div key={field.name} className="grid grid-cols-3 gap-4 items-center">
                <label htmlFor={field.name} className="text-sm font-medium text-gray-700 col-span-1">{field.name} {field.unit && `(${field.unit})`}</label>
                <Input
                    id={field.name}
                    name={field.name}
                    label=""
                    type={field.type}
                    value={String(value)}
                    onChange={handleChange}
                    required
                    className="col-span-2"
                    placeholder={field.reference_range ? `Ref: ${field.reference_range}` : ''}
                />
            </div>
        );
    };

    return (
        <form onSubmit={handleSubmit}>
            <div className="p-6">
                <h3 className="text-xl font-bold text-gray-900" id="modal-title">
                    {isEditMode ? 'Edit' : 'Enter'} Results for {test.template.name}
                </h3>
                <p className="text-sm text-gray-500 mt-1">Patient: {test.patientName} ({test.visitCode})</p>
                {isEditMode && <p className="text-sm text-yellow-700 bg-yellow-100 p-2 rounded-md mt-2">Reason for edit: {editReason}</p>}
                {/* Add scrollbar for tests with many fields */}
                <div className="mt-6 space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                    {test.template.parameters?.fields && test.template.parameters.fields.length > 0 ? (
                        test.template.parameters.fields.map(renderField)
                    ) : (
                        <p className="text-sm text-center text-gray-500 py-4">This test does not require detailed parameter entry. You can add remarks if needed.</p>
                    )}
                     <Input label="Remarks (Optional)" name="remarks" />
                </div>
            </div>
            <div className="bg-gray-50 px-6 py-4 flex justify-end items-center space-x-3 rounded-b-xl">
                <button type="button" onClick={onClose} disabled={isSubmitting} className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed">
                    Cancel
                </button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed">
                     {isSubmitting ? '⏳ Submitting...' : (isEditMode ? 'Save Changes' : 'Submit for Approval')}
                </button>
            </div>
        </form>
    )
}

const CultureResultForm: React.FC<{ test: VisitTest, onClose: () => void, isEditMode?: boolean, editReason?: string }> = ({ test, onClose, isEditMode = false, editReason }) => {
    const { addTestResult, editTestResult, antibiotics } = useAppContext();
    const { user } = useAuth();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [formData, setFormData] = useState<CultureResult>(() => {
        if (test.cultureResult) {
            return test.cultureResult;
        }
        const defaultSensitivity = (test.template.defaultAntibioticIds || [])
            .map(id => ({ antibioticId: id, sensitivity: 'S' as 'S' | 'R' | 'I' }));
            
        return {
            growthStatus: 'growth',
            organismIsolated: '',
            colonyCount: '',
            sensitivity: defaultSensitivity,
            remarks: '',
        };
    });
    
    const activeAntibiotics = antibiotics.filter(ab => ab.isActive);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({...prev, [name]: value }));
    };

    const handleSensitivityChange = (index: number, field: keyof SensitivityResult, value: string | number) => {
        const newSensitivity = [...(formData.sensitivity || [])];
        newSensitivity[index] = { ...newSensitivity[index], [field]: value };
        setFormData(prev => ({ ...prev, sensitivity: newSensitivity }));
    };

    const addAntibiotic = () => {
        const currentSensitivity = formData.sensitivity || [];
        const firstUnused = activeAntibiotics.find(ab => !currentSensitivity.some(s => s.antibioticId === ab.id));
        if (firstUnused) {
            setFormData(prev => ({
                ...prev,
                sensitivity: [...currentSensitivity, { antibioticId: firstUnused.id, sensitivity: 'S' }]
            }));
        } else {
            alert("All available antibiotics have been added.");
        }
    };

    const removeAntibiotic = (index: number) => {
        setFormData(prev => ({
            ...prev,
            sensitivity: (prev.sensitivity || []).filter((_, i) => i !== index)
        }));
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if(!user) {
            alert("User session has expired. Please log in again.");
            return;
        };
        if (!isEditMode && test.status !== 'SAMPLE_COLLECTED') {
            alert(`Cannot enter results. Test status is ${test.status}. Only SAMPLE_COLLECTED tests can have results entered.`);
            return;
        }
        if (isSubmitting) return;

        setIsSubmitting(true);
        try {
            if (isEditMode) {
                if (!editReason) {
                    alert("Cannot save edit without a reason.");
                    return;
                }
                await editTestResult(test.id, { cultureResult: formData }, editReason, user);
            } else {
                await addTestResult(test.id, { cultureResult: formData }, user);
            }
            onClose();
        } catch (error) {
            console.error('Error submitting culture results:', error);
            alert('Failed to submit results. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const usedAntibioticIds = new Set((formData.sensitivity || []).map(s => s.antibioticId));
    const antibioticOptions = activeAntibiotics
        .map(ab => ({ label: `${ab.name} (${ab.abbreviation})`, value: ab.id }));

    const sensitivityOptions: { label: string, value: SensitivityResult['sensitivity'] }[] = [
        { label: 'Sensitive (S)', value: 'S' },
        { label: 'Resistant (R)', value: 'R' },
        { label: 'Intermediate (I)', value: 'I' },
    ];
    
    return (
        <form onSubmit={handleSubmit} className="flex flex-col flex-grow">
            <div className="p-6">
                <h3 className="text-xl font-bold text-gray-900">{isEditMode ? 'Edit' : 'Enter'} Results for {test.template.name}</h3>
                <p className="text-sm text-gray-500 mt-1">Patient: {test.patientName} ({test.visitCode})</p>
                 {isEditMode && <p className="text-sm text-yellow-700 bg-yellow-100 p-2 rounded-md mt-2">Reason for edit: {editReason}</p>}
                {/* Add scrollbar for culture tests with many antibiotics */}
                <div className="mt-6 space-y-4 border-t pt-4 max-h-[60vh] overflow-y-auto pr-2">
                    <div className="flex items-center space-x-4">
                        <span className="text-sm font-medium text-gray-700">Culture Result:</span>
                         <label className="flex items-center space-x-2 cursor-pointer">
                            <input type="radio" name="growthStatus" value="growth" checked={formData.growthStatus === 'growth'} onChange={(e) => setFormData(p => ({...p, growthStatus: 'growth'}))} className="h-4 w-4 text-brand-primary focus:ring-brand-primary"/>
                            <span className="text-sm">Growth Occurred</span>
                        </label>
                        <label className="flex items-center space-x-2 cursor-pointer">
                            <input type="radio" name="growthStatus" value="no_growth" checked={formData.growthStatus === 'no_growth'} onChange={(e) => setFormData(p => ({...p, growthStatus: 'no_growth'}))} className="h-4 w-4 text-brand-primary focus:ring-brand-primary"/>
                            <span className="text-sm">No Growth</span>
                        </label>
                    </div>

                    {formData.growthStatus === 'growth' ? (
                        <>
                            <Input label="Organism Isolated" name="organismIsolated" value={formData.organismIsolated || ''} onChange={handleChange} required />
                            <Input label="Colony Count" name="colonyCount" value={formData.colonyCount || ''} onChange={handleChange} />
                            
                            <div>
                                <h4 className="text-md font-semibold text-gray-700 mb-2">Antibiotic Sensitivity</h4>
                                <div className="space-y-3 pr-2 max-h-48 overflow-y-auto">
                                    {(formData.sensitivity || []).map((sens, index) => (
                                        <div key={index} className="grid grid-cols-12 gap-2 items-center p-2 rounded-md bg-gray-50 border border-gray-200">
                                            <div className="col-span-6">
                                                <Select 
                                                    label=""
                                                    value={String(sens.antibioticId)}
                                                    onChange={e => handleSensitivityChange(index, 'antibioticId', Number(e.target.value))}
                                                    options={antibioticOptions.filter(opt => opt.value === sens.antibioticId || !usedAntibioticIds.has(Number(opt.value)))}
                                                />
                                            </div>
                                            <div className="col-span-5">
                                                <Select 
                                                    label=""
                                                    value={sens.sensitivity}
                                                    onChange={e => handleSensitivityChange(index, 'sensitivity', e.target.value as SensitivityResult['sensitivity'])}
                                                    options={sensitivityOptions}
                                                />
                                            </div>
                                            <div className="col-span-1 flex justify-center items-center">
                                                <button type="button" onClick={() => removeAntibiotic(index)} className="p-1 text-red-500 hover:text-red-700 rounded-full hover:bg-red-100">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <button type="button" onClick={addAntibiotic} className="mt-3 text-sm text-brand-primary font-semibold hover:text-brand-primary_hover flex items-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" /></svg>
                                    Add Antibiotic
                                </button>
                            </div>
                        </>
                    ) : (
                         <div>
                            <label htmlFor="remarks" className="block text-sm font-medium text-gray-700 mb-1">Remarks for No Growth</label>
                            <textarea id="remarks" name="remarks" rows={3} value={formData.remarks || ''} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary sm:text-sm"></textarea>
                         </div>
                    )}
                </div>
            </div>
            <div className="bg-gray-50 px-6 py-4 flex justify-end items-center space-x-3 rounded-b-xl mt-auto border-t">
                 <button type="button" onClick={onClose} disabled={isSubmitting} className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed">
                    Cancel
                </button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed">
                     {isSubmitting ? '⏳ Submitting...' : (isEditMode ? 'Save Changes' : 'Submit for Approval')}
                </button>
            </div>
        </form>
    );
};

export const ResultEntryForm: React.FC<ResultEntryFormProps> = ({ test, onClose, isEditMode = false, editReason }) => {
  const isCultureTest = test.template.reportType === 'culture';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg transform transition-all max-h-[90vh] flex flex-col">
        {isCultureTest 
            ? <CultureResultForm test={test} onClose={onClose} isEditMode={isEditMode} editReason={editReason} />
            : <StandardResultForm test={test} onClose={onClose} isEditMode={isEditMode} editReason={editReason} />
        }
      </div>
    </div>
  );
};