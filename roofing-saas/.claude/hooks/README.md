# Claude Code Quality Assurance Hooks

This directory contains automated quality assurance hooks that run during development with Claude Code.

## Hook Scripts

### `typecheck.sh`
**When**: Before every `Write` or `Edit` tool use
**Purpose**: TypeScript type checking to catch type errors before code changes
**Timeout**: 30 seconds
**Failure Behavior**: Blocks code changes if type errors found

**What it does**:
- Runs `tsc --noEmit` to check all TypeScript files
- Validates type safety across the entire codebase
- Prevents type regressions

### `lint.sh`
**When**: Before every `Write` or `Edit` tool use
**Purpose**: ESLint validation to maintain code quality and style
**Timeout**: 30 seconds
**Failure Behavior**: Blocks code changes if linting errors found

**What it does**:
- Runs `npm run lint` (ESLint)
- Checks code style, best practices, and potential bugs
- Enforces consistent code formatting

### `build-check.sh`
**When**: After agent finishes responding (Stop event)
**Purpose**: Validates production build still works
**Timeout**: 120 seconds (2 minutes)
**Failure Behavior**: Warns but doesn't block (continueOnError: true)

**What it does**:
- Runs `npm run build` to create production build
- Catches build-time errors and configuration issues
- Verifies code can be deployed successfully

## Hook Configuration

Hooks are configured in `.claude/settings.json`:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [...]
      }
    ],
    "Stop": [
      {
        "matcher": ".*",
        "hooks": [...]
      }
    ]
  }
}
```

## Benefits

✅ **Catch errors early** - Type and lint errors detected before code is written
✅ **Maintain quality** - Consistent code style and best practices enforced
✅ **Prevent regressions** - Build validation ensures deployability
✅ **Automated** - No manual quality checks needed
✅ **Fast feedback** - Issues caught in seconds, not minutes

## Customization

To modify hook behavior:

1. **Add new hooks**: Create script in `.claude/hooks/` and add to `settings.json`
2. **Change timeouts**: Adjust `timeout` values in `settings.json`
3. **Make optional**: Set `continueOnError: true` to warn instead of block
4. **Disable hooks**: Remove or comment out hook configuration

## Troubleshooting

**Hook fails with "permission denied"**:
```bash
chmod +x .claude/hooks/*.sh
```

**Hook timeout**:
- Increase `timeout` value in `settings.json`
- Or set `continueOnError: true` for non-critical hooks

**Hook blocking valid changes**:
- Check error output for specific issues
- Fix underlying code issues
- Or temporarily disable hook by commenting out in `settings.json`

## Hook Events Reference

Claude Code supports these hook events:

- `PreToolUse` - Before tool execution
- `PostToolUse` - After tool succeeds
- `UserPromptSubmit` - When user submits prompt
- `Stop` - When main agent finishes
- `SubagentStop` - When subagent finishes
- `SessionStart` - When session starts
- `SessionEnd` - When session ends

## Security

⚠️ **Important**: Only add hooks you trust. Hook scripts run with your system permissions and can execute arbitrary commands.

All hooks in this directory are:
- Open source and reviewable
- Project-specific (no external dependencies)
- Sandboxed to project directory
- Version controlled with the codebase
