import request from "supertest";
import initApp from "../app";
import { Express } from "express";
import User from "../model/userModel";
import { testUser, anotherUser, postsList } from "./utils";

let app: Express;

beforeAll(async () => {
  app = await initApp();
  await User.deleteMany();
});

afterAll((done) => {
  done();
});

describe("Authentication API Tests", () => {
  test("Test posting a post without token fails", async () => {
    const postData = postsList[0];
    const response = await request(app).post("/posts").send(postData);
    expect(response.status).toBe(401);
  });

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

  test("Succesful Registration", async () => {
    const response = await request(app).post("/auth/register").send(testUser);
    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty("token");
    testUser.token = response.body.token;
    //check refresh token
    expect(response.body).toHaveProperty("refreshToken");
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
    expect(response1.status).toBe(400);

    // Test with same username but different email
    const response2 = await request(app).post("/auth/register").send({
      username: testUser.username,
      email: "newemail@example.com",
      password: testUser.password,
    });
    expect(response2.status).toBe(400);
  });

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

  test("Succesful Login", async () => {
    const response = await request(app)
      .post("/auth/login")
      .send({ email: testUser.email, password: testUser.password });
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("token");
    expect(response.body).toHaveProperty("refreshToken");
    testUser.token = response.body.token;
    testUser.refreshToken = response.body.refreshToken;
  });

  jest.setTimeout(10000);

  test("Test using token after expiration fails", async () => {
    //sleep for 5 seconds to let the token expire
    await new Promise((r) => setTimeout(r, 5000));
    const postData = postsList[0];
    const response = await request(app)
      .post("/posts")
      .set("Authorization", "Bearer " + testUser.token)
      .send(postData);
    expect(response.status).toBe(401);

    //refresh the token
    const refreshResponse = await request(app)
      .post("/auth/refresh")
      .send({ refreshToken: testUser.refreshToken });
    expect(refreshResponse.status).toBe(200);
    expect(refreshResponse.body).toHaveProperty("token");
    testUser.token = refreshResponse.body.token;
    testUser.refreshToken = refreshResponse.body.refreshToken;

    //try to create post again
    const retryResponse = await request(app)
      .post("/posts")
      .set("Authorization", "Bearer " + testUser.token)
      .send(postData);
    expect(retryResponse.status).toBe(201);
  });

  test("Test refresh without refresh token fails", async () => {
    // Try to refresh without sending a refresh token
    const response = await request(app).post("/auth/refresh").send({});
    expect(response.status).toBe(400);
  });

  test("Test refresh with invalid refresh token fails", async () => {
    // Try to refresh with an invalid token
    const response = await request(app)
      .post("/auth/refresh")
      .send({ refreshToken: "invalid.token.here" });
    expect(response.status).toBe(401);
  });

  test("Test refresh returns new tokens", async () => {
    // Register a user and get tokens
    const registerResponse = await request(app).post("/auth/register").send({
      username: "refreshtest",
      email: "refreshtest@example.com",
      password: "password123",
    });
    expect(registerResponse.status).toBe(201);
    const originalRefreshToken = registerResponse.body.refreshToken;
    const originalToken = registerResponse.body.token;

    // Refresh and verify new tokens are different
    const refreshResponse = await request(app)
      .post("/auth/refresh")
      .send({ refreshToken: originalRefreshToken });
    expect(refreshResponse.status).toBe(200);
    expect(refreshResponse.body).toHaveProperty("token");
    expect(refreshResponse.body).toHaveProperty("refreshToken");
    expect(refreshResponse.body.token).not.toBe(originalToken);
    expect(refreshResponse.body.refreshToken).not.toBe(originalRefreshToken);
  });

  test("Test new token from refresh can be used for requests", async () => {
    // Register a user
    const registerResponse = await request(app).post("/auth/register").send({
      username: "refreshusetest",
      email: "refreshusetest@example.com",
      password: "password123",
    });
    expect(registerResponse.status).toBe(201);
    const refreshToken = registerResponse.body.refreshToken;

    // Refresh token
    const refreshResponse = await request(app)
      .post("/auth/refresh")
      .send({ refreshToken });
    expect(refreshResponse.status).toBe(200);
    const newToken = refreshResponse.body.token;

    // Use the new token to create a post
    const postData = postsList[1];
    const postResponse = await request(app)
      .post("/posts")
      .set("Authorization", "Bearer " + newToken)
      .send(postData);
    expect(postResponse.status).toBe(201);
  });

  //test double use of refresh token fails
  test("Test double use of refresh token fails", async () => {
    //use the current refresh token to get a new token
    const refreshResponse1 = await request(app)
      .post("/auth/refresh")
      .send({ refreshToken: testUser.refreshToken });
    expect(refreshResponse1.status).toBe(200);
    expect(refreshResponse1.body).toHaveProperty("token");
    const newRefreshToken = refreshResponse1.body.refreshToken;

    //try to use the same refresh token again
    const refreshResponse2 = await request(app)
      .post("/auth/refresh")
      .send({ refreshToken: testUser.refreshToken });
    expect(refreshResponse2.status).toBe(401);

    //try to use the new refresh token also fails
    const refreshResponse3 = await request(app)
      .post("/auth/refresh")
      .send({ refreshToken: newRefreshToken });
    expect(refreshResponse3.status).toBe(401);
  });

    test("Test logout without refresh token fails", async () => {
    // Try to logout without providing a refresh token
    const response = await request(app).post("/auth/logout").send({});
    expect(response.status).toBe(400);
  });

  test("Test logout with invalid refresh token fails", async () => {
    // Try to logout with an invalid refresh token
    const response = await request(app)
      .post("/auth/logout")
      .send({ refreshToken: "invalid.token.here" });
    expect(response.status).toBe(401);
  });

  test("Test logout", async () => {
    // Register a new user to get fresh tokens
    const registerResponse = await request(app)
      .post("/auth/register")
      .send(anotherUser);
    expect(registerResponse.status).toBe(201);
    const refreshToken = registerResponse.body.refreshToken;

    // Logout with the refresh token
    const logoutResponse = await request(app)
      .post("/auth/logout")
      .send({ refreshToken: refreshToken });
    expect(logoutResponse.status).toBe(200);
    expect(logoutResponse.body).toHaveProperty(
      "message",
      "Logged out successfully"
    );

    // Try to use the refresh token after logout - should fail
    const refreshResponse = await request(app)
      .post("/auth/refresh")
      .send({ refreshToken: refreshToken });
    expect(refreshResponse.status).toBe(401);
  });
});
