import type { UserRole } from '../lib/database.types';

export type MockRole = {
  id: string;
  name: UserRole;
};

export type MockAuthUser = {
  id: string;
  email: string;
  password: string;
  profile: {
    role_id: string;
  };
};

export type MockAuthData = {
  roles: MockRole[];
  users: MockAuthUser[];
};

export type AuthSession = {
  userId: string;
  email: string;
  role: UserRole;
};

export class AuthService {
  private readonly data: MockAuthData;
  private session: AuthSession | null = null;

  public constructor(data: MockAuthData) {
    this.data = {
      roles: data.roles.map((role) => ({ ...role })),
      users: data.users.map((user) => ({ ...user, profile: { ...user.profile } }))
    };
  }

  public async login(email: string, password: string): Promise<AuthSession> {
    const user = this.data.users.find(
      (candidate) => candidate.email === email && candidate.password === password
    );
    if (!user) {
      throw new Error('Invalid credentials');
    }

    const role = this.findUserRole(user);
    this.session = { userId: user.id, email: user.email, role };
    return { ...this.session };
  }

  public async logout(): Promise<void> {
    this.session = null;
  }

  public async getSession(): Promise<AuthSession | null> {
    return this.session ? { ...this.session } : null;
  }

  public async getCurrentRole(): Promise<UserRole | null> {
    if (!this.session) {
      return null;
    }

    const user = this.data.users.find((candidate) => candidate.id === this.session?.userId);
    if (!user) {
      throw new Error('Invalid session profile');
    }
    return this.findUserRole(user);
  }

  private findUserRole(user: MockAuthUser): UserRole {
    const role = this.data.roles.find((candidate) => candidate.id === user.profile.role_id);
    if (!role) {
      throw new Error('Invalid session profile');
    }
    return role.name;
  }
}