import json
import boto3
import os

s3 = boto3.client("s3")
dynamodb = boto3.resource("dynamodb")

BUCKET_NAME = os.environ.get("STORAGE_BUCKET_NAME", "")
TABLE_NAME = os.environ.get("FILERECORD_TABLE_NAME", "")


def handler(event, context):
    for record in event.get("Records", []):
        if record.get("eventName") != "MODIFY":
            continue

        old_image = record.get("dynamodb", {}).get("OldImage", {})
        new_image = record.get("dynamodb", {}).get("NewImage", {})

        old_file_name = old_image.get("fileName", {}).get("S", "")
        new_file_name = new_image.get("fileName", {}).get("S", "")

        if old_file_name == new_file_name:
            continue

        old_s3_key = old_image.get("s3Key", {}).get("S", "")
        if not old_s3_key:
            print(f"No s3Key in old image: {json.dumps(old_image)}")
            continue

        key_prefix = old_s3_key.rsplit("/", 1)[0]
        version = new_image.get("version", {}).get("N", "1")
        new_s3_key = f"{key_prefix}/{new_file_name}_v{version}"

        record_id = new_image.get("id", {}).get("S", "")

        try:
            s3.copy_object(
                Bucket=BUCKET_NAME,
                CopySource={"Bucket": BUCKET_NAME, "Key": old_s3_key},
                Key=new_s3_key,
            )
            print(f"Copied s3://{BUCKET_NAME}/{old_s3_key} -> {new_s3_key}")

            s3.delete_object(Bucket=BUCKET_NAME, Key=old_s3_key)
            print(f"Deleted old S3 object: {old_s3_key}")

            table = dynamodb.Table(TABLE_NAME)
            table.update_item(
                Key={"id": record_id},
                UpdateExpression="SET s3Key = :newKey",
                ExpressionAttributeValues={":newKey": new_s3_key},
            )
            print(f"Updated DynamoDB record {record_id} s3Key -> {new_s3_key}")

        except Exception as e:
            print(f"Error renaming file {old_file_name} -> {new_file_name}: {e}")
            raise

    return {"statusCode": 200}
