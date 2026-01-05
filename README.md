# Custom Node.js CI/CD Server ⚙️🚀

A lightweight, configuration-driven CI/CD server built from scratch using Node.js. This server automates deployment workflows by listening for GitHub webhooks, executing build/deploy scripts defined in a YAML config, and providing real-time feedback through the GitHub Commit Status API.

## 🌟 Key Features

- **Config-Driven Workflow**: Manage multiple projects through a single `workspace.yml` file with custom commands for testing, building, and deploying.
- **GitHub Status Integration**: Automatically updates commit statuses (Pending 🟡, Success ✅, Failure ❌) so developers see pipeline progress in their repo.
- **Secure Webhooks**: Uses HMAC SHA-256 signature verification to ensure only legitimate GitHub requests trigger the pipeline.
- **Concurrency Safe**: Generates unique shell scripts based on Commit SHA to handle simultaneous pushes without interference.
- **Failure Notifications**: Sends immediate email alerts via Resend API if a pipeline fails.
- **Automatic Cleanup**: Temporary deployment scripts are deleted after execution to keep the server clean.

## 🛠️ Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Parsing**: js-yaml
- **Communication**: Axios, Resend API
- **Security**: Crypto (HMAC verification)

## 📂 Project Structure

```
├── server/
│   ├── controllers/      # Webhook processing logic
│   ├── middlewares/      # GitHub signature verification
│   ├── routes/           # Webhook route definitions
│   ├── services/         # GitHub API & email notifications
│   ├── utils/            # YAML parsing & file preparation
│   ├── logs/             # Build logs (static files)
│   ├── workspace.yml     # Project configuration
│   └── app.js            # Server entry point
```

## 🚀 Getting Started

### Prerequisites
- Node.js v18+
- GitHub Personal Access Token (repo:status permissions)
- Resend API Key

### Configuration

Create `.env` in the server directory:
```
PORT=4000
GITHUB_TOKEN=your_github_token
WEBHOOK_SECRET=your_webhook_secret
EMAIL_RESEND_KEY=your_resend_key
```

Edit `workspace.yml`:
```yaml
projects:
    - name: "Your-Repo-Name"
        branch: "main"
        commands:
            test: "npm test"
            deploy: "pm2 reload app"
```

### Installation
```bash
npm install
npm run dev
```

## 🔒 Security

The server verifies every request using the `x-hub-signature-256` header against your `WEBHOOK_SECRET`. Unmatched requests are ignored.

## 📧 Failure Alerts

On build failure, the server extracts the committer's email from the GitHub payload and sends a detailed report with commit message and hash.

---

Developed as a deep-dive into DevOps and Backend Engineering.