/* eslint-disable max-lines-per-function */
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { Tree, readJson } from '@nx/devkit';

import generator from './generator';
import { InitGeneratorSchema } from './schema';

describe('init generator', () => {
  let appTree: Tree;
  const options: InitGeneratorSchema = {
    url: 'https://artifactory-url.com/artifactory',
    authToken: '111aaa3333',
    repoKey: 'nx',
  };

  beforeEach(() => {
    appTree = createTreeWithEmptyWorkspace();

    const nxJson = readJson(appTree, 'nx.json');
    nxJson.tasksRunnerOptions = {
      default: {
        runner: 'nx/tasks-runners/default',
        options: {},
      },
    };
    appTree.write('nx.json', JSON.stringify(nxJson));
  });

  it('should add @nx-aws-plugin/nx-aws-cache to nx.json', () => {
    let nxJson = readJson(appTree, 'nx.json');
    expect(nxJson.tasksRunnerOptions.default.runner).toBe('nx/tasks-runners/default');

    generator(appTree, options);

    nxJson = readJson(appTree, 'nx.json');

    expect(nxJson.tasksRunnerOptions.default.runner).toBe('artifactory-cache');
    expect(nxJson.tasksRunnerOptions.default.options.url).toBe(
      'https://artifactory-url.com/artifactory',
    );
    expect(nxJson.tasksRunnerOptions.default.options.authToken).toBe('111aaa3333');
    expect(nxJson.tasksRunnerOptions.default.options.repoKey).toBe('nx');
  });

  it('should add @nx-aws-plugin/nx-aws-cache with no aws options to nx.json', () => {
    let nxJson = readJson(appTree, 'nx.json');

    expect(nxJson.tasksRunnerOptions.default.runner).toBe('nx/tasks-runners/default');

    generator(appTree, {});

    nxJson = readJson(appTree, 'nx.json');

    expect(nxJson.tasksRunnerOptions.default.runner).toBe('artifactory-cache');
    expect(nxJson.tasksRunnerOptions.default.options.url).toBeUndefined();
    expect(nxJson.tasksRunnerOptions.default.options.authToken).toBeUndefined();
    expect(nxJson.tasksRunnerOptions.default.options.repoKey).toBeUndefined();
  });
});
