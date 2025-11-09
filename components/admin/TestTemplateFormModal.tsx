import React, { useState } from 'react';
import { TestTemplate, TestTemplateParameter, Antibiotic } from '../../types';
import { useAppContext } from '../../context/AppContext';
import { Input } from '../form/Input';
import { Select } from '../form/Select';
import { useAuth } from '../../context/AuthContext';

interface TestTemplateFormModalProps {
    templateToEdit: TestTemplate | null;
    onClose: () => void;
}

const emptyTemplate: Omit<TestTemplate, 'id'> = {
    code: '',
    name: '',
    category: '',
    price: 0,
    b2b_price: 0,
    isActive: true,
    parameters: { fields: [] },
    reportType: 'standard',
    defaultAntibioticIds: []
};

export const TestTemplateFormModal: React.FC<TestTemplateFormModalProps> = ({ templateToEdit, onClose }) => {
    const { addTestTemplate, updateTestTemplate, antibiotics } = useAppContext();
    const { user: actor } = useAuth();
    const [formData, setFormData] = useState(templateToEdit || emptyTemplate);
    
    const isCultureTest = formData.reportType === 'culture';
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;

        if (name === 'reportType') {
            const newReportType = value as 'standard' | 'culture';
            setFormData(prev => ({
                ...prev,
                reportType: newReportType,
                parameters: newReportType === 'culture' ? { fields: [] } : prev.parameters,
                defaultAntibioticIds: newReportType !== 'culture' ? [] : prev.defaultAntibioticIds,
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                [name]: (name === 'price' || name === 'b2b_price') ? Number(value) : value
            }));
        }
    };

    const handleParamChange = (index: number, field: keyof TestTemplateParameter, value: string) => {
        const newParams = formData.parameters.fields.map((param, i) => {
            if (i !== index) return param;
            if (field === 'type') return { ...param, type: value as 'text' | 'number' };
            return { ...param, [field]: value };
        });
        setFormData(prev => ({ ...prev, parameters: { fields: newParams }}));
    };
    
    const handleAntibioticSelection = (id: number, checked: boolean) => {
        setFormData(prev => {
            const currentIds = prev.defaultAntibioticIds || [];
            const newIds = checked ? [...currentIds, id] : currentIds.filter(abId => abId !== id);
            return { ...prev, defaultAntibioticIds: newIds };
        });
    }

    const addParameter = () => {
        const newParameter: TestTemplateParameter = { name: '', type: 'text', unit: '', reference_range: '' };
        setFormData(prev => ({ ...prev, parameters: { fields: [...prev.parameters.fields, newParameter] }}));
    };

    const removeParameter = (index: number) => {
        const newParams = formData.parameters.fields.filter((_, i) => i !== index);
        setFormData(prev => ({ ...prev, parameters: { fields: newParams }}));
    };
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!actor) {
            alert("User session has expired. Please log in again.");
            return;
        }
        if (templateToEdit) {
            updateTestTemplate(formData as TestTemplate, actor);
        } else {
            addTestTemplate(formData, actor);
        }
        onClose();
    };
    
    const reportTypeOptions: {label: string, value: TestTemplate['reportType']}[] = [
        { label: 'Standard Report', value: 'standard' },
        { label: 'Culture & Sensitivity Report', value: 'culture' },
    ];
    
    const activeAntibiotics = antibiotics.filter(ab => ab.isActive);

    return (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl transform transition-all max-h-[90vh] flex flex-col">
                <form onSubmit={handleSubmit} className="flex flex-col flex-grow">
                    <div className="p-6 border-b border-gray-200">
                        <h3 className="text-xl font-bold text-gray-900" id="modal-title">
                            {templateToEdit ? 'Edit' : 'Add New'} Test Template
                        </h3>
                    </div>

                    <div className="p-6 overflow-y-auto space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input label="Test Code" name="code" value={formData.code} onChange={handleChange} required />
                            <Input label="Test Name" name="name" value={formData.name} onChange={handleChange} required />
                        </div>
                        <Input label="Category" name="category" value={formData.category} onChange={handleChange} required />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input label="Walk-in Price (₹)" name="price" type="number" value={String(formData.price)} onChange={handleChange} required />
                            <Input label="B2B Price (₹)" name="b2b_price" type="number" value={String(formData.b2b_price)} onChange={handleChange} required />
                        </div>
                        
                        <Select label="Report Type" name="reportType" value={formData.reportType} onChange={handleChange} options={reportTypeOptions} />
                        
                        
                        <div>
                            {isCultureTest ? (
                                <div>
                                    <h4 className="text-md font-semibold text-gray-700 mb-2 border-t border-gray-200 pt-4">Default Antibiotic Panel</h4>
                                    <div className="p-4 border rounded-lg max-h-52 overflow-y-auto pr-2">
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                            {activeAntibiotics.map(ab => (
                                                <label key={ab.id} className="flex items-center space-x-2 p-1 rounded-md hover:bg-gray-100">
                                                    <input
                                                        type="checkbox"
                                                        checked={(formData.defaultAntibioticIds || []).includes(ab.id)}
                                                        onChange={e => handleAntibioticSelection(ab.id, e.target.checked)}
                                                        className="h-4 w-4 rounded border-gray-300 text-brand-primary focus:ring-brand-primary"
                                                    />
                                                    <span className="text-sm">{ab.name} ({ab.abbreviation})</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <h4 className="text-md font-semibold text-gray-700 mb-2 border-t border-gray-200 pt-4">Result Parameters</h4>
                                    <div className="max-h-96 overflow-y-auto pr-2 space-y-3">
                                        {formData.parameters.fields.map((param, index) => (
                                            <div key={index} className="grid grid-cols-12 gap-2 items-center p-2 rounded-md bg-gray-50 border border-gray-200">
                                                <div className="col-span-12 sm:col-span-4">
                                                    <input type="text" placeholder="Parameter Name" value={param.name} onChange={e => handleParamChange(index, 'name', e.target.value)} className="w-full px-2 py-1 text-sm border-gray-300 rounded-md focus:ring-brand-primary focus:border-brand-primary" required />
                                                </div>
                                                <div className="col-span-6 sm:col-span-2">
                                                    <select value={param.type} onChange={e => handleParamChange(index, 'type', e.target.value)} className="w-full px-2 py-1 text-sm border-gray-300 rounded-md focus:ring-brand-primary focus:border-brand-primary">
                                                        <option value="text">Text</option>
                                                        <option value="number">Number</option>
                                                    </select>
                                                </div>
                                                <div className="col-span-6 sm:col-span-2">
                                                    <input type="text" placeholder="Unit" value={param.unit || ''} onChange={e => handleParamChange(index, 'unit', e.target.value)} className="w-full px-2 py-1 text-sm border-gray-300 rounded-md focus:ring-brand-primary focus:border-brand-primary" />
                                                </div>
                                                <div className="col-span-11 sm:col-span-3">
                                                    <input type="text" placeholder="Reference Range" value={param.reference_range || ''} onChange={e => handleParamChange(index, 'reference_range', e.target.value)} className="w-full px-2 py-1 text-sm border-gray-300 rounded-md focus:ring-brand-primary focus:border-brand-primary" />
                                                </div>
                                                <div className="col-span-1 flex justify-end">
                                                    <button type="button" onClick={() => removeParameter(index)} className="text-red-500 hover:text-red-700">
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <button type="button" onClick={addParameter} className="mt-3 text-sm text-brand-primary font-semibold hover:text-brand-primary_hover flex items-center">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" /></svg>
                                        Add Parameter
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="bg-gray-50 px-6 py-4 flex justify-end items-center space-x-3 rounded-b-2xl mt-auto border-t border-gray-200">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400">
                            Cancel
                        </button>
                        <button type="submit" className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                           {templateToEdit ? 'Save Changes' : 'Create Template'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};