import "dotenv/config";
import express from "express";
import crypto from "crypto";
import { spawn } from "child_process";

const app = express();

const PORT = 4000;

app.use(express.json());

app.post("/deploy", (req, res, next) => {
  console.log("webhook started!");
  try {
    const GitHubSignature = req.headers["x-hub-signature-256"];

    if (!GitHubSignature) return res.end("OK");

    const signature =
      "sha256=" +
      crypto
        .createHmac("sha256", process.env.WEBHOOK_SECRET)
        .update(JSON.stringify(req.body))
        .digest("hex");

    if (GitHubSignature !== signature) return res.end("OK");

    res.end("OK");

    const bashChildProcess = spawn("bash", [`./deploy.sh`]);

    bashChildProcess.stdout.on("data", (data) => {
      process.stdout.write(data);
    });

    bashChildProcess.stderr.on("data", (data) => {
      process.stderr.write(data);
    });

    bashChildProcess.on("close", (code) => {
      if (code === 0) {
        console.log("Script executed successfully!");
      } else {
        console.log("Script execution failed!");
      }
    });

    bashChildProcess.on("error", (err) => {
      console.log("Error in spawning the process!");
      console.log(err);
    });
  } catch (error) {
    next(error);
  }
});

app.use((err, req, res, next) => {
  console.log(err);
  return res.json({
    err,
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
