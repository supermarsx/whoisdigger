use serde::{Deserialize, Serialize};

/// JSON Schema parameter types for tool definitions.
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum ParamType {
    String,
    Integer,
    Number,
    Boolean,
    Array(Box<ParamType>),
    #[serde(rename = "enum")]
    Enum(Vec<String>),
    Object(Vec<(String, ParamType, bool)>), // (name, type, required)
}

impl ParamType {
    /// Convert to a JSON Schema fragment.
    pub fn to_json_schema(&self) -> serde_json::Value {
        match self {
            Self::String => serde_json::json!({"type": "string"}),
            Self::Integer => serde_json::json!({"type": "integer"}),
            Self::Number => serde_json::json!({"type": "number"}),
            Self::Boolean => serde_json::json!({"type": "boolean"}),
            Self::Array(inner) => serde_json::json!({
                "type": "array",
                "items": inner.to_json_schema()
            }),
            Self::Enum(variants) => serde_json::json!({
                "type": "string",
                "enum": variants
            }),
            Self::Object(fields) => {
                let mut props = serde_json::Map::new();
                let mut req = Vec::new();
                for (name, pt, required) in fields {
                    props.insert(name.clone(), pt.to_json_schema());
                    if *required {
                        req.push(serde_json::Value::String(name.clone()));
                    }
                }
                serde_json::json!({
                    "type": "object",
                    "properties": props,
                    "required": req
                })
            }
        }
    }
}

/// A tool that can be offered to an LLM for function calling.
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ToolDefinition {
    pub name: String,
    pub description: String,
    /// JSON Schema for the parameters object.
    pub parameters: serde_json::Value,
    /// Whether to enforce structured‐output mode (OpenAI `strict`).
    #[serde(default)]
    pub strict: bool,
}

impl ToolDefinition {
    /// Render in OpenAI function-calling wire format.
    pub fn to_openai_json(&self) -> serde_json::Value {
        serde_json::json!({
            "type": "function",
            "function": {
                "name": self.name,
                "description": self.description,
                "parameters": self.parameters,
                "strict": self.strict
            }
        })
    }

    /// Render in Anthropic tool-use wire format.
    pub fn to_anthropic_json(&self) -> serde_json::Value {
        serde_json::json!({
            "name": self.name,
            "description": self.description,
            "input_schema": self.parameters
        })
    }
}

/// Ergonomic builder for `ToolDefinition`.
pub struct ToolBuilder {
    name: String,
    description: String,
    params: Vec<(String, ParamType, String, bool)>, // (name, type, desc, required)
    strict: bool,
}

impl ToolBuilder {
    pub fn new(name: &str, description: &str) -> Self {
        Self {
            name: name.to_string(),
            description: description.to_string(),
            params: Vec::new(),
            strict: false,
        }
    }

    /// Add a parameter.
    pub fn param(mut self, name: &str, typ: ParamType, description: &str, required: bool) -> Self {
        self.params
            .push((name.to_string(), typ, description.to_string(), required));
        self
    }

    /// Enable strict structured output enforcement.
    pub fn strict(mut self) -> Self {
        self.strict = true;
        self
    }

    /// Consume the builder and produce a `ToolDefinition`.
    pub fn build(self) -> ToolDefinition {
        let mut properties = serde_json::Map::new();
        let mut required = Vec::new();

        for (name, pt, desc, req) in &self.params {
            let mut schema = pt.to_json_schema();
            if let serde_json::Value::Object(ref mut map) = schema {
                map.insert(
                    "description".into(),
                    serde_json::Value::String(desc.clone()),
                );
            }
            properties.insert(name.clone(), schema);
            if *req {
                required.push(serde_json::Value::String(name.clone()));
            }
        }

        let parameters = serde_json::json!({
            "type": "object",
            "properties": properties,
            "required": required
        });

        ToolDefinition {
            name: self.name,
            description: self.description,
            parameters,
            strict: self.strict,
        }
    }
}

// ─── Tests ───────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_param_type_string() {
        let schema = ParamType::String.to_json_schema();
        assert_eq!(schema["type"], "string");
    }

    #[test]
    fn test_param_type_array() {
        let schema = ParamType::Array(Box::new(ParamType::String)).to_json_schema();
        assert_eq!(schema["type"], "array");
        assert_eq!(schema["items"]["type"], "string");
    }

    #[test]
    fn test_param_type_enum() {
        let schema = ParamType::Enum(vec!["a".into(), "b".into()]).to_json_schema();
        assert_eq!(schema["enum"][0], "a");
        assert_eq!(schema["enum"][1], "b");
    }

    #[test]
    fn test_param_type_object() {
        let fields = vec![
            ("name".into(), ParamType::String, true),
            ("age".into(), ParamType::Integer, false),
        ];
        let schema = ParamType::Object(fields).to_json_schema();
        assert_eq!(schema["properties"]["name"]["type"], "string");
        assert_eq!(schema["required"][0], "name");
    }

    #[test]
    fn test_tool_builder_basic() {
        let tool = ToolBuilder::new("whois_lookup", "Look up WHOIS data")
            .param("domain", ParamType::String, "Domain to query", true)
            .build();
        assert_eq!(tool.name, "whois_lookup");
        assert_eq!(tool.parameters["required"][0], "domain");
        assert!(tool.parameters["properties"]["domain"]["description"]
            .as_str()
            .unwrap()
            .contains("Domain"));
    }

    #[test]
    fn test_tool_builder_strict() {
        let tool = ToolBuilder::new("t", "d").strict().build();
        assert!(tool.strict);
    }

    #[test]
    fn test_tool_builder_optional_param() {
        let tool = ToolBuilder::new("resolve", "DNS resolve")
            .param("domain", ParamType::String, "Domain", true)
            .param("record_type", ParamType::String, "Record type", false)
            .build();
        let req = tool.parameters["required"].as_array().unwrap();
        assert_eq!(req.len(), 1);
        assert!(tool.parameters["properties"]["record_type"].is_object());
    }

    #[test]
    fn test_openai_json_format() {
        let tool = ToolBuilder::new("test", "desc")
            .param("x", ParamType::Integer, "num", true)
            .build();
        let j = tool.to_openai_json();
        assert_eq!(j["type"], "function");
        assert_eq!(j["function"]["name"], "test");
    }

    #[test]
    fn test_anthropic_json_format() {
        let tool = ToolBuilder::new("test", "desc")
            .param("x", ParamType::Integer, "num", true)
            .build();
        let j = tool.to_anthropic_json();
        assert_eq!(j["name"], "test");
        assert!(j["input_schema"].is_object());
    }

    #[test]
    fn test_tool_definition_serde() {
        let tool = ToolBuilder::new("f", "d").build();
        let json = serde_json::to_string(&tool).unwrap();
        let t2: ToolDefinition = serde_json::from_str(&json).unwrap();
        assert_eq!(t2.name, "f");
    }
}
