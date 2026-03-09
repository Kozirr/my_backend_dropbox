import type { DynamoDBStreamHandler } from "aws-lambda";

export const handler: DynamoDBStreamHandler = async (event) => {
  for (const record of event.Records) {
    if (record.eventName !== "MODIFY") continue;

    const oldImage = record.dynamodb?.OldImage;
    const newImage = record.dynamodb?.NewImage;

    const oldFileName = oldImage?.fileName?.S || "";
    const newFileName = newImage?.fileName?.S || "";

    if (oldFileName === newFileName) continue;
    const recordId = newImage?.id?.S || "";

    if (!recordId) {
      console.log("No record id in new image:", JSON.stringify(newImage));
      continue;
    }

    console.log(
      `Metadata-only rename for ${recordId}: ${oldFileName} -> ${newFileName}. Existing S3 key retained.`
    );
  }
};
