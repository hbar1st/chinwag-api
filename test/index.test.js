/* eslint-disable no-console */
import { app } from "../src/serverSetup";

import {
  expect,
  test,
  describe,
  beforeAll,
  beforeEach,
  afterAll,
} from "vitest";
import request from "supertest";
import { clearGameAndSessionRows } from "../src/db/gameSetup";

import util from "node:util";

test("GET invalid route -> 404", async () => {
  const route = "/bad-route";
  const res = await request(app)
    .get(route)

    .set("Accept", "application/json");

  expect(res.status).toEqual(404);
  expect(res.body.status).toEqual("fail");
  expect(res.body.message).toEqual(
    `This is a surprising request. I can't find ${route} on this server!`
  );
});

/** this route gets a basic description of the api */
test("GET / success", async () => {
  const route = "/";
  const res = await request(app)
    .get(route)

    .set("Accept", "application/json");

  expect(res.status).toEqual(200);
  expect(res.body.message).toEqual(
    "The Where's Waldo API supports hbar1st's TOP Where's Waldo project."
  );
});

/** check that we get a cookie */
test("GET / gives a cookie", async () => {
  const route = "/scene/1";
  const res = await request
    .agent(app)
    .get(route)

    .set("Accept", "application/json");

  expect(res.status).toEqual(200);
  expect(res.headers["set-cookie"]).toBeDefined();

  console.log("cookie: ", res.headers["set-cookie"]);
});

