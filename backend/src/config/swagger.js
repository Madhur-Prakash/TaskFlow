const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'TaskFlow API',
      version: '1.0.0',
      description: 'Production-ready project management API with JWT auth and RBAC',
    },
    servers: [{ url: '/api/v1', description: 'Local dev' }],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            name: { type: 'string' },
            email: { type: 'string', format: 'email' },
            role: { type: 'string', enum: ['admin', 'member'] },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Organization: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            name: { type: 'string' },
            owner: { $ref: '#/components/schemas/User' },
            members: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  user: { $ref: '#/components/schemas/User' },
                  role: { type: 'string', enum: ['admin', 'member'] },
                },
              },
            },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Task: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            title: { type: 'string' },
            description: { type: 'string' },
            status: { type: 'string', enum: ['todo', 'in-progress', 'done'] },
            assignedTo: { $ref: '#/components/schemas/User' },
            organization: { type: 'string' },
            createdBy: { $ref: '#/components/schemas/User' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string' },
          },
        },
        SuccessResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: { type: 'object' },
          },
        },
      },
    },
    tags: [
      { name: 'Auth', description: 'Authentication endpoints' },
      { name: 'Organizations', description: 'Organization management' },
      { name: 'Tasks', description: 'Task management' },
      { name: 'Users', description: 'User management' },
    ],
    paths: {
      // ── AUTH ──────────────────────────────────────────────────────────────
      '/auth/register': {
        post: {
          tags: ['Auth'],
          summary: 'Register a new user',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['name', 'email', 'password'],
                  properties: {
                    name: { type: 'string', minLength: 2, example: 'Alice' },
                    email: { type: 'string', format: 'email', example: 'alice@example.com' },
                    password: { type: 'string', minLength: 6, example: 'secret123' },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: 'User registered', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } },
            400: { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
            409: { description: 'Email already registered', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          },
        },
      },
      '/auth/login': {
        post: {
          tags: ['Auth'],
          summary: 'Login and receive tokens',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'password'],
                  properties: {
                    email: { type: 'string', format: 'email', example: 'alice@example.com' },
                    password: { type: 'string', example: 'secret123' },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'Login successful' },
            401: { description: 'Invalid credentials', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          },
        },
      },
      '/auth/refresh': {
        post: {
          tags: ['Auth'],
          summary: 'Refresh access token using refresh token cookie',
          responses: {
            200: { description: 'New access token issued' },
            401: { description: 'Invalid or missing refresh token' },
          },
        },
      },
      '/auth/logout': {
        post: {
          tags: ['Auth'],
          summary: 'Logout and clear tokens',
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: 'Logged out successfully' },
            401: { description: 'Not authenticated' },
          },
        },
      },
      '/auth/me': {
        get: {
          tags: ['Auth'],
          summary: 'Get current authenticated user',
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: 'Current user data', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } },
            401: { description: 'Not authenticated' },
          },
        },
      },

      // ── ORGANIZATIONS ─────────────────────────────────────────────────────
      '/orgs': {
        get: {
          tags: ['Organizations'],
          summary: 'Get all organizations for the current user',
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: 'List of organizations' },
            401: { description: 'Not authenticated' },
          },
        },
        post: {
          tags: ['Organizations'],
          summary: 'Create a new organization',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['name'],
                  properties: { name: { type: 'string', example: 'Acme Corp' } },
                },
              },
            },
          },
          responses: {
            201: { description: 'Organization created' },
            400: { description: 'Validation error' },
          },
        },
      },
      '/orgs/{orgId}': {
        get: {
          tags: ['Organizations'],
          summary: 'Get organization details (members only)',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'orgId', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            200: { description: 'Organization details' },
            403: { description: 'Not a member' },
            404: { description: 'Not found' },
          },
        },
        delete: {
          tags: ['Organizations'],
          summary: 'Delete organization (org admin only)',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'orgId', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            200: { description: 'Organization deleted' },
            403: { description: 'Not an org admin' },
            404: { description: 'Not found' },
          },
        },
      },
      '/orgs/{orgId}/members': {
        post: {
          tags: ['Organizations'],
          summary: 'Add a member to the organization (org admin only)',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'orgId', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['userId'],
                  properties: {
                    userId: { type: 'string', example: '64a1b2c3d4e5f6a7b8c9d0e1' },
                    role: { type: 'string', enum: ['admin', 'member'], default: 'member' },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: 'Member added' },
            403: { description: 'Not an org admin' },
            404: { description: 'User or org not found' },
            409: { description: 'Already a member' },
          },
        },
      },
      '/orgs/{orgId}/members/{userId}': {
        delete: {
          tags: ['Organizations'],
          summary: 'Remove a member from the organization (org admin only)',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'orgId', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'userId', in: 'path', required: true, schema: { type: 'string' } },
          ],
          responses: {
            200: { description: 'Member removed' },
            400: { description: 'Cannot remove owner' },
            403: { description: 'Not an org admin' },
          },
        },
      },
      '/orgs/{orgId}/members/{userId}/role': {
        patch: {
          tags: ['Organizations'],
          summary: "Update a member's role (org admin only)",
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'orgId', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'userId', in: 'path', required: true, schema: { type: 'string' } },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['role'],
                  properties: { role: { type: 'string', enum: ['admin', 'member'] } },
                },
              },
            },
          },
          responses: {
            200: { description: 'Role updated' },
            403: { description: 'Not an org admin' },
            404: { description: 'Member not found' },
          },
        },
      },

      // ── TASKS ─────────────────────────────────────────────────────────────
      '/orgs/{orgId}/tasks': {
        get: {
          tags: ['Tasks'],
          summary: 'Get tasks for an org (admins see all, members see assigned)',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'orgId', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            200: { description: 'List of tasks' },
            403: { description: 'Not a member' },
          },
        },
        post: {
          tags: ['Tasks'],
          summary: 'Create a task in an org',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'orgId', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['title'],
                  properties: {
                    title: { type: 'string', example: 'Build login page' },
                    description: { type: 'string', example: 'Implement JWT auth UI' },
                    status: { type: 'string', enum: ['todo', 'in-progress', 'done'], default: 'todo' },
                    assignedTo: { type: 'string', nullable: true, example: '64a1b2c3d4e5f6a7b8c9d0e1' },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: 'Task created' },
            400: { description: 'Validation error' },
            403: { description: 'Not a member' },
          },
        },
      },
      '/tasks/{taskId}': {
        patch: {
          tags: ['Tasks'],
          summary: 'Update a task (creator, assignee, or org admin)',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'taskId', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    title: { type: 'string' },
                    description: { type: 'string' },
                    status: { type: 'string', enum: ['todo', 'in-progress', 'done'] },
                    assignedTo: { type: 'string', nullable: true },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'Task updated' },
            403: { description: 'Not authorized' },
            404: { description: 'Task not found' },
          },
        },
        delete: {
          tags: ['Tasks'],
          summary: 'Delete a task (creator or org admin)',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'taskId', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            200: { description: 'Task deleted' },
            403: { description: 'Not authorized' },
            404: { description: 'Task not found' },
          },
        },
      },

      // ── USERS ─────────────────────────────────────────────────────────────
      '/users': {
        get: {
          tags: ['Users'],
          summary: 'Get all users (any authenticated user — used for add-member UI)',
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: 'List of users' },
            401: { description: 'Not authenticated' },
          },
        },
      },
      '/users/admin': {
        get: {
          tags: ['Users'],
          summary: 'Get all users — global admin only',
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: 'List of users' },
            403: { description: 'Global admin role required' },
          },
        },
      },

      // ── HEALTH ────────────────────────────────────────────────────────────
      '/health': {
        get: {
          tags: ['Health'],
          summary: 'Health check',
          responses: { 200: { description: 'Server is up' } },
        },
      },
    },
  },
  apis: [],
};

module.exports = swaggerJsdoc(options);
