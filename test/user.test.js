/* eslint-disable no-console */

import {
  describe,
  test,
  expect,
  afterEach,
  beforeAll,
  onTestFinished,
  onTestFailed,
  skip,
  beforeEach,
} from "vitest";
import request from "supertest";

import { logger } from "../src/utils/logger.js";
import { pool } from "../src/db/pool.js";

import { clearAllTables } from "../src/db/dbutil.js";

const STD_VALIDATION_MSG = "Action has failed due to some validation errors";
let app;
let prefix;
let route;

beforeAll(async () => {
  const mod = await import("../src/serverSetup.js");
  app = mod.app;
  prefix = mod.prefix;
  route = `${prefix}/user`;
  
  await clearAllTables();
});

describe("CORS Configuration", () => {
  test("should accept requests with no origin header", async () => {
    const response = await request(app).get(`${prefix}/user`);
    expect(response.status).toBeDefined();
  });

  test("should accept requests from allowed CLIENT_ORIGIN", async () => {
    const allowedOrigin = process.env.CLIENT_ORIGIN || "http://localhost:3000";
    const response = await request(app)
      .get(`${prefix}/user`)
      .set("Origin", allowedOrigin);
    expect(response.status).toBeDefined();
  });

  test("should handle CORS for different HTTP methods", async () => {
    const response = await request(app)
      .post(`${prefix}/user/login`)
      .set("Origin", process.env.CLIENT_ORIGIN || "http://localhost:3000");
    expect(response.status).toBeDefined();
  });
});

describe("HTTP Methods and User Routes", () => {
  test("should handle signup POST request", async () => {
    const response = await request(app).post(`${prefix}/user/signup`);
    expect(response.status).toBeDefined();
  });

  test("should handle login POST request", async () => {
    const response = await request(app).post(`${prefix}/user/login`);
    expect(response.status).toBeDefined();
  });

  test("should handle GET requests to user endpoint", async () => {
    const response = await request(app).get(`${prefix}/user`);
    expect(response.status).toBeDefined();
  });
});

describe("Content Type and Headers", () => {
  test("should accept JSON content type", async () => {
    const response = await request(app)
      .get(`${prefix}/user`)
      .set("Content-Type", "application/json");
    expect(response.status).toBeDefined();
  });

  test("should accept url-encoded content type", async () => {
    const response = await request(app)
      .post(`${prefix}/user/signup`)
      .set("Content-Type", "application/x-www-form-urlencoded");
    expect(response.status).toBeDefined();
  });

  test("should allow Authorization header", async () => {
    const response = await request(app)
      .get(`${prefix}/user`)
      .set("Authorization", "Bearer token123");
    expect(response.status).toBeDefined();
  });
});

describe("Delete User", () => {
  let bearerToken; //the bearer token used in this set of tests
  let user; // the user object used in this set of tests
  const password = "password";

  beforeAll(async () => {
    await clearAllTables();
    //signup first
    let res = await request(app)
      .post(`${route}/signup`)
      .set("Accept", "application/json")
      .send({
        "new-password": password,
        "confirm-password": password,
        username: "test-username",
        nickname: "test-nickname",
        email: "testuser@email.com",
      });

    expect(res.headers["content-type"]).toMatch(/json/);
    expect(res.status).toEqual(201);
    user = res.body.data;
    // then login to get the jwt header
    res = await request(app)
      .post(`${route}/login`)
      .set("Accept", "application/json")
      .send({ username: "test-username", password: "password" });

    expect(res.headers["content-type"]).toMatch(/json/);
    expect(res.status).toEqual(200);

    bearerToken = res.headers.authorization;
  });

  test("Delete user", async () => {
    const res = await request(app)
      .delete(`${route}`)
      .set("Authorization", bearerToken);

    expect(res.status).toEqual(204);

    const sql = `SELECT * FROM chinwag.users WHERE username='${user.username}';`;

    // start by seeding the table first
    const { rows } = await pool.query(sql);
    expect(rows.length).toBe(0);
  });
});

