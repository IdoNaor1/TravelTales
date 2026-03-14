import request from "supertest";
import initApp from "../app";
import { Express } from "express";
import User from "../model/userModel";
import { usersList, UserData, getLogedInUser, nonexistentUser } from "./utils";

let app: Express;
let loggedInUser: UserData;
let userId = "";

beforeAll(async () => {
  app = await initApp();
  await User.deleteMany();
});

afterAll((done) => done());

describe("Users API tests", () => {
  // Covers baseline user CRUD flow and current-user endpoint behavior.
  test("Get Current User fails", async () => {
    const response = await request(app).get("/users/me");
    expect(response.status).toBe(401);
  });

  test("Create User", async () => {
    for (const user of usersList) {
      const response = await request(app).post("/auth/register").send({
        username: user.username,
        email: user.email,
        password: user.password,
      });
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty("_id");
      expect(response.body).toHaveProperty("token");
      expect(response.body).toHaveProperty("refreshToken");
      expect(response.body.username).toBe(user.username);
      expect(response.body.email).toBe(user.email);
    }
  });

  test("Get all Users", async () => {
    const response = await request(app).get("/users");
    expect(response.status).toBe(200);
    expect(response.body.length).toBe(usersList.length);
    userId = response.body[0]._id;
  });

  test("Get User by ID", async () => {
    const response = await request(app).get("/users/" + userId);
    expect(response.status).toBe(200);
    expect(response.body._id).toBe(userId);
    expect(response.body.username).toBe(usersList[0].username);
    expect(response.body.email).toBe(usersList[0].email);
  });

  test("Get Current User", async () => {
    loggedInUser = await getLogedInUser(app);
    const response = await request(app)
      .get("/users/me")
      .set("Authorization", "Bearer " + loggedInUser.token);
    expect(response.status).toBe(200);
    expect(response.body._id).toBe(loggedInUser._id);
    expect(response.body.username).toBe(loggedInUser.username);
    expect(response.body.email).toBe(loggedInUser.email);
  });

  test("Update Current User", async () => {
    const response = await request(app)
      .put("/users/" + loggedInUser._id)
      .set("Authorization", "Bearer " + loggedInUser.token)
      .send({ username: "new-username", email: "new-email@example.com" });
    expect(response.status).toBe(200);
    expect(response.body.username).toBe("new-username");
    expect(response.body.email).toBe("new-email@example.com");
  });

  test("Update another/non-self user ID returns 403", async () => {
    const response = await request(app)
      .put("/users/" + nonexistentUser._id)
      .set("Authorization", "Bearer " + loggedInUser.token)
      .send({
        username: nonexistentUser.username,
        email: nonexistentUser.email,
      });
    expect(response.status).toBe(403);
  });

  test("Delete Non-Existent User Fails", async () => {
    const response = await request(app)
      .delete("/users/" + nonexistentUser._id)
      .set("Authorization", "Bearer " + loggedInUser.token);
    expect(response.status).toBe(404);
  });

  test("Delete My User", async () => {
    const response = await request(app)
      .delete("/users/" + loggedInUser._id)
      .set("Authorization", "Bearer " + loggedInUser.token);
    expect(response.status).toBe(200);

    const getResponse = await request(app)
      .get("/users/" + loggedInUser._id)
      .set("Authorization", "Bearer " + loggedInUser.token);
    expect(getResponse.status).toBe(404);
  });
});

