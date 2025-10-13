# WASI Blobstore Implementation (Rust)

A Rust implementation of the [WASI blobstore specification](https://github.com/WebAssembly/wasi-blob-store) using an embedded in-memory storage backend.

## Features

- ✅ Complete implementation of WASI blobstore WIT specification
- ✅ Embedded in-memory storage (no external dependencies)
- ✅ Thread-safe operations with `Arc` and `RwLock`
- ✅ Container operations (create, get, delete, exists)
- ✅ Object operations (read, write, delete, list, copy, move)
- ✅ Streaming support for large object lists
- ✅ Range-based object reading
- ✅ Full error handling with custom error types
- ✅ Comprehensive test coverage

## Installation

Add this to your `Cargo.toml`:

```toml
[dependencies]
blobstore-rs = "0.1.0"
```

## Quick Start

```rust
use blobstore_rs::{create_container, OutgoingValue, IncomingValue};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Create a container
    let container = create_container("my-container".to_string())?;
    
    // Write data to an object
    let outgoing = OutgoingValue::new();
    let stream = outgoing.write_body()?;
    stream.write(b"Hello, World!")?;
    stream.close()?;
    outgoing.finish()?;
    
    container.write_data("hello.txt".to_string(), &outgoing)?;
    
    // Read data back
    let incoming = container.get_data("hello.txt".to_string(), 0, 12)?;
    let data = incoming.consume_sync()?;
    println!("Read: {}", String::from_utf8(data)?);
    
    Ok(())
}
```

## API Overview

### Core Functions

- `create_container(name)` - Create a new container
- `get_container(name)` - Get an existing container
- `delete_container(name)` - Delete a container and all its objects
- `container_exists(name)` - Check if a container exists
- `copy_object(src, dest)` - Copy an object within or between containers
- `move_object(src, dest)` - Move/rename an object

### Container Methods

The `Container` struct provides methods for managing objects:

```rust
impl Container {
    fn name(&self) -> BlobstoreResult<String>;
    fn info(&self) -> BlobstoreResult<ContainerMetadata>;
    fn get_data(&self, name: ObjectName, start: u64, end: u64) -> BlobstoreResult<IncomingValue>;
    fn write_data(&self, name: ObjectName, data: &OutgoingValue) -> BlobstoreResult<()>;
    fn list_objects(&self) -> BlobstoreResult<StreamObjectNames>;
    fn delete_object(&self, name: ObjectName) -> BlobstoreResult<()>;
    fn delete_objects(&self, names: Vec<ObjectName>) -> BlobstoreResult<()>;
    fn has_object(&self, name: ObjectName) -> BlobstoreResult<bool>;
    fn object_info(&self, name: ObjectName) -> BlobstoreResult<ObjectMetadata>;
    fn clear(&self) -> BlobstoreResult<()>;
}
```

### Value Resources

#### OutgoingValue (for writing data)

```rust
let outgoing = OutgoingValue::new();
let stream = outgoing.write_body()?;
stream.write(b"some data")?;
stream.close()?;
outgoing.finish()?;

// Now use outgoing with container.write_data()
```

#### IncomingValue (for reading data)

```rust
let incoming = container.get_data("file.txt".to_string(), 0, 100)?;

// Synchronous read (all at once)
let data = incoming.consume_sync()?;

// OR asynchronous read (streaming)
let mut stream = incoming.consume_async()?;
while let Some(chunk) = stream.read()? {
    // process chunk
}
```

### Streaming Object Names

```rust
let mut object_stream = container.list_objects()?;

// Read in chunks
let (objects, is_end) = object_stream.read_stream_object_names(10)?;

// Skip objects
let (skipped, is_end) = object_stream.skip_stream_object_names(5)?;

// Use as iterator
for object_name in object_stream {
    println!("Object: {}", object_name);
}
```

## Examples

### Basic Object Operations

```rust
use blobstore_rs::{create_container, OutgoingValue};

// Create container
let container = create_container("documents".to_string())?;

// Write a document
let outgoing = OutgoingValue::new();
let stream = outgoing.write_body()?;
stream.write(b"# My Document\n\nThis is a test document.")?;
stream.close()?;
outgoing.finish()?;

container.write_data("readme.md".to_string(), &outgoing)?;

// Check if document exists
if container.has_object("readme.md".to_string())? {
    println!("Document exists!");
}

// Get document metadata
let metadata = container.object_info("readme.md".to_string())?;
println!("Document size: {} bytes", metadata.size);

// Read partial content (first 20 bytes)
let incoming = container.get_data("readme.md".to_string(), 0, 19)?;
let preview = incoming.consume_sync()?;
println!("Preview: {}", String::from_utf8_lossy(&preview));
```

### Cross-Container Operations

```rust
use blobstore_rs::{create_container, copy_object, move_object, ObjectId};

// Create two containers
let source = create_container("source".to_string())?;
let backup = create_container("backup".to_string())?;

// Add some data to source
let outgoing = OutgoingValue::new();
let stream = outgoing.write_body()?;
stream.write(b"Important data")?;
stream.close()?;
outgoing.finish()?;
source.write_data("important.txt".to_string(), &outgoing)?;

// Copy to backup
copy_object(
    ObjectId {
        container: "source".to_string(),
        object: "important.txt".to_string(),
    },
    ObjectId {
        container: "backup".to_string(),
        object: "important_backup.txt".to_string(),
    },
)?;

// Move to archive location
move_object(
    ObjectId {
        container: "backup".to_string(),
        object: "important_backup.txt".to_string(),
    },
    ObjectId {
        container: "backup".to_string(),
        object: "archive/important.txt".to_string(),
    },
)?;
```

### Large File Handling

```rust
use blobstore_rs::{create_container, OutgoingValue};

let container = create_container("large-files".to_string())?;

// Write large file in chunks
let outgoing = OutgoingValue::new();
let stream = outgoing.write_body()?;

for i in 0..1000 {
    let chunk = format!("This is chunk number {}\n", i);
    stream.write(chunk.as_bytes())?;
}
stream.close()?;
outgoing.finish()?;

container.write_data("large-file.txt".to_string(), &outgoing)?;

// Read large file in streaming fashion
let incoming = container.get_data("large-file.txt".to_string(), 0, u64::MAX)?;
let mut async_stream = incoming.consume_async()?;
async_stream.set_chunk_size(1024); // 1KB chunks

while let Some(chunk) = async_stream.read()? {
    // Process chunk without loading entire file into memory
    println!("Processing {} bytes", chunk.len());
}
```

## Error Handling

All operations return `BlobstoreResult<T>` which is an alias for `Result<T, BlobstoreError>`:

```rust
use blobstore_rs::{BlobstoreError, BlobstoreResult};

match create_container("test".to_string()) {
    Ok(container) => {
        // Success
    }
    Err(BlobstoreError::ContainerAlreadyExists(name)) => {
        println!("Container {} already exists", name);
    }
    Err(e) => {
        println!("Other error: {}", e);
    }
}
```

### Error Types

- `ContainerNotFound(String)` - Container doesn't exist
- `ContainerAlreadyExists(String)` - Container already exists
- `ObjectNotFound(String)` - Object doesn't exist
- `InvalidRange { start: u64, end: u64 }` - Invalid byte range
- `InvalidOperation(String)` - Invalid operation (e.g., using unfinished OutgoingValue)
- `IoError(String)` - I/O related errors
- `InternalError(String)` - Internal errors

## Thread Safety

The blobstore implementation is fully thread-safe:

```rust
use std::sync::Arc;
use std::thread;
use blobstore_rs::create_container;

let container = Arc::new(create_container("shared".to_string())?);

let handles: Vec<_> = (0..10).map(|i| {
    let container = Arc::clone(&container);
    thread::spawn(move || {
        let outgoing = OutgoingValue::new();
        let stream = outgoing.write_body().unwrap();
        stream.write(format!("Data from thread {}", i).as_bytes()).unwrap();
        stream.close().unwrap();
        outgoing.finish().unwrap();
        
        container.write_data(format!("file{}.txt", i), &outgoing).unwrap();
    })
}).collect();

for handle in handles {
    handle.join().unwrap();
}

// All 10 files should now exist
let mut object_stream = container.list_objects()?;
let (objects, _) = object_stream.read_stream_object_names(20)?;
assert_eq!(objects.len(), 10);
```

## Testing

Run the test suite:

```bash
cargo test
```

Run with output:

```bash
cargo test -- --nocapture
```

Run integration tests:

```bash
cargo test integration_tests
```

## Architecture

The implementation consists of several key components:

- **`EmbeddedStorage`** - Thread-safe in-memory storage backend using `HashMap` and `RwLock`
- **`Container`** - Resource representing a collection of objects
- **`OutgoingValue`/`IncomingValue`** - Resources for writing/reading blob data
- **`StreamObjectNames`** - Iterator-like interface for streaming object names
- **Error handling** - Comprehensive error types matching WIT specification

The storage is completely in-memory and does not persist data between program runs. This makes it ideal for:

- Testing and development
- Temporary data processing
- Caching layers
- WebAssembly components that don't need persistence

## WIT Specification Compliance

This implementation fully complies with the WASI blobstore WIT specification version 0.2.0-draft, including:

- All required interfaces (`blobstore`, `container`, `types`)
- All resource types (`container`, `stream-object-names`, `outgoing-value`, `incoming-value`)
- All error conditions and edge cases
- Proper range handling for partial object reads
- Streaming support for large object lists

## License

This project is licensed under either of

- Apache License, Version 2.0, ([LICENSE-APACHE](LICENSE-APACHE) or <http://www.apache.org/licenses/LICENSE-2.0>)
- MIT license ([LICENSE-MIT](LICENSE-MIT) or <http://opensource.org/licenses/MIT>)

at your option.