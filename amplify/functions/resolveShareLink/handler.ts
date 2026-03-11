import type { Handler } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const s3 = new S3Client({});

const shareLinksTableName = process.env.SHARELINK_TABLE_NAME;
const storageBucketName = process.env.STORAGE_BUCKET_NAME;

function json(statusCode: number, body: unknown) {
  return {
    statusCode,
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET,OPTIONS",
      "access-control-allow-headers": "content-type",
      "content-type": "application/json",
      "cache-control": "no-store",
    },
    body: JSON.stringify(body),
  };
}

export const handler: Handler = async (event) => {
  if (event.requestContext?.http?.method === "OPTIONS") {
    return json(204, {});
  }

  if (!shareLinksTableName || !storageBucketName) {
    console.error("Missing required environment variables.");
    return json(500, { message: "Resolver is misconfigured." });
  }

  const token = event.pathParameters?.token ?? event.queryStringParameters?.token;

  if (!token) {
    return json(400, { message: "Missing share token." });
  }

  try {
    const result = await dynamo.send(
      new GetCommand({
        TableName: shareLinksTableName,
        Key: { id: token },
      })
    );

    const link = result.Item as
      | {
          id: string;
          s3Key: string;
          fileName: string;
          contentType: string;
          fileSize: number;
          version: number;
          logicalFileId?: string;
          expiresAt: string;
          revokedAt?: string | null;
        }
      | undefined;

    if (!link) {
      return json(404, { message: "Share link not found." });
    }

    if (link.revokedAt) {
      return json(410, { message: "Share link has been revoked." });
    }

    if (new Date(link.expiresAt).getTime() <= Date.now()) {
      return json(410, { message: "Share link has expired." });
    }

    const downloadUrl = await getSignedUrl(
      s3,
      new GetObjectCommand({
        Bucket: storageBucketName,
        Key: link.s3Key,
        ResponseContentDisposition: `inline; filename="${link.fileName.replace(/"/g, "")}"`,
        ResponseContentType: link.contentType,
      }),
      { expiresIn: 300 }
    );

    return json(200, {
      fileName: link.fileName,
      contentType: link.contentType,
      fileSize: link.fileSize,
      version: link.version,
      expiresAt: link.expiresAt,
      downloadUrl,
    });
  } catch (error) {
    console.error("Failed to resolve share link", error);
    return json(500, { message: "Failed to resolve share link." });
  }
};