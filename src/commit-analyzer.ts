import simpleGit, { SimpleGit } from 'simple-git';
import { 
  CommitDiff, 
  FileDiff, 
  ChangelogEntry, 
  ImprovedCommitMessage,
  SimilarCommit,
  ReleaseNotes
} from './types.js';
import path from 'path';

export class CommitAnalyzer {
  private git: SimpleGit;
  private repoPath: string;

  constructor(repoPath: string) {
    this.repoPath = repoPath;
    this.git = simpleGit(repoPath);
  }

  /**
   * Get detailed diff for a specific commit
   */
  async getCommitDiff(commitHash: string): Promise<CommitDiff> {
    // Get commit details
    const log = await this.git.log(['-1', '--format=%H|%h|%an|%ae|%ad|%s|%P', commitHash]);
    const commit = log.latest;
    
    if (!commit) {
      throw new Error(`Commit ${commitHash} not found`);
    }

    // Parse commit info
    const [fullHash, shortHash, author, email, date, message, parentHashes] = 
      commit.hash.split('|').concat([commit.message, '']);

    // Get diff stats
    const diffSummary = await this.git.diffSummary([`${commitHash}^`, commitHash]).catch(() => 
      // For initial commit, compare against empty tree
      this.git.diffSummary(['4b825dc642cb6eb9a060e54bf8d69288fbee4904', commitHash])
    );

    // Get detailed file diffs
    const files: FileDiff[] = [];
    
    for (const file of diffSummary.files) {
      const patch = await this.git.diff([
        `${commitHash}^`, 
        commitHash, 
        '--', 
        file.file
      ]).catch(() => '');

      files.push({
        filename: file.file,
        status: this.mapFileStatus(file),
        oldPath: (file as any).rename ? file.file : undefined,
        additions: (file as any).insertions || 0,
        deletions: (file as any).deletions || 0,
        changes: (file as any).changes || 0,
        patch,
        language: this.detectLanguage(file.file),
        binary: (file as any).binary || false
      });
    }

    return {
      commitHash: fullHash,
      shortHash: commitHash.substring(0, 7),
      author,
      date: new Date(date),
      message,
      parentHash: parentHashes?.split(' ')[0],
      stats: {
        filesChanged: diffSummary.files.length,
        insertions: diffSummary.insertions,
        deletions: diffSummary.deletions
      },
      files
    };
  }

  /**
   * Generate changelog between two refs (branches, tags, commits)
   */
  async generateChangelog(fromRef: string, toRef: string = 'HEAD'): Promise<ChangelogEntry[]> {
    const commits = await this.git.log([`${fromRef}..${toRef}`]);
    const entries: ChangelogEntry[] = [];
    const grouped = new Map<string, typeof entries[0]>();

    for (const commit of commits.all) {
      const parsed = this.parseCommitMessage(commit.message);
      const date = new Date(commit.date);
      const dateKey = date.toISOString().split('T')[0];

      if (!grouped.has(dateKey)) {
        grouped.set(dateKey, {
          date,
          commits: [],
          summary: {
            features: [],
            fixes: [],
            breaking: [],
            other: []
          }
        });
      }

      const entry = grouped.get(dateKey)!;
      const commitInfo = {
        hash: commit.hash,
        type: parsed.type,
        scope: parsed.scope,
        subject: parsed.subject,
        body: parsed.body,
        breaking: parsed.breaking,
        author: commit.author_name,
        pr: this.extractPR(commit.message)
      };

      entry.commits.push(commitInfo);

      // Categorize for summary
      if (parsed.breaking) {
        entry.summary.breaking.push(`${parsed.scope ? `**${parsed.scope}**: ` : ''}${parsed.subject}`);
      }
      if (parsed.type === 'feat') {
        entry.summary.features.push(`${parsed.scope ? `**${parsed.scope}**: ` : ''}${parsed.subject}`);
      } else if (parsed.type === 'fix') {
        entry.summary.fixes.push(`${parsed.scope ? `**${parsed.scope}**: ` : ''}${parsed.subject}`);
      } else {
        entry.summary.other.push(`${parsed.type}: ${parsed.subject}`);
      }
    }

    return Array.from(grouped.values()).sort((a, b) => b.date.getTime() - a.date.getTime());
  }

