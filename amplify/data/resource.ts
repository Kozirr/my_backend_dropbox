import { type ClientSchema, a, defineData } from "@aws-amplify/backend";

const schema = a.schema({
  FileRecord: a
    .model({
      fileName: a.string().required(),
      logicalFileId: a.string(),
      s3Key: a.string().required(),
      fileSize: a.integer().required(),
      contentType: a.string().required(),
      version: a.integer().required(),
      owner: a.string().required(),
    })
    .authorization((allow) => [allow.owner()]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: "userPool",
  },
});
