import {IncomingMessage} from 'node:http';
import https from 'node:https';

import Logger from './logger.js';

/**
 * Download options for GitHub content
 */
export interface DownloadOptions {
  /**
   * GitHub Personal Access Token for private repositories
   */
  token?: string;

  /**
   * Whether the resource is from a private repository
   */
  isPrivate?: boolean;

  /**
   * Maximum number of redirects to follow (default: 5)
   */
  maxRedirects?: number;

  /**
   * Request timeout in milliseconds (default: 30000)
   */
  timeout?: number;
}

/**
 * Download result
 */
export interface DownloadResult {
  /**
   * Downloaded content
   */
  content: string;

  /**
   * HTTP status code
   */
  statusCode: number;

  /**
   * Final URL after redirects
   */
  finalUrl: string;
}

/**
 * GitHub download utility class
 * Handles downloading content from GitHub with authentication support
 */
class DownloadGithub {
  private logger: Logger;
  private token?: string;

  /**
   * Create a new DownloadGithub instance
   * @param token - GitHub Personal Access Token
   */
  constructor(token?: string) {
    this.token = token;
    this.logger = new Logger('github-download');
  }

  /**
   * Set the GitHub token
   * @param token - GitHub Personal Access Token
   */
  setToken(token: string): void {
    this.token = token;
  }

  /**
   * Download content from a URL
   * @param url - URL to download from
   * @param options - Download options
   * @returns Download result with content and metadata
   * @throws Error if download fails or token is required but not provided
   */
  async download(url: string, options: DownloadOptions = {}): Promise<DownloadResult> {
    const {token = this.token, isPrivate = false, maxRedirects = 5, timeout = 30_000} = options;

    // Validate token for private repositories
    if (isPrivate && !token) {
      throw new Error('GitHub token is required for private repositories');
    }

    this.logger.debug(`Downloading from ${url}`, {isPrivate, maxRedirects});

    return this._downloadRecursive(url, token, isPrivate, maxRedirects, 0, timeout);
  }

  /**
   * Internal recursive download method to handle redirects
   * @param url - URL to download from
   * @param token - GitHub token
   * @param isPrivate - Whether resource is private
   * @param maxRedirects - Maximum redirects allowed
   * @param redirectCount - Current redirect count
   * @param timeout - Request timeout
   * @returns Download result
   */
  // eslint-disable-next-line max-params
  private async _downloadRecursive(
    url: string,
    token: string | undefined,
    isPrivate: boolean,
    maxRedirects: number,
    redirectCount: number,
    timeout: number,
  ): Promise<DownloadResult> {
    if (redirectCount >= maxRedirects) {
      throw new Error(`Too many redirects (max: ${maxRedirects})`);
    }

    return new Promise<DownloadResult>((resolve, reject) => {
      const urlObj = new URL(url);
      const headers: Record<string, string> = {};

      // Add authentication headers for private repos
      if (isPrivate && token) {
        headers.Authorization = `token ${token}`;
        headers['User-Agent'] = 'Node.js-DownloadGithub';
      }

      const options: https.RequestOptions = {
        hostname: urlObj.hostname,
        path: urlObj.pathname + urlObj.search,
        method: 'GET',
        headers,
        timeout,
      };

      const request = https.get(options, (res: IncomingMessage) => {
        // Handle redirects
        if (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307 || res.statusCode === 308) {
          const redirectUrl = res.headers.location;
          if (!redirectUrl) {
            reject(new Error(`Redirect without location header (${res.statusCode})`));
            return;
          }

          this.logger.debug(`Following redirect to ${redirectUrl}`, {
            statusCode: res.statusCode,
            redirectCount: redirectCount + 1,
          });

          // Consume the response to close the connection properly
          res.resume();

          this._downloadRecursive(redirectUrl, token, isPrivate, maxRedirects, redirectCount + 1, timeout)
            .then(resolve)
            .catch(reject);
          return;
        }

        // Handle errors
        if (res.statusCode !== 200) {
          // Consume the response to close the connection properly
          res.resume();
          reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage} for ${url}`));
          return;
        }

        let data = '';

        res.on('data', (chunk: Buffer) => {
          data += chunk.toString('utf8');
        });

        res.on('end', () => {
          this.logger.debug(`Downloaded ${data.length} bytes from ${url}`);
          resolve({
            content: data,
            statusCode: res.statusCode!,
            finalUrl: url,
          });
        });

        res.on('error', (err: Error) => {
          reject(new Error(`Response error: ${err.message}`));
        });
      });

      request.on('error', (err: Error) => {
        reject(new Error(`Request error: ${err.message}`));
      });

      request.on('timeout', () => {
        request.destroy();
        reject(new Error(`Request timeout after ${timeout}ms`));
      });

      // Explicitly end the request
      request.end();
    });
  }

  /**
   * Download content from multiple URLs in parallel
   * @param urls - Array of URLs to download
   * @param options - Download options (applied to all URLs)
   * @returns Array of download results (same order as input)
   */
  async downloadMultiple(urls: string[], options: DownloadOptions = {}): Promise<DownloadResult[]> {
    this.logger.info(`Downloading ${urls.length} resources in parallel`);

    const promises = urls.map((url) => this.download(url, options));
    return Promise.all(promises);
  }

  /**
   * Check if a URL is accessible (HEAD request)
   * @param url - URL to check
   * @param options - Download options
   * @returns True if accessible (200 OK), false otherwise
   */
  async isAccessible(url: string, options: DownloadOptions = {}): Promise<boolean> {
    const {token = this.token, isPrivate = false, timeout = 10_000} = options;

    try {
      const urlObj = new URL(url);
      const headers: Record<string, string> = {};

      if (isPrivate && token) {
        headers.Authorization = `token ${token}`;
        headers['User-Agent'] = 'Node.js-DownloadGithub';
      }

      const requestOptions: https.RequestOptions = {
        hostname: urlObj.hostname,
        path: urlObj.pathname + urlObj.search,
        method: 'HEAD',
        headers,
        timeout,
      };

      return new Promise<boolean>((resolve) => {
        const request = https.request(requestOptions, (res: IncomingMessage) => {
          resolve(res.statusCode === 200);
        });

        request.on('error', () => {
          resolve(false);
        });

        request.on('timeout', () => {
          request.destroy();
          resolve(false);
        });

        request.end();
      });
    } catch {
      return false;
    }
  }
}

export default DownloadGithub;
