import { defineFunction } from "@aws-amplify/backend";

export const onRenameFile = defineFunction({
  name: "onRenameFile",
  entry: "./handler.ts",
});
