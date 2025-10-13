// Internal S3 client wrapper - not exposed in public API
import {
  S3Client,
  CreateBucketCommand,
  HeadBucketCommand,
  DeleteBucketCommand,
  ListObjectsV2Command,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  HeadObjectCommand,
  CopyObjectCommand
} from '@aws-sdk/client-s3';

import {
  ContainerName,
  ObjectName,
  Result,
  Ok,
  Err,
  ContainerMetadata,
  ObjectMetadata,
  ObjectId
} from './types';

export interface S3Config {
  region?: string;
  endpoint?: string;
  credentials?: {
    accessKeyId: string;
    secretAccessKey: string;
  };
}

export class S3ClientWrapper {
  private client: S3Client;
  
  public constructor(config: S3Config = {}) {
    this.client = new S3Client({
      region: config.region || 'us-east-1',
      endpoint: config.endpoint,
      credentials: config.credentials || undefined, // Uses default credential chain if not provided
    });
  }

  public async createContainer(name: ContainerName): Promise<Result<void>> {
    try {
      await this.client.send(new CreateBucketCommand({
        Bucket: name,
      }));
      return Ok(undefined);
    } catch (error) {
      return Err(`Failed to create container: ${error}`);
    }
  }

  public async containerExists(name: ContainerName): Promise<Result<boolean>> {
    try {
      await this.client.send(new HeadBucketCommand({
        Bucket: name,
      }));
      return Ok(true);
    } catch (error: any) {
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        return Ok(false);
      }
      return Err(`Failed to check container existence: ${error}`);
    }
  }

  public async deleteContainer(name: ContainerName): Promise<Result<void>> {
    try {
      await this.client.send(new DeleteBucketCommand({
        Bucket: name,
      }));
      return Ok(undefined);
    } catch (error) {
      return Err(`Failed to delete container: ${error}`);
    }
  }

  public async getContainerMetadata(name: ContainerName): Promise<Result<ContainerMetadata>> {
    try {
      await this.client.send(new HeadBucketCommand({
        Bucket: name,
      }));
      
      // S3 doesn't provide creation date via HeadBucket, so we approximate
      const createdAt = BigInt(Date.now()) * BigInt(1000000); // Convert to nanoseconds
      
      return Ok({
        name,
        createdAt,
      });
    } catch (error) {
      return Err(`Failed to get container metadata: ${error}`);
    }
  }

  public async listObjects(containerName: ContainerName, continuationToken?: string): Promise<Result<{ objects: ObjectName[]; nextToken?: string }>> {
    try {
      const response = await this.client.send(new ListObjectsV2Command({
        Bucket: containerName,
        ContinuationToken: continuationToken,
      }));

      const objects = response.Contents?.map((obj: any) => obj.Key!) || [];
      
      return Ok({
        objects,
        nextToken: response.NextContinuationToken,
      });
    } catch (error) {
      return Err(`Failed to list objects: ${error}`);
    }
  }

  public async getObjectData(containerName: ContainerName, objectName: ObjectName, start?: bigint, end?: bigint): Promise<Result<Uint8Array>> {
    try {
      const range = (start !== undefined && end !== undefined) 
        ? `bytes=${start}-${end}`
        : undefined;

      const response = await this.client.send(new GetObjectCommand({
        Bucket: containerName,
        Key: objectName,
        Range: range,
      }));

      if (!response.Body) {
        return Err('Object body is empty');
      }

      const chunks: Uint8Array[] = [];
      const stream = response.Body as any;
      
      for await (const chunk of stream) {
        chunks.push(new Uint8Array(chunk));
      }

      const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
      const result = new Uint8Array(totalLength);
      let offset = 0;
      
      for (const chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.length;
      }

      return Ok(result);
    } catch (error: any) {
      if (error.name === 'NoSuchKey' || error.$metadata?.httpStatusCode === 404) {
        return Err('Object not found');
      }
      return Err(`Failed to get object data: ${error}`);
    }
  }

  public async putObjectData(containerName: ContainerName, objectName: ObjectName, data: Uint8Array): Promise<Result<void>> {
    try {
      await this.client.send(new PutObjectCommand({
        Bucket: containerName,
        Key: objectName,
        Body: data,
      }));
      return Ok(undefined);
    } catch (error) {
      return Err(`Failed to put object data: ${error}`);
    }
  }

  public async deleteObject(containerName: ContainerName, objectName: ObjectName): Promise<Result<void>> {
    try {
      await this.client.send(new DeleteObjectCommand({
        Bucket: containerName,
        Key: objectName,
      }));
      return Ok(undefined);
    } catch (error) {
      return Err(`Failed to delete object: ${error}`);
    }
  }

  public async deleteObjects(containerName: ContainerName, objectNames: ObjectName[]): Promise<Result<void>> {
    try {
      if (objectNames.length === 0) {
        return Ok(undefined);
      }

      await this.client.send(new DeleteObjectsCommand({
        Bucket: containerName,
        Delete: {
          Objects: objectNames.map(key => ({ Key: key })),
        },
      }));
      return Ok(undefined);
    } catch (error) {
      return Err(`Failed to delete objects: ${error}`);
    }
  }

  public async objectExists(containerName: ContainerName, objectName: ObjectName): Promise<Result<boolean>> {
    try {
      await this.client.send(new HeadObjectCommand({
        Bucket: containerName,
        Key: objectName,
      }));
      return Ok(true);
    } catch (error: any) {
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        return Ok(false);
      }
      return Err(`Failed to check object existence: ${error}`);
    }
  }

  public async getObjectMetadata(containerName: ContainerName, objectName: ObjectName): Promise<Result<ObjectMetadata>> {
    try {
      const response = await this.client.send(new HeadObjectCommand({
        Bucket: containerName,
        Key: objectName,
      }));

      const createdAt = response.LastModified 
        ? BigInt(response.LastModified.getTime()) * BigInt(1000000) // Convert to nanoseconds
        : BigInt(Date.now()) * BigInt(1000000);

      const size = response.ContentLength !== undefined 
        ? BigInt(response.ContentLength)
        : BigInt(0);

      return Ok({
        name: objectName,
        container: containerName,
        createdAt,
        size,
      });
    } catch (error: any) {
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        return Err('Object not found');
      }
      return Err(`Failed to get object metadata: ${error}`);
    }
  }

  public async copyObject(src: ObjectId, dest: ObjectId): Promise<Result<void>> {
    try {
      await this.client.send(new CopyObjectCommand({
        CopySource: `${src.container}/${src.object}`,
        Bucket: dest.container,
        Key: dest.object,
      }));
      return Ok(undefined);
    } catch (error) {
      return Err(`Failed to copy object: ${error}`);
    }
  }

  public async moveObject(src: ObjectId, dest: ObjectId): Promise<Result<void>> {
    // Move is copy + delete source
    const copyResult = await this.copyObject(src, dest);
    if (!copyResult.success) {
      return copyResult;
    }

    const deleteResult = await this.deleteObject(src.container, src.object);
    if (!deleteResult.success) {
      // If delete fails, try to clean up the copy
      await this.deleteObject(dest.container, dest.object);
      return deleteResult;
    }

    return Ok(undefined);
  }

  public async clearContainer(containerName: ContainerName): Promise<Result<void>> {
    try {
      let continuationToken: string | undefined;
      
      do {
        const listResult = await this.listObjects(containerName, continuationToken);
        if (!listResult.success) {
          return listResult;
        }

        if (listResult.value.objects.length > 0) {
          const deleteResult = await this.deleteObjects(containerName, listResult.value.objects);
          if (!deleteResult.success) {
            return deleteResult;
          }
        }

        continuationToken = listResult.value.nextToken;
      } while (continuationToken);

      return Ok(undefined);
    } catch (error) {
      return Err(`Failed to clear container: ${error}`);
    }
  }
}