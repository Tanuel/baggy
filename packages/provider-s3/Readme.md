# @baggy/provider-s3

An AWS S3 Bucket storage provider for @baggy/registry.

Saves everything on the specified path in a s3 bucket.

`yarn add sqlite3 @baggy/provider-s3 @baggy/registry aws-sdk`

```typescript
import ProviderS3 from "@baggy/provider-s3";
import { Registry } from "@baggy/registry";
import S3 from "aws-sdk/clients/s3";

// somehow provide AWS credentials via env or AWS.config
process.env.AWS_ACCESS_KEY_ID = "baggy-mock-key";
process.env.AWS_SECRET_ACCESS_KEY = "baggy-mock-key";

const s3 = new S3({
  // pre-configure your S3
  s3ForcePathStyle: true, // this line is required. setting this later in the s3-provider does not work for some reason
});
const providerConfig = { bucket: "baggy-registry-mock", s3 };

const storage = new ProviderS3(providerConfig);

const registry = new Registry({
  artifactsUrl: "http://localhost:3000",
  storage,
});

// Do something with the registry
```

## Caveats

Currently it is not easily possible to directly access the s3 bucket
for file downloads when proxying is enabled, since there is no built-in
fallback mechanism if an artifact is missing. This could maybe be solved with
a redirect to the server on missing artifacts.
