/* eslint-disable no-console */

import {
  describe,
  test,
  expect,
  afterEach,
  beforeAll,
  afterAll,
  onTestFinished,
  onTestFailed,
  skip,
  beforeEach,
  vi
} from "vitest";
import request from "supertest";
import { logger } from "../src/utils/logger.js";
import { pool } from "../src/db/pool.js";
vi.mock("cloudinary", () => {
  const upload_stream = vi.fn();
  
  upload_stream
  .mockImplementationOnce((_options, cb) => ({
    end: () =>
      cb(null, {
      public_id: "first_upload",
      secure_url: "https://example.com/first.jpg",
      resource_type: "image",
    }),
  }))
  .mockImplementationOnce((_options, cb) => ({
    end: () =>
      cb(null, {
      public_id: "second_upload",
      secure_url: "https://example.com/second.jpg",
      resource_type: "image",
    }),
  }))
  .mockImplementation((_options, cb) => ({
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
        delete_resources_by_tag: vi.fn((_tag, cb) => {
          cb(null, { deleted: ["img1", "img2"] });
        }),
      },
    },
  };
});

import { v2 as cloudinary } from "cloudinary";

import Image from "../src/utils/Image.js";

import { clearAllTables } from "../src/db/dbutil.js";

const STD_VALIDATION_MSG = "Action has failed due to some validation errors";
let app;
let prefix;
let user;
let chatRoute;
let userRoute;
let bearerToken;

const password = "password";
const testUser = {
  "new-password": password,
  "confirm-password": password,
  username: "test-username-c",
  nickname: "test-nickname-c",
  email: "testuser-c@email.com",
};

const chatUser1 = {
  "new-password": password,
  "confirm-password": password,
  username: "test-username-d",
  nickname: "test-nickname-d",
  email: "testuser-d@email.com",
};

const chatUser2 = {
  "new-password": password,
  "confirm-password": password,
  username: "test-username-e",
  nickname: "test-nickname-e",
  email: "testuser-e@email.com",
};

beforeAll(async () => {
  
  await clearAllTables();
  const mod = await import("../src/serverSetup.js");
  app = mod.app;
  prefix = mod.prefix;
  chatRoute = `${prefix}/chat`;
  userRoute = `${prefix}/user`
  
  await Image.deleteAll();
  
  //signup first user (who will be the authenticated user throughout these tests)
  let res = await request(app)
  .post(`${userRoute}/signup`)
  .set("Accept", "application/json")
  .send(testUser);
  
  expect(res.headers["content-type"]).toMatch(/json/);
  expect(res.status).toEqual(201);
  logger.info("the signed in user: ", res.body.data);
  user = res.body.data;
  // then login to get the jwt header
  res = await request(app)
  .post(`${userRoute}/login`)
  .set("Accept", "application/json")
  .send({ username: testUser.username, password: password });
  
  expect(res.headers["content-type"]).toMatch(/json/);
  expect(res.status).toEqual(200);
  
  bearerToken = res.headers.authorization;
  
  // signup another user to conduct a chat with
  res = await request(app)
  .post(`${userRoute}/signup`)
  .set("Accept", "application/json")
  .send(chatUser1);
  
  chatUser1.id = res.body.data.id;
  
  expect(res.headers["content-type"]).toMatch(/json/);
  expect(res.status).toEqual(201);
  // signup a third user for other chat tests
  res = await request(app)
  .post(`${userRoute}/signup`)
  .set("Accept", "application/json")
  .send(chatUser2);
  
  expect(res.headers["content-type"]).toMatch(/json/);
  expect(res.status).toEqual(201);
  chatUser2.id = res.body.data.id;
});

afterAll(async () => {
  await clearAllTables();
  
  await Image.deleteAll();
});

