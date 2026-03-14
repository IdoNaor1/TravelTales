import request from "supertest";
import initApp from "../app";
import { Express } from "express";
import User from "../model/userModel";
import { testUser, anotherUser, postsList } from "./utils";
import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";

jest.mock("google-auth-library", () => ({
  OAuth2Client: jest.fn(),
}));

let app: Express;

beforeAll(async () => {
  app = await initApp();
  await User.deleteMany();
});

afterAll((done) => {
  done();
});

describe("Authentication API Tests", () => {
  // Verifies that protected endpoints reject unauthenticated requests.
  describe("Authorization on Protected Routes", () => {
    test("Posting a post without token fails", async () => {
      const postData = postsList[0];
      const response = await request(app).post("/posts").send(postData);
      expect(response.status).toBe(401);
    });
  });

  // Covers input validation and duplicate protection in registration flow.
  describe("Registration", () => {
    test("Registering without required fields fails", async () => {
      // Test without username
      const response1 = await request(app)
        .post("/auth/register")
        .send({ email: testUser.email, password: testUser.password });
      expect(response1.status).toBe(400);

      // Test without email
      const response2 = await request(app)
        .post("/auth/register")
        .send({ username: testUser.username, password: testUser.password });
      expect(response2.status).toBe(400);

      // Test without password
      const response3 = await request(app)
        .post("/auth/register")
        .send({ email: testUser.email, username: testUser.username });
      expect(response3.status).toBe(400);
    });

    test("Successful registration returns access and refresh tokens", async () => {
      const response = await request(app).post("/auth/register").send(testUser);
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty("token");
      expect(response.body).toHaveProperty("refreshToken");
      testUser.token = response.body.token;
      testUser.refreshToken = response.body.refreshToken;
      testUser._id = response.body._id;
    });

    test("Registering with duplicate email or username fails", async () => {
      // Test with same email but different username
      const response1 = await request(app).post("/auth/register").send({
        username: "newuser",
        email: testUser.email,
        password: testUser.password,
      });
      expect(response1.status).toBe(409);

      // Test with same username but different email
      const response2 = await request(app).post("/auth/register").send({
        username: testUser.username,
        email: "newemail@example.com",
        password: testUser.password,
      });
      expect(response2.status).toBe(409);
    });
  });

  // Validates login input, credential checks, and successful token issuance.
  describe("Login", () => {
    test("Login without required fields fails", async () => {
      // Test without email
      const response1 = await request(app)
        .post("/auth/login")
        .send({ password: testUser.password });
      expect(response1.status).toBe(400);

      // Test without password
      const response2 = await request(app)
        .post("/auth/login")
        .send({ email: testUser.email });
      expect(response2.status).toBe(400);
    });

    test("Login with wrong credentials fails", async () => {
      // Test with wrong email
      const response1 = await request(app)
        .post("/auth/login")
        .send({ email: "wrongemail@example.com", password: testUser.password });
      expect(response1.status).toBe(401);

      // Test with wrong password
      const response2 = await request(app)
        .post("/auth/login")
        .send({ email: testUser.email, password: "wrongpassword" });
      expect(response2.status).toBe(401);
    });

    test("Successful login returns fresh tokens", async () => {
      const response = await request(app)
        .post("/auth/login")
        .send({ email: testUser.email, password: testUser.password });
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("token");
      expect(response.body).toHaveProperty("refreshToken");
      testUser.token = response.body.token;
      testUser.refreshToken = response.body.refreshToken;
    });
  });

  // Ensures access token behavior for valid and tampered JWTs.
  describe("Access Token Usage", () => {
    test("Posting a post with token succeeds", async () => {
      const postData = postsList[0];
      const response = await request(app)
        .post("/posts")
        .set("Authorization", "Bearer " + testUser.token)
        .send(postData);
      expect(response.status).toBe(201);
    });

    test("Posting a post with compromised token fails", async () => {
      const postData = postsList[0];
      const compromizedToken = testUser.token + "a";
      const response = await request(app)
        .post("/posts")
        .set("Authorization", "Bearer " + compromizedToken)
        .send(postData);
      expect(response.status).toBe(401);
    });
  });

  // Covers refresh token validation, rotation, and one-time-use constraints.
  describe("Refresh Token Flow", () => {
    test("Refresh flow issues new tokens and allows authenticated requests", async () => {
      const previousAccessToken = testUser.token;
      const postData = postsList[0];

      const refreshResponse = await request(app)
        .post("/auth/refresh")
        .send({ refreshToken: testUser.refreshToken });
      expect(refreshResponse.status).toBe(200);
      expect(refreshResponse.body).toHaveProperty("token");
      expect(refreshResponse.body).toHaveProperty("refreshToken");
      expect(refreshResponse.body.token).not.toBe(previousAccessToken);

      testUser.token = refreshResponse.body.token;
      testUser.refreshToken = refreshResponse.body.refreshToken;

      const postResponse = await request(app)
        .post("/posts")
        .set("Authorization", "Bearer " + testUser.token)
        .send(postData);
      expect(postResponse.status).toBe(201);
    });

    test("Refresh without refresh token fails", async () => {
      const response = await request(app).post("/auth/refresh").send({});
      expect(response.status).toBe(400);
    });

    test("Refresh with invalid refresh token fails", async () => {
      const response = await request(app)
        .post("/auth/refresh")
        .send({ refreshToken: "invalid.token.here" });
      expect(response.status).toBe(401);
    });

    test("Refresh returns new access and refresh tokens", async () => {
      const registerResponse = await request(app).post("/auth/register").send({
        username: "refreshtest",
        email: "refreshtest@example.com",
        password: "password123",
      });
      expect(registerResponse.status).toBe(201);
      const originalRefreshToken = registerResponse.body.refreshToken;
      const originalToken = registerResponse.body.token;

      const refreshResponse = await request(app)
        .post("/auth/refresh")
        .send({ refreshToken: originalRefreshToken });
      expect(refreshResponse.status).toBe(200);
      expect(refreshResponse.body).toHaveProperty("token");
      expect(refreshResponse.body).toHaveProperty("refreshToken");
      expect(refreshResponse.body.token).not.toBe(originalToken);
      expect(refreshResponse.body.refreshToken).not.toBe(originalRefreshToken);
    });

    test("New token from refresh can be used for requests", async () => {
      const registerResponse = await request(app).post("/auth/register").send({
        username: "refreshusetest",
        email: "refreshusetest@example.com",
        password: "password123",
      });
      expect(registerResponse.status).toBe(201);
      const refreshToken = registerResponse.body.refreshToken;

      const refreshResponse = await request(app)
        .post("/auth/refresh")
        .send({ refreshToken });
      expect(refreshResponse.status).toBe(200);
      const newToken = refreshResponse.body.token;

      const postData = postsList[1];
      const postResponse = await request(app)
        .post("/posts")
        .set("Authorization", "Bearer " + newToken)
        .send(postData);
      expect(postResponse.status).toBe(201);
    });

    test("Double use of refresh token fails", async () => {
      const refreshResponse1 = await request(app)
        .post("/auth/refresh")
        .send({ refreshToken: testUser.refreshToken });
      expect(refreshResponse1.status).toBe(200);
      expect(refreshResponse1.body).toHaveProperty("token");
      const newRefreshToken = refreshResponse1.body.refreshToken;

      const refreshResponse2 = await request(app)
        .post("/auth/refresh")
        .send({ refreshToken: testUser.refreshToken });
      expect(refreshResponse2.status).toBe(401);

      const refreshResponse3 = await request(app)
        .post("/auth/refresh")
        .send({ refreshToken: newRefreshToken });
      expect(refreshResponse3.status).toBe(401);
    });

    test("Refresh with valid token for non-existent user returns 401", async () => {
      const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;
      expect(jwtRefreshSecret).toBeDefined();

      const nonExistingRefreshToken = jwt.sign(
        { _id: "000000000000000000000000", jti: "edge-jti-refresh" },
        jwtRefreshSecret as string,
        { expiresIn: "1h" },
      );

      const response = await request(app)
        .post("/auth/refresh")
        .send({ refreshToken: nonExistingRefreshToken });
      expect(response.status).toBe(401);
      expect(response.body.message).toBe("Invalid refresh token");
    });

    test("Refresh returns 500 when JWT refresh secret is missing", async () => {
      const originalSecret = process.env.JWT_REFRESH_SECRET;
      delete process.env.JWT_REFRESH_SECRET;

      try {
        const response = await request(app)
          .post("/auth/refresh")
          .send({ refreshToken: "any.token.value" });
        expect(response.status).toBe(500);
      } finally {
        process.env.JWT_REFRESH_SECRET = originalSecret;
      }
    });
  });

  // Verifies logout validation and invalidation of the supplied refresh token.
  describe("Logout", () => {
    test("Logout without refresh token fails", async () => {
      const response = await request(app).post("/auth/logout").send({});
      expect(response.status).toBe(400);
    });

    test("Logout with invalid refresh token fails", async () => {
      const response = await request(app)
        .post("/auth/logout")
        .send({ refreshToken: "invalid.token.here" });
      expect(response.status).toBe(401);
    });

    test("Logout invalidates refresh token", async () => {
      const registerResponse = await request(app)
        .post("/auth/register")
        .send(anotherUser);
      expect(registerResponse.status).toBe(201);
      const refreshToken = registerResponse.body.refreshToken;

      const logoutResponse = await request(app)
        .post("/auth/logout")
        .send({ refreshToken: refreshToken });
      expect(logoutResponse.status).toBe(200);
      expect(logoutResponse.body).toHaveProperty(
        "message",
        "Logged out successfully",
      );

      const refreshResponse = await request(app)
        .post("/auth/refresh")
        .send({ refreshToken: refreshToken });
      expect(refreshResponse.status).toBe(401);
    });

    test("Logout with valid token for non-existent user returns 401", async () => {
      const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;
      expect(jwtRefreshSecret).toBeDefined();

      const nonExistingRefreshToken = jwt.sign(
        { _id: "000000000000000000000000", jti: "edge-jti-logout" },
        jwtRefreshSecret as string,
        { expiresIn: "1h" },
      );

      const response = await request(app)
        .post("/auth/logout")
        .send({ refreshToken: nonExistingRefreshToken });
      expect(response.status).toBe(401);
      expect(response.body.message).toBe("User not found");
    });

    test("Logout returns 500 when JWT refresh secret is missing", async () => {
      const originalSecret = process.env.JWT_REFRESH_SECRET;
      delete process.env.JWT_REFRESH_SECRET;

      try {
        const response = await request(app)
          .post("/auth/logout")
          .send({ refreshToken: "any.token.value" });
        expect(response.status).toBe(500);
      } finally {
        process.env.JWT_REFRESH_SECRET = originalSecret;
      }
    });
  });
});

