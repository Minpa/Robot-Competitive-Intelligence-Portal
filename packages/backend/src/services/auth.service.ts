import { eq } from 'drizzle-orm';
import { createHash } from 'crypto';
import { db, users, auditLogs } from '../db/index.js';
import type { User, UserRole, Permission } from '../types/index.js';

/**
 * 허용된 이메일 화이트리스트
 * 이 목록에 있는 이메일만 회원가입 가능
 */
const ALLOWED_EMAILS: string[] = [
  'somewhere010@gmail.com',
  // 추가 이메일은 여기에 등록
];

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  role?: UserRole;
}

export interface TokenPayload {
  userId: string;
  email: string;
  role: UserRole;
  permissions: Permission[];
}

export interface AuthResult {
  user: Omit<User, 'passwordHash'>;
  token: string;
  expiresAt: Date;
}

// Role permissions mapping
const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: ['read', 'write', 'admin', 'export', 'crawl_manage'],
  analyst: ['read', 'write', 'export'],
  viewer: ['read'],
};

export class AuthService {
  private jwtSecret: string;
  private tokenExpiry: number = 24 * 60 * 60 * 1000; // 24 hours

  constructor() {
    this.jwtSecret = process.env.JWT_SECRET || 'dev-secret-change-in-production';
  }

  /**
   * Register a new user
   */
  async register(data: RegisterData): Promise<AuthResult> {
    // 이메일 화이트리스트 확인
    if (!this.isEmailAllowed(data.email)) {
      throw new Error('이 이메일은 등록이 허용되지 않습니다. 관리자에게 문의하세요.');
    }

    // Check if user exists
    const existing = await this.findByEmail(data.email);
    if (existing) {
      throw new Error('User already exists');
    }

    const passwordHash = this.hashPassword(data.password);
    const role = data.role || 'viewer';
    const permissions = ROLE_PERMISSIONS[role];

    const [user] = await db
      .insert(users)
      .values({
        email: data.email,
        passwordHash,
        role,
        permissions,
      })
      .returning();

    if (!user) {
      throw new Error('Failed to create user');
    }

    const token = this.generateToken({
      userId: user.id,
      email: user.email,
      role: user.role as UserRole,
      permissions: user.permissions as Permission[],
    });

    await this.logAction(user.id, 'register', 'user', user.id);

    return {
      user: this.sanitizeUser(user as User),
      token,
      expiresAt: new Date(Date.now() + this.tokenExpiry),
    };
  }

  /**
   * 이메일이 화이트리스트에 있는지 확인
   */
  isEmailAllowed(email: string): boolean {
    return ALLOWED_EMAILS.includes(email.toLowerCase());
  }

  /**
   * 허용된 이메일 목록 조회 (관리자용)
   */
  getAllowedEmails(): string[] {
    return [...ALLOWED_EMAILS];
  }

  /**
   * Login user
   */
  async login(credentials: LoginCredentials): Promise<AuthResult> {
    const user = await this.findByEmail(credentials.email);
    if (!user) {
      throw new Error('Invalid credentials');
    }

    const passwordHash = this.hashPassword(credentials.password);
    if (passwordHash !== user.passwordHash) {
      await this.logAction(null, 'login_failed', 'user', user.id, { email: credentials.email });
      throw new Error('Invalid credentials');
    }

    // Update last login
    await db
      .update(users)
      .set({ lastLogin: new Date() })
      .where(eq(users.id, user.id));

    const token = this.generateToken({
      userId: user.id,
      email: user.email,
      role: user.role as UserRole,
      permissions: user.permissions as Permission[],
    });

    await this.logAction(user.id, 'login', 'user', user.id);

    return {
      user: this.sanitizeUser(user as User),
      token,
      expiresAt: new Date(Date.now() + this.tokenExpiry),
    };
  }

  /**
   * Verify token and return payload
   */
  verifyToken(token: string): TokenPayload | null {
    try {
      // Simple JWT-like verification (in production, use proper JWT library)
      const [header, payload, signature] = token.split('.');
      if (!header || !payload || !signature) return null;

      const expectedSignature = this.sign(`${header}.${payload}`);
      if (signature !== expectedSignature) return null;

      const decoded = JSON.parse(Buffer.from(payload, 'base64').toString());
      
      // Check expiry
      if (decoded.exp && decoded.exp < Date.now()) return null;

      return {
        userId: decoded.sub,
        email: decoded.email,
        role: decoded.role,
        permissions: decoded.permissions,
      };
    } catch {
      return null;
    }
  }

  /**
   * Refresh token
   */
  async refreshToken(oldToken: string): Promise<AuthResult | null> {
    const payload = this.verifyToken(oldToken);
    if (!payload) return null;

    const user = await this.findById(payload.userId);
    if (!user) return null;

    const newToken = this.generateToken({
      userId: user.id,
      email: user.email,
      role: user.role as UserRole,
      permissions: user.permissions as Permission[],
    });

    return {
      user: this.sanitizeUser(user as User),
      token: newToken,
      expiresAt: new Date(Date.now() + this.tokenExpiry),
    };
  }

  /**
   * Check if user has permission
   */
  hasPermission(userPermissions: Permission[], required: Permission): boolean {
    return userPermissions.includes(required) || userPermissions.includes('admin');
  }

  /**
   * Check if user has role
   */
  hasRole(userRole: UserRole, requiredRoles: UserRole[]): boolean {
    return requiredRoles.includes(userRole);
  }

  /**
   * Get user by ID
   */
  async findById(id: string): Promise<User | null> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    return (user as User) || null;
  }

  /**
   * Get user by email
   */
  async findByEmail(email: string): Promise<(User & { passwordHash: string }) | null> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    return user as (User & { passwordHash: string }) || null;
  }

  /**
   * Log an action for audit
   */
  async logAction(
    userId: string | null,
    action: string,
    entityType?: string,
    entityId?: string,
    changes?: Record<string, unknown>
  ): Promise<void> {
    await db.insert(auditLogs).values({
      userId,
      action,
      entityType,
      entityId,
      changes,
    });
  }

  /**
   * Get audit logs
   */
  async getAuditLogs(options: {
    userId?: string;
    action?: string;
    limit?: number;
    offset?: number;
  } = {}) {
    const { userId, limit = 100, offset = 0 } = options;

    let query = db.select().from(auditLogs);
    
    if (userId) {
      query = query.where(eq(auditLogs.userId, userId)) as typeof query;
    }

    return query.limit(limit).offset(offset);
  }

  private hashPassword(password: string): string {
    return createHash('sha256')
      .update(password + this.jwtSecret)
      .digest('hex');
  }

  private generateToken(payload: TokenPayload): string {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64');
    const body = Buffer.from(JSON.stringify({
      sub: payload.userId,
      email: payload.email,
      role: payload.role,
      permissions: payload.permissions,
      iat: Date.now(),
      exp: Date.now() + this.tokenExpiry,
    })).toString('base64');
    const signature = this.sign(`${header}.${body}`);
    return `${header}.${body}.${signature}`;
  }

  private sign(data: string): string {
    return createHash('sha256')
      .update(data + this.jwtSecret)
      .digest('base64')
      .replace(/[+/=]/g, '');
  }

  private sanitizeUser(user: User): Omit<User, 'passwordHash'> {
    const { ...sanitized } = user;
    return sanitized;
  }
}

export const authService = new AuthService();
