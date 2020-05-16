import { Provider, Meta } from "@baggy/registry";
import S3 from "aws-sdk/clients/s3";

const trimRegex = /^\/*/;
function trimSlash(str: string): string {
  return str.replace(trimRegex, "");
}

class ProviderS3 implements Provider {
  constructor(private config: Config) {
    // For some reason this won't work and has to be provided when
    // creating the AWS.S3 instance ...
    config.s3.config.update({
      s3ForcePathStyle: true,
    });
  }

  private get s3(): S3 {
    return this.config.s3;
  }
  private get bucket(): string {
    return this.config.bucket;
  }

  public async deleteFile(path: string): Promise<boolean> {
    const params: S3.DeleteObjectRequest = {
      Key: path,
      Bucket: this.bucket,
    };
    await this.s3.deleteObject(params).promise();
    return true;
  }

  public async deleteDir(path: string): Promise<boolean> {
    const params: S3.DeleteObjectRequest = {
      Bucket: this.bucket,
      Key: trimSlash(path),
    };
    await this.s3.deleteObject(params).promise();
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
    const params: S3.GetObjectRequest = {
      Bucket: this.bucket,
      Key: trimSlash(path),
    };
    try {
      const result = await this.s3.getObject(params).promise();
      return result.Body ? Buffer.from(result.Body) : null;
    } catch (e) {
      if (e.code === "NoSuchKey") {
        return null;
      }
      throw e;
    }
  }

  public async writeFile(path: string, content: any): Promise<void> {
    const params: S3.PutObjectRequest = {
      Body: content,
      Bucket: this.bucket,
      Key: trimSlash(path),
    };
    await this.s3.upload(params).promise();
  }

  private getManifestPath(packageName: string): string {
    return packageName + "/manifest.json";
  }
}

export interface Config {
  /**
   * Name of the bucket
   */
  bucket: string;
  /**
   * An AWS S3 instance from the aws-sdk with required
   * configuration like credentials
   * or default params
   * see https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#constructor-property
   */
  s3: S3;
  /**
   * S3 path prefix
   */
  prefix?: string;
}

export default ProviderS3;
