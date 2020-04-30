import express, { NextFunction, Request, Response } from "express";
import * as NpmRegistry from "@baggy/registry";
import bodyParser from "body-parser";

export interface ResponseDecorator {
  (result: NpmRegistry.Response, req: Request, res: Response, next: NextFunction): NpmRegistry.Response | never;
}

export default function (registry: NpmRegistry.Registry, responseDecorator?: ResponseDecorator): express.Router {
  const router = express.Router();

  router.use(bodyParser.json({ strict: false, limit: "5mb" }));
  router.all("*", async (request: Request, res: Response, next: NextFunction) => {
    try {
      let result = await registry.handle(request);
      if (typeof responseDecorator === "function") {
        result = responseDecorator(result, request, res, next);
      }
      res.statusCode = result.statusCode;
      res.send(result.body);
    } catch (e) {
      next(e);
    }
  });
  return router;
}
