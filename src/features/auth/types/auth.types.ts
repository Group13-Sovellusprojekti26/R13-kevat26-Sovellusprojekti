export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  userId: string | null;
  loading: boolean;
  error: string | null;
}
