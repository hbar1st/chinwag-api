/* eslint-disable no-console */

import { describe, test, expect, afterAll, beforeAll, vi } from "vitest";
import request from "supertest";

import * as path from 'path';

import { pool } from "../src/db/pool.js";

vi.mock("cloudinary", () => {
  const upload_stream = vi.fn();
  
  upload_stream
  .mockImplementationOnce((options, cb) => ({
    end: () =>
      cb(null, {
      public_id: "first_upload",
      secure_url: "https://example.com/first.jpg",
      resource_type: "image",
    }),
  }))
  .mockImplementationOnce((options, cb) => ({
    end: () =>
      cb(null, {
      public_id: "second_upload",
      secure_url: "https://example.com/second.jpg",
      resource_type: "image",
    }),
  }))
  .mockImplementation((options, cb) => ({
    end: () =>
      cb(null, {
      public_id: "default_upload",
      secure_url: "https://example.com/default.jpg",
      resource_type: "image",
    }),
  }));
  
  return {
    v2: {
      config: vi.fn(),
      uploader: {
        upload_stream,
        destroy: vi.fn(async (publicId) => ({
          result: "ok",
          public_id: publicId,
          resource_type: "image",
        })),
      },
      api: {
        delete_resources_by_tag: vi.fn((tag, cb) => {
          cb(null, { deleted: ["img1", "img2"] });
        }),
      },
    },
  };
});

import { v2 as cloudinary } from "cloudinary";


import  Image from "../src/utils/Image.js";

import { runMulter } from "../src/middleware/multer.js"

import { clearAllTables } from "../src/db/dbutil.js";
import logger from "../src/utils/logger.js";

//import logger from "../src/utils/logger.js";

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
  
  await Image.deleteAll();
});

afterAll(async () => {
  await clearAllTables();
  await Image.deleteAll();
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
      await Image.deleteAll();
      //signup first
      let res = await request(app)
      .post(`${route}/signup`)
      .set("Accept", "application/json")
      .send(testUser);
      
      expect(res.headers["content-type"]).toMatch(/json/);
      expect(res.status).toEqual(201);
      logger.info("the signed in user: ", res.body.data)
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
      
      await Image.deleteAll();
    });
    //test getter when image is null
    test("Get profile image - null", async () => {
      const res = await request(app)
      .get(`${route}/image`)
      .set("Authorization", bearerToken);
      
      expect(res.status).toEqual(200);
      expect(res.body.data["avatar_id"]).toBeNull();
    });
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
      // spy on the image upload to confirm it worked?
      const uploadSpy = vi.spyOn(cloudinary.uploader, "upload_stream");
      
      const res = await request(app)
      .put(`${route}/image`)
      .set("Authorization", bearerToken)
      .attach("image", redIconFile);
      
      expect(res.status).toEqual(200);
      console.log("this data: ", res.body.data);
      expect(res.body.data.avatar_id).toBeDefined();
      expect(res.body.data.avatar_url).toBeDefined();
      expect(uploadSpy).toHaveBeenCalledOnce();
      
      const avatar_id = res.body.data.avatar_id;
      
      const user = await request(app)
      .get(`${route}/image`)
      .set("Authorization", bearerToken);
      
      expect(user.status).toEqual(200);
      expect(user.body.data.avatar_id).toBeDefined();
      expect(user.body.data.avatar_id).toEqual(avatar_id);
      uploadSpy.mockClear();
      
    });
    // happy path when avatar_id has another image (image should be gone from cloudinary too)
    test("update avatar", async () => {
      
      // set initial avatar
      const res = await request(app)
      .put(`${route}/image`)
      .set("Authorization", bearerToken)
      .attach("image", redIconFile);
      
      expect(res.status).toEqual(200);
      expect(res.body.data.avatar_id).toBeDefined();
      expect(res.body.data.public_id).toBeDefined();
      expect(res.body.data.avatar_url).toBeDefined();
      
      const old_avatar_id = res.body.data.avatar_id;    
      const old_public_id = res.body.data.public_id;
      
      const user = await request(app)
      .put(`${route}/image`)
      .set("Authorization", bearerToken)
      .attach("image", redIconFile);
      
      expect(user.status).toEqual(200);
      expect(user.body.data.avatar_id).toBeDefined();
      expect(user.body.data.avatar_url).toBeDefined();
      
      expect(user.body.data.avatar_id).not.toEqual(old_avatar_id);
      
      const destroySpy = vi.spyOn(cloudinary.uploader, "destroy");
      
      expect(destroySpy).toHaveBeenCalled(1);
      expect(destroySpy).toHaveBeenCalledWith(old_public_id);
      
      const sql = `SELECT * from chinwag.images WHERE id='${old_avatar_id}';`;
      
      const rows = (await pool.query(sql)).rows;
      expect(rows.length).toBe(0);
      
      destroySpy.mockClear();
    });
    
    test("delete avatar", async () => {
      
      const uploadSpy = vi.spyOn(cloudinary.uploader, "upload_stream");
      // spy on the image destroy to confirm it worked
      const destroySpy = vi.spyOn(cloudinary.uploader, "destroy");
      
      //first upload an image
      const res = await request(app)
      .put(`${route}/image`)
      .set("Authorization", bearerToken)
      .attach("image", redIconFile);
      
      expect(res.status).toEqual(200);
      console.log("this data: ", res.body.data);
      expect(res.body.data.avatar_id).toBeDefined();
      expect(res.body.data.avatar_url).toBeDefined();
      expect(uploadSpy).toHaveBeenCalledOnce();
      
      const public_id = res.body.data.public_id;
      
      // now delete the avatar again
      const user = await request(app)
      .delete(`${route}/image`)
      .set("Authorization", bearerToken);
      
      expect(user.status).toEqual(204);
      
      expect(destroySpy).toHaveBeenCalled(1);
      expect(destroySpy).toHaveBeenCalledWith(public_id);

      uploadSpy.mockClear();
      destroySpy.mockClear();
    });
  })
});
