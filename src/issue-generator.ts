import { FeatureBranch, DetailedIssueData, Contributor, IssueGenerationConfig } from './types.js';

export class IssueGenerator {
  private config: IssueGenerationConfig;

  constructor(config: Partial<IssueGenerationConfig> = {}) {
    this.config = {
      sinceDays: 90,
      filterProcessed: true,
      includeCodeDiffs: true,
      maxDiffSize: 5000,
      defaultState: 'closed',
      defaultLabels: ['feature', 'automated'],
      timeEstimateMultiplier: 1.0,
      ...config
    };
  }

  /**
   * Generate comprehensive issue data from a feature branch
   */
  generateIssueData(branch: FeatureBranch): DetailedIssueData {
    const contributors = this.formatContributors(branch.contributors);
    const changeSummary = this.calculateChangeSummary(branch);
    const overview = this.generateOverview(branch);
    const keyFeatures = this.extractKeyFeatures(branch);
    const technicalImplementation = this.analyzeTechnicalImplementation(branch);
    const benefits = this.identifyBenefits(branch);
    const timeEstimate = this.estimateTime(branch, changeSummary);
    const codeDiffs = this.config.includeCodeDiffs ? this.extractCodeDiffs(branch) : undefined;
    const labels = this.generateLabels(branch);

    return {
      // Core Information
      title: this.generateTitle(branch),
      description: this.generateFullDescription(branch, contributors, changeSummary, overview, keyFeatures, technicalImplementation, benefits, timeEstimate, codeDiffs),
      
      // Branch Information
      branch: branch.name,
      mergeCommitHash: branch.mergeCommit.hash,
      mergedDate: branch.mergedDate.toISOString(),
      
      // Contributors
      contributors,
      
      // Change Summary
      changeSummary,
      
      // Overview and Analysis
      overview,
      keyFeatures,
      technicalImplementation,
      benefits,
      
      // Time Estimate
      timeEstimate,
      
      // Code Diffs
      codeDiffs,
      
      // Issue Integration
      labels,
      state: this.config.defaultState,
      
      // Tracking
      processedCommitIds: [branch.mergeCommit.hash, ...branch.commits.map(c => c.hash)]
    };
  }

  private generateTitle(branch: FeatureBranch): string {
    // Extract meaningful title from branch name and commits
    const branchWords = branch.name.split(/[-_]/).filter(w => w.length > 2);
    const firstCommitMessage = branch.commits[0]?.message || branch.mergeCommit.message;
    
    // Try to extract a good title from the first commit or merge message
    const cleanMessage = firstCommitMessage.split('\n')[0].trim();
    if (cleanMessage.length > 10 && cleanMessage.length < 100) {
      return cleanMessage;
    }
    
    // Otherwise, create title from branch name
    return branchWords.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }

  private formatContributors(contributors: Contributor[]): DetailedIssueData['contributors'] {
    return contributors.map(c => ({
      name: c.name,
      role: c.role,
      commits: c.commitCount,
      linesChanged: c.linesAdded + c.linesRemoved
    }));
  }

  private calculateChangeSummary(branch: FeatureBranch): DetailedIssueData['changeSummary'] {
    const filesModified = new Set<string>();
    let linesAdded = 0;
    let linesRemoved = 0;

    branch.commits.forEach(commit => {
      commit.changes.filesChanged.forEach(file => filesModified.add(file));
      linesAdded += commit.changes.insertions;
      linesRemoved += commit.changes.deletions;
    });

    return {
      filesModified: filesModified.size,
      linesAdded,
      linesRemoved,
      totalChanges: linesAdded + linesRemoved,
      commits: branch.commits.length
    };
  }

