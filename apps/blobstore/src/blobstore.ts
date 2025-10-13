// Main blobstore interface implementation
import {
  ContainerName,
  ObjectId,
  Result,
  Ok,
  Err
} from './types';
import { S3ClientWrapper } from './s3-client';
import { Container } from './container';

// Global S3 client instance (internal, not exposed)
let globalS3Client: S3ClientWrapper | null = null;

// Configuration interface for blobstore initialization
export interface BlobstoreConfig {
  region?: string;
  endpoint?: string;
  credentials?: {
    accessKeyId: string;
    secretAccessKey: string;
  };
}

// Initialize the blobstore with configuration
export function initializeBlobstore(config: BlobstoreConfig = {}): void {
  globalS3Client = new S3ClientWrapper(config);
}

// Get the S3 client, initializing with defaults if not already initialized
function getS3Client(): S3ClientWrapper {
  if (!globalS3Client) {
    globalS3Client = new S3ClientWrapper();
  }
  return globalS3Client;
}

// Creates a new empty container
export async function createContainer(name: ContainerName): Promise<Result<Container>> {
  const s3Client = getS3Client();
  const createResult = await s3Client.createContainer(name);
  
  if (!createResult.success) {
    return createResult;
  }

  const container = new Container(name, s3Client);
  return Ok(container);
}

// Retrieves a container by name
export async function getContainer(name: ContainerName): Promise<Result<Container>> {
  const s3Client = getS3Client();
  const existsResult = await s3Client.containerExists(name);
  
  if (!existsResult.success) {
    return existsResult;
  }

  if (!existsResult.value) {
    return Err('Container does not exist');
  }

  const container = new Container(name, s3Client);
  return Ok(container);
}

// Deletes a container and all objects within it
export async function deleteContainer(name: ContainerName): Promise<Result<void>> {
  const s3Client = getS3Client();
  
  // First clear all objects in the container
  const clearResult = await s3Client.clearContainer(name);
  if (!clearResult.success) {
    return clearResult;
  }

  // Then delete the container itself
  return await s3Client.deleteContainer(name);
}

// Returns true if the container exists
export async function containerExists(name: ContainerName): Promise<Result<boolean>> {
  const s3Client = getS3Client();
  return await s3Client.containerExists(name);
}

// Copies (duplicates) an object, to the same or a different container
export async function copyObject(src: ObjectId, dest: ObjectId): Promise<Result<void>> {
  const s3Client = getS3Client();
  
  // Verify destination container exists
  const destExistsResult = await s3Client.containerExists(dest.container);
  if (!destExistsResult.success) {
    return destExistsResult;
  }

  if (!destExistsResult.value) {
    return Err('Destination container does not exist');
  }

  return await s3Client.copyObject(src, dest);
}

// Moves or renames an object, to the same or a different container
export async function moveObject(src: ObjectId, dest: ObjectId): Promise<Result<void>> {
  const s3Client = getS3Client();
  
  // Verify destination container exists
  const destExistsResult = await s3Client.containerExists(dest.container);
  if (!destExistsResult.success) {
    return destExistsResult;
  }

  if (!destExistsResult.value) {
    return Err('Destination container does not exist');
  }

  return await s3Client.moveObject(src, dest);
}