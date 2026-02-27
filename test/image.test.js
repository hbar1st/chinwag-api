/* eslint-disable no-console */

import { describe, test, expect, afterAll, beforeAll } from "vitest";
import request from "supertest";

import * as path from 'path';
/*
import { logger } from "../src/utils/logger.js";
import { pool } from "../src/db/pool.js";
*/
import { runMulter } from "../src/middleware/multer.js"

import { clearAllTables } from "../src/db/dbutil.js";

//const STD_VALIDATION_MSG = "Action has failed due to some validation errors";
let app;
let prefix;
let route;

const password = "password";
const testUser = {
  "new-password": password,
  "confirm-password": password,
  username: "test-username-i",
  nickname: "test-nickname-i",
  email: "testuser-i@email.com",
};

beforeAll(async () => {
  const mod = await import("../src/serverSetup.js");
  app = mod.app;
  prefix = mod.prefix;
  route = `${prefix}/user`;
});

afterAll(async () => {
  await clearAllTables();
});

describe("Profile Image", () => {
  let bearerToken; //the bearer token used in this set of tests
  //let user; // the user object used in this set of tests
  
  describe("GET /user/image", () => {
    //test getter when unauthenticated
    test("Unauthorized User", async () => {
      const res = await request(app).get(`${route}/image`);
      expect(res.status).toEqual(401);
    });
  });
  
  describe("Authenticated User", () => {
    
    beforeAll(async () => {
      
      await clearAllTables();
      //signup first
      let res = await request(app)
      .post(`${route}/signup`)
      .set("Accept", "application/json")
      .send(testUser);
      
      expect(res.headers["content-type"]).toMatch(/json/);
      expect(res.status).toEqual(201);
      //user = res.body.data;
      // then login to get the jwt header
      res = await request(app)
      .post(`${route}/login`)
      .set("Accept", "application/json")
      .send({ username: testUser.username, password: password });
      
      expect(res.headers["content-type"]).toMatch(/json/);
      expect(res.status).toEqual(200);
      
      bearerToken = res.headers.authorization;
    });
    
    afterAll(async () => {
      await clearAllTables();
    });
    //test getter when image is null
    test("Get profile image - null", async () => {
      const res = await request(app)
      .get(`${route}/image`)
      .set("Authorization", bearerToken);
      
      expect(res.status).toEqual(200);
      expect(res.body.data["avatar_id"]).toBeNull();
    });
    //test getter when image is assigned a url
    test("Get profile image - defined", async () => {});
  });
});

describe("PUT /user/image", () => {
  
  let bearerToken; //the bearer token used in this set of tests
  let user;
  
  const __dirname = process.cwd();
  const txtFile = path.join(__dirname, "./test/assets/not_image.txt");
  const redIconFile = path.join(__dirname, "./test/assets/profile_image_red.svg");
  
  // test unauthenticated user
  test("Unauthorized User", async () => {
    const res = await request(app)
    .put(`${route}/image`)
    .set("Accept", "application/json");
    
    expect(res.status).toEqual(401);
  });
  // test authenticated user
  describe("Authenticated User", () => {
    beforeAll(async () => {
      await clearAllTables();
      //signup first
      let res = await request(app)
      .post(`${route}/signup`)
      .set("Accept", "application/json")
      .send(testUser);
      
      expect(res.headers["content-type"]).toMatch(/json/);
      expect(res.status).toEqual(201);
      user = res.body.data;
      // then login to get the jwt header
      res = await request(app)
      .post(`${route}/login`)
      .set("Accept", "application/json")
      .send({ username: user.username, password: password });
      
      expect(res.headers["content-type"]).toMatch(/json/);
      expect(res.status).toEqual(200);
      
      bearerToken = res.headers.authorization;
    });
    
    afterAll(async () => {
      await clearAllTables();
    });
    // with invalid mimetype
    test("Invalid mimetype", async () => {
      const res = await request(app)
      .put(`${route}/image`)
      .set("Authorization", bearerToken)
      .attach("image", txtFile);
      
      expect(res.status).toEqual(400);
      expect(res.body.message).toEqual("Image file type is expected");
    });
    // with null value
    test("Null file", async () => {
      const res = await request(app)
      .put(`${route}/image`)
      .set("Authorization", bearerToken)
      .attach("image", null);
      
      expect(res.status).toEqual(400);
      expect(res.body.message).toEqual("File is required");
    });
    // with too large file
    test("Large file", async () => {
      const req = { file: { mimetype: "image/png", buffer: Buffer.alloc(2000) } };
      const res = {};

      await expect(
        runMulter(req, res, { maxFileSize: 1000 }), // override to a smaller value for test
      ).rejects.toThrow();

    });
    // happy path when initially avatar_id is null (image should be on cloudinary too)
    test("set initial avatar", async () => {
      const res = await request(app)
        .put(`${route}/image`)
        .set("Authorization", bearerToken)
        .attach("image", redIconFile);
      
      expect(res.status).toEqual(200);
      expect(res.body.data.avatar_id).toEqual(1)
    });
    // happy path when avatar_id has another image (image should be gone from cloudinary too)
    // delete user should clear the cloudinary image too and the image rows (move this to the delete test suite)
  })
});
