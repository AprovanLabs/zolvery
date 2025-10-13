// Value resources for handling blob data in WASI blobstore
use std::sync::Arc;
use parking_lot::Mutex;

use crate::types::{BlobstoreError, BlobstoreResult};

/// Represents data being written to the blobstore
pub struct OutgoingValue {
    data: Arc<Mutex<Vec<u8>>>,
    finished: Arc<Mutex<bool>>,
}

impl OutgoingValue {
    /// Create a new outgoing value
    pub fn new() -> Self {
        Self {
            data: Arc::new(Mutex::new(Vec::new())),
            finished: Arc::new(Mutex::new(false)),
        }
    }

    /// Get a writable stream for this outgoing value
    pub fn write_body(&self) -> BlobstoreResult<OutgoingValueStream> {
        let finished = self.finished.lock();
        if *finished {
            return Err(BlobstoreError::InvalidOperation(
                "Outgoing value already finished".to_string(),
            ));
        }
        drop(finished);

        Ok(OutgoingValueStream {
            data: Arc::clone(&self.data),
            finished: Arc::clone(&self.finished),
        })
    }

    /// Finish the outgoing value, making the data available for retrieval
    pub fn finish(&self) -> BlobstoreResult<()> {
        let mut finished = self.finished.lock();
        if *finished {
            return Err(BlobstoreError::InvalidOperation(
                "Outgoing value already finished".to_string(),
            ));
        }
        *finished = true;
        Ok(())
    }

    /// Get the data from the outgoing value (only available after finish)
    pub fn get_data(&self) -> BlobstoreResult<Vec<u8>> {
        let finished = self.finished.lock();
        if !*finished {
            return Err(BlobstoreError::InvalidOperation(
                "Outgoing value not finished yet".to_string(),
            ));
        }
        drop(finished);

        let data = self.data.lock();
        Ok(data.clone())
    }

    /// Check if the outgoing value is finished
    pub fn is_finished(&self) -> bool {
        let finished = self.finished.lock();
        *finished
    }
}

impl Default for OutgoingValue {
    fn default() -> Self {
        Self::new()
    }
}

/// Stream for writing data to an outgoing value
pub struct OutgoingValueStream {
    data: Arc<Mutex<Vec<u8>>>,
    finished: Arc<Mutex<bool>>,
}

impl OutgoingValueStream {
    /// Write data to the stream
    pub fn write(&self, chunk: &[u8]) -> BlobstoreResult<()> {
        let finished = self.finished.lock();
        if *finished {
            return Err(BlobstoreError::InvalidOperation(
                "Cannot write to finished outgoing value".to_string(),
            ));
        }
        drop(finished);

        let mut data = self.data.lock();
        data.extend_from_slice(chunk);
        Ok(())
    }

    /// Close the stream (does not finish the outgoing value)
    pub fn close(&self) -> BlobstoreResult<()> {
        // Stream is closed but the outgoing value is not finished until explicitly finished
        Ok(())
    }
}

/// Represents data being read from the blobstore
pub struct IncomingValue {
    data: Vec<u8>,
}

impl IncomingValue {
    /// Create a new incoming value with the given data
    pub fn new(data: Vec<u8>) -> Self {
        Self { data }
    }

    /// Consume the incoming value synchronously, returning all data at once
    pub fn consume_sync(self) -> BlobstoreResult<Vec<u8>> {
        Ok(self.data)
    }

    /// Consume the incoming value asynchronously, returning a stream
    pub fn consume_async(self) -> BlobstoreResult<IncomingValueStream> {
        Ok(IncomingValueStream::new(self.data))
    }

    /// Get the size of the incoming value
    pub fn size(&self) -> u64 {
        self.data.len() as u64
    }
}

/// Stream for reading data from an incoming value
pub struct IncomingValueStream {
    data: Vec<u8>,
    position: usize,
    chunk_size: usize,
}

impl IncomingValueStream {
    /// Create a new incoming value stream
    pub fn new(data: Vec<u8>) -> Self {
        Self {
            data,
            position: 0,
            chunk_size: 8192, // 8KB chunks by default
        }
    }

    /// Set the chunk size for reading
    pub fn set_chunk_size(&mut self, size: usize) {
        self.chunk_size = size;
    }

    /// Read the next chunk of data from the stream
    pub fn read(&mut self) -> BlobstoreResult<Option<Vec<u8>>> {
        if self.position >= self.data.len() {
            return Ok(None); // End of stream
        }

        let end = std::cmp::min(self.position + self.chunk_size, self.data.len());
        let chunk = self.data[self.position..end].to_vec();
        self.position = end;

        Ok(Some(chunk))
    }

