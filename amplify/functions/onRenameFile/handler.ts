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

function encodeCopySource(bucketName: string, key: string) {
  return `${bucketName}/${encodeURIComponent(key).replace(/%2F/g, "/")}`;
}

export const handler: DynamoDBStreamHandler = async (event) => {
  if (!BUCKET_NAME || !TABLE_NAME) {
    throw new Error("Missing STORAGE_BUCKET_NAME or FILERECORD_TABLE_NAME");
  }

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

    if (!recordId) {
      console.log("No record id in new image:", JSON.stringify(newImage));
      continue;
    }

    if (newS3Key === oldS3Key) {
      console.log(`Skipping rename for ${recordId}; S3 key already matches ${newS3Key}`);
      continue;
    }

    try {
      await s3.send(
        new CopyObjectCommand({
          Bucket: BUCKET_NAME,
          CopySource: encodeCopySource(BUCKET_NAME, oldS3Key),
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