describe("initial game setup", () => {
  const agent = request.agent(app);

  /** get all available scenes and the img urls associated with them */
  test("GET /scene", async () => {
    const route = "/scene";
    const res = await agent
      .get(route)

      .set("Accept", "application/json");

    expect(res.status).toEqual(200);
    expect(res.headers["set-cookie"]).toBeDefined();
    expect(res.body.scenes).toBeDefined();
    expect(res.body.scenes).toHaveLength(2);

    const scene1Obj = {
      id: 1,
      level: 2,
      url: "https://res.cloudinary.com/hbrwdfccc/image/upload/v1763249346/Where%27s%20Waldo/Wheres-Waldo-Space-Station-Super-High-Resolution-scaled.jpg",
    };
    const scene2Obj = {
      id: 2,
      level: 1,
      url: "https://res.cloudinary.com/hbrwdfccc/image/upload/v1765246758/Where%27s%20Waldo/candy-scene-wally-odlaw.jpg",
    };

    res.body.scenes.forEach(value => expect(value).toBeOneOf([scene1Obj, scene2Obj]))
  });

  /** this route gets the url of the image we are playing where's waldo with */
  test("GET /scene/:id", async () => {
    // first get all available scenes
    const route = "/scene";
    const res = await agent
      .get(route)

      .set("Accept", "application/json");

    expect(res.status).toEqual(200);
    expect(res.body.scenes).toBeDefined();
    expect(res.body.scenes.length).toBeGreaterThanOrEqual(2);

    res.body.scenes.forEach(async (el) => {
      const scene = await agent.get(`/scene/${el.id}`);
      expect(scene.status).toEqual(200);
      expect(scene.body.id).toBeDefined();
      expect(scene.body.id).toBeTypeOf("number");
      expect(scene.body.url).toBeDefined();
      expect(scene.body.url).toBeTypeOf("string");
      expect(scene.body.url).toMatch(/^https:\/\/.*\.jpg/);
    });
  });

  test("GET /scene/:id/characters invalid scene id", async () => {
    const sceneId = "a";
    console.log(`invalid scene id: ${sceneId}`);
    const route = `/scene/${sceneId}/characters`;
    const res = await agent
      .get(route)

      .set("Accept", "application/json");

    expect(res.status).toEqual(400);
    expect(res.body.timestamp).toBeDefined();
    expect(res.body.message).toEqual(
      "Action has failed due to some validation errors"
    );
    expect(res.body.details).toBeDefined();
    expect(res.body.details.length).toEqual(1);

    const resDetails = {
      type: "field",
      value: "a",
      msg: "The scene id should be an int",
      path: "id",
      location: "params",
    };
    expect(res.body.details[0]).toMatchObject(resDetails);

    console.log("cookie: ", res.headers["set-cookie"]);
  });

  test("GET /scene/:id/characters scene id does not exist", async () => {
    const sceneId = 0;
    console.log(`invalid scene id: ${sceneId}`);
    const route = `/scene/${sceneId}/characters`;
    const res = await agent
      .get(route)

      .set("Accept", "application/json");

    expect(res.status).toEqual(400);
    expect(res.body.timestamp).toBeDefined();
    expect(res.body.message).toEqual(
      "Action has failed due to some validation errors"
    );
    expect(res.body.details).toBeDefined();
    expect(res.body.details.length).toEqual(1);

    const resDetails = {
      type: "field",
      value: 0,
      msg: "This scene id is invalid.",
      path: "id",
      location: "params",
    };
    expect(res.body.details[0]).toMatchObject(resDetails);
  });

  /** this route gets the character names that belong to a specific scene */
  test("GET /scene/:id/characters happy path", async () => {

    const sceneId = 1;

    if (sceneId) {
      console.log(`try to get characters for scene id: ${sceneId}`);
      const route = `/scene/1/characters`;
      const res = await agent
        .get(route)

        .set("Accept", "application/json");

      expect(res.status).toEqual(200);
      expect(res.body.characters).toBeDefined();
      expect(res.body).toEqual({
        message: "success",
        characters: expect.arrayContaining([
          {
            name: "Odlaw",
            url: "https://res.cloudinary.com/hbrwdfccc/image/upload/v1763875339/Where%27s%20Waldo/odlaw.png",
          },
          {
            name: "Waldo",
            url: "https://res.cloudinary.com/hbrwdfccc/image/upload/v1764635698/Where%27s%20Waldo/wally_e_background_removal_f_png.png",
          },
          {
            name: "Wizard Whitebeard",
            url: "https://res.cloudinary.com/hbrwdfccc/image/upload/v1764420240/Where%27s%20Waldo/wizard.png",
          },
        ]),
      });
    }
  });

  test.each([1, 2])("GET /scene/%i/game", async (id) => {
    const res = await agent

      .get(`/scene/${id}/game`)

      .set("Accept", "application/json");

    expect(res.status).toEqual(200);
  });

  test("GET /scene/:id/game", async () => {
    const res = await agent

      .get("/scene/1/game")

      .set("Accept", "application/json");

    expect(res.status).toEqual(200);
    expect(res.body.message).toEqual("success");
    expect(res.body.game).toBeTypeOf("object");
    expect(res.body.game).toHaveProperty("id");
    expect(res.body.game).toHaveProperty("username", "anonymous");
    expect(res.body.game).toHaveProperty("start_time");
    expect(res.body.game.start_time).toBeTypeOf("number");
    expect(res.body.game).toHaveProperty("end_time", null);
    expect(res.body.game).toHaveProperty("scene");
    expect(res.body.game.scene).toHaveProperty("characters");
    expect(res.body.game.scene).toEqual({
      id: expect.toSatisfy((input) => Number.isInteger(input)),
      level: 2,
      url: expect.stringMatching(/^https:\/\/.*\.jpg/),
      characters: expect.arrayContaining([
        "Odlaw",
        "Waldo",
        "Wizard Whitebeard",
      ]),
    });
  });
});

