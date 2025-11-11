import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import type { Visit, VisitTest, Patient, TestTemplate, VisitTestStatus, User, Role, UserWithPassword, Client, ClientPrice, LedgerEntry, RolePermissions, Permission, CultureResult, AuditLog, Antibiotic, Branch, Unit } from '../types';

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
  // Data loading
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

  // Load clients, referral doctors, test templates, branches, antibiotics, and visit tests from API on mount and when auth token changes
  useEffect(() => {
    const loadData = async () => {
      try {
        const authToken = getAuthToken();

        if (!authToken) {
          return;
        }

        const headers = {
          'Authorization': `Bearer ${authToken}`,
        };

        // Load clients
        const clientsResponse = await fetch(`${API_BASE_URL}/clients`, { headers });
        const clients = clientsResponse.ok ? await clientsResponse.json() : [];

        // Load referral doctors
        const doctorsResponse = await fetch(`${API_BASE_URL}/referral-doctors`, { headers });
        const referralDoctors = doctorsResponse.ok ? await doctorsResponse.json() : [];

        // Load test templates
        const templatesResponse = await fetch(`${API_BASE_URL}/test-templates`, { headers });
        const testTemplates = templatesResponse.ok ? await templatesResponse.json() : [];

        // Load branches
        const branchesResponse = await fetch(`${API_BASE_URL}/branches`, { headers });
        const branches = branchesResponse.ok ? await branchesResponse.json() : [];

        // Load antibiotics
        const antibioticsResponse = await fetch(`${API_BASE_URL}/antibiotics`, { headers });
        const antibiotics = antibioticsResponse.ok ? await antibioticsResponse.json() : [];

        // Load units
        const unitsResponse = await fetch(`${API_BASE_URL}/units/active`, { headers });
        const units = unitsResponse.ok ? await unitsResponse.json() : [];

        // Load visits
        const visitsResponse = await fetch(`${API_BASE_URL}/visits`, { headers });
        const visits = visitsResponse.ok ? await visitsResponse.json() : [];

        // Load visit tests
        const visitTestsResponse = await fetch(`${API_BASE_URL}/visit-tests`, { headers });
        const visitTests = visitTestsResponse.ok ? await visitTestsResponse.json() : [];

        setState(prevState => ({
          ...prevState,
          clients: clients,
          referralDoctors: referralDoctors,
          testTemplates: testTemplates,
          branches: branches,
          antibiotics: antibiotics,
          units: units.map((u: any) => ({
            id: u.id,
            name: u.name,
            symbol: u.symbol,
            category: u.category,
            description: u.description,
            isActive: u.is_active ?? true
          })),
          visits: visits,
          visitTests: visitTests,
        }));
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };

    // Use a small delay to ensure localStorage is updated
    const timer = setTimeout(() => {
      loadData();
    }, 100);

    return () => clearTimeout(timer);
  }, []);

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

      // Reload all data from database to ensure everything is in sync
      await reloadData();
    } catch (error) {
      console.error('Error creating visit:', error);
      throw error;
    }
  };
  
  const updateVisitTestStatus = async (visitTestId: number, status: VisitTestStatus, actor: User, details?: UpdateStatusDetails) => {
    try {
      const authToken = getAuthToken();
      const test = state.visitTests.find(t => t.id === visitTestId);

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
        setState(prevState => ({
          ...prevState,
          visitTests: prevState.visitTests.map(t =>
            t.id === visitTestId
              ? {
                  ...t,
                  status,
                  collectedBy: details?.collectedBy || t.collectedBy,
                  collectedAt: status === 'SAMPLE_COLLECTED' ? new Date().toISOString() : t.collectedAt,
                  specimen_type: details?.specimen_type || t.specimen_type,
                }
              : t
          ),
        }));
      } else {
        console.error('Error updating visit test status:', response.statusText);
      }
    } catch (error) {
      console.error('Error updating visit test status:', error);
    }
  };
  
  const addTestResult = async (visitTestId: number, data: AddResultData, actor: User) => {
    try {
      const authToken = getAuthToken();
      const test = state.visitTests.find(t => t.id === visitTestId);

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
        setState(prevState => ({
          ...prevState,
          visitTests: prevState.visitTests.map(t =>
            t.id === visitTestId
              ? {
                  ...t,
                  status: 'AWAITING_APPROVAL',
                  results: data.results || t.results,
                  cultureResult: data.cultureResult || t.cultureResult
                }
              : t
          ),
        }));
      } else {
        console.error('Error adding test result:', response.statusText);
      }
    } catch (error) {
      console.error('Error adding test result:', error);
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
        setState(prevState => ({
            ...prevState,
            visitTests: prevState.visitTests.map(t =>
                t.id === visitTestId
                ? {
                    ...t,
                    status: 'APPROVED',
                    approvedBy: actor.username,
                    approvedAt: new Date().toISOString(),
                  }
                : t
            )
        }));
      } else {
        console.error('Error approving test result:', response.statusText);
      }
    } catch (error) {
      console.error('Error approving test result:', error);
    }
  };

  const rejectTestResult = async (visitTestId: number, rejectionReason: string, actor: User): Promise<void> => {
    try {
      const authToken = getAuthToken();
      const test = state.visitTests.find(t => t.id === visitTestId);

      if (!test) {
        throw new Error('Test not found');
      }

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
        // Reload data to get updated test status and rejection count
        await reloadData();
        alert('Test result rejected successfully. Lab technician will be notified.');
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Rejection failed:', errorData);
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
          throw new Error(`Failed to update price for test ID ${priceUpdate.id}`);
        }
      }

      // Update local state after successful API calls
      setState(prevState => {
          const updatedTemplates = prevState.testTemplates.map(template => {
              const update = priceData.find(p => p.id === template.id);
              if (update) {
                  return { ...template, price: update.price, b2b_price: update.b2b_price };
              }
              return template;
          });
          return { ...prevState, testTemplates: updatedTemplates };
      });
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

  const reloadData = async () => {
    try {
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

      setState(prevState => ({
        ...prevState,
        visits: visits,
        visitTests: visitTests,
        users: users,
        testTemplates: testTemplates,
        clients: clients,
        antibiotics: antibiotics,
        referralDoctors: referralDoctors,
        branches: branches,
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