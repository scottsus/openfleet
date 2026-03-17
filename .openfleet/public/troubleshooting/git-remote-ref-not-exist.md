# Git Error: remote ref does not exist

## Symptoms

When trying to delete a remote branch after PR merge:

```bash
git push origin --delete feat/fix-templates-init--add-templates-to-source

# Error output:
error: unable to delete 'feat/fix-templates-init--add-templates-to-source': remote ref does not exist
error: failed to push some refs to 'github.com:scottsus/openfleet.git'
```

## Root Cause

**GitHub automatically deletes PR branches when the PR is merged** (if auto-delete is enabled in repository settings).

The branch was already deleted by GitHub, so the manual delete command finds nothing to delete.

## Solution

**This error is HARMLESS** - the branch is already gone, which is the desired state.

### If You See This Error

1. **Verify branch is deleted on GitHub**:

   ```bash
   git ls-remote origin | grep <branch-name>
   # Should return nothing (branch doesn't exist remotely)
   ```

2. **Clean up local branch** (if it exists):

   ```bash
   git checkout main
   git branch -D <branch-name>
   ```

3. **Continue with workflow** - No action needed, branch is already deleted

### Expected Workflow After PR Merge

```bash
# 1. PR merged on GitHub → GitHub auto-deletes remote branch
# 2. Switch to main and pull latest
git checkout main
git pull origin main

# 3. Delete local branch (remote already gone)
git branch -D <task-branch-name>

# 4. Optionally verify cleanup
git branch -a | grep <branch-name>
# Should be empty
```

## Prevention

### Option 1: Check Before Deleting (Recommended)

```bash
# Check if remote branch exists first
if git ls-remote --exit-code --heads origin <branch-name> > /dev/null 2>&1; then
  git push origin --delete <branch-name>
  echo "✅ Remote branch deleted"
else
  echo "✅ Remote branch already deleted (likely by GitHub)"
fi
```

### Option 2: Ignore the Error

Since GitHub auto-deletes after merge, you can skip manual deletion entirely:

```bash
# Just clean up local branch
git checkout main
git pull origin main
git branch -D <local-branch-name>
```

### Option 3: Disable GitHub Auto-Delete

In repository settings:

- Settings → General → Pull Requests
- Uncheck "Automatically delete head branches"

**Not recommended** - auto-delete keeps repository clean

## Detection

This is **not an error** that needs detection - it's expected behavior when:

- PR was merged via GitHub UI
- Repository has auto-delete enabled
- You're trying to clean up manually

**If remote branch still exists after PR merge**, that would be unusual and worth investigating.

## Related

- **Runbook**: `complete-sparr-story.md` (PR Creation Workflow section)
- **Story**: `fix-templates-init` (2026-01-30) - where this was first observed
- **GitHub docs**: [Managing the automatic deletion of branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-branches-in-your-repository/managing-the-automatic-deletion-of-branches)
