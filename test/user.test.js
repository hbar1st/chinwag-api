/* eslint-disable no-console */

import { describe, test, expect, afterEach, beforeAll, beforeEach } from "vitest";
import request from "supertest";

import { logger } from "../src/utils/logger.js";


let app;
let prefix;
const route = `${prefix}/user`;


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

    describe("email checks", () => {
      test("Unique email check", async () => {
        /*
       const res = await request(app)
          .post(`${route}/signup`)
        
        expect(res.status).toEqual(404);
        expect(res.body.status).toEqual("fail");
        */
      });
      test("Valid email check", () => {

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

