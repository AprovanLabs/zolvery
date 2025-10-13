// Container resource implementation
use std::sync::Arc;

use crate::types::{
    BlobstoreResult, ContainerName, ObjectName, ContainerMetadata, ObjectMetadata,
};
use crate::storage::EmbeddedStorage;
use crate::stream::StreamObjectNames;
use crate::values::{IncomingValue, OutgoingValue};

/// Container resource representing a collection of objects
pub struct Container {
    name: ContainerName,
    storage: Arc<EmbeddedStorage>,
}

impl Container {
    /// Create a new container instance
    pub fn new(name: ContainerName, storage: Arc<EmbeddedStorage>) -> Self {
        Self { name, storage }
    }

    /// Get the container name
    pub fn name(&self) -> BlobstoreResult<String> {
        Ok(self.name.clone())
    }

    /// Get container metadata
    pub fn info(&self) -> BlobstoreResult<ContainerMetadata> {
        self.storage.get_container_metadata(&self.name)
    }

    /// Retrieve an object or portion of an object as an IncomingValue
    /// Start and end offsets are inclusive
    pub fn get_data(
        &self,
        name: ObjectName,
        start: u64,
        end: u64,
    ) -> BlobstoreResult<IncomingValue> {
        let data = self.storage.get_object_data(
            &self.name,
            &name,
            Some(start),
            Some(end),
        )?;
        
        Ok(IncomingValue::new(data))
    }

    /// Create or replace an object with the data from an OutgoingValue
    pub fn write_data(
        &self,
        name: ObjectName,
        data: &OutgoingValue,
    ) -> BlobstoreResult<()> {
        if !data.is_finished() {
            return Err(crate::types::BlobstoreError::InvalidOperation(
                "OutgoingValue must be finished before writing".to_string(),
            ));
        }

        let object_data = data.get_data()?;
        self.storage.put_object_data(&self.name, &name, object_data)
    }

    /// Get a stream of object names in the container
    pub fn list_objects(&self) -> BlobstoreResult<StreamObjectNames> {
        let objects = self.storage.list_objects(&self.name)?;
        Ok(StreamObjectNames::new(objects))
    }

    /// Delete a single object
    /// Does not return error if object did not exist
    pub fn delete_object(&self, name: ObjectName) -> BlobstoreResult<()> {
        self.storage.delete_object(&self.name, &name)
    }

    /// Delete multiple objects in the container
    pub fn delete_objects(&self, names: Vec<ObjectName>) -> BlobstoreResult<()> {
        self.storage.delete_objects(&self.name, &names)
    }

    /// Check if an object exists in this container
    pub fn has_object(&self, name: ObjectName) -> BlobstoreResult<bool> {
        self.storage.object_exists(&self.name, &name)
    }

    /// Get metadata for an object
    pub fn object_info(&self, name: ObjectName) -> BlobstoreResult<ObjectMetadata> {
        self.storage.get_object_metadata(&self.name, &name)
    }

    /// Remove all objects within the container, leaving the container empty
    pub fn clear(&self) -> BlobstoreResult<()> {
        self.storage.clear_container(&self.name)
    }

    /// Get the underlying storage reference (for testing/internal use)
    pub(crate) fn storage(&self) -> &Arc<EmbeddedStorage> {
        &self.storage
    }

    /// Get container name reference
    pub(crate) fn container_name(&self) -> &ContainerName {
        &self.name
    }
}

