export interface Meta {
  //Required Tags
  _id: string;
  _rev: string;
  name: string;
  "dist-tags": {
    [key: string]: string;
  };
  time: {
    created: string;
    modified: string;
    [key: string]: string;
  };
  users?: Human[];
  versions: {
    [key: string]: MetaVersion;
  };
  _attachments?: {
    [key: string]: MetaAttachment;
  };
  //Hoisted from package.json
  author?: Human;
  bugs?: string;
  contributors?: Human[];
  description?: string;
  homepage?: string;
  keywords?: string[];
  license?: string;
  maintainers?: Human[];
  readme?: string;
  readmeFilename?: string;
  repository?: string | Repository;
}

export interface Repository {
  type: string;
  url: string;
}

export interface Human {
  name?: string;
  email?: string;
  url?: string;
}

export interface MetaAttachment {
  content_type: string;
  data: string;
  length: number;
}

export interface MetaVersion {
  // Required values
  _id: string;
  _nodeVersion: string;
  _npmVersion: string;
  name: string;
  version: string;
  dist: MetaDist;

  // Optional
  _hasShrinkwrap?: boolean;
  _npmUser?: Human;
  author?: Human;
  bin?: KeyValueMap;
  bugs?: string;
  bundleDependencies?: KeyValueMap;
  contributors?: Human[];
  dependencies?: KeyValueMap;
  deprecated?: string;
  description?: string;
  devDependencies?: KeyValueMap;
  directories?: KeyValueMap;
  engines?: KeyValueMap;
  homepage?: string;
  keywords?: string[];
  license?: string;
  maintainers?: Human[];
  optionalDependencies?: KeyValueMap;
  peerDependencies?: KeyValueMap;
  readme?: string;
  readmeFilename?: string;
  repository?: string | Repository;
  scripts?: KeyValueMap;
  [key: string]: any;
}

export interface MetaDist extends StringMap {
  integrity?: string;
  shasum: string;
  tarball: string;
}

interface StringMap<T = any> {
  [key: string]: T;
}

interface KeyValueMap {
  [key: string]: string;
}

/**
 * Interface to store Metadata for Packages
 */
export interface MetaProvider {
  getMeta(packageName: string): Promise<Meta | null> | never;

  writeMeta(packageName: string, data: Meta, rev?: string): Promise<boolean>;

  deleteMeta(packageName: string): Promise<boolean>;
}

export function isMetaProvider(storage: any): storage is MetaProvider {
  return "getMeta" in storage && "writeMeta" in storage && "deleteMeta" in storage;
}

export interface FileProvider {
  getFile(path: string): Promise<any> | never;

  writeFile(path: string, content: Buffer): Promise<any>;

  deleteFile(path: string): Promise<boolean>;

  deleteDir(path: string): Promise<boolean>;
}

export function isFileProvider(storage: any): storage is FileProvider {
  return "getFile" in storage && "writeFile" in storage && "deleteFile" in storage && "deleteDir" in storage;
}

export type Provider = FileProvider & MetaProvider;

export function createMeta(meta: Meta): Meta {
  return {
    _id: meta._id,
    "dist-tags": meta["dist-tags"],
    _rev: "rev-" + Date.now(),
    name: meta.name,
    time: { created: new Date().toISOString(), modified: new Date().toISOString() },
    versions: meta.versions,
  };
}
