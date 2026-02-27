import request from "supertest";
import initApp from "../app";
import { Express } from "express";
import { getLogedInUser, UserData } from "./utils";
import path from "path";
import fs from "fs";

let app: Express;
let loggedInUser: UserData;

beforeAll(async () => {
  app = await initApp();
  loggedInUser = await getLogedInUser(app);
});

afterAll((done) => {
  // Remove any files uploaded during tests, keeping .gitkeep
  const publicDir = path.join(process.cwd(), "public");
  if (fs.existsSync(publicDir)) {
    fs.readdirSync(publicDir).forEach((file) => {
      if (file !== ".gitkeep") {
        try {
          fs.unlinkSync(path.join(publicDir, file));
        } catch (_) { /* ignore cleanup errors */ }
      }
    });
  }
  done();
});

describe("File Upload API Tests", () => {
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

  test("Successful file upload returns 200 with a url", async () => {
    const response = await request(app)
      .post("/file")
      .set("Authorization", "Bearer " + loggedInUser.token)
      .attach("file", Buffer.from("fake jpeg bytes"), "photo.jpg");
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("url");
    expect(response.body.url).toMatch(/^\/public\/.+\.jpg$/);
  });

  test("Uploaded file is accessible via GET /public/<filename>", async () => {
    const uploadResponse = await request(app)
      .post("/file")
      .set("Authorization", "Bearer " + loggedInUser.token)
      .attach("file", Buffer.from("fake png bytes"), "image.png");
    expect(uploadResponse.status).toBe(200);

    const fileUrl = uploadResponse.body.url; // e.g. /public/1234567890.png
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
  });
});
