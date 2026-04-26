export enum UserRole {
  USER = 'USER',
  PROVIDER = 'PROVIDER',
  ADMIN = 'ADMIN',
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
}

export interface User {
  id: string; // BaseEntity
  createdAt: string; // BaseEntity Date string
  updatedAt: string; // BaseEntity Date string
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  role: UserRole;
  status: UserStatus;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  phone: string | null;
  avatarUrl: string | null;
  isSearchVisible: boolean;
  allowedDevices?: string[];
  notificationChannels: {
    inApp: boolean;
    push: boolean;
    email: boolean;
  };
  notificationTypePreferences: Record<string, boolean>;
  lastLogin: string | null;
  failedLoginAttempts: number;
  lockUntil?: string | null;
  // providerMemberships?: ProviderMembership[]; // Expand if needed
}
