import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import https from 'https';

export interface ApiConfig {
  baseURL: string;
  token?: string;
  username?: string;
  password?: string;
  ignoreCertificateErrors?: boolean;
  timeout?: number;
}

export interface Repository {
  id: string;
  name: string;
  fullName: string;
  description?: string;
  url: string;
  defaultBranch: string;
  isPrivate: boolean;
  createdAt: Date;
  updatedAt: Date;
  language?: string;
  stars?: number;
  forks?: number;
  openIssues?: number;
}

export interface PullRequest {
  id: string;
  number: number;
  title: string;
  description?: string;
  state: 'open' | 'closed' | 'merged';
  author: string;
  sourceBranch: string;
  targetBranch: string;
  createdAt: Date;
  updatedAt: Date;
  mergedAt?: Date;
  url: string;
  commits?: number;
  additions?: number;
  deletions?: number;
  changedFiles?: number;
}

export interface Branch {
  name: string;
  commit: {
    sha: string;
    message: string;
    author: string;
    date: Date;
  };
  protected: boolean;
  isDefault: boolean;
}

export interface Issue {
  id: string;
  number: number;
  title: string;
  description?: string;
  state: 'open' | 'closed';
  author: string;
  assignee?: string;
  labels: string[];
  createdAt: Date;
  updatedAt: Date;
  closedAt?: Date;
  url: string;
}

export interface Release {
  id: string;
  name: string;
  tagName: string;
  description?: string;
  draft: boolean;
  prerelease: boolean;
  author: string;
  createdAt: Date;
  publishedAt?: Date;
  url: string;
  assets?: {
    name: string;
    downloadUrl: string;
    size: number;
  }[];
}

export interface Commit {
  sha: string;
  message: string;
  author: {
    name: string;
    email: string;
    date: Date;
  };
  url: string;
  additions?: number;
  deletions?: number;
  changedFiles?: number;
}

export abstract class BaseApiClient {
  protected client: AxiosInstance;
  protected config: ApiConfig;

  constructor(config: ApiConfig) {
    this.config = config;
    this.client = this.createClient();
  }

  private createClient(): AxiosInstance {
    const axiosConfig: AxiosRequestConfig = {
      baseURL: this.config.baseURL,
      timeout: this.config.timeout || 30000,
      headers: {
        'User-Agent': 'git-history-mcp-server/1.0.0',
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    };

    // Handle certificate errors if requested
    if (this.config.ignoreCertificateErrors) {
      axiosConfig.httpsAgent = new https.Agent({
        rejectUnauthorized: false,
      });
    }

    // Set up authentication
    if (this.config.token) {
      axiosConfig.headers!['Authorization'] = this.getAuthHeader();
    } else if (this.config.username && this.config.password) {
      axiosConfig.auth = {
        username: this.config.username,
        password: this.config.password,
      };
    }

    return axios.create(axiosConfig);
  }

  protected abstract getAuthHeader(): string;

  protected async makeRequest<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
    endpoint: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<T> {
    try {
      const response: AxiosResponse<T> = await this.client.request({
        method,
        url: endpoint,
        data,
        ...config,
      });
      return response.data;
    } catch (error: any) {
      if (error.response) {
        const status = error.response.status;
        const message = error.response.data?.message || error.response.statusText;
        throw new Error(`API Error ${status}: ${message}`);
      } else if (error.request) {
        throw new Error(`Network Error: ${error.message}`);
      } else {
        throw new Error(`Request Error: ${error.message}`);
      }
    }
  }

  // Abstract methods that each API client must implement
  abstract getRepository(owner: string, repo: string): Promise<Repository>;
  abstract getBranches(owner: string, repo: string): Promise<Branch[]>;
  abstract getPullRequests(owner: string, repo: string, state?: 'open' | 'closed' | 'all'): Promise<PullRequest[]>;
  abstract getPullRequest(owner: string, repo: string, number: number): Promise<PullRequest>;
  abstract getIssues(owner: string, repo: string, state?: 'open' | 'closed' | 'all'): Promise<Issue[]>;
  abstract getIssue(owner: string, repo: string, number: number): Promise<Issue>;
  abstract getReleases(owner: string, repo: string): Promise<Release[]>;
  abstract getCommits(owner: string, repo: string, branch?: string, limit?: number): Promise<Commit[]>;
  abstract createPullRequest(owner: string, repo: string, data: {
    title: string;
    description?: string;
    sourceBranch: string;
    targetBranch: string;
  }): Promise<PullRequest>;
  abstract createIssue(owner: string, repo: string, data: {
    title: string;
    description?: string;
    labels?: string[];
    assignee?: string;
  }): Promise<Issue>;
  abstract createRelease(owner: string, repo: string, data: {
    tagName: string;
    name: string;
    description?: string;
    draft?: boolean;
    prerelease?: boolean;
  }): Promise<Release>;
}