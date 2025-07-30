import simpleGit, { SimpleGit } from 'simple-git';
import { CodeOwnership, CommitPattern } from './types.js';
import path from 'path';
import fs from 'fs-extra';

export class CodeOwnershipAnalyzer {
  private git: SimpleGit;
  private repoPath: string;

  constructor(repoPath: string) {
    this.repoPath = repoPath;
    this.git = simpleGit(repoPath);
  }

  /**
   * Analyze code ownership for specific files or directories
   */
  async analyzeOwnership(targetPath: string = '.'): Promise<CodeOwnership[]> {
    const files = await this.getFilesInPath(targetPath);
    const ownership: CodeOwnership[] = [];

    for (const file of files) {
      try {
        const fileOwnership = await this.analyzeFileOwnership(file);
        if (fileOwnership) {
          ownership.push(fileOwnership);
        }
      } catch (error) {
        // Skip files that can't be analyzed
        continue;
      }
    }

    return ownership;
  }

  /**
   * Analyze ownership of a single file
   */
  private async analyzeFileOwnership(filePath: string): Promise<CodeOwnership | null> {
    // Get blame information
    const blameData = await this.git.raw(['blame', '--line-porcelain', filePath]).catch(() => null);
    if (!blameData) return null;

    // Parse blame data
    const contributors = new Map<string, {
      name: string;
      email: string;
      commits: Set<string>;
      lines: number;
      lastModified: Date;
    }>();

    const lines = blameData.split('\n');
    let currentCommit = '';
    let currentAuthor = '';
    let currentEmail = '';
    let currentDate = '';

    for (const line of lines) {
      if (line.match(/^[0-9a-f]{40}/)) {
        currentCommit = line.split(' ')[0];
      } else if (line.startsWith('author ')) {
        currentAuthor = line.substring(7);
      } else if (line.startsWith('author-mail ')) {
        currentEmail = line.substring(12).replace(/[<>]/g, '');
      } else if (line.startsWith('author-time ')) {
        currentDate = new Date(parseInt(line.substring(12)) * 1000).toISOString();
      } else if (line.startsWith('\t')) {
        // This is an actual code line
        const key = `${currentAuthor}|${currentEmail}`;
        
        if (!contributors.has(key)) {
          contributors.set(key, {
            name: currentAuthor,
            email: currentEmail,
            commits: new Set(),
            lines: 0,
            lastModified: new Date(currentDate)
          });
        }

        const contributor = contributors.get(key)!;
        contributor.commits.add(currentCommit);
        contributor.lines++;
        
        const modDate = new Date(currentDate);
        if (modDate > contributor.lastModified) {
          contributor.lastModified = modDate;
        }
      }
    }

    // Calculate total lines
    const totalLines = Array.from(contributors.values()).reduce((sum, c) => sum + c.lines, 0);
    if (totalLines === 0) return null;

    // Find primary owner
    const sortedContributors = Array.from(contributors.values())
      .sort((a, b) => b.lines - a.lines);
    
    const primaryOwner = sortedContributors[0];

    // Analyze expertise based on file type and content
    const expertise = this.analyzeExpertise(filePath);

    return {
      file: filePath,
      primaryOwner: {
        name: primaryOwner.name,
        email: primaryOwner.email,
        percentage: Math.round((primaryOwner.lines / totalLines) * 100),
        lastModified: primaryOwner.lastModified
      },
      contributors: sortedContributors.map(c => ({
        name: c.name,
        email: c.email,
        commits: c.commits.size,
        linesContributed: c.lines,
        percentage: Math.round((c.lines / totalLines) * 100)
      })),
      expertise
    };
  }

  /**
   * Analyze commit patterns for developers
   */
  async analyzeCommitPatterns(author?: string, days: number = 90): Promise<CommitPattern[]> {
    const since = new Date();
    since.setDate(since.getDate() - days);
    
    const logArgs = ['--all', `--since=${since.toISOString()}`];
    if (author) {
      logArgs.push(`--author=${author}`);
    }

    const commits = await this.git.log(logArgs);
    
    // Group commits by author
    const authorCommits = new Map<string, any[]>();
    
    for (const commit of commits.all) {
      const author = commit.author_name;
      if (!authorCommits.has(author)) {
        authorCommits.set(author, []);
      }
      authorCommits.get(author)!.push(commit);
    }

    const patterns: CommitPattern[] = [];

    for (const [authorName, commits] of authorCommits.entries()) {
      const pattern = await this.analyzeAuthorPatterns(authorName, commits);
      patterns.push(pattern);
    }

    return patterns.sort((a, b) => 
      b.productivity.avgCommitsPerDay - a.productivity.avgCommitsPerDay
    );
  }

