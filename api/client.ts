const API_BASE_URL = 'http://localhost:5001/api';

/**
 * Get authorization headers with JWT token
 * Checks sessionStorage first (current session), then localStorage (remember me)
 */
const getAuthHeaders = () => {
  const token = sessionStorage.getItem('authToken') || localStorage.getItem('authToken');
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
  };
};

export const apiClient = {
  // Auth
  async login(username: string, password: string) {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (!response.ok) throw new Error('Login failed');
    return response.json();
  },

  async verifyToken() {
    const response = await fetch(`${API_BASE_URL}/auth/verify`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Token verification failed');
    return response.json();
  },

  // Users
  async getUsers() {
    const response = await fetch(`${API_BASE_URL}/users`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch users');
    return response.json();
  },

  async createUser(userData: any) {
    const response = await fetch(`${API_BASE_URL}/users`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(userData),
    });
    if (!response.ok) throw new Error('Failed to create user');
    return response.json();
  },

  async updateUser(id: number, userData: any) {
    const response = await fetch(`${API_BASE_URL}/users/${id}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(userData),
    });
    if (!response.ok) throw new Error('Failed to update user');
    return response.json();
  },

  async deleteUser(id: number) {
    const response = await fetch(`${API_BASE_URL}/users/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to disable user');
    return response.json();
  },

  async enableUser(id: number) {
    const response = await fetch(`${API_BASE_URL}/users/${id}/enable`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to enable user');
    return response.json();
  },

  // Test Templates
  async getTestTemplates() {
    const response = await fetch(`${API_BASE_URL}/test-templates`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch test templates');
    return response.json();
  },

  async createTestTemplate(data: any) {
    const response = await fetch(`${API_BASE_URL}/test-templates`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create test template');
    return response.json();
  },

  async updateTestTemplate(id: number, data: any) {
    const response = await fetch(`${API_BASE_URL}/test-templates/${id}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update test template');
    return response.json();
  },

  async deleteTestTemplate(id: number) {
    const response = await fetch(`${API_BASE_URL}/test-templates/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to delete test template');
    return response.json();
  },

  // Antibiotics
  async getAntibiotics() {
    const response = await fetch(`${API_BASE_URL}/antibiotics`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch antibiotics');
    return response.json();
  },

  async createAntibiotic(data: any) {
    const response = await fetch(`${API_BASE_URL}/antibiotics`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create antibiotic');
    return response.json();
  },

  async updateAntibiotic(id: number, data: any) {
    const response = await fetch(`${API_BASE_URL}/antibiotics/${id}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update antibiotic');
    return response.json();
  },

  async deleteAntibiotic(id: number) {
    const response = await fetch(`${API_BASE_URL}/antibiotics/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to delete antibiotic');
    return response.json();
  },

  // Clients
  async getClients() {
    const response = await fetch(`${API_BASE_URL}/clients`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch clients');
    return response.json();
  },

  async addClient(clientData: { name: string; type: 'PATIENT' | 'REFERRAL_LAB' | 'INTERNAL' }) {
    const response = await fetch(`${API_BASE_URL}/clients`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(clientData),
    });
    if (!response.ok) throw new Error('Failed to add client');
    return response.json();
  },

  async getClientPrices(clientId: number) {
    const response = await fetch(`${API_BASE_URL}/clients/${clientId}/prices`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch client prices');
    return response.json();
  },

  async updateClientPrices(clientId: number, prices: any) {
    const response = await fetch(`${API_BASE_URL}/clients/${clientId}/prices`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ clientId, prices }),
    });
    if (!response.ok) throw new Error('Failed to update client prices');
    return response.json();
  },

  // Patients
  async getPatients() {
    console.log('🔄 Fetching patients from', `${API_BASE_URL}/patients`);
    const response = await fetch(`${API_BASE_URL}/patients`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch patients');
    const data = await response.json();
    console.log('✅ Patients fetched:', data.length, 'records');
    return data;
  },

  async searchPatients(query: string) {
    console.log('🔍 Searching patients with query:', query);
    const response = await fetch(`${API_BASE_URL}/patients/search/${encodeURIComponent(query)}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to search patients');
    const data = await response.json();
    console.log('✅ Found patients:', data.length, 'records');
    return data;
  },

  async createPatient(data: any) {
    const response = await fetch(`${API_BASE_URL}/patients`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create patient');
    return response.json();
  },

  // Visits
  async getVisits() {
    const response = await fetch(`${API_BASE_URL}/visits`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch visits');
    return response.json();
  },

  async createVisit(data: any) {
    const response = await fetch(`${API_BASE_URL}/visits`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create visit');
    return response.json();
  },

  async updateVisit(id: number, data: any) {
    const response = await fetch(`${API_BASE_URL}/visits/${id}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update visit');
    return response.json();
  },

  // Visit Tests
  async getVisitTests() {
    const response = await fetch(`${API_BASE_URL}/visit-tests`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch visit tests');
    return response.json();
  },

  async createVisitTest(data: any) {
    const response = await fetch(`${API_BASE_URL}/visit-tests`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create visit test');
    return response.json();
  },

  async updateVisitTest(id: number, data: any) {
    const response = await fetch(`${API_BASE_URL}/visit-tests/${id}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update visit test');
    return response.json();
  },

  // Signatories
  async getSignatories() {
    const response = await fetch(`${API_BASE_URL}/signatories`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch signatories');
    return response.json();
  },

  // Referral Doctors
  async getReferralDoctors() {
    const response = await fetch(`${API_BASE_URL}/referral-doctors`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch referral doctors');
    return response.json();
  },

  async addReferralDoctor(doctorData: { name: string }) {
    const response = await fetch(`${API_BASE_URL}/referral-doctors`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(doctorData),
    });
    if (!response.ok) throw new Error('Failed to add referral doctor');
    return response.json();
  },

  // Audit Logs
  async getAuditLogs() {
    const response = await fetch(`${API_BASE_URL}/audit-logs`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch audit logs');
    return response.json();
  },

  async createAuditLog(data: any) {
    const response = await fetch(`${API_BASE_URL}/audit-logs`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create audit log');
    return response.json();
  },

  // Branches
  async getBranches() {
    const response = await fetch(`${API_BASE_URL}/branches`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch branches');
    return response.json();
  },

  async createBranch(data: any) {
    const response = await fetch(`${API_BASE_URL}/branches`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create branch');
    return response.json();
  },

  async updateBranch(id: number, data: any) {
    const response = await fetch(`${API_BASE_URL}/branches/${id}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update branch');
    return response.json();
  },

  async deleteBranch(id: number) {
    const response = await fetch(`${API_BASE_URL}/branches/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to delete branch');
    return response.json();
  },

  // Dashboard
  async getDashboardOverview() {
    const response = await fetch(`${API_BASE_URL}/dashboard/overview`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch dashboard overview');
    return response.json();
  },

  async getDashboardRevenue() {
    const response = await fetch(`${API_BASE_URL}/dashboard/revenue`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch revenue metrics');
    return response.json();
  },

  async getDashboardTests() {
    const response = await fetch(`${API_BASE_URL}/dashboard/tests`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch test metrics');
    return response.json();
  },

  async getDashboardClients() {
    const response = await fetch(`${API_BASE_URL}/dashboard/clients`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch client metrics');
    return response.json();
  },

  async getDashboardTrends() {
    const response = await fetch(`${API_BASE_URL}/dashboard/trends`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch trends');
    return response.json();
  },

  // Role Permissions
  async getRolePermissions() {
    const response = await fetch(`${API_BASE_URL}/role-permissions`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch role permissions');
    return response.json();
  },

  async updateRolePermissions(role: string, permissions: string[]) {
    const response = await fetch(`${API_BASE_URL}/role-permissions/${role}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ permissions }),
    });
    if (!response.ok) throw new Error('Failed to update role permissions');
    return response.json();
  },
};

