# AI Agent Launch Playbook

A working playbook for deciding whether to ship an AI agent, defining the agent contract, proving it with evals, piloting with real users, and operating it after launch.

This is written for product managers who work in the product, not around it.

## How to use it

1. Read [PLAYBOOK.md](PLAYBOOK.md) end to end once.
2. Copy the templates in `templates/` into your initiative folder.
3. Do not skip Phase 0. Most failed agents should never have been agents.
4. Treat evals as a launch gate, not a polish step.
5. Revisit the operate loop every week for the first 30 days after launch.

## Phases

| Phase | Outcome |
| --- | --- |
| 0. Fit | A written yes/no on whether an agent is the right product |
| 1. Contract | Job, boundaries, tools, success metric, kill criteria |
| 2. System | Architecture, tools, memory, human handoff |
| 3. Evals | Golden set, graders, failure taxonomy |
| 4. Trust | Permissions, privacy, abuse, audit |
| 5. Pilot | Real users, measured lift, known failure modes |
| 6. Launch | Gates passed, rollback, support ready |
| 7. Operate | Weekly quality, cost, and scope review |

## Templates

- [Agent contract](templates/agent-contract.md)
- [Eval scorecard](templates/eval-scorecard.md)
- [Launch review](templates/launch-review.md)
- [Incident runbook](templates/incident-runbook.md)

## Working copy in Cursor

Open the interactive playbook canvas beside chat to track phase progress and launch gates:

`~/.cursor/projects/Users-chrisvalle-AgentPlaybook/canvases/ai-agent-launch-playbook.canvas.tsx`