describe("Google OAuth Tests", () => {
  const mockVerifyIdToken = jest.fn();

  beforeEach(() => {
    mockVerifyIdToken.mockReset();
    (OAuth2Client as unknown as jest.Mock).mockImplementation(() => ({
      verifyIdToken: mockVerifyIdToken,
    }));
  });

  test("Missing credential returns 400", async () => {
    const response = await request(app).post("/auth/google").send({});
    expect(response.status).toBe(400);
  });

  test("Missing Google client ID returns 500", async () => {
    const originalClientId = process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_ID;

    try {
      const response = await request(app)
        .post("/auth/google")
        .send({ credential: "valid-looking-token" });
      expect(response.status).toBe(500);
    } finally {
      process.env.GOOGLE_CLIENT_ID = originalClientId;
    }
  });

  test("Invalid Google token returns 500", async () => {
    mockVerifyIdToken.mockRejectedValue(new Error("Token verification failed"));
    const response = await request(app)
      .post("/auth/google")
      .send({ credential: "invalid-token" });
    expect(response.status).toBe(500);
  });

  test("Google token with null payload returns 401", async () => {
    mockVerifyIdToken.mockResolvedValue({ getPayload: () => null });
    const response = await request(app)
      .post("/auth/google")
      .send({ credential: "token-no-payload" });
    expect(response.status).toBe(401);
  });

  test("Valid Google token creates new user and returns tokens", async () => {
    mockVerifyIdToken.mockResolvedValue({
      getPayload: () => ({
        email: "googleuser@gmail.com",
        name: "Google User",
        picture: "https://example.com/photo.jpg",
      }),
    });
    const response = await request(app)
      .post("/auth/google")
      .send({ credential: "valid-google-token" });
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("token");
    expect(response.body).toHaveProperty("refreshToken");
    expect(response.body).toHaveProperty("_id");
    expect(response.body.email).toBe("googleuser@gmail.com");
    expect(response.body.profilePicture).toBe("https://example.com/photo.jpg");
  });

  test("Valid Google token for existing user logs them in", async () => {
    mockVerifyIdToken.mockResolvedValue({
      getPayload: () => ({
        email: "googleuser@gmail.com",
        name: "Google User",
        picture: "https://example.com/photo.jpg",
      }),
    });
    // Same email as previous test — should find existing user, not create new
    const response = await request(app)
      .post("/auth/google")
      .send({ credential: "valid-google-token" });
    expect(response.status).toBe(200);
    expect(response.body.email).toBe("googleuser@gmail.com");
    expect(response.body).toHaveProperty("token");
  });
});
