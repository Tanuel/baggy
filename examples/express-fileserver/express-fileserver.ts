import baggyRouter from "@baggy/express-router";
import express from "express";
import Fileserver from "@baggy/provider-fileserver";
import { Registry } from "@baggy/registry";
import { errorHandler, requestLogger } from "../util/logger";
import chalk from "chalk";
import { responseDecorator } from "../util/response-decorator";

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

app.use(requestLogger(requestLogs));
app.use(baggyRouter(registry, responseDecorator));
app.use(errorHandler(errorLog));
app.listen(3000, () => {
  info("Starting server on http://localhost:3000");
  info("Access Logs   =>", requestLogs);
  info("Error Logs    =>", errorLog);
  info("Artifacts =>", artifacts);
});
