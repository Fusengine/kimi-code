---
name: <skill-name>
description: <One sentence: what it does and when the agent should load it.>
version: 1.0.0
# platforms: [linux, macos]
metadata:
  hermes:
    tags: [<tag>, <tag>]
    category: <category>
    # requires_toolsets: [terminal]
    # config:
    #   - key: <skill-name>.<setting>
    #     description: "<what this controls>"
    #     default: "<value>"
    #     prompt: "<setup question>"
# required_environment_variables:
#   - name: <ENV_VAR_NAME>
#     prompt: <What this key is>
#     help: <Where to get it>
---

# <Skill Title>

## When to Use
- <Trigger condition 1>
- <Trigger condition 2>
- Not for: <neighbouring task and the skill that owns it>

## Procedure
1. <Step - name the exact tool or script, e.g. run `~/.hermes/scripts/<script>.sh`>
2. <Step>
3. <Step - where the result goes: reply, file under the workspace, or a draft for approval>

## Pitfalls
- <Rule> - <one clause of why (the mechanism)>.
- Never <irreversible action>; prepare it for the owner's go instead.

## Verification
- <How to confirm it worked: file exists, command exit code, message visible in the target channel>
