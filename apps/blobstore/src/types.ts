// Types based on WASI blobstore WIT specification

// Basic types from WIT
export type ContainerName = string;
export type ObjectName = string;
export type Timestamp = bigint; // u64 in WIT
export type ObjectSize = bigint; // u64 in WIT
export type BlobstoreError = string;

// Metadata records
export interface ContainerMetadata {
  name: ContainerName;
  createdAt: Timestamp;
}

export interface ObjectMetadata {
  name: ObjectName;
  container: ContainerName;
  createdAt: Timestamp;
  size: ObjectSize;
}

export interface ObjectId {
  container: ContainerName;
  object: ObjectName;
}

// Result type for WIT result<T, E>
export type Result<T, E = BlobstoreError> = 
  | { success: true; value: T }
  | { success: false; error: E };

// Stream interfaces (simplified for TypeScript)
export interface InputStream {
  read(): Promise<Uint8Array | null>;
  close(): Promise<void>;
}

export interface OutputStream {
  write(data: Uint8Array): Promise<void>;
  close(): Promise<void>;
}

// Incoming and outgoing value body types
export type IncomingValueSyncBody = Uint8Array;
export type IncomingValueAsyncBody = InputStream;

// Helper functions for Result type
export const Ok = <T>(value: T): Result<T> => ({ success: true, value });
export const Err = <E = BlobstoreError>(error: E): Result<never, E> => ({ success: false, error });

// Utility functions for creating streams
export const createInputStream = (data: Uint8Array): InputStream => {
  let position = 0;
  const chunkSize = 8192; // 8KB chunks
  
  return {
    async read(): Promise<Uint8Array | null> {
      if (position >= data.length) {
        return null;
      }
      
      const end = Math.min(position + chunkSize, data.length);
      const chunk = data.slice(position, end);
      position = end;
      return chunk;
    },
    async close(): Promise<void> {
      position = data.length;
    }
  };
};

export const createOutputStream = (): { stream: OutputStream; getData: () => Uint8Array } => {
  const chunks: Uint8Array[] = [];
  
  const stream: OutputStream = {
    async write(data: Uint8Array): Promise<void> {
      chunks.push(data);
    },
    async close(): Promise<void> {
      // Stream is closed, no additional operations needed
    }
  };
  
  const getData = (): Uint8Array => {
    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }
    
    return result;
  };
  
  return { stream, getData };
};