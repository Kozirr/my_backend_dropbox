import {
  S3Client,
  CopyObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { DynamoDBClient, UpdateItemCommand } from "@aws-sdk/client-dynamodb";
import type { DynamoDBStreamHandler } from "aws-lambda";

const s3 = new S3Client();
const dynamo = new DynamoDBClient();
const BUCKET_NAME = process.env.STORAGE_BUCKET_NAME || "";
const TABLE_NAME = process.env.FILERECORD_TABLE_NAME || "";

export const handler: DynamoDBStreamHandler = async (event) => {
  for (const record of event.Records) {
    if (record.eventName !== "MODIFY") continue;

    const oldImage = record.dynamodb?.OldImage;
    const newImage = record.dynamodb?.NewImage;

    const oldFileName = oldImage?.fileName?.S || "";
    const newFileName = newImage?.fileName?.S || "";

    if (oldFileName === newFileName) continue;

    const oldS3Key = oldImage?.s3Key?.S || "";
    if (!oldS3Key) {
      console.log("No s3Key in old image:", JSON.stringify(oldImage));
      continue;
    }

    const keyPrefix = oldS3Key.substring(0, oldS3Key.lastIndexOf("/"));
    const version = newImage?.version?.N || "1";
    const newS3Key = `${keyPrefix}/${newFileName}_v${version}`;
    const recordId = newImage?.id?.S || "";

    try {
      await s3.send(
        new CopyObjectCommand({
          Bucket: BUCKET_NAME,
          CopySource: `${BUCKET_NAME}/${oldS3Key}`,
          Key: newS3Key,
        })
      );
      console.log(`Copied s3://${BUCKET_NAME}/${oldS3Key} -> ${newS3Key}`);

      await s3.send(new DeleteObjectCommand({ Bucket: BUCKET_NAME, Key: oldS3Key }));
      console.log(`Deleted old S3 object: ${oldS3Key}`);

      await dynamo.send(
        new UpdateItemCommand({
          TableName: TABLE_NAME,
          Key: { id: { S: recordId } },
          UpdateExpression: "SET s3Key = :newKey",
          ExpressionAttributeValues: { ":newKey": { S: newS3Key } },
        })
      );
      console.log(`Updated DynamoDB record ${recordId} s3Key -> ${newS3Key}`);
    } catch (e) {
      console.error(`Error renaming file ${oldFileName} -> ${newFileName}:`, e);
      throw e;
    }
  }
};