  private generateOverview(branch: FeatureBranch): string {
    const { filesModified, linesAdded, linesRemoved } = this.calculateChangeSummary(branch);
    
    // Determine the type of change
    let changeType = 'feature implementation';
    if (branch.name.includes('fix') || branch.name.includes('bug')) {
      changeType = 'bug fix';
    } else if (branch.name.includes('refactor')) {
      changeType = 'refactoring';
    } else if (linesRemoved > linesAdded * 1.5) {
      changeType = 'code cleanup';
    } else if (filesModified > 50) {
      changeType = 'major feature implementation';
    }

    const overview = `This ${changeType} modifies ${filesModified} files with ${linesAdded.toLocaleString()} additions and ${linesRemoved.toLocaleString()} deletions. `;
    
    // Add context from commit messages
    const commitThemes = this.analyzeCommitThemes(branch);
    if (commitThemes.length > 0) {
      return overview + `The changes focus on ${commitThemes.join(', ')}.`;
    }
    
    return overview;
  }

  private analyzeCommitThemes(branch: FeatureBranch): string[] {
    const themes = new Set<string>();
    const allChanges = branch.commits.flatMap(c => c.changes.summary);
    
    // Analyze patterns in changes
    allChanges.forEach(change => {
      if (change.includes('configuration')) themes.add('configuration management');
      if (change.includes('infrastructure')) themes.add('infrastructure automation');
      if (change.includes('security')) themes.add('security enhancements');
      if (change.includes('performance')) themes.add('performance optimization');
      if (change.includes('documentation')) themes.add('documentation updates');
      if (change.includes('testing')) themes.add('test coverage');
    });

    return Array.from(themes).slice(0, 3);
  }

  private extractKeyFeatures(branch: FeatureBranch): string[] {
    const features: string[] = [];
    
    // Analyze file patterns
    const files = branch.commits.flatMap(c => c.changes.filesChanged);
    const filePatterns = this.analyzeFilePatterns(files);
    
    // Extract features based on patterns
    if (filePatterns.ansible) features.push('Ansible automation updates');
    if (filePatterns.docker) features.push('Container configuration changes');
    if (filePatterns.kubernetes) features.push('Kubernetes deployment updates');
    if (filePatterns.security) features.push('Security configuration improvements');
    if (filePatterns.monitoring) features.push('Monitoring and logging enhancements');
    if (filePatterns.database) features.push('Database schema or configuration changes');
    if (filePatterns.api) features.push('API endpoint modifications');
    if (filePatterns.ui) features.push('User interface improvements');
    
    // Add custom features from branch analysis
    if (branch.keyTakeaways) {
      features.push(...branch.keyTakeaways);
    }
    
    return features.slice(0, 5);
  }

  private analyzeFilePatterns(files: string[]): Record<string, boolean> {
    return {
      ansible: files.some(f => f.includes('ansible') || f.includes('playbook') || f.endsWith('.yml')),
      docker: files.some(f => f.includes('docker') || f.includes('Dockerfile') || f.includes('compose')),
      kubernetes: files.some(f => f.includes('k8s') || f.includes('kubernetes') || f.includes('helm')),
      security: files.some(f => f.includes('security') || f.includes('auth') || f.includes('cert')),
      monitoring: files.some(f => f.includes('monitoring') || f.includes('logging') || f.includes('metrics')),
      database: files.some(f => f.includes('db') || f.includes('database') || f.includes('migration')),
      api: files.some(f => f.includes('api') || f.includes('endpoint') || f.includes('route')),
      ui: files.some(f => f.includes('ui') || f.includes('frontend') || f.includes('component'))
    };
  }

  private analyzeTechnicalImplementation(branch: FeatureBranch): string[] {
    const implementation: string[] = [];
    
    // Analyze commit changes
    branch.commits.forEach(commit => {
      const tech = this.extractTechnicalDetails(commit.changes);
      tech.forEach(t => {
        if (!implementation.includes(t)) {
          implementation.push(t);
        }
      });
    });
    
    return implementation.slice(0, 6);
  }

