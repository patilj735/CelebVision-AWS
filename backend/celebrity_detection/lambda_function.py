import json
import boto3
import uuid
import os
import base64
from datetime import datetime
from decimal import Decimal

# AWS Clients
rekognition = boto3.client("rekognition")
dynamodb = boto3.resource("dynamodb")
s3 = boto3.client("s3")

# Environment Variables
TABLE_NAME = os.environ["TABLE_NAME"]
BUCKET_NAME = os.environ["BUCKET_NAME"]

# DynamoDB Table
table = dynamodb.Table(TABLE_NAME)


class DecimalEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj)
        return super().default(obj)


def response(status, body):
    return {
        "statusCode": status,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
        },
        "body": json.dumps(body, cls=DecimalEncoder)
    }


def lambda_handler(event, context):

    method = event["requestContext"]["http"]["method"]
    path = event["rawPath"]

    try:

        # =====================================================
        # POST /upload
        # =====================================================
        if method == "POST" and path.endswith("/upload"):

            body = json.loads(event["body"])

            image = body.get("image")
            extension = body.get("extension", "jpg")

            if not image:
                return response(400, {
                    "error": "Image data missing"
                })

            filename = f"{uuid.uuid4()}.{extension}"

            image_bytes = base64.b64decode(image)

            s3.put_object(
                Bucket=BUCKET_NAME,
                Key=f"uploads/{filename}",
                Body=image_bytes,
                ContentType=f"image/{extension}"
            )

            return response(200, {
                "message": "Image uploaded successfully",
                "image": filename
            })

        # =====================================================
        # GET /celebrity
        # =====================================================
        elif method == "GET" and path.endswith("/celebrity"):

            params = event.get("queryStringParameters") or {}
            image_name = params.get("image")

            if not image_name:
                return response(400, {
                    "error": "Missing image parameter"
                })

            rek_response = rekognition.recognize_celebrities(
                Image={
                    "S3Object": {
                        "Bucket": BUCKET_NAME,
                        "Name": f"uploads/{image_name}"
                    }
                }
            )

            celebrities = []

            for celeb in rek_response["CelebrityFaces"]:
                celebrities.append({
                    "name": celeb["Name"],
                    "confidence": Decimal(str(round(celeb["MatchConfidence"], 2)))
                })

            item = {
                "RequestID": str(uuid.uuid4()),
                "ImageName": image_name,
                "Timestamp": datetime.utcnow().isoformat(),
                "CelebrityCount": len(celebrities),
                "Celebrities": celebrities
            }

            table.put_item(Item=item)

            return response(200, {
                "count": len(celebrities),
                "celebrities": celebrities
            })

        # =====================================================
        # Invalid Route
        # =====================================================
        else:
            return response(404, {
                "error": "Route not found"
            })

    except Exception as e:
        return response(500, {
            "error": str(e)
        })
