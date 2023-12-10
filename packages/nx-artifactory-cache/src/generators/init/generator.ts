import { formatFiles, logger, Tree, updateJson, readRootPackageJson } from '@nrwl/devkit';

import { InitGeneratorSchema } from './schema';

/**
 * Checks if the installed version of Nx is compatible.
 *
 * This function reads the root package.json file and checks if either '@nx/workspace' or '@nrwl/workspace'
 * is listed in the dependencies or devDependencies. If neither is found, an error is thrown.
 *
 * If a compatible package is found, the function checks the version number. If the version number starts
 * with '^' or '~', these characters are removed.
 *
 * The function then parses the major version number. If it cannot be parsed, the function returns false.
 *
 * If the major version number is 16 or greater, the function returns true, indicating that the version is compatible.
 *
 * @returns {boolean} - Returns true if the installed Nx version is compatible, false otherwise.
 * @throws {Error} - Throws an error if neither '@nx/workspace' nor '@nrwl/workspace' is found in the package.json file.
 */
function isCompatibleVersion() {
  const packageJson = readRootPackageJson();
  let version =
    packageJson.dependencies?.['@nx/workspace'] ??
    packageJson.devDependencies?.['@nx/workspace'] ??
    packageJson.dependencies?.['@nrwl/workspace'] ??
    packageJson.devDependencies?.['@nrwl/workspace'];

  if (!version) {
    throw new Error(`You must install Nx to enable Storage Cache`);
  }

  if (version.startsWith('^') || version.startsWith('~')) {
    version = version.substr(1);
  }

  const [major] = version.split('.');
  const majorNumber = Number.parseInt(major, 10);

  if (isNaN(majorNumber)) {
    return false;
  }

  // eslint-disable-next-line no-magic-numbers
  if (majorNumber <= 15) {
    return true;
  }

  return false;
}

/**
 * Updates the nx.json file.
 *
 * This function adds the '@nx-aws-plugin/nx-aws-cache' task runner to the nx.json file.
 *
 * If the user has provided any AWS options, they are added to the task runner configuration.
 *
 * @param {Tree} tree - The Nx Tree object.
 * @param {InitGeneratorSchema} options - The options provided to the init generator.
 */
function updateNxJson(tree: Tree, options: InitGeneratorSchema): void {
  updateJson(tree, 'nx.json', (jsonContent) => {
    const currentOptions = jsonContent.tasksRunnerOptions?.default?.options;

    jsonContent.tasksRunnerOptions = {
      default: {
        runner: 'artifactory-cache',
        options: {
          ...currentOptions,
          ...(options.url ? { url: options.url } : {}),
          ...(options.authToken ? { authToken: options.authToken } : {}),
          ...(options.repoKey ? { repoKey: options.repoKey } : {}),
          ...(options.cachePath ? { cachePath: options.cachePath } : {}),
        },
      },
    };

    return jsonContent;
  });
}

/**
 * The init generator.
 *
 * This generator is used to add the '@nx-aws-plugin/nx-aws-cache' task runner to the nx.json file.
 *
 * If the user has provided any AWS options, they are added to the task runner configuration.
 *
 * @param {Tree} tree - The Nx Tree object.
 * @param {InitGeneratorSchema} options - The options provided to the init generator.
 */
// eslint-disable-next-line func-names
export default async function (tree: Tree, options: InitGeneratorSchema) {
  if (!isCompatibleVersion()) {
    logger.warn('This plugin requires Nx version 15 or lower. ');
  }

  updateNxJson(tree, options);

  await formatFiles(tree);
}
