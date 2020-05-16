import baggyRouter, { ResponseDecorator } from "@baggy/express-router";
import express from "express";
import ProviderS3 from "@baggy/provider-s3";
import { Registry } from "@baggy/registry";
import { errorHandler, requestLogger, debug } from "./logger";
import chalk from "chalk";
import S3 from "aws-sdk/clients/s3";

const app = express();
const basePath = ".local";
const requestLogs = basePath + "/logs";
const errorLog = basePath + "/error.log";
const artifacts = basePath + "/artifacts";

process.env.AWS_ACCESS_KEY_ID = "baggy-mock-key";
process.env.AWS_SECRET_ACCESS_KEY = "baggy-mock-key";

const s3 = new S3({
  endpoint: "http://localhost:4572",
  s3ForcePathStyle: true,
});
const providerConfig = { bucket: "baggy-registry-mock", s3 };
const storage = new ProviderS3(providerConfig);

const registry = new Registry({
  // TODO: fetch artifacts from bucket directly and use server as fallback
  // artifactsUrl: "http://localhost:4572/baggy-registry-mock",
  artifactsUrl: "http://localhost:3000",
  storage,
  proxy: true,
  proxyCache: true,
});

function info(...str: string[]): void {
  console.log(chalk.green.bold("Baggy Express-S3"), chalk.cyan(...str));
}

const decorator: ResponseDecorator = (result, request) => {
  let { statusCode, body } = result; // eslint-disable-line prefer-const
  if (body instanceof Buffer) {
    body = body.toString();
  }
  debug(Date.now() + `${request.path.replace(/\//g, "_")}.json`, JSON.stringify({ statusCode, body }, null, 2), true);
  return result;
};

app.use(requestLogger(requestLogs));
app.use(baggyRouter(registry, decorator));
app.use(errorHandler(errorLog));
app.listen(3000, () => {
  info("Starting server on http://localhost:3000");
  info("Access Logs   =>", requestLogs);
  info("Error Logs    =>", errorLog);
  info("Artifacts =>", artifacts);
});
