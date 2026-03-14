import request from "supertest";
import initApp from "../app";
import commentsModel from "../model/commentsModel";
import postsModel from "../model/postsModel";
import userModel from "../model/userModel";
import { Express } from "express";
import {
  UserData,
  getLogedInUser,
  anotherUser,
  postsList,
  nonexistentPost,
  commentsList,
  nonexistentComment,
} from "./utils";

let app: Express;
let loggedInUser: UserData;
let commentId = "";
let postId1 = "";
let postId2 = "";

beforeAll(async () => {
  app = await initApp();
  await commentsModel.deleteMany();
  await postsModel.deleteMany();
  await userModel.deleteMany();
  loggedInUser = await getLogedInUser(app);

  const post1Response = await request(app)
    .post("/posts")
    .set("Authorization", "Bearer " + loggedInUser.token)
    .send(postsList[0]);
  postId1 = post1Response.body._id;

  const post2Response = await request(app)
    .post("/posts")
    .set("Authorization", "Bearer " + loggedInUser.token)
    .send(postsList[1]);
  postId2 = post2Response.body._id;

  commentsList[0].postId = postId1;
  commentsList[1].postId = postId1;
  commentsList[2].postId = postId2;

  const response = await request(app).post("/auth/register").send(anotherUser);
  anotherUser.token = response.body.token;
});

afterAll((done) => {
  done();
});

describe("Comments API Tests", () => {
  // Validates required query/body fields and auth checks before CRUD flow.
  test("Get comments without postId parameter returns 400", async () => {
    const response = await request(app).get("/comments");
    expect(response.status).toBe(400);
  });

  test("Create comment without postId returns 400", async () => {
    const response = await request(app)
      .post("/comments")
      .set("Authorization", "Bearer " + loggedInUser.token)
      .send({ content: "A comment with no postId" });
    expect(response.status).toBe(400);
  });

  test("Create comment without content returns 400", async () => {
    const response = await request(app)
      .post("/comments")
      .set("Authorization", "Bearer " + loggedInUser.token)
      .send({ postId: postId1 });
    expect(response.status).toBe(400);
  });

  test("Create Comment Unauthorized fails", async () => {
    const response = await request(app).post("/comments").send(commentsList[0]);
    expect(response.status).toBe(401);
  });

  test("Create Comment", async () => {
    for (const comment of commentsList) {
      const response = await request(app)
        .post("/comments")
        .set("Authorization", "Bearer " + loggedInUser.token)
        .send(comment);
      expect(response.status).toBe(201);
      expect(response.body.postId).toBe(comment.postId);
      expect(
        typeof response.body.author === "string"
          ? response.body.author
          : response.body.author._id,
      ).toBe(loggedInUser._id);
      expect(response.body.content).toBe(comment.content);
    }
  });

  // Covers read endpoints by post and by comment ID.
  test("Get Comments by Non-existent Post ID returns empty", async () => {
    const response = await request(app).get(
      "/comments" + "?postId=" + nonexistentPost._id,
    );
    expect(response.status).toBe(200);
    expect(response.body.length).toBe(0);
  });

  test("Get Comment by Post ID", async () => {
    const response = await request(app).get("/comments" + "?postId=" + postId1);
    expect(response.status).toBe(200);
    const expectedCount = commentsList.filter(
      (c) => c.postId === postId1,
    ).length;
    expect(response.body.length).toBe(expectedCount);
    commentId = response.body[0]._id; // Save the ID of the first comment for later tests
  });

  test("Get Non-existent Comment by ID fails", async () => {
    const response = await request(app).get(
      "/comments/" + nonexistentComment._id,
    );
    expect(response.status).toBe(404);
  });

  test("Get Comment by ID", async () => {
    const response = await request(app).get("/comments/" + commentId);
    expect(response.status).toBe(200);
    expect(response.body.postId).toBe(postId1);
    expect(response.body.author.toString()).toBe(loggedInUser._id);
    expect(response.body.content).toBe(commentsList[0].content);
    expect(response.body._id).toBe(commentId);
  });

  // Covers update authorization, not-found handling, and successful edits.
  test("Update Comment Unauthorized fails", async () => {
    const response = await request(app)
      .put("/comments/" + commentId)
      .send({ content: "Unauthorized Update" });
    expect(response.status).toBe(401);
  });

  test("Update Non-existent Comment fails", async () => {
    const response = await request(app)
      .put("/comments/" + nonexistentComment._id)
      .set("Authorization", "Bearer " + loggedInUser.token)
      .send({ content: "Update Non-existent" });
    expect(response.status).toBe(404);
  });

  test("Update another User's Comment fails", async () => {
    const updateResponse = await request(app)
      .put("/comments/" + commentId)
      .set("Authorization", "Bearer " + anotherUser.token)
      .send({ content: "Unauthorized Update by Another User" });
    expect(updateResponse.status).toBe(403);
  });

  test("Update Comment", async () => {
    const updatedComment = {
      content: "Updated Content",
    };
    const response = await request(app)
      .put("/comments/" + commentId)
      .set("Authorization", "Bearer " + loggedInUser.token)
      .send(updatedComment);
    expect(response.status).toBe(200);
    expect(response.body.content).toBe(updatedComment.content);

    const getResponse = await request(app)
      .get("/comments/" + commentId)
      .set("Authorization", "Bearer " + loggedInUser.token);
    expect(getResponse.status).toBe(200);
    expect(getResponse.body.content).toBe(updatedComment.content);
  });

  // Covers delete authorization, not-found handling, and successful deletion.
  test("Delete Comment Unauthorized fails", async () => {
    const response = await request(app).delete("/comments/" + commentId);
    expect(response.status).toBe(401);
  });

  test("Delete Non-existent Comment fails", async () => {
    const response = await request(app)
      .delete("/comments/" + nonexistentComment._id)
      .set("Authorization", "Bearer " + loggedInUser.token);
    expect(response.status).toBe(404);
  });

  test("Delete another User's Comment fails", async () => {
    const deleteResponse = await request(app)
      .delete("/comments/" + commentId)
      .set("Authorization", "Bearer " + anotherUser.token);
    expect(deleteResponse.status).toBe(403);
  });

  test("Delete Comment", async () => {
    const response = await request(app)
      .delete("/comments/" + commentId)
      .set("Authorization", "Bearer " + loggedInUser.token);
    expect(response.status).toBe(200);
    expect(response.body._id).toBe(commentId);

    const getResponse = await request(app)
      .get("/comments/" + commentId)
      .set("Authorization", "Bearer " + loggedInUser.token);
    expect(getResponse.status).toBe(404);
  });
});
