# AI Model Training

This document outlines how to create a local availability model from WHOIS replies.

## Architecture

AI model training is handled by the Rust `wd-ai` crate in the backend. The crate provides:

- **Naive Bayes classifier** (`tokenize`, `predict`, `train_from_samples`)
- **Model persistence** (`save_model`, `load_model`)
- Serialization-compatible `Model` struct matching the legacy TypeScript format

The previous Node.js training script (`scripts/train-ai.ts`) is deprecated. Only the pure ML helper functions (`tokenize`, `trainFromSamples`, `predict`) remain for reference.

## Collecting data

Use domain lists such as those under `sample_lists/` as input. Each domain will be queried and labelled using Whoisdigger's built‑in availability heuristics via the Rust backend.

## Training via the application

Training is triggered through the Tauri `ai_train` command from the application UI. The Rust backend handles WHOIS lookups, parsing, availability detection, and model generation end-to-end.

## Updating the model

After training completes, distribute the generated file to users or update the model path in settings.