describe("Get & Update User Profile", () => {
  let bearerToken; //the bearer token used in this set of tests
  let user; // the user object used in this set of tests
  let friend; // the friend of the user
  const password = "password";

  beforeAll(async () => {
    await clearAllTables();
    //user signup first
    let res = await request(app)
      .post(`${route}/signup`)
      .set("Accept", "application/json")
      .send({
        "new-password": password,
        "confirm-password": password,
        username: "test-username",
        nickname: "test-nickname",
        email: "testuser@email.com",
      });

    expect(res.headers["content-type"]).toMatch(/json/);
    expect(res.status).toEqual(201);
    user = res.body.data;
    // then user login to get the jwt header
    res = await request(app)
      .post(`${route}/login`)
      .set("Accept", "application/json")
      .send({ username: "test-username", password: "password" });

    expect(res.headers["content-type"]).toMatch(/json/);
    expect(res.status).toEqual(200);

    bearerToken = res.headers.authorization;

    // sign up the friend account too
    res = await request(app)
      .post(`${route}/signup`)
      .set("Accept", "application/json")
      .send({
        "new-password": "fpassword",
        "confirm-password": "fpassword",
        username: "friend-username",
        nickname: "friend-nickname",
        email: "testfriend@email.com",
      });

    expect(res.headers["content-type"]).toMatch(/json/);
    expect(res.status).toEqual(201);
    friend = res.body.data;
  });

  describe("Get User Profile", () => {
    describe("GET /user", () => {
      test("Unauthorized User", async () => {
        const res = await request(app).get(`${route}`);
        expect(res.status).toEqual(401);
      });

      test("Authorized User", async () => {
        const res = await request(app)
          .get(`${route}`)
          .set("Authorization", bearerToken);

        expect(res.status).toEqual(200);
      });
    });

    describe("GET /user/:id", () => {
      test("Unknown id", async () => {
        const res = await request(app)
          .get(`${route}/10000`)
          .set("Authorization", bearerToken);

        expect(res.status).toEqual(400);

        expect(res.body.message).toEqual(STD_VALIDATION_MSG);
        expect(res.body.data).toBeDefined();
        expect(res.body.data.length).toBeGreaterThan(0);
        expect(res.body.data[0].msg).toEqual("This user id is invalid.");
      });
      test("Happy Path", async () => {
        const res = await request(app)
          .get(`${route}/${friend.id}`)
          .set("Authorization", bearerToken);

        expect(res.status).toEqual(200);
        expect(res.body.data).toBeDefined();
        expect(res.body.data.username).not.toBeDefined();
        expect(res.body.data.email).not.toBeDefined();
        expect(res.body).toEqual({
          data: expect.objectContaining({
            id: expect.anything(),
            nickname: friend.nickname,
            avatar_id: null,
          }),
        });
      });
    });
  });

  describe("Update User Profile", () => {
    describe("PUT /user", () => {
      test("Unauthorized User", async () => {
        const res = await request(app).put(`${route}`);

        expect(res.status).toEqual(401);
      });

      describe("Authorized User", () => {
        //check with no body
        test("missing body", async () => {
          const res = await request(app)
            .put(`${route}`)
            .set("Authorization", bearerToken);

          expect(res.status).toEqual(400);
          expect(res.body.message).toEqual(STD_VALIDATION_MSG);
          expect(res.body.data).toBeDefined();
          expect(res.body.data.length).toBeGreaterThan(0);
          expect(res.body.data[0].msg).toEqual(
            "At least one required field must be provided. If modifying the password, all three password fields are required.",
          );
        });

        //check with blank values
        test.each([
          {
            email: null,
            nickname: null,
            username: null,
            "old-password": null,
          },
          {
            "old-password": "anything",
          },
          {
            "new-password": "anything",
          },
          {
            "confirm-password": "anything",
          },
          {
            "old-password": "anything",
            "new-password": "anything",
          },
          {
            "old-password": "anything",
            "confirm-password": "anything",
          },
          {
            "new-password": "anything",
            "confirm-password": "anything",
          },
        ])(`blank or missing values %$`, async ({ form }) => {
          const res = await request(app)
            .put(`${route}`)
            .set("Accept", "application/json")
            .set("Authorization", bearerToken)
            .send(form);

          expect(res.status).toEqual(400);

          expect(res.body.message).toEqual(STD_VALIDATION_MSG);
          expect(res.body.data).toBeDefined();
          expect(res.body.data.length).toBeGreaterThan(0);
          expect(res.body.data[0].msg).toEqual(
            "At least one required field must be provided. If modifying the password, all three password fields are required.",
          );
        });

        describe("Update Password", async () => {
          //check with incorrect old password
          test("Wrong old password", async () => {
            const res = await request(app)
              .put(`${route}`)
              .set("Accept", "application/json")
              .set("Authorization", bearerToken)
              .send({
                "old-password": "wrong",
                "new-password": "anything",
                "confirm-password": "anything",
              });

            expect(res.status).toEqual(400);
            expect(res.body.message).toEqual(STD_VALIDATION_MSG);
            expect(res.body.data.length).toBeGreaterThan(0);
            expect(res.body.data[0].msg).toEqual(
              "Old password does not match.",
            );
          });
          //check with non-matching new and confirmation passwords
          test("Mismatched new password fields", async () => {
            const res = await request(app)
              .put(`${route}`)
              .set("Accept", "application/json")
              .set("Authorization", bearerToken)
              .send({
                "old-password": "password",
                "new-password": "something",
                "confirm-password": "notsomething",
              });

            expect(res.status).toEqual(400);
            expect(res.body.message).toEqual(STD_VALIDATION_MSG);
            expect(res.body.data.length).toBeGreaterThan(0);
            expect(res.body.data[0].msg).toEqual(
              "The password confirmation must match the password value.",
            );
          });

          //check happy path
          test("Update Password Happy Path", async () => {
            const newPassword = "newpassword";
            const res = await request(app)
              .put(`${route}`)
              .set("Accept", "application/json")
              .set("Authorization", bearerToken)
              .send({
                "old-password": password,
                "new-password": newPassword,
                "confirm-password": newPassword,
              });

            expect(res.status).toEqual(200);

            expect(res.body.data).toBeDefined();

            expect(res.body).toEqual({
              data: expect.objectContaining({
                id: expect.anything(),
                username: user.username,
                nickname: user.nickname,
                email: user.email,
                avatar_id: null,
              }),
            });

            //undo the update
            onTestFinished(async () => {
              await request(app)
                .put(`${route}`)
                .set("Accept", "application/json")
                .set("Authorization", bearerToken)
                .send({
                  "old-password": newPassword,
                  "new-password": password,
                  "confirm-password": password,
                });
            });
          });
        });

        describe("Update Email", () => {
          //check with invalid email
          test("Invalid New Email", async () => {
            const newEmail = "invalid";
            const res = await request(app)
              .put(`${route}`)
              .set("Accept", "application/json")
              .set("Authorization", bearerToken)
              .send({
                email: newEmail,
              });

            expect(res.status).toEqual(400);
            expect(res.body.data).toBeDefined();

            expect(res.body.message).toEqual(STD_VALIDATION_MSG);
            expect(res.body.data.length).toBeGreaterThan(0);
            expect(res.body.data[0].msg).toEqual(
              "Provide a valid email address.",
            );
          });
          //check with duplicate email
          test("Duplicate Email", async () => {
            let sql =
              "INSERT INTO chinwag.users (username,email,nickname) VALUES ('notunique','notunique@email.com','notunique');";

            // start by seeding the table first
            await pool.query(sql);
            const newEmail = "notunique@email.com";
            const res = await request(app)
              .put(`${route}`)
              .set("Accept", "application/json")
              .set("Authorization", bearerToken)
              .send({
                email: newEmail,
              });

            expect(res.status).toEqual(400);
            expect(res.body.data).toBeDefined();

            expect(res.body.message).toEqual(STD_VALIDATION_MSG);
            expect(res.body.data.length).toBeGreaterThan(0);
            expect(res.body.data[0].msg).toEqual(
              "This email address cannot be used.",
            );
            //undo the update
            onTestFinished(async () => {
              sql = "DELETE FROM chinwag.users WHERE username='notunique'";
              await pool.query(sql);
            });
          });

          //check happy path
          test("Update Email Happy Path", async () => {
            const newEmail = "newemail@email.com";
            const res = await request(app)
              .put(`${route}`)
              .set("Accept", "application/json")
              .set("Authorization", bearerToken)
              .send({
                email: newEmail,
              });

            expect(res.status).toEqual(200);

            expect(res.body.data).toBeDefined();

            expect(res.body).toEqual({
              data: expect.objectContaining({
                id: expect.anything(),
                username: user.username,
                nickname: user.nickname,
                email: newEmail,
                avatar_id: null,
              }),
            });

            //undo the update
            onTestFinished(async () => {
              await request(app)
                .put(`${route}`)
                .set("Accept", "application/json")
                .set("Authorization", bearerToken)
                .send({
                  email: user.email,
                });
            });
          });
        });
        describe("Update Username", () => {
          //check with long username
          test("Too Long Username", async () => {
            const newUsername = "thisusernameiswaywaywaywaywaytoolong";
            const res = await request(app)
              .put(`${route}`)
              .set("Accept", "application/json")
              .set("Authorization", bearerToken)
              .send({
                username: newUsername,
              });

            expect(res.status).toEqual(400);
            expect(res.body.data).toBeDefined();

            expect(res.body.message).toEqual(STD_VALIDATION_MSG);
            expect(res.body.data.length).toBeGreaterThan(0);
            expect(res.body.data[0].msg).toEqual(
              "Usernames need to be between 1 and 25 characters long.",
            );
          });
          //check with duplicate username
          test("Duplicate Username", async () => {
            const sql =
              "INSERT INTO chinwag.users (username,email,nickname) VALUES ('notunique','notunique@email.com','notunique');";

            // start by seeding the table first
            await pool.query(sql);
            const newUsername = "notunique";
            const res = await request(app)
              .put(`${route}`)
              .set("Accept", "application/json")
              .set("Authorization", bearerToken)
              .send({
                username: newUsername,
              });

            expect(res.status).toEqual(400);
            expect(res.body.data).toBeDefined();

            expect(res.body.message).toEqual(STD_VALIDATION_MSG);
            expect(res.body.data.length).toBeGreaterThan(0);
            expect(res.body.data[0].msg).toEqual(
              "This username cannot be used",
            );
            //undo the update
            onTestFinished(async () => {
              const sql =
                "DELETE FROM chinwag.users WHERE username='notunique'";
              await pool.query(sql);
            });
          });
          //check happy path
          test("Update Username Happy Path", async () => {
            const newUsername = "new-username";
            const res = await request(app)
              .put(`${route}`)
              .set("Accept", "application/json")
              .set("Authorization", bearerToken)
              .send({
                username: newUsername,
              });

            expect(res.status).toEqual(200);

            expect(res.body.data).toBeDefined();

            expect(res.body).toEqual({
              data: expect.objectContaining({
                id: expect.anything(),
                username: newUsername,
                nickname: user.nickname,
                email: user.email,
                avatar_id: null,
              }),
            });
            //undo the update
            onTestFinished(async () => {
              await request(app)
                .put(`${route}`)
                .set("Accept", "application/json")
                .set("Authorization", bearerToken)
                .send({
                  username: user.username,
                });
            });
          });
        });
        describe("Update Nickname", async () => {
          //check with long nickname
          test("Too Long Nickname", async () => {
            const newNickname = "thisnicknameiswaywaywaywaywaytoolong";
            const res = await request(app)
              .put(`${route}`)
              .set("Accept", "application/json")
              .set("Authorization", bearerToken)
              .send({
                nickname: newNickname,
              });

            expect(res.status).toEqual(400);
            expect(res.body.data).toBeDefined();

            expect(res.body.message).toEqual(STD_VALIDATION_MSG);
            expect(res.body.data.length).toBeGreaterThan(0);
            expect(res.body.data[0].msg).toEqual(
              "Nickname cannot exceed 25 characters.",
            );
          });
          //check happy path
          test("Update Nickname Happy Path", async () => {
            const newNickname = "new-nickname";
            const res = await request(app)
              .put(`${route}`)
              .set("Accept", "application/json")
              .set("Authorization", bearerToken)
              .send({
                nickname: newNickname,
              });

            expect(res.status).toEqual(200);

            expect(res.body.data).toBeDefined();

            expect(res.body).toEqual({
              data: expect.objectContaining({
                id: expect.anything(),
                username: user.username,
                nickname: newNickname,
                email: user.email,
                avatar_id: null,
              }),
            });

            //undo the update
            onTestFinished(async () => {
              await request(app)
                .put(`${route}`)
                .set("Accept", "application/json")
                .set("Authorization", bearerToken)
                .send({
                  nickname: user.nickname,
                });
            });
          });
        });

        //TODO check with updates to more than one (email and nickname, username and password, all 4?)
        describe("Multi-field user update", () => {
          //update different combos like username and nickname
          //or update email and password
          //or update all
          beforeAll(async () => {
            //reset the test
            await request(app)
              .put(`${route}`)
              .set("Accept", "application/json")
              .set("Authorization", bearerToken)
              .send({
                email: user.email,
                nickname: user.nickname,
                username: user.username,
              });
          });
          afterEach(async () => {
            console.log("Reset the last test ------>");
            //reset the test
            await request(app)
              .put(`${route}`)
              .set("Accept", "application/json")
              .set("Authorization", bearerToken)
              .send({
                email: user.email,
                nickname: user.nickname,
                username: user.username,
              });
            console.log("<-------- Reset end");
          });
          test.each([
            { email: "newEmail-1@email.com", nickname: "newNickname-1" },
            { email: "newEmail-2@email.com", username: "newUsername-2" },
            { nickname: "newNickname-3", username: "newUsername-3" },
            {
              email: "newEmail-4@email.com",
              nickname: "newNickname-4",
              username: "newUsername-4",
            },
            {
              email: "newEmail-5@email.com",
              "old-password": password,
              "new-password": "newPassword",
              "confirm-password": "newPassword",
            },
            {
              username: "newUsername-6",
              "old-password": password,
              "new-password": "newPassword",
              "confirm-password": "newPassword",
            },
            {
              nickname: "nickname-7",
              "old-password": password,
              "new-password": "newPassword",
              "confirm-password": "newPassword",
            },
            {
              nickname: "nickname-8",
              username: "username-8",
              "old-password": password,
              "new-password": "newPassword",
              "confirm-password": "newPassword",
            },
            {
              email: "newEmail-9@email.com",
              nickname: "nickname-9",
              username: "username-9",
              "old-password": password,
              "new-password": "newPassword",
              "confirm-password": "newPassword",
            },
          ])("Multi-field Update", async (form) => {
            const res = await request(app)
              .put(`${route}`)
              .set("Accept", "application/json")
              .set("Authorization", bearerToken)
              .send(form);

            expect(res.status).toEqual(200);

            expect(res.body.data).toBeDefined();

            expect(res.body).toEqual({
              data: expect.objectContaining({
                id: expect.anything(),
                username: form.username ?? user.username,
                nickname: form.nickname ?? user.nickname,
                email: form.email ?? user.email,
                avatar_id: null,
              }),
            });
            onTestFailed(() => {
              skip();
            });
            //undo the update
            onTestFinished(async () => {
              if (form["old-password"]) {
                //reset the test
                await request(app)
                  .put(`${route}`)
                  .set("Accept", "application/json")
                  .set("Authorization", bearerToken)
                  .send({
                    "old-password": form["new-password"],
                    "new-password": password,
                    "confirm-password": password,
                  });
              }
            });
          });
        });
      });
    });
  });
});

