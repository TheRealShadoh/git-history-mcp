import simpleGit, { SimpleGit, LogResult } from 'simple-git';
import { GitCommit, FeatureBranch, CommitChanges, FileChange, Contributor, PullRequestInfo } from './types.js';

export class GitHistoryParser {
  private git: SimpleGit;
  private repoPath: string;

  constructor(repoPath: string) {
    this.repoPath = repoPath;
    this.git = simpleGit(repoPath);
  }

  async parseCommitChanges(commitHash: string): Promise<CommitChanges> {
    try {
      // Get commit stats
      const diffStat = await this.git.diff(['--stat', `${commitHash}^`, commitHash]);
      const diffNumstat = await this.git.diff(['--numstat', `${commitHash}^`, commitHash]);
      const diffNameStatus = await this.git.diff(['--name-status', `${commitHash}^`, commitHash]);
      
      // Get actual diff content
      const fullDiff = await this.git.diff([`${commitHash}^`, commitHash]);
      
      // Parse file changes
      const fileChanges: FileChange[] = [];
      const numstatLines = diffNumstat.split('\n').filter(line => line.trim());
      const nameStatusLines = diffNameStatus.split('\n').filter(line => line.trim());
      
      let totalInsertions = 0;
      let totalDeletions = 0;
      const filesChanged: string[] = [];

      for (let i = 0; i < numstatLines.length; i++) {
        const numstatParts = numstatLines[i].split('\t');
        const nameStatusParts = nameStatusLines[i]?.split('\t') || [];
        
        if (numstatParts.length >= 3) {
          const insertions = numstatParts[0] === '-' ? 0 : parseInt(numstatParts[0]) || 0;
          const deletions = numstatParts[1] === '-' ? 0 : parseInt(numstatParts[1]) || 0;
          const filename = numstatParts[2];
          const status = this.parseFileStatus(nameStatusParts[0] || 'M');
          
          totalInsertions += insertions;
          totalDeletions += deletions;
          filesChanged.push(filename);
          
          // Extract patch for this specific file
          const filePatch = this.extractFilePatch(fullDiff, filename);
          
          fileChanges.push({
            filename,
            status,
            insertions,
            deletions,
            patch: filePatch
          });
        }
      }

      // Generate summary based on file patterns and changes
      const summary = this.generateChangeSummary(fileChanges, fullDiff);

      return {
        filesChanged,
        insertions: totalInsertions,
        deletions: totalDeletions,
        fileChanges,
        summary
      };
    } catch (error) {
      console.error(`Error parsing changes for commit ${commitHash}:`, error);
      return {
        filesChanged: [],
        insertions: 0,
        deletions: 0,
        fileChanges: [],
        summary: 'Unable to parse commit changes'
      };
    }
  }

  private parseFileStatus(status: string): 'added' | 'modified' | 'deleted' | 'renamed' {
    switch (status.charAt(0)) {
      case 'A': return 'added';
      case 'D': return 'deleted';
      case 'R': return 'renamed';
      case 'M':
      default: return 'modified';
    }
  }

  private async getParentHashes(commitHash: string): Promise<string[]> {
    try {
      const result = await this.git.raw(['log', '--pretty=format:%P', '-n', '1', commitHash]);
      return result.trim().split(' ').filter(hash => hash.length > 0);
    } catch (error) {
      console.error(`Error getting parent hashes for ${commitHash}:`, error);
      return [];
    }
  }

  private extractFilePatch(fullDiff: string, filename: string): string | undefined {
    const lines = fullDiff.split('\n');
    let inFile = false;
    let filePatch = '';
    let patchStarted = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Check for file header
      if (line.startsWith('diff --git') && line.includes(filename)) {
        inFile = true;
        filePatch = line + '\n';
        continue;
      }
      
      // Check for next file (end of current file)
      if (inFile && line.startsWith('diff --git') && !line.includes(filename)) {
        break;
      }
      
      if (inFile) {
        filePatch += line + '\n';
        
        // Limit patch size to avoid huge diffs
        if (filePatch.length > 5000) {
          filePatch += '... (patch truncated for readability)\n';
          break;
        }
      }
    }
    
