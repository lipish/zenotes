# Desktop GPUI (zed-ui) Skeleton

This is a minimal Rust app prepared to integrate gpui/zed-ui. It uses a shared file-based store under a `Mynotes` folder:

- metadata.json — list of notes
- notes/<id>.json — individual notes

Run locally:

```
cargo run -p desktop-gpui
```

To point at a specific directory:

```
MYNOTES_DIR=/path/to/Mynotes cargo run -p desktop-gpui
```

Note: gpui window UI will be added incrementally in the next milestone. This first step sets up file IO and project structure.

