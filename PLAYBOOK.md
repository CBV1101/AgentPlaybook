# AI Agent Launch Playbook

Ship an agent only when it can do a bounded job better than the current workflow, with a way to prove it, stop it, and improve it.

## Who this is for

Product, engineering, design, and ops shipping an agent that takes actions or produces work a user will rely on. Not a chatbot demo. Not a feature that only answers questions with no consequence.

## What an agent is here

An **agent** is software that:

1. Takes a goal in user or system language.
2. Chooses steps, tools, or retrieval to pursue that goal.
3. Produces an output or side effect a human or downstream system will use.
4. Can fail in ways that are expensive, wrong, or irreversible.

If it only classifies, extracts, or fills a form with a single model call and no tool use, it is a model feature. Use a simpler launch bar.

---

## Phase 0 — Fit

**Outcome:** A one-page decision: build an agent, build a non-agent AI feature, or do not use AI.

### Start from the job

Write the job in this shape:

> When [user] is trying to [job], they currently [current workflow]. The painful part is [friction]. Success is [observable outcome].

If you cannot name the current workflow, you do not have a product yet.

### Use an agent when most of these are true

- The job has **variable steps**, not one fixed pipeline.
- The user already **delegates** this work to a person or a pile of tools.
- The agent can be given **tools with clear preconditions** (read ticket, draft PR, search docs, file a change).
- Wrong answers are **detectable** by a grader, a human, or a system check.
- Time-to-value for the user is **minutes or hours**, not a research project.

### Do not use an agent when

- The job is a deterministic workflow you can encode in software.
- The cost of a silent error is high and you have no verifier.
- You cannot get production-like examples.
- The “agent” is a wrapper around a search box.
- Stakeholders want “an AI agent” without a job, owner, or metric.

### Decision

Fill this before any architecture work:

| Question | Answer |
| --- | --- |
| Job to be done | |
| User and frequency | |
| Why not a script / form / search? | |
| What the agent may do | |
| What the agent must never do | |
| Primary metric | |
| Kill criteria | |
| Owner (PM + eng) | |

**Gate:** Phase 0 is signed by PM and eng lead. No tools, prompts, or vendors until this exists.

---

## Phase 1 — Agent contract

**Outcome:** A contract the team can implement and the company can review.

Copy [templates/agent-contract.md](templates/agent-contract.md).

### The contract has seven parts

1. **Job and non-goals.** One paragraph each. Non-goals prevent scope creep into “general assistant.”
2. **Interface.** Who invokes it (user, system, another agent), with what input, and what they get back (draft, action, artifact).
3. **Autonomy level.** Recommend / draft / act with confirmation / act within policy. Default to the lowest level that still creates value.
4. **Tools.** Allowlist. For each tool: purpose, required args, side effects, idempotency, who may approve.
5. **Knowledge.** What it may read (docs, tickets, code, customer data). Freshness and tenancy rules.
6. **Success metric.** One primary metric (e.g. tasks completed without edit, time-to-resolution, accepted drafts). One quality floor (eval pass rate). One cost ceiling.
7. **Kill criteria.** Concrete: “pause if eval pass rate < X for 3 days” or “pause if high-severity incident > 0.”

### Autonomy ladder

| Level | Behavior | Use when |
| --- | --- | --- |
| 0 Suggest | Advice only, no artifacts | Discovery, coaching |
| 1 Draft | Creates artifacts a human applies | High stakes, new domain |
| 2 Act with confirm | Proposes tool calls; human approves | Irreversible or customer-facing |
| 3 Act in policy | Executes inside hard limits | Mature evals, cheap rollback |
| 4 Supervise | Runs until exception | Rare; requires on-call and traces |

Launch at the lowest level that beats the current workflow. Raise autonomy only after evals and a pilot say so.

### Product surfaces

Decide these in the contract, not in QA:

- Where the user sees the agent (IDE, ticket, Slack, product UI).
- How they start, stop, and correct it.
- How they see what it did (trace, diff, citations).
- How they escalate to a human.

**Gate:** Contract reviewed by PM, eng, design, and whoever owns the data the agent will touch.

---

## Phase 2 — System

**Outcome:** A design that matches the contract, not a pile of tools.

### Default architecture

Keep the first version boring:

