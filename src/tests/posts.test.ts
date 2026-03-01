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
    expect(response.body).toEqual({ posts: [], nextCursor: null });
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
    expect(response.body.posts.length).toBe(postsList.length);
    // Posts are sorted newest-first; take the last (oldest = postsList[0]) for later tests
    postId = response.body.posts[response.body.posts.length - 1]._id;
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
    expect(response.body.posts.length).toBe(postsList.length - 1);
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

describe("Post Image Field", () => {
  let imagePostId: string;

  beforeAll(async () => {
    const refreshResp = await request(app)
      .post("/auth/refresh")
      .send({ refreshToken: loggedInUser.refreshToken });
    if (refreshResp.status === 200) {
      loggedInUser.token = refreshResp.body.token;
      loggedInUser.refreshToken = refreshResp.body.refreshToken;
    }
  });

  test("Create post with image field stores the URL", async () => {
    const response = await request(app)
      .post("/posts")
      .set("Authorization", "Bearer " + loggedInUser.token)
      .send({ title: "Travel to Paris", content: "Amazing trip!", image: "/public/paris.jpg" });
    expect(response.status).toBe(201);
    expect(response.body.image).toBe("/public/paris.jpg");
    imagePostId = response.body._id;
  });

  test("Image field is persisted and returned on GET by ID", async () => {
    const response = await request(app).get("/posts/" + imagePostId);
    expect(response.status).toBe(200);
    expect(response.body.image).toBe("/public/paris.jpg");
  });

  test("Create post without image - image field is absent", async () => {
    const response = await request(app)
      .post("/posts")
      .set("Authorization", "Bearer " + loggedInUser.token)
      .send({ title: "No Image Post", content: "No image here" });
    expect(response.status).toBe(201);
    expect(response.body.image).toBeUndefined();
  });
});

describe("Post Likes", () => {
  let likePostId: string;

  beforeAll(async () => {
    const refreshResp = await request(app)
      .post("/auth/refresh")
      .send({ refreshToken: loggedInUser.refreshToken });
    if (refreshResp.status === 200) {
      loggedInUser.token = refreshResp.body.token;
      loggedInUser.refreshToken = refreshResp.body.refreshToken;
    }
    const response = await request(app)
      .post("/posts")
      .set("Authorization", "Bearer " + loggedInUser.token)
      .send({ title: "Likeable Post", content: "Like this!" });
    expect(response.status).toBe(201);
    likePostId = response.body._id;
  });

  test("Like a post without auth returns 401", async () => {
    const response = await request(app).post(`/posts/${likePostId}/like`);
    expect(response.status).toBe(401);
  });

  test("Like a post returns likesCount=1 and isLikedByUser=true", async () => {
    const response = await request(app)
      .post(`/posts/${likePostId}/like`)
      .set("Authorization", "Bearer " + loggedInUser.token);
    expect(response.status).toBe(200);
    expect(response.body.likesCount).toBe(1);
    expect(response.body.isLikedByUser).toBe(true);
  });

  test("Liking same post again removes the like (toggle off)", async () => {
    const response = await request(app)
      .post(`/posts/${likePostId}/like`)
      .set("Authorization", "Bearer " + loggedInUser.token);
    expect(response.status).toBe(200);
    expect(response.body.likesCount).toBe(0);
    expect(response.body.isLikedByUser).toBe(false);
  });

  test("Like non-existent post returns 404", async () => {
    const response = await request(app)
      .post("/posts/000000000000000000000000/like")
      .set("Authorization", "Bearer " + loggedInUser.token);
    expect(response.status).toBe(404);
  });
});

describe("Post Pagination", () => {
  beforeAll(async () => {
    const refreshResp = await request(app)
      .post("/auth/refresh")
      .send({ refreshToken: loggedInUser.refreshToken });
    if (refreshResp.status === 200) {
      loggedInUser.token = refreshResp.body.token;
      loggedInUser.refreshToken = refreshResp.body.refreshToken;
    }
    await postsModel.deleteMany();
    for (let i = 1; i <= 5; i++) {
      await request(app)
        .post("/posts")
        .set("Authorization", "Bearer " + loggedInUser.token)
        .send({ title: `Pagination Post ${i}`, content: `Content ${i}` });
    }
  });

  test("GET /posts with limit=2 returns 2 posts and a nextCursor", async () => {
    const response = await request(app).get("/posts?limit=2");
    expect(response.status).toBe(200);
    expect(response.body.posts.length).toBe(2);
    expect(response.body.nextCursor).not.toBeNull();
  });

  test("GET /posts with cursor returns the next non-overlapping page", async () => {
    const page1 = await request(app).get("/posts?limit=2");
    const cursor = page1.body.nextCursor;
    const page2 = await request(app).get(`/posts?limit=2&cursor=${cursor}`);
    expect(page2.status).toBe(200);
    expect(page2.body.posts.length).toBe(2);
    const page1Ids = page1.body.posts.map((p: { _id: string }) => p._id);
    const page2Ids = page2.body.posts.map((p: { _id: string }) => p._id);
    expect(page2Ids.some((id: string) => page1Ids.includes(id))).toBe(false);
  });

  test("Last page has nextCursor=null", async () => {
    const page1 = await request(app).get("/posts?limit=3");
    const cursor = page1.body.nextCursor;
    const page2 = await request(app).get(`/posts?limit=3&cursor=${cursor}`);
    expect(page2.status).toBe(200);
    expect(page2.body.posts.length).toBe(2);
    expect(page2.body.nextCursor).toBeNull();
  });

  test("GET /posts with no limit defaults to 10 and returns all 5 posts", async () => {
    const response = await request(app).get("/posts");
    expect(response.status).toBe(200);
    expect(response.body.posts.length).toBe(5);
    expect(response.body.nextCursor).toBeNull();
  });

  test("Pagination respects sender filter", async () => {
    const response = await request(app)
      .get("/posts?sender=" + loggedInUser._id + "&limit=2");
    expect(response.status).toBe(200);
    expect(response.body.posts.length).toBe(2);
    expect(
      response.body.posts.every((p: { sender: string }) => p.sender === loggedInUser._id)
    ).toBe(true);
  });
});
