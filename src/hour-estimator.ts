import { FeatureBranch, GitCommit, CommitChanges, HourEstimate } from './types.js';
import { simpleGit } from 'simple-git';
import path from 'path';

/**
 * Enhanced hour estimation system based on task complexity analysis
 * and code pattern detection rather than simple line counting
 */
export class HourEstimator {
  private repoPath: string;
  private git: ReturnType<typeof simpleGit>;

  constructor(repoPath: string) {
    this.repoPath = repoPath;
    this.git = simpleGit(repoPath);
  }

  /**
   * Estimate development hours including research, development, testing, and documentation
   */
  async estimateHours(branch: FeatureBranch): Promise<HourEstimate> {
    try {
      const category = this.categorizeTask(branch);
      const complexity = await this.analyzeComplexity(branch);
      const copiedCodeAnalysis = await this.analyzeCopiedCode(branch);
      
      // Base development hours by category and complexity
      const baseHours = this.getBaseHours(category, complexity);
      
      // Adjust for copied code with integration complexity factor
      const integrationFactor = this.getIntegrationComplexityFactor(category, complexity, copiedCodeAnalysis.percentage);
      const originalWorkHours = Math.round(baseHours * integrationFactor);
      
      // Break down into specific phases
      const phaseBreakdown = this.calculatePhaseHours(originalWorkHours, complexity, category);
      
      // Add review overhead
      const reviewOverhead = this.getReviewOverhead(complexity, category);
      const reviewHours = Math.round(originalWorkHours * reviewOverhead);
      
      const totalHours = phaseBreakdown.researchHours + phaseBreakdown.developmentHours + 
                        phaseBreakdown.testingHours + phaseBreakdown.documentationHours + reviewHours;
      
      return {
        researchHours: phaseBreakdown.researchHours,
        developmentHours: phaseBreakdown.developmentHours,
        testingHours: phaseBreakdown.testingHours,
        documentationHours: phaseBreakdown.documentationHours,
        reviewHours,
        totalHours,
        complexity,
        category,
        copiedCodePercentage: copiedCodeAnalysis.percentage,
        originalWorkHours
      };
    } catch (error) {
      console.warn(`Error estimating hours for ${branch.name}:`, error);
      return this.getFallbackEstimate(branch);
    }
  }

