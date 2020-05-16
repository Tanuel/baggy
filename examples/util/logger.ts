import { ErrorRequestHandler, NextFunction, Request, RequestHandler, Response } from "express";
import fs from "fs";
import path from "path";
import chalk from "chalk";

const logDir = ".local/debug-express-logs";
export function writeLog(filename: string, content: any, overwrite: boolean = false): void {
  if (filename) {
    if (!fs.existsSync(path.dirname(filename))) {
      fs.mkdirSync(path.dirname(filename), { recursive: true });
    }
    if (overwrite && fs.existsSync(filename)) {
      fs.unlink(filename, (error) => {
        if (error !== null) {
          console.error(chalk.red("Unlink Error"), error);
        }
      });
    }
    fs.appendFile(filename, content, (error) => {
      if (error !== null) {
        console.error(chalk.red("Cannot write error log"), error);
      }
    });
  } else {
    console.warn(chalk.yellow("No Logfilename given"));
  }
}

export function debug(filename: string, content: any, overwrite: boolean = false): void {
  writeLog(path.resolve(logDir, filename), content, overwrite);
}

// export function errorHandler(filename?: string): (err: any, req: Request, res: Response, next: NextFunction) => Promise<void> {
export function errorHandler(filename?: string): ErrorRequestHandler {
  // Express requires a function to have 4 params to use it as an error handler
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  return async function (err: any, req: Request, res: Response, next: NextFunction): Promise<void> {
    console.log(chalk.bgRed.bold("Error"), chalk.red(err.message));
    if (filename) {
      const log = `
  Path: ${req.path}
  Method: ${req.method}
  Body: ${err.body}
  Stack: ${err.stack}
  `;
      writeLog(filename, log);
    } else {
      console.warn(chalk.yellow("No Logfilename given"));
    }
    res.status(400);
    res.json({ error: "Invalid Request" });
    res.end();
  };
}

export function requestLogger(logPath: string): RequestHandler {
  return function (req: Request, res: Response, next: NextFunction): void {
    try {
      const logDate = Date.now().toString().substr(4);
      const logReq = req.originalUrl.replace(/\//g, "|");
      const logfile = `${logPath}/${logDate}-${req.method}-${logReq}.json`;
      console.log(chalk.bold(chalk.red(req.method)), chalk.yellow(req.originalUrl));

      if (!fs.existsSync(logPath)) {
        fs.mkdirSync(logPath, { recursive: true });
      }
      fs.writeFileSync(
        logfile,
        JSON.stringify(
          {
            path: req.path,
            query: req.query,
            originalUrl: req.originalUrl,
            method: req.method,
            headers: req.headers,
            body: req.body || "",
          },
          null,
          2
        )
      );
    } catch (e) {
      res.sendStatus(500);
    }
    next();
  };
}