  private extractTechnicalDetails(changes: any): string[] {
    const details: string[] = [];
    
    // Analyze file changes
    changes.fileChanges.forEach((change: any) => {
      const ext = change.filename.split('.').pop()?.toLowerCase();
      const path = change.filename.toLowerCase();
      
      // Language-specific implementations
      if (ext === 'py') details.push('Python script modifications');
      if (ext === 'js' || ext === 'ts') details.push('JavaScript/TypeScript updates');
      if (ext === 'yml' || ext === 'yaml') {
        if (path.includes('playbook')) details.push('Ansible playbook configuration');
        else details.push('YAML configuration updates');
      }
      if (ext === 'sh' || ext === 'bash') details.push('Shell script automation');
      if (ext === 'sql') details.push('Database query modifications');
      if (ext === 'tf') details.push('Terraform infrastructure as code');
      
      // Pattern-based implementations
      if (path.includes('test')) details.push('Test coverage improvements');
      if (path.includes('config')) details.push('Configuration management');
      if (path.includes('deploy')) details.push('Deployment automation');
      if (path.includes('monitor')) details.push('Monitoring setup');
    });
    
    return [...new Set(details)];
  }

  private identifyBenefits(branch: FeatureBranch): string[] {
    const benefits: string[] = [];
    const { filesModified, linesAdded, linesRemoved } = this.calculateChangeSummary(branch);
    
    // Analyze based on change patterns
    if (branch.name.includes('fix') || branch.name.includes('bug')) {
      benefits.push('Improved system stability');
      benefits.push('Reduced error rates');
    }
    
    if (branch.name.includes('performance') || branch.name.includes('optimize')) {
      benefits.push('Enhanced performance');
      benefits.push('Reduced resource consumption');
    }
    
    if (branch.name.includes('security')) {
      benefits.push('Enhanced security posture');
      benefits.push('Compliance improvements');
    }
    
    if (linesRemoved > linesAdded) {
      benefits.push('Reduced code complexity');
      benefits.push('Improved maintainability');
    }
    
    if (filesModified > 20) {
      benefits.push('Comprehensive feature coverage');
      benefits.push('Systematic improvements across components');
    }
    
    // Add generic benefits based on scale
    if (linesAdded > 1000) {
      benefits.push('Major capability enhancement');
    }
    
    if (branch.commits.length > 5) {
      benefits.push('Iterative development with multiple improvements');
    }
    
    return [...new Set(benefits)].slice(0, 4);
  }

  private estimateTime(branch: FeatureBranch, changeSummary: DetailedIssueData['changeSummary']): DetailedIssueData['timeEstimate'] {
    // Base estimation logic
    const baseHours = this.calculateBaseHours(changeSummary);
    const complexityMultiplier = this.calculateComplexity(branch);
    
    const estimatedHours = Math.ceil(baseHours * complexityMultiplier * this.config.timeEstimateMultiplier);
    const minHours = Math.max(4, Math.floor(estimatedHours * 0.8));
    const maxHours = Math.ceil(estimatedHours * 1.2);
    
    // Break down tasks
    const breakdown = this.generateTaskBreakdown(branch, estimatedHours);
    
    return {
      minHours,
      maxHours,
      breakdown
    };
  }

  private calculateBaseHours(changeSummary: DetailedIssueData['changeSummary']): number {
    // Simple heuristic: 1 hour per 100 lines changed, minimum 4 hours
    const linesPerHour = 100;
    const baseHours = changeSummary.totalChanges / linesPerHour;
    
    // Adjust for file count
    const fileHours = changeSummary.filesModified * 0.5;
    
    return Math.max(4, baseHours + fileHours);
  }

  private calculateComplexity(branch: FeatureBranch): number {
    let complexity = 1.0;
    
    // Increase complexity for certain patterns
    if (branch.name.includes('refactor')) complexity *= 1.3;
    if (branch.name.includes('migrate')) complexity *= 1.5;
    if (branch.contributors.length > 3) complexity *= 1.2;
    if (branch.commits.length > 10) complexity *= 1.1;
    
    // Check for complex file types
    const files = branch.commits.flatMap(c => c.changes.filesChanged);
    if (files.some(f => f.includes('database') || f.includes('schema'))) complexity *= 1.3;
    if (files.some(f => f.includes('security') || f.includes('auth'))) complexity *= 1.2;
    
    return complexity;
  }

