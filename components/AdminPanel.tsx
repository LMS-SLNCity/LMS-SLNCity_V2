import React, { useState, useMemo, useEffect } from 'react';
import { User, Permission } from '../types';
import { UserManagement } from './admin/UserManagement';
import { TestTemplateManagement } from './admin/TestTemplateManagement';
import { PriceManagement } from './admin/PriceManagement';
import { B2BManagement } from './admin/B2BManagement';
import { RoleManagement } from './admin/RoleManagement';
import { useAuth } from '../context/AuthContext';
import { AuditLogViewer } from './admin/AuditLogViewer';
import { AntibioticManagement } from './admin/AntibioticManagement';
import { ReferralDoctorManagement } from './admin/ReferralDoctorManagement';
import { Dashboard } from './admin/Dashboard';
import { ApproverManagement } from './admin/ApproverManagement';
import { BranchManagement } from './admin/BranchManagement';
import { VisitsManagement } from './admin/VisitsManagement';
import { UnitManagement } from './admin/UnitManagement';
import { useAppContext } from '../context/AppContext';

type AdminTab = 'dashboard' | 'users' | 'roles' | 'tests' | 'pricing' | 'b2b' | 'referral_doctors' | 'approvers' | 'branches' | 'audit' | 'antibiotics' | 'visits' | 'units';

interface AdminPanelProps {
    user: User;
}

interface TabOption {
    name: AdminTab;
    label: string;
    permission: Permission;
}


export const AdminPanel: React.FC<AdminPanelProps> = ({ user }) => {
    const { hasPermission } = useAuth();
    const { loadUsers, loadTestTemplates, loadClients, loadBranches, loadAntibiotics, loadUnits } = useAppContext();
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    // LAZY LOADING: Load data only when this component mounts
    useEffect(() => {
        console.log('📦 AdminPanel: Loading required data...');
        Promise.all([
            loadUsers(),
            loadTestTemplates(),
            loadClients(),
            loadBranches(),
            loadAntibiotics(),
            loadUnits(),
        ]).then(() => {
            console.log('✅ AdminPanel: Data loaded');
        });
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const allTabs = useMemo(() => {
        const tabs: TabOption[] = [];
        tabs.push({name: 'dashboard', label: 'Dashboard', permission: 'MANAGE_USERS'});
        tabs.push({name: 'visits', label: 'Visits', permission: 'VIEW_RECEPTION'});
        if(hasPermission('MANAGE_USERS')) tabs.push({name: 'users', label: 'User Management', permission: 'MANAGE_USERS'});
        if(hasPermission('MANAGE_USERS')) tabs.push({name: 'approvers', label: 'Approvers & Signatures', permission: 'MANAGE_USERS'});
        if(hasPermission('MANAGE_USERS')) tabs.push({name: 'branches', label: 'Branch Management', permission: 'MANAGE_USERS'});
        if(hasPermission('MANAGE_ROLES')) tabs.push({name: 'roles', label: 'Role Management', permission: 'MANAGE_ROLES'});
        if(hasPermission('MANAGE_TESTS')) tabs.push({name: 'tests', label: 'Test Management', permission: 'MANAGE_TESTS'});
        if(hasPermission('MANAGE_TESTS')) tabs.push({name: 'units', label: 'Unit Management', permission: 'MANAGE_TESTS'});
        if(hasPermission('MANAGE_ANTIBIOTICS')) tabs.push({name: 'antibiotics', label: 'Manage Antibiotics', permission: 'MANAGE_ANTIBIOTICS'});
        if(hasPermission('MANAGE_PRICES')) tabs.push({name: 'pricing', label: 'Price Management', permission: 'MANAGE_PRICES'});
        if(hasPermission('MANAGE_B2B')) tabs.push({name: 'b2b', label: 'B2B Management', permission: 'MANAGE_B2B'});
        if(hasPermission('MANAGE_B2B')) tabs.push({name: 'referral_doctors', label: 'Referral Doctors', permission: 'MANAGE_B2B'});
        if(hasPermission('VIEW_AUDIT_LOG')) tabs.push({name: 'audit', label: 'Audit Log', permission: 'VIEW_AUDIT_LOG'});
        return tabs;
    }, [user, hasPermission]);

    // Most used tabs - shown as direct buttons
    const frequentTabs = useMemo(() => {
        return allTabs.filter(tab => ['dashboard', 'visits', 'users', 'tests', 'pricing'].includes(tab.name));
    }, [allTabs]);

    // Less used tabs - shown in dropdown
    const dropdownTabs = useMemo(() => {
        return allTabs.filter(tab => !['dashboard', 'visits', 'users', 'tests', 'pricing'].includes(tab.name));
    }, [allTabs]);

    const [activeTab, setActiveTab] = useState<AdminTab>(allTabs[0]?.name || 'dashboard');

    const handleTabSelect = (tabName: AdminTab) => {
        setActiveTab(tabName);
        setIsDropdownOpen(false);
    };

    return (
    <div className="bg-white p-3 sm:p-6 rounded-2xl shadow-xl max-w-7xl mx-auto">
      <div className="mb-4 sm:mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-3 sm:mb-4">Admin Panel</h2>

        {/* Navigation Buttons */}
        <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
          {/* Frequent Tabs as Direct Buttons */}
          {frequentTabs.map(tab => (
            <button
              key={tab.name}
              onClick={() => handleTabSelect(tab.name)}
              className={`px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                activeTab === tab.name
                  ? 'bg-brand-primary text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}

          {/* Dropdown for Less Used Tabs */}
          {dropdownTabs.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className={`px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-lg transition-colors flex items-center gap-1 whitespace-nowrap ${
                  dropdownTabs.some(tab => tab.name === activeTab)
                    ? 'bg-brand-primary text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                More
                <svg className={`w-3 h-3 sm:w-4 sm:h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              </button>

              {/* Dropdown Menu Items */}
              {isDropdownOpen && (
                <div className="absolute left-0 mt-2 w-48 sm:w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
                  {dropdownTabs.map((tab) => (
                    <button
                      key={tab.name}
                      onClick={() => handleTabSelect(tab.name)}
                      className={`w-full text-left px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium transition-colors ${
                        activeTab === tab.name
                          ? 'bg-brand-primary text-white'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 sm:mt-6">
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'visits' && hasPermission('VIEW_RECEPTION') && <VisitsManagement />}
        {activeTab === 'users' && hasPermission('MANAGE_USERS') && <UserManagement />}
        {activeTab === 'approvers' && hasPermission('MANAGE_USERS') && <ApproverManagement />}
        {activeTab === 'branches' && hasPermission('MANAGE_USERS') && <BranchManagement />}
        {activeTab === 'roles' && hasPermission('MANAGE_ROLES') && <RoleManagement />}
        {activeTab === 'tests' && hasPermission('MANAGE_TESTS') && <TestTemplateManagement />}
        {activeTab === 'units' && hasPermission('MANAGE_TESTS') && <UnitManagement />}
        {activeTab === 'antibiotics' && hasPermission('MANAGE_ANTIBIOTICS') && <AntibioticManagement />}
        {activeTab === 'pricing' && hasPermission('MANAGE_PRICES') && <PriceManagement />}
        {activeTab === 'b2b' && hasPermission('MANAGE_B2B') && <B2BManagement />}
        {activeTab === 'referral_doctors' && hasPermission('MANAGE_B2B') && <ReferralDoctorManagement />}
        {activeTab === 'audit' && hasPermission('VIEW_AUDIT_LOG') && <AuditLogViewer />}
      </div>
    </div>
  );
};