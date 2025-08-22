use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use uuid::Uuid;
use chrono::{DateTime, Utc};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NoteMetadata {
    pub id: String,
    pub title: String,
    pub createdAt: DateTime<Utc>,
    pub updatedAt: DateTime<Utc>,
    pub tags: Option<Vec<String>>,
    pub category: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Note {
    pub id: String,
    pub title: String,
    pub content: serde_json::Value,
    pub createdAt: DateTime<Utc>,
    pub updatedAt: DateTime<Utc>,
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
    } else {
        // Validate JSON; if corrupted, back up and reset to empty
        if let Ok(bytes) = fs::read(&paths.metadata) {
            if serde_json::from_slice::<serde_json::Value>(&bytes).is_err() {
                let backup = paths.root.join("metadata.bak.json");
                let _ = fs::write(&backup, bytes);
                fs::write(&paths.metadata, serde_json::to_vec_pretty(&Vec::<NoteMetadata>::new())?)?;
            }
        }
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
    fs::write(&p, serde_json::to_vec_pretty(note)?)?;

    // Update metadata updatedAt/title if exists
    let mut list = load_metadata(paths)?;
    let mut found = false;
    for m in &mut list {
        if m.id == note.id {
            m.updatedAt = note.updatedAt;
            m.title = note.title.clone();
            found = true;
            break;
        }
    }
    if found { save_metadata(paths, &list)?; }

    Ok(())
}

fn list_notes_sorted(paths: &StorePaths) -> Result<Vec<NoteMetadata>> {
    let mut list = load_metadata(paths)?;
    list.sort_by(|a, b| b.updatedAt.cmp(&a.updatedAt));
    Ok(list)
}

fn update_note(paths: &StorePaths, mut note: Note, new_title: Option<&str>, new_content: Option<serde_json::Value>) -> Result<Note> {
    if let Some(t) = new_title { note.title = t.to_string(); }
    if let Some(c) = new_content { note.content = c; }
    note.updatedAt = Utc::now();
    save_note(paths, &note)?;
    Ok(note)
}

fn create_note(paths: &StorePaths, title: &str) -> Result<Note> {
    let id = Uuid::new_v4().to_string();
    let now = Utc::now();
    let note = Note {
        id: id.clone(),
        title: title.to_string(),
        content: serde_json::json!([
            {"type": "paragraph", "children": [{"text": ""}]}
        ]),
        createdAt: now,
        updatedAt: now,
        tags: Some(vec![]),
        category: Some(String::new()),
    };
    // Persist file first
    fs::write(note_path(paths, &note.id), serde_json::to_vec_pretty(&note)?)?;

    // Append metadata then write
    let mut list = load_metadata(paths)?;
    list.push(NoteMetadata { id, title: title.to_string(), createdAt: now, updatedAt: now, tags: Some(vec![]), category: Some(String::new()) });
    save_metadata(paths, &list)?;
    Ok(note)
}

fn delete_note(paths: &StorePaths, id: &str) -> Result<()> {
    let p = note_path(paths, id);
    if p.exists() { let _ = fs::remove_file(p); }
    let mut list = load_metadata(paths)?;
    list.retain(|m| m.id != id);
    save_metadata(paths, &list)?;
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

// With `gpui` feature, compile with gpui available but use a minimal placeholder
#[cfg(all(not(target_os = "unknown"), feature = "gpui"))]
fn main() -> Result<()> {
    let root = std::env::var("MYNOTES_DIR").ok().map(PathBuf::from).unwrap_or_else(|| {
        dirs::document_dir().unwrap_or(std::env::current_dir().unwrap()).join("Mynotes")
    });
    let paths = StorePaths::new(&root);
    ensure_dirs(&paths)?;
    let list = load_metadata(&paths)?;

    // Touch gpui types to ensure the feature links correctly without relying on unstable APIs
    let _opts = gpui::WindowOptions::default();

    println!(
        "GPUI feature enabled. Loaded {} notes from {}. Minimal placeholder running; UI wiring to follow.",
        list.len(),
        paths.root.display()
    );

    Ok(())
}

#[cfg(target_os = "unknown")]
fn main() {}

