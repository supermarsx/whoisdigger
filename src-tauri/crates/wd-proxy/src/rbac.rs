use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::RwLock;

// ─── Permissions ─────────────────────────────────────────────────────────────

/// Fine-grained permissions for proxy and cache operations.
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq, Hash)]
#[serde(rename_all = "snake_case")]
pub enum Permission {
    /// May perform WHOIS lookups using proxy pool
    ProxyUse,
    /// May add or remove proxies
    ProxyManage,
    /// May view proxy settings and rotation state
    ProxyView,
    /// May read cached WHOIS responses
    CacheRead,
    /// May write to the cache
    CacheWrite,
    /// May clear / evict the entire cache
    CachePurge,
    /// May change cache backend settings
    CacheAdmin,
    /// May view RBAC roles and bindings
    RbacView,
    /// May create/modify/delete roles and bindings
    RbacAdmin,
    /// Wildcard — grants all permissions
    All,
}

// ─── Role ────────────────────────────────────────────────────────────────────

/// A named role with a set of permissions.
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Role {
    /// Unique role identifier (e.g. "admin", "operator", "viewer").
    pub name: String,
    /// Human-readable description.
    #[serde(default)]
    pub description: String,
    /// Permissions granted by this role.
    pub permissions: Vec<Permission>,
}

impl Role {
    /// Create a new role with the given name and permissions.
    pub fn new(name: impl Into<String>, permissions: Vec<Permission>) -> Self {
        Self {
            name: name.into(),
            description: String::new(),
            permissions,
        }
    }

    /// Create a role with a description.
    pub fn with_description(mut self, desc: impl Into<String>) -> Self {
        self.description = desc.into();
        self
    }

    /// Check whether this role grants a specific permission.
    pub fn has_permission(&self, perm: &Permission) -> bool {
        self.permissions.contains(&Permission::All) || self.permissions.contains(perm)
    }
}

// ─── Role Binding ────────────────────────────────────────────────────────────

/// Binds a subject (user/key identifier) to one or more roles.
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct RoleBinding {
    pub subject: String,
    pub roles: Vec<String>,
}

// ─── RBAC Manager ────────────────────────────────────────────────────────────

/// Thread-safe role-based access control manager.
///
/// Pre-loaded with three built-in roles:
/// - **admin** — all permissions
/// - **operator** — proxy use/manage, cache read/write/purge
/// - **viewer** — proxy view, cache read
///
/// Custom roles and bindings can be added at runtime.
pub struct Rbac {
    roles: RwLock<HashMap<String, Role>>,
    bindings: RwLock<HashMap<String, Vec<String>>>,
}

impl Default for Rbac {
    fn default() -> Self {
        Self::new()
    }
}

impl Rbac {
    /// Create a new RBAC manager with the built-in roles.
    pub fn new() -> Self {
        let mut roles = HashMap::new();

        roles.insert(
            "admin".into(),
            Role::new("admin", vec![Permission::All])
                .with_description("Full access to all proxy and cache operations"),
        );

        roles.insert(
            "operator".into(),
            Role::new(
                "operator",
                vec![
                    Permission::ProxyUse,
                    Permission::ProxyManage,
                    Permission::ProxyView,
                    Permission::CacheRead,
                    Permission::CacheWrite,
                    Permission::CachePurge,
                ],
            )
            .with_description("Can use/manage proxies and read/write cache"),
        );

        roles.insert(
            "viewer".into(),
            Role::new(
                "viewer",
                vec![Permission::ProxyView, Permission::CacheRead, Permission::RbacView],
            )
            .with_description("Read-only access to proxy settings and cache"),
        );

        Self {
            roles: RwLock::new(roles),
            bindings: RwLock::new(HashMap::new()),
        }
    }

    // ── Role management ──────────────────────────────────────────────────

    /// Add or update a custom role.
    pub fn add_role(&self, role: Role) {
        self.roles.write().unwrap().insert(role.name.clone(), role);
    }

    /// Remove a role by name. Returns `true` if the role existed.
    pub fn remove_role(&self, name: &str) -> bool {
        self.roles.write().unwrap().remove(name).is_some()
    }

    /// Get a clone of a role by name.
    pub fn get_role(&self, name: &str) -> Option<Role> {
        self.roles.read().unwrap().get(name).cloned()
    }

    /// List all role names.
    pub fn list_roles(&self) -> Vec<String> {
        self.roles.read().unwrap().keys().cloned().collect()
    }

    // ── Binding management ───────────────────────────────────────────────

    /// Bind a subject to one or more roles. Merges with existing bindings.
    pub fn bind(&self, subject: impl Into<String>, role_names: Vec<String>) {
        let subject = subject.into();
        let mut bindings = self.bindings.write().unwrap();
        let entry = bindings.entry(subject).or_default();
        for rn in role_names {
            if !entry.contains(&rn) {
                entry.push(rn);
            }
        }
    }

