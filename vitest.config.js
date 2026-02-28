import { defineConfig } from "vite";

export default defineConfig({
  test: {
    include: ["test/**/*.{test,spec}.?(c|m)[jt]s?(x)"],
    globalSetup: ["./test/globalSetup.js"],
    reporters: ["verbose"],
    disableConsoleIntercept: true,
    bail: 1,
    fileParallelism: false,
    pool: "threads", // or "forks"
    poolOptions: {
      threads: {
        singleThread: true,
      },
      // forks can also use singleThread: true
      forks: {
        singleThread: true,
      },
    },
  },
});
