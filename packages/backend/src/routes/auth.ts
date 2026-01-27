import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authService, TokenPayload } from '../services/auth.service.js';
import type { Permission, UserRole } from '../types/index.js';

// Extend FastifyRequest to include user
declare module 'fastify' {
  interface FastifyRequest {
    user?: TokenPayload;
  }
}

// Auth middleware
export async function authMiddleware(request: FastifyRequest, reply: FastifyReply) {
  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    reply.status(401).send({ error: 'Unauthorized' });
    return;
  }

  const token = authHeader.substring(7);
  const payload = authService.verifyToken(token);
  
  if (!payload) {
    reply.status(401).send({ error: 'Invalid or expired token' });
    return;
  }

  request.user = payload;
}

// Permission guard factory
export function requirePermission(permission: Permission) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    await authMiddleware(request, reply);
    if (reply.sent) return;

    if (!request.user || !authService.hasPermission(request.user.permissions, permission)) {
      await authService.logAction(
        request.user?.userId || null,
        'access_denied',
        undefined,
        undefined,
        { permission, path: request.url }
      );
      reply.status(403).send({ error: 'Forbidden' });
      return;
    }
  };
}

// Role guard factory
export function requireRole(...roles: UserRole[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    await authMiddleware(request, reply);
    if (reply.sent) return;

    if (!request.user || !authService.hasRole(request.user.role, roles)) {
      await authService.logAction(
        request.user?.userId || null,
        'access_denied',
        undefined,
        undefined,
        { requiredRoles: roles, userRole: request.user?.role, path: request.url }
      );
      reply.status(403).send({ error: 'Forbidden' });
      return;
    }
  };
}

export async function authRoutes(fastify: FastifyInstance) {
  // Register
  fastify.post('/register', async (request, reply) => {
    try {
      const { email, password, role } = request.body as {
        email: string;
        password: string;
        role?: UserRole;
      };

      if (!email || !password) {
        reply.status(400).send({ error: 'Email and password required' });
        return;
      }

      const result = await authService.register({ email, password, role });
      reply.status(201).send(result);
    } catch (error) {
      reply.status(400).send({ error: (error as Error).message });
    }
  });

  // Login
  fastify.post('/login', async (request, reply) => {
    try {
      const { email, password } = request.body as {
        email: string;
        password: string;
      };

      if (!email || !password) {
        reply.status(400).send({ error: 'Email and password required' });
        return;
      }

      const result = await authService.login({ email, password });
      return result;
    } catch (error) {
      reply.status(401).send({ error: (error as Error).message });
    }
  });

  // Refresh token
  fastify.post('/refresh', async (request, reply) => {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      reply.status(401).send({ error: 'Token required' });
      return;
    }

    const token = authHeader.substring(7);
    const result = await authService.refreshToken(token);
    
    if (!result) {
      reply.status(401).send({ error: 'Invalid or expired token' });
      return;
    }

    return result;
  });

  // Get current user
  fastify.get('/me', { preHandler: authMiddleware }, async (request) => {
    const user = await authService.findById(request.user!.userId);
    if (!user) {
      return { error: 'User not found' };
    }
    const { ...sanitized } = user;
    return sanitized;
  });

  // Logout (client-side token removal, but log the action)
  fastify.post('/logout', { preHandler: authMiddleware }, async (request) => {
    await authService.logAction(request.user!.userId, 'logout', 'user', request.user!.userId);
    return { message: 'Logged out successfully' };
  });

  // Get audit logs (admin only)
  fastify.get('/audit-logs', { preHandler: requireRole('admin') }, async (request) => {
    const query = request.query as Record<string, string>;
    return authService.getAuditLogs({
      userId: query.userId,
      action: query.action,
      limit: query.limit ? parseInt(query.limit) : 100,
      offset: query.offset ? parseInt(query.offset) : 0,
    });
  });
}
