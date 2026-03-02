/* eslint-disable no-console */

/*
!!! before running this code, we need to create the tables from setup-tables.sql !!! (npm run db:setup will do that)
*/

import AppError from "../errors/AppError.js";

import * as userQueries from "../db/userQueries.js";

import * as chatQueries from "../db/chatQueries.js";

import * as messageQueries from "../db/messageQueries.js";

// needed to hash the password value
import bcrypt from "bcrypt";

import "dotenv/config";
import { env } from "node:process";
// setup data in all the tables to facilitate development work

async function hashPwd(pwd) {
  
  return await bcrypt.hash(
    pwd,
    Number(env.HASH_SALT)
  );
}

const users = [
  {
    id:1,
    username: 'hana',
    email: 'hana@email.com',
    nickname: 'hana-banana',
    hashedPassword: await hashPwd('password1')
  },
  {
    id:2,
    username: 'anna',
    email: 'anna@email.com',
    nickname: 'anna-joy',
    hashedPassword: await hashPwd('password2')
  },
  {
    id:3,
    username: 'annie',
    email: 'annie@email.com',
    nickname: 'annie-may',
    hashedPassword: await hashPwd('password3')
  },
  {
    id:4,
    username: 'boy',
    email: 'boy@email.com',
    nickname: 'oh-boy',
    hashedPassword: await hashPwd('password4')
  }
]

const chats = [
  {
    id: 1,
    user1: users[0].id,
    user2: users[1].id,
  },
  {
    id: 2,
    user1: users[1].id,
    user2: users[2].id,
  },
  {
    id: 3,
    user1: users[2].id,
    user2: users[3].id,
  },
  {
    id: 4,
    user1: users[3].id,
    user2: users[0].id,
  },
];

async function createUsersNPasswords() {
  try {
    for (const user of users) {
      console.log(user.hashedPassword);
      const newUser = await userQueries.addNewUser(
        user.username,
        user.email,
        user.nickname,
        user.hashedPassword,
      );
      
      if (!newUser) {
        throw new AppError("Failed to create the new user record.", 500);
      }
    }
  } catch (err) {
    console.error(err);
    throw err;
  } finally {
    console.log("done adding users");
  }
}

const messages = [
  ["Hi Anna!", "hi hana, how are you?", "I'm good. How about you?", "Great"],

  ["Hi Annie!", "hi anna, how are you?", "I'm good. How about you?", "Great"],
  
  ["Hi Boy!", "hi annie, how are you?", "I'm good. How about you?", "Great"],

  ["Hi Hana!", "hi boy, how are you?", "I'm good. How about you?", "Great"],
];

async function createChatsNMessages() {

  try {
    for (const chat of chats) {
      // first make the chat
      await chatQueries.addChat(chat.user1, chat.user2);
      // add messages to it
      for (let i = 0; i < messages.length; i+=2) {
        await messageQueries.addMessage(
          chat.user1,
          chat.id,
          messages[chat.id - 1][i],
          null
        );
      }
      for (let i = 1; i < messages.length; i+=2) {
        await messageQueries.addMessage(
          chat.user2,
          chat.id,
          messages[chat.id - 1][i],
          null);
      }
    }
    await messageQueries.readMessage(2, 1);    
    await messageQueries.readMessage(1, 2);
    
    await messageQueries.readMessage(3, 5);

    await messageQueries.readMessage(4, 9);

    await messageQueries.readMessage(1, 13);
    await messageQueries.readMessage(4, 14);

  } catch (err) {
    console.error(err);
    throw err;
  } finally {
    console.log("done adding chats");
  }
}

async function populateTables() {
  await createUsersNPasswords();
  await createChatsNMessages();
}

await populateTables();