import baggyRouter, { ResponseDecorator } from "@baggy/express-router";
import express from "express";
import Fileserver from "@baggy/provider-fileserver";
import { Registry } from "@baggy/registry";
import { errorHandler, requestLogger, debug } from "./logger";
import chalk from "chalk";

const app = express();
const basePath = ".local";
const requestLogs = basePath + "/logs";
const errorLog = basePath + "/error.log";
const artifacts = basePath + "/artifacts";
const storage = new Fileserver(artifacts);

const registry = new Registry({
  artifactsUrl: "http://localhost:3000",
  storage,
  proxy: true,
  proxyCache: true,
});

function info(...str: string[]): void {
  console.log(chalk.green.bold("Baggy Fileserver"), chalk.cyan(...str));
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
