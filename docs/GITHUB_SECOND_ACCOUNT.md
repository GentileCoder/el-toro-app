# Using a Second GitHub Account for a Project

This guide explains how to clone and work on a repo using a secondary GitHub account (`GentileCoder`) while keeping your main account untouched.

## Prerequisites

- macOS with `ssh-keygen` available (built-in)
- A second GitHub account (in this case `GentileCoder`)

---

## Step 1 — Create a Dedicated SSH Key

Run the following command, replacing the email with the one linked to your second GitHub account:

```bash
ssh-keygen -t ed25519 -C "your-second-email@example.com" -f ~/.ssh/id_ed25519_gentilecoder
```

Press Enter twice when prompted for a passphrase (or set one if you prefer).

This creates two files:
- `~/.ssh/id_ed25519_gentilecoder` — private key (never share this)
- `~/.ssh/id_ed25519_gentilecoder.pub` — public key (this goes to GitHub)

---

## Step 2 — Add a Host Alias to SSH Config

Open (or create) `~/.ssh/config` and add the following block:

```
# GentileCoder (second GitHub account)
Host github-gentilecoder
  HostName github.com
  User git
  IdentityFile ~/.ssh/id_ed25519_gentilecoder
  IdentitiesOnly yes
```

This tells SSH to use the GentileCoder key whenever you connect via the `github-gentilecoder` alias.

> **Important:** Do NOT add a default `Host github.com` block pointing to this key — that would break your main account.

---

## Step 3 — Add the Public Key to GitHub

Copy the public key to your clipboard:

```bash
pbcopy < ~/.ssh/id_ed25519_gentilecoder.pub
```

Then:
1. Log in to GitHub as **GentileCoder**
2. Go to **Settings → SSH and GPG keys**
3. Click **New SSH key**
4. Give it a title (e.g. `MacBook`)
5. Paste the key and click **Add SSH key**

Verify the connection works:

```bash
ssh -T git@github-gentilecoder
# Expected: Hi GentileCoder! You've successfully authenticated...
```

---

## Step 4 — Clone the Repo

Use the `github-gentilecoder` host alias instead of `github.com`:

```bash
git clone git@github-gentilecoder:GentileCoder/REPO-NAME.git
```

The remote will automatically be set to use the GentileCoder SSH key.

---

## Step 5 — Set Local Git Identity

Inside the cloned repo folder, set the name and email for commits:

```bash
cd REPO-NAME
git config user.name "GentileCoder"
git config user.email "your-second-email@example.com"
```

This only applies to this repo — your global git identity remains unchanged.

---

## For Future Projects with the Same Account

Steps 1, 2, and 3 only need to be done **once**. The SSH key and config are already in place.

For each new project, you only need to:

1. **Clone** using the alias:
   ```bash
   git clone git@github-gentilecoder:GentileCoder/NEW-REPO.git
   ```

2. **Set local identity** inside the repo:
   ```bash
   cd NEW-REPO
   git config user.name "GentileCoder"
   git config user.email "your-second-email@example.com"
   ```

That's it — every push and pull in that folder will use the GentileCoder account automatically.
