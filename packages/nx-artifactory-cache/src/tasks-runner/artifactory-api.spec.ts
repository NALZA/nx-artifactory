/* eslint-disable no-magic-numbers */
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { ArtifactoryAPI } from './artifactory-api';

// eslint-disable-next-line max-lines-per-function
describe('ArtifactoryAPI', () => {
  let api: ArtifactoryAPI;
  let mock: MockAdapter;

  beforeEach(() => {
    api = new ArtifactoryAPI('https://my-artifactory-instance.com', 'my-access-token');
    mock = new MockAdapter(axios);
  });

  afterEach(() => {
    mock.reset();
  });

  describe('fileExists', () => {
    it('should return true if the file exists', async () => {
      mock.onHead('https://my-artifactory-instance.com/my-file').reply(200);

      const result = await api.fileExists('my-file');

      expect(result).toBe(true);
    });

    it('should return false if the file does not exist', async () => {
      mock.onHead('https://my-artifactory-instance.com/my-file').reply(404);

      const result = await api.fileExists('my-file');

      expect(result).toBe(false);
    });

    it('should throw an error if the request fails with a status other than 404', async () => {
      mock.onHead('https://my-artifactory-instance.com/my-file').reply(500);

      await expect(api.fileExists('my-file')).rejects.toThrow();
    });
  });

  describe('downloadFile', () => {
    it('should throw an error if the request fails', async () => {
      mock.onGet('https://my-artifactory-instance.com/my-file').reply(500);

      await expect(api.downloadFile('my-file', './local/path/my-file')).rejects.toThrow();
    });
  });

  describe('uploadFile', () => {
    it('should upload the file', async () => {
      mock.onPut('https://my-artifactory-instance.com/my-file').reply(200);

      await api.uploadFile('./my-file', 'my-file');

      expect(mock.history.put).toHaveLength(1);
    });

    it('should throw an error if the request fails', async () => {
      mock.onPut('https://my-artifactory-instance.com/my-file').reply(500);

      await expect(api.uploadFile('./my-file', 'my-file')).rejects.toThrow();
    });
  });
});
