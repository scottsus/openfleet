# User Preferences

Read this before starting any implementation task.

## Docstrings

- One-liner starts right after the opening `"""`
- Numbered bullet list of what the function does (if non-trivial)
- Optional `Example:` block for non-obvious usage
- No `Args` or `Returns` sections
- Add a blank line between the docstring and the code body
- Single-line docstring is fine for simple functions — don't overcomplicate
- No file-level docstrings
- No private function docstrings

## Comments

Code should be self-documenting. Avoid comments unless there is a genuine gotcha or
non-obvious complexity.

## Logging

**Use `logger.span()` for:**

- All database operations
- External API calls
- Business logic boundaries
- Any operation where timing/duration matters

**Use `logger.info()` for:**

- State-changing operations (create, update, delete) — audit trail
- Operation outcomes (success/failure messages)
- NOT for read operations (spans are sufficient)

**Span naming** — follow OpenTelemetry dot notation: `entity.action`

## Failing tests

If a test fails, do not simply rerun it with an increased timeout. Unless you have concrete
logs-based evidence that the failure is purely a timing issue, bumping the timeout is just
noise — the underlying problem will resurface.

Instead:

- **Read the logs.** What actually failed and why?
- **Check other metrics.** Is a dependency down? Is there a race condition? Did an assertion fail on wrong data?
- **Understand before acting.** A test that passes with a higher timeout is not a fixed test.

## Optional fields

Be deliberate about whether a field is truly optional. Loosely marking fields as optional
(`T | undefined`, `T | None`, `?: T`) forces every caller to add `if x` guards throughout
the codebase, spreading defensive boilerplate everywhere.

Before making a field optional, ask:

- **Is this field ever genuinely absent?** If it always exists after construction, make it required.
- **Are you making it optional just to avoid passing it at the call site?** That's the wrong fix — rework the constructor or factory instead.

```ts
// ❌ Loose — now every caller has to guard
interface Session {
  id: string
  agentName?: string  // is this ever really missing?
}
if (session.agentName) { ... }

// ✅ Tight — guaranteed present, no guards needed
interface Session {
  id: string
  agentName: string
}
```

Optional should mean **genuinely absent in valid states**, not **"I wasn't sure so I added a `?`"**.

## Code style

**Prefer Pydantic `BaseModel` over `dataclass`**
Pydantic gives you validation, serialization, and IDE support for free. Only reach for `dataclass` if you have a specific reason to avoid Pydantic.

**Prefer dependency injection over module-level instantiation**
Instantiating objects at the module level makes code hard to test and creates hidden coupling. Pass dependencies explicitly so they can be swapped, mocked, or configured at the call site.

```py
# ❌ Module-level — hidden, untestable
db = Database()

def get_user(id: str):
    return db.find(id)

# ✅ Injected via dependencies.py
# dependencies.py
def get_db() -> Database:
    return Database(settings.DATABASE_URL)

# router.py
@router.get("/users/{id}")
def get_user(id: str, db: Database = Depends(get_db)):
    return db.find(id)
```

**Prefer extracting logic into hooks over long components**
When a component grows complex, resist the urge to keep adding to it. Pull state and side-effect logic into a dedicated hook so the component stays focused on rendering.

## Function placement

When adding new methods or functions, place them thoughtfully:

- Public before private
- By importance: `start`, `run`, `process` near top; helpers near bottom
- Don't blindly append to the end of a file
