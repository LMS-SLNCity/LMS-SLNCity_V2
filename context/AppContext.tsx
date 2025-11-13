import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import type { Visit, VisitTest, Patient, TestTemplate, VisitTestStatus, User, Role, UserWithPassword, Client, ClientPrice, LedgerEntry, RolePermissions, Permission, CultureResult, AuditLog, Antibiotic, Branch, Unit } from '../types';
import { getCachedData, invalidateCache as invalidateDataCache, invalidateMultipleCaches } from './DataCache';

// API Base URL - uses environment variable or falls back to localhost
const API_BASE_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : 'http://localhost:5002/api';

// Define a type for user creation data to avoid exposing password hash elsewhere
type UserCreationData = Omit<User, 'id' | 'isActive' | 'permissions'> & { password_hash: string };


interface ReferralDoctor {
  id: number;
  name: string;
  designation?: string;
}

interface AppState {
  visits: Visit[];
  visitTests: VisitTest[];
  users: UserWithPassword[];
  testTemplates: TestTemplate[];
  clients: Client[];
  clientPrices: ClientPrice[];
  ledgerEntries: LedgerEntry[];
  rolePermissions: RolePermissions;
  auditLogs: AuditLog[];
  antibiotics: Antibiotic[];
  patients: Patient[];
  referralDoctors: ReferralDoctor[];
  branches: Branch[];
  signatories: any[];
  units: Unit[];
}

interface AddVisitData {
    patient: Patient;
    referred_doctor_id?: number;
    ref_customer_id?: number;
    other_ref_doctor?: string;
    other_ref_customer?: string;
    registration_datetime?: string;
    testIds: number[];
    total_cost: number;
    amount_paid: number;
    payment_mode: 'Cash' | 'Card' | 'UPI' | '';
}

interface UpdateStatusDetails {
    collectedBy?: string;
    specimen_type?: string;
    rejectionReason?: string;
}

interface AddResultData {
    results?: Record<string, string | number>;
    cultureResult?: CultureResult;
}

interface AppContextType extends AppState {
  addVisit: (visitData: AddVisitData, actor: User) => void;
  updateVisitTestStatus: (visitTestId: number, status: VisitTestStatus, actor: User, details?: UpdateStatusDetails) => void;
  addTestResult: (visitTestId: number, data: AddResultData, actor: User) => void;
  editTestResult: (visitTestId: number, data: AddResultData, reason: string, actor: User) => void;
  approveTestResult: (visitTestId: number, actor: User) => void;
  rejectTestResult: (visitTestId: number, rejectionReason: string, actor: User) => Promise<void>;
  collectDuePayment: (visitId: number, amount: number, mode: Visit['payment_mode'], actor: User) => void;
  // Admin functions
  addUser: (userData: UserCreationData, actor: User) => void;
  updateUserPermissions: (userId: number, permissions: Permission[], actor: User) => void;
  addTestTemplate: (templateData: Omit<TestTemplate, 'id'>, actor: User) => void;
  updateTestTemplate: (templateData: TestTemplate, actor: User) => void;
  deleteTestTemplate: (templateId: number, actor: User) => void;
  updateTestPrices: (priceData: { id: number, price: number, b2b_price: number }[], actor: User) => Promise<void>;
  updateRolePermissions: (role: Role, permissions: Permission[], actor: User) => void;
  // B2B Functions
  addClient: (clientData: { name: string; type: 'PATIENT' | 'REFERRAL_LAB' | 'INTERNAL' }, actor: User) => void;
  deleteClient: (clientId: number, actor: User) => void;
  settleClientBalance: (clientId: number, actor: User, paymentMode?: string, description?: string, receivedAmount?: number) => void;
  addReferralDoctor: (doctorData: { name: string }, actor: User) => void;
  updateReferralDoctor: (doctorId: number, doctorData: { name: string }, actor: User) => void;
  deleteReferralDoctor: (doctorId: number, actor: User) => void;
  updateClientPrices: (clientId: number, prices: { testTemplateId: number, price: number }[], actor: User) => void;
  addClientPayment: (clientId: number, amount: number, description: string, actor: User) => void;
  // Branch Management
  addBranch: (branchData: Omit<Branch, 'id' | 'isActive'>, actor: User) => void;
  updateBranch: (branchData: Branch, actor: User) => void;
  deleteBranch: (branchId: number, actor: User) => void;
  // Antibiotic Management
  addAntibiotic: (antibiotic: Omit<Antibiotic, 'id' | 'isActive'>, actor: User) => void;
  updateAntibiotic: (antibiotic: Antibiotic, actor: User) => void;
  deleteAntibiotic: (antibioticId: number, actor: User) => void;
  // Data loading - LAZY LOADING
  loadTestTemplates: () => Promise<void>;
  loadClients: () => Promise<void>;
  loadClientPrices: (clientId?: number) => Promise<void>; // Load prices for specific client or all
  loadReferralDoctors: () => Promise<void>;
  loadBranches: () => Promise<void>;
  loadAntibiotics: () => Promise<void>;
  loadUnits: () => Promise<void>;
  loadVisits: () => Promise<void>;
  loadVisitTests: () => Promise<void>;
  loadUsers: () => Promise<void>;
  loadViewData: (view: string) => Promise<void>;
  reloadData: () => Promise<void>;
  // Signatories
  signatories: any[];
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AppState>({
    visits: [],
    visitTests: [],
    users: [],
    testTemplates: [],
    clients: [],
    clientPrices: [],
    ledgerEntries: [],
    rolePermissions: {},
    auditLogs: [],
    antibiotics: [],
    patients: [],
    referralDoctors: [],
    branches: [],
    signatories: [],
    units: [],
  });

  // Helper function to get auth token from sessionStorage (current session) or localStorage (remember me)
  const getAuthToken = (): string | null => {
    return sessionStorage.getItem('authToken') || localStorage.getItem('authToken');
  };

  // DO NOT load all data on mount - use lazy loading instead
  // Data will be loaded on-demand when views are accessed
  useEffect(() => {
    console.log('🚀 AppContext initialized - using lazy loading strategy');
    console.log('📊 Data will be loaded on-demand per view');
  }, []);

