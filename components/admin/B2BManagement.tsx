import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { Client } from '../../types';
import { ClientLedgerModal } from './ClientLedgerModal';
import { ClientPriceEditorModal } from './ClientPriceEditorModal';
import { B2BAccountManagementModal } from './B2BAccountManagementModal';
import { SettlementConfirmationModal } from './SettlementConfirmationModal';

export const B2BManagement: React.FC = () => {
    const { clients, addClient, deleteClient, settleClientBalance } = useAppContext();
    const { user: actor } = useAuth();
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const [isLedgerOpen, setIsLedgerOpen] = useState(false);
    const [isPriceEditorOpen, setIsPriceEditorOpen] = useState(false);
    const [isAccountManagementOpen, setIsAccountManagementOpen] = useState(false);
    const [isSettlementModalOpen, setIsSettlementModalOpen] = useState(false);
    const [clientName, setClientName] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [settlingId, setSettlingId] = useState<number | null>(null);

    const b2bClients = clients.filter(c => c.type === 'REFERRAL_LAB');

    const handleAddClient = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!clientName.trim()) {
            alert('Please enter client name');
            return;
        }

        if (!actor) {
            alert("User session has expired. Please log in again.");
            return;
        }

        setIsLoading(true);
        try {
            addClient({ name: clientName, type: 'REFERRAL_LAB' }, actor);
            setClientName('');
        } catch (error) {
            console.error('Failed to add client:', error);
            alert('Failed to add client');
        } finally {
            setIsLoading(false);
        }
    };

    const openLedger = (client: Client) => {
        setSelectedClient(client);
        setIsLedgerOpen(true);
    };

    const openPriceEditor = (client: Client) => {
        setSelectedClient(client);
        setIsPriceEditorOpen(true);
    };

    const openAccountManagement = (client: Client) => {
        setSelectedClient(client);
        setIsAccountManagementOpen(true);
    };

    const closeModal = () => {
        setSelectedClient(null);
        setIsLedgerOpen(false);
        setIsPriceEditorOpen(false);
        setIsAccountManagementOpen(false);
        setIsSettlementModalOpen(false);
    };

    const handleDeleteClient = async (clientId: number) => {
        if (!actor) {
            alert("User session has expired. Please log in again.");
            return;
        }

        if (!window.confirm('Are you sure you want to delete this client? This action cannot be undone.')) {
            return;
        }

        setDeletingId(clientId);
        try {
            await deleteClient(clientId, actor);
            alert('Client deleted successfully');
        } catch (error) {
            console.error('Failed to delete client:', error);
            alert('Failed to delete client');
        } finally {
            setDeletingId(null);
        }
    };

    const openSettlementModal = (client: Client) => {
        if (!actor) {
            alert("User session has expired. Please log in again.");
            return;
        }

        if (client.balance <= 0) {
            alert('Client balance is already zero. No settlement needed.');
            return;
        }

        setSelectedClient(client);
        setIsSettlementModalOpen(true);
    };

    const handleSettleBalance = async (paymentMode: string, description: string, receivedAmount?: number) => {
        if (!actor || !selectedClient) {
            alert("User session has expired. Please log in again.");
            return;
        }

        setSettlingId(selectedClient.id);
        try {
            const amountReceived = receivedAmount || selectedClient.balance;
            const waiverAmount = selectedClient.balance - amountReceived;
            const hasWaiver = waiverAmount > 0.01;

            await settleClientBalance(selectedClient.id, actor, paymentMode, description, receivedAmount);

            const successMessage = hasWaiver
                ? `Settlement completed successfully!\n\nClient: ${selectedClient.name}\nOriginal Balance: ₹${selectedClient.balance.toFixed(2)}\nAmount Received: ₹${amountReceived.toFixed(2)}\nWaiver/Discount: ₹${waiverAmount.toFixed(2)}\nMode: ${paymentMode}`
                : `Settlement completed successfully!\n\nClient: ${selectedClient.name}\nAmount: ₹${selectedClient.balance.toFixed(2)}\nMode: ${paymentMode}`;

            alert(successMessage);
            closeModal();
        } catch (error) {
            console.error('Failed to settle balance:', error);
            alert('Failed to settle balance: ' + (error instanceof Error ? error.message : String(error)));
        } finally {
            setSettlingId(null);
        }
    };

    return (
        <>
        {isLedgerOpen && selectedClient && <ClientLedgerModal client={selectedClient} onClose={closeModal} />}
        {isPriceEditorOpen && selectedClient && <ClientPriceEditorModal client={selectedClient} onClose={closeModal} />}
        {isAccountManagementOpen && selectedClient && <B2BAccountManagementModal client={selectedClient} onClose={closeModal} />}
        {isSettlementModalOpen && selectedClient && (
            <SettlementConfirmationModal
                client={selectedClient}
                onConfirm={handleSettleBalance}
                onCancel={closeModal}
            />
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Add New Client Form */}
            <div className="lg:col-span-1">
                <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-700 mb-4">Add New B2B Client</h3>
                    <form onSubmit={handleAddClient} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Client Name
                            </label>
                            <input
                                type="text"
                                value={clientName}
                                onChange={(e) => setClientName(e.target.value)}
                                placeholder="e.g., City Clinic"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary"
                                disabled={isLoading}
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-primary-dark disabled:opacity-50"
                        >
                            {isLoading ? 'Adding...' : 'Add Client'}
                        </button>
                    </form>
                </div>
            </div>

            {/* B2B Clients List */}
            <div className="lg:col-span-2">
                <h3 className="text-lg font-semibold text-gray-700 mb-4">B2B Client Management</h3>
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="min-w-full bg-white">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Client ID</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Client Name</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Current Balance (₹)</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {b2bClients.map((client, index) => (
                            <tr key={client.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50 hover:bg-gray-100'}>
                                <td className="px-4 py-3 text-sm text-gray-600">{client.id}</td>
                                <td className="px-4 py-3 text-sm font-medium text-gray-800">{client.name}</td>
                                <td className="px-4 py-3 text-sm font-semibold">
                                    <span className={client.balance > 0 ? 'text-red-600' : 'text-green-600'}>
                                        {client.balance.toFixed(2)}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-sm space-x-1">
                                    <button onClick={() => openLedger(client)} className="text-green-600 hover:text-green-800 font-medium text-xs px-2 py-1 bg-green-50 rounded">Ledger</button>
                                    <button onClick={() => openPriceEditor(client)} className="text-blue-600 hover:text-blue-800 font-medium text-xs px-2 py-1 bg-blue-50 rounded">Prices</button>
                                    <button onClick={() => openAccountManagement(client)} className="text-purple-600 hover:text-purple-800 font-medium text-xs px-2 py-1 bg-purple-50 rounded">Account</button>
                                    <button
                                        onClick={() => openSettlementModal(client)}
                                        disabled={settlingId === client.id || client.balance <= 0}
                                        className="text-orange-600 hover:text-orange-800 font-medium text-xs px-2 py-1 bg-orange-50 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {settlingId === client.id ? 'Settling...' : 'Settle'}
                                    </button>
                                    <button
                                        onClick={() => handleDeleteClient(client.id)}
                                        disabled={deletingId === client.id}
                                        className="text-red-600 hover:text-red-800 font-medium text-xs px-2 py-1 bg-red-50 rounded disabled:opacity-50"
                                    >
                                        {deletingId === client.id ? 'Deleting...' : 'Delete'}
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            </div>
        </div>
        </>
    );
};