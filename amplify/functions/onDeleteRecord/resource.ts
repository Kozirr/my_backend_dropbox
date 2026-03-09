import * as path from "path";
import { Runtime, Code, Function as LambdaFunction } from "aws-cdk-lib/aws-lambda";
import { Stack } from "aws-cdk-lib";

export function createOnDeleteRecordFunction(scope: Stack, id: string) {
  return new LambdaFunction(scope, id, {
    runtime: Runtime.PYTHON_3_12,
    handler: "handler.handler",
    code: Code.fromAsset(path.join(__dirname)),
    functionName: `onDeleteRecord-${id}`,
  });
}
