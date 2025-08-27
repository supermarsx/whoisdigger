# AI Dataset Format

The CLI can train a local availability model using `--train-model <dataset>`.

## Dataset structure

Datasets may be provided as **JSON** or **CSV** files.

### JSON

A JSON file must contain an array of objects:

```json
[
  { "text": "WHOIS reply here", "label": "available" },
  { "text": "Another reply", "label": "unavailable" }
]
```

### CSV

CSV files require a header row with `text` and `label` columns:

```
text,label
"WHOIS reply here",available
"Another reply",unavailable
```

The `label` value must be either `available` or `unavailable`.

`--train-model` writes the resulting model to `settings.ai.modelPath` within
`settings.ai.dataPath`.
