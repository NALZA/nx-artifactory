import { writeFile } from 'fs';
import { join, dirname } from 'path';
import { promisify } from 'util';

import { RemoteCache } from '@nx/workspace/src/tasks-runner/default-tasks-runner';
import { create, extract } from 'tar';

import { ArtifactoryNxCacheOptions } from './models/artifactory-nx-cache-options.model';
import { Logger } from './logger';
import { MessageReporter } from './message-reporter';

import { ArtifactoryAPI } from './artifactory-api';

export class ArtifactoryCache implements RemoteCache {
  private readonly logger = new Logger();
  private readonly uploadQueue: Array<Promise<boolean>> = [];
  private readonly api: ArtifactoryAPI;
  private readonly url: string;
  private readonly repoKey: string;
  private readonly basicHttpAuth: string;

  public constructor(options: ArtifactoryNxCacheOptions, private messages: MessageReporter) {
    this.url = options.url;
    this.repoKey = options.repoKey;

    if (options.basicHttpAuth) {
      this.basicHttpAuth = options.basicHttpAuth;
    } else {
      // Get the env var ARTIFACTORY_ACCESS_TOKEN
      this.basicHttpAuth = process.env.ARTIFACTORY_ACCESS_TOKEN || '';
    }

    this.api = new ArtifactoryAPI(this.url, this.basicHttpAuth);
  }

  public checkConfig(options: ArtifactoryNxCacheOptions): void {
    const missingOptions: Array<string> = [];

    if (!options.url) {
      missingOptions.push('NXCACHE_ARTIFACTORY_URL | url');
    }

    if (!options.repoKey) {
      missingOptions.push('NXCACHE_ARTIFACTORY_REPO_KEY | repoKey');
    }

    if (missingOptions.length > 0) {
      throw new Error(`Missing Artifactory options: \n\n${missingOptions.join('\n')}`);
    }
  }

  public async retrieve(hash: string, cacheDirectory: string): Promise<boolean> {
    try {
      this.logger.debug(`Storage Cache: Downloading ${hash}`);

      const tgzFilePath: string = this.getTgzFilePath(hash, cacheDirectory);

      if (!(await this.checkIfCacheExists(hash))) {
        this.logger.debug(`Storage Cache: Cache miss ${hash}`);

        return false;
      }

      await this.downloadFile(hash, tgzFilePath);
      await this.extractTgzFile(tgzFilePath, cacheDirectory);
      await this.createCommitFile(hash, cacheDirectory);

      this.logger.debug(`Storage Cache: Cache hit ${hash}`);

      return true;
    } catch (err) {
      this.messages.error = err as Error;

      this.logger.debug(`Storage Cache: Cache error ${(err as Error).message}`);

      return false;
    }
  }

  public store(hash: string, cacheDirectory: string): Promise<boolean> {
    if (this.messages.error) {
      this.logger.debug(`Storage Cache: Store error ${this.messages.error}`);
      return Promise.resolve(false);
    }

    const resultPromise = this.createAndUploadFile(hash, cacheDirectory);

    this.uploadQueue.push(resultPromise);

    return resultPromise;
  }

  public async waitForStoreRequestsToComplete(): Promise<void> {
    await Promise.all(this.uploadQueue);
  }

  private async createAndUploadFile(hash: string, cacheDirectory: string): Promise<boolean> {
    try {
      const tgzFilePath = this.getTgzFilePath(hash, cacheDirectory);

      await this.createTgzFile(tgzFilePath, hash, cacheDirectory);
      await this.uploadFile(hash, tgzFilePath);

      return true;
    } catch (err) {
      this.messages.error = err as Error;
      this.logger.debug(`Storage Cache: Store error ${(err as Error).message}`);
      return false;
    }
  }

  private async createTgzFile(
    tgzFilePath: string,
    hash: string,
    cacheDirectory: string,
  ): Promise<void> {
    try {
      await create(
        {
          gzip: true,
          file: tgzFilePath,
          cwd: cacheDirectory,
          filter: (path: string) => this.filterTgzContent(path),
        },
        [hash],
      );
    } catch (err) {
      throw new Error(`Error creating tar.gz file - ${err}`);
    }
  }

  private async extractTgzFile(tgzFilePath: string, cacheDirectory: string): Promise<void> {
    try {
      await extract({
        file: tgzFilePath,
        cwd: cacheDirectory,
        filter: (path: string) => this.filterTgzContent(path),
      });
    } catch (err) {
      throw new Error(`Error extracting tar.gz file - ${err}`);
    }
  }

  private async uploadFile(hash: string, tgzFilePath: string): Promise<void> {
    const tgzFileName = this.getTgzFileName(hash);
    try {
      this.logger.debug(
        `Storage Cache: Uploading ${tgzFilePath} to ${this.repoKey}/${tgzFileName}`,
      );

      await this.api.uploadFile(tgzFilePath, `${this.repoKey}/${tgzFileName}`);

      this.logger.debug(`Storage Cache: Stored ${hash}`);
    } catch (err) {
      throw new Error(`Storage Cache: Upload error - ${err}`);
    }
  }

  private async downloadFile(hash: string, tgzFilePath: string): Promise<void> {
    try {
      this.logger.debug(`Storage Cache: Downloading ${hash}`);

      await this.api.downloadFile(this.repoKey, tgzFilePath);

      this.logger.debug(`Storage Cache: Downloaded ${hash}`);
    } catch (err) {
      throw new Error(`Storage Cache: Download error - ${err}`);
    }
  }

  private async checkIfCacheExists(hash: string): Promise<boolean> {
    try {
      const tgzFileName = this.getTgzFileName(hash);

      return await this.api.fileExists(`${this.repoKey}/${tgzFileName}`);
    } catch (err) {
      throw new Error(`Storage Cache: Check cache error - ${err}`);
    }
  }

  private async createCommitFile(hash: string, cacheDirectory: string): Promise<void> {
    const writeFileAsync = promisify(writeFile);

    await writeFileAsync(join(cacheDirectory, this.getCommitFileName(hash)), 'true');
  }

  private getTgzFileName(hash: string): string {
    return `${hash}.tar.gz`;
  }

  private getTgzFilePath(hash: string, cacheDirectory: string): string {
    return join(cacheDirectory, this.getTgzFileName(hash));
  }

  private getCommitFileName(hash: string): string {
    return `${hash}.commit`;
  }

  private filterTgzContent(filePath: string): boolean {
    const dir = dirname(filePath);

    const excludedPaths = [
      /**
       * The 'source' file is used by NX for integrity check purposes, but isn't utilized by custom cache providers.
       * Excluding it from the tarball saves space and avoids potential NX cache integrity issues.
       * See: https://github.com/bojanbass/nx-aws/issues/368 and https://github.com/nrwl/nx/issues/19159 for more context.
       */
      join(dir, 'source'),
    ];

    return !excludedPaths.includes(filePath);
  }
}
