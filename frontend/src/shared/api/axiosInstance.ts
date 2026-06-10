import axios from 'axios';

/**
 * Axios instance pointed at the SAME-ORIGIN proxy, never at the backend.
 * Cookies (httpOnly JWTs) are sent automatically with withCredentials.
 */
export const axiosInstance = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});
