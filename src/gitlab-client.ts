import { BaseApiClient, Repository, PullRequest, Branch, Issue, Release, Commit, ApiConfig } from './api-client.js';

interface GitLabProject {
  id: number;
  name: string;
  path_with_namespace: string;
  description?: string;
  web_url: string;
  default_branch: string;
  visibility: string;
  created_at: string;
  last_activity_at: string;
  star_count: number;
  forks_count: number;
  open_issues_count: number;
}

interface GitLabMergeRequest {
  id: number;
  iid: number;
  title: string;
  description?: string;
  state: string;
  author: { username: string };
  source_branch: string;
  target_branch: string;
  created_at: string;
  updated_at: string;
  merged_at?: string;
  web_url: string;
  merge_commit_sha?: string;
  changes_count?: string;
}

interface GitLabBranch {
  name: string;
  commit: {
    id: string;
    message: string;
    author_name: string;
    authored_date: string;
  };
  protected: boolean;
  default: boolean;
}

interface GitLabIssue {
  id: number;
  iid: number;
  title: string;
  description?: string;
  state: string;
  author: { username: string };
  assignee?: { username: string };
  labels: string[];
  created_at: string;
  updated_at: string;
  closed_at?: string;
  web_url: string;
}

interface GitLabRelease {
  name: string;
  tag_name: string;
  description?: string;
  author: { username: string };
  created_at: string;
  released_at: string;
  upcoming_release: boolean;
  _links: {
    self: string;
  };
  assets: {
    links: {
      name: string;
      url: string;
    }[];
  };
}

interface GitLabCommit {
  id: string;
  message: string;
  author_name: string;
  author_email: string;
  authored_date: string;
  web_url: string;
  stats?: {
    additions: number;
    deletions: number;
    total: number;
  };
}

export class GitLabApiClient extends BaseApiClient {
  constructor(config: Omit<ApiConfig, 'baseURL'> & { baseURL?: string }) {
    super({
      baseURL: config.baseURL || 'https://gitlab.com/api/v4',
      ...config,
    });
  }

  protected getAuthHeader(): string {
    return `Bearer ${this.config.token}`;
  }

  private encodeProjectPath(path: string): string {
    return encodeURIComponent(path);
  }

