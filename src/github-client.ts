import { BaseApiClient, Repository, PullRequest, Branch, Issue, Release, Commit, ApiConfig } from './api-client.js';

interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  description?: string;
  html_url: string;
  default_branch: string;
  private: boolean;
  created_at: string;
  updated_at: string;
  language?: string;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
}

interface GitHubPullRequest {
  id: number;
  number: number;
  title: string;
  body?: string;
  state: string;
  user: { login: string };
  head: { ref: string };
  base: { ref: string };
  created_at: string;
  updated_at: string;
  merged_at?: string;
  html_url: string;
  commits?: number;
  additions?: number;
  deletions?: number;
  changed_files?: number;
}

interface GitHubBranch {
  name: string;
  commit: {
    sha: string;
    commit: {
      message: string;
      author: { name: string; date: string };
    };
  };
  protected: boolean;
}

interface GitHubIssue {
  id: number;
  number: number;
  title: string;
  body?: string;
  state: string;
  user: { login: string };
  assignee?: { login: string };
  labels: { name: string }[];
  created_at: string;
  updated_at: string;
  closed_at?: string;
  html_url: string;
}

interface GitHubRelease {
  id: number;
  name: string;
  tag_name: string;
  body?: string;
  draft: boolean;
  prerelease: boolean;
  author: { login: string };
  created_at: string;
  published_at?: string;
  html_url: string;
  assets: {
    name: string;
    browser_download_url: string;
    size: number;
  }[];
}

interface GitHubCommit {
  sha: string;
  commit: {
    message: string;
    author: {
      name: string;
      email: string;
      date: string;
    };
  };
  html_url: string;
  stats?: {
    additions: number;
    deletions: number;
    total: number;
  };
}

export class GitHubApiClient extends BaseApiClient {
  constructor(config: Omit<ApiConfig, 'baseURL'> & { baseURL?: string }) {
    super({
      baseURL: config.baseURL || 'https://api.github.com',
      ...config,
    });
  }

  protected getAuthHeader(): string {
    return `Bearer ${this.config.token}`;
  }

  async getRepository(owner: string, repo: string): Promise<Repository> {
    const data = await this.makeRequest<GitHubRepository>('GET', `/repos/${owner}/${repo}`);
    
    return {
      id: data.id.toString(),
      name: data.name,
      fullName: data.full_name,
      description: data.description,
      url: data.html_url,
      defaultBranch: data.default_branch,
      isPrivate: data.private,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      language: data.language,
      stars: data.stargazers_count,
      forks: data.forks_count,
      openIssues: data.open_issues_count,
    };
  }

  async getBranches(owner: string, repo: string): Promise<Branch[]> {
    const data = await this.makeRequest<GitHubBranch[]>('GET', `/repos/${owner}/${repo}/branches`);
    const repoInfo = await this.getRepository(owner, repo);
    
    return data.map(branch => ({
      name: branch.name,
      commit: {
        sha: branch.commit.sha,
        message: branch.commit.commit.message,
        author: branch.commit.commit.author.name,
        date: new Date(branch.commit.commit.author.date),
      },
      protected: branch.protected || false,
      isDefault: branch.name === repoInfo.defaultBranch,
    }));
  }

  async getPullRequests(owner: string, repo: string, state: 'open' | 'closed' | 'all' = 'all'): Promise<PullRequest[]> {
    const data = await this.makeRequest<GitHubPullRequest[]>('GET', `/repos/${owner}/${repo}/pulls`, undefined, {
      params: { state, per_page: 100 },
    });
    
    return data.map(pr => ({
      id: pr.id.toString(),
      number: pr.number,
      title: pr.title,
      description: pr.body,
      state: pr.state === 'closed' && pr.merged_at ? 'merged' : pr.state as 'open' | 'closed',
      author: pr.user.login,
      sourceBranch: pr.head.ref,
      targetBranch: pr.base.ref,
      createdAt: new Date(pr.created_at),
      updatedAt: new Date(pr.updated_at),
      mergedAt: pr.merged_at ? new Date(pr.merged_at) : undefined,
      url: pr.html_url,
      commits: pr.commits,
      additions: pr.additions,
      deletions: pr.deletions,
      changedFiles: pr.changed_files,
    }));
  }

  async getPullRequest(owner: string, repo: string, number: number): Promise<PullRequest> {
    const data = await this.makeRequest<GitHubPullRequest>('GET', `/repos/${owner}/${repo}/pulls/${number}`);
    
    return {
      id: data.id.toString(),
      number: data.number,
      title: data.title,
      description: data.body,
      state: data.state === 'closed' && data.merged_at ? 'merged' : data.state as 'open' | 'closed',
      author: data.user.login,
      sourceBranch: data.head.ref,
      targetBranch: data.base.ref,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      mergedAt: data.merged_at ? new Date(data.merged_at) : undefined,
      url: data.html_url,
      commits: data.commits,
      additions: data.additions,
      deletions: data.deletions,
      changedFiles: data.changed_files,
    };
  }

