import fs from "fs/promises";
import yaml from "js-yaml";

export const parsedYaml = async () => {
  let yamlContent = await fs.readFile("workspace.yml", "utf8");

  // Replace ${VARIABLE} with process.env.VARIABLE
  yamlContent = yamlContent.replace(/\${(\w+)}/g, (match, key) => {
    return process.env[key] || match;
  });

  const { projects } = yaml.load(yamlContent);

  return { projects };
};

export const prepareBashFile = async (ref, repositoryName, sha) => {
  const branch = ref.split("/").pop();

  const { projects } = await parsedYaml();

  const repository = projects.find(
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
