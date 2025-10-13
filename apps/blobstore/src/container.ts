// Container resource implementation
import {
  ContainerName,
  ObjectName,
  ContainerMetadata,
  ObjectMetadata,
  Result,
  Ok,
  Err
} from './types';
import { S3ClientWrapper } from './s3-client';
import { StreamObjectNames } from './stream-object-names';
import { IncomingValue, OutgoingValue } from './values';

export class Container {
  private containerName: ContainerName;
  private s3Client: S3ClientWrapper;

  public constructor(containerName: ContainerName, s3Client: S3ClientWrapper) {
    this.containerName = containerName;
    this.s3Client = s3Client;
  }

  public async name(): Promise<Result<string>> {
    return Ok(this.containerName);
  }

  public async info(): Promise<Result<ContainerMetadata>> {
    return await this.s3Client.getContainerMetadata(this.containerName);
  }

  public async getData(
    name: ObjectName, 
    start: bigint, 
    end: bigint
  ): Promise<Result<IncomingValue>> {
    const dataResult = await this.s3Client.getObjectData(
      this.containerName, 
      name, 
      start, 
      end
    );
    
    if (!dataResult.success) {
      return dataResult;
    }

    const incomingValue = new IncomingValue(dataResult.value);
    return Ok(incomingValue);
  }

  public async writeData(
    name: ObjectName, 
    data: OutgoingValue
  ): Promise<Result<void>> {
    if (!data.isFinished()) {
      return Err('Outgoing value must be finished before writing');
    }

    const objectData = data.getData();
    if (!objectData) {
      return Err('No data available in outgoing value');
    }

    return await this.s3Client.putObjectData(this.containerName, name, objectData);
  }

  public async listObjects(): Promise<Result<StreamObjectNames>> {
    // Verify container exists first
    const existsResult = await this.s3Client.containerExists(this.containerName);
    if (!existsResult.success) {
      return existsResult;
    }

    if (!existsResult.value) {
      return Err('Container does not exist');
    }

    const stream = new StreamObjectNames(this.containerName, this.s3Client);
    return Ok(stream);
  }

  public async deleteObject(name: ObjectName): Promise<Result<void>> {
    return await this.s3Client.deleteObject(this.containerName, name);
  }

  public async deleteObjects(names: ObjectName[]): Promise<Result<void>> {
    return await this.s3Client.deleteObjects(this.containerName, names);
  }

  public async hasObject(name: ObjectName): Promise<Result<boolean>> {
    return await this.s3Client.objectExists(this.containerName, name);
  }

  public async objectInfo(name: ObjectName): Promise<Result<ObjectMetadata>> {
    return await this.s3Client.getObjectMetadata(this.containerName, name);
  }

  public async clear(): Promise<Result<void>> {
    return await this.s3Client.clearContainer(this.containerName);
  }
}