1. **Orchestrator** — the loop: plan → tool → observe → stop.
2. **Tools** — thin wrappers over existing APIs with auth, timeouts, and dry-run where possible.
3. **Retriever** — only if the job needs private or changing knowledge. Start with the smallest corpus.
4. **Memory** — session state first. Long-term memory is a product decision, not a default.
5. **Verifier** — schema checks, tests, policy, or a second model used only as a grader, never as the actor.
6. **Trace store** — every run: inputs, tool calls, outputs, cost, user edits.

If you cannot inspect a failed run in one place, you cannot operate the agent.

### Tool design rules

- Prefer **read** tools before **write** tools.
- Writes are idempotent or clearly not.
- Every write has a **compensation** or a human rollback path.
- Tools return structured errors the model can use. Do not dump HTML.
- Cap fan-out (max tools per run, max tokens, max wall clock).
- Never give production-destructive tools to a prototype.

### Human handoff

Define the interrupt:

- User clicks take over.
- Policy or confidence tripwire.
- Tool error budget exceeded.
- Ambiguous identity / tenancy.

Handoff must include the goal, what was tried, and the artifact so far. A dead-end “something went wrong” is a product bug.

**Gate:** Sequence diagram of one happy path and one handoff path. Tool allowlist reviewed.

---

## Phase 3 — Evals

**Outcome:** You can say “this version is better” without arguing from anecdotes.

Copy [templates/eval-scorecard.md](templates/eval-scorecard.md).

### Build the golden set before the prompt is “done”

Collect 30–100 real tasks from the current workflow. Each case needs:

- Input (as the agent will see it).
- Context fixtures (docs, tickets, repo state) — frozen.
- Expected outcome or rubric (not just a golden string).
- Tags: workflow type, difficulty, risk, customer tier.

Do not eval only on toy prompts. If production data is sensitive, use redacted or synthetic cases that preserve structure.

### Grade what the user cares about

Pick graders that match the job:

| Job type | Grade |
| --- | --- |
| Draft (email, PR, ticket) | Rubric + “would a reviewer accept?” |
| Retrieval / answer | Citation support, refusal when unknown |
| Code change | Tests, lint, scoped diff |
| Action agent | End state of the system, not the essay |

Use LLM-as-judge only with a written rubric and spot-checked human labels. Track judge agreement on a held-out slice.

### Failure taxonomy

Tag every fail:

- Wrong job / over-scoped
- Missing context
- Bad tool choice
- Hallucinated fact
- Policy violation
- Format / schema
- Timeout / cost
- User would still edit heavily

The taxonomy drives the roadmap. “Make the model smarter” is not a ticket.

### Regression bar

- Golden set is versioned in git.
- Every prompt, tool, and model change runs the set.
- You do not ship if the primary metric drops, or if any P0 case fails.
- Online eval (sampled production traces) starts in pilot, not after GA.

**Gate:** Scorecard filled. Owner named. CI or a documented manual run exists.

---

## Phase 4 — Trust, permissions, and abuse

**Outcome:** The agent cannot become a confused deputy, a data leak, or an unowned incident.

### Identity and tenancy

- The agent acts **as the user** or as a **named service account** with a documented scope. Never both in one run without a design.
- Tools inherit the user’s permissions. Do not “fix” auth by giving the agent a god token.
- Retrieval is filtered by the same ACL as the source system.
- Logs do not become a second copy of secrets.

### Policy

Write a short policy the product can enforce:

- Data classes it may see.
- Actions that always require confirmation.
- Topics or request types to refuse.
- Third-party sharing rules (vendors, subprocessors, training).
- Retention of prompts, traces, and artifacts.

Legal and security review the policy, not a slide that says “we use RAG.”

### Abuse and misuse

Assume users will try jailbreaks, prompt injection via tickets/docs, and data exfil through tools. Mitigations that actually ship:

- Treat retrieved content as **untrusted data**, not instructions.
- Confirm high-impact tools out of band (UI confirm, not a model “yes”).
- Rate limit and budget per user / tenant.
- Red-team with injected instructions in the actual corpus, not only in chat.

**Gate:** Threat notes on injection, exfil, and over-permission. Privacy review if customer data is in context.

---

## Phase 5 — Pilot

**Outcome:** Evidence from real work, not a demo reel.

### Design the pilot like a product test

- **Who:** 5–20 people who already do the job. Not only fans of AI.
- **Where:** The real surface, with traces on.
- **How long:** Long enough to see repeat use (usually 2–4 weeks).
- **Comparison:** Same jobs without the agent, or a holdout, if you can.
- **Autonomy:** Usually Level 1 or 2. Do not start at unsupervised write.

### What you measure

