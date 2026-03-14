import request from "supertest";
import initApp from "../app";
import { Express } from "express";
import { getLogedInUser, UserData } from "./utils";
import path from "path";
import fs from "fs";

let app: Express;
let loggedInUser: UserData;
const uploadedUrls: string[] = [];

beforeAll(async () => {
  app = await initApp();
  loggedInUser = await getLogedInUser(app);
});

beforeEach(async () => {
  const refreshResp = await request(app)
    .post("/auth/refresh")
    .send({ refreshToken: loggedInUser.refreshToken });
  expect(refreshResp.status).toBe(200);
  loggedInUser.token = refreshResp.body.token;
  loggedInUser.refreshToken = refreshResp.body.refreshToken;
});

afterAll((done) => {
  // Remove only files created by this suite
  const publicDir = path.join(process.cwd(), "public");
  for (const url of uploadedUrls) {
    const filename = path.basename(url);
    const target = path.join(publicDir, filename);
    if (fs.existsSync(target)) {
      try {
        fs.unlinkSync(target);
      } catch (_) {
        /* ignore cleanup errors */
      }
    }
  }
  done();
});

describe("File Upload API Tests", () => {
  // Verifies auth and required file validations on upload endpoint.
  test("Upload without authentication returns 401", async () => {
    const response = await request(app).post("/file");
    expect(response.status).toBe(401);
  });

  test("Upload without a file returns 400", async () => {
    const response = await request(app)
      .post("/file")
      .set("Authorization", "Bearer " + loggedInUser.token);
    expect(response.status).toBe(400);
  });

  // Verifies successful upload response contract and stored URL format.
  test("Successful file upload returns 200 with a url", async () => {
    const response = await request(app)
      .post("/file")
      .set("Authorization", "Bearer " + loggedInUser.token)
      .attach("file", Buffer.from("fake jpeg bytes"), "photo.jpg");
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("url");
    expect(response.body.url).toMatch(/^\/public\/.+\.jpg$/);
    uploadedUrls.push(response.body.url);
  });

  // Verifies uploaded files are publicly retrievable from static route.
  test("Uploaded file is accessible via GET /public/<filename>", async () => {
    const uploadResponse = await request(app)
      .post("/file")
      .set("Authorization", "Bearer " + loggedInUser.token)
      .attach("file", Buffer.from("fake png bytes"), "image.png");
    expect(uploadResponse.status).toBe(200);

    const fileUrl = uploadResponse.body.url; // e.g. /public/1234567890.png
    uploadedUrls.push(fileUrl);
    const fileResponse = await request(app).get(fileUrl);
    expect(fileResponse.status).toBe(200);
  });

  test("Uploaded file URL includes original extension", async () => {
    const gifResponse = await request(app)
      .post("/file")
      .set("Authorization", "Bearer " + loggedInUser.token)
      .attach("file", Buffer.from("fake gif bytes"), "animation.gif");
    expect(gifResponse.status).toBe(200);
    expect(gifResponse.body.url).toMatch(/\.gif$/);
    uploadedUrls.push(gifResponse.body.url);
  });
});
