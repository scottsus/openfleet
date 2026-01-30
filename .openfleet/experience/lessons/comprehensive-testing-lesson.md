# Comprehensive Testing with Executable Scripts

## Context

During implementation of `fix-templates-init`, created a comprehensive test script that caught all potential issues before manual review and can be reused for regression testing.

**Story**: `fix-templates-init/01-30_add-templates-to-source` (2026-01-30)

## Insight

Creating deterministic, executable test scripts provides:

1. **Pre-commit verification** - Catch issues before they reach code review
2. **Clear pass/fail feedback** - No ambiguity in test results
3. **Regression protection** - Can re-run after future changes
4. **Living documentation** - Script documents expected behavior

## Pattern

### Test Script Structure

```bash
#!/bin/bash
# test-<feature>.sh
# <Brief description of what's being tested>

set -e  # Exit on first error

echo "Testing <feature>"
echo "=================="

# Test 1: <Category>
echo "Test 1: <Test name>"
if [ condition ]; then
  echo "✅ <Success message>"
else
  echo "❌ <Failure message>"
  exit 1
fi

# Test 2: <Category>
echo "Test 2: <Test name>"
# ... more tests

echo ""
echo "🎉 All tests passed!"
echo ""
echo "Next steps:"
echo "  - <Manual verification if needed>"
```

### Real Example: `test-template-init.sh`

From `fix-templates-init` story:

```bash
#!/bin/bash
set -e

echo "Testing .openfleet template initialization"

# Test 1: Build verification
npm run build > /dev/null 2>&1
if [ $? -ne 0 ]; then
  echo "❌ Build failed"
  exit 1
fi
echo "✅ Build successful"

# Test 2: File exists
if [ ! -f "dist/templates/.openfleet/.templates/task-tree.md" ]; then
  echo "❌ Template missing"
  exit 1
fi
echo "✅ Template exists"

# Test 3: Content matches
if ! diff -q src/templates/.openfleet/.templates/task-tree.md \
              dist/templates/.openfleet/.templates/task-tree.md > /dev/null; then
  echo "❌ Templates don't match"
  exit 1
fi
echo "✅ Templates match"

# ... 5 more tests (8 total)

echo "🎉 All tests passed!"
```

**Results**: 8/8 tests passing, caught all issues before review

## Test Categories

Include these test levels when applicable:

### 1. Build Verification

- Build completes without errors
- Output artifacts exist in expected locations
- Build time is reasonable

### 2. File/Content Verification

- Required files exist
- Files have expected content (line count, key strings)
- Source and built files match

### 3. Code Verification

- Required code changes made
- No unintended references remain
- Grep patterns match expected results

### 4. Package Verification

- Files included in distribution package
- NPM pack dry-run shows expected files
- Package.json configuration correct

### 5. Integration Verification

- Fresh installation works
- Dependencies resolved correctly
- Runtime behavior as expected

## Application

### When to Create Test Scripts

**CREATE a comprehensive test script when**:

- Making infrastructure changes (build, templates, initialization)
- Modifying package distribution
- Changing file paths or references
- Implementing features that need regression protection

**SKIP test scripts when**:

- One-line code changes with obvious verification
- Purely documentation updates
- Changes already covered by existing test suite

### Executable and Versioned

```bash
# Make script executable
chmod +x test-<feature>.sh

# Commit it to repo (not gitignored)
git add test-<feature>.sh
git commit -m "Add comprehensive test script for <feature>"
```

**Why commit test scripts**:

- Can be run by reviewers independently
- Future maintainers can verify behavior
- Regression testing after related changes
- Documents expected behavior permanently

### Deterministic Output

**Good test output** (clear, actionable):

```
Test 1: Build Verification
--------------------------
✅ Build successful
✅ Template exists
✅ Files match
```

**Bad test output** (ambiguous):

```
Running tests...
Done
```

Use emojis and clear language:

- ✅ for success
- ❌ for failure
- ⚠️ for warnings
- 🎉 for all tests passed

## Benefits Observed

From `fix-templates-init` implementation:

1. **Faster implementation** - No guessing if changes worked
2. **Confident commits** - All tests passed before staging files
3. **Easy review** - Reviewer ran same tests independently
4. **No regressions** - Can re-run if templates change in future

**Time investment**:

- Writing script: ~5 minutes
- Value gained: Caught 2 issues early, prevented 1 potential regression

**ROI**: High - especially for infrastructure changes

## Related

- **Runbook**: `complete-sparr-story.md` (Phase 3: Testing approach)
- **Example**: `test-template-init.sh` from `fix-templates-init` story
- **LLD template**: Can include test script creation as standard step
