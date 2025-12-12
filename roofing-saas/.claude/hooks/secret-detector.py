#!/usr/bin/env python3
"""
Secret Detector Hook
Prevents accidental credential exposure in user prompts
Exit 0 = allow, Exit with JSON = block with reason
"""

import json
import re
import sys
from typing import Tuple, List

# Secret detection patterns (pattern, description)
SECRET_PATTERNS: List[Tuple[str, str]] = [
    # Generic secret keywords
    (r"(?i)(password|secret|token|api[_-]?key|access[_-]?key)\s*[:=]\s*['\"]?[a-zA-Z0-9+/=_-]{8,}",
     "Potential secret or API key"),

    # Specific API key formats
    (r"sk_live_[a-zA-Z0-9]{24,}", "Stripe live API key"),
    (r"sk_test_[a-zA-Z0-9]{24,}", "Stripe test API key"),
    (r"sk-[a-zA-Z0-9]{48}", "OpenAI API key"),
    (r"AIza[a-zA-Z0-9_-]{35}", "Google API key"),
    (r"AKIA[0-9A-Z]{16}", "AWS Access Key ID"),

    # Auth tokens
    (r"Bearer\s+[a-zA-Z0-9._-]{50,}", "Bearer authentication token"),
    (r"ghp_[a-zA-Z0-9]{36,}", "GitHub Personal Access Token"),
    (r"gho_[a-zA-Z0-9]{36,}", "GitHub OAuth Token"),

    # Connection strings
    (r"(?i)(postgres|mysql|mongodb)://[^:]+:[^@]+@", "Database connection string with credentials"),
    (r"https?://[^:]+:[^@]+@", "URL with embedded credentials"),

    # Private keys
    (r"-----BEGIN (RSA |DSA |EC )?PRIVATE KEY-----", "Private key detected"),

    # JWT tokens (very long base64 strings with dots)
    (r"eyJ[a-zA-Z0-9_-]{20,}\.eyJ[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,}", "JWT token"),

    # Supabase keys (anon keys are safe, but service role keys are sensitive)
    (r"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[a-zA-Z0-9_-]{100,}\.[a-zA-Z0-9_-]{20,}",
     "Supabase JWT (verify if service_role key)"),
]

# Allowlist patterns (if prompt contains these, likely explaining/discussing, not exposing)
ALLOWLIST_PATTERNS = [
    r"(?i)example[:\s]",
    r"(?i)placeholder",
    r"(?i)redacted",
    r"(?i)\[YOUR_.*\]",
    r"(?i)<.*_KEY>",
    r"(?i)REPLACE_WITH",
]


def is_likely_example(prompt: str) -> bool:
    """Check if the prompt appears to be discussing/explaining rather than exposing."""
    for pattern in ALLOWLIST_PATTERNS:
        if re.search(pattern, prompt):
            return True
    return False


def detect_secrets(prompt: str) -> List[Tuple[str, str]]:
    """
    Scan prompt for potential secrets.
    Returns list of (description, matched_text_preview) tuples.
    """
    findings = []

    # Skip if this appears to be an example/discussion
    if is_likely_example(prompt):
        return findings

    for pattern, description in SECRET_PATTERNS:
        matches = re.finditer(pattern, prompt, re.IGNORECASE | re.MULTILINE)
        for match in matches:
            matched_text = match.group(0)
            # Truncate long matches for preview
            preview = matched_text[:50] + "..." if len(matched_text) > 50 else matched_text
            findings.append((description, preview))

    return findings


def main():
    try:
        # Read hook input from stdin
        hook_data = json.load(sys.stdin)

        # Only process UserPromptSubmit events
        if hook_data.get("hook_event_name") != "UserPromptSubmit":
            sys.exit(0)

        prompt = hook_data.get("prompt", "")

        # Detect potential secrets
        secrets_found = detect_secrets(prompt)

        if secrets_found:
            # Build detailed error message
            findings_text = "\n".join([
                f"  • {desc}\n    Preview: {preview}"
                for desc, preview in secrets_found
            ])

            # Block the prompt submission
            response = {
                "decision": "block",
                "reason": f"""🔒 SECURITY POLICY VIOLATION

Potential secrets or credentials detected in your prompt:

{findings_text}

Please rephrase your message without including sensitive information.

If you need to reference credentials:
- Use placeholder text like [YOUR_API_KEY] or <REDACTED>
- Refer to them by name without the actual value
- Store them in .env files and reference by variable name

If this is a false positive (e.g., you're explaining a pattern),
add context words like "example", "placeholder", or "redacted".
"""
            }

            print(json.dumps(response))
            sys.exit(0)

        # No secrets detected, allow prompt
        sys.exit(0)

    except json.JSONDecodeError:
        # Invalid JSON input - fail open (don't block)
        sys.exit(0)
    except Exception as e:
        # Unexpected error - fail open to avoid blocking legitimate work
        print(f"Hook error: {str(e)}", file=sys.stderr)
        sys.exit(0)


if __name__ == "__main__":
    main()
