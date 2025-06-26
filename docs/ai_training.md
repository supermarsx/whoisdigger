# AI Model Training

This document outlines how to create a local availability model from WHOIS replies.

## Collecting data

Use domain lists such as those under `sample_lists/` as input. Each domain will be queried and labelled using Whoisdigger's built‑in availability heuristics.

## Running the trainer

1. Build the project to compile TypeScript:

```bash
npm run build
```

2. Execute the training script. You can specify one or more `.list` files:

```bash
node dist/scripts/train-ai.js --lists sample_lists/3letter_alpha.list
```

When no list is supplied, every file in `sample_lists/` is processed. The script writes the resulting model to the path defined by `settings.ai.modelPath` under the user data directory (`settings.ai.dataPath`).

## Updating the model

After training completes, distribute the generated file to users or update `settings.ai.modelPath` to point to the new location.