  /**
   * Suggest improved commit message based on diff
   */
  async suggestCommitMessage(commitHash: string): Promise<ImprovedCommitMessage> {
    const diff = await this.getCommitDiff(commitHash);
    const original = diff.message;

    // Analyze the changes
    const fileTypes = new Set(diff.files.map(f => this.detectLanguage(f.filename)));
    const directories = new Set(diff.files.map(f => path.dirname(f.filename)));
    
    // Determine commit type
    let type = 'chore';
    let scope = '';
    let subject = '';
    let body: string[] = [];
    let reasoning = '';

    // Analyze file patterns
    const hasTests = diff.files.some(f => f.filename.includes('test') || f.filename.includes('spec'));
    const hasDocs = diff.files.some(f => f.filename.includes('README') || f.filename.includes('.md'));
    const hasConfig = diff.files.some(f => 
      f.filename.includes('config') || 
      f.filename.includes('.json') || 
      f.filename.includes('.yml')
    );

    // Detect type based on changes
    if (diff.files.every(f => f.status === 'added') && diff.files.length > 3) {
      type = 'feat';
      reasoning = 'Multiple new files suggest a new feature';
    } else if (hasTests && !hasDocs) {
      type = 'test';
      reasoning = 'Changes include test files';
    } else if (hasDocs && diff.files.length === 1) {
      type = 'docs';
      reasoning = 'Only documentation files changed';
    } else if (diff.message.toLowerCase().includes('fix')) {
      type = 'fix';
      reasoning = 'Original message indicates a fix';
    } else if (diff.stats.deletions > diff.stats.insertions * 2) {
      type = 'refactor';
      reasoning = 'Significant code removal suggests refactoring';
    }

    // Determine scope
    if (directories.size === 1) {
      scope = Array.from(directories)[0].split('/').filter(Boolean)[0] || '';
    } else if (fileTypes.size === 1) {
      scope = Array.from(fileTypes)[0];
    }

    // Generate subject
    const action = this.determineAction(diff);
    const target = this.determineTarget(diff);
    subject = `${action} ${target}`.toLowerCase();

    // Generate body based on significant changes
    if (diff.stats.filesChanged > 5) {
      body.push(`Modified ${diff.stats.filesChanged} files with ${diff.stats.insertions} insertions and ${diff.stats.deletions} deletions`);
    }

    if (diff.files.some(f => f.status === 'added')) {
      const added = diff.files.filter(f => f.status === 'added').map(f => f.filename);
      if (added.length <= 3) {
        body.push(`Added: ${added.join(', ')}`);
      }
    }

    // Build conventional commit message
    const suggested = `${type}${scope ? `(${scope})` : ''}: ${subject}${body.length ? '\n\n' + body.join('\n') : ''}`;

    return {
      original,
      suggested,
      type,
      scope,
      subject,
      body,
      reasoning,
      confidence: this.calculateConfidence(original, diff)
    };
  }

