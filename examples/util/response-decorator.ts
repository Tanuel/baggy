import { debug } from "./logger";
import { ResponseDecorator } from "@baggy/express-router/router";

export const responseDecorator: ResponseDecorator = (result, request) => {
  let { statusCode, body } = result; // eslint-disable-line prefer-const
  if (body instanceof Buffer) {
    body = body.toString();
  }
  debug(Date.now() + `${request.path.replace(/\//g, "_")}.json`, JSON.stringify({ statusCode, body }, null, 2), true);
  return result;
};
