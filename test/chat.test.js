/* eslint-disable no-console */

import {
  describe,
  test,
  expect,
  afterEach,
  beforeAll,
  afterAll,
  beforeEach,
  vi,
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

import Image from "../src/utils/Image.js";

import { clearAllTables, clearChatTables } from "../src/db/dbutil.js";

const STD_VALIDATION_MSG = "Action has failed due to some validation errors";
let app;
let prefix;
let user;
let chatRoute;
let userRoute;
let messageRoute;
let bearerToken;
let user1BearerToken;

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

// setup some users and the currently authenticated user
beforeAll(async () => {
  // Clear all tables to start with a clean slate
  await clearAllTables();
  const mod = await import("../src/serverSetup.js");
  app = mod.app;
  prefix = mod.prefix;
  chatRoute = `${prefix}/chat`;
  userRoute = `${prefix}/user`;
  messageRoute = `${prefix}/message`
  
  await Image.deleteAll();
  
  //signup first user (who will be the authenticated user throughout these tests)
  const res1 = await request(app)
  .post(`${userRoute}/signup`)
  .set("Accept", "application/json")
  .send(testUser);
  
  expect(res1.headers["content-type"]).toMatch(/json/);
  expect(res1.status).toEqual(201);
  logger.info("the signed in user: ", res1.body.data);
  user = res1.body.data;
  
  testUser.id = res1.body.data.id;
  
  // then login to get the jwt header
  const res2 = await request(app)
  .post(`${userRoute}/login`)
  .set("Accept", "application/json")
  .send({ username: testUser.username, password: password });
  
  expect(res2.headers["content-type"]).toMatch(/json/);
  expect(res2.status).toEqual(200);
  
  bearerToken = res2.headers.authorization;
  
  // signup another user to conduct a chat with
  const res3 = await request(app)
  .post(`${userRoute}/signup`)
  .set("Accept", "application/json")
  .send(chatUser1);
  
  chatUser1.id = res3.body.data.id;
  
  expect(res3.headers["content-type"]).toMatch(/json/);
  expect(res3.status).toEqual(201);
  
  // signup a third user for other chat tests
  const res4 = await request(app)
  .post(`${userRoute}/signup`)
  .set("Accept", "application/json")
  .send(chatUser2);
  
  expect(res4.headers["content-type"]).toMatch(/json/);
  expect(res4.status).toEqual(201);
  chatUser2.id = res4.body.data.id;
  
  // second user login to get another jwt header
  const loginRes = await request(app)
  .post(`${userRoute}/login`)
  .set("Accept", "application/json")
  .send({ username: chatUser1.username, password: password });
  
  expect(loginRes.headers["content-type"]).toMatch(/json/);
  expect(loginRes.status).toEqual(200);
  
  user1BearerToken = loginRes.headers.authorization;
});

afterAll(async () => {
  // Clean up test data
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
        
        expect(res.status).toEqual(400);
        
        expect(res.body.message).toEqual(STD_VALIDATION_MSG);
        expect(res.body.data).toBeDefined();
        expect(res.body.data.length).toBeGreaterThan(0);
        expect(res.body.data[0].msg).toEqual(
          "Insufficient authorization for this action.",
        );
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
          await clearChatTables();
        });
        
        // test leaving a chat when the auth user is not a member (should fail)
        test("Non-Member Leave A Chat", async () => {
          const res = await request(app)
          .delete(`${chatRoute}/${chat2_id}`)
          .set("Accept", "application/json")
          .set("Authorization", user1BearerToken);
          
          expect(res.status).toEqual(400);
          
          expect(res.body.message).toEqual(STD_VALIDATION_MSG);
          expect(res.body.data).toBeDefined();
          expect(res.body.data.length).toBeGreaterThan(0);
          expect(res.body.data[0].msg).toEqual(
            "Insufficient authorization for this action.",
          );
        });
        
        // test leaving a chat (leaving a chat should mean that a GET /chat should return the ongoing chats minus this one we left)
        test("Member Leave A Chat", async () => {
          const res = await request(app)
          .delete(`${chatRoute}/${chat2_id}`)
          .set("Accept", "application/json")
          .set("Authorization", bearerToken);
          
          expect(res.status).toEqual(204);
          
          const resCheck = await request(app)
          .get(`${chatRoute}`)
          .set("Accept", "application/json")
          .set("Authorization", bearerToken);
          
          expect(resCheck.status).toEqual(200);
          expect(resCheck.body.data.length).toEqual(1);
          
          // try to get the chat we left, should not work
          const findChatRes = await request(app)
          .get(`${chatRoute}/${chat2_id}`)
          .set("Accept", "application/json")
          .set("Authorization", bearerToken);
          
          expect(findChatRes.status).toEqual(204); //no results
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
  
  describe("Manage Chat Messages", () => {
    let chatId1 = 0; //between testUser and chatUser1
    let chatId2 = 0; //between testUser and chatUser2
    
    beforeEach(async () => {
      // Ensure chats are properly cleaned before each test
      await clearChatTables();
      const res = await request(app)
      .post(`${chatRoute}`)
      .set("Accept", "application/json")
      .set("Authorization", bearerToken)
      .send({ user_id: chatUser1.id });
      
      expect(res.status).toEqual(201);
      chatId1 = res.body.data.id;
      
      const res2 = await request(app)
      .post(`${chatRoute}`)
      .set("Accept", "application/json")
      .set("Authorization", bearerToken)
      .send({ user_id: chatUser2.id });
      
      expect(res2.status).toEqual(201);
      chatId2 = res2.body.data.id;
      
      const messages1 = ["(1) First Message: testUser to 1st chat user.","(3): Continue convo"];
      const messages2 = ["(2) First Message: 1st chat user to testUser.","(4): Continued response", "(5): More verbosity"]
      
      for (const msg of messages1) {
        const sendMsgRes = await request(app)
        .post(`${chatRoute}/${chatId1}/message`)
        .set("Accept", "application/json")
        .set("Authorization", bearerToken)
        .send({ content: msg});
        
        expect(sendMsgRes.status).toEqual(201);
      }
      
      for (const msg of messages2) {
        const sendMsgRes = await request(app)
        .post(`${chatRoute}/${chatId1}/message`)
        .set("Accept", "application/json")
        .set("Authorization", user1BearerToken)
        .send({ content: msg });
        
        expect(sendMsgRes.status).toEqual(201);
      }
    });
    
    afterEach(async () => {
      await clearChatTables();
    });
    //test unauthorized user
    // unauthorized user tries to get chat messages
    test("Unauthorized User", async () => {
      const res = await request(app)
      .get(`${chatRoute}/${chatId1}/message`)
      .set("Accept", "application/json");
      expect(res.status).toEqual(401);
    });
    
    describe("Authorized User", () => {
      // authorized user but bad chat id (invalid or doesn't exist or user not in the chat so should not see any messages)
      test("Bad chat id", async () => {
        const res = await request(app)
          .get(`${chatRoute}/a/message`)
          .set("Accept", "application/json")
          .set("Authorization", user1BearerToken);

        expect(res.status).toEqual(400);

        expect(res.body.message).toEqual(STD_VALIDATION_MSG);
        expect(res.body.data).toBeDefined();
        expect(res.body.data.length).toBeGreaterThan(0);
        expect(res.body.data[0].msg).toEqual("chat id must be a number");
      });
      test("Nonexistant chat id", async () => {
        const res = await request(app)
          .get(`${chatRoute}/10000/message`)
          .set("Accept", "application/json")
          .set("Authorization", user1BearerToken);

        expect(res.status).toEqual(400);

        expect(res.body.message).toEqual(STD_VALIDATION_MSG);
        expect(res.body.data).toBeDefined();
        expect(res.body.data.length).toBeGreaterThan(0);
        expect(res.body.data[0].msg).toEqual(
          "Insufficient authorization for this action.",
        );
      });
      // test with a blank chat
      test("Blank Chat - appy Path", async () => {
        const res = await request(app)
          .get(`${chatRoute}/${chatId2}/message`)
          .set("Accept", "application/json")
          .set("Authorization", bearerToken);

        expect(res.status).toEqual(200);
        expect(res.body.data).toBeDefined();
        expect(res.body.data.length).toEqual(0); //0 messages retrieved
      });

      test("Get Messages After Delete", async () => {
        const res = await request(app)
          .get(`${chatRoute}/${chatId1}/message`)
          .set("Accept", "application/json")
          .set("Authorization", user1BearerToken);

        expect(res.status).toEqual(200);
        expect(res.body.data).toBeDefined();
        expect(res.body.data.length).toEqual(5); //5 messages initially retrieved

        const delRes = await request(app)
          .delete(`${messageRoute}/2`)
          .set("Accept", "application/json")
          .set("Authorization", bearerToken);

        expect(delRes.status).toEqual(204);

        const res2 = await request(app)
          .get(`${chatRoute}/${chatId1}/message`)
          .set("Accept", "application/json")
          .set("Authorization", user1BearerToken);

        expect(res2.status).toEqual(200);

        expect(res2.body.data).toBeDefined();
        expect(res2.body.data.length).toEqual(4); //4 messages initially retrieved
      });

      test("5 Msgs - Happy Path", async () => {
        const res = await request(app)
          .get(`${chatRoute}/${chatId1}/message`)
          .set("Accept", "application/json")
          .set("Authorization", user1BearerToken);

        expect(res.status).toEqual(200);
        expect(res.body.data).toBeDefined();
        expect(res.body.data.length).toEqual(5); //5 messages retrieved
      });

      // test deleting a message that doesn't belong to the user (who is in the same chat though)
      //
      
      test("Delete someone else's message", async () => {
        const delRes = await request(app)
          .delete(`${messageRoute}/5`)
          .set("Accept", "application/json")
          .set("Authorization", bearerToken);

        expect(delRes.status).toEqual(400);

        expect(delRes.body.message).toEqual(STD_VALIDATION_MSG);
        expect(delRes.body.data).toBeDefined();
        expect(delRes.body.data.length).toBeGreaterThan(0);
        expect(delRes.body.data[0].msg).toEqual(
          "Failed to find this message or invalid id.",
        );
      });
    });
  })
  
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
        expect(res.body.data[0].msg).toEqual(
          "Chat should be with another person.",
        );
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
  describe("Add New Message tests", () => {
    let chatId1 = 0; //between testUser and chatUser1
    let chatId2 = 0; //between testUser and chatUser2
    
    beforeEach(async () => {
      // Ensure chats are properly cleaned before each test
      await clearChatTables();
      const res = await request(app)
      .post(`${chatRoute}`)
      .set("Accept", "application/json")
      .set("Authorization", bearerToken)
      .send({ user_id: chatUser1.id });
      
      expect(res.status).toEqual(201);
      chatId1 = res.body.data.id;
      
      const res2 = await request(app)
      .post(`${chatRoute}`)
      .set("Accept", "application/json")
      .set("Authorization", bearerToken)
      .send({ user_id: chatUser2.id });
      
      expect(res2.status).toEqual(201);
      chatId2 = res2.body.data.id;
    });
    
    afterEach(async () => {
      await clearChatTables();
    });
    
    // unauthorized user tries to make a new message
    test("Unauthorized User", async () => {
      const res = await request(app)
      .post(`${chatRoute}/${chatId1}/message`)
      .set("Accept", "application/json");
      
      expect(res.status).toEqual(401);
    });
    
    describe("Authorized User", () => {
      const message = "The first message test.";
      
      // try to send a message to a chat that the user left (should be allowed)
      test("Send message to chat user left earlier", async () => {
        
        const deleteRes = await request(app)
        .delete(`${chatRoute}/${chatId1}`)
        .set("Accept", "application/json")
        .set("Authorization", bearerToken);
        
        expect(deleteRes.status).toEqual(204);
        
        // list of chats should not include chatId1
        let getRes = await request(app)
        .get(`${chatRoute}`)
        .set("Accept", "application/json")
        .set("Authorization", bearerToken);
        
        expect(getRes.status).toEqual(200);
        expect(getRes.body.data.length).toBe(1);
        expect(getRes.body.data[0].chat_id).toEqual(chatId2);
        
        const res = await request(app)
        .post(`${chatRoute}/${chatId1}/message`)
        .set("Accept", "application/json")
        .set("Authorization", bearerToken)
        .send({ content: "Sorry I left before." });
        
        expect(res.status).toEqual(201);
        
        expect(res.body.data).toBeDefined();
        expect(res.body.data).toEqual({
          author_id: testUser.id,
          chat_id: chatId1,
          content: "Sorry I left before.",
          id: 1,
          reply_to: null,
        });
        
        // check list of chats now includes chatId1
        getRes = await request(app)
        .get(`${chatRoute}`)
        .set("Accept", "application/json")
        .set("Authorization", bearerToken);
        
        expect(getRes.status).toEqual(200);
        expect(getRes.body.data.length).toBe(2);
      });
      
      // send a blank message in a chat
      test("Send blank message", async () => {
        const res = await request(app)
        .post(`${chatRoute}/${chatId1}/message`)
        .set("Accept", "application/json")
        .set("Authorization", bearerToken)
        .send({ content: "" });
        
        expect(res.status).toEqual(400);
        
        expect(res.body.message).toEqual(STD_VALIDATION_MSG);
        expect(res.body.data).toBeDefined();
        expect(res.body.data.length).toBeGreaterThan(0);
        expect(res.body.data[0].msg).toEqual("Message must not be blank.");
      });
      
      //send bad language in content
      test("Send bad message", async () => {
        const res = await request(app)
        .post(`${chatRoute}/${chatId1}/message`)
        .set("Accept", "application/json")
        .set("Authorization", bearerToken)
        .send({ content: "excuse this fucking test" });
        
        expect(res.status).toEqual(400);
        
        expect(res.body.message).toEqual(STD_VALIDATION_MSG);
        expect(res.body.data).toBeDefined();
        expect(res.body.data.length).toBeGreaterThan(0);
        expect(res.body.data[0].msg).toEqual('Captain America: "Language!"');
      });
      
      //send overly long content
      test("Send long message", async () => {
        const res = await request(app)
        .post(`${chatRoute}/${chatId1}/message`)
        .set("Accept", "application/json")
        .set("Authorization", bearerToken)
        .send({ content: "words ".repeat(200) });
        
        expect(res.status).toEqual(400);
        
        expect(res.body.message).toEqual(STD_VALIDATION_MSG);
        expect(res.body.data).toBeDefined();
        expect(res.body.data.length).toBeGreaterThan(0);
        expect(res.body.data[0].msg).toEqual(
          "Message exceeded max 1000 character length.",
        );
      });
      
      // send a message in a chat
      test("Send message", async () => {
        // get the current last active time for the user to compare after the message is sent
        // get the current list of new messages (should be zero)
        let unreadRes = await request(app)
        .get(`${chatRoute}`)
        .set("Accept", "application/json")
        .set("Authorization", user1BearerToken);
        
        expect(unreadRes.status).toEqual(200);
        expect(unreadRes.body.data.length).toBe(1);
        expect(unreadRes.body).toEqual({
          data: expect.arrayContaining([
            {
              chat_id: chatId1,
              icon_id: null,
              descr: null,
              count: 0,
            },
          ]),
        });
        
        const res = await request(app)
        .post(`${chatRoute}/${chatId1}/message`)
        .set("Accept", "application/json")
        .set("Authorization", bearerToken)
        .send({ content: message });
        
        expect(res.status).toEqual(201);
        expect(res.body.data).toEqual({
          author_id: 1,
          chat_id: chatId1,
          content: message,
          id: 1,
          reply_to: null,
        });
        
        //check activity table got updated
        // get the current list of new messages (should be zero)
        unreadRes = await request(app)
        .get(`${chatRoute}`)
        .set("Accept", "application/json")
        .set("Authorization", user1BearerToken);
        
        expect(unreadRes.status).toEqual(200);
        expect(unreadRes.body.data.length).toBe(1);
        expect(unreadRes.body).toEqual({
          data: expect.arrayContaining([
            {
              chat_id: chatId1,
              icon_id: null,
              descr: null,
              count: 1,
            },
          ]),
        });
      });
    });
  });
  
  // send a reply in a chat
  // test getting the specific chat's messages (possibly paginated but in reverse chronological order) as a member of the chat
  // test getting a specific chat's messages as unauthorized user
  
  // test getting a list of all ongoing chats when there are some defined with some having new message counts
  
  // test editing a specific message's contents (does this update the chronology of the chat display? leave it to client to decide)
  // test deleting a specific message
  // test that chats are removed if the user is removed but only one sided (only this user's messages should be removed)
  // test getting a list of chats that are ongoing with this auth user (so must not show chats the user has left, only ongoing ones)
});