describe("Users - Edge Cases", () => {
  // Covers authorization boundaries and uniqueness constraints on update.
  type EdgeUser = {
    _id: string;
    token: string;
    username: string;
    email: string;
  };
  let userA: EdgeUser;
  let userB: EdgeUser;

  beforeAll(async () => {
    const respA = await request(app).post("/auth/register").send({
      username: "edgeusera",
      email: "edgeusera@example.com",
      password: "password123",
    });
    userA = {
      _id: respA.body._id,
      token: respA.body.token,
      username: "edgeusera",
      email: "edgeusera@example.com",
    };

    const respB = await request(app).post("/auth/register").send({
      username: "edgeuserb",
      email: "edgeuserb@example.com",
      password: "password123",
    });
    userB = {
      _id: respB.body._id,
      token: respB.body.token,
      username: "edgeuserb",
      email: "edgeuserb@example.com",
    };
  });

  test("Get user by non-existent ID returns 404", async () => {
    const response = await request(app).get("/users/000000000000000000000000");
    expect(response.status).toBe(404);
  });

  test("Update user without auth token returns 401", async () => {
    const response = await request(app)
      .put("/users/" + userA._id)
      .send({ username: "hacker" });
    expect(response.status).toBe(401);
  });

  test("Update another user's profile returns 403", async () => {
    // userA tries to update userB's profile
    const response = await request(app)
      .put("/users/" + userB._id)
      .set("Authorization", "Bearer " + userA.token)
      .send({ username: "stolen" });
    expect(response.status).toBe(403);
  });

  test("Update user with a username already taken by another user returns 409", async () => {
    // userA tries to take userB's username
    const response = await request(app)
      .put("/users/" + userA._id)
      .set("Authorization", "Bearer " + userA.token)
      .send({ username: userB.username });
    expect(response.status).toBe(409);
  });

  test("Update user with an email already used by another user returns 409", async () => {
    // userA tries to take userB's email
    const response = await request(app)
      .put("/users/" + userA._id)
      .set("Authorization", "Bearer " + userA.token)
      .send({ email: userB.email });
    expect(response.status).toBe(409);
  });

  test("Update user profile picture returns 200 with the new picture URL", async () => {
    const newPicture = "/public/avatar-updated.jpg";
    const response = await request(app)
      .put("/users/" + userA._id)
      .set("Authorization", "Bearer " + userA.token)
      .send({ profilePicture: newPicture });
    expect(response.status).toBe(200);
    expect(response.body.profilePicture).toBe(newPicture);
  });

  test("Update handles DB duplicate username race with 409", async () => {
    const raceError = { code: 11000, keyPattern: { username: 1 } };
    const spy = jest.spyOn(User, "findByIdAndUpdate").mockReturnValueOnce({
      select: jest.fn().mockRejectedValueOnce(raceError),
    } as never);

    const response = await request(app)
      .put("/users/" + userA._id)
      .set("Authorization", "Bearer " + userA.token)
      .send({ username: "edge_race_username" });

    expect(response.status).toBe(409);
    expect(response.body.message).toBe("Username is already taken");
    spy.mockRestore();
  });

  test("Update handles DB duplicate email race with 409", async () => {
    const raceError = { code: 11000, keyPattern: { email: 1 } };
    const spy = jest.spyOn(User, "findByIdAndUpdate").mockReturnValueOnce({
      select: jest.fn().mockRejectedValueOnce(raceError),
    } as never);

    const response = await request(app)
      .put("/users/" + userA._id)
      .set("Authorization", "Bearer " + userA.token)
      .send({ email: "edge.race@example.com" });

    expect(response.status).toBe(409);
    expect(response.body.message).toBe("Email is already registered");
    spy.mockRestore();
  });

  test("Update handles generic DB duplicate race with 409", async () => {
    const raceError = { code: 11000, keyPattern: { other: 1 } };
    const spy = jest.spyOn(User, "findByIdAndUpdate").mockReturnValueOnce({
      select: jest.fn().mockRejectedValueOnce(raceError),
    } as never);

    const response = await request(app)
      .put("/users/" + userA._id)
      .set("Authorization", "Bearer " + userA.token)
      .send({ username: "edge_race_generic" });

    expect(response.status).toBe(409);
    expect(response.body.message).toBe("User already exists");
    spy.mockRestore();
  });

  test("Get current user returns 404 when token belongs to deleted user", async () => {
    const deleteResponse = await request(app)
      .delete("/users/" + userA._id)
      .set("Authorization", "Bearer " + userA.token);
    expect(deleteResponse.status).toBe(200);

    const meResponse = await request(app)
      .get("/users/me")
      .set("Authorization", "Bearer " + userA.token);
    expect(meResponse.status).toBe(404);
  });
});