    return filePatch.trim() || undefined;
  }

  private generateChangeSummary(fileChanges: FileChange[], fullDiff?: string): string {
    if (fileChanges.length === 0) return 'No file changes detected';

    const categories = {
      configuration: ['config', 'yml', 'yaml', 'json', 'env', 'properties', '.conf'],
      documentation: ['md', 'txt', 'rst', 'doc', 'readme'],
      infrastructure: ['ansible', 'playbook', 'role', 'dockerfile', 'helm', 'k8s', 'terraform', '.tf'],
      scripts: ['sh', 'py', 'js', 'ts', 'ps1', 'bat', 'script'],
      binaries: ['bin', 'exe', 'dll', 'so', 'jar', 'war', 'img', 'iso'],
      templates: ['j2', 'jinja', 'template', 'tmpl'],
      security: ['cert', 'key', 'pem', 'crt', 'security', 'auth']
    };

    const changeCounts = {
      configuration: 0,
      documentation: 0,
      infrastructure: 0,
      scripts: 0,
      binaries: 0,
      templates: 0,
      security: 0,
      other: 0
    };

    const operations = {
      added: 0,
      modified: 0,
      deleted: 0,
      renamed: 0
    };

    // Analyze code content from diffs
    const codePatterns = this.analyzeCodeChanges(fullDiff || '');

    fileChanges.forEach(change => {
      operations[change.status]++;
      
      const filename = change.filename.toLowerCase();
      const extension = filename.split('.').pop() || '';
      
      let categorized = false;
      for (const [category, patterns] of Object.entries(categories)) {
        if (patterns.some(pattern => filename.includes(pattern) || extension === pattern)) {
          changeCounts[category as keyof typeof changeCounts]++;
          categorized = true;
          break;
        }
      }
      
      if (!categorized) {
        changeCounts.other++;
      }
    });

    const summaryParts = [];
    
    // Describe operations
    if (operations.added > 0) summaryParts.push(`added ${operations.added} files`);
    if (operations.modified > 0) summaryParts.push(`modified ${operations.modified} files`);
    if (operations.deleted > 0) summaryParts.push(`deleted ${operations.deleted} files`);
    if (operations.renamed > 0) summaryParts.push(`renamed ${operations.renamed} files`);

    // Describe categories
    const categoryParts: string[] = [];
    Object.entries(changeCounts).forEach(([category, count]) => {
      if (count > 0 && category !== 'other') {
        categoryParts.push(`${category} (${count})`);
      }
    });

    let summary = summaryParts.join(', ');
    if (categoryParts.length > 0) {
      summary += ` - primarily ${categoryParts.join(', ')}`;
    }

    // Add code analysis insights
    if (codePatterns.length > 0) {
      summary += ` - ${codePatterns.join(', ')}`;
    }

    return summary || 'Mixed file changes';
  }

  private analyzeCodeChanges(diff: string): string[] {
    const patterns = [];
    
    // Look for common patterns in the diff
    if (diff.includes('version') || diff.includes('Version')) patterns.push('version updates');
    if (diff.includes('password') || diff.includes('token') || diff.includes('key')) patterns.push('credential changes');
    if (diff.includes('port') || diff.includes('host') || diff.includes('ip')) patterns.push('network configuration');
    if (diff.includes('install') || diff.includes('package')) patterns.push('package installations');
    if (diff.includes('service') || diff.includes('systemd')) patterns.push('service configuration');
    if (diff.includes('firewall') || diff.includes('iptables')) patterns.push('firewall rules');
    if (diff.includes('database') || diff.includes('db')) patterns.push('database changes');
    if (diff.includes('ssl') || diff.includes('tls') || diff.includes('certificate')) patterns.push('SSL/TLS configuration');
    if (diff.includes('backup') || diff.includes('restore')) patterns.push('backup configuration');
    if (diff.includes('monitoring') || diff.includes('logging')) patterns.push('monitoring/logging setup');
    if (diff.includes('ansible')) patterns.push('Ansible automation');
    if (diff.includes('docker') || diff.includes('container')) patterns.push('containerization');
    if (diff.includes('kubernetes') || diff.includes('k8s')) patterns.push('Kubernetes deployment');
    
    return patterns.slice(0, 3); // Limit to top 3 patterns
  }

  async getAllMergeCommits(sinceDays: number = 90): Promise<GitCommit[]> {
    try {
      const sinceDate = new Date();
      sinceDate.setDate(sinceDate.getDate() - sinceDays);
      
      const log = await this.git.log({
        '--merges': null,
        '--since': sinceDate.toISOString()
      });

      const commits: GitCommit[] = [];
      
      for (const logEntry of log.all) {
        const changes = await this.parseCommitChanges(logEntry.hash);
        
        // Get parent hashes from raw git log for merge commits
        const parents = await this.getParentHashes(logEntry.hash);
        
        commits.push({
          hash: logEntry.hash,
          message: logEntry.message,
          author: logEntry.author_name || '',
          date: logEntry.date ? new Date(logEntry.date) : new Date(),
          parentHashes: parents,
          isMerge: true,
          changes
        });
      }

      console.error(`Found ${commits.length} merge commits since ${sinceDate.toISOString()}`);
      return commits;
    } catch (error) {
      console.error('Error getting merge commits:', error);
      return [];
    }
  }

  async getFeatureBranches(sinceDays: number = 90): Promise<FeatureBranch[]> {
    const mergeCommits = await this.getAllMergeCommits(sinceDays);
    const branches: FeatureBranch[] = [];

    for (const mergeCommit of mergeCommits) {
      const branchName = this.extractBranchName(mergeCommit.message);
      if (branchName && !branchName.includes('develop') && !branchName.includes('master')) {
        // Get commits from the feature branch
        const branchCommits = await this.getBranchCommits(mergeCommit, branchName);
        
        // Extract contributors and pull request info
        const contributors = await this.extractContributors(branchCommits, mergeCommit);
        const pullRequestInfo = this.extractPullRequestInfo(mergeCommit.message);
        
        // Extract key takeaways from the changes
        const keyTakeaways = this.extractKeyTakeaways(branchCommits, mergeCommit);
        
        branches.push({
          name: branchName,
          commits: branchCommits,
          mergeCommit,
          mergedDate: mergeCommit.date,
          description: this.generateBranchDescription(branchName, branchCommits, mergeCommit, contributors, pullRequestInfo, keyTakeaways),
          status: 'merged',
          contributors,
          pullRequestInfo,
          keyTakeaways
        });
      }
    }

    return branches;
  }

  private extractBranchName(mergeMessage: string): string | null {
    const patterns = [
      /Merge branch '([^']+)'/,
      /Merge branch "([^"]+)"/,
      /Merge branch ([^\s]+)/
    ];

    for (const pattern of patterns) {
      const match = mergeMessage.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return null;
  }

  private extractPullRequestInfo(mergeMessage: string): PullRequestInfo | undefined {
    // Look for GitLab merge request patterns
    const patterns = [
      /Merge branch '([^']+)' into '([^']+)'/,
      /See merge request ([^\s!]+)!(\d+)/,
      /Closes #(\d+)/,
      /Merge Request #(\d+)/
    ];

    const info: PullRequestInfo = {};

    // Extract merge request number
    const mrMatch = mergeMessage.match(/See merge request [^!]+!(\d+)/);
    if (mrMatch) {
      info.number = mrMatch[1];
    }

    // Extract issue number
    const issueMatch = mergeMessage.match(/(?:Closes|Fixes) #(\d+)/);
    if (issueMatch) {
      info.number = issueMatch[1];
    }

    // Extract source and target branches
    const branchMatch = mergeMessage.match(/Merge branch '([^']+)' into '([^']+)'/);
    if (branchMatch) {
      info.source = branchMatch[1];
    }

    return Object.keys(info).length > 0 ? info : undefined;
  }

  private async extractContributors(commits: GitCommit[], mergeCommit: GitCommit): Promise<Contributor[]> {
    const contributorMap = new Map<string, Contributor>();
    
    // Add merge commit author as merger
    const mergerKey = `${mergeCommit.author}:${await this.getAuthorEmail(mergeCommit.hash)}`;
    contributorMap.set(mergerKey, {
      name: mergeCommit.author,
      email: await this.getAuthorEmail(mergeCommit.hash),
      commitCount: 0,
      linesAdded: 0,
      linesRemoved: 0,
      role: 'merger'
    });

    // Process all commits to find contributors
    for (const commit of commits) {
      const email = await this.getAuthorEmail(commit.hash);
      const key = `${commit.author}:${email}`;
      
      if (contributorMap.has(key)) {
        const contributor = contributorMap.get(key)!;
        contributor.commitCount++;
        contributor.linesAdded += commit.changes.insertions;
        contributor.linesRemoved += commit.changes.deletions;
        // If they were just a merger but also authored commits, make them an author
        if (contributor.role === 'merger') {
          contributor.role = 'author';
        }
      } else {
        contributorMap.set(key, {
          name: commit.author,
          email,
          commitCount: 1,
          linesAdded: commit.changes.insertions,
          linesRemoved: commit.changes.deletions,
          role: 'author'
        });
      }

      // Check for co-authors in commit message
      const coAuthors = this.extractCoAuthors(await this.getCommitMessage(commit.hash));
      for (const coAuthor of coAuthors) {
        const coAuthorKey = `${coAuthor.name}:${coAuthor.email}`;
        if (contributorMap.has(coAuthorKey)) {
          const contributor = contributorMap.get(coAuthorKey)!;
          if (contributor.role !== 'author') {
            contributor.role = 'co-author';
          }
        } else {
          contributorMap.set(coAuthorKey, {
            name: coAuthor.name,
            email: coAuthor.email,
            commitCount: 0,
            linesAdded: 0,
            linesRemoved: 0,
            role: 'co-author'
          });
        }
      }
    }

    return Array.from(contributorMap.values()).sort((a, b) => {
      // Sort by contribution: authors first, then by commit count, then by lines changed
      if (a.role === 'author' && b.role !== 'author') return -1;
      if (b.role === 'author' && a.role !== 'author') return 1;
      if (a.commitCount !== b.commitCount) return b.commitCount - a.commitCount;
      return (b.linesAdded + b.linesRemoved) - (a.linesAdded + a.linesRemoved);
    });
  }

  private async getAuthorEmail(commitHash: string): Promise<string> {
    try {
      const result = await this.git.raw(['log', '--pretty=format:%ae', '-n', '1', commitHash]);
      return result.trim();
    } catch (error) {
      return 'unknown@example.com';
    }
  }

  private async getCommitMessage(commitHash: string): Promise<string> {
    try {
      const result = await this.git.raw(['log', '--pretty=format:%B', '-n', '1', commitHash]);
      return result.trim();
    } catch (error) {
      return '';
    }
  }

  private extractCoAuthors(commitMessage: string): { name: string; email: string }[] {
    const coAuthors: { name: string; email: string }[] = [];
    const coAuthorPattern = /Co-authored-by:\s*([^<]+)<([^>]+)>/gi;
    let match;
    
    while ((match = coAuthorPattern.exec(commitMessage)) !== null) {
      coAuthors.push({
        name: match[1].trim(),
        email: match[2].trim()
      });
    }
    
    return coAuthors;
  }

  private async getBranchCommits(mergeCommit: GitCommit, branchName: string): Promise<GitCommit[]> {
    try {
      if (mergeCommit.parentHashes.length < 2) return [];
      
      const branchTip = mergeCommit.parentHashes[1];
      const baseBranch = mergeCommit.parentHashes[0];
      
      const log = await this.git.log({
        from: baseBranch,
        to: branchTip
      });

      const commits: GitCommit[] = [];
      for (const logEntry of log.all) {
        const changes = await this.parseCommitChanges(logEntry.hash);
        
        commits.push({
          hash: logEntry.hash,
          message: logEntry.message,
          author: logEntry.author_name || '',
          date: logEntry.date ? new Date(logEntry.date) : new Date(),
          parentHashes: [logEntry.hash],
          isMerge: false,
          branchName,
          changes
        });
      }

      return commits;
    } catch (error) {
      console.error(`Error getting branch commits for ${branchName}:`, error);
      return [];
    }
  }

  private generateBranchDescription(branchName: string, commits: GitCommit[], mergeCommit: GitCommit, contributors: Contributor[], pullRequestInfo?: PullRequestInfo, keyTakeaways?: string[]): string {
    const totalFiles = new Set<string>();
    let totalInsertions = 0;
    let totalDeletions = 0;
    const changeTypes = new Set<string>();

    commits.forEach(commit => {
      commit.changes.filesChanged.forEach(file => totalFiles.add(file));
      totalInsertions += commit.changes.insertions;
      totalDeletions += commit.changes.deletions;
      if (commit.changes.summary) {
        changeTypes.add(commit.changes.summary);
      }
    });

    const description = [
      `**Branch: ${branchName}**`,
      `**Merged: ${mergeCommit.date.toDateString()}**`,
      `**Merged by: ${mergeCommit.author}**`,
      ''
    ];

    // Add pull request information if available
    if (pullRequestInfo) {
      if (pullRequestInfo.number) {
        description.push(`**Merge Request:** #${pullRequestInfo.number}`);
      }
      if (pullRequestInfo.source) {
        description.push(`**Source Branch:** ${pullRequestInfo.source}`);
      }
      description.push('');
    }

    // Add contributors section
    if (contributors.length > 0) {
      description.push('## Contributors');
      contributors.forEach(contributor => {
        const role = contributor.role === 'author' ? '👨‍💻 Author' : 
                    contributor.role === 'co-author' ? '🤝 Co-Author' : '🔀 Merger';
        const stats = contributor.commitCount > 0 ? 
          ` (${contributor.commitCount} commits, +${contributor.linesAdded}/-${contributor.linesRemoved})` : '';
        description.push(`- ${role}: **${contributor.name}**${stats}`);
      });
      description.push('');
    }

    description.push(
      '## Summary',
      commits.length > 0 ? commits[0].message : mergeCommit.message,
      ''
    );

    // Add key takeaways if available
    if (keyTakeaways && keyTakeaways.length > 0) {
      description.push('## Key Takeaways');
      keyTakeaways.forEach(takeaway => {
        description.push(`- ${takeaway}`);
      });
      description.push('');
    }

    description.push(
      '## Changes Overview',
      `- **Files modified:** ${totalFiles.size}`,
      `- **Lines added:** ${totalInsertions}`,
      `- **Lines removed:** ${totalDeletions}`,
      `- **Commits:** ${commits.length}`,
      `- **Contributors:** ${contributors.length}`,
      ''
    );

    if (commits.length > 0) {
      description.push('## Detailed Changes');
      commits.forEach((commit, index) => {
        description.push(`### Commit ${index + 1}: ${commit.message}`);
        description.push(`**Author:** ${commit.author} | **Hash:** \`${commit.hash.substring(0, 8)}\``);
        description.push(`**Analysis:** ${commit.changes.summary}`);
        description.push('');
        
        if (commit.changes.fileChanges.length > 0) {
          description.push('**Modified Files:**');
          commit.changes.fileChanges.slice(0, 8).forEach(change => {
            description.push(`- \`${change.filename}\` (${change.status}: +${change.insertions}/-${change.deletions})`);
          });
          
          if (commit.changes.fileChanges.length > 8) {
            description.push(`- ... and ${commit.changes.fileChanges.length - 8} more files`);
          }
          description.push('');
        }

        // Include code snippets for important changes
        const significantChanges = commit.changes.fileChanges
          .filter(change => change.patch && (change.insertions + change.deletions) > 5)
          .slice(0, 2); // Show top 2 most significant files

        if (significantChanges.length > 0) {
          description.push('**Key Code Changes:**');
          significantChanges.forEach(change => {
            description.push(`\n**${change.filename}** (${change.status}):`);
            description.push('```diff');
            // Extract just the meaningful parts of the diff
            const patch = this.extractMeaningfulDiff(change.patch || '');
            description.push(patch);
            description.push('```');
            description.push('');
          });
        }
        
        description.push('---');
        description.push('');
      });
    } else {
      // For merge commits without individual commits, show merge commit changes
      if (mergeCommit.changes.fileChanges.length > 0) {
        description.push('## Merge Changes');
        description.push(`**Analysis:** ${mergeCommit.changes.summary}`);
        description.push('');
        description.push('**Files:**');
        mergeCommit.changes.fileChanges.slice(0, 15).forEach(change => {
          description.push(`- \`${change.filename}\` (${change.status}: +${change.insertions}/-${change.deletions})`);
        });
        if (mergeCommit.changes.fileChanges.length > 15) {
          description.push(`- ... and ${mergeCommit.changes.fileChanges.length - 15} more files`);
        }
      }
    }

    return description.join('\n');
  }

  private extractMeaningfulDiff(patch: string): string {
    const lines = patch.split('\n');
    const meaningfulLines = [];
    let addedLines = 0;
    let removedLines = 0;
    const maxLines = 20; // Limit diff size
    
    for (const line of lines) {
      // Skip file headers and index lines
      if (line.startsWith('diff --git') || 
          line.startsWith('index ') || 
          line.startsWith('@@') ||
          line.startsWith('+++') ||
          line.startsWith('---')) {
        continue;
      }
      
      // Include meaningful changes
      if (line.startsWith('+') || line.startsWith('-')) {
        if (line.startsWith('+')) addedLines++;
        if (line.startsWith('-')) removedLines++;
        
        // Skip lines that are just whitespace changes
        if (line.trim().length > 1) {
          meaningfulLines.push(line);
          if (meaningfulLines.length >= maxLines) {
            meaningfulLines.push('... (diff truncated)');
            break;
          }
        }
      }
    }
    
    return meaningfulLines.length > 0 ? meaningfulLines.join('\n') : '(No significant code changes to display)';
  }

  private extractKeyTakeaways(commits: GitCommit[], mergeCommit: GitCommit): string[] {
    const takeaways: string[] = [];
    
    // Analyze the scope of changes
    const totalFiles = new Set<string>();
    let totalInsertions = 0;
    let totalDeletions = 0;
    const fileTypes = new Set<string>();
    const technologies = new Set<string>();
    
    commits.forEach(commit => {
      commit.changes.filesChanged.forEach(file => {
        totalFiles.add(file);
        const ext = file.split('.').pop()?.toLowerCase();
        if (ext) fileTypes.add(ext);
        
        // Detect technologies
        if (file.includes('ansible') || file.includes('playbook')) technologies.add('Ansible');
        if (file.includes('docker') || file.includes('Dockerfile')) technologies.add('Docker');
        if (file.includes('k8s') || file.includes('kubernetes')) technologies.add('Kubernetes');
        if (file.includes('vdi') || file.includes('gpu')) technologies.add('VDI/GPU');
        if (file.includes('harbor') || file.includes('registry')) technologies.add('Container Registry');
      });
      totalInsertions += commit.changes.insertions;
      totalDeletions += commit.changes.deletions;
    });
    
    // Generate takeaways based on analysis
    if (totalInsertions > 1000) {
      takeaways.push(`Major feature implementation with ${totalInsertions.toLocaleString()} lines added`);
    } else if (totalInsertions > 100) {
      takeaways.push(`Moderate enhancement with ${totalInsertions} lines of new code`);
    }
    
    if (totalDeletions > 500) {
      takeaways.push(`Significant code cleanup/refactoring (${totalDeletions} lines removed)`);
    }
    
    if (technologies.size > 0) {
      takeaways.push(`Technologies involved: ${Array.from(technologies).join(', ')}`);
    }
    
    // Analyze commit messages for patterns
    const commitMessages = commits.map(c => c.message.toLowerCase());
    if (commitMessages.some(m => m.includes('fix') || m.includes('bug'))) {
      takeaways.push('Includes bug fixes or stability improvements');
    }
    if (commitMessages.some(m => m.includes('security') || m.includes('auth'))) {
      takeaways.push('Security-related changes implemented');
    }
    if (commitMessages.some(m => m.includes('performance') || m.includes('optimize'))) {
      takeaways.push('Performance optimizations included');
    }
    
    // Analyze file patterns
    if (fileTypes.has('yml') || fileTypes.has('yaml')) {
      if (Array.from(totalFiles).some(f => f.includes('playbook'))) {
        takeaways.push('Ansible automation/configuration updates');
      }
    }
    
    return takeaways;
  }
}