  private generateTaskBreakdown(branch: FeatureBranch, totalHours: number): { task: string; hours: number }[] {
    const breakdown: { task: string; hours: number }[] = [];
    const remainingHours = totalHours;
    
    // Standard task distribution
    const taskDistribution = [
      { task: 'Requirements analysis and design', percentage: 0.15 },
      { task: 'Implementation and coding', percentage: 0.40 },
      { task: 'Testing and validation', percentage: 0.20 },
      { task: 'Code review and refactoring', percentage: 0.15 },
      { task: 'Documentation and deployment', percentage: 0.10 }
    ];
    
    // Adjust based on branch characteristics
    if (branch.name.includes('fix') || branch.name.includes('bug')) {
      taskDistribution[0].percentage = 0.10; // Less design for fixes
      taskDistribution[2].percentage = 0.30; // More testing for fixes
    }
    
    if (branch.name.includes('doc')) {
      taskDistribution[4].percentage = 0.40; // More documentation
      taskDistribution[1].percentage = 0.20; // Less coding
    }
    
    // Calculate hours
    taskDistribution.forEach(({ task, percentage }) => {
      const hours = Math.ceil(totalHours * percentage);
      if (hours > 0) {
        breakdown.push({ task, hours });
      }
    });
    
    return breakdown;
  }

  private extractCodeDiffs(branch: FeatureBranch): DetailedIssueData['codeDiffs'] {
    const diffs: DetailedIssueData['codeDiffs'] = [];
    
    // Get most significant changes
    const significantChanges = branch.commits
      .flatMap(c => c.changes.fileChanges)
      .filter(change => change.patch && (change.insertions + change.deletions) > 10)
      .sort((a, b) => (b.insertions + b.deletions) - (a.insertions + a.deletions))
      .slice(0, 5);
    
    significantChanges.forEach(change => {
      if (change.patch && change.patch.length < this.config.maxDiffSize) {
        diffs.push({
          file: change.filename,
          changes: this.formatDiff(change.patch),
          analysis: this.analyzeDiff(change)
        });
      }
    });
    
    return diffs;
  }

  private formatDiff(patch: string): string {
    const lines = patch.split('\n');
    const formattedLines = lines
      .filter(line => !line.startsWith('diff --git') && !line.startsWith('index'))
      .slice(0, 50); // Limit to 50 lines
    
    if (lines.length > 50) {
      formattedLines.push('... (diff truncated)');
    }
    
    return formattedLines.join('\n');
  }

  private analyzeDiff(change: any): string {
    const analyses: string[] = [];
    
    if (change.status === 'added') {
      analyses.push(`New file added with ${change.insertions} lines`);
    } else if (change.status === 'deleted') {
      analyses.push(`File removed (${change.deletions} lines)`);
    } else if (change.status === 'modified') {
      const ratio = change.insertions / (change.deletions || 1);
      if (ratio > 2) {
        analyses.push('Significant additions to existing file');
      } else if (ratio < 0.5) {
        analyses.push('Code cleanup and removal');
      } else {
        analyses.push('Balanced modifications');
      }
    }
    
    // Analyze file type
    const ext = change.filename.split('.').pop()?.toLowerCase();
    if (ext === 'yml' || ext === 'yaml') {
      analyses.push('Configuration changes');
    } else if (ext === 'py' || ext === 'js' || ext === 'ts') {
      analyses.push('Code logic modifications');
    }
    
    return analyses.join('. ');
  }

