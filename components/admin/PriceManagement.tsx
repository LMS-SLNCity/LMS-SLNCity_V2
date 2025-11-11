import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { TestTemplate } from '../../types';
import { useAuth } from '../../context/AuthContext';

type PriceState = {
    [id: number]: {
        price: string;
        b2b_price: string;
    }
};

export const PriceManagement: React.FC = () => {
    const { testTemplates, updateTestPrices } = useAppContext();
    const { user: actor } = useAuth();
    const [prices, setPrices] = useState<PriceState>({});
    const [hasChanges, setHasChanges] = useState(false);

    // Load prices from testTemplates whenever they change, but don't overwrite if user has made changes
    useEffect(() => {
        if (testTemplates.length > 0 && Object.keys(prices).length === 0) {
            // Only initialize if prices is empty (first load)
            const initialPrices = testTemplates.reduce((acc, t) => {
                acc[t.id] = {
                    price: t.price.toString(),
                    b2b_price: t.b2b_price.toString()
                };
                return acc;
            }, {} as PriceState);
            setPrices(initialPrices);
        }
    }, [testTemplates]);

    const handleChange = (id: number, field: 'price' | 'b2b_price', value: string) => {
        // Store the string value directly to allow proper typing
        setPrices(prev => ({
            ...prev,
            [id]: {
                ...prev[id],
                [field]: value
            }
        }));
        setHasChanges(true);
    };

    const handleSave = async () => {
        if (!actor) {
            alert("User session has expired. Please log in again.");
            return;
        }

        try {
            const updates = Object.entries(prices)
                .filter(([_, priceData]) => priceData !== undefined)
                .map(([id, priceData]) => {
                    const data = priceData as { price: string; b2b_price: string };
                    return {
                        id: Number(id),
                        price: parseFloat(data.price) || 0,
                        b2b_price: parseFloat(data.b2b_price) || 0,
                    };
                });

            await updateTestPrices(updates, actor);

            // After successful save, reload prices from updated testTemplates
            // Clear prices state so useEffect will reload them
            setPrices({});
            setHasChanges(false);

            alert('Prices updated successfully!');
        } catch (error) {
            console.error('Error updating prices:', error);
            alert('Failed to update prices. Please try again.');
        }
    };

    const activeTemplates = testTemplates.filter(t => t.isActive);

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-700">Manage Test Prices</h3>
                <button 
                    onClick={handleSave} 
                    disabled={!hasChanges}
                    className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M7.707 10.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V6h5a1 1 0 011 1v3a1 1 0 11-2 0V8h-4v3.586l-1.293-1.293zM5 4a1 1 0 100 2h10a1 1 0 100-2H5z" />
                        <path d="M3 12a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" />
                     </svg>
                    Save All Changes
                </button>
            </div>
             <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="min-w-full bg-white">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Test Name</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-40">Walk-in Price (₹)</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-40">B2B Price (₹)</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {activeTemplates.map((template, index) => (
                            <tr key={template.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50 hover:bg-gray-100'}>
                                <td className="px-4 py-2 text-sm font-medium text-gray-800">{template.name}</td>
                                <td className="px-4 py-2">
                                    <input 
                                        type="number"
                                        value={prices[template.id]?.price ?? ''}
                                        onChange={(e) => handleChange(template.id, 'price', e.target.value)}
                                        className="w-full px-2 py-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary sm:text-sm"
                                    />
                                </td>
                                <td className="px-4 py-2">
                                     <input 
                                        type="number"
                                        value={prices[template.id]?.b2b_price ?? ''}
                                        onChange={(e) => handleChange(template.id, 'b2b_price', e.target.value)}
                                        className="w-full px-2 py-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary sm:text-sm"
                                    />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};