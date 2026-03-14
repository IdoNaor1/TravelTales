import swaggerJsdoc from "swagger-jsdoc";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "TravelTales API",
      version: "1.0.0",
      description:
        "REST API for TravelTales — a travel journal platform where users share experiences, upload photos, like posts, and explore destinations with AI-powered search.",
      contact: {
        name: "API Support",
      },
    },
    servers: [
      {
        url: "http://localhost:3000",
        description: "Development server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description:
            "Enter your JWT token obtained from login/register endpoint",
        },
      },
      schemas: {
        User: {
          type: "object",
          properties: {
            _id: {
              type: "string",
              description: "User ID",
              example: "507f1f77bcf86cd799439011",
            },
            username: {
              type: "string",
              description: "Username",
              example: "johndoe",
            },
            email: {
              type: "string",
              format: "email",
              description: "User email address",
              example: "john@example.com",
            },
            profilePicture: {
              type: "string",
              description: "URL to profile picture",
              example: "/public/1709123456789.jpg",
            },
            createdAt: {
              type: "string",
              format: "date-time",
              description: "Account creation timestamp",
            },
          },
          example: {
            _id: "507f1f77bcf86cd799439011",
            username: "johndoe",
            email: "john@example.com",
            profilePicture: "/public/1709123456789.jpg",
            createdAt: "2026-03-01T10:15:30.000Z",
          },
        },
        Post: {
          type: "object",
          properties: {
            _id: {
              type: "string",
              description: "Post ID",
              example: "507f1f77bcf86cd799439012",
            },
            title: {
              type: "string",
              description: "Post title",
              example: "Sunset in Santorini",
            },
            content: {
              type: "string",
              description: "Post content",
              example: "The views from Oia were absolutely breathtaking...",
            },
            sender: {
              type: "string",
              description: "User ID of the post creator",
              example: "507f1f77bcf86cd799439011",
            },
            image: {
              type: "string",
              nullable: true,
              description: "URL to the uploaded travel photo",
              example: "/public/1709123456789.jpg",
            },
            likes: {
              type: "array",
              description: "Array of user IDs who liked the post",
              items: {
                type: "string",
                example: "507f1f77bcf86cd799439011",
              },
            },
            createdAt: {
              type: "string",
              format: "date-time",
              description: "Post creation timestamp",
            },
            updatedAt: {
              type: "string",
              format: "date-time",
              description: "Post last-updated timestamp",
            },
            __v: {
              type: "number",
              description: "Version key",
              example: 0,
            },
          },
          example: {
            _id: "507f1f77bcf86cd799439012",
            title: "Sunset in Santorini",
            content: "The views from Oia were absolutely breathtaking...",
            sender: "507f1f77bcf86cd799439011",
            image: "/public/1709123456789.jpg",
            likes: ["507f1f77bcf86cd799439021"],
            createdAt: "2026-03-01T10:20:00.000Z",
            updatedAt: "2026-03-01T10:20:00.000Z",
            __v: 0,
          },
        },
        PaginatedPostsResponse: {
          type: "object",
          properties: {
            posts: {
              type: "array",
              description: "Page of posts sorted newest-first",
              items: {
                $ref: "#/components/schemas/Post",
              },
            },
            nextCursor: {
              type: "string",
              nullable: true,
              description:
                "Pass as `cursor` query param to fetch the next page. null when no more pages.",
              example: "507f1f77bcf86cd799439012",
            },
          },
          example: {
            posts: [
              {
                _id: "507f1f77bcf86cd799439012",
                title: "Sunset in Santorini",
                content: "The views from Oia were absolutely breathtaking...",
                sender: "507f1f77bcf86cd799439011",
                image: "/public/1709123456789.jpg",
                likes: ["507f1f77bcf86cd799439021"],
                createdAt: "2026-03-01T10:20:00.000Z",
                updatedAt: "2026-03-01T10:20:00.000Z",
                __v: 0,
              },
            ],
            nextCursor: "507f1f77bcf86cd799439012",
          },
        },
        LikeToggleResponse: {
          type: "object",
          properties: {
            likesCount: {
              type: "number",
              description: "Total number of likes after the toggle",
              example: 5,
            },
            isLikedByUser: {
              type: "boolean",
              description: "Whether the requesting user now likes the post",
              example: true,
            },
          },
          example: {
            likesCount: 5,
            isLikedByUser: true,
          },
        },
        FileUploadResponse: {
          type: "object",
          properties: {
            url: {
              type: "string",
              description: "Public URL to access the uploaded file",
              example: "/public/1709123456789.jpg",
            },
          },
          example: {
            url: "/public/1709123456789.jpg",
          },
        },
        Comment: {
          type: "object",
          properties: {
            _id: {
              type: "string",
              description: "Comment ID",
              example: "507f1f77bcf86cd799439013",
            },
            postId: {
              type: "string",
              description: "ID of the post this comment belongs to",
              example: "507f1f77bcf86cd799439012",
            },
            content: {
              type: "string",
              description: "Comment content",
              example: "What a gorgeous view!",
            },
            author: {
              type: "string",
              description: "User ID of the comment author",
              example: "507f1f77bcf86cd799439011",
            },
            createdAt: {
              type: "string",
              format: "date-time",
              description: "Comment creation timestamp",
            },
            __v: {
              type: "number",
              description: "Version key",
              example: 0,
            },
          },
          example: {
            _id: "507f1f77bcf86cd799439013",
            postId: "507f1f77bcf86cd799439012",
            content: "What a gorgeous view!",
            author: "507f1f77bcf86cd799439011",
            createdAt: "2026-03-01T11:00:00.000Z",
            __v: 0,
          },
        },
        RegisterRequest: {
          type: "object",
          required: ["username", "email", "password"],
          properties: {
            username: {
              type: "string",
              description: "Unique username",
              example: "johndoe",
            },
            email: {
              type: "string",
              format: "email",
              description: "User email address",
              example: "john@example.com",
            },
            password: {
              type: "string",
              format: "password",
              description: "User password (will be hashed)",
              example: "SecurePass123!",
            },
            profilePicture: {
              type: "string",
              description: "URL to profile picture (optional)",
              example: "/public/1709123456789.jpg",
            },
          },
          example: {
            username: "johndoe",
            email: "john@example.com",
            password: "SecurePass123!",
            profilePicture: "/public/1709123456789.jpg",
          },
        },
        LoginRequest: {
          type: "object",
          required: ["email", "password"],
          properties: {
            email: {
              type: "string",
              format: "email",
              description: "User email address",
              example: "john@example.com",
            },
            password: {
              type: "string",
              format: "password",
              description: "User password",
              example: "SecurePass123!",
            },
          },
          example: {
            email: "john@example.com",
            password: "SecurePass123!",
          },
        },
        GoogleLoginRequest: {
          type: "object",
          required: ["credential"],
          properties: {
            credential: {
              type: "string",
              description:
                "Google ID token obtained from the Google Sign-In / One Tap button",
              example: "eyJhbGciOiJSUzI1NiIs...",
            },
          },
          example: {
            credential: "eyJhbGciOiJSUzI1NiIs...",
          },
        },
        AuthResponse: {
          type: "object",
          properties: {
            _id: {
              type: "string",
              description: "User ID",
              example: "507f1f77bcf86cd799439011",
            },
            username: {
              type: "string",
              description: "Username",
              example: "johndoe",
            },
            email: {
              type: "string",
              format: "email",
              description: "User email",
              example: "john@example.com",
            },
            profilePicture: {
              type: "string",
              nullable: true,
              description:
                "Profile picture URL (populated for Google OAuth users)",
              example: "/public/1709123456789.jpg",
            },
            token: {
              type: "string",
              description:
                "JWT access token (expires in 5 seconds for testing)",
              example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
            },
            refreshToken: {
              type: "string",
              description: "JWT refresh token (expires in 7 days)",
              example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
            },
          },
          example: {
            _id: "507f1f77bcf86cd799439011",
            username: "johndoe",
            email: "john@example.com",
            profilePicture: "/public/1709123456789.jpg",
            token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
            refreshToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
          },
        },
        TokenRefreshRequest: {
          type: "object",
          required: ["refreshToken"],
          properties: {
            refreshToken: {
              type: "string",
              description: "Valid refresh token",
              example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
            },
          },
          example: {
            refreshToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
          },
        },
        TokenRefreshResponse: {
          type: "object",
          properties: {
            token: {
              type: "string",
              description: "New JWT access token",
              example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
            },
            refreshToken: {
              type: "string",
              description: "New JWT refresh token",
              example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
            },
          },
          example: {
            token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
            refreshToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
          },
        },
        LogoutRequest: {
          type: "object",
          required: ["refreshToken"],
          properties: {
            refreshToken: {
              type: "string",
              description: "Refresh token to invalidate",
              example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
            },
          },
          example: {
            refreshToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
          },
        },
        CreatePostRequest: {
          type: "object",
          required: ["title", "content"],
          properties: {
            title: {
              type: "string",
              description: "Post title",
              example: "Sunset in Santorini",
            },
            content: {
              type: "string",
              description: "Post content / travel story",
              example: "The views from Oia were absolutely breathtaking...",
            },
            image: {
              type: "string",
              description: "URL to uploaded travel photo (from POST /file)",
              example: "/public/1709123456789.jpg",
            },
          },
          example: {
            title: "Sunset in Santorini",
            content: "The views from Oia were absolutely breathtaking...",
            image: "/public/1709123456789.jpg",
          },
        },
        UpdateUserRequest: {
          type: "object",
          properties: {
            username: {
              type: "string",
              description: "Updated username",
              example: "johndoe_updated",
            },
            email: {
              type: "string",
              format: "email",
              description: "Updated email address",
              example: "john.updated@example.com",
            },
            profilePicture: {
              type: "string",
              description: "Updated profile picture URL",
              example: "/public/1709123456789.jpg",
            },
          },
          example: {
            username: "johndoe_updated",
            email: "john.updated@example.com",
            profilePicture: "/public/1709123456789.jpg",
          },
        },
        CreateCommentRequest: {
          type: "object",
          required: ["postId", "content"],
          properties: {
            postId: {
              type: "string",
              description: "ID of the post to comment on",
              example: "507f1f77bcf86cd799439012",
            },
            content: {
              type: "string",
              description: "Comment content",
              example: "What a gorgeous view!",
            },
          },
          example: {
            postId: "507f1f77bcf86cd799439012",
            content: "What a gorgeous view!",
          },
        },
        UpdateCommentRequest: {
          type: "object",
          required: ["content"],
          properties: {
            content: {
              type: "string",
              description: "Updated comment content",
              example: "Updated comment text",
            },
          },
          example: {
            content: "Updated comment text",
          },
        },
        ErrorResponse: {
          type: "object",
          properties: {
            message: {
              type: "string",
              description: "Error message",
              example: "An error occurred",
            },
            error: {
              type: "string",
              description: "Detailed error information",
              example: "Detailed error description",
            },
          },
          example: {
            message: "An error occurred",
            error: "Detailed error description",
          },
        },
        AskAIRequest: {
          type: "object",
          required: ["question"],
          properties: {
            question: {
              type: "string",
              description:
                "Travel-related question to ask the AI assistant (3-500 characters)",
              example: "What are the best places to visit in Greece?",
            },
          },
          example: {
            question: "What are the best places to visit in Greece?",
          },
        },
        AskAISource: {
          type: "object",
          properties: {
            postId: {
              type: "string",
              description: "ID of the source post",
              example: "507f1f77bcf86cd799439012",
            },
            title: {
              type: "string",
              description: "Title of the source post",
              example: "Sunset in Santorini",
            },
          },
          example: {
            postId: "507f1f77bcf86cd799439012",
            title: "Sunset in Santorini",
          },
        },
        AskAIResponse: {
          type: "object",
          properties: {
            answer: {
              type: "string",
              description: "AI-generated answer based on travel post content",
              example:
                "Based on posts from TravelTales users, Greece offers many amazing destinations...",
            },
            sources: {
              type: "array",
              description: "Travel posts used as context for the answer",
              items: {
                $ref: "#/components/schemas/AskAISource",
              },
            },
          },
          example: {
            answer:
              "Based on posts from TravelTales users, Santorini and Crete are highly recommended for both scenery and beaches.",
            sources: [
              {
                postId: "507f1f77bcf86cd799439012",
                title: "Sunset in Santorini",
              },
            ],
          },
        },
      },
      responses: {
        BadRequest: {
          description: "Bad Request - Invalid input or missing required fields",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/ErrorResponse",
              },
              example: {
                message: "Missing required fields",
              },
            },
          },
        },
        Unauthorized: {
          description: "Unauthorized - Invalid or missing authentication token",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/ErrorResponse",
              },
              example: {
                message: "Invalid or expired token",
              },
            },
          },
        },
        NotFound: {
          description: "Not Found - The requested resource does not exist",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/ErrorResponse",
              },
              example: {
                message: "Resource not found",
              },
            },
          },
        },
        InternalServerError: {
          description: "Internal Server Error",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/ErrorResponse",
              },
              example: {
                message: "Internal server error",
                error: "Error details",
              },
            },
          },
        },
      },
    },
    tags: [
      {
        name: "Auth",
        description: "Authentication — password-based and Google OAuth",
      },
      {
        name: "Users",
        description: "User profile management",
      },
      {
        name: "Posts",
        description:
          "Travel journal posts — create, read, update, delete, like, paginate",
      },
      {
        name: "Comments",
        description: "Comments on travel posts",
      },
      {
        name: "Files",
        description: "Image upload — stores files in /public and returns a URL",
      },
      {
        name: "AI",
        description:
          "AI-powered travel assistant — ask questions answered via RAG over all travel posts",
      },
    ],
  },
  apis: ["./src/routes/*.ts"],
};

export const swaggerSpec = swaggerJsdoc(options);