    /// Remove all role bindings for a subject.
    pub fn unbind(&self, subject: &str) {
        self.bindings.write().unwrap().remove(subject);
    }

    /// Remove a specific role from a subject's bindings.
    pub fn unbind_role(&self, subject: &str, role: &str) {
        let mut bindings = self.bindings.write().unwrap();
        if let Some(roles) = bindings.get_mut(subject) {
            roles.retain(|r| r != role);
            if roles.is_empty() {
                bindings.remove(subject);
            }
        }
    }

    /// Get the role bindings for a subject.
    pub fn get_bindings(&self, subject: &str) -> Option<RoleBinding> {
        self.bindings.read().unwrap().get(subject).map(|roles| RoleBinding {
            subject: subject.to_string(),
            roles: roles.clone(),
        })
    }

    /// List all subjects with bindings.
    pub fn list_subjects(&self) -> Vec<String> {
        self.bindings.read().unwrap().keys().cloned().collect()
    }

    // ── Authorization ────────────────────────────────────────────────────

    /// Check whether a subject has a specific permission through any of their roles.
    pub fn check(&self, subject: &str, permission: &Permission) -> bool {
        let bindings = self.bindings.read().unwrap();
        let roles = self.roles.read().unwrap();

        if let Some(role_names) = bindings.get(subject) {
            for rn in role_names {
                if let Some(role) = roles.get(rn) {
                    if role.has_permission(permission) {
                        return true;
                    }
                }
            }
        }
        false
    }

    /// Return all *effective* permissions for a subject (union of all role perms).
    pub fn effective_permissions(&self, subject: &str) -> Vec<Permission> {
        let bindings = self.bindings.read().unwrap();
        let roles = self.roles.read().unwrap();

        let mut perms = Vec::new();
        if let Some(role_names) = bindings.get(subject) {
            for rn in role_names {
                if let Some(role) = roles.get(rn) {
                    if role.permissions.contains(&Permission::All) {
                        return vec![Permission::All];
                    }
                    for p in &role.permissions {
                        if !perms.contains(p) {
                            perms.push(p.clone());
                        }
                    }
                }
            }
        }
        perms
    }

    // ── Serialization ────────────────────────────────────────────────────

    /// Export all roles and bindings as JSON.
    pub fn export_json(&self) -> Result<String, String> {
        let roles = self.roles.read().unwrap();
        let bindings = self.bindings.read().unwrap();

        let export = serde_json::json!({
            "roles": roles.values().collect::<Vec<_>>(),
            "bindings": bindings.iter().map(|(s, r)| {
                serde_json::json!({ "subject": s, "roles": r })
            }).collect::<Vec<_>>(),
        });

        serde_json::to_string_pretty(&export).map_err(|e| e.to_string())
    }

