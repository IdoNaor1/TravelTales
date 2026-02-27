import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Social Media API',
      version: '1.0.0',
      description: 'A comprehensive REST API for managing users, posts, and comments with JWT authentication',
      contact: {
        name: 'API Support',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT token obtained from login/register endpoint',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              description: 'User ID',
              example: '507f1f77bcf86cd799439011',
            },
            username: {
              type: 'string',
              description: 'Username',
              example: 'johndoe',
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address',
              example: 'john@example.com',
            },
            profilePicture: {
              type: 'string',
              description: 'URL to profile picture',
              example: 'https://example.com/profile.jpg',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Account creation timestamp',
            },
          },
        },
        Post: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              description: 'Post ID',
              example: '507f1f77bcf86cd799439012',
            },
            title: {
              type: 'string',
              description: 'Post title',
              example: 'My First Post',
            },
            content: {
              type: 'string',
              description: 'Post content',
              example: 'This is the content of my first post.',
            },
            sender: {
              type: 'string',
              description: 'User ID of the post creator',
              example: '507f1f77bcf86cd799439011',
            },
            __v: {
              type: 'number',
              description: 'Version key',
              example: 0,
            },
          },
        },
        Comment: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              description: 'Comment ID',
              example: '507f1f77bcf86cd799439013',
            },
            postId: {
              type: 'string',
              description: 'ID of the post this comment belongs to',
              example: '507f1f77bcf86cd799439012',
            },
            content: {
              type: 'string',
              description: 'Comment content',
              example: 'Great post!',
            },
            author: {
              type: 'string',
              description: 'User ID of the comment author',
              example: '507f1f77bcf86cd799439011',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Comment creation timestamp',
            },
            __v: {
              type: 'number',
              description: 'Version key',
              example: 0,
            },
          },
        },
        RegisterRequest: {
          type: 'object',
          required: ['username', 'email', 'password'],
          properties: {
            username: {
              type: 'string',
              description: 'Unique username',
              example: 'johndoe',
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address',
              example: 'john@example.com',
            },
            password: {
              type: 'string',
              format: 'password',
              description: 'User password (will be hashed)',
              example: 'SecurePass123!',
            },
            profilePicture: {
              type: 'string',
              description: 'URL to profile picture (optional)',
              example: 'https://example.com/profile.jpg',
            },
          },
        },
        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address',
              example: 'john@example.com',
            },
            password: {
              type: 'string',
              format: 'password',
              description: 'User password',
              example: 'SecurePass123!',
            },
          },
        },
        AuthResponse: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              description: 'User ID',
              example: '507f1f77bcf86cd799439011',
            },
            username: {
              type: 'string',
              description: 'Username',
              example: 'johndoe',
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email',
              example: 'john@example.com',
            },
            token: {
              type: 'string',
              description: 'JWT access token (expires in 5 seconds for testing)',
              example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            },
            refreshToken: {
              type: 'string',
              description: 'JWT refresh token (expires in 7 days)',
              example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            },
          },
        },
        TokenRefreshRequest: {
          type: 'object',
          required: ['refreshToken'],
          properties: {
            refreshToken: {
              type: 'string',
              description: 'Valid refresh token',
              example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            },
          },
        },
        TokenRefreshResponse: {
          type: 'object',
          properties: {
            token: {
              type: 'string',
              description: 'New JWT access token',
              example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            },
            refreshToken: {
              type: 'string',
              description: 'New JWT refresh token',
              example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            },
          },
        },
        LogoutRequest: {
          type: 'object',
          required: ['refreshToken'],
          properties: {
            refreshToken: {
              type: 'string',
              description: 'Refresh token to invalidate',
              example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            },
          },
        },
        CreatePostRequest: {
          type: 'object',
          required: ['title', 'content'],
          properties: {
            title: {
              type: 'string',
              description: 'Post title',
              example: 'My First Post',
            },
            content: {
              type: 'string',
              description: 'Post content',
              example: 'This is the content of my first post.',
            },
          },
        },
        UpdateUserRequest: {
          type: 'object',
          properties: {
            username: {
              type: 'string',
              description: 'Updated username',
              example: 'johndoe_updated',
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'Updated email address',
              example: 'john.updated@example.com',
            },
            profilePicture: {
              type: 'string',
              description: 'Updated profile picture URL',
              example: 'https://example.com/new-profile.jpg',
            },
          },
        },
        CreateCommentRequest: {
          type: 'object',
          required: ['postId', 'content'],
          properties: {
            postId: {
              type: 'string',
              description: 'ID of the post to comment on',
              example: '507f1f77bcf86cd799439012',
            },
            content: {
              type: 'string',
              description: 'Comment content',
              example: 'Great post!',
            },
          },
        },
        UpdateCommentRequest: {
          type: 'object',
          required: ['content'],
          properties: {
            content: {
              type: 'string',
              description: 'Updated comment content',
              example: 'Updated comment text',
            },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              description: 'Error message',
              example: 'An error occurred',
            },
            error: {
              type: 'string',
              description: 'Detailed error information',
              example: 'Detailed error description',
            },
          },
        },
      },
      responses: {
        BadRequest: {
          description: 'Bad Request - Invalid input or missing required fields',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse',
              },
              example: {
                message: 'Missing required fields',
              },
            },
          },
        },
        Unauthorized: {
          description: 'Unauthorized - Invalid or missing authentication token',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse',
              },
              example: {
                message: 'Invalid or expired token',
              },
            },
          },
        },
        NotFound: {
          description: 'Not Found - The requested resource does not exist',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse',
              },
              example: {
                message: 'Resource not found',
              },
            },
          },
        },
        InternalServerError: {
          description: 'Internal Server Error',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse',
              },
              example: {
                message: 'Internal server error',
                error: 'Error details',
              },
            },
          },
        },
      },
    },
    tags: [
      {
        name: 'Auth',
        description: 'Authentication and authorization endpoints',
      },
      {
        name: 'Users',
        description: 'User management endpoints',
      },
      {
        name: 'Posts',
        description: 'Post management endpoints',
      },
      {
        name: 'Comments',
        description: 'Comment management endpoints',
      },
    ],
  },
  apis: ['./src/routes/*.ts'], // Path to the API routes
};

export const swaggerSpec = swaggerJsdoc(options);
