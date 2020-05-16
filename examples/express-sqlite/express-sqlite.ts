import router from "@baggy/express-router";
import express from "express";
import sqlite3 from "sqlite3";
import Database from "@baggy/provider-sqlite";
import fs from "fs";
import { Registry } from "@baggy/registry";
import { errorHandler, requestLogger } from "../util/logger";
import chalk from "chalk";
import { responseDecorator } from "../util/response-decorator";

const app = express();
const basePath = ".local";
const requestLogs = basePath + "/baggy-sqlite-logs";
const errorLog = basePath + "/baggy-sqlite-error.log";
const dbfile = basePath + "/baggy.sqlite";
sqlite3.verbose();

function info(...str: string[]): void {
  console.log(chalk.green.bold("Baggy SQLite"), chalk.cyan(...str));
}

try {
  const stat = fs.statSync(".local");
  if (!stat.isDirectory()) {
    info("Creating basepath @ ", basePath);
    fs.mkdirSync(basePath, { recursive: true });
  }
} catch (e) {
  if (e.code === "ENOENT") {
    info("Creating basepath @ ", basePath);
    fs.mkdirSync(basePath, { recursive: true });
  } else {
    throw e;
  }
}

if (fs.existsSync(dbfile)) {
  info("remove previous database");
  fs.unlinkSync(dbfile);
}

info("create database");
const db = new sqlite3.Database(dbfile, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE);

const storage = new Database(db);

info("create registry");
const registry = new Registry({
  artifactsUrl: "http://localhost:3000",
  storage,
  proxy: true,
  proxyCache: true,
});

app.use(requestLogger(requestLogs));
app.use(router(registry, responseDecorator));
app.use(errorHandler(errorLog));
app.listen(3000, () => {
  info("Starting server on http://localhost:3000");
  info("Access Logs   =>", requestLogs);
  info("Error Logs    =>", errorLog);
  info("Database File =>", dbfile);
});
