import { spawn } from "child_process";
import fs from "fs/promises";
import { deployChanges } from "../utils/yamlUtils.js";
import { setGithubStatus } from "../services/statusApis.js";
import { sendEmail } from "../services/sendEmail.js";
import { checkHealth, triggerRollback } from "../utils/utils.js";

export const serverController = async (req, res, next) => {
  console.log("webhook started!");
  try {
    const repositoryName = req.body.repository.full_name;

    await deployChanges(req);

    const bashChildProcess = spawn("bash", [`./${req.body.after}.sh`]);

    bashChildProcess.stdout.on("data", async (data) => {
      process.stdout.write(data);
      await fs.appendFile("./logs/logs.txt", data.toString(), "utf8");
    });

    bashChildProcess.stderr.on("data", async (data) => {
      process.stderr.write(data);
      await fs.writeFile("./logs/logs.txt", data.toString(), "utf8");
    });

    bashChildProcess.on("close", async (code) => {
      if (code === 0) {
        const isHealthy = await checkHealth(
          "https://test.api.govindsahu.me/health"
        );

        if (isHealthy) {
          await setGithubStatus(
            repositoryName,
            req.body.after,
            "success",
            "Build and deployed succefull!",
            "http://localhost:4000/logs.txt"
          );
          await fs.rm(`${req.body.after}.sh`);
          console.log("Script executed successfully!");
        } else {
          console.log("🚨 App is unhealthy! Triggering automatic rollback...");
          await triggerRollback(req);
          await setGithubStatus(
            repositoryName,
            req.body.after,
            "failure",
            `Health check failed. Auto-rolled back to previous version. ⏪`,
            "http://localhost:4000/logs.txt"
          );
          await fs.rm(`${req.body.before}.sh`);
        }
      } else {
        await setGithubStatus(
          repositoryName,
          req.body.after,
          "failure",
          `Failed to run pipeline for commit ${req.body.commits[0].message}`,
          "http://localhost:4000/logs.txt"
        );
        await sendEmail(req.body);
        await fs.rm(`${req.body.after}.sh`);
        console.log("Script execution failed!");
      }
    });

    bashChildProcess.on("error", async (err) => {
      await setGithubStatus(
        repositoryName,
        req.body.after,
        "failure",
        `Failure ${err.message}`,
        "http://localhost:4000/logs.txt"
      );
      await sendEmail(req.body);
      await fs.rm(`${req.body.after}.sh`);
      console.log("Error in spawning the process!");
      console.log(err);
      await fs.writeFile("./logs/logs.txt", err.toString(), "utf8");
    });
  } catch (error) {
    next(error);
  }
};
