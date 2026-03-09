import json
import boto3
import os

s3 = boto3.client("s3")

BUCKET_NAME = os.environ.get("STORAGE_BUCKET_NAME", "")


def handler(event, context):
    """
    Triggered by DynamoDB Stream on REMOVE events.
    Deletes the corresponding S3 object when a FileRecord is deleted.
    """
    for record in event.get("Records", []):
        if record.get("eventName") != "REMOVE":
            continue

        old_image = record.get("dynamodb", {}).get("OldImage", {})
        s3_key = old_image.get("s3Key", {}).get("S", "")

        if not s3_key:
            print(f"No s3Key found in deleted record: {json.dumps(old_image)}")
            continue

        try:
            s3.delete_object(Bucket=BUCKET_NAME, Key=s3_key)
            print(f"Deleted S3 object: s3://{BUCKET_NAME}/{s3_key}")
        except Exception as e:
            print(f"Error deleting S3 object {s3_key}: {e}")
            raise

    return {"statusCode": 200}
