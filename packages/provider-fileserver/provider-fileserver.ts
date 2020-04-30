import { promises as fs } from "fs";
import { dirname } from "path";
import { Provider, Meta } from "@baggy/registry";

class Fileserver implements Provider {
  constructor(private config: Config | string) {}

  private get path(): string {
    return typeof this.config === "string" ? this.config : this.config.base;
  }

  private getManifestPath(packageName: string): string {
    return packageName + "/manifest.json";
  }

  public async deleteFile(path: string): Promise<boolean> {
    path = this.path + "/" + path;
    await fs.unlink(path);
    return true;
  }

  public async deleteDir(path: string): Promise<boolean> {
    path = this.path + "/" + path;
    await fs.rmdir(path, { recursive: true });
    return true;
  }

  async getFile(path: string): Promise<any> {
    return this.getArtifact(path);
  }

  async getMeta(packageName: string): Promise<Meta | null> {
    const manifest = this.getManifestPath(packageName);
    const metaRaw = await this.getArtifact(manifest);
    return metaRaw ? JSON.parse(metaRaw.toString()) : null;
  }

  async writeMeta(packageName: string, meta: Meta, rev?: string): Promise<boolean> {
    const name = rev ? "rev/" + rev + ".json" : "manifest.json";
    const manifest = packageName + `/${name}`;
    await this.writeFile(manifest, JSON.stringify(meta, null, 2));
    return true;
  }

  public async deleteMeta(packageName: string): Promise<boolean> {
    const manifest = packageName + `/manifest.json`;
    return await this.deleteFile(manifest);
  }

  public async getArtifact(path: string): Promise<Buffer | null> {
    try {
      return await fs.readFile(this.path + "/" + path);
    } catch (e) {
      if (e.code === "ENOENT") {
        return null;
      }
      throw e;
    }
  }

  public async writeFile(path: string, content: any): Promise<void> {
    path = this.path + "/" + path;
    await Fileserver.mkdir(dirname(path));
    return await fs.writeFile(path, content);
  }

  private static async mkdir(path: string): Promise<void> {
    try {
      const stat = await fs.stat(path);
      if (!stat.isDirectory()) {
        return await fs.mkdir(path, { recursive: true });
      }
    } catch (e) {
      if (e.code === "ENOENT") {
        return await fs.mkdir(path, { recursive: true });
      } else {
        throw e;
      }
    }
  }
}

export interface Config {
  /**
   * The base path where to put files
   */
  base: string;
}

export default Fileserver;