    /// Read all remaining data from the stream
    pub fn read_all(&mut self) -> BlobstoreResult<Vec<u8>> {
        if self.position >= self.data.len() {
            return Ok(Vec::new());
        }

        let remaining = self.data[self.position..].to_vec();
        self.position = self.data.len();
        Ok(remaining)
    }

    /// Check if the stream has reached the end
    pub fn is_end(&self) -> bool {
        self.position >= self.data.len()
    }

    /// Get the current position in the stream
    pub fn position(&self) -> usize {
        self.position
    }

    /// Get the total size of the stream
    pub fn size(&self) -> usize {
        self.data.len()
    }

    /// Close the stream
    pub fn close(&mut self) -> BlobstoreResult<()> {
        self.position = self.data.len();
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_outgoing_value() {
        let outgoing = OutgoingValue::new();
        assert!(!outgoing.is_finished());

        // Get stream and write data
        let stream = outgoing.write_body().unwrap();
        stream.write(b"Hello, ").unwrap();
        stream.write(b"World!").unwrap();
        stream.close().unwrap();

        // Finish the outgoing value
        outgoing.finish().unwrap();
        assert!(outgoing.is_finished());

        // Get data
        let data = outgoing.get_data().unwrap();
        assert_eq!(data, b"Hello, World!");

        // Try to get stream after finish (should fail)
        assert!(outgoing.write_body().is_err());
    }

    #[test]
    fn test_incoming_value_sync() {
        let data = b"Hello, World!".to_vec();
        let incoming = IncomingValue::new(data.clone());
        
        assert_eq!(incoming.size(), data.len() as u64);
        
        let result = incoming.consume_sync().unwrap();
        assert_eq!(result, data);
    }

    #[test]
    fn test_incoming_value_async() {
        let data = b"Hello, World! This is a test.".to_vec();
        let incoming = IncomingValue::new(data.clone());
        
        let mut stream = incoming.consume_async().unwrap();
        assert_eq!(stream.size(), data.len());
        assert_eq!(stream.position(), 0);
        assert!(!stream.is_end());

        // Read in chunks
        let mut result = Vec::new();
        while let Some(chunk) = stream.read().unwrap() {
            result.extend_from_slice(&chunk);
        }
        
        assert_eq!(result, data);
        assert!(stream.is_end());
        assert_eq!(stream.position(), data.len());
    }

    #[test]
    fn test_incoming_value_stream_chunk_size() {
        let data = b"0123456789".to_vec();
        let incoming = IncomingValue::new(data.clone());
        
        let mut stream = incoming.consume_async().unwrap();
        stream.set_chunk_size(3);

        let chunk1 = stream.read().unwrap().unwrap();
        assert_eq!(chunk1, b"012");
        
        let chunk2 = stream.read().unwrap().unwrap();
        assert_eq!(chunk2, b"345");
        
        let chunk3 = stream.read().unwrap().unwrap();
        assert_eq!(chunk3, b"678");
        
        let chunk4 = stream.read().unwrap().unwrap();
        assert_eq!(chunk4, b"9");
        
        let chunk5 = stream.read().unwrap();
        assert!(chunk5.is_none());
    }

    #[test]
    fn test_incoming_value_stream_read_all() {
        let data = b"Hello, World!".to_vec();
        let incoming = IncomingValue::new(data.clone());
        
        let mut stream = incoming.consume_async().unwrap();
        
        // Read first few bytes
        stream.set_chunk_size(5);
        let first_chunk = stream.read().unwrap().unwrap();
        assert_eq!(first_chunk, b"Hello");
        
        // Read all remaining
        let remaining = stream.read_all().unwrap();
        assert_eq!(remaining, b", World!");
        
        // Stream should be at end now
        assert!(stream.is_end());
        let empty = stream.read_all().unwrap();
        assert!(empty.is_empty());
    }

    #[test]
    fn test_outgoing_value_error_cases() {
        let outgoing = OutgoingValue::new();
        
        // Can't get data before finish
        assert!(outgoing.get_data().is_err());
        
        // Can finish
        outgoing.finish().unwrap();
        
        // Can't finish twice
        assert!(outgoing.finish().is_err());
        
        // Can't write after finish
        assert!(outgoing.write_body().is_err());
    }
}