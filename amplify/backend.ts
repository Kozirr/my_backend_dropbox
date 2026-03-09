import { defineBackend } from "@aws-amplify/backend";
import { auth } from "./auth/resource";
import { data } from "./data/resource";
import { storage } from "./storage/resource";
import { createOnDeleteRecordFunction } from "./functions/onDeleteRecord/resource";
import { createOnRenameFileFunction } from "./functions/onRenameFile/resource";
import { StartingPosition, EventSourceMapping } from "aws-cdk-lib/aws-lambda";
import { Policy, PolicyStatement } from "aws-cdk-lib/aws-iam";

const backend = defineBackend({
  auth,
  data,
  storage,
});

const lambdaStack = backend.createStack("LambdaStack");

const deleteFn = createOnDeleteRecordFunction(lambdaStack, "OnDeleteRecordFn");
const renameFn = createOnRenameFileFunction(lambdaStack, "OnRenameFileFn");

const s3BucketName = backend.storage.resources.bucket.bucketName;

const tables = backend.data.resources.tables;
const fileRecordTable = tables["FileRecord"];
const tableStreamArn = fileRecordTable.tableStreamArn!;
const tableName = fileRecordTable.tableName;

deleteFn.addEnvironment("STORAGE_BUCKET_NAME", s3BucketName);
renameFn.addEnvironment("STORAGE_BUCKET_NAME", s3BucketName);
renameFn.addEnvironment("FILERECORD_TABLE_NAME", tableName);

deleteFn.role!.attachInlinePolicy(
  new Policy(lambdaStack, "DeleteS3Policy", {
    statements: [
      new PolicyStatement({
        actions: ["s3:DeleteObject"],
        resources: [backend.storage.resources.bucket.arnForObjects("*")],
      }),
    ],
  })
);

renameFn.role!.attachInlinePolicy(
  new Policy(lambdaStack, "RenameS3DynamoPolicy", {
    statements: [
      new PolicyStatement({
        actions: ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"],
        resources: [backend.storage.resources.bucket.arnForObjects("*")],
      }),
      new PolicyStatement({
        actions: ["dynamodb:UpdateItem"],
        resources: [fileRecordTable.tableArn],
      }),
    ],
  })
);

new EventSourceMapping(lambdaStack, "DeleteRecordStream", {
  target: deleteFn,
  eventSourceArn: tableStreamArn,
  startingPosition: StartingPosition.LATEST,
  batchSize: 10,
  enabled: true,
});

new EventSourceMapping(lambdaStack, "RenameFileStream", {
  target: renameFn,
  eventSourceArn: tableStreamArn,
  startingPosition: StartingPosition.LATEST,
  batchSize: 10,
  enabled: true,
});

const streamPolicy = new PolicyStatement({
  actions: [
    "dynamodb:DescribeStream",
    "dynamodb:GetRecords",
    "dynamodb:GetShardIterator",
    "dynamodb:ListStreams",
  ],
  resources: [tableStreamArn],
});

deleteFn.role!.attachInlinePolicy(
  new Policy(lambdaStack, "DeleteStreamReadPolicy", {
    statements: [streamPolicy],
  })
);

renameFn.role!.attachInlinePolicy(
  new Policy(lambdaStack, "RenameStreamReadPolicy", {
    statements: [streamPolicy],
  })
);
