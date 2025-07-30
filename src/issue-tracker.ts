import fs from 'fs-extra';
import path from 'path';
import { ProcessedIssue } from './types.js';

export class IssueTracker {
  private trackingFile: string;
  private processedIssues: Map<string, ProcessedIssue> = new Map();

  constructor(repoPath: string) {
    this.trackingFile = path.join(repoPath, '.git-issues-tracker.json');
    this.loadTrackedIssues();
  }

  private async loadTrackedIssues(): Promise<void> {
    try {
      if (await fs.pathExists(this.trackingFile)) {
        const data = await fs.readJson(this.trackingFile);
        // Convert old format to new format if needed
        const issues = new Map<string, ProcessedIssue>();
        
        for (const [key, value] of Object.entries(data)) {
          if (typeof value === 'object' && value !== null) {
            const issue = value as any;
            // If it's in old format (branch:commit), extract commit hash
            if (key.includes(':')) {
              const [branchName, commitHash] = key.split(':');
              issues.set(commitHash, {
                commitHash,
                branchName: issue.branchName || branchName,
                issueId: issue.issueId,
                created: issue.created || false,
                createdAt: issue.createdAt ? new Date(issue.createdAt) : new Date(),
                error: issue.error
              });
            } else {
              // New format - key is commit hash
              issues.set(key, {
                commitHash: issue.commitHash || key,
                branchName: issue.branchName,
                issueId: issue.issueId,
                created: issue.created || false,
                createdAt: issue.createdAt ? new Date(issue.createdAt) : new Date(),
                error: issue.error
              });
            }
          }
        }
        
        this.processedIssues = issues;
      }
    } catch (error) {
      console.error('Error loading issue tracker:', error);
      this.processedIssues = new Map();
    }
  }

  private async saveTrackedIssues(): Promise<void> {
    try {
      const data: Record<string, ProcessedIssue> = {};
      for (const [commitHash, issue] of this.processedIssues) {
        data[commitHash] = {
          ...issue,
          createdAt: issue.createdAt
        };
      }
      await fs.writeJson(this.trackingFile, data, { spaces: 2 });
    } catch (error) {
      console.error('Error saving issue tracker:', error);
    }
  }

  /**
   * Check if an issue has been processed for a given commit
   */
  isIssueProcessed(commitHash: string): boolean {
    return this.processedIssues.has(commitHash);
  }

  /**
   * Check if an issue exists for a commit (created successfully)
   */
  hasCreatedIssue(commitHash: string): ProcessedIssue | undefined {
    const issue = this.processedIssues.get(commitHash);
    return issue && issue.created ? issue : undefined;
  }

  /**
   * Get issue details by commit hash
   */
  getIssueByCommit(commitHash: string): ProcessedIssue | undefined {
    return this.processedIssues.get(commitHash);
  }

  /**
   * Mark an issue as successfully created
   */
  async markIssueProcessed(branchName: string, commitHash: string, issueId?: number): Promise<void> {
    this.processedIssues.set(commitHash, {
      commitHash,
      branchName,
      issueId,
      created: true,
      createdAt: new Date()
    });
    await this.saveTrackedIssues();
  }

  /**
   * Mark an issue creation as failed
   */
  async markIssueFailed(branchName: string, commitHash: string, error: string): Promise<void> {
    this.processedIssues.set(commitHash, {
      commitHash,
      branchName,
      created: false,
      createdAt: new Date(),
      error
    });
    await this.saveTrackedIssues();
    console.error(`Failed to create issue for ${branchName} (${commitHash}) - ${error}`);
  }

  /**
   * Get all processed issues
   */
  getProcessedIssues(): ProcessedIssue[] {
    return Array.from(this.processedIssues.values());
  }

  /**
   * Get issues for a specific branch
   */
  getIssuesByBranch(branchName: string): ProcessedIssue[] {
    return Array.from(this.processedIssues.values())
      .filter(issue => issue.branchName === branchName);
  }

  /**
   * Get statistics about processed issues
   */
  async getStats(): Promise<{
    total: number;
    successful: number;
    failed: number;
    withIssueId: number;
    byBranch: Record<string, number>;
  }> {
    const issues = this.getProcessedIssues();
    const byBranch: Record<string, number> = {};
    
    issues.forEach(issue => {
      if (!byBranch[issue.branchName]) {
        byBranch[issue.branchName] = 0;
      }
      byBranch[issue.branchName]++;
    });
    
    return {
      total: issues.length,
      successful: issues.filter(i => i.created).length,
      failed: issues.filter(i => !i.created).length,
      withIssueId: issues.filter(i => i.issueId).length,
      byBranch
    };
  }

  /**
   * Check if an issue already exists for a commit
   */
  async checkExistingIssue(commitHash: string): Promise<{
    exists: boolean;
    issueId?: number;
    branchName?: string;
  }> {
    const issue = this.processedIssues.get(commitHash);
    if (issue && issue.created && issue.issueId) {
      return {
        exists: true,
        issueId: issue.issueId,
        branchName: issue.branchName
      };
    }
    return { exists: false };
  }

  /**
   * Reset the issue tracker
   */
  async reset(): Promise<void> {
    this.processedIssues.clear();
    if (await fs.pathExists(this.trackingFile)) {
      await fs.remove(this.trackingFile);
    }
  }

  /**
   * Remove a specific issue from tracking
   */
  async removeIssue(commitHash: string): Promise<boolean> {
    const deleted = this.processedIssues.delete(commitHash);
    if (deleted) {
      await this.saveTrackedIssues();
    }
    return deleted;
  }

  /**
   * Update an existing issue entry
   */
  async updateIssue(commitHash: string, updates: Partial<ProcessedIssue>): Promise<void> {
    const existing = this.processedIssues.get(commitHash);
    if (existing) {
      this.processedIssues.set(commitHash, {
        ...existing,
        ...updates,
        commitHash // Ensure commit hash doesn't change
      });
      await this.saveTrackedIssues();
    }
  }
}