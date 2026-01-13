import axios from "axios";
import { prepareBashFile } from "./yamlUtils.js";
import { spawn } from "child_process";
import fs from "fs/promises";

// Helper function to verify the app is healthy
export const checkHealth = async (url, retries = 5) => {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await axios.get(url);
      console.log(response.status);
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
  const prevSHA = req.body.before;

  process.env.PREVIOUS_RELEASE = prevSHA;
  console.log(process.env.PREVIOUS_RELEASE);

  await prepareBashFile(req, prevSHA, "rollback.yml");

  const bashChildProcess = spawn("bash", [`./${req.body.before}.sh`]);

  bashChildProcess.stdout.on("data", async (data) => {
    process.stdout.write(data);
    await fs.appendFile("./logs/logs.txt", data.toString(), "utf8");
  });

  bashChildProcess.stderr.on("data", async (data) => {
    process.stderr.write(data);
    await fs.writeFile("./logs/logs.txt", data.toString(), "utf8");
  });
};

export const getFormattedDate = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
};
