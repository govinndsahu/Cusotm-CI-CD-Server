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

export const prepareBashFile = async (ref, repositoryName, res) => {
  const branch = ref.split("/").pop();

  const { projects } = await parsedYaml();

  const bashFile = await fs.readFile("deploy.sh", "utf8");

  if (bashFile.length) await fs.writeFile("deploy.sh", "");

  const repository = projects.find(
    (project) => project.name === repositoryName
  );

  if (repository.branch !== branch) {
    return res.status(400).json({
      error: `Server is setup for ${repository?.branch}, not for ${branch}`,
    });
  }

  for (const key in repository.commands) {
    await fs.appendFile("deploy.sh", `${repository.commands[key]}\n`);
  }
};