  /**
   * Calculate breakdown of hours across research, development, testing, and documentation phases
   */
  private calculatePhaseHours(originalWorkHours: number, complexity: 'low' | 'medium' | 'high', category: string): {
    researchHours: number;
    developmentHours: number;
    testingHours: number;
    documentationHours: number;
  } {
    // Phase distribution percentages based on category and complexity
    const phaseDistributions: Record<string, Record<string, { research: number; development: number; testing: number; documentation: number }>> = {
      'Security Architecture': {
        low: { research: 0.25, development: 0.50, testing: 0.15, documentation: 0.10 },
        medium: { research: 0.30, development: 0.45, testing: 0.15, documentation: 0.10 },
        high: { research: 0.35, development: 0.40, testing: 0.15, documentation: 0.10 }
      },
      'Infrastructure Setup': {
        low: { research: 0.20, development: 0.55, testing: 0.15, documentation: 0.10 },
        medium: { research: 0.25, development: 0.50, testing: 0.15, documentation: 0.10 },
        high: { research: 0.30, development: 0.45, testing: 0.15, documentation: 0.10 }
      },
      'VDI Systems': {
        low: { research: 0.15, development: 0.60, testing: 0.15, documentation: 0.10 },
        medium: { research: 0.20, development: 0.55, testing: 0.15, documentation: 0.10 },
        high: { research: 0.25, development: 0.50, testing: 0.15, documentation: 0.10 }
      },
      'Feature Development': {
        low: { research: 0.10, development: 0.65, testing: 0.15, documentation: 0.10 },
        medium: { research: 0.15, development: 0.60, testing: 0.15, documentation: 0.10 },
        high: { research: 0.20, development: 0.55, testing: 0.15, documentation: 0.10 }
      },
      'Testing Framework': {
        low: { research: 0.15, development: 0.50, testing: 0.25, documentation: 0.10 },
        medium: { research: 0.20, development: 0.45, testing: 0.25, documentation: 0.10 },
        high: { research: 0.25, development: 0.40, testing: 0.25, documentation: 0.10 }
      },
      'Bug Fix': {
        low: { research: 0.30, development: 0.50, testing: 0.15, documentation: 0.05 },
        medium: { research: 0.35, development: 0.45, testing: 0.15, documentation: 0.05 },
        high: { research: 0.40, development: 0.40, testing: 0.15, documentation: 0.05 }
      },
      'Configuration': {
        low: { research: 0.15, development: 0.60, testing: 0.15, documentation: 0.10 },
        medium: { research: 0.20, development: 0.55, testing: 0.15, documentation: 0.10 },
        high: { research: 0.25, development: 0.50, testing: 0.15, documentation: 0.10 }
      },
      'Code Migration': {
        low: { research: 0.25, development: 0.50, testing: 0.20, documentation: 0.05 },
        medium: { research: 0.30, development: 0.45, testing: 0.20, documentation: 0.05 },
        high: { research: 0.35, development: 0.40, testing: 0.20, documentation: 0.05 }
      }
    };

    // Get distribution for this category and complexity
    const distribution = phaseDistributions[category]?.[complexity] || phaseDistributions['Feature Development'][complexity];

    return {
      researchHours: Math.round(originalWorkHours * distribution.research),
      developmentHours: Math.round(originalWorkHours * distribution.development),
      testingHours: Math.round(originalWorkHours * distribution.testing),
      documentationHours: Math.round(originalWorkHours * distribution.documentation)
    };
  }

  /**
   * Categorize the task based on branch name and file patterns
   */
  private categorizeTask(branch: FeatureBranch): string {
    const name = branch.name.toLowerCase();
    const files = branch.commits.flatMap(c => c.changes?.fileChanges || []);
    
    // Security/Infrastructure (High complexity)
    if (name.includes('security') || name.includes('stig') || name.includes('roles')) {
      return 'Security Architecture';
    }
    
    if (name.includes('nsx') || name.includes('infra') || name.includes('k8s') || name.includes('rke2')) {
      return 'Infrastructure Setup';
    }
    
    // VDI Systems (Medium complexity)
    if (name.includes('vdi') || name.includes('gpu') || name.includes('horizon')) {
      return 'VDI Systems';
    }
    
    // Migration/Move operations (Low complexity - mostly copying)
    if (name.includes('move') || name.includes('migrate') || name.includes('windows_applications')) {
      return 'Code Migration';
    }
    
    // Bug fixes (Low complexity)
    if (name.includes('fix') || name.includes('bug') || name.includes('hotfix')) {
      return 'Bug Fix';
    }
    
    // Testing (Medium complexity)
    if (name.includes('test') || name.includes('binary')) {
      return 'Testing Framework';
    }
    
    // Configuration (Low complexity)
    if (name.includes('config') || name.includes('template')) {
      return 'Configuration';
    }
    
    // Default to feature development
    return 'Feature Development';
  }

  /**
   * Analyze complexity based on file changes and patterns
   */
  private async analyzeComplexity(branch: FeatureBranch): Promise<'low' | 'medium' | 'high'> {
    const totalFiles = branch.commits.reduce((sum, c) => sum + (c.changes?.filesChanged?.length || 0), 0);
    const totalChanges = branch.commits.reduce((sum, c) => sum + (c.changes?.insertions || 0) + (c.changes?.deletions || 0), 0);
    
    // High complexity indicators
    if (totalFiles > 100 || totalChanges > 10000) {
      return 'high';
    }
    
    // Check for complex file patterns
    const files = branch.commits.flatMap(c => c.changes?.fileChanges || []);
    const hasComplexFiles = files.some(file => {
      const filename = file.filename.toLowerCase();
      return filename.includes('terraform') || 
             filename.includes('ansible') || 
             filename.includes('kubernetes') ||
             filename.includes('.yml') ||
             filename.includes('.yaml');
    });
    
    if (hasComplexFiles && totalFiles > 20) {
      return 'high';
    }
    
    // Medium complexity
    if (totalFiles > 10 || totalChanges > 1000) {
      return 'medium';
    }
    
    return 'low';
  }

