import api from './api';

export interface User {
  id: string;
  email: string;
  username: string;
  role: string;
}

export interface LoginResponse {
  access_token: string;
  user: User;
}

export interface RegisterData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  username: string;
}

export const authApi = {
  login: (email: string, password: string) =>
    api.post<LoginResponse>('/auth/login', { identifier: email, password }),
  
  register: (data: RegisterData) =>
    api.post<{ message: string; user: User }>('/auth/register', data),
  
  logout: () => api.post('/auth/logout'),
  
  getProfile: () => api.get<User>('/auth/profile'),
};