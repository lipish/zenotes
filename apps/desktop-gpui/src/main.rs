use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NoteMetadata {
    pub id: String,
    pub title: String,
    pub createdAt: String,
    pub updatedAt: String,
    pub tags: Option<Vec<String>>,
    pub category: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Note {
    pub id: String,
    pub title: String,
    pub content: serde_json::Value,
    pub createdAt: String,
    pub updatedAt: String,
    pub tags: Option<Vec<String>>,
    pub category: Option<String>,
}

#[derive(Debug, Clone)]
pub struct StorePaths {
    root: PathBuf,
    notes_dir: PathBuf,
    metadata: PathBuf,
}

impl StorePaths {
    pub fn new(root: impl AsRef<Path>) -> Self {
        let root = root.as_ref().to_path_buf();
        let notes_dir = root.join("notes");
        let metadata = root.join("metadata.json");
        Self { root, notes_dir, metadata }
    }
}

fn ensure_dirs(paths: &StorePaths) -> Result<()> {
    std::fs::create_dir_all(&paths.notes_dir)?;
    if !paths.metadata.exists() {
        let empty: Vec<NoteMetadata> = vec![];
        fs::write(&paths.metadata, serde_json::to_vec_pretty(&empty)?)?;
    }
    Ok(())
}

fn load_metadata(paths: &StorePaths) -> Result<Vec<NoteMetadata>> {
    let bytes = fs::read(&paths.metadata)?;
    let list: Vec<NoteMetadata> = serde_json::from_slice(&bytes)?;
    Ok(list)
}

fn save_metadata(paths: &StorePaths, list: &[NoteMetadata]) -> Result<()> {
    fs::write(&paths.metadata, serde_json::to_vec_pretty(list)?)?;
    Ok(())
}

fn note_path(paths: &StorePaths, id: &str) -> PathBuf {
    paths.notes_dir.join(format!("{}.json", id))
}

fn load_note(paths: &StorePaths, id: &str) -> Result<Note> {
    let p = note_path(paths, id);
    let bytes = fs::read(p)?;
    Ok(serde_json::from_slice(&bytes)?)
}

fn save_note(paths: &StorePaths, note: &Note) -> Result<()> {
    let p = note_path(paths, &note.id);
    fs::write(p, serde_json::to_vec_pretty(note)?)?;
    Ok(())
}

// Minimal run entry: without feature `gpui` we just do IO init/print
#[cfg(all(not(target_os = "unknown"), not(feature = "gpui")))]
fn main() -> Result<()> {
    let root = std::env::var("MYNOTES_DIR").ok().map(PathBuf::from).unwrap_or_else(|| {
        dirs::document_dir().unwrap_or(std::env::current_dir().unwrap()).join("Mynotes")
    });
    let paths = StorePaths::new(&root);
    ensure_dirs(&paths)?;
    let list = load_metadata(&paths)?;
    println!("Loaded {} notes from {}", list.len(), paths.root.display());
    println!("Run with --features gpui to start the window UI");
    Ok(())
}

// With `gpui` feature, open a simple window and show counts
#[cfg(all(not(target_os = "unknown"), feature = "gpui"))]
fn main() -> Result<()> {
    use gpui::*;

    let root = std::env::var("MYNOTES_DIR").ok().map(PathBuf::from).unwrap_or_else(|| {
        dirs::document_dir().unwrap_or(std::env::current_dir().unwrap()).join("Mynotes")
    });
    let paths = StorePaths::new(&root);
    ensure_dirs(&paths)?;
    let list = load_metadata(&paths)?;

    App::new().run(|cx| {
        cx.open_window(WindowOptions::default(), |cx| {
            let count = list.len();
            let path_display = paths.root.display().to_string();
            view! { cx,
                vstack(|cx| {
                    label(cx, format!("Mynotes: {} notes", count));
                    label(cx, format!("Root: {}", path_display));
                    button(cx, "Refresh", move |_, _| {
                        // In next milestones we'll reload and render a list
                    });
                })
            }
        }).unwrap();
    });

    Ok(())
}

#[cfg(target_os = "unknown")]
fn main() {}

