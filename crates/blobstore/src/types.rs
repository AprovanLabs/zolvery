// Types and structures for WASI blobstore implementation
use std::collections::HashMap;
use std::time::{SystemTime, UNIX_EPOCH};
use serde::{Deserialize, Serialize};
use thiserror::Error;

// Basic types from WIT specification
pub type ContainerName = String;
pub type ObjectName = String;
pub type Timestamp = u64; // nanoseconds since Unix epoch
pub type ObjectSize = u64;

// Error type for blobstore operations
#[derive(Error, Debug, Clone, PartialEq, Eq)]
pub enum BlobstoreError {
    #[error("Container not found: {0}")]
    ContainerNotFound(String),
    
    #[error("Container already exists: {0}")]
    ContainerAlreadyExists(String),
    
    #[error("Object not found: {0}")]
    ObjectNotFound(String),
    
    #[error("Object already exists: {0}")]
    ObjectAlreadyExists(String),
    
    #[error("Invalid range: start={start}, end={end}")]
    InvalidRange { start: u64, end: u64 },
    
    #[error("Container not empty: {0}")]
    ContainerNotEmpty(String),
    
    #[error("Invalid operation: {0}")]
    InvalidOperation(String),
    
    #[error("IO error: {0}")]
    IoError(String),
    
    #[error("Internal error: {0}")]
    InternalError(String),
}

impl From<BlobstoreError> for String {
    fn from(error: BlobstoreError) -> Self {
        error.to_string()
    }
}

// Metadata records
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContainerMetadata {
    pub name: ContainerName,
    pub created_at: Timestamp,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ObjectMetadata {
    pub name: ObjectName,
    pub container: ContainerName,
    pub created_at: Timestamp,
    pub size: ObjectSize,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct ObjectId {
    pub container: ContainerName,
    pub object: ObjectName,
}

// Storage structures for embedded implementation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StoredObject {
    pub metadata: ObjectMetadata,
    pub data: Vec<u8>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StoredContainer {
    pub metadata: ContainerMetadata,
    pub objects: HashMap<ObjectName, StoredObject>,
}

// Utility functions
pub fn current_timestamp() -> Timestamp {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_nanos() as u64
}

pub fn validate_range(start: u64, end: u64, size: u64) -> Result<(), BlobstoreError> {
    if start > end {
        return Err(BlobstoreError::InvalidRange { start, end });
    }
    if start >= size && size > 0 {
        return Err(BlobstoreError::InvalidRange { start, end });
    }
    Ok(())
}

// Result type alias for convenience
pub type BlobstoreResult<T> = Result<T, BlobstoreError>;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_current_timestamp() {
        let ts1 = current_timestamp();
        let ts2 = current_timestamp();
        assert!(ts2 >= ts1);
    }

    #[test]
    fn test_validate_range() {
        assert!(validate_range(0, 10, 20).is_ok());
        assert!(validate_range(10, 10, 20).is_ok());
        assert!(validate_range(11, 10, 20).is_err());
        assert!(validate_range(20, 25, 20).is_err());
    }

    #[test]
    fn test_object_id_equality() {
        let id1 = ObjectId {
            container: "container1".to_string(),
            object: "object1".to_string(),
        };
        let id2 = ObjectId {
            container: "container1".to_string(),
            object: "object1".to_string(),
        };
        assert_eq!(id1, id2);
    }
}