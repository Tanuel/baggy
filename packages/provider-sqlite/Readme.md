# @baggy/provider-sqlite

A storage provider for @baggy/registry.

Saves everything in the specified sqlite database.

`yarn add sqlite3 @baggy/provider-sqlite @baggy/registry`

```typescript
import Database from "@baggy/provider-sqlite";
import sqlite3 from "sqlite3";
import { Registry } from "@baggy/registry";

// set up the storage
const db = new sqlite3.Database("path/to/database");
const storage = new Database(db);
// create registry
const registry = new Registry({
  storage,
});

// Do something with the registry
```