  async getRepository(owner: string, repo: string): Promise<Repository> {
    const projectPath = `${owner}/${repo}`;
    const data = await this.makeRequest<GitLabProject>('GET', `/projects/${this.encodeProjectPath(projectPath)}`);
    
    return {
      id: data.id.toString(),
      name: data.name,
      fullName: data.path_with_namespace,
      description: data.description,
      url: data.web_url,
      defaultBranch: data.default_branch,
      isPrivate: data.visibility === 'private',
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.last_activity_at),
      stars: data.star_count,
      forks: data.forks_count,
      openIssues: data.open_issues_count,
    };
  }

  async getBranches(owner: string, repo: string): Promise<Branch[]> {
    const projectPath = `${owner}/${repo}`;
    const data = await this.makeRequest<GitLabBranch[]>('GET', `/projects/${this.encodeProjectPath(projectPath)}/repository/branches`);
    
    return data.map(branch => ({
      name: branch.name,
      commit: {
        sha: branch.commit.id,
        message: branch.commit.message,
        author: branch.commit.author_name,
        date: new Date(branch.commit.authored_date),
      },
      protected: branch.protected,
      isDefault: branch.default,
    }));
  }

  async getPullRequests(owner: string, repo: string, state: 'open' | 'closed' | 'all' = 'all'): Promise<PullRequest[]> {
    const projectPath = `${owner}/${repo}`;
    const params: any = { per_page: 100 };
    if (state !== 'all') params.state = state === 'open' ? 'opened' : 'closed';

    const data = await this.makeRequest<GitLabMergeRequest[]>('GET', `/projects/${this.encodeProjectPath(projectPath)}/merge_requests`, undefined, {
      params,
    });
    
    return data.map(mr => ({
      id: mr.id.toString(),
      number: mr.iid,
      title: mr.title,
      description: mr.description,
      state: mr.state === 'merged' ? 'merged' : mr.state === 'opened' ? 'open' : 'closed',
      author: mr.author.username,
      sourceBranch: mr.source_branch,
      targetBranch: mr.target_branch,
      createdAt: new Date(mr.created_at),
      updatedAt: new Date(mr.updated_at),
      mergedAt: mr.merged_at ? new Date(mr.merged_at) : undefined,
      url: mr.web_url,
    }));
  }

  async getPullRequest(owner: string, repo: string, number: number): Promise<PullRequest> {
    const projectPath = `${owner}/${repo}`;
    const data = await this.makeRequest<GitLabMergeRequest>('GET', `/projects/${this.encodeProjectPath(projectPath)}/merge_requests/${number}`);
    
    return {
      id: data.id.toString(),
      number: data.iid,
      title: data.title,
      description: data.description,
      state: data.state === 'merged' ? 'merged' : data.state === 'opened' ? 'open' : 'closed',
      author: data.author.username,
      sourceBranch: data.source_branch,
      targetBranch: data.target_branch,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      mergedAt: data.merged_at ? new Date(data.merged_at) : undefined,
      url: data.web_url,
    };
  }

  async getIssues(owner: string, repo: string, state: 'open' | 'closed' | 'all' = 'all'): Promise<Issue[]> {
    const projectPath = `${owner}/${repo}`;
    const params: any = { per_page: 100 };
    if (state !== 'all') params.state = state === 'open' ? 'opened' : 'closed';

    const data = await this.makeRequest<GitLabIssue[]>('GET', `/projects/${this.encodeProjectPath(projectPath)}/issues`, undefined, {
      params,
    });
    
    return data.map(issue => ({
      id: issue.id.toString(),
      number: issue.iid,
      title: issue.title,
      description: issue.description,
      state: issue.state === 'opened' ? 'open' : 'closed',
      author: issue.author.username,
      assignee: issue.assignee?.username,
      labels: issue.labels,
      createdAt: new Date(issue.created_at),
      updatedAt: new Date(issue.updated_at),
      closedAt: issue.closed_at ? new Date(issue.closed_at) : undefined,
      url: issue.web_url,
    }));
  }

  async getIssue(owner: string, repo: string, number: number): Promise<Issue> {
    const projectPath = `${owner}/${repo}`;
    const data = await this.makeRequest<GitLabIssue>('GET', `/projects/${this.encodeProjectPath(projectPath)}/issues/${number}`);
    
    return {
      id: data.id.toString(),
      number: data.iid,
      title: data.title,
      description: data.description,
      state: data.state === 'opened' ? 'open' : 'closed',
      author: data.author.username,
      assignee: data.assignee?.username,
      labels: data.labels,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      closedAt: data.closed_at ? new Date(data.closed_at) : undefined,
      url: data.web_url,
    };
  }

  async getReleases(owner: string, repo: string): Promise<Release[]> {
    const projectPath = `${owner}/${repo}`;
    const data = await this.makeRequest<GitLabRelease[]>('GET', `/projects/${this.encodeProjectPath(projectPath)}/releases`);
    
    return data.map(release => ({
      id: release.tag_name, // GitLab doesn't have numeric IDs for releases
      name: release.name,
      tagName: release.tag_name,
      description: release.description,
      draft: false, // GitLab doesn't have draft releases
      prerelease: release.upcoming_release,
      author: release.author.username,
      createdAt: new Date(release.created_at),
      publishedAt: new Date(release.released_at),
      url: release._links.self,
      assets: release.assets?.links?.map(link => ({
        name: link.name,
        downloadUrl: link.url,
        size: 0, // GitLab doesn't provide size in the API
      })) || [],
    }));
  }

  async getCommits(owner: string, repo: string, branch?: string, limit: number = 100): Promise<Commit[]> {
    const projectPath = `${owner}/${repo}`;
    const params: any = { per_page: Math.min(limit, 100) };
    if (branch) params.ref_name = branch;

    const data = await this.makeRequest<GitLabCommit[]>('GET', `/projects/${this.encodeProjectPath(projectPath)}/repository/commits`, undefined, {
      params,
    });
    
    return data.map(commit => ({
      sha: commit.id,
      message: commit.message,
      author: {
        name: commit.author_name,
        email: commit.author_email,
        date: new Date(commit.authored_date),
      },
      url: commit.web_url,
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
    const projectPath = `${owner}/${repo}`;
    const requestData = {
      title: data.title,
      description: data.description,
      source_branch: data.sourceBranch,
      target_branch: data.targetBranch,
    };

    const response = await this.makeRequest<GitLabMergeRequest>('POST', `/projects/${this.encodeProjectPath(projectPath)}/merge_requests`, requestData);
    
    return {
      id: response.id.toString(),
      number: response.iid,
      title: response.title,
      description: response.description,
      state: response.state === 'opened' ? 'open' : 'closed',
      author: response.author.username,
      sourceBranch: response.source_branch,
      targetBranch: response.target_branch,
      createdAt: new Date(response.created_at),
      updatedAt: new Date(response.updated_at),
      mergedAt: response.merged_at ? new Date(response.merged_at) : undefined,
      url: response.web_url,
    };
  }

  async createIssue(owner: string, repo: string, data: {
    title: string;
    description?: string;
    labels?: string[];
    assignee?: string;
  }): Promise<Issue> {
    const projectPath = `${owner}/${repo}`;
    const requestData: any = {
      title: data.title,
      description: data.description,
    };

    if (data.labels) requestData.labels = data.labels.join(',');
    if (data.assignee) {
      // Note: GitLab requires assignee ID, not username. This is simplified.
      requestData.assignee_id = data.assignee;
    }

    const response = await this.makeRequest<GitLabIssue>('POST', `/projects/${this.encodeProjectPath(projectPath)}/issues`, requestData);
    
    return {
      id: response.id.toString(),
      number: response.iid,
      title: response.title,
      description: response.description,
      state: response.state === 'opened' ? 'open' : 'closed',
      author: response.author.username,
      assignee: response.assignee?.username,
      labels: response.labels,
      createdAt: new Date(response.created_at),
      updatedAt: new Date(response.updated_at),
      closedAt: response.closed_at ? new Date(response.closed_at) : undefined,
      url: response.web_url,
    };
  }

  async createRelease(owner: string, repo: string, data: {
    tagName: string;
    name: string;
    description?: string;
    draft?: boolean;
    prerelease?: boolean;
  }): Promise<Release> {
    const projectPath = `${owner}/${repo}`;
    const requestData = {
      name: data.name,
      tag_name: data.tagName,
      description: data.description,
      upcoming_release: data.prerelease || false,
    };

    const response = await this.makeRequest<GitLabRelease>('POST', `/projects/${this.encodeProjectPath(projectPath)}/releases`, requestData);
    
    return {
      id: response.tag_name,
      name: response.name,
      tagName: response.tag_name,
      description: response.description,
      draft: false,
      prerelease: response.upcoming_release,
      author: response.author.username,
      createdAt: new Date(response.created_at),
      publishedAt: new Date(response.released_at),
      url: response._links.self,
      assets: response.assets?.links?.map(link => ({
        name: link.name,
        downloadUrl: link.url,
        size: 0,
      })) || [],
    };
  }
}