// Implement Clone for Container to allow sharing
impl Clone for Container {
    fn clone(&self) -> Self {
        Self {
            name: self.name.clone(),
            storage: Arc::clone(&self.storage),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::storage::EmbeddedStorage;

    fn setup_test_container() -> (Arc<EmbeddedStorage>, Container) {
        let storage = Arc::new(EmbeddedStorage::new());
        storage.create_container("test-container".to_string()).unwrap();
        let container = Container::new("test-container".to_string(), Arc::clone(&storage));
        (storage, container)
    }

    #[test]
    fn test_container_name() {
        let (_storage, container) = setup_test_container();
        
        let name = container.name().unwrap();
        assert_eq!(name, "test-container");
    }

    #[test]
    fn test_container_info() {
        let (_storage, container) = setup_test_container();
        
        let info = container.info().unwrap();
        assert_eq!(info.name, "test-container");
        assert!(info.created_at > 0);
    }

    #[test]
    fn test_write_and_read_data() {
        let (_storage, container) = setup_test_container();
        
        // Create outgoing value
        let outgoing = OutgoingValue::new();
        let stream = outgoing.write_body().unwrap();
        stream.write(b"Hello, World!").unwrap();
        stream.close().unwrap();
        outgoing.finish().unwrap();
        
        // Write data
        container.write_data("test-object".to_string(), &outgoing).unwrap();
        
        // Read data back
        let incoming = container.get_data("test-object".to_string(), 0, 12).unwrap();
        assert_eq!(incoming.size(), 13); // "Hello, World!" is 13 bytes
        
        let data = incoming.consume_sync().unwrap();
        assert_eq!(data, b"Hello, World!");
    }

    #[test]
    fn test_write_unfinished_outgoing_value() {
        let (_storage, container) = setup_test_container();
        
        // Create outgoing value but don't finish it
        let outgoing = OutgoingValue::new();
        let stream = outgoing.write_body().unwrap();
        stream.write(b"Hello").unwrap();
        // Note: not calling finish()
        
        // Try to write data (should fail)
        let result = container.write_data("test-object".to_string(), &outgoing);
        assert!(result.is_err());
    }

    #[test]
    fn test_partial_read() {
        let (_storage, container) = setup_test_container();
        
        // Write some data
        let outgoing = OutgoingValue::new();
        let stream = outgoing.write_body().unwrap();
        stream.write(b"0123456789").unwrap();
        stream.close().unwrap();
        outgoing.finish().unwrap();
        
        container.write_data("test-object".to_string(), &outgoing).unwrap();
        
        // Read partial data
        let incoming = container.get_data("test-object".to_string(), 2, 5).unwrap();
        let data = incoming.consume_sync().unwrap();
        assert_eq!(data, b"2345");
    }

    #[test]
    fn test_object_operations() {
        let (_storage, container) = setup_test_container();
        
        // Initially no objects
        assert!(!container.has_object("test-object".to_string()).unwrap());
        
        // Write an object
        let outgoing = OutgoingValue::new();
        let stream = outgoing.write_body().unwrap();
        stream.write(b"test data").unwrap();
        stream.close().unwrap();
        outgoing.finish().unwrap();
        
        container.write_data("test-object".to_string(), &outgoing).unwrap();
        
        // Now object should exist
        assert!(container.has_object("test-object".to_string()).unwrap());
        
        // Get object info
        let info = container.object_info("test-object".to_string()).unwrap();
        assert_eq!(info.name, "test-object");
        assert_eq!(info.container, "test-container");
        assert_eq!(info.size, 9); // "test data" is 9 bytes
        
        // Delete object
        container.delete_object("test-object".to_string()).unwrap();
        assert!(!container.has_object("test-object".to_string()).unwrap());
        
        // Delete non-existent object (should not error)
        container.delete_object("non-existent".to_string()).unwrap();
    }

    #[test]
    fn test_list_objects() {
        let (_storage, container) = setup_test_container();
        
        // Add some objects
        for i in 0..5 {
            let outgoing = OutgoingValue::new();
            let stream = outgoing.write_body().unwrap();
            stream.write(format!("data{}", i).as_bytes()).unwrap();
            stream.close().unwrap();
            outgoing.finish().unwrap();
            
            container.write_data(format!("object{}", i), &outgoing).unwrap();
        }
        
        // List objects
        let mut stream = container.list_objects().unwrap();
        let (objects, _) = stream.read_stream_object_names(10).unwrap();
        
        assert_eq!(objects.len(), 5);
        // Should be sorted
        assert_eq!(objects, vec![
            "object0".to_string(),
            "object1".to_string(),
            "object2".to_string(),
            "object3".to_string(),
            "object4".to_string(),
        ]);
    }

    #[test]
    fn test_delete_multiple_objects() {
        let (_storage, container) = setup_test_container();
        
        // Add some objects
        for i in 0..5 {
            let outgoing = OutgoingValue::new();
            let stream = outgoing.write_body().unwrap();
            stream.write(format!("data{}", i).as_bytes()).unwrap();
            stream.close().unwrap();
            outgoing.finish().unwrap();
            
            container.write_data(format!("object{}", i), &outgoing).unwrap();
        }
        
        // Delete multiple objects
        let to_delete = vec![
            "object1".to_string(),
            "object3".to_string(),
            "non-existent".to_string(), // Should not cause error
        ];
        container.delete_objects(to_delete).unwrap();
        
        // Check remaining objects
        let mut stream = container.list_objects().unwrap();
        let (objects, _) = stream.read_stream_object_names(10).unwrap();
        
        assert_eq!(objects, vec![
            "object0".to_string(),
            "object2".to_string(),
            "object4".to_string(),
        ]);
    }

    #[test]
    fn test_clear_container() {
        let (_storage, container) = setup_test_container();
        
        // Add some objects
        for i in 0..3 {
            let outgoing = OutgoingValue::new();
            let stream = outgoing.write_body().unwrap();
            stream.write(format!("data{}", i).as_bytes()).unwrap();
            stream.close().unwrap();
            outgoing.finish().unwrap();
            
            container.write_data(format!("object{}", i), &outgoing).unwrap();
        }
        
        // Verify objects exist
        let mut stream = container.list_objects().unwrap();
        let (objects, _) = stream.read_stream_object_names(10).unwrap();
        assert_eq!(objects.len(), 3);
        
        // Clear container
        container.clear().unwrap();
        
        // Verify container is empty
        let mut stream = container.list_objects().unwrap();
        let (objects, _) = stream.read_stream_object_names(10).unwrap();
        assert!(objects.is_empty());
    }

    #[test]
    fn test_container_clone() {
        let (_storage, container1) = setup_test_container();
        let container2 = container1.clone();
        
        // Both containers should refer to the same underlying storage
        assert_eq!(container1.name().unwrap(), container2.name().unwrap());
        
        // Operations on one should be visible from the other
        let outgoing = OutgoingValue::new();
        let stream = outgoing.write_body().unwrap();
        stream.write(b"shared data").unwrap();
        stream.close().unwrap();
        outgoing.finish().unwrap();
        
        container1.write_data("shared-object".to_string(), &outgoing).unwrap();
        
        assert!(container2.has_object("shared-object".to_string()).unwrap());
    }
}