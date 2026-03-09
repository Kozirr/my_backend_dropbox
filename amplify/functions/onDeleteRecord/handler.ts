import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
import type { DynamoDBStreamHandler } from "aws-lambda";

const s3 = new S3Client();
const BUCKET_NAME = process.env.STORAGE_BUCKET_NAME || "";

export const handler: DynamoDBStreamHandler = async (event) => {
  for (const record of event.Records) {
    if (record.eventName !== "REMOVE") continue;

    const oldImage = record.dynamodb?.OldImage;
    const s3Key = oldImage?.s3Key?.S || "";

    if (!s3Key) {
      console.log("No s3Key found in deleted record:", JSON.stringify(oldImage));
      continue;
    }

    try {
      await s3.send(new DeleteObjectCommand({ Bucket: BUCKET_NAME, Key: s3Key }));
      console.log(`Deleted S3 object: s3://${BUCKET_NAME}/${s3Key}`);
    } catch (e) {
      console.error(`Error deleting S3 object ${s3Key}:`, e);
      throw e;
    }
  }
};
