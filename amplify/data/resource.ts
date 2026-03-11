import { type ClientSchema, a, defineData } from "@aws-amplify/backend";

const schema = a.schema({
  UserProfile: a
    .model({
      displayName: a.string().required(),
      avatarUrl: a.url(),
      accentColor: a.string(),
      owner: a.string().required(),
    })
    .authorization((allow) => [allow.owner()]),
  Folder: a
    .model({
      name: a.string().required(),
      parentFolderId: a.id(),
      owner: a.string().required(),
    })
    .authorization((allow) => [allow.owner()]),
  FileRecord: a
    .model({
      fileName: a.string().required(),
      folderId: a.id(),
      logicalFileId: a.string(),
      s3Key: a.string().required(),
      fileSize: a.integer().required(),
      contentType: a.string().required(),
      version: a.integer().required(),
      owner: a.string().required(),
    })
    .authorization((allow) => [allow.owner()]),
  ShareLink: a
    .model({
      s3Key: a.string().required(),
      fileName: a.string().required(),
      contentType: a.string().required(),
      fileSize: a.integer().required(),
      version: a.integer().required(),
      logicalFileId: a.string(),
      expiresAt: a.datetime().required(),
      revokedAt: a.datetime(),
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
