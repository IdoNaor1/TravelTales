import request from "supertest";
import initApp from "../app";
import postsModel from "../model/postsModel";
import { Express } from "express";
import {postsList, UserData, PostsData, getLogedInUser, createOtherUserPost} from "./utils";

let app: Express;
let postId = "";
let loggedInUser: UserData;
let otherUserPost: PostsData;

beforeAll(async () => {
  app = await initApp();
  await postsModel.deleteMany();
  loggedInUser = await getLogedInUser(app);
});

afterAll((done) => {
  done();
});

describe("Posts API Tests", () => {
  test("Sample Test Case", async () => {
    const response = await request(app).get("/posts");
    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  test("Create Post Unauthorized Fails", async () => {
    const post = postsList[0];
    const response = await request(app).post("/posts").send(post);
    expect(response.status).toBe(401);
  });

  test("Create Post", async () => {
    let index = 0;
    for (const post of postsList) {
      if (index === 1) {
        otherUserPost = await createOtherUserPost(app);
        index++;
        continue;
      }
      const response = await request(app)
        .post("/posts")
        .set("Authorization", "Bearer " + loggedInUser.token)
        .send(post);
      expect(response.status).toBe(201);
      expect(response.body.title).toBe(post.title);
      expect(response.body.content).toBe(post.content);
      index++;
    }
  });

  test("Get All Posts", async () => {
    const response = await request(app).get("/posts");
    expect(response.status).toBe(200);
    expect(response.body.length).toBe(postsList.length);
    postId = response.body[0]._id; // Save the ID of the first post for later tests
  });

  test("Get Post by ID", async () => {
    const response = await request(app).get("/posts/" + postId);
    expect(response.status).toBe(200);
    expect(response.body.title).toBe(postsList[0].title);
    expect(response.body.content).toBe(postsList[0].content);
    expect(response.body._id).toBe(postId);
  });

  test("Get Posts by Sender", async () => {
    const response = await request(app).get(
      "/posts?sender=" + loggedInUser._id
    );
    expect(response.status).toBe(200);
    expect(response.body.length).toBe(postsList.length - 1);
  });

  test("Update Post", async () => {
    const updatedPost = {
      title: "Updated Title",
      content: "Updated Content",
    };
    const response = await request(app)
      .put("/posts/" + postId)
      .set("Authorization", "Bearer " + loggedInUser.token)
      .send(updatedPost);
    expect(response.status).toBe(200);
    expect(response.body.title).toBe(updatedPost.title);
    expect(response.body.content).toBe(updatedPost.content);
  });

  test("Update Non-Existent Post", async () => {
    const updatedPost = {
      title: "Non-Existent Update",
      content: "This should fail",
    };
    const response = await request(app)
      .put("/posts/" + "000000000000000000000000")
      .set("Authorization", "Bearer " + loggedInUser.token)
      .send(updatedPost);
    expect(response.status).toBe(404);
  });

  test("Unauthorized Update Post", async () => {
    const updatedPost = {
      title: "Unauthorized Update",
      content: "This should fail",
    };
    const response = await request(app)
      .put("/posts/" + postId)
      .send(updatedPost);
    expect(response.status).toBe(401);
  });

  test("Update another user's post is forbidden", async () => {
    const response = await request(app)
      .put("/posts/" + otherUserPost._id)
      .set("Authorization", "Bearer " + loggedInUser.token)
      .send({ title: "Hack", content: "Should fail" });
    expect(response.status).toBe(403);
  });

  test("Delete Post", async () => {
    const response = await request(app)
      .delete("/posts/" + postId)
      .set("Authorization", "Bearer " + loggedInUser.token);
    expect(response.status).toBe(200);
    expect(response.body._id).toBe(postId);

    const getResponse = await request(app)
      .get("/posts/" + postId)
      .set("Authorization", "Bearer " + loggedInUser.token);
    expect(getResponse.status).toBe(404);
  });

  test("Unauthorized Delete Post", async () => {
    const response = await request(app).delete("/posts/" + postId);
    expect(response.status).toBe(401);
  });

  test("Delete Non-Existent Post", async () => {
    const response = await request(app)
      .delete("/posts/" + "000000000000000000000000")
      .set("Authorization", "Bearer " + loggedInUser.token);
    expect(response.status).toBe(404);
  });

  test("Delete another user's post is forbidden", async () => {
    const response = await request(app)
      .delete("/posts/" + otherUserPost._id)
      .set("Authorization", "Bearer " + loggedInUser.token);

    expect(response.status).toBe(403);
  });
});
