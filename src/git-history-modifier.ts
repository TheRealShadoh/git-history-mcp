import simpleGit, { SimpleGit } from 'simple-git';
import { CommitAnalyzer } from './commit-analyzer.js';
import fs from 'fs-extra';
import path from 'path';

export interface SafetyCheck {
  safe: boolean;
  reason?: string;
  warnings: string[];
  recommendations: string[];
}

export interface CommitRewriteRequest {
  commitHash: string;
  newMessage: string;
  preserveAuthor?: boolean;
  preserveDate?: boolean;
}

export interface RewriteResult {
  success: boolean;
  originalHash: string;
  newHash?: string;
  backupRef?: string;
  error?: string;
  warnings: string[];
}

export interface RewritePlan {
  commits: CommitRewriteRequest[];
  safetyCheck: SafetyCheck;
  backupStrategy: {
    branchName: string;
    tagName: string;
  };
  estimatedImpact: {
    affectedCommits: number;
    affectedBranches: string[];
    dependentBranches: string[];
  };
}

export class GitHistoryModifier {
  private git: SimpleGit;
  private repoPath: string;
  private commitAnalyzer: CommitAnalyzer;

  constructor(repoPath: string) {
    this.repoPath = repoPath;
    this.git = simpleGit(repoPath);
    this.commitAnalyzer = new CommitAnalyzer(repoPath);
  }

  /**
   * Perform comprehensive safety checks before modifying git history
   */
  async performSafetyChecks(commitHashes: string[]): Promise<SafetyCheck> {
    const warnings: string[] = [];
    const recommendations: string[] = [];
    let safe = true;
    let reason: string | undefined;

    try {
      // Check if repository is clean
      const status = await this.git.status();
      if (status.files.length > 0) {
        safe = false;
        reason = 'Repository has uncommitted changes';
        recommendations.push('Commit or stash all changes before modifying history');
      }

      // Check if we're on a protected branch
      const currentBranch = await this.git.revparse(['--abbrev-ref', 'HEAD']);
      const protectedBranches = ['main', 'master', 'develop', 'production', 'prod'];
      if (protectedBranches.includes(currentBranch.trim())) {
        warnings.push(`You are on a protected branch: ${currentBranch}`);
        recommendations.push('Consider creating a feature branch for history modification');
      }

      // Check if commits are already pushed to remote
      const remotes = await this.git.getRemotes(true);
      if (remotes.length > 0) {
        for (const commitHash of commitHashes) {
          try {
            // Check if commit exists on remote
            const remoteBranches = await this.git.branch(['-r', '--contains', commitHash]);
            if (remoteBranches.all.length > 0) {
              safe = false;
              reason = `Commit ${commitHash} has been pushed to remote branches: ${remoteBranches.all.join(', ')}`;
              recommendations.push('Only modify local commits that have not been pushed');
              break;
            }
          } catch {
            // Commit might not exist on remote, which is good
          }
        }
      }

      // Check if commits are merge commits
      for (const commitHash of commitHashes) {
        try {
          const commit = await this.git.show([commitHash, '--format=%P', '--no-patch']);
          const parents = commit.trim().split(' ');
          if (parents.length > 1) {
            warnings.push(`Commit ${commitHash} is a merge commit`);
            recommendations.push('Rewriting merge commits can be complex and risky');
          }
        } catch (error) {
          safe = false;
          reason = `Cannot analyze commit ${commitHash}: ${error}`;
        }
      }

      // Check if commits are too old (more than 50 commits back)
      try {
        for (const commitHash of commitHashes) {
          const commitPosition = await this.git.raw(['rev-list', '--count', `${commitHash}..HEAD`]);
          const position = parseInt(commitPosition.trim());
          if (position > 50) {
            warnings.push(`Commit ${commitHash} is ${position} commits back from HEAD`);
            recommendations.push('Rewriting old commits can affect many subsequent commits');
          }
        }
      } catch {
        // Cannot determine position, add warning
        warnings.push('Cannot determine commit positions');
      }

      // Check for dependencies (other branches containing these commits)
      const allBranches = await this.git.branch(['-a']);
      const dependentBranches: string[] = [];
      
      for (const commitHash of commitHashes) {
        for (const branchName of allBranches.all) {
          if (branchName.startsWith('remotes/') || branchName === currentBranch.trim()) continue;
          
          try {
            const contains = await this.git.raw(['branch', '--contains', commitHash]);
            if (contains.includes(branchName)) {
              dependentBranches.push(branchName);
            }
          } catch {
            // Branch might not contain commit
          }
        }
      }

      if (dependentBranches.length > 0) {
        warnings.push(`Commits are contained in other branches: ${dependentBranches.join(', ')}`);
        recommendations.push('Other branches may be affected by history rewriting');
      }

      // Additional safety recommendations
      if (safe && warnings.length === 0) {
        recommendations.push('Create a backup branch before proceeding');
        recommendations.push('Verify all team members are aware of history changes');
      }

      return {
        safe,
        reason,
        warnings,
        recommendations
      };

    } catch (error) {
      return {
        safe: false,
        reason: `Safety check failed: ${error instanceof Error ? error.message : String(error)}`,
        warnings: [],
        recommendations: ['Fix repository issues before attempting history modification']
      };
    }
  }

