import { config as dotEnvConfig } from 'dotenv';

['.local.env', '.env.local', '.env'].forEach((file) => {
  dotEnvConfig({
    path: file,
  });
});

import { TaskStatus } from '@nx/workspace/src/tasks-runner/tasks-runner';
import { defaultTasksRunner } from '@nx/devkit';

import { Logger } from './logger';
import { MessageReporter } from './message-reporter';

import { ArtifactoryCache } from './artifactory-cache';
import { ArtifactoryNxCacheOptions } from './models/artifactory-nx-cache-options.model';

function getOptions(options: ArtifactoryNxCacheOptions) {
  return {
    url: process.env.NXCACHE_ARTIFACTORY_URL ?? options.url,
    repoKey: process.env.NXCACHE_ARTIFACTORY_REPO_KEY ?? options.repoKey,
    authToken: process.env.NXCACHE_ARTIFACTORY_BASIC_HTTP_AUTH ?? options.authToken,
    skipNxCache: process.env.NXCACHE_SKIP_NX_CACHE
      ? process.env.NXCACHE_SKIP_NX_CACHE === 'true'
      : options.skipNxCache,
  };
}

// eslint-disable-next-line max-lines-per-function
export const tasksRunner = (
  tasks: Parameters<typeof defaultTasksRunner>[0],
  options: Parameters<typeof defaultTasksRunner>[1] & ArtifactoryNxCacheOptions,
  // eslint-disable-next-line no-magic-numbers
  context: Parameters<typeof defaultTasksRunner>[2],
) => {
  const artifactoryOptions: ArtifactoryNxCacheOptions = getOptions(options);
  const logger = new Logger();

  try {
    if (process.env.NXCACHE_ARTIFACTORY_DISABLE === 'true') {
      if (!options.skipNxCache) {
        logger.note('USING LOCAL CACHE (NXCACHE_ARTIFACTORY_DISABLE is set to true)');
      }

      return defaultTasksRunner(tasks, options, context);
    }

    if (!options.skipNxCache) {
      logger.note('USING REMOTE CACHE');
    }

    const messages = new MessageReporter(logger);
    const remoteCache = new ArtifactoryCache(artifactoryOptions, messages);

    const runner: Promise<{ [id: string]: TaskStatus }> = defaultTasksRunner(
      tasks,
      {
        ...options,
        remoteCache,
      },
      context,
    ) as Promise<{ [id: string]: TaskStatus }>;

    runner.finally(async () => {
      await remoteCache.waitForStoreRequestsToComplete();
      messages.printMessages();
    });

    return runner;
  } catch (err) {
    logger.warn((err as Error).message);
    logger.note('USING LOCAL CACHE');

    return defaultTasksRunner(tasks, options, context);
  }
};

export default tasksRunner;
