# @baggy/express

Express router for @baggy/registry

```typescript
import express from "express";
import router from "@baggy/express-router";
import Fileserver from "@baggy/provider-fileserver";
import { NpmRegistry } from "@baggy/registry";

const app = express();

// use a local storage provider
const storage = new Fileserver(".local/artifacts");

const registry = new NpmRegistry({
  artifactsUrl: "http://localhost:3000",
  storage,
  proxy: true,
  proxyCache: true,
});

// set up your own middleware for logging and error handling

// enable the @baggy/express router
app.use("/npm", router(registry));

app.listen(3000, () => {
  console.log("Starting Express NpmRegistry on http://localhost:3000/npm/");
});
```
