import { BaseApiClient, ApiConfig } from './api-client.js';
import { GitHubApiClient } from './github-client.js';
import { GitLabApiClient } from './gitlab-client.js';
import { BitbucketApiClient } from './bitbucket-client.js';

export type GitProvider = 'github' | 'gitlab' | 'bitbucket';

export interface ProviderConfig {
  provider: GitProvider;
  baseURL?: string;
  token?: string;
  username?: string;
  password?: string;
  ignoreCertificateErrors?: boolean;
  timeout?: number;
}

export interface ParsedRepoUrl {
  provider: GitProvider;
  owner: string;
  repo: string;
  baseURL?: string;
}

export class ApiManager {
  private clients: Map<string, BaseApiClient> = new Map();

  constructor() {}

  /**
   * Parse a Git repository URL and extract provider, owner, and repo information
   */
  parseRepositoryUrl(url: string): ParsedRepoUrl {
    // Remove .git suffix if present
    const cleanUrl = url.replace(/\.git$/, '');
    
    // Handle SSH URLs
    if (cleanUrl.includes('@')) {
      const sshMatch = cleanUrl.match(/git@([^:]+):(.+)/);
      if (sshMatch) {
        const [, host, path] = sshMatch;
        const [owner, repo] = path.split('/');
        return {
          provider: this.getProviderFromHost(host),
          owner,
          repo,
          baseURL: this.getApiBaseUrl(host),
        };
      }
    }

    // Handle HTTPS URLs
    const httpsMatch = cleanUrl.match(/https:\/\/([^\/]+)\/(.+)/);
    if (httpsMatch) {
      const [, host, path] = httpsMatch;
      const pathParts = path.split('/');
      
      // Handle GitLab subgroups (e.g., gitlab.com/group/subgroup/repo)
      if (pathParts.length >= 2) {
        const owner = pathParts.slice(0, -1).join('/');
        const repo = pathParts[pathParts.length - 1];
        
        return {
          provider: this.getProviderFromHost(host),
          owner,
          repo,
          baseURL: this.getApiBaseUrl(host),
        };
      }
    }

    throw new Error(`Unable to parse repository URL: ${url}`);
  }

  private getProviderFromHost(host: string): GitProvider {
    if (host.includes('github.com')) return 'github';
    if (host.includes('gitlab.com') || host.includes('gitlab')) return 'gitlab';
    if (host.includes('bitbucket.org') || host.includes('bitbucket')) return 'bitbucket';
    
    // Default to GitLab for self-hosted instances
    return 'gitlab';
  }

  private getApiBaseUrl(host: string): string {
    if (host.includes('github.com')) return 'https://api.github.com';
    if (host.includes('gitlab.com')) return 'https://gitlab.com/api/v4';
    if (host.includes('bitbucket.org')) return 'https://api.bitbucket.org/2.0';
    
    // For self-hosted instances, construct API URL
    const protocol = 'https';
    if (host.includes('gitlab')) {
      return `${protocol}://${host}/api/v4`;
    }
    
    // Default to GitLab API pattern for unknown hosts
    return `${protocol}://${host}/api/v4`;
  }

  /**
   * Configure a provider with authentication and settings
   */
  configureProvider(config: ProviderConfig): void {
    const clientKey = this.getClientKey(config.provider, config.baseURL);
    
    const apiConfig: ApiConfig = {
      baseURL: config.baseURL || this.getDefaultBaseUrl(config.provider),
      token: config.token,
      username: config.username,
      password: config.password,
      ignoreCertificateErrors: config.ignoreCertificateErrors,
      timeout: config.timeout,
    };

    let client: BaseApiClient;
    switch (config.provider) {
      case 'github':
        client = new GitHubApiClient(apiConfig);
        break;
      case 'gitlab':
        client = new GitLabApiClient(apiConfig);
        break;
      case 'bitbucket':
        client = new BitbucketApiClient(apiConfig);
        break;
      default:
        throw new Error(`Unsupported provider: ${config.provider}`);
    }

    this.clients.set(clientKey, client);
  }

  private getDefaultBaseUrl(provider: GitProvider): string {
    switch (provider) {
      case 'github': return 'https://api.github.com';
      case 'gitlab': return 'https://gitlab.com/api/v4';
      case 'bitbucket': return 'https://api.bitbucket.org/2.0';
    }
  }

  private getClientKey(provider: GitProvider, baseURL?: string): string {
    return `${provider}:${baseURL || this.getDefaultBaseUrl(provider)}`;
  }

  /**
   * Get a configured API client for a specific provider/URL combination
   */
  getClient(provider: GitProvider, baseURL?: string): BaseApiClient {
    const clientKey = this.getClientKey(provider, baseURL);
    const client = this.clients.get(clientKey);
    
    if (!client) {
      throw new Error(
        `No configured client for ${provider}${baseURL ? ` at ${baseURL}` : ''}. ` +
        'Use configureProvider() first.'
      );
    }
    
    return client;
  }

  /**
   * Get a client for a repository URL (auto-detects provider)
   */
  getClientForUrl(url: string): { client: BaseApiClient; parsed: ParsedRepoUrl } {
    const parsed = this.parseRepositoryUrl(url);
    const client = this.getClient(parsed.provider, parsed.baseURL);
    
    return { client, parsed };
  }

  /**
   * Check if a provider is configured
   */
  isProviderConfigured(provider: GitProvider, baseURL?: string): boolean {
    const clientKey = this.getClientKey(provider, baseURL);
    return this.clients.has(clientKey);
  }

  /**
   * Get list of configured providers
   */
  getConfiguredProviders(): Array<{ provider: GitProvider; baseURL: string }> {
    return Array.from(this.clients.keys()).map(key => {
      const [provider, baseURL] = key.split(':');
      return { provider: provider as GitProvider, baseURL };
    });
  }

  /**
   * Remove a configured provider
   */
  removeProvider(provider: GitProvider, baseURL?: string): void {
    const clientKey = this.getClientKey(provider, baseURL);
    this.clients.delete(clientKey);
  }

  /**
   * Clear all configured providers
   */
  clearProviders(): void {
    this.clients.clear();
  }
}