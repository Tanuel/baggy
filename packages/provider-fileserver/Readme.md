# @baggy/provider-fileserver

A storage provider for @baggy/registry.

Saves everything on the specified path in the local file system.

`yarn add sqlite3 @baggy/provider-fileserver @baggy/registry`

```typescript
import Fileserver from "@baggy/provider-fileserver";
import { Registry } from "@baggy/registry";

const fileserver = new Fileserver("path/to/files");
const registry = new Registry({
  storage: fileserver,
});

// Do something with the registry
```
