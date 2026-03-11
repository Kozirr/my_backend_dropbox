import { defineFunction } from "@aws-amplify/backend";

export const resolveShareLink = defineFunction({
  name: "resolveShareLink",
  entry: "./handler.ts",
});