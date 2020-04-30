import http from "http";
import https from "https";
import { Meta, Provider, createMeta, MetaProvider, FileProvider, isMetaProvider, isFileProvider } from "./models";
import { URL } from "url";
import zlib from "zlib";

const configDefault: Partial<Config> = {
  proxy: false,
  proxyUrl: "https://registry.npmjs.org/",
  proxyCache: true,
};

type Res<T = any> = Promise<Response<T>>;
type ResFull<T = any> = Promise<Required<Response<T>>>;

interface Route {
  pattern: RegExp | string;
  GET?: (request: Request, match: any) => Res | ResFull;
  PUT?: (request: Request, match: any) => Res | ResFull;
  POST?: (request: Request, match: any) => Res | ResFull;
  DELETE?: (request: Request, match: any) => Res | ResFull;
}

export class Registry {
  private readonly config: Config;
  private readonly metaStorage: MetaProvider;
  private readonly fileStorage: FileProvider;
  constructor(config: Config) {
    this.config = { ...configDefault, ...config };
    this.metaStorage = isMetaProvider(this.config.storage) ? this.config.storage : this.config.storage.meta;
    this.fileStorage = isFileProvider(this.config.storage) ? this.config.storage : this.config.storage.files;
  }

  private readonly routes: Route[] = [
    {
      pattern: /^\/(?<pkg>[^/]+)$/,
      GET: this.getPackage,
      PUT: this.putPackage,
    },
    {
      pattern: /^\/(?<pkg>[^/]+)\/-rev\/(?<rev>.*)$/,
      PUT: this.putRevision,
      DELETE: this.deletePackage,
    },
    {
      pattern: /^\/-\/package\/(?<pkg>[^/]+)\/dist-tags$/,
      GET: this.getDistTags,
      PUT: this.putDistTag,
    },
    {
      pattern: /^\/-\/package\/(?<pkg>[^/]+)\/dist-tags\/(?<tag>[^/]+)$/,
      PUT: this.putDistTag,
    },
    {
      pattern: /^\/-\/npm\/v1\/security\/audits(\/quick)?$/,
      POST: this.audit,
    },
    {
      pattern: /^\/-\/ping$/,
      GET: async (): Promise<{ statusCode: number }> => ({ statusCode: 200 }),
    },
    {
      pattern: /^\/-\/v1\/login$/,
      POST: this.login,
    },
    {
      pattern: /^\/-\/user\/org\.couchdb\.user:(?<user>[\w-*~]+)$/,
      PUT: this.proxy,
    },
    {
      pattern: /^(?!\/-\/)\/(?<path>.+?)(?:\/-rev\/(?<rev>.*))?$/,
      GET: this.getArtifact,
      DELETE: this.deleteArtifact,
    },
  ];

  public async handle(request: Request): Res {
    const { path, method } = request;
    for (const route of this.routes) {
      const match = path.match(route.pattern);
      if (match) {
        if (match.groups && match.groups.pkg) {
          match.groups.pkg = match.groups.pkg.replace("%2f", "/");
        }
        if (method in route) {
          // eslint-disable-next-line
          // @ts-ignore
          return await route[method].call(this, request, match);
        }
      }
    }
    throw Error(`No Operation found for ${request.method} ${path}`);
  }

  public async audit(request: Request): Res {
    const res: Response = await this.proxy(request);
    if (res.body) {
      res.body = res.body.toString();
    }
    return res;
  }

  public async putPackage(request: Request, match: any): Res {
    const meta = request.body as Meta;
    const { pkg } = match.groups;
    if (pkg !== meta.name) {
      throw Error(`Package names from URL (${pkg}) and body.name (${meta.name}) do not match`);
    }
    const getMeta = this.metaStorage.getMeta(meta.name);
    if (meta._attachments) {
      const entries = Object.entries(meta._attachments);
      await entries.reduce(async (promise, [key, value]) => {
        await promise;
        await this.fileStorage.writeFile(`/${meta.name}/-/${key}`, Buffer.from(value.data, "base64"));
      }, Promise.resolve());
    }
    let currentMeta = await getMeta;
    if (currentMeta === null) {
      currentMeta = createMeta(meta);
    } else {
      // We do not need to wait for the meta to have been written, but some IDEs will throw a warning
      // noinspection ES6MissingAwait
      this.metaStorage.writeMeta(pkg, currentMeta, currentMeta._rev);
      currentMeta._rev = "rev-" + Date.now();
    }
    Object.assign(currentMeta["dist-tags"], meta["dist-tags"]);
    // Rewrite url origins to how we want them to be.
    // This means we can store the artifacts in a different place than the metadata
    Object.entries(meta.versions).forEach(([, value]) => {
      const tb = new URL(value.dist.tarball);
      value.dist.tarball = tb.href.replace(tb.origin, this.config.artifactsUrl);
    });
    Object.assign(currentMeta.versions, meta.versions);
    if ("latest" in meta["dist-tags"]) {
      currentMeta.readme = meta.readme;
      currentMeta.readmeFilename = meta.readmeFilename;
      currentMeta.author = meta.author;
      currentMeta.maintainers = meta.maintainers;
      currentMeta.description = meta.description;
    }
    await this.putPackageMeta(meta.name, currentMeta);
    return { statusCode: 200 };
  }

