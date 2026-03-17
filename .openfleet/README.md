# ⛴️ Openfleet

Long-term project management with built in self-healing capabilities
managed by agent fleet.

This directory is meant to be managed by Openfleet agents, and is typically
not for humans, though it would be difficult to mess this up unintentionally.

## For Agents 🤖

Understand `## Structure`, then see `./private/status.md`, and other necessary
files before starting your current task.

## Structure

```
.openfleet/
├── README.md
├── .templates/              # Templates for new stories/tasks
│   └── task-tree.md
├── public/                  # Committed — shared knowledge
│   ├── docs/                # Compressed story learnings
│   ├── standards/           # Prescriptive guidelines
│   │   ├── code-style.md
│   │   ├── architecture.md
│   │   ├── testing.md
│   │   └── review-checklist.md
│   └── troubleshooting/     # Common error guides
└── private/                 # Gitignored — machine-local
    ├── status.md            # Anchor point - agent reads this first
    ├── agents/              # Per-agent scratchpads
    │   ├── Zeus.md
    │   ├── Recon.md
    │   ├── Architect.md
    │   ├── Builder.md
    │   ├── Validator.md
    │   └── Introspector.md
    ├── stories/             # Work organized by story/epic
    ├── experience/          # Self-healing long term memory
    │   ├── runbooks/        # Used for recurring tasks
    │   └── lessons/         # Used for learning from past mistakes and pitfalls
    ├── reviews/             # Human review artifacts
    ├── sessions/            # Agent transcripts / journals
    └── transcripts/         # Legacy transcripts
```

## Git worktree visualization

```
main/dev
 │
 └──► feat/<story>
       │
       ├──► feat/<story>/<task>
       │     │
       │     └──► feat/<story>/<task>/<branch>
       │
       ╰─────● PR raised for review

Legend:
- `├──►` branch created
- `╰─────●` resolved (merged back to parent)
- `╰─────` escalated (became sibling story)
```

## Flexibility

This template is a _general_ guide for project management. Feel free to customize
as you wish.
