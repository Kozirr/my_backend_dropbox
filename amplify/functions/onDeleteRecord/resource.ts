import { defineFunction } from "@aws-amplify/backend";

export const onDeleteRecord = defineFunction({
  name: "onDeleteRecord",
  entry: "./handler.ts",
});
