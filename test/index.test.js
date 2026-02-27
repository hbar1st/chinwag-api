/* eslint-disable no-console */
import { expect, test, describe, beforeAll } from "vitest";
import request from "supertest";

let app;
let prefix;

beforeAll(async () => {
  const mod = await import("../src/serverSetup.js");
  app = mod.app;
  prefix = mod.prefix;
});

test("should correctly construct the version prefix", async () => {
  expect(prefix).toBe("/v1");
});

describe("serverSetup - Express App Configuration", () => {
  test("GET invalid route -> 404", async () => {
    const route = "/bad-route";
    const res = await request(app)
      .get(route)

      .set("Accept", "application/json");

    expect(res.status).toEqual(404);
    expect(res.body.status).toEqual("fail");
    expect(res.body.message).toEqual(
      `This is a surprising request. I can't find ${route} on this server!`,
    );
  });

  /** this route gets a basic description of the api */
  test("GET / success", async () => {
    const route = "/";
    const res = await request(app)
      .get(route)

      .set("Accept", "text/html; charset=utf-8");

    expect(res.status).toEqual(200);
    expect(res.type).toMatch(/html/);
  });

});