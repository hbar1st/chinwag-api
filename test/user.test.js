/* eslint-disable no-console */

import { describe, test, expect, afterEach, beforeAll} from "vitest";
import request from "supertest";

import { logger } from "../src/utils/logger.js";
import { pool } from "../src/db/pool.js";

import { clearAllTables } from "../src/db/dbutil.js";

const STD_VALIDATION_MSG = "Action has failed due to some validation errors";
let app;
let prefix;
let route;

/*
beforeEach(() => {
  for (const t of logger.transports) {
t.silent = true;
}
});

afterEach(async (ctx) => {
  await clearAllTables();
if (ctx.task.result?.state === "fail") {
for (const t of logger.transports) {
t.silent = false;
}
}
});

*/
afterEach(async () => {
  await clearAllTables();
});

beforeAll(async () => {
  const mod = await import("../src/serverSetup.js");
  app = mod.app;
  prefix = mod.prefix;
  route = `${prefix}/user`;
});


describe("CORS Configuration", () => {
  test("should accept requests with no origin header", async () => {
    const response = await request(app).get(`${prefix}/user`);
    expect(response.status).toBeDefined();
  });
  
  test("should accept requests from allowed CLIENT_ORIGIN", async () => {
    const allowedOrigin =
    process.env.CLIENT_ORIGIN || "http://localhost:3000";
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

describe("Signup and Login", () => {
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
          location: "body"
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
        "INSERT INTO chinwag.users (username,email,nickname) VALUES ('notunique','notunique@email.com','notunique');";
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
            data: expect.any(Array)
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
        "INSERT INTO chinwag.users (username,email,nickname) VALUES ('notunique','notunique@email.com','notunique');";
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
        
      })
      
      test("username length check", async () => {
        
        // then test with non-unique email
        const res = await request(app)
        .post(`${route}/signup`)
        .set("Accept", "application/json")
        .send({ username: "notuniquehastobeveryveryveryverylong", email: "notunique@email.com", nickname: "notunique", "new-password": "password", "confirm-password": "password" });
        
        
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
      })
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
      test("missing password", async () => {
        try {
          
          const res = await request(app)
          .post(`${route}/signup`)
          .set("Accept", "application/json")
          .send({ "new-password":"password", username: "user", nickname:"user", email:"user@email.com" });
          
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
      
      test("missing password", async () => {
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
    
  })
})