    /// Import roles and bindings from JSON. Merges with (overwrites) existing data.
    pub fn import_json(&self, json: &str) -> Result<(), String> {
        let data: serde_json::Value = serde_json::from_str(json).map_err(|e| e.to_string())?;

        if let Some(roles_arr) = data.get("roles").and_then(|v| v.as_array()) {
            let mut roles = self.roles.write().unwrap();
            for rv in roles_arr {
                let role: Role = serde_json::from_value(rv.clone()).map_err(|e| e.to_string())?;
                roles.insert(role.name.clone(), role);
            }
        }

        if let Some(bindings_arr) = data.get("bindings").and_then(|v| v.as_array()) {
            let mut bindings = self.bindings.write().unwrap();
            for bv in bindings_arr {
                let subject = bv.get("subject").and_then(|v| v.as_str()).unwrap_or_default();
                let role_list: Vec<String> = bv
                    .get("roles")
                    .and_then(|v| v.as_array())
                    .map(|arr| {
                        arr.iter()
                            .filter_map(|v| v.as_str().map(String::from))
                            .collect()
                    })
                    .unwrap_or_default();

                if !subject.is_empty() {
                    bindings.insert(subject.to_string(), role_list);
                }
            }
        }

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_builtin_roles_exist() {
        let rbac = Rbac::new();
        assert!(rbac.get_role("admin").is_some());
        assert!(rbac.get_role("operator").is_some());
        assert!(rbac.get_role("viewer").is_some());
    }

    #[test]
    fn test_admin_has_all_perms() {
        let rbac = Rbac::new();
        rbac.bind("alice", vec!["admin".into()]);
        assert!(rbac.check("alice", &Permission::ProxyUse));
        assert!(rbac.check("alice", &Permission::CachePurge));
        assert!(rbac.check("alice", &Permission::RbacAdmin));
    }

    #[test]
    fn test_viewer_limited() {
        let rbac = Rbac::new();
        rbac.bind("bob", vec!["viewer".into()]);
        assert!(rbac.check("bob", &Permission::ProxyView));
        assert!(rbac.check("bob", &Permission::CacheRead));
        assert!(!rbac.check("bob", &Permission::ProxyManage));
        assert!(!rbac.check("bob", &Permission::CacheWrite));
        assert!(!rbac.check("bob", &Permission::CachePurge));
    }

    #[test]
    fn test_operator_perms() {
        let rbac = Rbac::new();
        rbac.bind("charlie", vec!["operator".into()]);
        assert!(rbac.check("charlie", &Permission::ProxyUse));
        assert!(rbac.check("charlie", &Permission::ProxyManage));
        assert!(rbac.check("charlie", &Permission::CacheWrite));
        assert!(!rbac.check("charlie", &Permission::RbacAdmin));
    }

    #[test]
    fn test_unknown_subject_denied() {
        let rbac = Rbac::new();
        assert!(!rbac.check("nobody", &Permission::ProxyUse));
    }

    #[test]
    fn test_custom_role() {
        let rbac = Rbac::new();
        let role = Role::new("cache_only", vec![Permission::CacheRead, Permission::CacheWrite]);
        rbac.add_role(role);
        rbac.bind("dave", vec!["cache_only".into()]);

        assert!(rbac.check("dave", &Permission::CacheRead));
        assert!(rbac.check("dave", &Permission::CacheWrite));
        assert!(!rbac.check("dave", &Permission::ProxyUse));
    }

    #[test]
    fn test_unbind() {
        let rbac = Rbac::new();
        rbac.bind("eve", vec!["admin".into()]);
        assert!(rbac.check("eve", &Permission::All));

        rbac.unbind("eve");
        assert!(!rbac.check("eve", &Permission::ProxyUse));
    }

    #[test]
    fn test_unbind_role() {
        let rbac = Rbac::new();
        rbac.bind("frank", vec!["admin".into(), "viewer".into()]);
        rbac.unbind_role("frank", "admin");

        // Should only have viewer now
        assert!(rbac.check("frank", &Permission::CacheRead));
        assert!(!rbac.check("frank", &Permission::CachePurge));
    }

    #[test]
    fn test_effective_permissions() {
        let rbac = Rbac::new();
        rbac.bind("grace", vec!["viewer".into()]);
        let perms = rbac.effective_permissions("grace");
        assert!(perms.contains(&Permission::ProxyView));
        assert!(perms.contains(&Permission::CacheRead));
        assert!(!perms.contains(&Permission::CacheWrite));
    }

    #[test]
    fn test_effective_permissions_admin_shortcircuits() {
        let rbac = Rbac::new();
        rbac.bind("hank", vec!["admin".into()]);
        let perms = rbac.effective_permissions("hank");
        assert_eq!(perms, vec![Permission::All]);
    }

    #[test]
    fn test_multi_role_merge() {
        let rbac = Rbac::new();
        let r1 = Role::new("r1", vec![Permission::ProxyUse]);
        let r2 = Role::new("r2", vec![Permission::CacheRead]);
        rbac.add_role(r1);
        rbac.add_role(r2);
        rbac.bind("iris", vec!["r1".into(), "r2".into()]);

        assert!(rbac.check("iris", &Permission::ProxyUse));
        assert!(rbac.check("iris", &Permission::CacheRead));
        assert!(!rbac.check("iris", &Permission::CachePurge));
    }

    #[test]
    fn test_remove_role() {
        let rbac = Rbac::new();
        rbac.add_role(Role::new("temp", vec![Permission::ProxyUse]));
        assert!(rbac.remove_role("temp"));
        assert!(!rbac.remove_role("temp")); // already gone
    }

    #[test]
    fn test_list_roles_and_subjects() {
        let rbac = Rbac::new();
        rbac.bind("user1", vec!["admin".into()]);
        rbac.bind("user2", vec!["viewer".into()]);

        let mut roles = rbac.list_roles();
        roles.sort();
        assert!(roles.contains(&"admin".to_string()));
        assert!(roles.contains(&"operator".to_string()));
        assert!(roles.contains(&"viewer".to_string()));

        let mut subjects = rbac.list_subjects();
        subjects.sort();
        assert_eq!(subjects, vec!["user1", "user2"]);
    }

    #[test]
    fn test_export_import_roundtrip() {
        let rbac1 = Rbac::new();
        rbac1.add_role(
            Role::new("custom", vec![Permission::ProxyUse, Permission::CacheRead])
                .with_description("Custom test role"),
        );
        rbac1.bind("user1", vec!["custom".into()]);

        let json = rbac1.export_json().unwrap();

        let rbac2 = Rbac::new();
        rbac2.import_json(&json).unwrap();

        assert!(rbac2.get_role("custom").is_some());
        assert!(rbac2.check("user1", &Permission::ProxyUse));
    }

    #[test]
    fn test_duplicate_bind_no_dupes() {
        let rbac = Rbac::new();
        rbac.bind("user", vec!["admin".into()]);
        rbac.bind("user", vec!["admin".into(), "viewer".into()]);
        let binding = rbac.get_bindings("user").unwrap();
        // Should have admin and viewer, not admin twice
        assert_eq!(binding.roles.len(), 2);
    }
}
