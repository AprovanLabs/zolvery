// WASI Blobstore Implementation with Embedded Storage
// Main library entry point

#![deny(missing_docs)]
#![doc = include_str!("../README.md")]

//! # WASI Blobstore Implementation
//! 
//! This crate provides a complete implementation of the WASI blobstore specification
//! using an embedded in-memory storage backend. It implements all the required
//! interfaces and resources as defined in the WIT specification.
//! 
//! ## Features
//! 
//! - Complete WASI blobstore WIT specification implementation
//! - Embedded in-memory storage (no external dependencies)
//! - Thread-safe operations with Arc and RwLock
//! - Full error handling with custom error types
//! - Container and object lifecycle management
//! - Streaming support for large object lists
//! - Range-based object reading
//! 
//! ## Quick Start
//! 
//! ```rust
//! use blobstore_rs::{create_container, OutgoingValue};
//! 
//! // Create a container
//! let container = create_container("my-container".to_string()).unwrap();
//! 
//! // Write data to an object
//! let outgoing = OutgoingValue::new();
//! let stream = outgoing.write_body().unwrap();
//! stream.write(b"Hello, World!").unwrap();
//! stream.close().unwrap();
//! outgoing.finish().unwrap();
//! 
//! container.write_data("hello.txt".to_string(), &outgoing).unwrap();
//! 
//! // Read data back
//! let incoming = container.get_data("hello.txt".to_string(), 0, 12).unwrap();
//! let data = incoming.consume_sync().unwrap();
//! assert_eq!(data, b"Hello, World!");
//! ```

pub mod types;
pub mod storage;
pub mod values;
pub mod stream;
pub mod container;
pub mod blobstore;

// Re-export public API
pub use types::{
    ContainerName, ObjectName, Timestamp, ObjectSize, BlobstoreError, BlobstoreResult,
    ContainerMetadata, ObjectMetadata, ObjectId,
};

pub use values::{OutgoingValue, IncomingValue, IncomingValueStream, OutgoingValueStream};
pub use stream::StreamObjectNames;
pub use container::Container;

pub use blobstore::{
    initialize_blobstore, get_storage, create_container, get_container, delete_container,
    container_exists, copy_object, move_object, list_containers, get_blobstore_stats,
    BlobstoreStats,
};

// For testing and development
#[cfg(test)]
pub use blobstore::reset_blobstore;

#[cfg(test)]
mod integration_tests {
    use super::*;

    #[test]
    fn test_full_workflow() {
        let _storage = reset_blobstore();
        
        // Create container
        let container = create_container("test-workflow".to_string()).unwrap();
        
        // Write multiple objects
        let test_data = vec![
            ("file1.txt", "Hello, World!"),
            ("file2.txt", "This is a test file."),
            ("file3.txt", "Another test file with more data."),
        ];
        
        for (name, content) in &test_data {
            let outgoing = OutgoingValue::new();
            let stream = outgoing.write_body().unwrap();
            stream.write(content.as_bytes()).unwrap();
            stream.close().unwrap();
            outgoing.finish().unwrap();
            
            container.write_data(name.to_string(), &outgoing).unwrap();
        }
        
        // List all objects
        let mut object_stream = container.list_objects().unwrap();
        let (objects, _) = object_stream.read_stream_object_names(10).unwrap();
        assert_eq!(objects.len(), 3);
        assert!(objects.contains(&"file1.txt".to_string()));
        assert!(objects.contains(&"file2.txt".to_string()));
        assert!(objects.contains(&"file3.txt".to_string()));
        
        // Read objects back and verify content
        for (name, expected_content) in &test_data {
            let incoming = container.get_data(name.to_string(), 0, expected_content.len() as u64 - 1).unwrap();
            let data = incoming.consume_sync().unwrap();
            assert_eq!(data, expected_content.as_bytes());
        }
        
        // Test partial reads
        let incoming = container.get_data("file1.txt".to_string(), 7, 11).unwrap();
        let partial_data = incoming.consume_sync().unwrap();
        assert_eq!(partial_data, b"World");
        
        // Test object metadata
        let metadata = container.object_info("file1.txt".to_string()).unwrap();
        assert_eq!(metadata.name, "file1.txt");
        assert_eq!(metadata.container, "test-workflow");
        assert_eq!(metadata.size, 13); // "Hello, World!" is 13 bytes
        
        // Delete some objects
        container.delete_objects(vec![
            "file1.txt".to_string(),
            "file3.txt".to_string(),
        ]).unwrap();
        
        // Verify deletion
        assert!(!container.has_object("file1.txt".to_string()).unwrap());
        assert!(container.has_object("file2.txt".to_string()).unwrap());
        assert!(!container.has_object("file3.txt".to_string()).unwrap());
        
        // Clear remaining objects
        container.clear().unwrap();
        
        // Verify container is empty
        let mut object_stream = container.list_objects().unwrap();
        let (objects, _) = object_stream.read_stream_object_names(10).unwrap();
        assert!(objects.is_empty());
    }

