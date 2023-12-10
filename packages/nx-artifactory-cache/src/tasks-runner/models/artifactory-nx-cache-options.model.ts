export interface ArtifactoryNxCacheOptions {
  url: string;
  authToken: string;
  repoKey: string;
  cachePath?: string;
  skipNxCache?: boolean;
}
