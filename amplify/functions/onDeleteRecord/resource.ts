import * as path from "path";
import { Runtime, Code, Function as LambdaFunction } from "aws-cdk-lib/aws-lambda";
import { Stack } from "aws-cdk-lib";
import { BundlingOutput } from "aws-cdk-lib";

export function createOnDeleteRecordFunction(scope: Stack, id: string) {
  return new LambdaFunction(scope, id, {
    runtime: Runtime.PYTHON_3_12,
    handler: "handler.handler",
    code: Code.fromAsset(path.join(__dirname), {
      bundling: {
        image: Runtime.PYTHON_3_12.bundlingImage,
        command: ["bash", "-c", "cp -r . /asset-output"],
        outputType: BundlingOutput.NOT_ARCHIVED,
        local: {
          tryBundle(outputDir: string) {
            const fs = require("fs");
            const p = require("path");
            const srcDir = path.join(__dirname);
            for (const file of fs.readdirSync(srcDir)) {
              if (file.endsWith(".py")) {
                fs.copyFileSync(p.join(srcDir, file), p.join(outputDir, file));
              }
            }
            return true;
          },
        },
      },
    }),
    functionName: `onDeleteRecord-${id}`,
  });
}
