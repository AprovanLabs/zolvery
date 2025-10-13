// StreamObjectNames resource for streaming object name results
use crate::types::{BlobstoreError, BlobstoreResult, ObjectName};

/// Stream for iterating through object names in a container
pub struct StreamObjectNames {
    objects: Vec<ObjectName>,
    position: usize,
}

impl StreamObjectNames {
    /// Create a new stream with the given object names
    pub fn new(mut objects: Vec<ObjectName>) -> Self {
        // Sort for consistent ordering
        objects.sort();
        Self {
            objects,
            position: 0,
        }
    }

    /// Read the next number of objects from the stream
    /// Returns (objects, end_of_stream)
    pub fn read_stream_object_names(&mut self, len: u64) -> BlobstoreResult<(Vec<ObjectName>, bool)> {
        let requested_length = len as usize;
        let remaining = self.objects.len() - self.position;
        
        if remaining == 0 {
            return Ok((Vec::new(), true));
        }

        let to_read = std::cmp::min(requested_length, remaining);
        let end_position = self.position + to_read;
        
        let result = self.objects[self.position..end_position].to_vec();
        self.position = end_position;
        
        let is_end = self.position >= self.objects.len();
        
        Ok((result, is_end))
    }

    /// Skip the next number of objects in the stream
    /// Returns (actually_skipped, end_of_stream)
    pub fn skip_stream_object_names(&mut self, num: u64) -> BlobstoreResult<(u64, bool)> {
        let requested_skip = num as usize;
        let remaining = self.objects.len() - self.position;
        
        if remaining == 0 {
            return Ok((0, true));
        }

        let to_skip = std::cmp::min(requested_skip, remaining);
        self.position += to_skip;
        
        let is_end = self.position >= self.objects.len();
        
        Ok((to_skip as u64, is_end))
    }

    /// Get the current position in the stream
    pub fn position(&self) -> usize {
        self.position
    }

    /// Get the total number of objects in the stream
    pub fn total_count(&self) -> usize {
        self.objects.len()
    }

    /// Check if the stream has reached the end
    pub fn is_end(&self) -> bool {
        self.position >= self.objects.len()
    }

    /// Reset the stream to the beginning
    pub fn reset(&mut self) {
        self.position = 0;
    }

    /// Get the remaining number of objects in the stream
    pub fn remaining_count(&self) -> usize {
        if self.position >= self.objects.len() {
            0
        } else {
            self.objects.len() - self.position
        }
    }

    /// Peek at the next object name without advancing the stream
    pub fn peek_next(&self) -> Option<&ObjectName> {
        if self.position < self.objects.len() {
            Some(&self.objects[self.position])
        } else {
            None
        }
    }

    /// Read all remaining objects from the stream
    pub fn read_all_remaining(&mut self) -> BlobstoreResult<Vec<ObjectName>> {
        if self.position >= self.objects.len() {
            return Ok(Vec::new());
        }

        let result = self.objects[self.position..].to_vec();
        self.position = self.objects.len();
        
        Ok(result)
    }

    /// Create an iterator over the remaining objects
    pub fn iter_remaining(&self) -> impl Iterator<Item = &ObjectName> {
        self.objects[self.position..].iter()
    }
}

impl Iterator for StreamObjectNames {
    type Item = ObjectName;

    fn next(&mut self) -> Option<Self::Item> {
        if self.position < self.objects.len() {
            let item = self.objects[self.position].clone();
            self.position += 1;
            Some(item)
        } else {
            None
        }
    }

    fn size_hint(&self) -> (usize, Option<usize>) {
        let remaining = self.remaining_count();
        (remaining, Some(remaining))
    }
}