  private async analyzeAuthorPatterns(author: string, commits: any[]): Promise<CommitPattern> {
    // Initialize frequency arrays
    const hourly = new Array(24).fill(0);
    const daily = new Array(7).fill(0);
    const weekly = new Array(52).fill(0);
    
    const sizes: number[] = [];
    const fileTypes = new Map<string, number>();
    const commitTypes = new Map<string, number>();

    for (const commit of commits) {
      const date = new Date(commit.date);
      
      // Track time patterns
      hourly[date.getHours()]++;
      daily[date.getDay()]++;
      weekly[Math.floor((date.getTime() - new Date(date.getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000))]++;

      // Analyze commit type
      const type = this.detectCommitType(commit.message);
      commitTypes.set(type, (commitTypes.get(type) || 0) + 1);

      // Get commit size
      try {
        const diff = await this.git.diffSummary([`${commit.hash}^`, commit.hash]).catch(() => null);
        if (diff) {
          sizes.push(diff.insertions + diff.deletions);
          
          // Track file types
          for (const file of diff.files) {
            const ext = path.extname(file.file);
            if (ext) {
              fileTypes.set(ext, (fileTypes.get(ext) || 0) + 1);
            }
          }
        }
      } catch {
        // Skip if can't get diff
      }
    }

    // Calculate statistics
    const avgSize = sizes.length ? sizes.reduce((a, b) => a + b, 0) / sizes.length : 0;
    const medianSize = sizes.length ? sizes.sort((a, b) => a - b)[Math.floor(sizes.length / 2)] : 0;
    
    // Find peak hours and days
    const peakHours = hourly
      .map((count, hour) => ({ hour, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
      .map(x => x.hour);

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const peakDays = daily
      .map((count, day) => ({ day: dayNames[day], count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
      .map(x => x.day);

    // Calculate productivity metrics
    const totalDays = Math.ceil((new Date().getTime() - new Date(commits[commits.length - 1].date).getTime()) / (24 * 60 * 60 * 1000));
    const avgCommitsPerDay = commits.length / totalDays;
    const avgLinesPerCommit = avgSize;

    return {
      author,
      patterns: {
        commitFrequency: {
          daily,
          weekly,
          hourly
        },
        commitSize: {
          average: Math.round(avgSize),
          median: Math.round(medianSize),
          large: sizes.filter(s => s > avgSize * 2).length,
          small: sizes.filter(s => s < avgSize / 2).length
        },
        fileTypes: Object.fromEntries(
          Array.from(fileTypes.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10)
        ),
        commitTypes: Object.fromEntries(fileTypes.entries())
      },
      productivity: {
        avgCommitsPerDay,
        avgLinesPerCommit: Math.round(avgLinesPerCommit),
        peakHours,
        peakDays
      }
    };
  }

  private async getFilesInPath(targetPath: string): Promise<string[]> {
    const fullPath = path.join(this.repoPath, targetPath);
    
    if (await fs.pathExists(fullPath)) {
      const stat = await fs.stat(fullPath);
      
      if (stat.isFile()) {
        return [targetPath];
      } else if (stat.isDirectory()) {
        // Use git ls-files to get tracked files only
        const files = await this.git.raw(['ls-files', targetPath]);
        return files.split('\n').filter(Boolean);
      }
    }

    return [];
  }

  private analyzeExpertise(filePath: string): CodeOwnership['expertise'] {
    const ext = path.extname(filePath).toLowerCase();
    const basename = path.basename(filePath);
    const dirPath = path.dirname(filePath);
    
    const expertise: CodeOwnership['expertise'] = [];

    // Language expertise
    const language = this.getLanguageFromExt(ext);
    if (language) {
      expertise.push({ domain: language, score: 1.0 });
    }

    // Domain expertise based on directory
    if (dirPath.includes('test') || basename.includes('test') || basename.includes('spec')) {
      expertise.push({ domain: 'testing', score: 0.9 });
    }
    if (dirPath.includes('api') || dirPath.includes('endpoint')) {
      expertise.push({ domain: 'api', score: 0.8 });
    }
    if (dirPath.includes('frontend') || dirPath.includes('ui') || ['.tsx', '.jsx', '.vue'].includes(ext)) {
      expertise.push({ domain: 'frontend', score: 0.8 });
    }
    if (dirPath.includes('backend') || dirPath.includes('server')) {
      expertise.push({ domain: 'backend', score: 0.8 });
    }
    if (basename.includes('config') || ['.json', '.yml', '.yaml', '.toml'].includes(ext)) {
      expertise.push({ domain: 'configuration', score: 0.7 });
    }
    if (dirPath.includes('docs') || ext === '.md') {
      expertise.push({ domain: 'documentation', score: 0.7 });
    }

    return expertise;
  }

  private getLanguageFromExt(ext: string): string | null {
    const languageMap: Record<string, string> = {
      '.ts': 'typescript',
      '.js': 'javascript',
      '.py': 'python',
      '.java': 'java',
      '.go': 'golang',
      '.rs': 'rust',
      '.cpp': 'cpp',
      '.c': 'c',
      '.cs': 'csharp',
      '.rb': 'ruby',
      '.php': 'php',
      '.swift': 'swift',
      '.kt': 'kotlin'
    };
    return languageMap[ext] || null;
  }

  private detectCommitType(message: string): string {
    const lower = message.toLowerCase();
    
    if (lower.includes('feat') || lower.includes('add') || lower.includes('implement')) {
      return 'feature';
    } else if (lower.includes('fix') || lower.includes('bug') || lower.includes('patch')) {
      return 'fix';
    } else if (lower.includes('refactor') || lower.includes('restructure')) {
      return 'refactor';
    } else if (lower.includes('test') || lower.includes('spec')) {
      return 'test';
    } else if (lower.includes('docs') || lower.includes('documentation')) {
      return 'docs';
    } else if (lower.includes('style') || lower.includes('format')) {
      return 'style';
    } else if (lower.includes('chore') || lower.includes('maintenance')) {
      return 'chore';
    }
    
    return 'other';
  }
}