describe("test answers", () => {
  let agent;

  beforeAll(async () => {
    await clearGameAndSessionRows();

    agent = request.agent(app);
    const route = "/scene/1/game";
    await agent
      .get(route)

      .set("Accept", "application/json");
  });

  afterAll(async () => {
    await clearGameAndSessionRows();
  });

  test("PUT /scene/1/game/answer?x=0&y=0 missing character name", async () => {
    const res = await agent
      .put(`/scene/1/game/answer`)

      .query({ x: 0 })
      .query({ y: 0 })

      .set("Accept", "application/json");

    expect(res.body).toMatchObject({
      statusCode: 400,
      message: "Action has failed due to some validation errors",
      timestamp: expect.stringContaining("GMT"),
      details: expect.arrayContaining([
        {
          type: "field",
          value: "",
          msg: "A character is required to complete the request",
          path: "character",
          location: "query",
        },
      ]),
    });
  });

  test("PUT /scene/1/game/answer?x=0&y=0&character=invalid invalid character name", async () => {
    const res = await agent
      .put(`/scene/1/game/answer`)

      .query({ x: 0 })
      .query({ y: 0 })
      .query({ character: "invalid" })

      .set("Accept", "application/json");

    expect(res.body).toMatchObject({
      statusCode: 400,
      message: "Action has failed due to some validation errors",
      timestamp: expect.stringContaining("GMT"),
      details: expect.arrayContaining([
        {
          type: "field",
          value: "invalid",
          msg: "The character name invalid is invalid. Must be one of [Odlaw,Waldo,Wizard Whitebeard]",
          path: "character",
          location: "query",
        },
      ]),
    });
  });

  test("PUT /scene/1/game/answer?y=0&character=Odlaw missing x", async () => {
    const res = await agent
      .put(`/scene/1/game/answer`)

      .query({ y: 0 })
      .query({ character: "Odlaw" })

      .set("Accept", "application/json");

    expect(res.body).toMatchObject({
      statusCode: 400,
      message: "Action has failed due to some validation errors",
      timestamp: expect.stringContaining("GMT"),
      details: expect.arrayContaining([
        {
          type: "field",
          value: "",
          msg: "an x coordinate is required",
          path: "x",
          location: "query",
        },
        {
          type: "field",
          value: "",
          msg: "the x coordinate should be a number between 0 and 100",
          path: "x",
          location: "query",
        },
      ]),
    });
  });

  test.each([[-1], [101], ["a"]])(
    "PUT /scene/1/game/answer?x=%s&y=0&character=Odlaw invalid x",
    async (x) => {
      const res = await agent
        .put(`/scene/1/game/answer`)

        .query({ x: x })
        .query({ y: 0 })
        .query({ character: "Odlaw" })

        .set("Accept", "application/json");

      expect(res.body).toMatchObject({
        statusCode: 400,
        message: "Action has failed due to some validation errors",
        timestamp: expect.stringContaining("GMT"),
        details: expect.arrayContaining([
          {
            type: "field",
            value: `${x}`,
            msg: "the x coordinate should be a number between 0 and 100",
            path: "x",
            location: "query",
          },
        ]),
      });
    }
  );

  test("PUT /scene/1/game/answer?x=0&character=Odlaw missing y", async () => {
    const res = await agent
      .put(`/scene/1/game/answer`)

      .query({ x: 0 })
      .query({ character: "Odlaw" })

      .set("Accept", "application/json");

    expect(res.body).toMatchObject({
      statusCode: 400,
      message: "Action has failed due to some validation errors",
      timestamp: expect.stringContaining("GMT"),
      details: expect.arrayContaining([
        {
          type: "field",
          value: "",
          msg: "a y coordinate is required",
          path: "y",
          location: "query",
        },
        {
          type: "field",
          value: "",
          msg: "the y coordinate should be a number between 0 and 100",
          path: "y",
          location: "query",
        },
      ]),
    });
  });

  test.each([[-1], [101], ["a"]])(
    "PUT /scene/1/game/answer?x=0&y=%s&character=Odlaw invalid y",
    async (y) => {
      const res = await agent
        .put(`/scene/1/game/answer`)

        .query({ y: y })
        .query({ x: 0 })
        .query({ character: "Odlaw" })

        .set("Accept", "application/json");

      expect(res.body).toMatchObject({
        statusCode: 400,
        message: "Action has failed due to some validation errors",
        timestamp: expect.stringContaining("GMT"),
        details: expect.arrayContaining([
          {
            type: "field",
            value: `${y}`,
            msg: "the y coordinate should be a number between 0 and 100",
            path: "y",
            location: "query",
          },
        ]),
      });
    }
  );

  test("PUT /scene/1/game/answer?x=0&y=0&character=Odlaw wrong location", async () => {
    const res = await agent
      .put(`/scene/1/game/answer`)

      .query({ y: 0 })
      .query({ x: 0 })
      .query({ character: "Odlaw" })

      .set("Accept", "application/json");

    console.log(res.body);
    expect(res.status).toEqual(200);
    expect(res.body).toMatchObject({
      message: "Wrong answer",
      x: "0",
      y: "0",
      character: "Odlaw",
    });
  });

  test("PUT /scene/1/game/answer?x=77.86&y=57.39&character=Waldo wrong character", async () => {
    const res = await agent
      .put(`/scene/1/game/answer`)

      .query({ x: 0.07 })
      .query({ y: 24.82 })
      .query({ character: "Waldo" })

      .set("Accept", "application/json");

    console.log(res.body);
    expect(res.status).toEqual(200);
    expect(res.body).toMatchObject({
      message: "Wrong answer",
      x: "0.07",
      y: "24.82",
      character: "Waldo",
    });
  });

  test.each([
    { x: 6.87, y: 68.55, character: "Odlaw" },
    { x: 77.86, y: 57.39, character: "Wizard Whitebeard" },
    { x: 40.45, y: 62.17, character: "Waldo" },
  ])(
    "PUT /scene/1/game/answer?x=$x&y=$y&character=$character correct answer",
    async ({ x, y, character }) => {
      const res = await agent
        .put(`/scene/1/game/answer`)

        .query({ x: x })
        .query({ y: y })
        .query({ character: character })

        .set("Accept", "application/json");

      expect(res.status).toEqual(201);
      expect(res.body).toMatchObject({
        message: "Correct answer",
        x: `${x}`,
        y: `${y}`,
        character: character,
      });
    }
  );
});