  public async getPackage(request: Request, match: any): ResFull<Meta | null> {
    const { pkg } = match.groups;
    const result = await this.metaStorage.getMeta(pkg);
    if (result === null && this.config.proxy) {
      const { statusCode, body } = await this.proxy(request);
      try {
        if (statusCode < 400 && body) {
          const j = JSON.parse(body.toString());
          if (this.config.proxyCache) {
            Object.keys(j.versions as any).forEach((version) => {
              const tb = j.versions[version].dist.tarball;
              const u = new URL(tb);
              j.versions[version].dist.tarball = u.href.replace(u.origin, this.config.artifactsUrl || u.origin);
            });
          }
          return { statusCode, body: j };
        }
        return { statusCode, body: body instanceof Buffer ? JSON.parse(body.toString()) : null };
      } catch (e) {
        console.error("Proxy Error", request.path, e.toString(), e.stack, body?.toString());
        throw e;
        // return {statusCode: 500, body: null};
      }
    }
    return { statusCode: 200, body: result };
  }

  public async putPackageMeta(packageName: string, data: Meta): Res {
    await this.metaStorage.writeMeta(packageName, data);
    return {
      statusCode: 200,
    };
  }

  /**
   * Send a proxy request to the npm registry and return the response as a buffer
   * @param proxyReq
   */
  private async proxy(proxyReq: Request): Res<Buffer> {
    return new Promise((resolve, reject) => {
      // prepare options
      const options: https.RequestOptions = {
        host: "registry.npmjs.org",
        method: proxyReq.method,
        path: proxyReq.path,
        headers: { ...proxyReq.headers, host: "registry.npmjs.org" },
      };

      // init the request
      const req = https
        .request(options)
        .on("response", (res) => {
          // Container for returned chunks
          const chunks: Buffer[] = [];
          const { headers, statusCode } = res;
          // console.log("PROXY", proxyReq.path, res.statusCode);
          res.on("data", (chunk) => {
            chunks.push(chunk);
          });
          res.on("end", () => {
            const r = { body: Buffer.concat(chunks), statusCode: statusCode || 200 };
            // unzip the buffer if required
            if (headers["content-encoding"] === "gzip") {
              r.body = zlib.unzipSync(r.body);
            }
            resolve(r);
          });
        })
        .on("error", (e) => {
          reject(e);
        });

      // Proxy body handling
      let body: string | Buffer = "";
      // Check if body is an object
      if (typeof proxyReq.body === "object" && Object.entries(proxyReq.body).length > 0) {
        try {
          body = JSON.stringify(proxyReq.body);
        } catch (e) {
          reject(e);
        }
        // Check if body is a string
      } else if (typeof proxyReq.body === "string" && proxyReq.body.length > 0) {
        body = proxyReq.body;
      }
      // check if we need to zip the body
      if (body) {
        if (proxyReq.headers["content-encoding"] === "gzip") {
          body = zlib.gzipSync(body);
        }
        req.write(body);
      }
      req.end();
    });
  }

  public async getDistTags(request: Request, match: any): Res {
    const { statusCode, body } = await this.getPackage(request, match);
    return { statusCode, body: body ? body["dist-tags"] : {} };
  }

  public async putDistTag(request: Request, match: any): Res {
    const { tag, pkg } = match.groups;
    const version: string = request.body as string;
    const { body } = await this.getPackage(request, match);
    if (body === null) {
      throw new Error("Not found");
    }
    body["dist-tags"][tag] = version;
    await this.putPackageMeta(pkg, body);
    return { statusCode: 200 };
  }

  public async getArtifact(request: Request): Res<Buffer> {
    const artifact = await this.fileStorage.getFile(request.path);
    if (!artifact) {
      const prox = await this.proxy(request);
      if (prox.statusCode < 400 && prox.body) {
        this.putArtifact(request.path, prox.body);
      }
      return prox;
    }
    return { statusCode: 200, body: artifact };
  }

  public async putArtifact(path: string, buffer: Buffer): Promise<any> {
    return await this.fileStorage.writeFile(path, buffer);
  }

  private async putRevision(request: Request, match: any): Res {
    const { pkg, rev } = match.groups;
    let status = 200;
    const current = await this.metaStorage.getMeta(pkg);
    if (current) {
      await this.metaStorage.writeMeta(pkg, current, rev);
      await this.metaStorage.writeMeta(pkg, request.body as Meta);
    } else {
      status = 404;
    }
    return { statusCode: status };
  }

  private async deletePackage(request: Request, match: any): Res {
    const { pkg } = match.groups;
    let success = await this.metaStorage.deleteMeta(pkg);
    if (success) {
      success = await this.fileStorage.deleteDir(pkg);
    }
    return { statusCode: success ? 200 : 500 };
  }

  private async deleteArtifact(request: Request, match: any): Res {
    const { path } = match.groups;
    const success = await this.fileStorage.deleteFile(path);
    console.log("DELETED", path);
    return { statusCode: success ? 200 : 500 };
  }

  private async login(request: Request): Res {
    return await this.proxy(request);
  }
}

export interface Config {
  /**
   * The base url of artifacts
   * Will be used for dependency proxying
   */
  artifactsUrl: string;
  /**
   * A Storage interface where we place the files
   */
  storage: Provider | StorageConfig;
  /**
   * Enable dependency proxy
   * Lookup dependencies in a different registry
   */
  proxy?: boolean;
  /**
   * Registry url for proxying
   * e.g. https://registry.npmjs.org/
   */
  proxyUrl?: string;
  /**
   * Enable proxy caching
   */
  proxyCache?: boolean;
}

export interface StorageConfig {
  meta: MetaProvider;
  files: FileProvider;
}

export interface Request {
  body?: object | string;
  headers: http.IncomingHttpHeaders;
  method: string;
  path: string;
  query: any;
}

export interface Response<T = any> {
  body?: T;
  statusCode: number;
}