  /**
   * Find similar commits based on file overlap and content
   */
  async findSimilarCommits(commitHash: string, limit: number = 10): Promise<SimilarCommit[]> {
    const targetDiff = await this.getCommitDiff(commitHash);
    const targetFiles = new Set(targetDiff.files.map(f => f.filename));
    
    // Get recent commits
    const recentCommits = await this.git.log(['--max-count=1000']);
    const similarities: SimilarCommit[] = [];

    for (const commit of recentCommits.all) {
      if (commit.hash === commitHash) continue;

      try {
        const diff = await this.getCommitDiff(commit.hash);
        const commitFiles = new Set(diff.files.map(f => f.filename));
        
        // Calculate file overlap
        const overlap = Array.from(targetFiles).filter(f => commitFiles.has(f)).length;
        const fileOverlap = overlap / Math.max(targetFiles.size, commitFiles.size);

        // Calculate content similarity (simplified)
        const contentSimilarity = this.calculateContentSimilarity(
          targetDiff.message,
          diff.message
        );

        const score = (fileOverlap * 0.7) + (contentSimilarity * 0.3);

        if (score > 0.3) {
          const reasons = [];
          if (fileOverlap > 0.5) reasons.push(`${Math.round(fileOverlap * 100)}% file overlap`);
          if (contentSimilarity > 0.5) reasons.push('Similar commit message');
          if (diff.author === targetDiff.author) reasons.push('Same author');

          similarities.push({
            hash: commit.hash,
            message: commit.message,
            author: commit.author_name,
            date: new Date(commit.date),
            similarity: {
              score,
              fileOverlap,
              contentSimilarity,
              reasons
            }
          });
        }
      } catch (error) {
        // Skip commits that can't be analyzed
        continue;
      }
    }

    return similarities
      .sort((a, b) => b.similarity.score - a.similarity.score)
      .slice(0, limit);
  }

  /**
   * Generate release notes between two refs
   */
  async generateReleaseNotes(fromRef: string, toRef: string = 'HEAD'): Promise<ReleaseNotes> {
    const commits = await this.git.log([`${fromRef}..${toRef}`]);
    const fromDate = new Date((await this.git.log(['-1', fromRef])).latest?.date || '');
    const toDate = new Date((await this.git.log(['-1', toRef])).latest?.date || '');

    // Get diff summary
    const diffSummary = await this.git.diffSummary([fromRef, toRef]);

    // Analyze commits
    const changelog = await this.generateChangelog(fromRef, toRef);
    const contributors = new Map<string, typeof releaseNotes.contributors[0]>();

    // Process each commit
    for (const commit of commits.all) {
      const diff = await this.getCommitDiff(commit.hash).catch(() => null);
      if (!diff) continue;

      // Track contributors
      if (!contributors.has(diff.author)) {
        contributors.set(diff.author, {
          name: diff.author,
          commits: 0,
          additions: 0,
          deletions: 0
        });
      }

      const contributor = contributors.get(diff.author)!;
      contributor.commits++;
      contributor.additions += diff.stats.insertions;
      contributor.deletions += diff.stats.deletions;
    }

    // Extract highlights
    const highlights = {
      majorFeatures: [] as string[],
      improvements: [] as string[],
      bugFixes: [] as string[],
      breakingChanges: [] as string[]
    };

    for (const entry of changelog) {
      highlights.majorFeatures.push(...entry.summary.features.slice(0, 3));
      highlights.bugFixes.push(...entry.summary.fixes.slice(0, 5));
      highlights.breakingChanges.push(...entry.summary.breaking);
    }

    const releaseNotes: ReleaseNotes = {
      fromRef,
      toRef,
      period: {
        from: fromDate,
        to: toDate
      },
      summary: {
        commits: commits.total,
        contributors: contributors.size,
        filesChanged: diffSummary.files.length,
        additions: diffSummary.insertions,
        deletions: diffSummary.deletions
      },
      highlights,
      contributors: Array.from(contributors.values())
        .sort((a, b) => b.commits - a.commits),
      changelog
    };

    return releaseNotes;
  }

  // Helper methods
  private mapFileStatus(file: any): FileDiff['status'] {
    if (file.binary) return 'modified';
    if (file.rename) return 'renamed';
    if (file.deletions === 0 && file.insertions > 0) return 'added';
    if (file.insertions === 0 && file.deletions > 0) return 'deleted';
    return 'modified';
  }

