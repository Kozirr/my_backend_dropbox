import { defineBackend } from "@aws-amplify/backend";
import { auth } from "./auth/resource";
import { data } from "./data/resource";
import { storage } from "./storage/resource";
import { onDeleteRecord } from "./functions/onDeleteRecord/resource";
import { onRenameFile } from "./functions/onRenameFile/resource";
import { StreamViewType } from "aws-cdk-lib/aws-dynamodb";
import { StartingPosition, EventSourceMapping, Function as LambdaFunction } from "aws-cdk-lib/aws-lambda";
import { Policy, PolicyStatement } from "aws-cdk-lib/aws-iam";

const backend = defineBackend({
  auth,
  data,
  storage,
  onDeleteRecord,
  onRenameFile,
});

const s3BucketName = backend.storage.resources.bucket.bucketName;

const fileRecordTable = backend.data.resources.tables["FileRecord"];
const fileRecordTableResource = backend.data.resources.cfnResources.amplifyDynamoDbTables["FileRecord"];

fileRecordTableResource.streamSpecification = {
  streamViewType: StreamViewType.NEW_AND_OLD_IMAGES,
};

const tableStreamArn = fileRecordTable.tableStreamArn!;
const tableName = fileRecordTable.tableName;

const deleteFn = backend.onDeleteRecord.resources.lambda as LambdaFunction;
const renameFn = backend.onRenameFile.resources.lambda as LambdaFunction;

deleteFn.addEnvironment("STORAGE_BUCKET_NAME", s3BucketName);
renameFn.addEnvironment("STORAGE_BUCKET_NAME", s3BucketName);
renameFn.addEnvironment("FILERECORD_TABLE_NAME", tableName);

const lambdaStack = backend.createStack("LambdaPermissions");

const deleteS3Policy = new Policy(lambdaStack, "DeleteS3Policy", {
  statements: [
    new PolicyStatement({
      actions: ["s3:DeleteObject"],
      resources: [backend.storage.resources.bucket.arnForObjects("*")],
    }),
  ],
});

deleteFn.role!.attachInlinePolicy(deleteS3Policy);

const renameS3DynamoPolicy = new Policy(lambdaStack, "RenameS3DynamoPolicy", {
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
});

renameFn.role!.attachInlinePolicy(renameS3DynamoPolicy);

const deleteRecordStream = new EventSourceMapping(lambdaStack, "DeleteRecordStream", {
  target: deleteFn,
  eventSourceArn: tableStreamArn,
  startingPosition: StartingPosition.LATEST,
  batchSize: 10,
  enabled: true,
});

const renameFileStream = new EventSourceMapping(lambdaStack, "RenameFileStream", {
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

const deleteStreamReadPolicy = new Policy(lambdaStack, "DeleteStreamReadPolicy", {
  statements: [streamPolicy],
});

deleteFn.role!.attachInlinePolicy(deleteStreamReadPolicy);

const renameStreamReadPolicy = new Policy(lambdaStack, "RenameStreamReadPolicy", {
  statements: [streamPolicy],
});

renameFn.role!.attachInlinePolicy(renameStreamReadPolicy);

deleteRecordStream.node.addDependency(deleteStreamReadPolicy);
renameFileStream.node.addDependency(renameStreamReadPolicy);