  /**
   * Analyze if code was copied vs original development
   */
  private async analyzeCopiedCode(branch: FeatureBranch): Promise<{
    percentage: number;
    indicators: string[];
  }> {
    const indicators: string[] = [];
    let copiedPercentage = 0;

    try {
      // Check for single large commits (indicator of bulk copying)
      const commits = branch.commits;
      const totalInsertions = commits.reduce((sum, c) => sum + (c.changes?.insertions || 0), 0);
      if (commits.length === 1 && totalInsertions > 10000) {
        indicators.push('Single large commit');
        copiedPercentage += 0.7;
      }

      // Check for migration patterns in branch name
      const name = branch.name.toLowerCase();
      if (name.includes('move') || name.includes('migrate') || name.includes('import')) {
        indicators.push('Migration branch');
        copiedPercentage += 0.8;
      }

      // Check for security/vendor patterns
      if (name.includes('security') || name.includes('stig') || name.includes('roles')) {
        // Look for license files or vendor indicators
        const files = branch.commits.flatMap(c => c.changes?.fileChanges || []);
        const hasLicenseFiles = files.some(f => 
          f.filename.toLowerCase().includes('license') ||
          f.filename.toLowerCase().includes('readme') ||
          f.filename.includes('/private/') ||
          f.filename.includes('/vendor/')
        );
        
        if (hasLicenseFiles) {
          indicators.push('Vendor/third-party code');
          copiedPercentage += 0.6;
        }
      }

      // Check for Windows applications pattern
      const totalFiles = branch.commits.reduce((sum, c) => sum + (c.changes?.filesChanged?.length || 0), 0);
      if (name.includes('windows_applications') || totalFiles > 500) {
        indicators.push('Bulk application roles');
        copiedPercentage += 0.9;
      }

      // Cap at 95% copied
      return {
        percentage: Math.min(0.95, copiedPercentage),
        indicators
      };
    } catch (error) {
      return { percentage: 0, indicators: [] };
    }
  }

  /**
   * Calculate integration complexity factor for migration and other tasks
   * Migration tasks require significant integration work even with high copied code percentage
   */
  private getIntegrationComplexityFactor(category: string, complexity: 'low' | 'medium' | 'high', copiedCodePercentage: number): number {
    // For migration tasks, don't heavily penalize copied code since integration is complex
    if (category === 'Code Migration') {
      // Migration tasks have substantial integration work regardless of copied code
      // Base integration work: 30-50% of full effort even with 95% copied code
      const integrationBaseWork = complexity === 'high' ? 0.5 : complexity === 'medium' ? 0.4 : 0.3;
      return Math.max(integrationBaseWork, 1 - (copiedCodePercentage * 0.6)); // Reduce copied code penalty
    }
    
    // For security/infrastructure tasks, copying still requires significant validation
    if (category.includes('Security') || category.includes('Infrastructure')) {
      const integrationBaseWork = 0.25;
      return Math.max(integrationBaseWork, 1 - (copiedCodePercentage * 0.8));
    }
    
    // For other tasks, use standard copied code reduction
    return 1 - copiedCodePercentage;
  }

  /**
   * Get base hours for category and complexity
   */
  private getBaseHours(category: string, complexity: 'low' | 'medium' | 'high'): number {
    const categoryHours: Record<string, Record<string, number>> = {
      'Security Architecture': { low: 80, medium: 200, high: 400 },
      'Infrastructure Setup': { low: 60, medium: 120, high: 250 },
      'VDI Systems': { low: 40, medium: 80, high: 160 },
      'Feature Development': { low: 30, medium: 60, high: 120 },
      'Testing Framework': { low: 40, medium: 80, high: 150 },
      'Bug Fix': { low: 8, medium: 24, high: 48 },
      'Configuration': { low: 4, medium: 12, high: 30 },
      'Code Migration': { low: 12, medium: 24, high: 60 }
    };

    return categoryHours[category]?.[complexity] || categoryHours['Feature Development'][complexity];
  }

