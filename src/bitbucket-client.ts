import { BaseApiClient, Repository, PullRequest, Branch, Issue, Release, Commit, ApiConfig } from './api-client.js';

interface BitbucketRepository {
  uuid: string;
  name: string;
  full_name: string;
  description?: string;
  links: { html: { href: string } };
  mainbranch?: { name: string };
  is_private: boolean;
  created_on: string;
  updated_on: string;
  language?: string;
  size: number;
}

interface BitbucketPullRequest {
  id: number;
  title: string;
  description?: string;
  state: string;
  author: { username: string };
  source: { branch: { name: string } };
  destination: { branch: { name: string } };
  created_on: string;
  updated_on: string;
  links: { html: { href: string } };
  merge_commit?: { hash: string };
}

interface BitbucketBranch {
  name: string;
  target: {
    hash: string;
    message: string;
    author: { raw: string };
    date: string;
  };
}

interface BitbucketIssue {
  id: number;
  title: string;
  content?: { raw: string };
  state: string;
  reporter: { username: string };
  assignee?: { username: string };
  created_on: string;
  updated_on: string;
  links: { html: { href: string } };
}

interface BitbucketCommit {
  hash: string;
  message: string;
  author: {
    raw: string;
    user?: { username: string };
  };
  date: string;
  links: { html: { href: string } };
}

// Note: Bitbucket doesn't have a native releases API like GitHub/GitLab
// We'll use tags as releases
interface BitbucketTag {
  name: string;
  target: {
    hash: string;
    message: string;
    author: { raw: string };
    date: string;
  };
  links: { html: { href: string } };
}

export class BitbucketApiClient extends BaseApiClient {
  constructor(config: Omit<ApiConfig, 'baseURL'> & { baseURL?: string }) {
    super({
      baseURL: config.baseURL || 'https://api.bitbucket.org/2.0',
      ...config,
    });
  }

  protected getAuthHeader(): string {
    return `Bearer ${this.config.token}`;
  }

  async getRepository(owner: string, repo: string): Promise<Repository> {
    const data = await this.makeRequest<BitbucketRepository>('GET', `/repositories/${owner}/${repo}`);
    
    return {
      id: data.uuid,
      name: data.name,
      fullName: data.full_name,
      description: data.description,
      url: data.links.html.href,
      defaultBranch: data.mainbranch?.name || 'master',
      isPrivate: data.is_private,
      createdAt: new Date(data.created_on),
      updatedAt: new Date(data.updated_on),
      language: data.language,
    };
  }

  async getBranches(owner: string, repo: string): Promise<Branch[]> {
    const response = await this.makeRequest<{ values: BitbucketBranch[] }>('GET', `/repositories/${owner}/${repo}/refs/branches`);
    const repoInfo = await this.getRepository(owner, repo);
    
    return response.values.map(branch => ({
      name: branch.name,
      commit: {
        sha: branch.target.hash,
        message: branch.target.message,
        author: branch.target.author.raw,
        date: new Date(branch.target.date),
      },
      protected: false, // Bitbucket doesn't expose branch protection in this API
      isDefault: branch.name === repoInfo.defaultBranch,
    }));
  }

  async getPullRequests(owner: string, repo: string, state: 'open' | 'closed' | 'all' = 'all'): Promise<PullRequest[]> {
    let endpoint = `/repositories/${owner}/${repo}/pullrequests`;
    if (state !== 'all') {
      endpoint += `?state=${state.toUpperCase()}`;
    }

    const response = await this.makeRequest<{ values: BitbucketPullRequest[] }>('GET', endpoint);
    
    return response.values.map(pr => ({
      id: pr.id.toString(),
      number: pr.id,
      title: pr.title,
      description: pr.description,
      state: pr.state.toLowerCase() as 'open' | 'closed' | 'merged',
      author: pr.author.username,
      sourceBranch: pr.source.branch.name,
      targetBranch: pr.destination.branch.name,
      createdAt: new Date(pr.created_on),
      updatedAt: new Date(pr.updated_on),
      url: pr.links.html.href,
    }));
  }

  async getPullRequest(owner: string, repo: string, number: number): Promise<PullRequest> {
    const data = await this.makeRequest<BitbucketPullRequest>('GET', `/repositories/${owner}/${repo}/pullrequests/${number}`);
    
    return {
      id: data.id.toString(),
      number: data.id,
      title: data.title,
      description: data.description,
      state: data.state.toLowerCase() as 'open' | 'closed' | 'merged',
      author: data.author.username,
      sourceBranch: data.source.branch.name,
      targetBranch: data.destination.branch.name,
      createdAt: new Date(data.created_on),
      updatedAt: new Date(data.updated_on),
      url: data.links.html.href,
    };
  }