  private detectLanguage(filename: string): string {
    const ext = path.extname(filename).toLowerCase();
    const languageMap: Record<string, string> = {
      '.ts': 'typescript',
      '.js': 'javascript',
      '.py': 'python',
      '.java': 'java',
      '.go': 'go',
      '.rs': 'rust',
      '.cpp': 'cpp',
      '.c': 'c',
      '.cs': 'csharp',
      '.rb': 'ruby',
      '.php': 'php',
      '.swift': 'swift',
      '.kt': 'kotlin',
      '.md': 'markdown',
      '.json': 'json',
      '.yml': 'yaml',
      '.yaml': 'yaml',
      '.xml': 'xml',
      '.html': 'html',
      '.css': 'css',
      '.scss': 'scss',
      '.sql': 'sql',
      '.sh': 'shell',
      '.bash': 'shell'
    };
    return languageMap[ext] || 'text';
  }

  private parseCommitMessage(message: string): any {
    // Parse conventional commit format
    const conventionalRegex = /^(\w+)(?:\(([^)]+)\))?: (.+)$/;
    const match = message.match(conventionalRegex);

    if (match) {
      const [, type, scope, subject] = match;
      const bodyLines = message.split('\n').slice(1).filter(Boolean);
      const breaking = bodyLines.some(line => 
        line.startsWith('BREAKING CHANGE:') || line.includes('BREAKING:')
      );

      return {
        type: type as any,
        scope,
        subject,
        body: bodyLines.length ? bodyLines.join('\n') : undefined,
        breaking
      };
    }

    // Fallback parsing
    return {
      type: 'chore' as const,
      scope: undefined,
      subject: message.split('\n')[0],
      body: undefined,
      breaking: false
    };
  }

  private extractPR(message: string): string | undefined {
    const prMatch = message.match(/#(\d+)/);
    return prMatch ? prMatch[1] : undefined;
  }

  private determineAction(diff: CommitDiff): string {
    if (diff.files.every(f => f.status === 'added')) return 'add';
    if (diff.files.every(f => f.status === 'deleted')) return 'remove';
    if (diff.files.some(f => f.status === 'added')) return 'implement';
    if (diff.stats.deletions > diff.stats.insertions) return 'refactor';
    return 'update';
  }

  private determineTarget(diff: CommitDiff): string {
    const extensions = diff.files.map(f => path.extname(f.filename));
    if (extensions.every(e => e === '.md')) return 'documentation';
    if (extensions.some(e => ['.test.ts', '.spec.ts', '.test.js'].includes(e))) return 'tests';
    if (diff.files.length === 1) return path.basename(diff.files[0].filename, path.extname(diff.files[0].filename));
    
    const dirs = diff.files.map(f => f.filename.split('/')[0]);
    const commonDir = dirs.every(d => d === dirs[0]) ? dirs[0] : 'multiple modules';
    return commonDir;
  }

  private calculateConfidence(original: string, diff: CommitDiff): number {
    let confidence = 0.5;
    
    // Higher confidence if original follows conventional format
    if (original.match(/^(\w+)(\([\w\s]+\))?: .+/)) confidence += 0.2;
    
    // Lower confidence for very short messages
    if (original.length < 20) confidence -= 0.1;
    
    // Higher confidence for clear patterns
    if (diff.files.every(f => f.status === 'added')) confidence += 0.1;
    if (diff.files.every(f => f.filename.includes('test'))) confidence += 0.1;
    
    return Math.max(0.1, Math.min(1, confidence));
  }

  private calculateContentSimilarity(text1: string, text2: string): number {
    const words1 = text1.toLowerCase().split(/\s+/);
    const words2 = text2.toLowerCase().split(/\s+/);
    
    const set1 = new Set(words1);
    const set2 = new Set(words2);
    
    const intersection = Array.from(set1).filter(w => set2.has(w)).length;
    const union = set1.size + set2.size - intersection;
    
    return union > 0 ? intersection / union : 0;
  }
}