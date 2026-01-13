import axios from "axios";
import { prepareCleanupScript, prepareRollbackScript } from "./yamlUtils.js";
import { spawn } from "child_process";
import fs from "fs/promises";
import { setGithubStatus } from "../services/statusApis.js";

// Helper function to verify the app is healthy
export const checkHealth = async (url, retries = 5) => {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await axios.get(url);
      if (response.status === 200) return true;
    } catch (err) {
      console.log(`Health check attempt ${i + 1} failed. Retrying...`);
      // Wait 2 seconds before retrying
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
  return false;
};

export const triggerRollback = async (req) => {
  const repositoryName = req.body.repository.full_name;
  const prevSha = req.body.before;
  const sha = req.body.after;

  await prepareRollbackScript(req);

  const bashChildProcess = spawn("bash", [`./${prevSha}.sh`]);

  bashChildProcess.stdout.on("data", async (data) => {
    process.stdout.write(data);
    await fs.appendFile("./logs/logs.txt", data.toString(), "utf8");
  });

  bashChildProcess.stderr.on("data", async (data) => {
    process.stderr.write(data);
    await fs.appendFile("./logs/logs.txt", data.toString(), "utf8");
  });

  bashChildProcess.on("close", async () => {
    await setGithubStatus(
      repositoryName,
      sha,
      "failure",
      `Health check failed. Auto-rolled back to previous version. ⏪`,
      "http://localhost:4000/logs.txt"
    );
    await fs.rm(`${prevSha}.sh`);
  });
};

export const cleanupDisk = async (req) => {
  await prepareCleanupScript(req);

  const bashChildProcess = spawn("bash", [`./${req.body.after}.sh`]);

  bashChildProcess.stdout.on("data", async (data) => {
    process.stdout.write(data);
    await fs.appendFile("./logs/logs.txt", data.toString(), "utf8");
  });

  bashChildProcess.stderr.on("data", async (data) => {
    process.stderr.write(data);
    await fs.appendFile("./logs/logs.txt", data.toString(), "utf8");
  });

  bashChildProcess.on("close", async () => {
    await fs.rm(`${req.body.after}.sh`);
  });
};

export const getFormattedDate = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
};
