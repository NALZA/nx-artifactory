import { ensureDirSync } from 'fs-extra';
import {
  cleanup,
  patchPackageJsonForPlugin,
  readJson,
  runCommandAsync,
  tmpProjPath,
} from '@nrwl/nx-plugin/testing';
import { execSync } from 'child_process';
import { dirname } from 'node:path';
import { getPackageManagerCommand } from '@nrwl/devkit';

function runNxNewCommand() {
  const localTmpDir = dirname(tmpProjPath());

  return execSync(
    `npx nx new proj --nx-workspace-root=${localTmpDir} --no-interactive --skip-install --collection=@nx/workspace --npmScope=proj --preset=empty`,
    {
      cwd: localTmpDir,
    },
  );
}

function runPackageManagerInstall(silent: boolean = true) {
  const pmc = getPackageManagerCommand('npm');
  const install = execSync(pmc.install, {
    cwd: tmpProjPath(),
    ...(silent ? { stdio: ['ignore', 'ignore', 'ignore'] } : {}),
  });

  return install ? install.toString() : '';
}

describe('aws-cache e2e', () => {
  beforeAll(() => {
    ensureDirSync(tmpProjPath());
    cleanup();
    runNxNewCommand();
    patchPackageJsonForPlugin('nx-artifactory', 'nx-artifactory');
    runPackageManagerInstall();
  });

  afterAll(() => {
    runCommandAsync('npx nx reset');
  });

  it('should init nx-aws-cache', async () => {
    await runCommandAsync(
      `npx nx generate nx-artifactory:init --url=https://www.test/artifactory.com --authToken=1234567890 --repoKey=repoKey`,
    );

    const nxJson = readJson('nx.json');
    expect(nxJson.tasksRunnerOptions.default.runner).toEqual('nx-artifactory');
  }, 120000);
});
