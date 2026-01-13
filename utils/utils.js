import axios from "axios";
import { spawn } from "child_process";
import fs from "fs/promises";
import { setGithubStatus } from "../services/statusApis.js";
import yaml from "js-yaml";

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
  const sha = req.body.after;

  await prepareCleanupScript(req);

  const bashChildProcess = spawn("bash", [`./${sha}.sh`]);

  bashChildProcess.stdout.on("data", async (data) => {
    process.stdout.write(data);
    await fs.appendFile("./logs/logs.txt", data.toString(), "utf8");
  });

  bashChildProcess.stderr.on("data", async (data) => {
    process.stderr.write(data);
    await fs.appendFile("./logs/logs.txt", data.toString(), "utf8");
  });

  bashChildProcess.on("close", async () => {
    await fs.rm(`${sha}.sh`);
  });
};

export const getFormattedDate = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
};

export const parsedYaml = async (yamlFile) => {
  let yamlContent = await fs.readFile(yamlFile, "utf8");

  // Replace ${VARIABLE} with process.env.VARIABLE
  yamlContent = yamlContent.replace(/\${(\w+)}/g, (match, key) => {
    return process.env[key] || match;
  });

  const data = yaml.load(yamlContent);

  return data;
};

export const prepareRollbackScript = async (req) => {
  const prevSHA = req.body.before;

  process.env.PREVIOUS_RELEASE = prevSHA;

  const { environment } = await prepareBashFile(req);

  const fullScript = Object.values(environment.rollback).join("\n") + "\n";
  await fs.writeFile(`${prevSHA}.sh`, fullScript, "utf8");
};

export const prepareScript = async (req) => {
  const sha = req.body.after;

  process.env.NEW_RELEASE = `${getFormattedDate()}-${sha}`;
  process.env.CLONE_URL = req.body.repository.clone_url;

  const { environment } = await prepareBashFile(req);

  const fullScript = Object.values(environment.commands).join("\n") + "\n";
  await fs.writeFile(`${sha}.sh`, fullScript, "utf8");
};

export const prepareCleanupScript = async (req) => {
  const sha = req.body.after;
  const { environment } = await prepareBashFile(req);

  const fullScript = Object.values(environment.cleanup).join("\n") + "\n";

  await fs.writeFile(`${sha}.sh`, fullScript, "utf8");
};

export const prepareBashFile = async (req) => {
  const ref = req.body.ref;
  const branch = ref.split("/").pop();

  const repositoryName = req.body.repository.name;

  const data = await parsedYaml("workspace.yml");

  const repository = data.projects.find(
    (project) => project.name === repositoryName
  );

  const environment = repository.environments.find(
    (env) => env.branch === branch
  );

  if (!environment) {
    throw new Error(`No environment configuration found for branch: ${branch}`);
  }

  return { environment };
};

export const spawnChildProcess = async () => {};
