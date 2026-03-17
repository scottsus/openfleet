# ⛴️ Openfleet

Long-term project management with built in self-healing capabilities
managed by agent fleet.

This directory is meant to be managed by Openfleet agents, and is typically
not for humans, though it would be difficult to mess this up unintentionally.

## For Agents 🤖

Understand `## Structure`, then see `./status.md`, and other necessary
files before starting your current task.

## Structure

```
.openfleet/
├── README.md
├── status.md                # Anchor point - agent reads this first (gitignored)
├── .templates/              # Templates for new stories/tasks
│   └── story-task-tree.md
├── agents/                  # Per-agent scratchpads (gitignored)
│   ├── Zeus.md
│   ├── Recon.md
│   ├── Architect.md
│   ├── Builder.md
│   ├── Validator.md
│   └── Introspector.md
├── sessions/                # Agent transcripts / journals (gitignored)
├── stories/                 # Work organized by story/epic (gitignored)
│   └── <story-name>/
│       ├── task_tree.md     # Story-scoped task tree
│       ├── README.md
│       └── tasks/
├── docs/                    # Permanent documentation (committed)
│   └── README.md
├── experience/              # Self-healing long term memory (committed)
│   ├── runbooks/            # Used for recurring tasks
│   ├── troubleshooting/     # Used for common errors
│   ├── lessons/             # Used for learning from past mistakes
│   └── blunders/            # Used for learning from stupid mistakes
├── standards/               # Prescriptive guidelines (committed)
│   ├── code-style.md
│   ├── architecture.md
│   ├── testing.md
│   └── review-checklist.md
└── reviews/                 # Human review artifacts (committed)
    └── README.md
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