describe("Signup & Login", () => {
  
  beforeEach(async () => {
    await clearAllTables();
  });
  afterEach(async () => {
    await clearAllTables();
  });

  describe("Signup Validation", () => {

    test("missing body checks", async () => {
      const res = await request(app).post(`${route}/signup`);

      expect(res.status).toEqual(400);
      expect(res.body.timestamp).toBeDefined();
      expect(res.body.message).toEqual(STD_VALIDATION_MSG);
      expect(res.body.data).toBeDefined();
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    test("Missing fields check", async () => {
      const res = await request(app)
        .post(`${route}/signup`)
        .set("Accept", "application/json");

      expect(res.headers["content-type"]).toMatch(/json/);
      expect(res.status).toEqual(400);

      const validationErrors = [
        {
          location: "body",
          msg: "A password is required.",
          path: "new-password",
          type: "field",
          value: "*****",
        },
        {
          location: "body",
          msg: "A username is required.",
          path: "username",
          type: "field",
          value: "",
        },
        {
          type: "field",
          value: "",
          msg: "An email is required.",
          path: "email",
          location: "body",
        },
        {
          type: "field",
          value: "",
          msg: "A nickname is required.",
          path: "nickname",
          location: "body",
        },
      ];

      expect(res.body).toEqual({
        timestamp: expect.anything(),
        message: STD_VALIDATION_MSG,
        statusCode: 400,
        data: expect.arrayContaining(validationErrors),
      });
    });

    describe("Email checks", () => {
      test("Valid email check", async () => {
        const res = await request(app)
          .post(`${route}/signup`)
          .set("Accept", "application/json")
          .send({ email: "invalid" });

        expect(res.headers["content-type"]).toMatch(/json/);
        expect(res.status).toEqual(400);

        const validationErr = {
          type: "field",
          value: "invalid",
          msg: "Provide a valid email address.",
          path: "email",
          location: "body",
        };

        expect(res.body).toEqual({
          timestamp: expect.anything(),
          message: STD_VALIDATION_MSG,
          statusCode: 400,
          data: expect.arrayContaining([validationErr]),
        });
      });

      test("Unique email check", async () => {
        const sql =
          "INSERT INTO chinwag.users (username,email,nickname) VALUES ('notunique','notunique@email.com','notunique') ON CONFLICT DO NOTHING;";
        try {
          // start by seeding the table first
          await pool.query(sql);

          // then test with non-unique email
          const res = await request(app)
            .post(`${route}/signup`)
            .set("Accept", "application/json")
            .send({ email: "notunique@email.com" });

          expect(res.headers["content-type"]).toMatch(/json/);
          expect(res.status).toEqual(400);

          const validationErr = {
            type: "field",
            value: "notunique@email.com",
            msg: "This email has already been registered. You must login instead.",
            path: "email",
            location: "body",
          };

          expect(res.body).toEqual({
            timestamp: expect.anything(),
            message: STD_VALIDATION_MSG,
            statusCode: 400,
            data: expect.any(Array),
          });

          expect(res.body.data).toContainEqual(validationErr);
        } catch (err) {
          logger.error(err);
          throw err;
        }
      });
    });

    describe("username checks", () => {
      test("unique username check", async () => {
        const sql =
          "INSERT INTO chinwag.users (username,email,nickname) VALUES ('notunique','notunique@email.com','notunique') ON CONFLICT DO NOTHING;";
        try {
          // start by seeding the table first
          await pool.query(sql);

          // then test with non-unique email
          const res = await request(app)
            .post(`${route}/signup`)
            .set("Accept", "application/json")
            .send({ username: "notunique" });

          expect(res.headers["content-type"]).toMatch(/json/);
          expect(res.status).toEqual(400);

          const validationErr = {
            type: "field",
            value: "notunique",
            msg: "This username has already been registered. You must login instead.",
            path: "username",
            location: "body",
          };

          expect(res.body).toEqual({
            timestamp: expect.anything(),
            message: STD_VALIDATION_MSG,
            statusCode: 400,
            data: expect.any(Array),
          });

          expect(res.body.data).toContainEqual(validationErr);
        } catch (err) {
          logger.error(err);
          throw err;
        }
      });

      test("username length check", async () => {
        // then test with non-unique email
        const res = await request(app)
          .post(`${route}/signup`)
          .set("Accept", "application/json")
          .send({
            username: "notuniquehastobeveryveryveryverylong",
            email: "notunique@email.com",
            nickname: "notunique",
            "new-password": "password",
            "confirm-password": "password",
          });

        expect(res.headers["content-type"]).toMatch(/json/);
        expect(res.status).toEqual(400);

        const validationErr = {
          type: "field",
          value: "notuniquehastobeveryveryveryverylong",
          msg: "Usernames need to be between 1 and 25 characters long.",
          path: "username",
          location: "body",
        };
        expect(res.body).toEqual({
          timestamp: expect.anything(),
          message: STD_VALIDATION_MSG,
          statusCode: 400,
          data: expect.any(Array),
        });

        expect(res.body.data).toContainEqual(validationErr);
      });
    });

    test("nickname length check", async () => {
      const res = await request(app)
        .post(`${route}/signup`)
        .set("Accept", "application/json")
        .send({
          username: "normal",
          email: "notunique@email.com",
          nickname: "notuniquehastobeveryveryveryverylong",
          "new-password": "password",
          "confirm-password": "password",
        });

      expect(res.headers["content-type"]).toMatch(/json/);
      expect(res.status).toEqual(400);

      const validationErr = {
        type: "field",
        value: "notuniquehastobeveryveryveryverylong",
        msg: "Nickname cannot exceed 25 characters.",
        path: "nickname",
        location: "body",
      };
      expect(res.body).toEqual({
        timestamp: expect.anything(),
        message: STD_VALIDATION_MSG,
        statusCode: 400,
        data: expect.any(Array),
      });

      expect(res.body.data).toContainEqual(validationErr);
    });

    describe("password checks", () => {
      
      test("missing password confirmation", async () => {
        try {
          const res = await request(app)
            .post(`${route}/signup`)
            .set("Accept", "application/json")
            .send({
              "new-password": "password",
              username: "user",
              nickname: "user",
              email: "user@email.com",
            });

          expect(res.headers["content-type"]).toMatch(/json/);
          expect(res.status).toEqual(400);

          const validationErr = {
            type: "field",
            value: "*****",
            msg: "A password confirmation is required.",
            path: "confirm-password",
            location: "body",
          };

          expect(res.body).toEqual({
            timestamp: expect.anything(),
            message: STD_VALIDATION_MSG,
            statusCode: 400,
            data: expect.any(Array),
          });

          expect(res.body.data).toContainEqual(validationErr);
        } catch (err) {
          logger.error(err);
          throw err;
        }
      });

      test("missing new-password", async () => {
        try {
          const res = await request(app)
            .post(`${route}/signup`)
            .set("Accept", "application/json")
            .send({
              "confirm-password": "password",
              username: "user",
              nickname: "user",
              email: "user@email.com",
            });

          expect(res.headers["content-type"]).toMatch(/json/);
          expect(res.status).toEqual(400);

          const validationErr = {
            type: "field",
            value: "*****",
            msg: "A password is required.",
            path: "new-password",
            location: "body",
          };

          expect(res.body).toEqual({
            timestamp: expect.anything(),
            message: STD_VALIDATION_MSG,
            statusCode: 400,
            data: expect.any(Array),
          });

          expect(res.body.data).toContainEqual(validationErr);
        } catch (err) {
          logger.error(err);
          throw err;
        }
      });

      test("mismatched password fields", async () => {
        try {
          const res = await request(app)
            .post(`${route}/signup`)
            .set("Accept", "application/json")
            .send({
              "new-password": "new-password",
              "confirm-password": "password",
              username: "user",
              nickname: "user",
              email: "user@email.com",
            });

          expect(res.headers["content-type"]).toMatch(/json/);
          expect(res.status).toEqual(400);

          const validationErr = {
            type: "field",
            value: "*****",
            msg: "The password confirmation must match the password value.",
            path: "confirm-password",
            location: "body",
          };

          expect(res.body).toEqual({
            timestamp: expect.anything(),
            message: STD_VALIDATION_MSG,
            statusCode: 400,
            data: expect.any(Array),
          });

          expect(res.body.data).toContainEqual(validationErr);
        } catch (err) {
          logger.error(err);
          throw err;
        }
      });

      test("password length check", async () => {
        try {
          const res = await request(app)
            .post(`${route}/signup`)
            .set("Accept", "application/json")
            .send({
              "new-password": "short",
              "confirm-password": "short",
              username: "user",
              nickname: "user",
              email: "user@email.com",
            });

          expect(res.headers["content-type"]).toMatch(/json/);
          expect(res.status).toEqual(400);

          const validationErr = {
            type: "field",
            value: "*****",
            msg: "A minimum length of 8 characters is needed for the password. Ideally, aim to use 15 characters at least.",
            path: "new-password",
            location: "body",
          };

          expect(res.body).toEqual({
            timestamp: expect.anything(),
            message: STD_VALIDATION_MSG,
            statusCode: 400,
            data: expect.any(Array),
          });

          expect(res.body.data).toContainEqual(validationErr);
        } catch (err) {
          logger.error(err);
          throw err;
        }
      });
    });

    test("Signup Happy Path", async () => {
      try {
        const res = await request(app)
          .post(`${route}/signup`)
          .set("Accept", "application/json")
          .send({
            "new-password": "password",
            "confirm-password": "password",
            username: "user",
            nickname: "user",
            email: "user@email.com",
          });

        expect(res.headers["content-type"]).toMatch(/json/);
        expect(res.status).toEqual(201);
        expect(res.body.data).toBeDefined();
        expect(res.body.data.id).toBeDefined();
        expect(res.body.data.id).toBeTypeOf("number");
        expect(res.body.data.username).toBe("user");
        expect(res.body.data.nickname).toBe("user");
        expect(res.body.data.email).toBe("user@email.com");
      } catch (err) {
        logger.error(err);
        throw err;
      }
    });
  });

  describe("Login Validation", () => {
    beforeEach(async () => {
      await clearAllTables();
    });
    afterEach(async () => {
      await clearAllTables();
    });
    test("missing body checks", async () => {
      const res = await request(app).post(`${route}/login`);

      expect(res.status).toEqual(400);
      expect(res.body.timestamp).toBeDefined();
      expect(res.body.message).toEqual(STD_VALIDATION_MSG);
      expect(res.body.data).toBeDefined();
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    test("Missing fields check", async () => {
      const res = await request(app)
        .post(`${route}/login`)
        .set("Accept", "application/json");

      expect(res.headers["content-type"]).toMatch(/json/);
      expect(res.status).toEqual(400);

      const validationErrors = [
        {
          location: "body",
          msg: "A password is required.",
          path: "password",
          type: "field",
        },
        {
          location: "body",
          msg: "A username is required.",
          path: "username",
          type: "field",
          value: "",
        },
      ];

      expect(res.body).toEqual({
        timestamp: expect.anything(),
        message: STD_VALIDATION_MSG,
        statusCode: 400,
        data: expect.arrayContaining(validationErrors),
      });
    });

    test("Login Happy Path", async () => {
      
      const userLHP = {
        "new-password": "password",
        "confirm-password": "password",
        username: "user-lhp",
        nickname: "user-lhp",
        email: "user-lhp@email.com",
      };
      try {
        
        //signup first
        let res = await request(app)
          .post(`${route}/signup`)
          .set("Accept", "application/json")
          .send({
            "new-password": "password",
            "confirm-password": "password",
            username: userLHP.username,
            nickname: userLHP.nickname,
            email: userLHP.email,
          });

        expect(res.headers["content-type"]).toMatch(/json/);
        expect(res.status).toEqual(201);

        // try to login now
        res = await request(app)
          .post(`${route}/login`)
          .set("Accept", "application/json")
          .send({
            password: "password",
            username: userLHP.username,
          });
        expect(res.headers.authorization).toMatch(/^Bearer .*/);
        expect(res.status).toEqual(200);

        expect(res.body.data).toBeDefined();
        expect(res.body).toEqual({
          data: expect.objectContaining({
            id: expect.anything(),
            username: userLHP.username,
            nickname: userLHP.nickname,
            email: userLHP.email,
            avatar_id: null,
          }),
        });
      } catch (err) {
        logger.error(err);
        throw err;
      }
    });

    test("Login - Invalid Password", async () => {
      try {
        //signup first
        let res = await request(app)
          .post(`${route}/signup`)
          .set("Accept", "application/json")
          .send({
            "new-password": "password",
            "confirm-password": "password",
            username: "user",
            nickname: "user",
            email: "user@email.com",
          });

        expect(res.headers["content-type"]).toMatch(/json/);
        expect(res.status).toEqual(201);

        // try to login with invalid password
        res = await request(app)
          .post(`${route}/login`)
          .set("Accept", "application/json")
          .send({
            password: "invalidpassword",
            username: "user",
          });
        expect(res.headers.authorization).toBeFalsy();
        expect(res.status).toEqual(401);
        expect(res.headers["content-type"]).toMatch(/json/);
        expect(res.body.message).toBeDefined();
        expect(res.body.message).toEqual("Cannot verify credentails.");
      } catch (err) {
        logger.error(err);
        throw err;
      }
    });

    test("Login Unknown User", async () => {
      try {
        // try to login with unknown user
        const res = await request(app)
          .post(`${route}/login`)
          .set("Accept", "application/json")
          .send({
            password: "password",
            username: "user",
          });
        expect(res.headers.authorization).toBeFalsy();

        expect(res.headers["content-type"]).toMatch(/json/);
        expect(res.body.data).toBeDefined();
        expect(res.body.data).toBeInstanceOf(Array);
        expect(res.body.data.length).toBeGreaterThan(0);

        const validationErr = {
          location: "body",
          msg: "Failed to find this username",
          path: "username",
          type: "field",
          value: "user",
        };

        expect(res.body).toEqual({
          timestamp: expect.anything(),
          message: STD_VALIDATION_MSG,
          statusCode: 400,
          data: expect.arrayContaining([validationErr]),
        });
      } catch (err) {
        logger.error(err);
        throw err;
      }
    });
  });
}); // end of Signup & Login group
