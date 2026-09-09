# Agent incident runbook

Agent:
On-call:
Escalation:
Kill switch (flag / config):
Trace location:

## Severity

| Sev | Meaning | Example |
| --- | --- | --- |
| P0 | Harm, data leak, irreversible wrong action, or full outage | Wrote to the wrong tenant; sent customer email with secrets |
| P1 | Repeated wrong actions or eval cliff in production | Confirmations bypassed; systematic bad tool |
| P2 | Degraded quality or cost | Latency, spend, noisy drafts |
| P3 | Single-user or cosmetic | One bad draft, UI copy |

## First 15 minutes

1. Confirm scope: which flag, model, prompt, tool version, tenants.
2. If P0/P1: disable the kill switch. Prefer off over “maybe it’s fine.”
3. Preserve traces. Do not wipe prompts to “clean up.”
4. Stop retries / schedulers if the agent loops.
5. Notify: on-call, PM, and security if data may have left the boundary.

## Contain

- Disable writes; leave reads if that helps debug.
- Rotate any credential the agent used if leakage is possible.
- Tell affected users what happened and what they should not trust.

## Diagnose

- Trace id:
- Last good version:
- Failure class (taxonomy):
- Repro on golden set? yes / no

## Recover

- Rollback target (prompt / model / tools / flag):
- Who verifies eval floor after rollback:
- When writes may be re-enabled:

## Follow-up

- Postmortem due:
- Golden cases to add:
- Contract change needed? (autonomy, tools, kill criteria)
