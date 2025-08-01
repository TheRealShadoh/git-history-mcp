import { FeatureBranch, HourEstimate, Contributor, GitCommit } from './types.js';

/**
 * Enhanced Executive Development Activity Summary Generator
 * 
 * Generates comprehensive executive-level summaries of development activity
 * using advanced analytics and accurate time estimation methodologies.
 */

export interface ExecutiveSummaryConfig {
  /** Number of days to look back for analysis */
  lookbackDays: number;
  /** Whether to consolidate similar author names */
  consolidateAuthors: boolean;
  /** Include branch-level effort estimates */
  includeBranchBreakdown: boolean;
  /** Minimum effort threshold for inclusion in major deliverables */
  majorDeliverableThreshold: number;
  /** Organization name for report branding */
  organizationName: string;
  /** Quality assurance overhead multipliers by complexity */
  qaOverheadMultipliers: {
    high: number;    // Security, Infrastructure, Architecture
    medium: number;  // Features, VDI, Integration  
    low: number;     // Bug fixes, Configuration, Documentation
  };
}

export interface ExecutiveDeveloperAnalysis {
  name: string;
  email: string;
  /** Total estimated hours of actual work */
  totalHours: number;
  /** Number of branches/features contributed to */
  branchesContributed: number;
  /** Primary specialization areas */
  specializations: string[];
  /** Peak productivity patterns */
  productivityPatterns: {
    peakMonth: string;
    averageHoursPerBranch: number;
    contributionTypes: { [type: string]: number };
  };
  /** Individual branch contributions with hours */
  branchContributions: {
    branchName: string;
    estimatedHours: number;
    role: 'primary' | 'secondary' | 'reviewer';
    complexity: 'high' | 'medium' | 'low';
  }[];
  /** Skills deployment across project types */
  skillsDeployment: {
    infrastructure: number;
    features: number;
    security: number;
    bugfixes: number;
    documentation: number;
  };
}

export interface ExecutiveTemporalAnalysis {
  monthlyBreakdown: {
    month: string;
    totalHours: number;
    activeDevelopers: number;
    majorDeliverables: number;
    utilizationRate: number;
  }[];
  seasonalPatterns: {
    highProductivityPeriods: string[];
    lowProductivityPeriods: string[];
    explanations: string[];
  };
  sprintEffectiveness: {
    averageCycleTime: number;
    releaseFrequency: number;
    velocityTrend: 'increasing' | 'stable' | 'decreasing';
  };
}

export interface ExecutiveBranchAnalysis {
  branchName: string;
  primaryAuthor: string;
  reviewers: string[];
  targetBranch: string;
  estimatedEffort: HourEstimate;
  complexityCategory: 'high' | 'medium' | 'low';
  businessImpact: 'feature' | 'fix' | 'infrastructure';
  actualDeploymentDate?: Date;
  phaseBreakdown: {
    research: number;
    development: number;
    testing: number;
    review: number;
    documentation: number;
  };
}

export interface ExecutiveDashboardMetrics {
  totalEngineeringHours: number;
  activeTimeframe: {
    startDate: Date;
    endDate: Date;
    totalDays: number;
  };
  teamMetrics: {
    totalDevelopers: number;
    averageHoursPerDeveloper: number;
    topContributor: string;
    hoursDisparity: {
      highest: number;
      lowest: number;
      ratio: number;
    };
  };
  velocityTrends: {
    currentMonthHours: number;
    previousMonthHours: number;
    percentageChange: number;
    trend: 'accelerating' | 'stable' | 'decelerating';
  };
  resourceDistribution: {
    [category: string]: {
      hours: number;
      percentage: number;
      branches: number;
    };
  };
  criticalPathAnalysis: {
    majorDeliverables: string[];
    blockers: string[];
    riskAreas: string[];
  };
}

export interface ExecutiveReportData {
  dashboardMetrics: ExecutiveDashboardMetrics;
  individualDeveloperAnalysis: ExecutiveDeveloperAnalysis[];
  temporalAnalysis: ExecutiveTemporalAnalysis;
  branchAnalysis: ExecutiveBranchAnalysis[];
  keyInsights: {
    productivityDrivers: string[];
    resourceOptimizationOpportunities: string[];
    retentionRisks: string[];
    capacityConstraints: string[];
  };
  recommendations: {
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
  };
}

export class ExecutiveSummaryGenerator {
  private config: ExecutiveSummaryConfig;

  constructor(config: Partial<ExecutiveSummaryConfig> = {}) {
    this.config = {
      lookbackDays: 180,
      consolidateAuthors: true,
      includeBranchBreakdown: true,
      majorDeliverableThreshold: 40, // 40+ hours
      organizationName: 'Organization',
      qaOverheadMultipliers: {
        high: 1.30,    // +30% for Security, Infrastructure, Architecture
        medium: 1.20,  // +20% for Features, VDI, Integration
        low: 1.15      // +15% for Bug fixes, Configuration, Documentation
      },
      ...config
    };
  }

