import * as path from "path";
import { Runtime, Code, Function as LambdaFunction } from "aws-cdk-lib/aws-lambda";
import { Construct } from "constructs";

export function createOnRenameFileFunction(scope: Construct, id: string) {
  const codePath = path.resolve(
    process.cwd(),
    "amplify",
    "functions",
    "onRenameFile",
    "handler"
  );
  return new LambdaFunction(scope, id, {
    runtime: Runtime.PYTHON_3_12,
    handler: "handler.handler",
    code: Code.fromAsset(codePath),
    functionName: `onRenameFile-${id}`,
  });
}
