# Outbound preview - template

The chief posts this to the owner only after the trace scan returned zero
hits. Everything between the two rules is exactly what will be sent.

```markdown
Note for you (not sent): <why this wording / what changed since last version>

────────────────────────────────
From:        <exact sending address>
To:          <address>
Cc:          <address or —>
Subject:     <subject>

<full body, exactly as sent, signature included>

Attachments: <recipient-facing file name> (<n> pages)   [file attached here]
────────────────────────────────
Check: trace scan 0 hits

Ready. I recommend sending. Go?
```

## Rules

- The attached file in the preview is the exact file that will be sent.
- After the go, the send mechanism already on the owner's server sends this
  exact version (show-before-go.md).
- No preview without the scan line.
- Changing anything after the go → regenerate this preview and ask for a new go.