- Primary metric vs baseline.
- Edit distance / acceptance rate.
- Time saved **claimed vs calendar** (users lie; traces help).
- Escalation rate and why.
- Cost per successful task.
- Qualitative: would they be angry if you took it away?

### Exit criteria

Pilot succeeds only if:

1. Primary metric beats baseline by the amount in the contract.
2. No open P0. P1s have owners and dates.
3. Failure taxonomy is stable (you are not discovering a new class every day).
4. Support can follow the incident runbook on a dry run.

If the pilot only produces “people thought it was cool,” you learned nothing about launch.

**Gate:** Written pilot report. Go / no-go / iterate.

---

## Phase 6 — Launch

**Outcome:** A reversible, owned, communicated GA (or a deliberate limited GA).

Copy [templates/launch-review.md](templates/launch-review.md).

### Launch types

| Type | When |
| --- | --- |
| Internal only | Employee workflow, still learning |
| Design partner | High-touch, contract-level access |
| Limited GA | Flag, cohort, or plan-gated |
| GA | Default on, or default off with clear enable |

Match blast radius to autonomy. Level 3+ does not go default-on in week one.

### Launch gates (all required)

- Phase 0–5 artifacts exist and are current.
- Eval floor met on the frozen golden set.
- On-call owner and [incident runbook](templates/incident-runbook.md).
- Feature flag / kill switch tested.
- Cost budget and throttle tested.
- Docs: what it does, what it does not do, how to correct it.
- Support macros and known failure modes.
- Rollback: previous prompt/tool/model or disable.

### Communication

Users need three sentences:

1. What it will do for them.
2. What they still own.
3. How to turn it off or get a human.

**Gate:** Launch review meeting with PM, eng, on-call, and the data/security owner if customer data is in play. Notes in the template.

---

## Phase 7 — Operate

**Outcome:** Quality, cost, and scope stay inside the contract.

### Weekly loop (first 30 days, then cadence as risk drops)

1. Sample traces: successes, edits, and failures.
2. Add 5–10 new golden cases from production misses.
3. Review cost per task and tail latency.
4. Review policy near-misses.
5. Decide: fix eval, change tools, lower autonomy, or expand scope.

### Do not expand scope while quality is falling

New tools and new jobs are earned by a stable taxonomy and a green scorecard. “While we’re in there” is how agents become unowned platforms.

### Sunsetting

If kill criteria hit, disable the flag, tell users, and keep traces for the postmortem. A quiet degradation is worse than a pause.

---

## Roles

| Role | Owns |
| --- | --- |
| PM | Job, contract, metric, launch type, scope |
| Eng | Loop, tools, traces, flags, eval harness |
| Design | Start/stop/correct, trust UI, empty and error states |
| Eval owner | Golden set, graders, CI bar (often eng + PM) |
| Security / privacy | Identity, ACL, retention, injection |
| Support / ops | Runbook, macros, on-call |
| Sponsor | Kill decision when metrics and politics conflict |

One name per role. “The team” is not an owner.

---

## Timeline (typical internal agent)

This is a planning aid, not a promise.

| Week | Focus |
| --- | --- |
| 0 | Fit + contract |
| 1 | Thin slice: one job, two tools, traces |
| 2 | Golden set v1 + graders |
| 3 | Trust review + confirmations |
| 4–5 | Pilot |
| 6 | Launch review + limited GA |
| 7+ | Operate loop |

If Phase 0 is contentious, stop the clock. Speed without a job produces a demo.

---

## Anti-patterns

- Starting from a model or vendor instead of a job.
- Autonomy as a brag (“it can use 40 tools”).
- Evals added after the launch date is on a slide.
- Prompt-only ownership (no one owns tools or data).
- Measuring “messages sent” instead of jobs completed.
- Hiding traces from PM and design.
- Training the company to ignore the agent because it is loudly wrong.

---

## Appendix — One-page checklist

Use this in launch review. Details live in the templates.

- [ ] Job and non-goals written
- [ ] Agent is the right shape vs script/search
- [ ] Contract signed (interface, autonomy, tools, metric, kill)
- [ ] Tool allowlist and handoff path
- [ ] Traces in one place
- [ ] Golden set versioned; floor met
- [ ] Failure taxonomy in use
- [ ] Identity, ACL, injection notes
- [ ] Pilot evidence vs baseline
- [ ] Flag, budget, rollback tested
- [ ] On-call and runbook
- [ ] User-facing “does / does not / how to stop”