    #[test]
    fn test_multi_container_operations() {
        let _storage = reset_blobstore();
        
        // Create multiple containers
        let container1 = create_container("container1".to_string()).unwrap();
        let container2 = create_container("container2".to_string()).unwrap();
        
        // Add objects to container1
        let outgoing = OutgoingValue::new();
        let stream = outgoing.write_body().unwrap();
        stream.write(b"shared data").unwrap();
        stream.close().unwrap();
        outgoing.finish().unwrap();
        
        container1.write_data("shared-object".to_string(), &outgoing).unwrap();
        
        // Copy object to container2
        copy_object(
            ObjectId {
                container: "container1".to_string(),
                object: "shared-object".to_string(),
            },
            ObjectId {
                container: "container2".to_string(),
                object: "copied-object".to_string(),
            },
        ).unwrap();
        
        // Verify both objects exist
        assert!(container1.has_object("shared-object".to_string()).unwrap());
        assert!(container2.has_object("copied-object".to_string()).unwrap());
        
        // Verify content is the same
        let data1 = container1.get_data("shared-object".to_string(), 0, 10).unwrap();
        let data2 = container2.get_data("copied-object".to_string(), 0, 10).unwrap();
        
        let content1 = data1.consume_sync().unwrap();
        let content2 = data2.consume_sync().unwrap();
        assert_eq!(content1, content2);
        assert_eq!(content1, b"shared data");
        
        // Move object from container2 to container1 with new name
        move_object(
            ObjectId {
                container: "container2".to_string(),
                object: "copied-object".to_string(),
            },
            ObjectId {
                container: "container1".to_string(),
                object: "moved-object".to_string(),
            },
        ).unwrap();
        
        // Verify move
        assert!(!container2.has_object("copied-object".to_string()).unwrap());
        assert!(container1.has_object("moved-object".to_string()).unwrap());
        
        // Check container list
        let containers = list_containers().unwrap();
        assert_eq!(containers, vec!["container1".to_string(), "container2".to_string()]);
        
        // Delete containers
        delete_container("container1".to_string()).unwrap();
        delete_container("container2".to_string()).unwrap();
        
        // Verify deletion
        assert!(!container_exists("container1".to_string()).unwrap());
        assert!(!container_exists("container2".to_string()).unwrap());
        
        let containers = list_containers().unwrap();
        assert!(containers.is_empty());
    }

    #[test]
    fn test_streaming_large_object_list() {
        let _storage = reset_blobstore();
        
        let container = create_container("large-container".to_string()).unwrap();
        
        // Create many objects
        let object_count = 100;
        for i in 0..object_count {
            let outgoing = OutgoingValue::new();
            let stream = outgoing.write_body().unwrap();
            stream.write(format!("data for object {}", i).as_bytes()).unwrap();
            stream.close().unwrap();
            outgoing.finish().unwrap();
            
            container.write_data(format!("object_{:03}", i), &outgoing).unwrap();
        }
        
        // Stream objects in chunks
        let mut object_stream = container.list_objects().unwrap();
        let mut all_objects = Vec::new();
        let chunk_size = 10;
        
        loop {
            let (chunk, is_end) = object_stream.read_stream_object_names(chunk_size).unwrap();
            all_objects.extend(chunk);
            
            if is_end {
                break;
            }
        }
        
        assert_eq!(all_objects.len(), object_count);
        
        // Verify objects are sorted
        for i in 0..object_count {
            assert_eq!(all_objects[i], format!("object_{:03}", i));
        }
        
        // Test skipping
        let mut object_stream2 = container.list_objects().unwrap();
        let (skipped, _) = object_stream2.skip_stream_object_names(50).unwrap();
        assert_eq!(skipped, 50);
        
        let (remaining, _) = object_stream2.read_stream_object_names(100).unwrap();
        assert_eq!(remaining.len(), 50);
        assert_eq!(remaining[0], "object_050".to_string());
    }

    #[test]
    fn test_error_conditions() {
        let _storage = reset_blobstore();
        
        // Try to get non-existent container
        assert!(get_container("non-existent".to_string()).is_err());
        
        // Try to delete non-existent container
        assert!(delete_container("non-existent".to_string()).is_err());
        
        let container = create_container("test-errors".to_string()).unwrap();
        
        // Try to read non-existent object
        assert!(container.get_data("non-existent".to_string(), 0, 10).is_err());
        
        // Try to get info for non-existent object
        assert!(container.object_info("non-existent".to_string()).is_err());
        
        // Add an object
        let outgoing = OutgoingValue::new();
        let stream = outgoing.write_body().unwrap();
        stream.write(b"0123456789").unwrap();
        stream.close().unwrap();
        outgoing.finish().unwrap();
        
        container.write_data("test-object".to_string(), &outgoing).unwrap();
        
        // Try invalid range read
        assert!(container.get_data("test-object".to_string(), 15, 20).is_err());
        assert!(container.get_data("test-object".to_string(), 5, 3).is_err());
        
        // Try to copy from non-existent container
        assert!(copy_object(
            ObjectId {
                container: "non-existent".to_string(),
                object: "object".to_string(),
            },
            ObjectId {
                container: "test-errors".to_string(),
                object: "copied".to_string(),
            },
        ).is_err());
        
        // Try to copy to non-existent container
        assert!(copy_object(
            ObjectId {
                container: "test-errors".to_string(),
                object: "test-object".to_string(),
            },
            ObjectId {
                container: "non-existent".to_string(),
                object: "copied".to_string(),
            },
        ).is_err());
    }
}