  async getIssues(owner: string, repo: string, state: 'open' | 'closed' | 'all' = 'all'): Promise<Issue[]> {
    const data = await this.makeRequest<GitHubIssue[]>('GET', `/repos/${owner}/${repo}/issues`, undefined, {
      params: { state, per_page: 100 },
    });
    
    return data.map(issue => ({
      id: issue.id.toString(),
      number: issue.number,
      title: issue.title,
      description: issue.body,
      state: issue.state as 'open' | 'closed',
      author: issue.user.login,
      assignee: issue.assignee?.login,
      labels: issue.labels.map(label => label.name),
      createdAt: new Date(issue.created_at),
      updatedAt: new Date(issue.updated_at),
      closedAt: issue.closed_at ? new Date(issue.closed_at) : undefined,
      url: issue.html_url,
    }));
  }

  async getIssue(owner: string, repo: string, number: number): Promise<Issue> {
    const data = await this.makeRequest<GitHubIssue>('GET', `/repos/${owner}/${repo}/issues/${number}`);
    
    return {
      id: data.id.toString(),
      number: data.number,
      title: data.title,
      description: data.body,
      state: data.state as 'open' | 'closed',
      author: data.user.login,
      assignee: data.assignee?.login,
      labels: data.labels.map(label => label.name),
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      closedAt: data.closed_at ? new Date(data.closed_at) : undefined,
      url: data.html_url,
    };
  }

  async getReleases(owner: string, repo: string): Promise<Release[]> {
    const data = await this.makeRequest<GitHubRelease[]>('GET', `/repos/${owner}/${repo}/releases`);
    
    return data.map(release => ({
      id: release.id.toString(),
      name: release.name,
      tagName: release.tag_name,
      description: release.body,
      draft: release.draft,
      prerelease: release.prerelease,
      author: release.author.login,
      createdAt: new Date(release.created_at),
      publishedAt: release.published_at ? new Date(release.published_at) : undefined,
      url: release.html_url,
      assets: release.assets.map(asset => ({
        name: asset.name,
        downloadUrl: asset.browser_download_url,
        size: asset.size,
      })),
    }));
  }

  async getCommits(owner: string, repo: string, branch?: string, limit: number = 100): Promise<Commit[]> {
    const params: any = { per_page: Math.min(limit, 100) };
    if (branch) params.sha = branch;

    const data = await this.makeRequest<GitHubCommit[]>('GET', `/repos/${owner}/${repo}/commits`, undefined, {
      params,
    });
    
    return data.map(commit => ({
      sha: commit.sha,
      message: commit.commit.message,
      author: {
        name: commit.commit.author.name,
        email: commit.commit.author.email,
        date: new Date(commit.commit.author.date),
      },
      url: commit.html_url,
      additions: commit.stats?.additions,
      deletions: commit.stats?.deletions,
      changedFiles: commit.stats?.total,
    }));
  }

  async createPullRequest(owner: string, repo: string, data: {
    title: string;
    description?: string;
    sourceBranch: string;
    targetBranch: string;
  }): Promise<PullRequest> {
    const requestData = {
      title: data.title,
      body: data.description,
      head: data.sourceBranch,
      base: data.targetBranch,
    };

    const response = await this.makeRequest<GitHubPullRequest>('POST', `/repos/${owner}/${repo}/pulls`, requestData);
    
    return {
      id: response.id.toString(),
      number: response.number,
      title: response.title,
      description: response.body,
      state: response.state as 'open' | 'closed',
      author: response.user.login,
      sourceBranch: response.head.ref,
      targetBranch: response.base.ref,
      createdAt: new Date(response.created_at),
      updatedAt: new Date(response.updated_at),
      mergedAt: response.merged_at ? new Date(response.merged_at) : undefined,
      url: response.html_url,
    };
  }

  async createIssue(owner: string, repo: string, data: {
    title: string;
    description?: string;
    labels?: string[];
    assignee?: string;
  }): Promise<Issue> {
    const requestData: any = {
      title: data.title,
      body: data.description,
    };

    if (data.labels) requestData.labels = data.labels;
    if (data.assignee) requestData.assignee = data.assignee;

    const response = await this.makeRequest<GitHubIssue>('POST', `/repos/${owner}/${repo}/issues`, requestData);
    
    return {
      id: response.id.toString(),
      number: response.number,
      title: response.title,
      description: response.body,
      state: response.state as 'open' | 'closed',
      author: response.user.login,
      assignee: response.assignee?.login,
      labels: response.labels.map(label => label.name),
      createdAt: new Date(response.created_at),
      updatedAt: new Date(response.updated_at),
      closedAt: response.closed_at ? new Date(response.closed_at) : undefined,
      url: response.html_url,
    };
  }

  async createRelease(owner: string, repo: string, data: {
    tagName: string;
    name: string;
    description?: string;
    draft?: boolean;
    prerelease?: boolean;
  }): Promise<Release> {
    const requestData = {
      tag_name: data.tagName,
      name: data.name,
      body: data.description,
      draft: data.draft || false,
      prerelease: data.prerelease || false,
    };

    const response = await this.makeRequest<GitHubRelease>('POST', `/repos/${owner}/${repo}/releases`, requestData);
    
    return {
      id: response.id.toString(),
      name: response.name,
      tagName: response.tag_name,
      description: response.body,
      draft: response.draft,
      prerelease: response.prerelease,
      author: response.author.login,
      createdAt: new Date(response.created_at),
      publishedAt: response.published_at ? new Date(response.published_at) : undefined,
      url: response.html_url,
      assets: response.assets.map(asset => ({
        name: asset.name,
        downloadUrl: asset.browser_download_url,
        size: asset.size,
      })),
    };
  }
}