  // Helper function to invalidate OLD cache when data changes (legacy)
  const invalidateLegacyCache = () => {
    localStorage.removeItem('lms_app_data_cache');
    localStorage.removeItem('lms_app_data_cache_timestamp');
    console.log('🗑️ Legacy cache invalidated');
  };

  const addAuditLog = (username: string, action: string, details: string) => {
      setState(prevState => {
          const newLog: AuditLog = {
              id: prevState.auditLogs.length + 1,
              timestamp: new Date().toISOString(),
              username,
              action,
              details,
          };
          return { ...prevState, auditLogs: [newLog, ...prevState.auditLogs] };
      });
  };

  const addVisit = async (visitData: AddVisitData, actor: User) => {
    try {
      const authToken = getAuthToken();

      // First, create or get the patient
      let patientId = visitData.patient.id;

      if (!patientId) {
        // Create new patient
        const patientResponse = await fetch(`${API_BASE_URL}/patients`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
          },
          body: JSON.stringify(visitData.patient),
        });

        if (!patientResponse.ok) {
          throw new Error('Failed to create patient');
        }

        const createdPatient = await patientResponse.json();
        patientId = createdPatient.id;
      }

      // Now create the visit with the patient_id
      const visitResponse = await fetch(`${API_BASE_URL}/visits`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          patient_id: patientId,
          referred_doctor_id: visitData.referred_doctor_id,
          ref_customer_id: visitData.ref_customer_id,
          other_ref_doctor: visitData.other_ref_doctor,
          other_ref_customer: visitData.other_ref_customer,
          registration_datetime: visitData.registration_datetime,
          total_cost: visitData.total_cost,
          amount_paid: visitData.amount_paid,
          payment_mode: visitData.payment_mode,
        }),
      });

      if (!visitResponse.ok) {
        throw new Error('Failed to create visit');
      }

      const createdVisit = await visitResponse.json();

      // Create visit_tests in the database
      for (const testTemplateId of visitData.testIds) {
        const visitTestResponse = await fetch(`${API_BASE_URL}/visit-tests`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            visit_id: createdVisit.id,
            test_template_id: testTemplateId,
          }),
        });

        if (!visitTestResponse.ok) {
          console.error(`Failed to create visit test for template ${testTemplateId}`);
        }
      }

      // If this is a B2B client, update the client balance
      if (visitData.ref_customer_id) {
        const client = state.clients.find(c => c.id === visitData.ref_customer_id);
        if (client && client.type === 'REFERRAL_LAB') {
          const newBalance = client.balance + visitData.total_cost;
          await fetch(`${API_BASE_URL}/clients/${visitData.ref_customer_id}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${authToken}`,
            },
            body: JSON.stringify({ balance: newBalance }),
          });
        }
      }

      addAuditLog(actor.username, 'CREATE_VISIT', `Created visit for patient ${visitData.patient.name} with ${visitData.testIds.length} tests.`);

      // Invalidate cache since data changed
      invalidateLegacyCache();
      invalidateDataCache('visits');
      invalidateDataCache('visit-tests');

      // Only reload visits and visitTests (not ALL data) to save API calls
      // Invalidate cache and refetch from server
      invalidateDataCache('visits');
      invalidateDataCache('visit-tests');

      const [updatedVisits, updatedVisitTests] = await Promise.all([
        getCachedData<Visit[]>('visits', true),
        getCachedData<VisitTest[]>('visit-tests', true)
      ]);

      setState(prevState => ({
        ...prevState,
        visits: updatedVisits,
        visitTests: updatedVisitTests
      }));
    } catch (error) {
      console.error('Error creating visit:', error);
      throw error;
    }
  };
  
  const updateVisitTestStatus = async (visitTestId: number, status: VisitTestStatus, actor: User, details?: UpdateStatusDetails) => {
    try {
      const authToken = getAuthToken();
      const test = state.visitTests.find(t => t.id === visitTestId);

      // OPTIMISTIC UPDATE: Update UI immediately
      setState(prevState => ({
        ...prevState,
        visitTests: prevState.visitTests.map(t =>
          t.id === visitTestId
            ? {
                ...t,
                status,
                collectedBy: details?.collectedBy || t.collectedBy,
                specimen_type: details?.specimen_type || t.specimen_type,
                collectedAt: status === 'SAMPLE_COLLECTED' ? new Date().toISOString() : t.collectedAt,
              }
            : t
        ),
      }));

      const updateData: any = { status };
      if (details?.collectedBy) updateData.collected_by = details.collectedBy;
      if (details?.specimen_type) updateData.specimen_type = details.specimen_type;
      if (status === 'SAMPLE_COLLECTED') updateData.collected_at = new Date().toISOString();

      const response = await fetch(`${API_BASE_URL}/visit-tests/${visitTestId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify(updateData),
      });

      if (response.ok) {
        if (test) {
          addAuditLog(actor.username, 'UPDATE_TEST_STATUS', `Updated status for test ${test.template.code} (Visit: ${test.visitCode}) to ${status}.`);
        }

        // Fetch ONLY the updated test from server to sync accurate data
        const updatedTest = await response.json();

        setState(prevState => ({
          ...prevState,
          visitTests: prevState.visitTests.map(t =>
            t.id === visitTestId ? { ...t, ...updatedTest } : t
          ),
        }));

        // Invalidate cache for next load (but don't refetch now)
        invalidateDataCache('visit-tests');
      } else {
        // ROLLBACK on error: refetch the single test
        console.error('Error updating visit test status:', response.statusText);
        const rollbackResponse = await fetch(`${API_BASE_URL}/visit-tests/${visitTestId}`, {
          headers: { 'Authorization': `Bearer ${authToken}` },
        });
        if (rollbackResponse.ok) {
          const originalTest = await rollbackResponse.json();
          setState(prevState => ({
            ...prevState,
            visitTests: prevState.visitTests.map(t =>
              t.id === visitTestId ? originalTest : t
            ),
          }));
        }
      }
    } catch (error) {
      console.error('Error updating visit test status:', error);
      throw error;
    }
  };
  
  const addTestResult = async (visitTestId: number, data: AddResultData, actor: User) => {
    try {
      const authToken = getAuthToken();
      const test = state.visitTests.find(t => t.id === visitTestId);

      // OPTIMISTIC UPDATE: Update UI immediately
      setState(prevState => ({
        ...prevState,
        visitTests: prevState.visitTests.map(t =>
          t.id === visitTestId
            ? {
                ...t,
                status: 'AWAITING_APPROVAL' as VisitTestStatus,
                results: data.results || t.results,
                cultureResult: data.cultureResult || t.cultureResult,
                enteredBy: actor.username,
                enteredAt: new Date().toISOString(),
              }
            : t
        ),
      }));

      const updateData: any = {
        status: 'AWAITING_APPROVAL',
      };
      if (data.results) updateData.results = data.results;
      if (data.cultureResult) updateData.culture_result = data.cultureResult;

      const response = await fetch(`${API_BASE_URL}/visit-tests/${visitTestId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify(updateData),
      });

      if (response.ok) {
        if(test) {
          addAuditLog(actor.username, 'ENTER_RESULTS', `Entered results for test ${test.template.code} (Visit: ${test.visitCode}).`);
        }

        // Fetch ONLY the updated test from server
        const updatedTest = await response.json();

        setState(prevState => ({
          ...prevState,
          visitTests: prevState.visitTests.map(t =>
            t.id === visitTestId ? { ...t, ...updatedTest } : t
          ),
        }));

        // Invalidate cache for next load
        invalidateDataCache('visit-tests');
      } else {
        console.error('Error adding test result:', response.statusText);
        // ROLLBACK on error
        const rollbackResponse = await fetch(`${API_BASE_URL}/visit-tests/${visitTestId}`, {
          headers: { 'Authorization': `Bearer ${authToken}` },
        });
        if (rollbackResponse.ok) {
          const originalTest = await rollbackResponse.json();
          setState(prevState => ({
            ...prevState,
            visitTests: prevState.visitTests.map(t =>
              t.id === visitTestId ? originalTest : t
            ),
          }));
        }
      }
    } catch (error) {
      console.error('Error adding test result:', error);
      throw error;
    }
  };

   const editTestResult = async (visitTestId: number, data: AddResultData, reason: string, actor: User) => {
    try {
      const authToken = getAuthToken();
      const test = state.visitTests.find(t => t.id === visitTestId);

      const updateData: any = {};
      if (data.results) updateData.results = data.results;
      if (data.cultureResult) updateData.culture_result = data.cultureResult;

      const response = await fetch(`${API_BASE_URL}/visit-tests/${visitTestId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify(updateData),
      });

      if (response.ok) {
        if (test) {
          addAuditLog(actor.username, 'EDIT_APPROVED_REPORT', `Edited approved results for test ${test.template.code} (Visit: ${test.visitCode}). Reason: ${reason}`);
        }
        setState(prevState => ({
          ...prevState,
          visitTests: prevState.visitTests.map(t =>
            t.id === visitTestId
              ? {
                  ...t,
                  results: data.results || t.results,
                  cultureResult: data.cultureResult || t.cultureResult
                }
              : t
          ),
        }));
      } else {
        console.error('Error editing test result:', response.statusText);
      }
    } catch (error) {
      console.error('Error editing test result:', error);
    }
  };

  const approveTestResult = async (visitTestId: number, actor: User) => {
    try {
      const authToken = getAuthToken();
      const test = state.visitTests.find(t => t.id === visitTestId);

      // OPTIMISTIC UPDATE: Update UI immediately
      setState(prevState => ({
        ...prevState,
        visitTests: prevState.visitTests.map(t =>
          t.id === visitTestId
            ? {
                ...t,
                status: 'APPROVED' as VisitTestStatus,
                approvedBy: actor.username,
                approvedAt: new Date().toISOString(),
              }
            : t
        ),
      }));

      const updateData = {
        status: 'APPROVED',
        approved_by: actor.username,
        approved_at: new Date().toISOString(),
      };

      const response = await fetch(`${API_BASE_URL}/visit-tests/${visitTestId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify(updateData),
      });

      if (response.ok) {
        if(test) {
          addAuditLog(actor.username, 'APPROVE_RESULTS', `Approved results for test ${test.template.code} (Visit: ${test.visitCode}).`);
        }

        // Fetch ONLY the updated test from server
        const updatedTest = await response.json();

        setState(prevState => ({
          ...prevState,
          visitTests: prevState.visitTests.map(t =>
            t.id === visitTestId ? { ...t, ...updatedTest } : t
          ),
        }));

        // Invalidate cache for next load
        invalidateDataCache('visit-tests');
      } else {
        console.error('Error approving test result:', response.statusText);
        // ROLLBACK on error
        const rollbackResponse = await fetch(`${API_BASE_URL}/visit-tests/${visitTestId}`, {
          headers: { 'Authorization': `Bearer ${authToken}` },
        });
        if (rollbackResponse.ok) {
          const originalTest = await rollbackResponse.json();
          setState(prevState => ({
            ...prevState,
            visitTests: prevState.visitTests.map(t =>
              t.id === visitTestId ? originalTest : t
            ),
          }));
        }
      }
    } catch (error) {
      console.error('Error approving test result:', error);
      throw error;
    }
  };

  const rejectTestResult = async (visitTestId: number, rejectionReason: string, actor: User): Promise<void> => {
    try {
      const authToken = getAuthToken();
      const test = state.visitTests.find(t => t.id === visitTestId);

      if (!test) {
        throw new Error('Test not found');
      }

      // OPTIMISTIC UPDATE: Update UI immediately
      setState(prevState => ({
        ...prevState,
        visitTests: prevState.visitTests.map(t =>
          t.id === visitTestId
            ? {
                ...t,
                status: 'IN_PROGRESS' as VisitTestStatus,
                results: null,
                cultureResult: null,
              }
            : t
        ),
      }));

      // Create rejection record
      const rejectionData = {
        visit_test_id: visitTestId,
        rejected_by_user_id: actor.id,
        rejected_by_username: actor.username,
        rejection_reason: rejectionReason,
        old_results: test.results || test.cultureResult
      };

      console.log('Sending rejection data:', rejectionData);

      const response = await fetch(`${API_BASE_URL}/result-rejections`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify(rejectionData),
      });

      console.log('Rejection response status:', response.status);

      if (response.ok) {
        const responseData = await response.json();
        console.log('Rejection successful:', responseData);

        // Fetch ONLY the updated test from server
        const testResponse = await fetch(`${API_BASE_URL}/visit-tests/${visitTestId}`, {
          headers: { 'Authorization': `Bearer ${authToken}` },
        });

        if (testResponse.ok) {
          const updatedTest = await testResponse.json();
          setState(prevState => ({
            ...prevState,
            visitTests: prevState.visitTests.map(t =>
              t.id === visitTestId ? { ...t, ...updatedTest } : t
            ),
          }));
        }

        // Invalidate cache for next load
        invalidateDataCache('visit-tests');

        alert('Test result rejected successfully. Lab technician will be notified.');
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Rejection failed:', errorData);
        // ROLLBACK on error
        const rollbackResponse = await fetch(`${API_BASE_URL}/visit-tests/${visitTestId}`, {
          headers: { 'Authorization': `Bearer ${authToken}` },
        });
        if (rollbackResponse.ok) {
          const originalTest = await rollbackResponse.json();
          setState(prevState => ({
            ...prevState,
            visitTests: prevState.visitTests.map(t =>
              t.id === visitTestId ? originalTest : t
            ),
          }));
        }
        throw new Error(errorData.error || 'Failed to reject test result');
      }
    } catch (error) {
      console.error('Error rejecting test result:', error);
      throw error;
    }
  };

  const collectDuePayment = (visitId: number, amount: number, mode: Visit['payment_mode'], actor: User) => {
     const visit = state.visits.find(v => v.id === visitId);
     if(visit) {
        addAuditLog(actor.username, 'COLLECT_DUE_PAYMENT', `Collected due payment of ₹${amount} for visit ${visit.visit_code}.`);
     }
    setState(prevState => ({
        ...prevState,
        visits: prevState.visits.map(visit => {
            if (visit.id === visitId) {
                const newAmountPaid = visit.amount_paid + amount;
                return {
                    ...visit,
                    amount_paid: newAmountPaid,
                    due_amount: visit.total_cost - newAmountPaid,
                    payment_mode: mode,
                };
            }
            return visit;
        })
    }));
  };

  const addUser = async (userData: UserCreationData, actor: User) => {
    try {
      const authToken = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          username: userData.username,
          password: userData.password_hash,
          role: userData.role,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create user');
      }

      const createdUser = await response.json();
      addAuditLog(actor.username, 'MANAGE_USERS', `Created new user: ${userData.username} with role ${userData.role}.`);

      setState(prevState => {
        const newUser: UserWithPassword = {
          id: createdUser.id,
          isActive: createdUser.is_active,
          username: createdUser.username,
          role: createdUser.role,
          password_hash: userData.password_hash,
          permissions: prevState.rolePermissions[userData.role] || []
        };
        return {
          ...prevState,
          users: [...prevState.users, newUser]
        };
      });
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  };

  const updateUserPermissions = async (userId: number, permissions: Permission[], actor: User) => {
      try {
        const user = state.users.find(u => u.id === userId);
        if(user) {
           addAuditLog(actor.username, 'MANAGE_USERS', `Updated permissions for user: ${user.username}.`);
        }

        // Call backend API to save permissions
        const authToken = getAuthToken();
        const response = await fetch(`${API_BASE_URL}/users/${userId}/permissions`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
          },
          body: JSON.stringify({ permissions }),
        });

        if (!response.ok) {
          throw new Error('Failed to update user permissions');
        }

        const updatedUser = await response.json();

        // Update local state after successful API call
        setState(prevState => ({
            ...prevState,
            users: prevState.users.map(user =>
                user.id === userId ? updatedUser : user
            )
        }));
      } catch (error) {
        console.error('Error updating user permissions:', error);
        alert(`Failed to update permissions: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
  };

  const addTestTemplate = async (templateData: Omit<TestTemplate, 'id'>, actor: User) => {
    try {
      const authToken = getAuthToken();

      // Transform camelCase to snake_case for backend
      const backendData = {
        code: templateData.code,
        name: templateData.name,
        category: templateData.category,
        price: templateData.price,
        b2b_price: templateData.b2b_price,
        report_type: templateData.reportType,
        parameters: templateData.parameters,
        defaultAntibioticIds: templateData.defaultAntibioticIds || [],
      };

      const response = await fetch(`${API_BASE_URL}/test-templates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify(backendData),
      });

      if (response.ok) {
        const newTemplate = await response.json();
        addAuditLog(actor.username, 'MANAGE_TESTS', `Created new test template: ${templateData.name}.`);
        setState(prevState => ({
          ...prevState,
          testTemplates: [...prevState.testTemplates, newTemplate]
        }));
      } else {
        console.error('Error creating test template:', response.statusText);
      }
    } catch (error) {
      console.error('Error creating test template:', error);
    }
  };

  const updateTestTemplate = async (templateData: TestTemplate, actor: User) => {
    try {
      const authToken = getAuthToken();

      // Transform camelCase to snake_case for backend
      const backendData = {
        code: templateData.code,
        name: templateData.name,
        category: templateData.category,
        price: templateData.price,
        b2b_price: templateData.b2b_price,
        report_type: templateData.reportType,
        parameters: templateData.parameters,
        defaultAntibioticIds: templateData.defaultAntibioticIds || [],
        is_active: templateData.isActive,
      };

      const response = await fetch(`${API_BASE_URL}/test-templates/${templateData.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify(backendData),
      });

      if (response.ok) {
        const updatedTemplate = await response.json();
        addAuditLog(actor.username, 'MANAGE_TESTS', `Updated test template: ${templateData.name}.`);
        setState(prevState => ({
          ...prevState,
          testTemplates: prevState.testTemplates.map(t => t.id === templateData.id ? updatedTemplate : t)
        }));
      } else {
        console.error('Error updating test template:', response.statusText);
      }
    } catch (error) {
      console.error('Error updating test template:', error);
    }
  };

  const deleteTestTemplate = async (templateId: number, actor: User) => {
    try {
      const template = state.testTemplates.find(t => t.id === templateId);
      if (!template) return;

      const authToken = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/test-templates/${templateId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      if (response.ok) {
        addAuditLog(actor.username, 'MANAGE_TESTS', `Deactivated test template: ${template.name}.`);
        setState(prevState => ({
          ...prevState,
          testTemplates: prevState.testTemplates.map(t => t.id === templateId ? { ...t, isActive: false } : t)
        }));
      } else {
        console.error('Error deleting test template:', response.statusText);
      }
    } catch (error) {
      console.error('Error deleting test template:', error);
    }
  };

  const updateTestPrices = async (priceData: { id: number, price: number, b2b_price: number }[], actor: User) => {
    try {
      addAuditLog(actor.username, 'MANAGE_PRICES', `Updated prices for ${priceData.length} tests.`);

      // Update each test template via API
      const authToken = getAuthToken();
      for (const priceUpdate of priceData) {
        const response = await fetch(`${API_BASE_URL}/test-templates/${priceUpdate.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            price: priceUpdate.price,
            b2b_price: priceUpdate.b2b_price,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Failed to update price for test ID ${priceUpdate.id}:`, errorText);
          throw new Error(`Failed to update price for test ID ${priceUpdate.id}`);
        }
      }

      // Reload test templates from database to ensure UI is in sync
      const templatesResponse = await fetch(`${API_BASE_URL}/test-templates`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      if (templatesResponse.ok) {
        const testTemplates = await templatesResponse.json();
        setState(prevState => ({
          ...prevState,
          testTemplates: testTemplates,
        }));
      }
    } catch (error) {
      console.error('Error updating test prices:', error);
      throw error;
    }
  };

  const updateRolePermissions = async (role: Role, permissions: Permission[], actor: User) => {
    try {
      addAuditLog(actor.username, 'MANAGE_ROLES', `Updated permissions for role: ${role}.`);

      // Call backend API to save permissions
      const response = await fetch(`${API_BASE_URL}/role-permissions/${role}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify({ permissions }),
      });

      if (!response.ok) {
        throw new Error('Failed to update role permissions');
      }

      // Update local state after successful API call
      setState(prevState => ({
          ...prevState,
          rolePermissions: {
              ...prevState.rolePermissions,
              [role]: permissions,
          }
      }));
    } catch (error) {
      console.error('Error updating role permissions:', error);
      throw error;
    }
  }

  const addClient = async (clientData: { name: string; type: 'PATIENT' | 'REFERRAL_LAB' | 'INTERNAL' }, actor: User) => {
    try {
      addAuditLog(actor.username, 'MANAGE_B2B', `Created new B2B client: ${clientData.name}.`);

      // Call backend API to create client
      const response = await fetch(`${API_BASE_URL}/clients`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify(clientData),
      });

      if (!response.ok) {
        throw new Error('Failed to add client');
      }

      const newClient = await response.json();
      console.log('✅ Client created:', newClient);

      // Update local state with the new client
      setState(prevState => ({
          ...prevState,
          clients: [...prevState.clients, newClient]
      }));
    } catch (error) {
      console.error('Error adding client:', error);
      throw error;
    }
  };

  const deleteClient = async (clientId: number, actor: User) => {
    try {
      addAuditLog(actor.username, 'MANAGE_B2B', `Deleted B2B client with ID: ${clientId}.`);

      const response = await fetch(`${API_BASE_URL}/clients/${clientId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete client');
      }

      // Update local state
      setState(prevState => ({
          ...prevState,
          clients: prevState.clients.filter(c => c.id !== clientId)
      }));
      console.log('✅ Client deleted:', clientId);
    } catch (error) {
      console.error('Error deleting client:', error);
      throw error;
    }
  };

  const settleClientBalance = async (clientId: number, actor: User, paymentMode?: string, description?: string, receivedAmount?: number) => {
    try {
      addAuditLog(actor.username, 'MANAGE_B2B', `Settled balance for client ID: ${clientId}. Mode: ${paymentMode || 'N/A'}`);

      const response = await fetch(`${API_BASE_URL}/clients/${clientId}/settle`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentMode: paymentMode || 'CASH',
          description: description || 'Balance settled',
          receivedAmount: receivedAmount,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to settle client balance');
      }

      const result = await response.json();

      // Update local state
      setState(prevState => ({
          ...prevState,
          clients: prevState.clients.map(c =>
            c.id === clientId ? { ...c, balance: 0 } : c
          )
      }));
      console.log('✅ Client balance settled:', result);
    } catch (error) {
      console.error('Error settling client balance:', error);
      throw error;
    }
  };

  const addReferralDoctor = async (doctorData: { name: string }, actor: User) => {
    try {
      addAuditLog(actor.username, 'MANAGE_B2B', `Created new referral doctor: ${doctorData.name}.`);

      // Call backend API to create referral doctor
      const response = await fetch(`${API_BASE_URL}/referral-doctors`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify(doctorData),
      });

      if (!response.ok) {
        throw new Error('Failed to add referral doctor');
      }

      const newDoctor = await response.json();
      console.log('✅ Referral doctor created:', newDoctor);

      // Update local state with the new doctor
      setState(prevState => ({
          ...prevState,
          referralDoctors: [...prevState.referralDoctors, newDoctor]
      }));
    } catch (error) {
      console.error('Error adding referral doctor:', error);
      throw error;
    }
  };

  const updateReferralDoctor = async (doctorId: number, doctorData: { name: string }, actor: User) => {
    try {
      addAuditLog(actor.username, 'MANAGE_B2B', `Updated referral doctor ID ${doctorId}: ${doctorData.name}.`);

      const response = await fetch(`${API_BASE_URL}/referral-doctors/${doctorId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify(doctorData),
      });

      if (!response.ok) {
        throw new Error('Failed to update referral doctor');
      }

      const updatedDoctor = await response.json();
      console.log('✅ Referral doctor updated:', updatedDoctor);

      // Update local state
      setState(prevState => ({
          ...prevState,
          referralDoctors: prevState.referralDoctors.map(d =>
            d.id === doctorId ? updatedDoctor : d
          )
      }));
    } catch (error) {
      console.error('Error updating referral doctor:', error);
      throw error;
    }
  };

  const deleteReferralDoctor = async (doctorId: number, actor: User) => {
    try {
      addAuditLog(actor.username, 'MANAGE_B2B', `Deleted referral doctor with ID: ${doctorId}.`);

      const response = await fetch(`${API_BASE_URL}/referral-doctors/${doctorId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete referral doctor');
      }

      // Update local state
      setState(prevState => ({
          ...prevState,
          referralDoctors: prevState.referralDoctors.filter(d => d.id !== doctorId)
      }));
      console.log('✅ Referral doctor deleted:', doctorId);
    } catch (error) {
      console.error('Error deleting referral doctor:', error);
      throw error;
    }
  };

  const updateClientPrices = async (clientId: number, pricesToUpdate: { testTemplateId: number, price: number }[], actor: User) => {
    try {
      const client = state.clients.find(c => c.id === clientId);
      if (client) {
         addAuditLog(actor.username, 'MANAGE_B2B', `Updated custom prices for B2B client: ${client.name}.`);
      }

      // Call backend API to update client prices
      const response = await fetch(`${API_BASE_URL}/clients/${clientId}/prices`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify({ clientId, prices: pricesToUpdate }),
      });

      if (!response.ok) {
        throw new Error('Failed to update client prices');
      }

      // Update local state after successful API call
      setState(prevState => {
          const otherClientPrices = prevState.clientPrices.filter(p => p.clientId !== clientId);
          const newClientPrices = pricesToUpdate
              .filter(p => p.price > 0)
              .map(p => ({
                  clientId: clientId,
                  testTemplateId: p.testTemplateId,
                  price: p.price
              }));
          return { ...prevState, clientPrices: [...otherClientPrices, ...newClientPrices] };
      });
    } catch (error) {
      console.error('Error updating client prices:', error);
      throw error;
    }
  };

  const addClientPayment = async (clientId: number, amount: number, description: string, actor: User) => {
    try {
      const client = state.clients.find(c => c.id === clientId);
      if (client) {
          addAuditLog(actor.username, 'MANAGE_B2B', `Added payment of ₹${amount} for B2B client: ${client.name}.`);
      }

      // Call backend API to add payment
      const response = await fetch(`${API_BASE_URL}/clients/${clientId}/payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify({ amount, description }),
      });

      if (!response.ok) {
        throw new Error('Failed to add client payment');
      }

      // Update local state after successful API call
      setState(prevState => {
          const newLedgerId = (prevState.ledgerEntries.length > 0 ? Math.max(...prevState.ledgerEntries.map(l => l.id)) : 0) + 1;
          const creditEntry: LedgerEntry = {
              id: newLedgerId,
              clientId: clientId,
              type: 'CREDIT',
              amount: amount,
              description: description,
              created_at: new Date().toISOString(),
          };
          const newClients = prevState.clients.map(c =>
              c.id === clientId ? { ...c, balance: c.balance - amount } : c
          );
          return { ...prevState, ledgerEntries: [...prevState.ledgerEntries, creditEntry], clients: newClients };
      });
    } catch (error) {
      console.error('Error adding client payment:', error);
      throw error;
    }
  };
  
  const addAntibiotic = async (antibioticData: Omit<Antibiotic, 'id' | 'isActive'>, actor: User) => {
    try {
      const authToken = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/antibiotics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify(antibioticData),
      });

      if (response.ok) {
        const newAntibiotic = await response.json();
        addAuditLog(actor.username, 'MANAGE_ANTIBIOTICS', `Created new antibiotic: ${antibioticData.name}.`);
        setState(prevState => ({
          ...prevState,
          antibiotics: [...prevState.antibiotics, newAntibiotic]
        }));
      } else {
        console.error('Error creating antibiotic:', response.statusText);
      }
    } catch (error) {
      console.error('Error creating antibiotic:', error);
    }
  };

  const updateAntibiotic = async (antibioticData: Antibiotic, actor: User) => {
    try {
      const authToken = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/antibiotics/${antibioticData.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify(antibioticData),
      });

      if (response.ok) {
        const updatedAntibiotic = await response.json();
        addAuditLog(actor.username, 'MANAGE_ANTIBIOTICS', `Updated antibiotic: ${antibioticData.name}.`);
        setState(prevState => ({
          ...prevState,
          antibiotics: prevState.antibiotics.map(a => a.id === antibioticData.id ? updatedAntibiotic : a)
        }));
      } else {
        console.error('Error updating antibiotic:', response.statusText);
      }
    } catch (error) {
      console.error('Error updating antibiotic:', error);
    }
  };

  const deleteAntibiotic = async (antibioticId: number, actor: User) => {
    try {
      const antibiotic = state.antibiotics.find(a => a.id === antibioticId);
      if (!antibiotic) return;

      const authToken = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/antibiotics/${antibioticId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      if (response.ok) {
        addAuditLog(actor.username, 'MANAGE_ANTIBIOTICS', `Deactivated antibiotic: ${antibiotic.name}.`);
        setState(prevState => ({
          ...prevState,
          antibiotics: prevState.antibiotics.map(a => a.id === antibioticId ? { ...a, isActive: false } : a)
        }));
      } else {
        console.error('Error deleting antibiotic:', response.statusText);
      }
    } catch (error) {
      console.error('Error deleting antibiotic:', error);
    }
  };

  const addBranch = async (branchData: Omit<Branch, 'id'>, actor: User) => {
    try {
      const authToken = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/branches`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify(branchData),
      });

      if (response.ok) {
        const newBranch = await response.json();
        addAuditLog(actor.username, 'MANAGE_BRANCHES', `Created new branch: ${branchData.name}.`);
        setState(prevState => ({
          ...prevState,
          branches: [...prevState.branches, newBranch]
        }));
      } else {
        console.error('Error creating branch:', response.statusText);
      }
    } catch (error) {
      console.error('Error creating branch:', error);
    }
  };

  const updateBranch = async (branchData: Branch, actor: User) => {
    try {
      const authToken = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/branches/${branchData.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify(branchData),
      });

      if (response.ok) {
        const updatedBranch = await response.json();
        addAuditLog(actor.username, 'MANAGE_BRANCHES', `Updated branch: ${branchData.name}.`);
        setState(prevState => ({
          ...prevState,
          branches: prevState.branches.map(b => b.id === branchData.id ? updatedBranch : b)
        }));
      } else {
        console.error('Error updating branch:', response.statusText);
      }
    } catch (error) {
      console.error('Error updating branch:', error);
    }
  };

  const deleteBranch = async (branchId: number, actor: User) => {
    try {
      const branch = state.branches.find(b => b.id === branchId);
      if (!branch) return;

      const authToken = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/branches/${branchId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      if (response.ok) {
        addAuditLog(actor.username, 'MANAGE_BRANCHES', `Deactivated branch: ${branch.name}.`);
        setState(prevState => ({
          ...prevState,
          branches: prevState.branches.map(b => b.id === branchId ? { ...b, isActive: false } : b)
        }));
      } else {
        console.error('Error deleting branch:', response.statusText);
      }
    } catch (error) {
      console.error('Error deleting branch:', error);
    }
  };

  // LAZY LOADING FUNCTIONS - Load data only when needed
  async function loadTestTemplates() {
    try {
      const data = await getCachedData<TestTemplate[]>('test-templates');
      setState(prevState => ({ ...prevState, testTemplates: data }));
    } catch (error) {
      console.error('Error loading test templates:', error);
    }
  }

  async function loadClients() {
    try {
      const data = await getCachedData<Client[]>('clients');
      setState(prevState => ({ ...prevState, clients: data }));

      // CRITICAL FIX: DO NOT load client prices here!
      // Loading prices for 100+ clients = 100+ API calls
      // Prices should be loaded ONLY when:
      // 1. User selects a specific client in the form
      // 2. Or create a batch endpoint: GET /clients/prices (all prices at once)
      // For now, prices will be loaded on-demand when client is selected
      console.log('✅ Clients loaded (prices will be loaded on-demand)');
    } catch (error) {
      console.error('Error loading clients:', error);
    }
  }

  // Load client prices - either for specific client or all clients
  async function loadClientPrices(clientId?: number) {
    try {
      const authToken = getAuthToken();
      if (!authToken) return;

      const headers = { 'Authorization': `Bearer ${authToken}` };

      if (clientId) {
        // Load prices for specific client only
        console.log(`📦 Loading prices for client ${clientId}...`);
        const pricesResponse = await fetch(`${API_BASE_URL}/clients/${clientId}/prices`, { headers });
        if (pricesResponse.ok) {
          const prices = await pricesResponse.json();
          // Merge with existing prices (replace prices for this client)
          setState(prevState => ({
            ...prevState,
            clientPrices: [
              ...prevState.clientPrices.filter((p: any) => p.clientId !== clientId),
              ...prices
            ]
          }));
          console.log(`✅ Loaded ${prices.length} prices for client ${clientId}`);
        }
      } else {
        // Load prices for ALL clients (use sparingly!)
        console.log('📦 Loading prices for ALL clients...');
        const clientPricesPromises = state.clients.map(async (client: Client) => {
          const pricesResponse = await fetch(`${API_BASE_URL}/clients/${client.id}/prices`, { headers });
          return pricesResponse.ok ? await pricesResponse.json() : [];
        });
        const clientPricesArrays = await Promise.all(clientPricesPromises);
        const clientPrices = clientPricesArrays.flat();
        setState(prevState => ({ ...prevState, clientPrices }));
        console.log(`✅ Loaded prices for ${state.clients.length} clients`);
      }
    } catch (error) {
      console.error('Error loading client prices:', error);
    }
  }

  async function loadReferralDoctors() {
    try {
      const data = await getCachedData<ReferralDoctor[]>('referral-doctors');
      setState(prevState => ({ ...prevState, referralDoctors: data }));
    } catch (error) {
      console.error('Error loading referral doctors:', error);
    }
  }

  async function loadBranches() {
    try {
      const data = await getCachedData<Branch[]>('branches');
      setState(prevState => ({ ...prevState, branches: data }));
    } catch (error) {
      console.error('Error loading branches:', error);
    }
  }

  async function loadAntibiotics() {
    try {
      const data = await getCachedData<Antibiotic[]>('antibiotics');
      setState(prevState => ({ ...prevState, antibiotics: data }));
    } catch (error) {
      console.error('Error loading antibiotics:', error);
    }
  }

  async function loadUnits() {
    try {
      const data = await getCachedData<any[]>('units');
      const units = data.map((u: any) => ({
        id: u.id,
        name: u.name,
        symbol: u.symbol,
        category: u.category,
        description: u.description,
        isActive: u.is_active ?? true
      }));
      setState(prevState => ({ ...prevState, units }));
    } catch (error) {
      console.error('Error loading units:', error);
    }
  }

  async function loadVisits() {
    try {
      const data = await getCachedData<Visit[]>('visits');
      setState(prevState => ({ ...prevState, visits: data }));
    } catch (error) {
      console.error('Error loading visits:', error);
    }
  }

  async function loadVisitTests() {
    try {
      const data = await getCachedData<VisitTest[]>('visit-tests');
      setState(prevState => ({ ...prevState, visitTests: data }));
    } catch (error) {
      console.error('Error loading visit tests:', error);
    }
  }

  async function loadUsers() {
    try {
      const data = await getCachedData<any[]>('users');
      const users = data.map((user: any) => ({
        id: user.id,
        username: user.username,
        password_hash: user.password_hash,
        role: user.role,
        isActive: user.is_active,
        permissions: user.permissions || [],
        signatureImageUrl: user.signature_image_url
      }));
      setState(prevState => ({ ...prevState, users }));
    } catch (error) {
      console.error('Error loading users:', error);
    }
  }

  // Load data for specific view
  async function loadViewData(view: string) {
    console.log(`📦 Loading data for view: ${view}`);

    const viewDataMap: Record<string, Array<() => Promise<void>>> = {
      'reception': [loadTestTemplates, loadClients, loadReferralDoctors, loadBranches],
      'phlebotomy': [loadVisits, loadVisitTests],
      'lab': [loadVisits, loadVisitTests, loadAntibiotics, loadUnits],
      'approver': [loadVisits, loadVisitTests, loadUsers],
      'admin': [loadUsers, loadTestTemplates, loadClients, loadBranches, loadAntibiotics, loadUnits],
      'b2b-dashboard': [loadClients, loadVisits],
    };

    const loaders = viewDataMap[view] || [];
    await Promise.all(loaders.map(loader => loader()));
    console.log(`✅ Data loaded for view: ${view}`);
  }

  // Legacy reloadData function - now uses lazy loading
  const reloadData = async (forceRefresh: boolean = false) => {
    try {
      console.log('🔄 reloadData called - loading all data...');

      // Invalidate cache if force refresh
      if (forceRefresh) {
        invalidateDataCache('visits');
        invalidateDataCache('visit-tests');
        invalidateDataCache('users');
        invalidateDataCache('test-templates');
        invalidateDataCache('clients');
        invalidateDataCache('antibiotics');
        invalidateDataCache('referral-doctors');
        invalidateDataCache('branches');
      }

      const authToken = getAuthToken();
      if (!authToken) {
        return;
      }

      const headers = {
        'Authorization': `Bearer ${authToken}`,
      };

      // Load visits
      const visitsResponse = await fetch(`${API_BASE_URL}/visits`, { headers });
      const visits = visitsResponse.ok ? await visitsResponse.json() : [];

      // Load visit tests
      const visitTestsResponse = await fetch(`${API_BASE_URL}/visit-tests`, { headers });
      const visitTests = visitTestsResponse.ok ? await visitTestsResponse.json() : [];

      // Load users
      const usersResponse = await fetch(`${API_BASE_URL}/users`, { headers });
      const usersData = usersResponse.ok ? await usersResponse.json() : [];
      const users = usersData.map((user: any) => ({
        id: user.id,
        username: user.username,
        role: user.role,
        isActive: user.is_active,
        password_hash: '',
        permissions: state.rolePermissions[user.role] || []
      }));

      // Load test templates
      const testTemplatesResponse = await fetch(`${API_BASE_URL}/test-templates`, { headers });
      const testTemplates = testTemplatesResponse.ok ? await testTemplatesResponse.json() : [];

      // Load clients
      const clientsResponse = await fetch(`${API_BASE_URL}/clients`, { headers });
      const clients = clientsResponse.ok ? await clientsResponse.json() : [];

      // Load antibiotics
      const antibioticsResponse = await fetch(`${API_BASE_URL}/antibiotics`, { headers });
      const antibiotics = antibioticsResponse.ok ? await antibioticsResponse.json() : [];

      // Load referral doctors
      const referralDoctorsResponse = await fetch(`${API_BASE_URL}/referral-doctors`, { headers });
      const referralDoctors = referralDoctorsResponse.ok ? await referralDoctorsResponse.json() : [];

      // Load branches
      const branchesResponse = await fetch(`${API_BASE_URL}/branches`, { headers });
      const branches = branchesResponse.ok ? await branchesResponse.json() : [];

      // Load client prices for all clients
      const clientPricesPromises = clients.map(async (client: Client) => {
        const pricesResponse = await fetch(`${API_BASE_URL}/clients/${client.id}/prices`, { headers });
        return pricesResponse.ok ? await pricesResponse.json() : [];
      });
      const clientPricesArrays = await Promise.all(clientPricesPromises);
      const clientPrices = clientPricesArrays.flat();

      const newState = {
        visits: visits,
        visitTests: visitTests,
        users: users,
        testTemplates: testTemplates,
        clients: clients,
        antibiotics: antibiotics,
        referralDoctors: referralDoctors,
        branches: branches,
        clientPrices: clientPrices,
      };

      // Cache the data
      const cacheKey = 'lms_app_data_cache';
      const cacheTimestampKey = 'lms_app_data_cache_timestamp';
      const now = Date.now();
      localStorage.setItem(cacheKey, JSON.stringify(newState));
      localStorage.setItem(cacheTimestampKey, now.toString());
      console.log('✅ reloadData: Data cached successfully');

      setState(prevState => ({
        ...prevState,
        ...newState
      }));
    } catch (error) {
      console.error('Error reloading data:', error);
    }
  };

  const value = {
    ...state,
    addVisit,
    updateVisitTestStatus,
    addTestResult,
    editTestResult,
    approveTestResult,
    rejectTestResult,
    collectDuePayment,
    addUser,
    updateUserPermissions,
    addTestTemplate,
    updateTestTemplate,
    deleteTestTemplate,
    updateTestPrices,
    updateRolePermissions,
    addClient,
    deleteClient,
    settleClientBalance,
    addReferralDoctor,
    updateReferralDoctor,
    deleteReferralDoctor,
    updateClientPrices,
    addClientPayment,
    addAntibiotic,
    updateAntibiotic,
    deleteAntibiotic,
    addBranch,
    updateBranch,
    deleteBranch,
    // Lazy loading functions
    loadTestTemplates,
    loadClients,
    loadClientPrices,
    loadReferralDoctors,
    loadBranches,
    loadAntibiotics,
    loadUnits,
    loadVisits,
    loadVisitTests,
    loadUsers,
    loadViewData,
    reloadData
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};