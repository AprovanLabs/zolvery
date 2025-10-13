// Main blobstore interface implementation
use std::sync::Arc;
use std::sync::OnceLock;

use crate::types::{BlobstoreResult, ContainerName, ObjectId};
use crate::storage::EmbeddedStorage;
use crate::container::Container;

// Global storage instance
static GLOBAL_STORAGE: OnceLock<Arc<EmbeddedStorage>> = OnceLock::new();

/// Initialize the blobstore with a new embedded storage instance
pub fn initialize_blobstore() -> Arc<EmbeddedStorage> {
    let storage = Arc::new(EmbeddedStorage::new());
    GLOBAL_STORAGE.set(Arc::clone(&storage)).ok();
    storage
}

/// Get the global storage instance, initializing if necessary
pub fn get_storage() -> Arc<EmbeddedStorage> {
    GLOBAL_STORAGE
        .get_or_init(|| Arc::new(EmbeddedStorage::new()))
        .clone()
}

/// Create a new empty container
pub fn create_container(name: ContainerName) -> BlobstoreResult<Container> {
    let storage = get_storage();
    storage.create_container(name.clone())?;
    Ok(Container::new(name, storage))
}

/// Retrieve a container by name
pub fn get_container(name: ContainerName) -> BlobstoreResult<Container> {
    let storage = get_storage();
    
    if !storage.container_exists(&name) {
        return Err(crate::types::BlobstoreError::ContainerNotFound(name));
    }
    
    Ok(Container::new(name, storage))
}

/// Delete a container and all objects within it
pub fn delete_container(name: ContainerName) -> BlobstoreResult<()> {
    let storage = get_storage();
    
    // First clear all objects in the container
    storage.clear_container(&name)?;
    
    // Then delete the container itself
    storage.delete_container(&name)
}

/// Check if a container exists
pub fn container_exists(name: ContainerName) -> BlobstoreResult<bool> {
    let storage = get_storage();
    Ok(storage.container_exists(&name))
}

/// Copy an object to the same or a different container
/// Returns an error if the target container does not exist
/// Overwrites destination object if it already existed
pub fn copy_object(src: ObjectId, dest: ObjectId) -> BlobstoreResult<()> {
    let storage = get_storage();
    
    // Verify destination container exists
    if !storage.container_exists(&dest.container) {
        return Err(crate::types::BlobstoreError::ContainerNotFound(dest.container));
    }
    
    storage.copy_object(&src, &dest)
}

/// Move or rename an object to the same or a different container
/// Returns an error if the destination container does not exist
/// Overwrites destination object if it already existed
pub fn move_object(src: ObjectId, dest: ObjectId) -> BlobstoreResult<()> {
    let storage = get_storage();
    
    // Verify destination container exists
    if !storage.container_exists(&dest.container) {
        return Err(crate::types::BlobstoreError::ContainerNotFound(dest.container));
    }
    
    storage.move_object(&src, &dest)
}

/// List all container names (utility function for debugging/testing)
pub fn list_containers() -> BlobstoreResult<Vec<ContainerName>> {
    let storage = get_storage();
    let containers = storage.containers.read();
    let mut names: Vec<ContainerName> = containers.keys().cloned().collect();
    names.sort();
    Ok(names)
}

/// Get statistics about the blobstore (utility function for debugging/testing)
#[derive(Debug, Clone)]
pub struct BlobstoreStats {
    pub container_count: usize,
    pub total_object_count: usize,
    pub total_data_size: u64,
}

pub fn get_blobstore_stats() -> BlobstoreResult<BlobstoreStats> {
    let storage = get_storage();
    let containers = storage.containers.read();
    
    let container_count = containers.len();
    let mut total_object_count = 0;
    let mut total_data_size = 0u64;
    
    for container in containers.values() {
        total_object_count += container.objects.len();
        for object in container.objects.values() {
            total_data_size += object.data.len() as u64;
        }
    }
    
    Ok(BlobstoreStats {
        container_count,
        total_object_count,
        total_data_size,
    })
}

