import fs from "fs/promises";
import yaml from "js-yaml";
import { getFormattedDate } from "./utils.js";

export const parsedYaml = async (yamlFile) => {
  let yamlContent = await fs.readFile(yamlFile, "utf8");

  // Replace ${VARIABLE} with process.env.VARIABLE
  yamlContent = yamlContent.replace(/\${(\w+)}/g, (match, key) => {
    return process.env[key] || match;
  });

  const data = yaml.load(yamlContent);

  return data;
};

export const deployChanges = async (req) => {
  process.env.NEW_RELEASE = `${getFormattedDate()}-${req.body.after}`;
  process.env.CLONE_URL = req.body.repository.clone_url;

  await prepareBashFile(req, req.body.after, "workspace.yml");
};

export const prepareBashFile = async (req, sha, yaml) => {
  const ref = req.body.ref;
  const branch = ref.split("/").pop();

  const repositoryName = req.body.repository.name;

  const data = await parsedYaml(yaml);

  const repository = data.projects.find(
    (project) => project.name === repositoryName
  );

  const environment = repository.environments.find(
    (env) => env.branch === branch
  );

  if (!environment) {
    throw new Error(`No environment configuration found for branch: ${branch}`);
  }

  const fullScript = Object.values(environment.commands).join("\n") + "\n";
  await fs.writeFile(`${sha}.sh`, fullScript, "utf8");
};
