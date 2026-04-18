# Alt-Account, Circle, and Async PvP Abuse Checklist v1

Use this checklist only when a change touches **social-lite rewards**, **circle contribution flows**, or **optional async PvP rewards/settlement**.

## Scope and limits

- Product direction remains **PvE-first**.
- Social is **asynchronous by default**.
- PvP is **optional and late**.
- This checklist does **not** define a full anti-fraud system.
- This checklist does **not** open scope for trading, guild wars, territory control, or real-time PvP.

## Required safeguards

### Alt-account abuse

- [ ] Rewarded flow does not become more profitable through self-feeding alts than through normal PvE play.
- [ ] One main account cannot farm the same reward loop faster by creating throwaway feeder accounts.
- [ ] New-account rewards, catch-up rewards, referral-like rewards, or first-win rewards do not multiply through easy alt creation.
- [ ] The same operator can manually trace who created value, who received value, and whether the flow can be repeated without meaningful cost.
- [ ] Reward caps, cooldowns, first-time flags, or opponent/contributor uniqueness rules exist where the loop would otherwise be alt-positive.

### Circle / guild / social-lite collusion abuse

- [ ] Circle contribution rewards do not scale mainly from account count or low-effort spam.
- [ ] Small trusted groups cannot rotate trivial actions between each other for net-positive progression.
- [ ] Join/leave behavior cannot reset caps, contribution state, or milestone eligibility.
- [ ] Shared goals reward meaningful participation, not presence inflation or roster padding.
- [ ] Circle flow does not punish absence and does not pressure players into mandatory attendance.

### Optional async PvP abuse

- [ ] Async PvP rewards stay clearly below core PvE progression value.
- [ ] Repeated matches against the same opponent cannot be the best reward route.
- [ ] Win-trading, surrender-trading, or scheduled reciprocal losses do not create net-positive farming.
- [ ] Defense/offense settlement cannot be replayed for duplicate rewards or duplicated ranking progress.
- [ ] PvP participation is optional for power growth; skipping it does not block baseline progression.

## Release-gate questions

- [ ] If this feature shipped with no further anti-fraud work, would honest PvE remain the best default progression path?
- [ ] Can two players or one player with alts collude for better rewards than intended?
- [ ] Can a circle gain more from account volume than from genuine contribution quality?
- [ ] Can the same opponent, same circle, or same contribution pattern be repeated for outsized value?
- [ ] Is there a clear cap, diminishing return, uniqueness rule, or manual review trigger on the abused path?
- [ ] If the answer to any question above is unclear, the feature is **not release-ready**.

## Manual QA prompts

### Alt-account prompts

- [ ] Create a fresh alt and try to feed a main account through the changed loop.
- [ ] Repeat the cheapest possible action chain three times and compare payout against honest solo PvE.
- [ ] Check whether first-time, comeback, novice, or placement-style rewards can be claimed again with a new account.

### Circle / social-lite prompts

- [ ] Simulate a 2–3 account micro-circle that rotates minimal contributions.
- [ ] Test join -> contribute -> leave -> rejoin and confirm caps/milestones do not reset incorrectly.
- [ ] Test whether offline, inactive, or placeholder members inflate progress, payouts, or unlock speed.

### Async PvP prompts

- [ ] Run repeated duels between the same two accounts and confirm reward value falls off or is blocked.
- [ ] Simulate win-trading and surrender-trading and confirm it is not progression-positive.
- [ ] Retry or replay the same async PvP settlement input and confirm rewards/rank state do not apply twice.

## Ship rule

- Ship only if all changed reward-bearing social-lite or async PvP flows can answer this document with clear safeguards, acceptable manual QA results, and no obvious alt-positive route.
