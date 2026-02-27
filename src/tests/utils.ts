import request from "supertest";
import { Express } from "express";

export type UserData = {
  username: string;
  email: string;
  password: string;
  _id?: string;
  token?: string;
  refreshToken?: string;
};

export const usersList: UserData[] = [
  {
    username: "testuser",
    email: "test@test.com",
    password: "testpass",
    _id: "",
    token: "",
    refreshToken: "",
  },
  {
    username: "user1",
    email: "user1@example.com",
    password: "Passw0rd1",
    _id: "",
    token: "",
    refreshToken: "",
  },
  {
    username: "user2",
    email: "user2@example.com",
    password: "Passw0rd2",
    _id: "",
    token: "",
    refreshToken: "",
  },
];

export const testUser: UserData = usersList[0];

export const anotherUser: UserData = usersList[1];

export const nonexistentUser: UserData = {
  username: "nonexistent",
  email: "nonexistent@example.com",
  password: "nonexistentpass",
  _id: "000000000000000000000000",
};

export const getLogedInUser = async (app: Express): Promise<UserData> => {
  const username = testUser.username;
  const email = testUser.email;
  const password = testUser.password;
  let response = await request(app)
    .post("/auth/register")
    .send({ username: username, email: email, password: password });
  if (response.status !== 201) {
    response = await request(app)
      .post("/auth/login")
      .send({ email: email, password: password });
  }
  const logedUser = {
    _id: response.body._id,
    token: response.body.token,
    refreshToken: response.body.refreshToken,
    email: email,
    password: password,
    username: username,
  };
  return logedUser;
};

export type PostsData = {
  title: string;
  content: string;
  sender?: string;
  _id?: string;
};

export const postsList: PostsData[] = [
  {
    title: "First Post",
    content: "This is the content of the first post.",
  },
  {
    title: "Other User Post",
    content: "This post is created by another user.",
  },
  {
    title: "Third Post",
    content: "This is the content of the third post.",
  },
];

export const nonexistentPost: PostsData = {
  title: "Nonexistent Post",
  content: "This post does not exist.",
  _id: "000000000000000000000000",
};

export const createOtherUserPost = async (app: Express): Promise<PostsData> => {
  let auth = await request(app).post("/auth/register").send(anotherUser);
  if (auth.status !== 201) {
    auth = await request(app)
      .post("/auth/login")
      .send({ email: anotherUser.email, password: anotherUser.password });
  }
  const otherToken = auth.body.token;

  const response = await request(app)
    .post("/posts")
    .set("Authorization", "Bearer " + otherToken)
    .send(postsList[1]);
  postsList[1]._id = response.body._id;
  return postsList[1];
};

export type CommentsData = {
  content: string;
  postId?: string;
  author?: string;
  createdAt?: Date;
  _id?: string;
};

export const commentsList: CommentsData[] = [
  {
    content: "This is the first comment.",
  },
  {
    content: "This is the second comment.",
  },
  {
    content: "This is the third comment.",
  },
];

export const nonexistentComment: CommentsData = {
  content: "This comment does not exist.",
  _id: "000000000000000000000000",
};