  /**
   * Create a comprehensive rewrite plan
   */
  async createRewritePlan(commitHashes: string[]): Promise<RewritePlan> {
    const safetyCheck = await this.performSafetyChecks(commitHashes);
    
    // Generate improved commit messages for each commit
    const commits: CommitRewriteRequest[] = [];
    for (const commitHash of commitHashes) {
      try {
        const suggestion = await this.commitAnalyzer.suggestCommitMessage(commitHash);
        commits.push({
          commitHash,
          newMessage: suggestion.suggested,
          preserveAuthor: true,
          preserveDate: true
        });
      } catch (error) {
        throw new Error(`Cannot generate message for commit ${commitHash}: ${error}`);
      }
    }

    // Create backup strategy
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const currentBranch = await this.git.revparse(['--abbrev-ref', 'HEAD']);
    const backupStrategy = {
      branchName: `backup-${currentBranch.trim()}-${timestamp}`,
      tagName: `backup-tag-${timestamp}`
    };

    // Estimate impact
    const allBranches = await this.git.branch(['-a']);
    const affectedBranches: string[] = [];
    const dependentBranches: string[] = [];

    for (const commitHash of commitHashes) {
      for (const branchName of allBranches.all) {
        if (branchName.startsWith('remotes/')) continue;
        
        try {
          const contains = await this.git.raw(['branch', '--contains', commitHash]);
          if (contains.includes(branchName)) {
            if (branchName === currentBranch.trim()) {
              affectedBranches.push(branchName);
            } else {
              dependentBranches.push(branchName);
            }
          }
        } catch {
          // Branch might not contain commit
        }
      }
    }

    return {
      commits,
      safetyCheck,
      backupStrategy,
      estimatedImpact: {
        affectedCommits: commitHashes.length,
        affectedBranches: [...new Set(affectedBranches)],
        dependentBranches: [...new Set(dependentBranches)]
      }
    };
  }

