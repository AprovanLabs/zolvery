// Value resources for handling blob data
import { 
  OutputStream, 
  IncomingValueSyncBody, 
  IncomingValueAsyncBody,
  Result,
  Ok,
  Err,
  createInputStream,
  createOutputStream
} from './types';

// OutgoingValue represents data being written to the blobstore
export class OutgoingValue {
  private outputStream: OutputStream | null = null;
  private finished = false;
  private data: Uint8Array | null = null;

  public static newOutgoingValue(): OutgoingValue {
    return new OutgoingValue();
  }

  public outgoingValueWriteBody(): Result<OutputStream> {
    if (this.outputStream !== null) {
      return Err('Output stream already retrieved');
    }

    if (this.finished) {
      return Err('Outgoing value already finished');
    }

    const { stream, getData } = createOutputStream();
    this.outputStream = stream;
    
    // Store reference to getData function for later use
    (this.outputStream as any)._getData = getData;

    return Ok(stream);
  }

  public static finish(outgoingValue: OutgoingValue): Result<void> {
    if (outgoingValue.finished) {
      return Err('Outgoing value already finished');
    }

    if (outgoingValue.outputStream === null) {
      return Err('No output stream was created');
    }

    // Get the data from the output stream
    const getData = (outgoingValue.outputStream as any)._getData;
    if (getData) {
      outgoingValue.data = getData();
    }

    outgoingValue.finished = true;
    return Ok(undefined);
  }

  public getData(): Uint8Array | null {
    return this.data;
  }

  public isFinished(): boolean {
    return this.finished;
  }
}

// IncomingValue represents data being read from the blobstore
export class IncomingValue {
  private data: Uint8Array;

  public constructor(data: Uint8Array) {
    this.data = data;
  }

  public static incomingValueConsumeSync(incomingValue: IncomingValue): Result<IncomingValueSyncBody> {
    try {
      return Ok(incomingValue.data);
    } catch (error) {
      return Err(`Failed to consume incoming value synchronously: ${error}`);
    }
  }

  public static incomingValueConsumeAsync(incomingValue: IncomingValue): Result<IncomingValueAsyncBody> {
    try {
      const inputStream = createInputStream(incomingValue.data);
      return Ok(inputStream);
    } catch (error) {
      return Err(`Failed to consume incoming value asynchronously: ${error}`);
    }
  }

  public size(): bigint {
    return BigInt(this.data.length);
  }
}