  async getIssues(owner: string, repo: string, state: 'open' | 'closed' | 'all' = 'all'): Promise<Issue[]> {
    let endpoint = `/repositories/${owner}/${repo}/issues`;
    if (state !== 'all') {
      endpoint += `?state=${state}`;
    }

    const response = await this.makeRequest<{ values: BitbucketIssue[] }>('GET', endpoint);
    
    return response.values.map(issue => ({
      id: issue.id.toString(),
      number: issue.id,
      title: issue.title,
      description: issue.content?.raw,
      state: issue.state as 'open' | 'closed',
      author: issue.reporter.username,
      assignee: issue.assignee?.username,
      labels: [], // Bitbucket uses different labeling system
      createdAt: new Date(issue.created_on),
      updatedAt: new Date(issue.updated_on),
      url: issue.links.html.href,
    }));
  }

  async getIssue(owner: string, repo: string, number: number): Promise<Issue> {
    const data = await this.makeRequest<BitbucketIssue>('GET', `/repositories/${owner}/${repo}/issues/${number}`);
    
    return {
      id: data.id.toString(),
      number: data.id,
      title: data.title,
      description: data.content?.raw,
      state: data.state as 'open' | 'closed',
      author: data.reporter.username,
      assignee: data.assignee?.username,
      labels: [],
      createdAt: new Date(data.created_on),
      updatedAt: new Date(data.updated_on),
      url: data.links.html.href,
    };
  }

  async getReleases(owner: string, repo: string): Promise<Release[]> {
    // Bitbucket doesn't have releases, so we'll use tags as releases
    const response = await this.makeRequest<{ values: BitbucketTag[] }>('GET', `/repositories/${owner}/${repo}/refs/tags`);
    
    return response.values.map(tag => ({
      id: tag.name,
      name: tag.name,
      tagName: tag.name,
      description: tag.target.message,
      draft: false,
      prerelease: false,
      author: tag.target.author.raw,
      createdAt: new Date(tag.target.date),
      publishedAt: new Date(tag.target.date),
      url: tag.links.html.href,
      assets: [],
    }));
  }

  async getCommits(owner: string, repo: string, branch?: string, limit: number = 100): Promise<Commit[]> {
    let endpoint = `/repositories/${owner}/${repo}/commits`;
    if (branch) {
      endpoint += `/${branch}`;
    }

    const response = await this.makeRequest<{ values: BitbucketCommit[] }>('GET', endpoint, undefined, {
      params: { pagelen: Math.min(limit, 100) },
    });
    
    return response.values.map(commit => ({
      sha: commit.hash,
      message: commit.message,
      author: {
        name: commit.author.user?.username || commit.author.raw,
        email: '', // Not easily extractable from Bitbucket API
        date: new Date(commit.date),
      },
      url: commit.links.html.href,
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
      description: data.description,
      source: {
        branch: {
          name: data.sourceBranch,
        },
      },
      destination: {
        branch: {
          name: data.targetBranch,
        },
      },
    };

    const response = await this.makeRequest<BitbucketPullRequest>('POST', `/repositories/${owner}/${repo}/pullrequests`, requestData);
    
    return {
      id: response.id.toString(),
      number: response.id,
      title: response.title,
      description: response.description,
      state: response.state.toLowerCase() as 'open' | 'closed',
      author: response.author.username,
      sourceBranch: response.source.branch.name,
      targetBranch: response.destination.branch.name,
      createdAt: new Date(response.created_on),
      updatedAt: new Date(response.updated_on),
      url: response.links.html.href,
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
      content: {
        raw: data.description || '',
      },
    };

    if (data.assignee) {
      requestData.assignee = { username: data.assignee };
    }

    const response = await this.makeRequest<BitbucketIssue>('POST', `/repositories/${owner}/${repo}/issues`, requestData);
    
    return {
      id: response.id.toString(),
      number: response.id,
      title: response.title,
      description: response.content?.raw,
      state: response.state as 'open' | 'closed',
      author: response.reporter.username,
      assignee: response.assignee?.username,
      labels: [],
      createdAt: new Date(response.created_on),
      updatedAt: new Date(response.updated_on),
      url: response.links.html.href,
    };
  }

  async createRelease(owner: string, repo: string, data: {
    tagName: string;
    name: string;
    description?: string;
    draft?: boolean;
    prerelease?: boolean;
  }): Promise<Release> {
    // Bitbucket doesn't have releases API, so we'll create a tag
    const requestData = {
      name: data.tagName,
      target: {
        hash: 'HEAD', // This would need to be a specific commit hash
      },
    };

    // Note: This is a simplified implementation
    // In practice, you'd need to get the current commit hash for the target branch
    throw new Error('Bitbucket does not support creating releases via API. Use tags instead.');
  }
}