  /**
   * Create backup before modifying history
   */
  async createBackup(backupStrategy: RewritePlan['backupStrategy']): Promise<{ branchCreated: boolean; tagCreated: boolean }> {
    try {
      // Create backup branch
      await this.git.checkoutLocalBranch(backupStrategy.branchName);
      await this.git.checkout('-'); // Go back to previous branch
      
      // Create backup tag
      await this.git.addTag(backupStrategy.tagName);
      
      return { branchCreated: true, tagCreated: true };
    } catch (error) {
      throw new Error(`Failed to create backup: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Safely rewrite commit messages using interactive rebase
   */
  async rewriteCommitMessages(
    plan: RewritePlan, 
    confirmationToken: string
  ): Promise<RewriteResult[]> {
    // Validate confirmation token (should be generated by the planning phase)
    const expectedToken = this.generateConfirmationToken(plan);
    if (confirmationToken !== expectedToken) {
      throw new Error('Invalid confirmation token. Please regenerate the rewrite plan.');
    }

    if (!plan.safetyCheck.safe) {
      throw new Error(`Cannot proceed: ${plan.safetyCheck.reason}`);
    }

    const results: RewriteResult[] = [];

    try {
      // Create backup
      const backup = await this.createBackup(plan.backupStrategy);
      
      // Sort commits by date (oldest first) for proper rebase order
      // Get dates for all commits first
      const commitDates = new Map<string, Date>();
      for (const commit of plan.commits) {
        const dateStr = await this.git.show([commit.commitHash, '--format=%ad', '--no-patch']);
        commitDates.set(commit.commitHash, new Date(dateStr.trim()));
      }
      
      const sortedCommits = [...plan.commits].sort((a, b) => {
        const dateA = commitDates.get(a.commitHash)!;
        const dateB = commitDates.get(b.commitHash)!;
        return dateA.getTime() - dateB.getTime();
      });

      // Use filter-branch for message rewriting (safer than interactive rebase for automation)
      for (const commit of sortedCommits) {
        try {
          const result = await this.rewriteSingleCommit(commit);
          results.push(result);
        } catch (error) {
          results.push({
            success: false,
            originalHash: commit.commitHash,
            error: error instanceof Error ? error.message : String(error),
            warnings: ['Commit rewrite failed'],
            backupRef: plan.backupStrategy.branchName
          });
        }
      }

      return results;

    } catch (error) {
      throw new Error(`History rewrite failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Rewrite a single commit message
   */
  private async rewriteSingleCommit(commit: CommitRewriteRequest): Promise<RewriteResult> {
    try {
      // Get original commit info
      const originalInfo = await this.git.show([
        commit.commitHash, 
        '--format=%H|%an|%ae|%ad', 
        '--no-patch'
      ]);
      const [originalHash, authorName, authorEmail, authorDate] = originalInfo.trim().split('|');

      // Create a temporary script for git filter-branch
      const scriptPath = path.join(this.repoPath, '.git', 'rewrite-script.sh');
      const script = `#!/bin/bash
if [ "$GIT_COMMIT" = "${commit.commitHash}" ]; then
  echo "${commit.newMessage.replace(/"/g, '\\"')}"
else
  cat
fi
`;

      await fs.writeFile(scriptPath, script);
      await fs.chmod(scriptPath, '755');

      try {
        // Use git filter-branch to rewrite the specific commit
        await this.git.raw([
          'filter-branch',
          '--msg-filter', scriptPath,
          '--force',
          `${commit.commitHash}~1..HEAD`
        ]);

        // Get new commit hash
        const newLog = await this.git.log(['--oneline', '-1']);
        const newHash = newLog.latest?.hash;

        return {
          success: true,
          originalHash: commit.commitHash,
          newHash,
          warnings: [],
          backupRef: undefined
        };

      } finally {
        // Clean up script
        await fs.remove(scriptPath).catch(() => {});
      }

    } catch (error) {
      return {
        success: false,
        originalHash: commit.commitHash,
        error: error instanceof Error ? error.message : String(error),
        warnings: ['Single commit rewrite failed']
      };
    }
  }

  /**
   * Generate a confirmation token based on the rewrite plan
   */
  generateConfirmationToken(plan: RewritePlan): string {
    const data = {
      commits: plan.commits.map(c => c.commitHash).sort(),
      timestamp: new Date().toISOString().slice(0, 16) // 16-character precision (minute-level)
    };
    
    // Simple hash of the plan data
    return Buffer.from(JSON.stringify(data)).toString('base64').slice(0, 16);
  }

  /**
   * Rollback to backup if something goes wrong
   */
  async rollbackToBackup(backupRef: string): Promise<boolean> {
    try {
      const currentBranch = await this.git.revparse(['--abbrev-ref', 'HEAD']);
      
      // Check if backup exists
      const branches = await this.git.branch(['-a']);
      if (!branches.all.includes(backupRef)) {
        throw new Error(`Backup ${backupRef} not found`);
      }

      // Reset current branch to backup
      await this.git.reset(['--hard', backupRef]);
      
      return true;
    } catch (error) {
      throw new Error(`Rollback failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Clean up backup branches and tags
   */
  async cleanupBackups(backupStrategy: RewritePlan['backupStrategy']): Promise<void> {
    try {
      // Delete backup branch
      await this.git.deleteLocalBranch(backupStrategy.branchName).catch(() => {});
      
      // Delete backup tag
      await this.git.tag(['-d', backupStrategy.tagName]).catch(() => {});
    } catch (error) {
      // Non-critical, just log
      console.error('Cleanup failed:', error);
    }
  }
}