impl ExactSizeIterator for StreamObjectNames {
    fn len(&self) -> usize {
        self.remaining_count()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn create_test_objects() -> Vec<ObjectName> {
        vec![
            "object3".to_string(),
            "object1".to_string(),
            "object4".to_string(),
            "object2".to_string(),
            "object5".to_string(),
        ]
    }

    #[test]
    fn test_stream_creation_and_sorting() {
        let objects = create_test_objects();
        let stream = StreamObjectNames::new(objects);
        
        // Should be sorted
        assert_eq!(stream.objects, vec![
            "object1".to_string(),
            "object2".to_string(),
            "object3".to_string(),
            "object4".to_string(),
            "object5".to_string(),
        ]);
        
        assert_eq!(stream.position(), 0);
        assert_eq!(stream.total_count(), 5);
        assert_eq!(stream.remaining_count(), 5);
        assert!(!stream.is_end());
    }

    #[test]
    fn test_read_stream_object_names() {
        let objects = create_test_objects();
        let mut stream = StreamObjectNames::new(objects);
        
        // Read first 2 objects
        let (result1, is_end1) = stream.read_stream_object_names(2).unwrap();
        assert_eq!(result1, vec!["object1".to_string(), "object2".to_string()]);
        assert!(!is_end1);
        assert_eq!(stream.position(), 2);
        assert_eq!(stream.remaining_count(), 3);
        
        // Read next 3 objects
        let (result2, is_end2) = stream.read_stream_object_names(3).unwrap();
        assert_eq!(result2, vec![
            "object3".to_string(),
            "object4".to_string(),
            "object5".to_string()
        ]);
        assert!(is_end2);
        assert_eq!(stream.position(), 5);
        assert_eq!(stream.remaining_count(), 0);
        assert!(stream.is_end());
        
        // Try to read more (should return empty)
        let (result3, is_end3) = stream.read_stream_object_names(5).unwrap();
        assert!(result3.is_empty());
        assert!(is_end3);
    }

    #[test]
    fn test_read_more_than_available() {
        let objects = vec!["object1".to_string(), "object2".to_string()];
        let mut stream = StreamObjectNames::new(objects);
        
        // Try to read more than available
        let (result, is_end) = stream.read_stream_object_names(10).unwrap();
        assert_eq!(result.len(), 2);
        assert!(is_end);
        assert!(stream.is_end());
    }

    #[test]
    fn test_skip_stream_object_names() {
        let objects = create_test_objects();
        let mut stream = StreamObjectNames::new(objects);
        
        // Skip first 2 objects
        let (skipped1, is_end1) = stream.skip_stream_object_names(2).unwrap();
        assert_eq!(skipped1, 2);
        assert!(!is_end1);
        assert_eq!(stream.position(), 2);
        
        // Read next object to verify position
        let (result, _) = stream.read_stream_object_names(1).unwrap();
        assert_eq!(result, vec!["object3".to_string()]);
        
        // Skip remaining
        let (skipped2, is_end2) = stream.skip_stream_object_names(10).unwrap();
        assert_eq!(skipped2, 2); // Only 2 remaining
        assert!(is_end2);
        assert!(stream.is_end());
        
        // Try to skip more (should return 0)
        let (skipped3, is_end3) = stream.skip_stream_object_names(5).unwrap();
        assert_eq!(skipped3, 0);
        assert!(is_end3);
    }

    #[test]
    fn test_iterator_interface() {
        let objects = vec![
            "object2".to_string(),
            "object1".to_string(),
            "object3".to_string(),
        ];
        let mut stream = StreamObjectNames::new(objects);
        
        // Test iterator
        let collected: Vec<ObjectName> = stream.collect();
        assert_eq!(collected, vec![
            "object1".to_string(),
            "object2".to_string(),
            "object3".to_string(),
        ]);
        assert!(stream.is_end());
    }

    #[test]
    fn test_utility_methods() {
        let objects = create_test_objects();
        let mut stream = StreamObjectNames::new(objects);
        
        // Test peek
        assert_eq!(stream.peek_next(), Some(&"object1".to_string()));
        assert_eq!(stream.position(), 0); // Position shouldn't change
        
        // Advance and peek again
        stream.read_stream_object_names(2).unwrap();
        assert_eq!(stream.peek_next(), Some(&"object3".to_string()));
        
        // Test read all remaining
        let remaining = stream.read_all_remaining().unwrap();
        assert_eq!(remaining, vec![
            "object3".to_string(),
            "object4".to_string(),
            "object5".to_string(),
        ]);
        assert!(stream.is_end());
        
        // Test reset
        stream.reset();
        assert_eq!(stream.position(), 0);
        assert!(!stream.is_end());
        assert_eq!(stream.remaining_count(), 5);
    }

    #[test]
    fn test_empty_stream() {
        let objects: Vec<ObjectName> = Vec::new();
        let mut stream = StreamObjectNames::new(objects);
        
        assert_eq!(stream.total_count(), 0);
        assert_eq!(stream.remaining_count(), 0);
        assert!(stream.is_end());
        
        let (result, is_end) = stream.read_stream_object_names(5).unwrap();
        assert!(result.is_empty());
        assert!(is_end);
        
        let (skipped, is_end) = stream.skip_stream_object_names(5).unwrap();
        assert_eq!(skipped, 0);
        assert!(is_end);
    }

    #[test]
    fn test_size_hint() {
        let objects = create_test_objects();
        let mut stream = StreamObjectNames::new(objects);
        
        assert_eq!(stream.size_hint(), (5, Some(5)));
        assert_eq!(stream.len(), 5);
        
        stream.read_stream_object_names(2).unwrap();
        assert_eq!(stream.size_hint(), (3, Some(3)));
        assert_eq!(stream.len(), 3);
        
        stream.read_stream_object_names(3).unwrap();
        assert_eq!(stream.size_hint(), (0, Some(0)));
        assert_eq!(stream.len(), 0);
    }
}