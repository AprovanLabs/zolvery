// Embedded in-memory storage backend for blobstore
use std::collections::HashMap;
use std::sync::Arc;
use parking_lot::RwLock;

use crate::types::{
    BlobstoreError, BlobstoreResult, ContainerName, ObjectName, ContainerMetadata,
    ObjectMetadata, ObjectId, StoredObject, StoredContainer, current_timestamp,
    validate_range,
};

/// Thread-safe embedded storage implementation using in-memory data structures
#[derive(Debug, Default)]
pub struct EmbeddedStorage {
    containers: Arc<RwLock<HashMap<ContainerName, StoredContainer>>>,
}

impl EmbeddedStorage {
    /// Create a new embedded storage instance
    pub fn new() -> Self {
        Self {
            containers: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    /// Create a new empty container
    pub fn create_container(&self, name: ContainerName) -> BlobstoreResult<()> {
        let mut containers = self.containers.write();
        
        if containers.contains_key(&name) {
            return Err(BlobstoreError::ContainerAlreadyExists(name));
        }

        let metadata = ContainerMetadata {
            name: name.clone(),
            created_at: current_timestamp(),
        };

        let container = StoredContainer {
            metadata,
            objects: HashMap::new(),
        };

        containers.insert(name, container);
        Ok(())
    }

    /// Check if a container exists
    pub fn container_exists(&self, name: &ContainerName) -> bool {
        let containers = self.containers.read();
        containers.contains_key(name)
    }

    /// Get container metadata
    pub fn get_container_metadata(&self, name: &ContainerName) -> BlobstoreResult<ContainerMetadata> {
        let containers = self.containers.read();
        
        match containers.get(name) {
            Some(container) => Ok(container.metadata.clone()),
            None => Err(BlobstoreError::ContainerNotFound(name.clone())),
        }
    }

    /// Delete a container (must be empty)
    pub fn delete_container(&self, name: &ContainerName) -> BlobstoreResult<()> {
        let mut containers = self.containers.write();
        
        match containers.get(name) {
            Some(container) => {
                if !container.objects.is_empty() {
                    return Err(BlobstoreError::ContainerNotEmpty(name.clone()));
                }
                containers.remove(name);
                Ok(())
            }
            None => Err(BlobstoreError::ContainerNotFound(name.clone())),
        }
    }

    /// List all object names in a container
    pub fn list_objects(&self, container_name: &ContainerName) -> BlobstoreResult<Vec<ObjectName>> {
        let containers = self.containers.read();
        
        match containers.get(container_name) {
            Some(container) => {
                let mut names: Vec<ObjectName> = container.objects.keys().cloned().collect();
                names.sort(); // Provide consistent ordering
                Ok(names)
            }
            None => Err(BlobstoreError::ContainerNotFound(container_name.clone())),
        }
    }

    /// Get object data, optionally with range
    pub fn get_object_data(
        &self,
        container_name: &ContainerName,
        object_name: &ObjectName,
        start: Option<u64>,
        end: Option<u64>,
    ) -> BlobstoreResult<Vec<u8>> {
        let containers = self.containers.read();
        
        let container = containers
            .get(container_name)
            .ok_or_else(|| BlobstoreError::ContainerNotFound(container_name.clone()))?;

        let object = container
            .objects
            .get(object_name)
            .ok_or_else(|| BlobstoreError::ObjectNotFound(object_name.clone()))?;

        let data = &object.data;
        
        match (start, end) {
            (Some(start), Some(end)) => {
                validate_range(start, end, data.len() as u64)?;
                let start_idx = start as usize;
                let end_idx = std::cmp::min((end + 1) as usize, data.len());
                Ok(data[start_idx..end_idx].to_vec())
            }
            _ => Ok(data.clone()),
        }
    }

    /// Put object data
    pub fn put_object_data(
        &self,
        container_name: &ContainerName,
        object_name: &ObjectName,
        data: Vec<u8>,
    ) -> BlobstoreResult<()> {
        let mut containers = self.containers.write();
        
        let container = containers
            .get_mut(container_name)
            .ok_or_else(|| BlobstoreError::ContainerNotFound(container_name.clone()))?;

        let metadata = ObjectMetadata {
            name: object_name.clone(),
            container: container_name.clone(),
            created_at: current_timestamp(),
            size: data.len() as u64,
        };

        let stored_object = StoredObject {
            metadata,
            data,
        };

        container.objects.insert(object_name.clone(), stored_object);
        Ok(())
    }

    /// Delete an object
    pub fn delete_object(
        &self,
        container_name: &ContainerName,
        object_name: &ObjectName,
    ) -> BlobstoreResult<()> {
        let mut containers = self.containers.write();
        
        let container = containers
            .get_mut(container_name)
            .ok_or_else(|| BlobstoreError::ContainerNotFound(container_name.clone()))?;

        // Note: WIT spec says this shouldn't return error if object doesn't exist
        container.objects.remove(object_name);
        Ok(())
    }

    /// Delete multiple objects
    pub fn delete_objects(
        &self,
        container_name: &ContainerName,
        object_names: &[ObjectName],
    ) -> BlobstoreResult<()> {
        let mut containers = self.containers.write();
        
        let container = containers
            .get_mut(container_name)
            .ok_or_else(|| BlobstoreError::ContainerNotFound(container_name.clone()))?;

        for object_name in object_names {
            container.objects.remove(object_name);
        }
        Ok(())
    }

    /// Check if an object exists
    pub fn object_exists(
        &self,
        container_name: &ContainerName,
        object_name: &ObjectName,
    ) -> BlobstoreResult<bool> {
        let containers = self.containers.read();
        
        let container = containers
            .get(container_name)
            .ok_or_else(|| BlobstoreError::ContainerNotFound(container_name.clone()))?;

        Ok(container.objects.contains_key(object_name))
    }

    /// Get object metadata
    pub fn get_object_metadata(
        &self,
        container_name: &ContainerName,
        object_name: &ObjectName,
    ) -> BlobstoreResult<ObjectMetadata> {
        let containers = self.containers.read();
        
        let container = containers
            .get(container_name)
            .ok_or_else(|| BlobstoreError::ContainerNotFound(container_name.clone()))?;

        let object = container
            .objects
            .get(object_name)
            .ok_or_else(|| BlobstoreError::ObjectNotFound(object_name.clone()))?;

        Ok(object.metadata.clone())
    }

    /// Clear all objects from a container
    pub fn clear_container(&self, container_name: &ContainerName) -> BlobstoreResult<()> {
        let mut containers = self.containers.write();
        
        let container = containers
            .get_mut(container_name)
            .ok_or_else(|| BlobstoreError::ContainerNotFound(container_name.clone()))?;

        container.objects.clear();
        Ok(())
    }

    /// Copy an object within or between containers
    pub fn copy_object(&self, src: &ObjectId, dest: &ObjectId) -> BlobstoreResult<()> {
        let mut containers = self.containers.write();
        
        // Get source object
        let src_container = containers
            .get(&src.container)
            .ok_or_else(|| BlobstoreError::ContainerNotFound(src.container.clone()))?;

        let src_object = src_container
            .objects
            .get(&src.object)
            .ok_or_else(|| BlobstoreError::ObjectNotFound(src.object.clone()))?
            .clone();

        // Check destination container exists
        if !containers.contains_key(&dest.container) {
            return Err(BlobstoreError::ContainerNotFound(dest.container.clone()));
        }

        // Create new object with updated metadata
        let mut dest_object = src_object;
        dest_object.metadata.name = dest.object.clone();
        dest_object.metadata.container = dest.container.clone();
        dest_object.metadata.created_at = current_timestamp();

        // Insert into destination container
        let dest_container = containers.get_mut(&dest.container).unwrap();
        dest_container.objects.insert(dest.object.clone(), dest_object);

        Ok(())
    }

    /// Move an object within or between containers
    pub fn move_object(&self, src: &ObjectId, dest: &ObjectId) -> BlobstoreResult<()> {
        // Copy first
        self.copy_object(src, dest)?;
        
        // Then delete source
        self.delete_object(&src.container, &src.object)?;
        
        Ok(())
    }

    /// Get total number of containers (for testing/debugging)
    pub fn container_count(&self) -> usize {
        let containers = self.containers.read();
        containers.len()
    }

    /// Get total number of objects in a container (for testing/debugging)
    pub fn object_count(&self, container_name: &ContainerName) -> BlobstoreResult<usize> {
        let containers = self.containers.read();
        
        match containers.get(container_name) {
            Some(container) => Ok(container.objects.len()),
            None => Err(BlobstoreError::ContainerNotFound(container_name.clone())),
        }
    }
}

// Implement Clone for EmbeddedStorage to allow sharing
impl Clone for EmbeddedStorage {
    fn clone(&self) -> Self {
        Self {
            containers: Arc::clone(&self.containers),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_container_operations() {
        let storage = EmbeddedStorage::new();
        
        // Create container
        assert!(storage.create_container("test-container".to_string()).is_ok());
        assert!(storage.container_exists(&"test-container".to_string()));
        
        // Try to create duplicate
        assert!(storage.create_container("test-container".to_string()).is_err());
        
        // Get metadata
        let metadata = storage.get_container_metadata(&"test-container".to_string()).unwrap();
        assert_eq!(metadata.name, "test-container");
        
        // Delete container
        assert!(storage.delete_container(&"test-container".to_string()).is_ok());
        assert!(!storage.container_exists(&"test-container".to_string()));
    }

    #[test]
    fn test_object_operations() {
        let storage = EmbeddedStorage::new();
        storage.create_container("test-container".to_string()).unwrap();
        
        let data = vec![1, 2, 3, 4, 5];
        
        // Put object
        assert!(storage
            .put_object_data(&"test-container".to_string(), &"test-object".to_string(), data.clone())
            .is_ok());
        
        // Check exists
        assert!(storage
            .object_exists(&"test-container".to_string(), &"test-object".to_string())
            .unwrap());
        
        // Get object
        let retrieved = storage
            .get_object_data(&"test-container".to_string(), &"test-object".to_string(), None, None)
            .unwrap();
        assert_eq!(retrieved, data);
        
        // Get with range
        let partial = storage
            .get_object_data(&"test-container".to_string(), &"test-object".to_string(), Some(1), Some(3))
            .unwrap();
        assert_eq!(partial, vec![2, 3, 4]);
        
        // Get metadata
        let metadata = storage
            .get_object_metadata(&"test-container".to_string(), &"test-object".to_string())
            .unwrap();
        assert_eq!(metadata.name, "test-object");
        assert_eq!(metadata.size, 5);
        
        // Delete object
        assert!(storage
            .delete_object(&"test-container".to_string(), &"test-object".to_string())
            .is_ok());
        assert!(!storage
            .object_exists(&"test-container".to_string(), &"test-object".to_string())
            .unwrap());
    }

    #[test]
    fn test_copy_and_move_operations() {
        let storage = EmbeddedStorage::new();
        storage.create_container("container1".to_string()).unwrap();
        storage.create_container("container2".to_string()).unwrap();
        
        let data = vec![1, 2, 3, 4, 5];
        storage
            .put_object_data(&"container1".to_string(), &"object1".to_string(), data.clone())
            .unwrap();
        
        let src = ObjectId {
            container: "container1".to_string(),
            object: "object1".to_string(),
        };
        let dest = ObjectId {
            container: "container2".to_string(),
            object: "object2".to_string(),
        };
        
        // Copy object
        assert!(storage.copy_object(&src, &dest).is_ok());
        assert!(storage
            .object_exists(&"container1".to_string(), &"object1".to_string())
            .unwrap());
        assert!(storage
            .object_exists(&"container2".to_string(), &"object2".to_string())
            .unwrap());
        
        // Move object
        let move_dest = ObjectId {
            container: "container2".to_string(),
            object: "object3".to_string(),
        };
        assert!(storage.move_object(&src, &move_dest).is_ok());
        assert!(!storage
            .object_exists(&"container1".to_string(), &"object1".to_string())
            .unwrap());
        assert!(storage
            .object_exists(&"container2".to_string(), &"object3".to_string())
            .unwrap());
    }
}