describe("test top ten", () => {
  let agent;
  beforeAll(async () => {
    await clearGameAndSessionRows();
  });

  beforeEach(async () => {
    agent = request.agent(app);
    const route = "/scene/1/game";
    const res = await agent
      .get(route)

      .set("Accept", "application/json");

    expect(res.status).toEqual(200);
  });

  afterAll(async () => {
    await clearGameAndSessionRows();
  });

  test.each([100, 200, 300, 400, 500, 600, 700, 800, 900, 1000])(
    "PUT /scene/1/game/answer all characters found & top ten %#",
    async (delay) => {
      const res1 = await agent
        .put("/scene/1/game/answer")
        .query({ x: 6.87, y: 68.55, character: "Odlaw" })
        .set("Accept", "application/json");

      expect(res1.status).toEqual(201); //first correct answer

      const res2 = await agent
        .put("/scene/1/game/answer")
        .query({ x: 40.45, y: 62.17, character: "Waldo" })
        .set("Accept", "application/json");

      expect(res2.status).toEqual(201); //second correct answer

      const wait = util.promisify(setTimeout);
      await wait(delay);

      const res3 = await agent
        .put("/scene/1/game/answer")
        .query({ x: 77.86, y: 57.39, character: "Wizard Whitebeard" })
        .set("Accept", "application/json");

      expect(res3.status).toEqual(201);
      expect(res3.body).toMatchObject({
        message: "Correct answer",
        x: "77.86",
        y: "57.39",
        character: "Wizard Whitebeard",
        inTopTen: true,
      });
      expect(res3.body).toHaveProperty("elapsed_time");

      // test trying to record username since elapsed_time is in top ten
      const username = `bestOfTheBest-${delay}`;
      const game = await agent
        .put("/scene/1/game")

        .set("Accept", "application/json")

        .send({ username });

      expect(game.status).toEqual(200);
      expect(game.body.message).toEqual("Success");
      expect(game.body).toHaveProperty("game");
      expect(game.body.game).toMatchObject({
        username,
      });

      // confirm top ten
      const topTen = await agent
        .get(`/scene/1/topten`)
        .set("Accept", "application/json");

      expect(topTen.status).toEqual(200);
      expect(topTen.body).toHaveProperty("topTen");
      expect(topTen.body).toHaveProperty("id");
      expect(topTen.body).toHaveProperty("elapsed_time"); // this is actually the elapsed time
      expect(topTen.body.topTen.length).toBeGreaterThanOrEqual(1);
      const topTenUsernames = [];

      for (let i = 0; i < topTen.body.topTen.length; i++) {
        topTenUsernames.push(topTen.body.topTen[i].username);

        expect(topTen.body.topTen[i].id).toBeDefined();
        expect(topTen.body.topTen[i].elapsed_time).toBeDefined();
      }
      expect(topTenUsernames).toContain(username);
    }
  );

  test("GET /scene/1/game/answer after incorrect answer", async () => {
    const res1 = await agent
      .put("/scene/1/game/answer")
      .query({ x: 9, y: 9, character: "Odlaw" })
      .set("Accept", "application/json");

    expect(res1.status).toEqual(200); //incorrect answer

    const getRes = await agent
      .get("/scene/1/game/answer")
      .set("Accept", "application/json");

    expect(getRes.status).toEqual(200);
    expect(getRes.body).toBeDefined();
    expect(getRes.body.gameAnswers).toBeDefined();
    expect(getRes.body).toEqual({
      message: "success",
      gameAnswers: expect.arrayContaining([]),
    });
  });

  test("GET /scene/1/game/answer after one answer logged", async () => {
    const res1 = await agent
      .put("/scene/1/game/answer")
      .query({ x: 6.87, y: 68.55, character: "Odlaw" })
      .set("Accept", "application/json");

    expect(res1.status).toEqual(201); //first correct answer

    const getRes = await agent
      .get("/scene/1/game/answer")
      .set("Accept", "application/json");

    expect(getRes.status).toEqual(200);
    expect(getRes.body).toBeDefined();
    expect(getRes.body.gameAnswers).toBeDefined();
    expect(getRes.body).toEqual({
      message: "success",
      gameAnswers: expect.arrayContaining([
        { x: 6.87, y: 68.55, name: "Odlaw" },
      ]),
    });
  });

  test("PUT /scene/1/game/answer trying to put after all correct answers were already found", async () => {
    const res1 = await agent
      .put("/scene/1/game/answer")
      .query({ x: 6.87, y: 68.55, character: "Odlaw" })
      .set("Accept", "application/json");

    expect(res1.status).toEqual(201); //first correct answer

    const res2 = await agent
      .put("/scene/1/game/answer")
      .query({ x: 40.45, y: 62.17, character: "Waldo" })
      .set("Accept", "application/json");

    expect(res2.status).toEqual(201); //second correct answer

    const res3 = await agent
      .put("/scene/1/game/answer")
      .query({ x: 77.86, y: 57.39, character: "Wizard Whitebeard" })
      .set("Accept", "application/json");

    expect(res3.status).toEqual(201);
    expect(res3.body).toHaveProperty("elapsed_time"); // this is the last needed answer

    // now try to add another answer (duplicate one)
    const res4 = await agent
      .put("/scene/1/game/answer") // try to enter a fourth correct answer with slightly different values
      .query({ x: 77.3, y: 57, character: "Wizard Whitebeard" })
      .set("Accept", "application/json");

    expect(res4.status).toEqual(201);

    // check the list of answers is still 3, not 4, and new answer is there overwriting the old one
    const getRes = await agent
      .get("/scene/1/game/answer")
      .set("Accept", "application/json");

    expect(getRes.status).toEqual(200);
    expect(getRes.body).toBeDefined();
    expect(getRes.body.gameAnswers).toBeDefined();
    expect(getRes.body).toEqual({
      message: "success",
      gameAnswers: expect.arrayContaining([
        { x: 77.3, y: 57, name: "Wizard Whitebeard" },
      ]),
    });
    expect(getRes.body.gameAnswers.length).toEqual(3);
  });

  test("PUT /scene/1/game/answer trying to put invalid answer after all correct answers were already found", async () => {
    const res1 = await agent
      .put("/scene/1/game/answer")
      .query({ x: 6.87, y: 68.55, character: "Odlaw" })
      .set("Accept", "application/json");

    expect(res1.status).toEqual(201); //first correct answer

    const res2 = await agent
      .put("/scene/1/game/answer")
      .query({ x: 40.45, y: 62.17, character: "Waldo" })
      .set("Accept", "application/json");

    expect(res2.status).toEqual(201); //second correct answer

    const res3 = await agent
      .put("/scene/1/game/answer")
      .query({ x: 77.86, y: 57.39, character: "Wizard Whitebeard" })
      .set("Accept", "application/json");

    expect(res3.status).toEqual(201);
    expect(res3.body).toHaveProperty("elapsed_time"); // this is the last needed answer

    // now try to add another answer (duplicate one)
    const res4 = await agent
      .put("/scene/1/game/answer") // try to enter a fourth correct answer with incorrect
      .query({ x: 0, y: 57, character: "Wizard Whitebeard" })
      .set("Accept", "application/json");

    expect(res4.status).toEqual(200);

    // check the list of answers is still 3, not 4, and new answer is not there
    const getRes = await agent
      .get("/scene/1/game/answer")
      .set("Accept", "application/json");

    expect(getRes.status).toEqual(200);
    expect(getRes.body).toBeDefined();
    expect(getRes.body.gameAnswers).toBeDefined();
    expect(getRes.body).toEqual({
      message: "success",
      gameAnswers: expect.arrayContaining([
        { x: 77.86, y: 57.39, name: "Wizard Whitebeard" },
      ]),
    });
    expect(getRes.body.gameAnswers.length).toEqual(3);
  });

  test("PUT /scene/1/game/answer not in top ten", async () => {
    const res1 = await agent
      .put("/scene/1/game/answer")
      .query({ x: 6.87, y: 68.55, character: "Odlaw" })
      .set("Accept", "application/json");

    expect(res1.status).toEqual(201); //first correct answer

    const res2 = await agent
      .put("/scene/1/game/answer")
      .query({ x: 40.45, y: 62.17, character: "Waldo" })
      .set("Accept", "application/json");

    expect(res2.status).toEqual(201); //second correct answer

    // wait 1/4 second before ending the game
    const wait = util.promisify(setTimeout);
    await wait(1250);

    const res3 = await agent
      .put("/scene/1/game/answer")
      .query({ x: 77.86, y: 57.39, character: "Wizard Whitebeard" })
      .set("Accept", "application/json");

    expect(res3.status).toEqual(201);
    expect(res3.body).toMatchObject({
      message: "Correct answer",
      x: "77.86",
      y: "57.39",
      character: "Wizard Whitebeard",
      inTopTen: false,
    });
    expect(res3.body).toHaveProperty("elapsed_time");

    // test trying to record username when he's not in top ten
    const game = await agent
      .put("/scene/1/game")

      .set("Accept", "application/json")

      .send({ username: "hacker" });

    expect(game.status).toEqual(400);
    expect(game.body.message).toEqual("This game is not in the top ten");
  });

  test("GET /scene/:id/topten happy path", async () => {

    const sceneId = 1;

    const topTen = await agent
      .get(`/scene/${sceneId}/topten`)
      .set("Accept", "application/json");

    expect(topTen.status).toEqual(200);
    expect(topTen.body).toHaveProperty("topTen");
    expect(topTen.body.topTen).toHaveLength(10);
    for (let i = 0; i < 10; i++) {
      expect(topTen.body.topTen[i]).toHaveProperty("username");
      expect(topTen.body.topTen[i]).toHaveProperty("id");
      expect(topTen.body.topTen[i]).toHaveProperty("elapsed_time");
    }
  });

  test("PUT /scene/1/game - username blank in request body", async () => {
    const game = await agent
      .put("/scene/1/game")

      .set("Accept", "application/json")

      .send({ username: "" });

    expect(game.status).toEqual(400);
    expect(game.body.message).toEqual(
      "Action has failed due to some validation errors"
    );

    expect(game.body.details).toBeDefined();
    expect(game.body.details.length).toEqual(2);
    const resDetails = {
      type: "field",
      value: "",
      msg: "username should not be blank",
      path: "username",
      location: "body",
    };
    expect(game.body.details[0]).toMatchObject(resDetails);
  });

  test("PUT /scene/1/game - username not found in request body", async () => {
    const game = await agent
      .put("/scene/1/game")
      .set("Accept", "application/json");

    expect(game.status).toEqual(400);
    expect(game.body.message).toEqual(
      "Action has failed due to some validation errors"
    );
    console.log(game.body);
    expect(game.body.details).toBeDefined();
  });

  //end of describe section
});

