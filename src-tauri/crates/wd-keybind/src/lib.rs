//! # wd-keybind
//!
//! Keyboard shortcut management system. Supports configurable key bindings,
//! context-aware actions, conflict detection, cross-platform key mapping,
//! and persistence of user overrides.

pub mod binding;
pub mod context;
pub mod keymap;
pub mod registry;

pub use binding::{Action, KeyBinding, KeyCombo, Modifier};
pub use context::KeyContext;
pub use keymap::default_keymap;
pub use registry::{ConflictError, KeyRegistry};
