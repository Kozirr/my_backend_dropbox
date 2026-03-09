import * as fs from "fs";
import * as path from "path";
import { Runtime, Code, Function as LambdaFunction } from "aws-cdk-lib/aws-lambda";
import { Construct } from "constructs";

export function createOnDeleteRecordFunction(scope: Construct, id: string) {
  const handlerCode = fs.readFileSync(
    path.join(__dirname, "handler", "handler.py"),
    "utf-8"
  );
  return new LambdaFunction(scope, id, {
    runtime: Runtime.PYTHON_3_12,
    handler: "index.handler",
    code: Code.fromInline(handlerCode),
    functionName: `onDeleteRecord-${id}`,
  });
}