  private generateLabels(branch: FeatureBranch): string[] {
    const labels = [...this.config.defaultLabels];
    
    // Add labels based on branch name
    if (branch.name.includes('fix') || branch.name.includes('bug')) {
      labels.push('bugfix');
    } else if (branch.name.includes('feature')) {
      labels.push('feature');
    } else if (branch.name.includes('refactor')) {
      labels.push('refactoring');
    }
    
    // Add labels based on technology
    const files = branch.commits.flatMap(c => c.changes.filesChanged);
    const patterns = this.analyzeFilePatterns(files);
    
    if (patterns.ansible) labels.push('ansible');
    if (patterns.docker) labels.push('docker');
    if (patterns.kubernetes) labels.push('kubernetes');
    if (patterns.security) labels.push('security');
    if (patterns.database) labels.push('database');
    
    // Add size labels
    const { totalChanges } = this.calculateChangeSummary(branch);
    if (totalChanges < 100) labels.push('size/small');
    else if (totalChanges < 500) labels.push('size/medium');
    else if (totalChanges < 2000) labels.push('size/large');
    else labels.push('size/xlarge');
    
    return [...new Set(labels)];
  }

  private generateFullDescription(
    branch: FeatureBranch,
    contributors: DetailedIssueData['contributors'],
    changeSummary: DetailedIssueData['changeSummary'],
    overview: string,
    keyFeatures: string[],
    technicalImplementation: string[],
    benefits: string[],
    timeEstimate: DetailedIssueData['timeEstimate'],
    codeDiffs?: DetailedIssueData['codeDiffs']
  ): string {
    const sections: string[] = [];
    
    // Header
    sections.push(`## Feature Branch: ${branch.name}`);
    sections.push('');
    sections.push(`**Merged:** ${branch.mergedDate.toLocaleDateString()}`);
    sections.push(`**Merge Commit:** ${branch.mergeCommit.hash}`);
    sections.push(`**Author:** ${branch.mergeCommit.author}`);
    sections.push('');
    
    // Contributors
    sections.push('### Contributors');
    sections.push('| Name | Role | Commits | Lines Changed |');
    sections.push('|------|------|---------|---------------|');
    contributors.forEach(c => {
      sections.push(`| ${c.name} | ${c.role} | ${c.commits} | ${c.linesChanged} |`);
    });
    sections.push('');
    
    // Change Summary
    sections.push('### Changes Summary');
    sections.push(`- **Files Modified:** ${changeSummary.filesModified}`);
    sections.push(`- **Lines Added:** ${changeSummary.linesAdded}`);
    sections.push(`- **Lines Removed:** ${changeSummary.linesRemoved}`);
    sections.push(`- **Total Changes:** ${changeSummary.totalChanges} lines`);
    sections.push(`- **Commits:** ${changeSummary.commits}`);
    sections.push('');
    
    // Overview
    sections.push('### Overview');
    sections.push(overview);
    sections.push('');
    
    // Key Features
    if (keyFeatures.length > 0) {
      sections.push('### Key Features');
      keyFeatures.forEach(feature => {
        sections.push(`- ${feature}`);
      });
      sections.push('');
    }
    
    // Technical Implementation
    if (technicalImplementation.length > 0) {
      sections.push('### Technical Implementation');
      technicalImplementation.forEach(tech => {
        sections.push(`- ${tech}`);
      });
      sections.push('');
    }
    
    // Benefits
    if (benefits.length > 0) {
      sections.push('### Benefits');
      benefits.forEach(benefit => {
        sections.push(`- ${benefit}`);
      });
      sections.push('');
    }
    
    // Time Estimate
    sections.push('### Time Estimate');
    sections.push(`**Estimated Development Time:** ${timeEstimate.minHours}-${timeEstimate.maxHours} hours`);
    sections.push('');
    sections.push('This estimate includes:');
    timeEstimate.breakdown.forEach(({ task, hours }) => {
      sections.push(`- ${task} (${hours} hours)`);
    });
    sections.push('');
    
    // Code Diffs
    if (codeDiffs && codeDiffs.length > 0) {
      sections.push('### Key Code Changes');
      codeDiffs.forEach(diff => {
        sections.push(`#### ${diff.file}`);
        sections.push(`*${diff.analysis}*`);
        sections.push('```diff');
        sections.push(diff.changes);
        sections.push('```');
        sections.push('');
      });
    }
    
    return sections.join('\n');
  }
}