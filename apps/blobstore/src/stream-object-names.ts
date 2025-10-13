// StreamObjectNames resource for streaming object name results
import { ObjectName, Result, Ok, Err } from './types';
import { S3ClientWrapper } from './s3-client';

export class StreamObjectNames {
  private containerName: string;
  private s3Client: S3ClientWrapper;
  private continuationToken: string | undefined;
  private objectsBuffer: ObjectName[] = [];
  private bufferPosition = 0;
  private endOfStream = false;

  public constructor(containerName: string, s3Client: S3ClientWrapper) {
    this.containerName = containerName;
    this.s3Client = s3Client;
  }

  public async readStreamObjectNames(len: bigint): Promise<Result<[ObjectName[], boolean]>> {
    const requestedLength = Number(len);
    const result: ObjectName[] = [];
    let isEndOfStream = false;

    try {
      while (result.length < requestedLength && !this.endOfStream) {
        // Fill buffer if needed
        if (this.bufferPosition >= this.objectsBuffer.length) {
          const fillResult = await this.fillBuffer();
          if (!fillResult.success) {
            return fillResult;
          }
        }

        // If buffer is still empty after fill attempt, we've reached the end
        if (this.bufferPosition >= this.objectsBuffer.length) {
          isEndOfStream = true;
          break;
        }

        // Take objects from buffer
        const remainingInBuffer = this.objectsBuffer.length - this.bufferPosition;
        const toTake = Math.min(requestedLength - result.length, remainingInBuffer);
        
        for (let i = 0; i < toTake; i++) {
          result.push(this.objectsBuffer[this.bufferPosition + i]);
        }
        
        this.bufferPosition += toTake;
      }

      // Check if we've definitely reached the end
      if (this.endOfStream && this.bufferPosition >= this.objectsBuffer.length) {
        isEndOfStream = true;
      }

      return Ok([result, isEndOfStream]);
    } catch (error) {
      return Err(`Failed to read stream object names: ${error}`);
    }
  }

  public async skipStreamObjectNames(num: bigint): Promise<Result<[bigint, boolean]>> {
    const requestedSkip = Number(num);
    let actuallySkipped = 0;
    let isEndOfStream = false;

    try {
      while (actuallySkipped < requestedSkip && !this.endOfStream) {
        // Fill buffer if needed
        if (this.bufferPosition >= this.objectsBuffer.length) {
          const fillResult = await this.fillBuffer();
          if (!fillResult.success) {
            return fillResult;
          }
        }

        // If buffer is still empty after fill attempt, we've reached the end
        if (this.bufferPosition >= this.objectsBuffer.length) {
          isEndOfStream = true;
          break;
        }

        // Skip objects in buffer
        const remainingInBuffer = this.objectsBuffer.length - this.bufferPosition;
        const toSkip = Math.min(requestedSkip - actuallySkipped, remainingInBuffer);
        
        this.bufferPosition += toSkip;
        actuallySkipped += toSkip;
      }

      // Check if we've definitely reached the end
      if (this.endOfStream && this.bufferPosition >= this.objectsBuffer.length) {
        isEndOfStream = true;
      }

      return Ok([BigInt(actuallySkipped), isEndOfStream]);
    } catch (error) {
      return Err(`Failed to skip stream object names: ${error}`);
    }
  }

  private async fillBuffer(): Promise<Result<void>> {
    if (this.endOfStream) {
      return Ok(undefined);
    }

    const listResult = await this.s3Client.listObjects(this.containerName, this.continuationToken);
    if (!listResult.success) {
      return listResult;
    }

    this.objectsBuffer = listResult.value.objects;
    this.bufferPosition = 0;
    this.continuationToken = listResult.value.nextToken;

    // If there's no next token, we've reached the end
    if (!this.continuationToken) {
      this.endOfStream = true;
    }

    return Ok(undefined);
  }
}