//! # wd-keybind
//!
//! Keyboard shortcut management system. Supports configurable key bindings,
//! context-aware actions, conflict detection, cross-platform key mapping,
//! and persistence of user overrides.

pub mod binding;
pub mod context;
pub mod registry;
pub mod keymap;

pub use binding::{KeyBinding, KeyCombo, Modifier, Action};
pub use context::KeyContext;
pub use registry::{KeyRegistry, ConflictError};
pub use keymap::default_keymap;
