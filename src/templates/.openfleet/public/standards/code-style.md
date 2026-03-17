# Code Style Standards

## Type definitions

Before defining a new type, always check:

1. **Does it already exist?** Search the codebase before creating a duplicate.
2. **Can it be imported from a 3rd-party library?** Prefer importing from the library
   that owns the concept over redefining it locally.

Only define a new type if it genuinely doesn't exist anywhere reachable.
