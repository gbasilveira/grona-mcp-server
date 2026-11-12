#!/usr/bin/env python3
# Original authors and maintainers: αIAt (https://aiat.pt) and Guilherme da Silveira (gbasilveira@gmail.com).
# License: MIT — see LICENSE at the repository root.
"""Orchestrator hook (foundry-protocol): records ALL operations (Agent, SendMessage, Bash,
ScheduleWakeup, AskUserQuestion, end of sub-agents, user messages) in
docs/orchestration-log/raw/AAAA-MM-DD.jsonl (local, git-ignored). Never fails the tool."""
import json, sys, os, datetime
def cut(v, n=3000):
    if isinstance(v, str): return v if len(v) <= n else v[:n] + f"…[+{len(v)-n}]"
    if isinstance(v, dict): return {k: cut(x, n) for k, x in v.items()}
    if isinstance(v, list): return [cut(x, n) for x in v[:50]]
    return v
try:
    d = json.load(sys.stdin)
    root = os.environ.get("CLAUDE_PROJECT_DIR") or os.getcwd()
    now = datetime.datetime.now(datetime.timezone.utc)
    rec = {"ts": now.isoformat(timespec="seconds"), "event": d.get("hook_event_name"),
           "session": d.get("session_id"), "tool": d.get("tool_name"),
           "input": cut(d.get("tool_input")), "response": cut(d.get("tool_response"), 1500),
           "prompt": cut(d.get("prompt"), 3000),
           "agent": d.get("agent_id") or d.get("agent_type"), "stop_msg": cut(d.get("last_assistant_message"), 3000)}
    rec = {k: v for k, v in rec.items() if v not in (None, "", {})}
    p = os.path.join(root, "docs/orchestration-log/raw"); os.makedirs(p, exist_ok=True)
    with open(os.path.join(p, now.strftime("%Y-%m-%d") + ".jsonl"), "a", encoding="utf-8") as f:
        f.write(json.dumps(rec, ensure_ascii=False) + "\n")
except Exception:
    pass