  /**
   * Get review and testing overhead percentage
   */
  private getReviewOverhead(complexity: 'low' | 'medium' | 'high', category: string): number {
    // Security and infrastructure need more review
    if (category.includes('Security') || category.includes('Infrastructure')) {
      return complexity === 'high' ? 0.30 : 0.25;
    }
    
    // VDI and features need standard review
    if (category.includes('VDI') || category.includes('Feature')) {
      return complexity === 'high' ? 0.25 : 0.20;
    }
    
    // Bug fixes and config need minimal review
    return 0.15;
  }

  /**
   * Fallback estimate for error cases
   */
  private getFallbackEstimate(branch: FeatureBranch) {
    const totalChanges = branch.commits.reduce((sum, c) => sum + (c.changes?.insertions || 0) + (c.changes?.deletions || 0), 0);
    const baseHours = Math.max(4, Math.ceil(totalChanges / 200));
    
    // Use standard feature development distribution for fallback
    const phaseBreakdown = this.calculatePhaseHours(baseHours, 'medium', 'Feature Development');
    const reviewHours = Math.ceil(baseHours * 0.2);
    
    return {
      researchHours: phaseBreakdown.researchHours,
      developmentHours: phaseBreakdown.developmentHours,
      testingHours: phaseBreakdown.testingHours,
      documentationHours: phaseBreakdown.documentationHours,
      reviewHours,
      totalHours: phaseBreakdown.researchHours + phaseBreakdown.developmentHours + 
                 phaseBreakdown.testingHours + phaseBreakdown.documentationHours + reviewHours,
      complexity: 'medium' as const,
      category: 'Unknown',
      copiedCodePercentage: 0,
      originalWorkHours: baseHours
    };
  }

  /**
   * Batch estimate hours for multiple branches
   */
  async batchEstimateHours(branches: FeatureBranch[]): Promise<Map<string, HourEstimate>> {
    const results = new Map();
    
    for (const branch of branches) {
      const estimate = await this.estimateHours(branch);
      results.set(branch.name, estimate);
    }
    
    return results;
  }

  /**
   * Generate executive summary with accurate hours
   */
  generateExecutiveSummary(branches: FeatureBranch[], estimates: Map<string, any>) {
    let totalOriginalHours = 0;
    let totalIntegrationHours = 0;
    const developerHours = new Map<string, number>();
    const monthlyHours = new Map<string, number>();
    
    branches.forEach(branch => {
      const estimate = estimates.get(branch.name);
      if (!estimate) return;
      
      const month = branch.mergedDate.toISOString().slice(0, 7);
      monthlyHours.set(month, (monthlyHours.get(month) || 0) + estimate.totalHours);
      
      if (estimate.copiedCodePercentage > 0.5) {
        totalIntegrationHours += estimate.totalHours;
      } else {
        totalOriginalHours += estimate.totalHours;
      }
      
      // Attribute hours to primary author
      const primaryAuthor = branch.contributors.find(c => c.role === 'author');
      if (primaryAuthor) {
        developerHours.set(
          primaryAuthor.name, 
          (developerHours.get(primaryAuthor.name) || 0) + estimate.totalHours
        );
      }
    });
    
    return {
      totalOriginalHours,
      totalIntegrationHours,
      totalHours: totalOriginalHours + totalIntegrationHours,
      originalPercentage: Math.round((totalOriginalHours / (totalOriginalHours + totalIntegrationHours)) * 100),
      developerHours: Array.from(developerHours.entries()).sort((a, b) => b[1] - a[1]),
      monthlyHours: Array.from(monthlyHours.entries()).sort()
    };
  }
}