describe("test ongoing game", () => {
  let agent;

  beforeEach(async () => {
    agent = request.agent(app);
    const route = "/scene/1/game";
    const res = await agent.get(route).set("Accept", "application/json");

    expect(res.status).toEqual(200);
  });

  beforeAll(async () => {
    await clearGameAndSessionRows();
  });

  test("GET /scene/1/game after one correct answer", async () => {
    const res1 = await agent
      .put("/scene/1/game/answer")
      .query({ x: 6.87, y: 68.55, character: "Odlaw" })
      .set("Accept", "application/json");

    expect(res1.status).toEqual(201); //first correct answer

    const res = await agent

      .get("/scene/1/game")

      .set("Accept", "application/json");

    expect(res.status).toEqual(200);
    expect(res.body.message).toEqual("success");
    expect(res.body.game).toBeTypeOf("object");
    expect(res.body.game).toHaveProperty("id");
    expect(res.body.game).toHaveProperty("username", "anonymous");
    expect(res.body.game).toHaveProperty("start_time");
    expect(res.body.game.start_time).toBeTypeOf("number");
    expect(res.body.game).toHaveProperty("end_time", null);
    expect(res.body.game).toHaveProperty("scene");
    expect(res.body.game.scene).toHaveProperty("characters");
    expect(res.body.game.scene.characters).toHaveLength(2);
    expect(res.body.game.scene).toEqual({
      id: expect.toSatisfy((input) => Number.isInteger(input)),
      level: 2,
      url: expect.stringMatching(/^https:\/\/.*\.jpg/),
      characters: expect.arrayContaining(["Waldo", "Wizard Whitebeard"]),
    });
  });

  test("GET /scene/1/game after 2 correct answers", async () => {
    const res1 = await agent
      .put("/scene/1/game/answer")
      .query({ x: 6.87, y: 68.55, character: "Odlaw" })
      .set("Accept", "application/json");

    expect(res1.status).toEqual(201); //first correct answer

    const res2 = await agent
      .put("/scene/1/game/answer")
      .query({ x: 40.45, y: 62.17, character: "Waldo" })
      .set("Accept", "application/json");

    expect(res2.status).toEqual(201); //second correct answer

    const res = await agent

      .get("/scene/1/game")

      .set("Accept", "application/json");

    expect(res.status).toEqual(200);
    expect(res.body.message).toEqual("success");
    expect(res.body.game).toBeTypeOf("object");
    expect(res.body.game).toHaveProperty("id");
    expect(res.body.game).toHaveProperty("username", "anonymous");
    expect(res.body.game).toHaveProperty("start_time");
    expect(res.body.game.start_time).toBeTypeOf("number");
    expect(res.body.game).toHaveProperty("end_time", null);
    expect(res.body.game).toHaveProperty("scene");
    expect(res.body.game.scene).toHaveProperty("characters");
    expect(res.body.game.scene.characters).toHaveLength(1);
    expect(res.body.game.scene).toEqual({
      id: expect.toSatisfy((input) => Number.isInteger(input)),
      level: 2, 
      url: expect.stringMatching(/^https:\/\/.*\.jpg/),
      characters: expect.arrayContaining(["Wizard Whitebeard"]),
    });
  });

  test("GET /scene/:id/topten invalid id", async () => {
    const topTen = await agent
      .get(`/scene/0/topten`)
      .set("Accept", "application/json");

    expect(topTen.status).toEqual(400);
  });

  test("GET /scene/:id/topten none found", async () => {
    const scenes = await agent
      .get("/scene")

      .set("Accept", "application/json");

    const scene = scenes.body.scenes[0];
    expect(scene.id).toBeTypeOf("number");
    const sceneId = scene.id;

    const topTen = await agent
      .get(`/scene/${sceneId}/topten`)
      .set("Accept", "application/json");

    expect(topTen.status).toEqual(200);
    expect(topTen.body).toHaveProperty("topTen");
    const resDetails = {};
    expect(topTen.body.topTen).toMatchObject(resDetails);
  });

  test("PUT /scene/1/game - scene id invalid", async () => {
    const game = await agent
      .put("/scene/10/game")
      .set("Accept", "application/json")

      .send({ username: "hacker" });

    expect(game.status).toEqual(400);
    expect(game.body.message).toContain(
      "Action has failed due to some validation errors"
    );
    expect(game.body.details).toBeDefined();
    expect(game.body.details).toEqual([
      {
        location: "params",
        msg: "This scene id is invalid.",
        path: "id",
        type: "field",
        value: 10,
      },
    ]);
  });

  describe("same session resumption", () => {
    const agent = request.agent(app);

    test("GET /scene/1/resumeGame - game session exists", async () => {
      const route = "/scene/1/game";
      const res = await agent.get(route);

      const resume = await agent
        .get("/scene/1/resumeGame")
        .set("Accept", "application/json");

      expect(resume.status).toEqual(200);
      expect(resume.body.message).toContain("true");
    });
  });
});

