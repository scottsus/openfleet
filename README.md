# Openfleet

Ultra lightweight plugin for persistent memory with subagent orchestration.

0 dependencies, file-system only.

![openfleet](assets/image.png)

## Directory Structure

```
.openfleet/
├── README.md
├── VERSION
├── migrations/
│   └── 0.4.0.md
|
├── public/                      # Shared knowledge
│   ├── docs/                    # Story write-ups
│   ├── standards/               # Prescriptive guidelines
│   └── troubleshooting/         # Common error guides
|
└── private/                     # gitignored — machine-local
    ├── status.md
    ├── agents/                  # Per-agent scratchpads
    │   ├── Zeus.md              # Orchestrator
    │   ├── Recon.md             # Scout / Explore
    │   ├── Architect.md         # Plan
    │   ├── Builder.md           # Execute
    │   ├── Validator.md         # Double check
    │   └── Introspector.md      # Document gotchas, cache learnings
    |
    ├── stories/                 # Active working trees
    │   └── <story-name>/
    │       ├── task_tree.md
    │       ├── README.md
    │       ├── Research.md
    │       ├── HLD.md
    │       ├── LLD.md
    │       ├── Implementation.md
    │       └── tasks/
    │           └── <MM-DD_task-name>/
    │               └── ...
    |
    ├── experience/
    │   ├── runbooks/             # Pre-skills staging area
    │   └── lessons/              # Common mistakes
    |
    └── transcripts/              # Agent session transcripts
```

## 0 Dependencies

No SQLite / Postgres, everything is written in the file system, retrieved using
`grep` and other `fs` tools.