  /**
   * Generate comprehensive executive report from feature branches
   */
  generateExecutiveReport(branches: FeatureBranch[]): ExecutiveReportData {
    // Filter branches within timeframe
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.lookbackDays);
    const filteredBranches = branches.filter(b => b.mergedDate >= cutoffDate);

    // Generate all analysis components
    const branchAnalysis = this.analyzeBranches(filteredBranches);
    const developerAnalysis = this.analyzeDevelopers(filteredBranches, branchAnalysis);
    const temporalAnalysis = this.analyzeTemporalPatterns(filteredBranches, branchAnalysis);
    const dashboardMetrics = this.generateDashboardMetrics(
      filteredBranches, 
      branchAnalysis, 
      developerAnalysis
    );

    // Generate insights and recommendations
    const keyInsights = this.generateKeyInsights(
      dashboardMetrics, 
      developerAnalysis, 
      temporalAnalysis
    );
    const recommendations = this.generateRecommendations(keyInsights, dashboardMetrics);

    return {
      dashboardMetrics,
      individualDeveloperAnalysis: developerAnalysis,
      temporalAnalysis,
      branchAnalysis,
      keyInsights,
      recommendations
    };
  }

  /**
   * Analyze branches with enhanced effort estimation
   */
  private analyzeBranches(branches: FeatureBranch[]): ExecutiveBranchAnalysis[] {
    return branches.map(branch => {
      const estimatedEffort = this.estimateBranchEffort(branch);
      const complexity = this.categorizeBranchComplexity(branch);
      const businessImpact = this.categorizeBranchImpact(branch);

      return {
        branchName: branch.name,
        primaryAuthor: branch.contributors.find(c => c.role === 'author')?.name || 'Unknown',
        reviewers: branch.pullRequestInfo?.reviewers || [],
        targetBranch: 'main', // Could be extracted from PR info
        estimatedEffort,
        complexityCategory: complexity,
        businessImpact,
        phaseBreakdown: {
          research: estimatedEffort.researchHours,
          development: estimatedEffort.developmentHours,
          testing: estimatedEffort.testingHours,
          review: estimatedEffort.reviewHours,
          documentation: estimatedEffort.documentationHours
        }
      };
    });
  }

  /**
   * Enhanced effort estimation using methodology from prompt
   */
  private estimateBranchEffort(branch: FeatureBranch): HourEstimate {
    // Calculate base development time
    const totalLines = branch.commits.reduce((sum, c) => 
      sum + c.changes.insertions + c.changes.deletions, 0);
    const fileCount = new Set(branch.commits.flatMap(c => c.changes.filesChanged)).size;
    
    // Base estimation: More realistic than lines/10
    const baseDevelopmentHours = Math.max(8, (totalLines / 25) + (fileCount * 1.5));
    
    // Categorize complexity
    const complexity = this.categorizeBranchComplexity(branch);
    
    // Apply quality assurance overhead multiplier
    const qaMultiplier = this.config.qaOverheadMultipliers[complexity];
    const adjustedDevelopmentHours = baseDevelopmentHours * qaMultiplier;
    
    // Phase breakdown (realistic software development percentages)
    const researchHours = adjustedDevelopmentHours * 0.15;
    const developmentHours = adjustedDevelopmentHours * 0.40;
    const testingHours = adjustedDevelopmentHours * 0.25;
    const reviewHours = adjustedDevelopmentHours * 0.15;
    const documentationHours = adjustedDevelopmentHours * 0.05;
    
    const totalHours = researchHours + developmentHours + testingHours + 
                      reviewHours + documentationHours;

    // Estimate copied code percentage (heuristic based on file patterns)
    const copiedCodePercentage = this.estimateCopiedCodePercentage(branch);
    const originalWorkHours = totalHours * (1 - copiedCodePercentage / 100);

    return {
      researchHours: Math.ceil(researchHours),
      developmentHours: Math.ceil(developmentHours),
      testingHours: Math.ceil(testingHours),
      documentationHours: Math.ceil(documentationHours),
      reviewHours: Math.ceil(reviewHours),
      totalHours: Math.ceil(totalHours),
      complexity,
      category: this.categorizeBranchImpact(branch),
      copiedCodePercentage,
      originalWorkHours: Math.ceil(originalWorkHours)
    };
  }

  /**
   * Categorize branch complexity based on analysis from prompt
   */
  private categorizeBranchComplexity(branch: FeatureBranch): 'high' | 'medium' | 'low' {
    const name = branch.name.toLowerCase();
    const files = branch.commits.flatMap(c => c.changes.filesChanged);
    const totalLines = branch.commits.reduce((sum, c) => 
      sum + c.changes.insertions + c.changes.deletions, 0);

    // High complexity indicators
    if (name.includes('security') || name.includes('auth') || 
        name.includes('infrastructure') || name.includes('architect') ||
        files.some(f => f.includes('security') || f.includes('crypto') || f.includes('auth')) ||
        totalLines > 2000 || files.length > 50) {
      return 'high';
    }

    // Low complexity indicators  
    if (name.includes('fix') || name.includes('doc') || name.includes('config') ||
        totalLines < 200 || files.length < 5) {
      return 'low';
    }

    // Default to medium
    return 'medium';
  }

  /**
   * Categorize business impact
   */
  private categorizeBranchImpact(branch: FeatureBranch): 'feature' | 'fix' | 'infrastructure' {
    const name = branch.name.toLowerCase();
    
    if (name.includes('fix') || name.includes('bug') || name.includes('patch')) {
      return 'fix';
    }
    
    if (name.includes('infra') || name.includes('deploy') || name.includes('config') ||
        name.includes('setup') || name.includes('build')) {
      return 'infrastructure';
    }
    
    return 'feature';
  }

  /**
   * Estimate copied code percentage (heuristic)
   */
  private estimateCopiedCodePercentage(branch: FeatureBranch): number {
    const files = branch.commits.flatMap(c => c.changes.filesChanged);
    
    // Look for patterns indicating copied/generated code
    const copiedIndicators = files.filter(f => 
      f.includes('generated') || f.includes('vendor') || 
      f.includes('node_modules') || f.includes('dist') ||
      f.endsWith('.min.js') || f.endsWith('.bundle.js')
    ).length;
    
    return Math.min(50, (copiedIndicators / files.length) * 100);
  }

  /**
   * Analyze individual developer contributions with accurate effort attribution
   */
  private analyzeDevelopers(
    branches: FeatureBranch[], 
    branchAnalysis: ExecutiveBranchAnalysis[]
  ): ExecutiveDeveloperAnalysis[] {
    const developerMap = new Map<string, {
      email: string;
      branches: { branch: FeatureBranch; analysis: ExecutiveBranchAnalysis }[];
    }>();

    // Collect developer data
    branches.forEach((branch, index) => {
      const analysis = branchAnalysis[index];
      branch.contributors.forEach(contributor => {
        if (!developerMap.has(contributor.name)) {
          developerMap.set(contributor.name, {
            email: contributor.email,
            branches: []
          });
        }
        developerMap.get(contributor.name)!.branches.push({ branch, analysis });
      });
    });

    // Generate analysis for each developer
    return Array.from(developerMap.entries()).map(([name, data]) => {
      const branchContributions = data.branches.map(({ branch, analysis }) => {
        const contributor = branch.contributors.find(c => c.name === name)!;
        const role = contributor.role === 'author' ? 'primary' : 
                    contributor.role === 'merger' ? 'reviewer' : 'secondary';
        
        // Distribute effort based on contribution percentage
        const totalContributions = branch.contributors.reduce((sum, c) => 
          sum + c.linesAdded + c.linesRemoved, 0);
        const personalContribution = contributor.linesAdded + contributor.linesRemoved;
        const contributionPercentage = totalContributions > 0 ? 
          personalContribution / totalContributions : 1 / branch.contributors.length;
        
        return {
          branchName: branch.name,
          estimatedHours: Math.ceil(analysis.estimatedEffort.totalHours * contributionPercentage),
          role: role as 'primary' | 'secondary' | 'reviewer',
          complexity: analysis.complexityCategory
        };
      });

      const totalHours = branchContributions.reduce((sum, bc) => sum + bc.estimatedHours, 0);
      const specializations = this.identifySpecializations(data.branches.map(b => b.branch));
      const skillsDeployment = this.analyzeSkillsDeployment(data.branches);

      return {
        name,
        email: data.email,
        totalHours,
        branchesContributed: branchContributions.length,
        specializations,
        productivityPatterns: {
          peakMonth: this.findPeakMonth(data.branches.map(b => b.branch)),
          averageHoursPerBranch: totalHours / branchContributions.length,
          contributionTypes: this.analyzeContributionTypes(data.branches.map(b => b.analysis))
        },
        branchContributions,
        skillsDeployment
      };
    }).sort((a, b) => b.totalHours - a.totalHours); // Sort by total hours descending
  }

  /**
   * Identify developer specializations based on branch patterns
   */
  private identifySpecializations(branches: FeatureBranch[]): string[] {
    const patterns = new Map<string, number>();
    
    branches.forEach(branch => {
      const files = branch.commits.flatMap(c => c.changes.filesChanged);
      
      // Analyze file patterns for specializations
      if (files.some(f => f.includes('security') || f.includes('auth'))) {
        patterns.set('Security', (patterns.get('Security') || 0) + 1);
      }
      if (files.some(f => f.includes('infra') || f.includes('deploy') || f.includes('docker'))) {
        patterns.set('Infrastructure', (patterns.get('Infrastructure') || 0) + 1);
      }
      if (files.some(f => f.includes('ui') || f.includes('frontend') || f.includes('component'))) {
        patterns.set('Frontend', (patterns.get('Frontend') || 0) + 1);
      }
      if (files.some(f => f.includes('api') || f.includes('backend') || f.includes('service'))) {
        patterns.set('Backend', (patterns.get('Backend') || 0) + 1);
      }
      if (files.some(f => f.includes('db') || f.includes('database') || f.includes('migration'))) {
        patterns.set('Database', (patterns.get('Database') || 0) + 1);
      }
      if (files.some(f => f.includes('test') || f.includes('spec'))) {
        patterns.set('Testing', (patterns.get('Testing') || 0) + 1);
      }
    });

    return Array.from(patterns.entries())
      .filter(([_, count]) => count >= 2) // Must appear in at least 2 branches
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([specialization]) => specialization);
  }

  /**
   * Find peak productivity month for a developer
   */
  private findPeakMonth(branches: FeatureBranch[]): string {
    const monthCounts = new Map<string, number>();
    
    branches.forEach(branch => {
      const month = branch.mergedDate.toISOString().substring(0, 7); // YYYY-MM
      monthCounts.set(month, (monthCounts.get(month) || 0) + 1);
    });

    const [peakMonth] = Array.from(monthCounts.entries())
      .sort((a, b) => b[1] - a[1])[0] || ['Unknown', 0];

    return peakMonth;
  }

  /**
   * Analyze contribution types for a developer
   */
  private analyzeContributionTypes(analyses: ExecutiveBranchAnalysis[]): { [type: string]: number } {
    const types: { [type: string]: number } = {};
    
    analyses.forEach(analysis => {
      const type = analysis.businessImpact;
      types[type] = (types[type] || 0) + 1;
    });

    return types;
  }

  /**
   * Analyze skills deployment across project types
   */
  private analyzeSkillsDeployment(
    branches: { branch: FeatureBranch; analysis: ExecutiveBranchAnalysis }[]
  ): ExecutiveDeveloperAnalysis['skillsDeployment'] {
    const deployment = {
      infrastructure: 0,
      features: 0,
      security: 0,
      bugfixes: 0,
      documentation: 0
    };

    branches.forEach(({ analysis }) => {
      const hours = analysis.estimatedEffort.totalHours;
      
      switch (analysis.businessImpact) {
        case 'infrastructure':
          deployment.infrastructure += hours;
          break;
        case 'feature':
          deployment.features += hours;
          break;
        case 'fix':
          deployment.bugfixes += hours;
          break;
      }

      if (analysis.complexityCategory === 'high') {
        deployment.security += hours * 0.3; // Assume 30% of high complexity is security-related
      }
    });

    return deployment;
  }

  /**
   * Analyze temporal patterns across the development timeline
   */
  private analyzeTemporalPatterns(
    branches: FeatureBranch[], 
    branchAnalysis: ExecutiveBranchAnalysis[]
  ): ExecutiveTemporalAnalysis {
    // Monthly breakdown
    const monthlyMap = new Map<string, {
      hours: number;
      developers: Set<string>;
      deliverables: number;
    }>();

    branches.forEach((branch, index) => {
      const month = branch.mergedDate.toISOString().substring(0, 7);
      const analysis = branchAnalysis[index];
      
      if (!monthlyMap.has(month)) {
        monthlyMap.set(month, {
          hours: 0,
          developers: new Set(),
          deliverables: 0
        });
      }

      const monthData = monthlyMap.get(month)!;
      monthData.hours += analysis.estimatedEffort.totalHours;
      monthData.deliverables += 1;
      
      branch.contributors.forEach(c => monthData.developers.add(c.name));
    });

    const monthlyBreakdown = Array.from(monthlyMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, data]) => ({
        month,
        totalHours: data.hours,
        activeDevelopers: data.developers.size,
        majorDeliverables: data.deliverables,
        utilizationRate: Math.min(100, (data.hours / (data.developers.size * 160)) * 100) // Assuming 160 hours/month capacity
      }));

    return {
      monthlyBreakdown,
      seasonalPatterns: this.identifySeasonalPatterns(monthlyBreakdown),
      sprintEffectiveness: this.analyzeSprintEffectiveness(branches)
    };
  }

  /**
   * Identify seasonal productivity patterns
   */
  private identifySeasonalPatterns(
    monthlyBreakdown: ExecutiveTemporalAnalysis['monthlyBreakdown']
  ): ExecutiveTemporalAnalysis['seasonalPatterns'] {
    const sortedByHours = [...monthlyBreakdown].sort((a, b) => b.totalHours - a.totalHours);
    const avgHours = monthlyBreakdown.reduce((sum, m) => sum + m.totalHours, 0) / monthlyBreakdown.length;

    const highProductivityPeriods = sortedByHours
      .filter(m => m.totalHours > avgHours * 1.2)
      .slice(0, 3)
      .map(m => m.month);

    const lowProductivityPeriods = sortedByHours
      .filter(m => m.totalHours < avgHours * 0.8)
      .slice(-3)
      .map(m => m.month);

    return {
      highProductivityPeriods,
      lowProductivityPeriods,
      explanations: [
        'Productivity patterns may correlate with business cycles, holidays, or team changes',
        'Consider workload planning around identified low-productivity periods',
        'High-productivity periods may indicate successful sprint planning or team focus'
      ]
    };
  }

  /**
   * Analyze sprint effectiveness metrics
   */
  private analyzeSprintEffectiveness(branches: FeatureBranch[]): ExecutiveTemporalAnalysis['sprintEffectiveness'] {
    // Simple cycle time calculation (could be enhanced with actual sprint data)
    const cycleTimes = branches.map(branch => {
      // Estimate cycle time as days between first commit and merge
      const firstCommit = branch.commits[0]?.date || branch.mergedDate;
      return Math.abs(branch.mergedDate.getTime() - firstCommit.getTime()) / (1000 * 60 * 60 * 24);
    });

    const averageCycleTime = cycleTimes.reduce((sum, time) => sum + time, 0) / cycleTimes.length;

    // Calculate release frequency (branches per month)
    const timespan = this.config.lookbackDays / 30;
    const releaseFrequency = branches.length / timespan;

    // Determine velocity trend (simplified)
    const halfwayPoint = Math.floor(branches.length / 2);
    const firstHalfAvg = cycleTimes.slice(0, halfwayPoint).reduce((a, b) => a + b, 0) / halfwayPoint;
    const secondHalfAvg = cycleTimes.slice(halfwayPoint).reduce((a, b) => a + b, 0) / (branches.length - halfwayPoint);
    
    let velocityTrend: 'increasing' | 'stable' | 'decreasing' = 'stable';
    if (secondHalfAvg < firstHalfAvg * 0.9) velocityTrend = 'increasing';
    else if (secondHalfAvg > firstHalfAvg * 1.1) velocityTrend = 'decreasing';

    return {
      averageCycleTime: Math.round(averageCycleTime),
      releaseFrequency: Math.round(releaseFrequency * 10) / 10,
      velocityTrend
    };
  }

  /**
   * Generate dashboard metrics for executive overview
   */
  private generateDashboardMetrics(
    branches: FeatureBranch[],
    branchAnalysis: ExecutiveBranchAnalysis[],
    developerAnalysis: ExecutiveDeveloperAnalysis[]
  ): ExecutiveDashboardMetrics {
    const totalHours = branchAnalysis.reduce((sum, analysis) => 
      sum + analysis.estimatedEffort.totalHours, 0);

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.lookbackDays);
    
    const currentMonth = new Date().toISOString().substring(0, 7);
    const previousMonth = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().substring(0, 7);
    
    const currentMonthHours = branchAnalysis
      .filter(analysis => {
        const branchMonth = branches.find(b => b.name === analysis.branchName)?.mergedDate
          .toISOString().substring(0, 7);
        return branchMonth === currentMonth;
      })
      .reduce((sum, analysis) => sum + analysis.estimatedEffort.totalHours, 0);

    const previousMonthHours = branchAnalysis
      .filter(analysis => {
        const branchMonth = branches.find(b => b.name === analysis.branchName)?.mergedDate
          .toISOString().substring(0, 7);
        return branchMonth === previousMonth;
      })
      .reduce((sum, analysis) => sum + analysis.estimatedEffort.totalHours, 0);

    // Resource distribution
    const resourceDistribution: { [category: string]: { hours: number; percentage: number; branches: number } } = {};
    branchAnalysis.forEach(analysis => {
      const category = analysis.businessImpact;
      if (!resourceDistribution[category]) {
        resourceDistribution[category] = { hours: 0, percentage: 0, branches: 0 };
      }
      resourceDistribution[category].hours += analysis.estimatedEffort.totalHours;
      resourceDistribution[category].branches += 1;
    });

    // Calculate percentages
    Object.values(resourceDistribution).forEach(dist => {
      dist.percentage = (dist.hours / totalHours) * 100;
    });

    const hoursArray = developerAnalysis.map(d => d.totalHours);
    const topContributor = developerAnalysis[0]?.name || 'Unknown';

    return {
      totalEngineeringHours: totalHours,
      activeTimeframe: {
        startDate: cutoffDate,
        endDate: new Date(),
        totalDays: this.config.lookbackDays
      },
      teamMetrics: {
        totalDevelopers: developerAnalysis.length,
        averageHoursPerDeveloper: totalHours / developerAnalysis.length,
        topContributor,
        hoursDisparity: {
          highest: Math.max(...hoursArray),
          lowest: Math.min(...hoursArray),
          ratio: Math.max(...hoursArray) / Math.min(...hoursArray)
        }
      },
      velocityTrends: {
        currentMonthHours,
        previousMonthHours,
        percentageChange: previousMonthHours > 0 ? 
          ((currentMonthHours - previousMonthHours) / previousMonthHours) * 100 : 0,
        trend: currentMonthHours > previousMonthHours * 1.1 ? 'accelerating' :
               currentMonthHours < previousMonthHours * 0.9 ? 'decelerating' : 'stable'
      },
      resourceDistribution,
      criticalPathAnalysis: {
        majorDeliverables: branchAnalysis
          .filter(analysis => analysis.estimatedEffort.totalHours >= this.config.majorDeliverableThreshold)
          .map(analysis => analysis.branchName),
        blockers: [], // Would need additional data
        riskAreas: this.identifyRiskAreas(developerAnalysis, branchAnalysis)
      }
    };
  }

  /**
   * Identify risk areas based on developer and branch analysis
   */
  private identifyRiskAreas(
    developerAnalysis: ExecutiveDeveloperAnalysis[],
    branchAnalysis: ExecutiveBranchAnalysis[]
  ): string[] {
    const risks: string[] = [];

    // Check for single points of failure
    const highValueDevelopers = developerAnalysis.filter(d => d.totalHours > 200);
    if (highValueDevelopers.length === 1) {
      risks.push(`Single point of failure: ${highValueDevelopers[0].name} contributed ${highValueDevelopers[0].totalHours} hours`);
    }

    // Check for uneven workload distribution
    const hoursArray = developerAnalysis.map(d => d.totalHours);
    const ratio = Math.max(...hoursArray) / Math.min(...hoursArray);
    if (ratio > 10) {
      risks.push(`Significant workload imbalance: ${ratio.toFixed(1)}:1 ratio between highest and lowest contributors`);
    }

    // Check for high complexity branches without sufficient review
    const highComplexityBranches = branchAnalysis.filter(b => 
      b.complexityCategory === 'high' && b.reviewers.length < 2
    );
    if (highComplexityBranches.length > 0) {
      risks.push(`${highComplexityBranches.length} high-complexity branches with insufficient review coverage`);
    }

    return risks;
  }

  /**
   * Generate key insights from analysis
   */
  private generateKeyInsights(
    dashboardMetrics: ExecutiveDashboardMetrics,
    developerAnalysis: ExecutiveDeveloperAnalysis[],
    temporalAnalysis: ExecutiveTemporalAnalysis
  ): ExecutiveReportData['keyInsights'] {
    return {
      productivityDrivers: [
        `${temporalAnalysis.sprintEffectiveness.velocityTrend} velocity trend with ${temporalAnalysis.sprintEffectiveness.averageCycleTime}-day average cycle time`,
        `Peak productivity periods: ${temporalAnalysis.seasonalPatterns.highProductivityPeriods.join(', ')}`,
        `${dashboardMetrics.teamMetrics.totalDevelopers} active developers with average ${Math.round(dashboardMetrics.teamMetrics.averageHoursPerDeveloper)} hours each`
      ],
      resourceOptimizationOpportunities: [
        `Top contributor (${dashboardMetrics.teamMetrics.topContributor}) has ${dashboardMetrics.teamMetrics.hoursDisparity.ratio.toFixed(1)}x more hours than lowest contributor`,
        `${Math.round(dashboardMetrics.resourceDistribution.feature?.percentage || 0)}% of effort on features vs ${Math.round(dashboardMetrics.resourceDistribution.infrastructure?.percentage || 0)}% on infrastructure`,
        `Average ${temporalAnalysis.sprintEffectiveness.releaseFrequency} releases per month - consider optimization`
      ],
      retentionRisks: [
        ...dashboardMetrics.criticalPathAnalysis.riskAreas,
        ...(dashboardMetrics.teamMetrics.hoursDisparity.ratio > 5 ? 
          [`High workload imbalance may lead to burnout in top contributors`] : [])
      ],
      capacityConstraints: [
        `${temporalAnalysis.monthlyBreakdown.filter(m => m.utilizationRate > 80).length} months with >80% utilization`,
        `Low productivity periods: ${temporalAnalysis.seasonalPatterns.lowProductivityPeriods.join(', ')}`,
        `${dashboardMetrics.criticalPathAnalysis.majorDeliverables.length} major deliverables (>${this.config.majorDeliverableThreshold}h each)`
      ]
    };
  }

  /**
   * Generate actionable recommendations
   */
  private generateRecommendations(
    insights: ExecutiveReportData['keyInsights'],
    dashboardMetrics: ExecutiveDashboardMetrics
  ): ExecutiveReportData['recommendations'] {
    return {
      immediate: [
        'Review workload distribution to prevent burnout in high-contributing developers',
        'Increase code review coverage for high-complexity branches',
        'Document knowledge from single points of failure'
      ],
      shortTerm: [
        'Implement pair programming for knowledge transfer',
        'Establish capacity planning around low-productivity periods',
        'Create technical debt reduction sprints'
      ],
      longTerm: [
        'Invest in automation to reduce infrastructure maintenance overhead',
        'Develop junior developers to increase team capacity',
        'Implement metrics-driven sprint planning'
      ]
    };
  }

  /**
   * Generate executive markdown report
   */
  generateMarkdownReport(reportData: ExecutiveReportData): string {
    const sections: string[] = [];
    
    // Title and Executive Summary
    sections.push(`# ${this.config.organizationName} Executive Development Activity Summary`);
    sections.push('');
    sections.push(`**Analysis Period:** ${reportData.dashboardMetrics.activeTimeframe.startDate.toLocaleDateString()} - ${reportData.dashboardMetrics.activeTimeframe.endDate.toLocaleDateString()} (${reportData.dashboardMetrics.activeTimeframe.totalDays} days)`);
    sections.push('');
    
    // Executive Dashboard
    sections.push('## 📊 Executive Dashboard Metrics');
    sections.push('');
    sections.push(`- **Total Engineering Investment:** ${reportData.dashboardMetrics.totalEngineeringHours.toLocaleString()} hours`);
    sections.push(`- **Active Team Size:** ${reportData.dashboardMetrics.teamMetrics.totalDevelopers} developers`);
    sections.push(`- **Average Contribution:** ${Math.round(reportData.dashboardMetrics.teamMetrics.averageHoursPerDeveloper)} hours per developer`);
    sections.push(`- **Top Contributor:** ${reportData.dashboardMetrics.teamMetrics.topContributor}`);
    sections.push(`- **Workload Ratio:** ${reportData.dashboardMetrics.teamMetrics.hoursDisparity.ratio.toFixed(1)}:1 (highest:lowest)`);
    sections.push(`- **Velocity Trend:** ${reportData.dashboardMetrics.velocityTrends.trend} (${reportData.dashboardMetrics.velocityTrends.percentageChange > 0 ? '+' : ''}${reportData.dashboardMetrics.velocityTrends.percentageChange.toFixed(1)}% vs last month)`);
    sections.push('');
    
    // Individual Developer Analysis
    sections.push('## 👥 Individual Developer Analysis');
    sections.push('');
    sections.push('**Note:** Hours reflect actual effort investment including development, review, testing, and deployment phases.');
    sections.push('');
    sections.push('| Developer | Total Hours | Branches | Avg Hours/Branch | Primary Specializations | Peak Month |');
    sections.push('|-----------|-------------|----------|------------------|------------------------|------------|');
    
    reportData.individualDeveloperAnalysis.forEach(dev => {
      sections.push(`| ${dev.name} | **${dev.totalHours}** | ${dev.branchesContributed} | ${Math.round(dev.productivityPatterns.averageHoursPerBranch)} | ${dev.specializations.join(', ') || 'General'} | ${dev.productivityPatterns.peakMonth} |`);
    });
    sections.push('');
    
    // Temporal Analysis
    sections.push('## 📈 Temporal Analysis');
    sections.push('');
    sections.push('### Monthly Development Hours');
    sections.push('| Month | Total Hours | Active Developers | Major Deliverables | Utilization Rate |');
    sections.push('|-------|-------------|-------------------|-------------------|------------------|');
    
    reportData.temporalAnalysis.monthlyBreakdown.forEach(month => {
      sections.push(`| ${month.month} | ${month.totalHours} | ${month.activeDevelopers} | ${month.majorDeliverables} | ${Math.round(month.utilizationRate)}% |`);
    });
    sections.push('');
    
    // Resource Allocation
    sections.push('## 🔄 Resource Allocation');
    sections.push('');
    sections.push('| Category | Hours | Percentage | Branches |');
    sections.push('|----------|-------|------------|----------|');
    
    Object.entries(reportData.dashboardMetrics.resourceDistribution).forEach(([category, data]) => {
      sections.push(`| ${category.charAt(0).toUpperCase() + category.slice(1)} | ${data.hours} | ${data.percentage.toFixed(1)}% | ${data.branches} |`);
    });
    sections.push('');
    
    // Major Deliverables
    sections.push('## 🚀 Major Deliverables');
    sections.push('');
    sections.push(`*Branches requiring ${this.config.majorDeliverableThreshold}+ hours of effort*`);
    sections.push('');
    
    const majorDeliverables = reportData.branchAnalysis
      .filter(branch => branch.estimatedEffort.totalHours >= this.config.majorDeliverableThreshold)
      .sort((a, b) => b.estimatedEffort.totalHours - a.estimatedEffort.totalHours);
    
    if (majorDeliverables.length > 0) {
      sections.push('| Branch | Primary Author | Total Hours | Complexity | Business Impact | Review Coverage |');
      sections.push('|--------|----------------|-------------|------------|-----------------|-----------------|');
      
      majorDeliverables.forEach(branch => {
        sections.push(`| ${branch.branchName} | ${branch.primaryAuthor} | **${branch.estimatedEffort.totalHours}** | ${branch.complexityCategory} | ${branch.businessImpact} | ${branch.reviewers.length} reviewer(s) |`);
      });
    } else {
      sections.push('*No major deliverables identified in this period.*');
    }
    sections.push('');
    
    // Key Insights
    sections.push('## 💡 Key Insights');
    sections.push('');
    sections.push('### Productivity Drivers');
    reportData.keyInsights.productivityDrivers.forEach(insight => {
      sections.push(`- ${insight}`);
    });
    sections.push('');
    
    sections.push('### Resource Optimization Opportunities');
    reportData.keyInsights.resourceOptimizationOpportunities.forEach(insight => {
      sections.push(`- ${insight}`);
    });
    sections.push('');
    
    if (reportData.keyInsights.retentionRisks.length > 0) {
      sections.push('### Retention Risks');
      reportData.keyInsights.retentionRisks.forEach(risk => {
        sections.push(`- ⚠️ ${risk}`);
      });
      sections.push('');
    }
    
    sections.push('### Capacity Constraints');
    reportData.keyInsights.capacityConstraints.forEach(constraint => {
      sections.push(`- ${constraint}`);
    });
    sections.push('');
    
    // Recommendations
    sections.push('## 🎯 Recommendations');
    sections.push('');
    sections.push('### Immediate Actions (1-2 weeks)');
    reportData.recommendations.immediate.forEach(rec => {
      sections.push(`- ${rec}`);
    });
    sections.push('');
    
    sections.push('### Short-term Initiatives (1-3 months)');
    reportData.recommendations.shortTerm.forEach(rec => {
      sections.push(`- ${rec}`);
    });
    sections.push('');
    
    sections.push('### Long-term Strategy (3-12 months)');
    reportData.recommendations.longTerm.forEach(rec => {
      sections.push(`- ${rec}`);
    });
    sections.push('');
    
    // Methodology
    sections.push('## 📋 Methodology');
    sections.push('');
    sections.push('This report uses evidence-based time estimation incorporating:');
    sections.push('');
    sections.push('- **Base Development Time:** Calculated from actual code changes and file modifications');
    sections.push('- **Quality Assurance Overhead:** Applied based on complexity category:');
    sections.push(`  - High complexity (Security, Infrastructure, Architecture): +${Math.round((this.config.qaOverheadMultipliers.high - 1) * 100)}%`);
    sections.push(`  - Medium complexity (Features, Integration): +${Math.round((this.config.qaOverheadMultipliers.medium - 1) * 100)}%`);
    sections.push(`  - Low complexity (Bug fixes, Documentation): +${Math.round((this.config.qaOverheadMultipliers.low - 1) * 100)}%`);
    sections.push('- **Phase Distribution:** Research (15%), Development (40%), Testing (25%), Review (15%), Documentation (5%)');
    sections.push('- **Contribution Attribution:** Hours distributed based on actual code contribution percentages');
    sections.push('');
    sections.push('*This analysis maintains reporting integrity by accurately reflecting individual contribution disparities without artificial balancing.*');
    sections.push('');
    
    // Footer
    sections.push('---');
    sections.push('');
    sections.push(`*Generated on ${new Date().toLocaleDateString()} using enhanced git-history MCP analysis*`);
    
    return sections.join('\n');
  }
}