describe("chat tests", () => {
  // list should be sorted by the one that was the most recently active (nearest to the top)
  //   in future, I may allow chats to be archived?

  describe("Get Chat", () => {
    test("Unauthorized User", async () => {
      const res = await request(app)
        .get(`${chatRoute}`)
        .set("Accept", "application/json");

      expect(res.status).toEqual(401);
    });

    describe("Auth User", () => {
      // test getting a specific chat by id if an ongoing chat exists
      // (top level info only like name of person we are talking to and the count of new messages if any)

      // test getting a list of all ongoing chats when there are none defined
      test("Get Blank Chat List", async () => {
        const res = await request(app)
          .get(`${chatRoute}`)
          .set("Accept", "application/json")
          .set("Authorization", bearerToken);

        expect(res.status).toEqual(200);
        expect(res.body.data).toBeDefined();
        expect(res.body.data.length).toBe(0);
      });

      // test getting a specific chat by id if no ongoing chat exists (should fail)
      test("Get NonExistant Chat By Id", async () => {
        const res = await request(app)
          .get(`${chatRoute}/10000`)
          .set("Accept", "application/json")
          .set("Authorization", bearerToken);

        expect(res.status).toEqual(404);
      });

      describe("Ongoing Chat Tests", () => {
        let chat1_id = 0;
        let chat2_id = 0;

        beforeEach(async () => {
          const res = await request(app)
            .post(`${chatRoute}`)
            .set("Accept", "application/json")
            .set("Authorization", bearerToken)
            .send({ user_id: chatUser1.id });

          expect(res.status).toEqual(201);
          chat1_id = res.body.data.id;

          const res2 = await request(app)
            .post(`${chatRoute}`)
            .set("Accept", "application/json")
            .set("Authorization", bearerToken)
            .send({ user_id: chatUser2.id });

          expect(res2.status).toEqual(201);
          chat2_id = res2.body.data.id;
        });
        afterEach(async () => {
          await clearAllTables();
        });

        // test getting a list of all ongoing chats when there are some defined but all have zero new messages
        test("Get All Chats ", async () => {
          const res = await request(app)
            .get(`${chatRoute}`)
            .set("Accept", "application/json")
            .set("Authorization", bearerToken);

          expect(res.status).toEqual(200);
          expect(res.body.data).toBeDefined();
          console.log("the results: ", res.body.data);
          expect(res.body.data.length).toBe(2);
          expect(res.body.data[0]).toEqual({
            chat_id: chat1_id,
            icon_id: null,
            descr: null,
            count: 0,
          });
          expect(res.body.data[1]).toEqual({
            chat_id: chat2_id,
            icon_id: null,
            descr: null,
            count: 0,
          });
        });
      });
    });
  });

  // test setting up a chat with another user
  describe("Add New Chat tests", () => {
    // unauthorized user tries to make a new chat
    test("Unauthorized User", async () => {
      const res = await request(app)
        .post(`${chatRoute}`)
        .set("Accept", "application/json")
        .send({ user_id: chatUser1.id });
      expect(res.status).toEqual(401);
    });

    // authorized user tries to make a chat with himself (What's app lets you do that but that's not a feature I want)
    describe("Authorized User", () => {
      // authorized user tries to make a new chat with user that doesn't exist (bad id)
      test("Chat-to a non-existant user", async () => {
        const res = await request(app)
          .post(`${chatRoute}`)
          .set("Accept", "application/json")
          .set("Authorization", bearerToken)
          .send({ user_id: 10000 });

        expect(res.status).toEqual(400);

        expect(res.body.message).toEqual(STD_VALIDATION_MSG);
        expect(res.body.data).toBeDefined();
        expect(res.body.data.length).toBeGreaterThan(0);
        expect(res.body.data[0].msg).toEqual("This user id is invalid.");
      });

      // authorized user tries to make a new chat with user id that is an invalid value
      test("Chat to an invalid user id", async () => {
        const res = await request(app)
          .post(`${chatRoute}`)
          .set("Accept", "application/json")
          .set("Authorization", bearerToken)
          .send({ user_id: -1 });

        expect(res.status).toEqual(400);

        expect(res.body.message).toEqual(STD_VALIDATION_MSG);
        expect(res.body.data).toBeDefined();
        expect(res.body.data.length).toBeGreaterThan(0);
        expect(res.body.data[0].msg).toEqual("This user id is invalid.");
      });

      test("User cannot chat to himself", async () => {
        const res = await request(app)
          .post(`${chatRoute}`)
          .set("Accept", "application/json")
          .set("Authorization", bearerToken)
          .send({ user_id: user.id });

        expect(res.status).toEqual(400);
        expect(res.body.message).toEqual(STD_VALIDATION_MSG);
        expect(res.body.data).toBeDefined();
        expect(res.body.data.length).toBeGreaterThan(0);
        expect(res.body.data[0].msg).toEqual("Invalid value");
      });

      // authorized user tries to chat but there is no body fields
      test("Missing body fields", async () => {
        const res = await request(app)
          .post(`${chatRoute}`)
          .set("Accept", "application/json")
          .set("Authorization", bearerToken);

        expect(res.status).toEqual(400);
        expect(res.body.message).toEqual(STD_VALIDATION_MSG);
        expect(res.body.data).toBeDefined();
        expect(res.body.data.length).toBeGreaterThan(0);
        expect(res.body.data[0].msg).toEqual(
          "A user id is required to complete the request.",
        );
      });
      // authorized user tries to make a new chat with a valid user (by id) which is not the authenticated user id
      test("Happy Path", async () => {
        const res = await request(app)
          .post(`${chatRoute}`)
          .set("Accept", "application/json")
          .set("Authorization", bearerToken)
          .send({ user_id: chatUser1.id });

        expect(res.status).toEqual(201);
        expect(res.body.data).toBeDefined();
        expect(res.body.data.created_at).toBeDefined();
        expect(res.body.data.id).toBeTypeOf("number");
        expect(res.body.data.name).toBeDefined();

        // check if the user is still a member of the chat
        const sql = `SELECT * FROM chinwag.chat_members WHERE chat_id=${res.body.data.id} AND user_id=${user.id};`;

        const { rows } = await pool.query(sql);
        expect(rows.length).toBe(1);
        expect(rows[0].has_left).toBe(false);
      });

      // tries to make a new chat with a user after leaving the chat first (should return the same original chat id from the first time)
      // in the middle the has_left flag should be set to true, then later false.
    });
  });

  // test adding a message into a chat (no images)
  // test getting the specific chat's messages (possibly paginated but in reverse chronological order)

  // test getting a list of all ongoing chats when there are some defined with some having new message counts
  
  // test editing a specific message's contents (does this update the chronology of the chat display? leave it to client to decide)
  // test deleting a specific message
  // test that chats are removed if the user is removed but only one sided (only this user's messages should be removed)
  // test getting a list of chats that are ongoing with this auth user (so must not show chats the user has left, only ongoing ones)
});