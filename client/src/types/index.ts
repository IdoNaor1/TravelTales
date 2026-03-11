// User types

export interface IUser {
  _id: string;
  username: string;
  email: string;
  profilePicture?: string;
  createdAt: string;
}

// Auth types

export interface IAuthResponse {
  _id: string;
  username: string;
  email: string;
  token: string;
  refreshToken: string;
}

export interface ITokenRefreshResponse {
  token: string;
  refreshToken: string;
}

export interface IRegisterRequest {
  username: string;
  email: string;
  password: string;
  profilePicture?: string;
}

export interface ILoginRequest {
  email: string;
  password: string;
}

// Post types

export interface IPost {
  _id: string;
  title: string;
  content: string;
  sender: string | IUser;
  image?: string;
  likes: string[];
  commentCount?: number;
  createdAt: string;
  updatedAt?: string;
}

export interface ICreatePostRequest {
  title: string;
  content: string;
  image?: string;
}

export interface IUpdatePostRequest {
  title?: string;
  content?: string;
  image?: string;
}

// Comment types

export interface IComment {
  _id: string;
  postId: string;
  content: string;
  author: string | IUser;
  createdAt: string;
}

export interface ICreateCommentRequest {
  postId: string;
  content: string;
}

export interface IUpdateCommentRequest {
  content: string;
}
