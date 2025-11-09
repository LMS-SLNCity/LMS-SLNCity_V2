/**
 * API Configuration
 * Centralized API base URL configuration that uses environment variables
 */

export const API_BASE_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : 'http://localhost:5001/api';

console.log('API Base URL configured:', API_BASE_URL);

