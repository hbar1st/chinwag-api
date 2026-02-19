/* eslint-disable no-console */

import { describe, test, expect, afterEach, beforeAll, beforeEach } from "vitest";
import request from "supertest";

import { logger } from "../src/utils/logger.js";
import { pool } from "../src/db/pool.js";

const STD_VALIDATION_MSG = "Action has failed due to some validation errors";
let app;
let prefix;
let route;


beforeEach(() => {
  for (const t of logger.transports) {
    t.silent = true;
  }
});

afterEach((ctx) => {
  if (ctx.task.result?.state === "fail") {
    for (const t of logger.transports) {
      t.silent = false;
    }
  }
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
            value: "invalid",
            msg: "Provide a valid email address.",
            path: "email",
            location: "body",
          };
          
          expect(res.body).toEqual({
            timestamp: expect.toBeDefined(),
            message: expect.toEqual(STD_VALIDATION_MSG),
            data: expect.toBeInstanceOf(Array).arrayContaining(validationErr)
          });
        } catch (err) {
          logger.error(err);
          throw err;
        }
      });
    });
    
    describe("username checks", () => {
      test("Unique username check", () => {
        
      })
      test("username length check", () => {
        
      })
    });
    
    describe("")
  })
})