test("GET /scene/1/resumeGame - game session doesn't exist", async () => {
  const game = await request(app)
    .get("/scene/1/resumeGame")
    .set("Accept", "application/json");

  expect(game.status).toEqual(200);
  expect(game.body.message).toContain("false");

  await clearGameAndSessionRows();
});

test("test playing two games at once", async () => {
  const agent = request.agent(app);
  const route = "/scene/1/game";
  const res = await agent
    .get(route)

    .set("Accept", "application/json");

  expect(res.status).toEqual(200);
  expect(res.body.game.scene_id).toEqual(1);

  const route2 = "/scene/2/game";
  const res2 = await agent
    .get(route2)

    .set("Accept", "application/json");

  console.log(res.body);
  expect(res2.status).toEqual(200);
  expect(res2.body.game.scene_id).toEqual(2);

  await clearGameAndSessionRows();
});

describe("test player in top ten for two scenes", () => {
  let agent;
  beforeAll(async () => {
    await clearGameAndSessionRows();
  });

  beforeAll(async () => {
    agent = request.agent(app);
    const route = "/scene/1/game";
    const res = await agent
      .get(route)

      .set("Accept", "application/json");

    expect(res.status).toEqual(200);

    const route2 = "/scene/2/game";
    const res2 = await agent
      .get(route2)

      .set("Accept", "application/json");

    expect(res2.status).toEqual(200);
  });

  afterAll(async () => {
    await clearGameAndSessionRows();
  });

  test("PUT /scene/%i/game/answer all characters found & top ten for scene number %i where i is in set [1,2]", async () => {
    const res1 = await agent
      .put(`/scene/1/game/answer`)
      .query({ x: 6.87, y: 68.55, character: "Odlaw" })
      .set("Accept", "application/json");

    expect(res1.status).toEqual(201); //first correct answer

    const res2 = await agent
      .put("/scene/1/game/answer")
      .query({ x: 40.45, y: 62.17, character: "Waldo" })
      .set("Accept", "application/json");

    expect(res2.status).toEqual(201); //second correct answer

    const res3 = await agent
      .put("/scene/1/game/answer")
      .query({ x: 77.86, y: 57.39, character: "Wizard Whitebeard" }) //third correct answer
      .set("Accept", "application/json");

    expect(res3.status).toEqual(201);
    expect(res3.body).toMatchObject({
      message: "Correct answer",
      x: "77.86",
      y: "57.39",
      character: "Wizard Whitebeard",
      inTopTen: true,
    });
    expect(res3.body).toHaveProperty("elapsed_time");

    // test trying to record username since elapsed_time is in top ten
    const username = `bestOfTheBest`;
    const game = await agent
      .put("/scene/1/game")

      .set("Accept", "application/json")

      .send({ username });

    expect(game.status).toEqual(200);
    expect(game.body.message).toEqual("Success");
    expect(game.body).toHaveProperty("game");
    expect(game.body.game).toMatchObject({
      username,
    });

    const topTen = await agent
      .get(`/scene/1/topten`)
      .set("Accept", "application/json");

    expect(topTen.status).toEqual(200);
    expect(topTen.body).toHaveProperty("topTen");
    expect(topTen.body).toHaveProperty("id");
    expect(topTen.body).toHaveProperty("elapsed_time"); // this is actually the elapsed time
    expect(topTen.body.topTen.length).toBeGreaterThanOrEqual(1);
    const topTenUsernames = [];

    for (let i = 0; i < topTen.body.topTen.length; i++) {
      topTenUsernames.push(topTen.body.topTen[i].username);

      expect(topTen.body.topTen[i].id).toBeDefined();
      expect(topTen.body.topTen[i].elapsed_time).toBeDefined();
    }
    expect(topTenUsernames).toContain(username);

    const res21 = await agent
      .put(`/scene/2/game/answer`)
      .query({ x: 22, y: 67, character: "Odlaw" })
      .set("Accept", "application/json");

    expect(res21.status).toEqual(201); //first correct answer

    const res22 = await agent
      .put("/scene/2/game/answer")
      .query({ x: 49, y: 19, character: "Waldo" })
      .set("Accept", "application/json");

    expect(res22.status).toEqual(201); //second correct answer
    expect(res22.body.elapsed_time).toBeDefined();

    const topTen2 = await agent
      .get(`/scene/2/topten`)
      .set("Accept", "application/json");

    expect(topTen2.status).toEqual(200);
    expect(topTen2.body).toHaveProperty("topTen");
    expect(topTen2.body).toHaveProperty("id");
    expect(topTen2.body).toHaveProperty("elapsed_time"); // this is actually the elapsed time
    expect(topTen2.body.topTen.length).toBeGreaterThanOrEqual(1);
    const topTenUsernames2 = [];

    for (let i = 0; i < topTen.body.topTen.length; i++) {
      topTenUsernames2.push(topTen.body.topTen[i].username);

      expect(topTen2.body.topTen[i].id).toBeDefined();
      expect(topTen2.body.topTen[i].elapsed_time).toBeDefined();
    }
    expect(topTenUsernames2).toContain(username);
  });
});
