// eslint-disable-next-line import/named
import axios, { AxiosRequestConfig, isAxiosError } from 'axios';
import { createReadStream, createWriteStream } from 'fs';

/**
 * A wrapper for the Artifactory REST API.
 *
 * @see {@link https://jfrog.com/help/r/jfrog-rest-apis/artifactory-rest-apis}
 *
 * This class provides methods to interact with Artifactory, including uploading and downloading files.
 *
 * @example
 * const api = new ArtifactoryAPI('https://my-artifactory-instance.com', 'my-access-token');
 * await api.uploadFile('./local/path/my-artifact.tar.gz', 'my-repo/my-artifact.tar.gz');
 * await api.downloadFile('my-repo/my-artifact.tar.gz', './local/path/my-artifact.tar.gz');
 */
export class ArtifactoryAPI {
  private baseUrl: string;
  private accessToken: string;

  /**
   * Creates a new instance of ArtifactoryAPI.
   *
   * @param {string} baseUrl - The base URL of the Artifactory instance.
   * @param {string} accessToken - The access token to use for authentication.
   *
   * @example
   * const api = new ArtifactoryAPI('https://my-artifactory-instance.jfrog.io/artifactory', 'my-access-token');
   */
  constructor(baseUrl: string, accessToken: string) {
    this.baseUrl = baseUrl;
    this.accessToken = accessToken;
  }

  private getRequestConfig(): AxiosRequestConfig {
    return {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
    };
  }

  /**
   * Uploads a file to Artifactory.
   * https://jfrog.com/help/r/jfrog-rest-apis/deploy-artifact-apis
   *
   * @param {string} filePath - The path of the file to upload.
   * @param {string} targetPath - The path where the file should be uploaded to in Artifactory.
   *
   * @example
   * await api.uploadFile('./local/path/my-artifact.tar.gz', 'my-repo/my-artifact.tar.gz');
   */
  async uploadFile(filePath: string, targetPath: string): Promise<void> {
    const url = `${this.baseUrl}/${targetPath}`;
    const fileStream = createReadStream(filePath);

    await axios.put(url, fileStream, this.getRequestConfig()).catch((error) => {
      throw new Error(`Error uploading file - ${error}`);
    });
  }

  /**
   * Downloads a file from Artifactory.
   * https://jfrog.com/help/r/jfrog-rest-apis/retrieve-artifact
   *
   * @param {string} artifactPath - The path of the artifact in Artifactory.
   * @param {string} localPath - The local path where the file should be downloaded.
   * @returns {Promise<void>} A promise that resolves when the download is complete.
   *
   * @example
   * await api.downloadFile('my-repo/my-artifact.tar.gz', './local/path/my-artifact.tar.gz');
   */
  async downloadFile(artifactPath: string, localPath: string): Promise<void> {
    const url = `${this.baseUrl}/${artifactPath}?[skipUpdateStats=true]`;

    const response = await axios
      .get(url, { ...this.getRequestConfig(), responseType: 'stream' })
      .catch((error) => {
        throw new Error(`Error downloading file - ${error}`);
      });

    const writer = createWriteStream(localPath);
    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });
  }

  /**
   * Checks if a file exists in Artifactory.
   * https://jfrog.com/help/r/jfrog-rest-apis/get-file-info
   *
   * @param {string} filePath - The path of the file to check.
   * @returns {Promise<boolean>} A promise that resolves with a boolean indicating whether the file exists.
   *
   * @example
   * const exists = await api.fileExists('my-repo/my-artifact.tar.gz');
   * console.log(`File exists: ${exists}`);
   */
  async fileExists(filePath: string): Promise<boolean> {
    const url = `${this.baseUrl}/${filePath}`;

    try {
      await axios.head(url, this.getRequestConfig());
      return true;
    } catch (error) {
      if (!isAxiosError(error)) {
        throw error;
      }
      // eslint-disable-next-line no-magic-numbers
      if (error.response && error.response.status === 404) {
        return false;
      }

      throw error;
    }
  }
}