/// Reset the global storage (useful for testing)
pub fn reset_blobstore() -> Arc<EmbeddedStorage> {
    let new_storage = Arc::new(EmbeddedStorage::new());
    // Note: We can't reset OnceLock, but we can return a new storage for testing
    new_storage
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::values::OutgoingValue;

    #[test]
    fn test_container_lifecycle() {
        let _storage = reset_blobstore(); // Use fresh storage for test
        
        // Initially no containers
        let containers = list_containers().unwrap();
        assert!(containers.is_empty());
        
        // Create container
        let container = create_container("test-container".to_string()).unwrap();
        assert_eq!(container.name().unwrap(), "test-container");
        
        // Check it exists
        assert!(container_exists("test-container".to_string()).unwrap());
        
        // List containers
        let containers = list_containers().unwrap();
        assert_eq!(containers, vec!["test-container".to_string()]);
        
        // Try to create duplicate (should fail)
        assert!(create_container("test-container".to_string()).is_err());
        
        // Get existing container
        let container2 = get_container("test-container".to_string()).unwrap();
        assert_eq!(container2.name().unwrap(), "test-container");
        
        // Delete container
        delete_container("test-container".to_string()).unwrap();
        assert!(!container_exists("test-container".to_string()).unwrap());
        
        // Try to get deleted container (should fail)
        assert!(get_container("test-container".to_string()).is_err());
    }

    #[test]
    fn test_object_copy_and_move() {
        let _storage = reset_blobstore();
        
        // Create two containers
        let container1 = create_container("container1".to_string()).unwrap();
        let container2 = create_container("container2".to_string()).unwrap();
        
        // Add object to container1
        let outgoing = OutgoingValue::new();
        let stream = outgoing.write_body().unwrap();
        stream.write(b"test data").unwrap();
        stream.close().unwrap();
        outgoing.finish().unwrap();
        
        container1.write_data("object1".to_string(), &outgoing).unwrap();
        
        let src = ObjectId {
            container: "container1".to_string(),
            object: "object1".to_string(),
        };
        let dest = ObjectId {
            container: "container2".to_string(),
            object: "object2".to_string(),
        };
        
        // Copy object
        copy_object(src.clone(), dest.clone()).unwrap();
        
        // Both objects should exist
        assert!(container1.has_object("object1".to_string()).unwrap());
        assert!(container2.has_object("object2".to_string()).unwrap());
        
        // Move object to a new location
        let move_dest = ObjectId {
            container: "container2".to_string(),
            object: "object3".to_string(),
        };
        move_object(src, move_dest).unwrap();
        
        // Source should be gone, destination should exist
        assert!(!container1.has_object("object1".to_string()).unwrap());
        assert!(container2.has_object("object3".to_string()).unwrap());
    }

    #[test]
    fn test_copy_to_nonexistent_container() {
        let _storage = reset_blobstore();
        
        let container1 = create_container("container1".to_string()).unwrap();
        
        let outgoing = OutgoingValue::new();
        let stream = outgoing.write_body().unwrap();
        stream.write(b"test data").unwrap();
        stream.close().unwrap();
        outgoing.finish().unwrap();
        
        container1.write_data("object1".to_string(), &outgoing).unwrap();
        
        let src = ObjectId {
            container: "container1".to_string(),
            object: "object1".to_string(),
        };
        let dest = ObjectId {
            container: "nonexistent".to_string(),
            object: "object2".to_string(),
        };
        
        // Should fail because destination container doesn't exist
        assert!(copy_object(src.clone(), dest.clone()).is_err());
        assert!(move_object(src, dest).is_err());
    }

    #[test]
    fn test_delete_container_with_objects() {
        let _storage = reset_blobstore();
        
        let container = create_container("test-container".to_string()).unwrap();
        
        // Add some objects
        for i in 0..3 {
            let outgoing = OutgoingValue::new();
            let stream = outgoing.write_body().unwrap();
            stream.write(format!("data{}", i).as_bytes()).unwrap();
            stream.close().unwrap();
            outgoing.finish().unwrap();
            
            container.write_data(format!("object{}", i), &outgoing).unwrap();
        }
        
        // Delete container (should clear objects first)
        delete_container("test-container".to_string()).unwrap();
        assert!(!container_exists("test-container".to_string()).unwrap());
    }

    #[test]
    fn test_blobstore_stats() {
        let _storage = reset_blobstore();
        
        // Initially empty
        let stats = get_blobstore_stats().unwrap();
        assert_eq!(stats.container_count, 0);
        assert_eq!(stats.total_object_count, 0);
        assert_eq!(stats.total_data_size, 0);
        
        // Create container and add objects
        let container = create_container("test-container".to_string()).unwrap();
        
        for i in 0..3 {
            let outgoing = OutgoingValue::new();
            let stream = outgoing.write_body().unwrap();
            let data = format!("data{}", i);
            stream.write(data.as_bytes()).unwrap();
            stream.close().unwrap();
            outgoing.finish().unwrap();
            
            container.write_data(format!("object{}", i), &outgoing).unwrap();
        }
        
        let stats = get_blobstore_stats().unwrap();
        assert_eq!(stats.container_count, 1);
        assert_eq!(stats.total_object_count, 3);
        assert_eq!(stats.total_data_size, 15); // "data0" + "data1" + "data2" = 5 + 5 + 5 = 15
    }

    #[test]
    fn test_object_overwrite_on_copy() {
        let _storage = reset_blobstore();
        
        let container1 = create_container("container1".to_string()).unwrap();
        let container2 = create_container("container2".to_string()).unwrap();
        
        // Add object to container1
        let outgoing1 = OutgoingValue::new();
        let stream1 = outgoing1.write_body().unwrap();
        stream1.write(b"original data").unwrap();
        stream1.close().unwrap();
        outgoing1.finish().unwrap();
        container1.write_data("object1".to_string(), &outgoing1).unwrap();
        
        // Add object with same name to container2
        let outgoing2 = OutgoingValue::new();
        let stream2 = outgoing2.write_body().unwrap();
        stream2.write(b"existing data").unwrap();
        stream2.close().unwrap();
        outgoing2.finish().unwrap();
        container2.write_data("object1".to_string(), &outgoing2).unwrap();
        
        let src = ObjectId {
            container: "container1".to_string(),
            object: "object1".to_string(),
        };
        let dest = ObjectId {
            container: "container2".to_string(),
            object: "object1".to_string(),
        };
        
        // Copy should overwrite
        copy_object(src, dest).unwrap();
        
        // Check that object in container2 now has the data from container1
        let incoming = container2.get_data("object1".to_string(), 0, 12).unwrap();
        let data = incoming.consume_sync().unwrap();
        assert_eq!(data, b"original data");
    }
}