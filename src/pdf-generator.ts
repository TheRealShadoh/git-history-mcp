import puppeteer from 'puppeteer';
import fs from 'fs-extra';
import path from 'path';
import MarkdownIt from 'markdown-it';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface PdfExportOptions {
  markdownFilePath: string;
  outputPath?: string;
  includeCharts?: boolean;
  pageFormat?: 'A4' | 'Letter' | 'A3';
  margins?: {
    top?: string;
    right?: string;
    bottom?: string;
    left?: string;
  };
}

export class PdfGenerator {
  private md: MarkdownIt;
  private tempDir: string;

  constructor() {
    this.md = new MarkdownIt({
      html: true,
      linkify: true,
      typographer: true
    });
    this.tempDir = path.join(process.cwd(), 'temp-svg');
  }

  /**
   * Export markdown file to PDF with mermaid chart rendering
   */
  async exportMarkdownToPdf(options: PdfExportOptions): Promise<string> {
    const {
      markdownFilePath,
      outputPath,
      includeCharts = true,
      pageFormat = 'A4',
      margins = { top: '1in', right: '0.8in', bottom: '1in', left: '0.8in' }
    } = options;

    // Validate input file exists
    if (!(await fs.pathExists(markdownFilePath))) {
      throw new Error(`Markdown file not found: ${markdownFilePath}`);
    }

    // Read markdown content
    const markdownContent = await fs.readFile(markdownFilePath, 'utf-8');
    
    // Generate output path if not provided
    const finalOutputPath = outputPath || this.generateOutputPath(markdownFilePath);
    
    // Convert markdown to HTML
    let htmlContent = await this.convertMarkdownToHtml(markdownContent, includeCharts);
    
    // If charts are included, embed the SVG content directly
    if (includeCharts) {
      htmlContent = await this.embedSvgContent(htmlContent);
    }
    
    // Generate PDF
    await this.generatePdfFromHtml(htmlContent, finalOutputPath, {
      format: pageFormat,
      margin: margins
    });

    // Cleanup temp files
    await this.cleanup();

    return finalOutputPath;
  }

  /**
   * Convert markdown content to HTML with mermaid support
   */
  private async convertMarkdownToHtml(markdownContent: string, includeCharts: boolean): Promise<string> {
    // Convert basic markdown to HTML
    let htmlContent = this.md.render(markdownContent);

    if (includeCharts) {
      // Process mermaid diagrams by converting to SVG first
      htmlContent = await this.processMermaidDiagramsToSvg(htmlContent);
    }

    // Wrap in complete HTML document
    return this.wrapInHtmlDocument(htmlContent);
  }

  /**
   * Process mermaid diagrams by converting them to SVG first
   */
  private async processMermaidDiagramsToSvg(htmlContent: string): Promise<string> {
    // Ensure temp directory exists
    await fs.ensureDir(this.tempDir);
    
    const mermaidRegex = /<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/g;
    
    let processedContent = htmlContent;
    let match;
    let diagramId = 0;
    const svgPromises: Promise<void>[] = [];

    // First pass: extract all mermaid diagrams and convert to SVG
    while ((match = mermaidRegex.exec(htmlContent)) !== null) {
      const mermaidCode = match[1].trim();
      const diagramPath = path.join(this.tempDir, `diagram-${diagramId}.mmd`);
      const svgPath = path.join(this.tempDir, `diagram-${diagramId}.svg`);
      
      // Create promise for this diagram conversion
      const svgPromise = this.convertMermaidToSvg(mermaidCode, diagramPath, svgPath, diagramId);
      svgPromises.push(svgPromise);
      
      diagramId++;
    }
    
    // Wait for all SVG conversions to complete
    await Promise.all(svgPromises);

    // Second pass: replace mermaid code blocks with embedded SVGs
    // CRITICAL FIX: Reset the regex to avoid state issues
    const replacementRegex = /<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/g;
    diagramId = 0;
    processedContent = htmlContent.replace(replacementRegex, () => {
      const svgPath = path.join(this.tempDir, `diagram-${diagramId}.svg`);
      const svgId = `mermaid-svg-${diagramId}`;
      diagramId++;
      
      return `<div class="mermaid-container" id="${svgId}">
        <div class="svg-placeholder" data-svg-path="${svgPath}"></div>
      </div>`;
    });
    return processedContent;
  }

  /**
   * Convert a single mermaid diagram to SVG
   */
  private async convertMermaidToSvg(
    mermaidCode: string, 
    mmdPath: string, 
    svgPath: string, 
    diagramId: number
  ): Promise<void> {
    try {
      // Clean HTML entities from mermaid code
      const cleanedCode = this.cleanHtmlEntities(mermaidCode);
      
      // Write cleaned mermaid code to temporary file
      await fs.writeFile(mmdPath, cleanedCode);
      
      // Use mermaid CLI to convert to SVG with custom theme
      const mermaidCmd = `npx mmdc -i "${mmdPath}" -o "${svgPath}" -t default -b white --scale 2`;
      
      const { stdout, stderr } = await execAsync(mermaidCmd);
      
      // Verify SVG was created and is valid
      if (!(await fs.pathExists(svgPath))) {
        console.warn(`Failed to generate SVG for diagram ${diagramId}`);
        await this.createFallbackSvg(svgPath, mermaidCode);
      } else {
        const svgStats = await fs.stat(svgPath);
        
        // Check if SVG file is empty or too small (likely corrupted)
        if (svgStats.size < 100) {
          console.warn(`SVG file for diagram ${diagramId} is too small (${svgStats.size} bytes), likely corrupted`);
          await this.createFallbackSvg(svgPath, mermaidCode);
        } else {
          // Validate SVG content structure
          const svgContent = await fs.readFile(svgPath, 'utf-8');
          if (!svgContent.includes('<svg') || !svgContent.includes('</svg>')) {
            console.warn(`SVG file for diagram ${diagramId} has invalid structure`);
            await this.createFallbackSvg(svgPath, mermaidCode);
          }
        }
      }
      
    } catch (error) {
      console.warn(`Error converting mermaid diagram ${diagramId} to SVG:`, error);
      // Create a fallback SVG
      await this.createFallbackSvg(svgPath, mermaidCode);
    }
  }

  /**
   * Clean HTML entities from mermaid code
   */
  private cleanHtmlEntities(mermaidCode: string): string {
    return mermaidCode
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&nbsp;/g, ' ')
      .trim();
  }

  /**
   * Create a fallback SVG for failed mermaid conversions
   */
  private async createFallbackSvg(svgPath: string, mermaidCode: string): Promise<void> {
    const fallbackSvg = `
<svg width="400" height="200" xmlns="http://www.w3.org/2000/svg">
  <rect width="400" height="200" fill="#f8fafc" stroke="#e2e8f0" rx="8"/>
  <text x="200" y="100" text-anchor="middle" font-family="Inter, sans-serif" font-size="14" fill="#64748b">
    Mermaid Diagram
  </text>
  <text x="200" y="120" text-anchor="middle" font-family="Inter, sans-serif" font-size="12" fill="#94a3b8">
    (Conversion failed)
  </text>
</svg>`;
    
    await fs.writeFile(svgPath, fallbackSvg);
  }

  /**
   * Embed SVG content directly into HTML placeholders
   */
  private async embedSvgContent(htmlContent: string): Promise<string> {
    const placeholderRegex = /<div class="svg-placeholder" data-svg-path="([^"]+)"><\/div>/g;
    
    let processedContent = htmlContent;
    let match;
    let embeddedCount = 0;
    while ((match = placeholderRegex.exec(htmlContent)) !== null) {
      const svgPath = match[1];
      const placeholder = match[0];
      
      try {
        // Validate and resolve the SVG path
        const resolvedSvgPath = path.resolve(svgPath);
        if (!resolvedSvgPath.includes(path.resolve(this.tempDir))) {
          console.warn(`SVG path is outside temp directory: ${svgPath}`);
          throw new Error(`Invalid SVG path: ${svgPath}`);
        }
        
        if (await fs.pathExists(resolvedSvgPath)) {
          const svgContent = await fs.readFile(resolvedSvgPath, 'utf-8');
          
          // Remove XML declaration and add responsive attributes
          let cleanSvg = svgContent.replace(/<\?xml[^>]*\?>/, '');
          
          // Handle SVG style attributes properly to avoid duplicates
          if (cleanSvg.includes('<svg') && cleanSvg.includes('style=')) {
            // SVG already has style attribute, merge with responsive styles
            cleanSvg = cleanSvg.replace(
              /<svg([^>]*?)style="([^"]*?)"([^>]*?)>/,
              '<svg$1style="$2; max-width: 100%; height: auto;"$3>'
            );
          } else {
            // SVG doesn't have style attribute, add responsive styles
            cleanSvg = cleanSvg.replace(/<svg/, '<svg style="max-width: 100%; height: auto;"');
          }
          
          processedContent = processedContent.replace(placeholder, cleanSvg);
          embeddedCount++;
        } else {
          console.warn(`SVG file does not exist at: ${svgPath}`);
          // Use fallback content
          const fallbackContent = `<div style="text-align: center; color: #64748b; padding: 2rem;">
            Mermaid diagram could not be rendered
          </div>`;
          processedContent = processedContent.replace(placeholder, fallbackContent);
        }
      } catch (error) {
        console.warn(`Error embedding SVG from ${svgPath}:`, error);
        const fallbackContent = `<div style="text-align: center; color: #64748b; padding: 2rem;">
          Mermaid diagram could not be rendered
        </div>`;
        processedContent = processedContent.replace(placeholder, fallbackContent);
      }
    }
    
    return processedContent;
  }

  /**
   * Cleanup temporary files
   */
  private async cleanup(): Promise<void> {
    try {
      if (await fs.pathExists(this.tempDir)) {
        await fs.remove(this.tempDir);
      }
    } catch (error) {
      console.warn('Error cleaning up temp files:', error);
    }
  }

  /**
   * Wrap HTML content in complete document with styles and mermaid support
   */
  private wrapInHtmlDocument(bodyContent: string): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Git History Report</title>
    <script src="https://cdn.jsdelivr.net/npm/mermaid@10.6.0/dist/mermaid.min.js"></script>
    <style>
        /* Base Typography */
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
        
        * {
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 14px;
            line-height: 1.7;
            color: #1a1a1a;
            background: #ffffff;
            margin: 0;
            padding: 30px 40px;
            max-width: 100%;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
        }
        
        /* Headings */
        h1, h2, h3, h4, h5, h6 {
            font-weight: 600;
            margin: 2rem 0 1rem 0;
            line-height: 1.3;
            color: #0f172a;
            page-break-after: avoid;
        }
        
        h1 {
            font-size: 2.5rem;
            font-weight: 700;
            color: #1e293b;
            border-bottom: 3px solid #3b82f6;
            padding-bottom: 0.75rem;
            margin-bottom: 2rem;
            page-break-before: always;
        }
        
        h2 {
            font-size: 1.875rem;
            color: #334155;
            border-bottom: 2px solid #e2e8f0;
            padding-bottom: 0.5rem;
            margin-top: 3rem;
            margin-bottom: 1.5rem;
        }
        
        h3 {
            font-size: 1.5rem;
            color: #475569;
            margin-top: 2.5rem;
            margin-bottom: 1rem;
        }
        
        h4 {
            font-size: 1.25rem;
            color: #64748b;
            margin-top: 2rem;
            margin-bottom: 0.75rem;
        }
        
        h5 {
            font-size: 1.125rem;
            color: #64748b;
            margin-top: 1.5rem;
            margin-bottom: 0.5rem;
        }
        
        h6 {
            font-size: 1rem;
            color: #64748b;
            margin-top: 1.25rem;
            margin-bottom: 0.5rem;
        }
        
        /* Paragraphs and Text */
        p {
            margin: 1rem 0;
            text-align: justify;
            hyphens: auto;
        }
        
        strong, b {
            font-weight: 600;
            color: #0f172a;
        }
        
        em, i {
            font-style: italic;
            color: #475569;
        }
        
        /* Lists */
        ul, ol {
            margin: 1rem 0;
            padding-left: 1.75rem;
        }
        
        li {
            margin: 0.5rem 0;
            line-height: 1.6;
        }
        
        ul li {
            list-style-type: disc;
        }
        
        ul ul li {
            list-style-type: circle;
        }
        
        ul ul ul li {
            list-style-type: square;
        }
        
        /* Tables */
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 1.5rem 0;
            font-size: 0.9rem;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
            border-radius: 8px;
            overflow: hidden;
            page-break-inside: avoid;
        }
        
        th {
            background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
            color: #334155;
            font-weight: 600;
            padding: 1rem 0.75rem;
            text-align: left;
            border-bottom: 2px solid #cbd5e1;
            font-size: 0.85rem;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }
        
        td {
            padding: 0.75rem;
            border-bottom: 1px solid #f1f5f9;
            vertical-align: top;
        }
        
        tr:nth-child(even) {
            background-color: #f8fafc;
        }
        
        tr:hover {
            background-color: #f1f5f9;
        }
        
        /* Code */
        code {
            font-family: 'JetBrains Mono', Monaco, 'Cascadia Code', 'Roboto Mono', monospace;
            font-size: 0.875em;
            background-color: #f1f5f9;
            color: #e11d48;
            padding: 0.25rem 0.375rem;
            border-radius: 4px;
            border: 1px solid #e2e8f0;
        }
        
        pre {
            font-family: 'JetBrains Mono', Monaco, 'Cascadia Code', 'Roboto Mono', monospace;
            background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 1.5rem;
            margin: 1.5rem 0;
            overflow-x: auto;
            font-size: 0.875rem;
            line-height: 1.5;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
            page-break-inside: avoid;
        }
        
        pre code {
            background: none;
            border: none;
            padding: 0;
            color: #334155;
            font-size: inherit;
        }
        
        /* Blockquotes */
        blockquote {
            border-left: 4px solid #3b82f6;
            background: #f8fafc;
            margin: 1.5rem 0;
            padding: 1rem 1.5rem;
            font-style: italic;
            color: #475569;
            border-radius: 0 8px 8px 0;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        
        blockquote p {
            margin: 0.5rem 0;
        }
        
        /* Mermaid Charts */
        .mermaid-container {
            text-align: center;
            margin: 2rem 0;
            padding: 1.5rem;
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
            page-break-inside: avoid;
            max-width: 100%;
            overflow: hidden;
        }
        
        .mermaid-container svg {
            max-width: 100% !important;
            height: auto !important;
            display: block;
            margin: 0 auto;
        }
        
        .svg-placeholder {
            min-height: 200px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        /* Badges and Images */
        img[alt*="badge"] {
            display: inline-block;
            margin: 2px 4px;
            border-radius: 4px;
        }
        
        img {
            max-width: 100%;
            height: auto;
            border-radius: 8px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        
        /* Horizontal Rules */
        hr {
            border: none;
            height: 2px;
            background: linear-gradient(90deg, #3b82f6 0%, #8b5cf6 50%, #06b6d4 100%);
            margin: 3rem 0;
            border-radius: 1px;
        }
        
        /* Links */
        a {
            color: #3b82f6;
            text-decoration: none;
            border-bottom: 1px solid transparent;
            transition: all 0.2s ease;
        }
        
        a:hover {
            color: #1d4ed8;
            border-bottom-color: #3b82f6;
        }
        
        /* Page Breaks */
        .page-break {
            page-break-before: always;
        }
        
        /* Print Styles */
        @media print {
            body {
                font-size: 12px;
                line-height: 1.6;
                color: #000000;
                print-color-adjust: exact;
                -webkit-print-color-adjust: exact;
            }
            
            h1 {
                font-size: 2rem;
                page-break-before: auto;
            }
            
            h2 {
                font-size: 1.5rem;
                page-break-before: avoid;
            }
            
            h3 {
                font-size: 1.25rem;
            }
            
            .mermaid-container {
                break-inside: avoid;
                page-break-inside: avoid;
                margin: 1rem 0;
                box-shadow: none;
                border: 1px solid #ccc;
            }
            
            table {
                break-inside: avoid;
                page-break-inside: avoid;
                font-size: 11px;
                box-shadow: none;
            }
            
            th {
                background: #f5f5f5 !important;
                color: #000 !important;
            }
            
            tr:nth-child(even) {
                background: #fafafa !important;
            }
            
            pre {
                break-inside: avoid;
                page-break-inside: avoid;
                background: #f8f8f8 !important;
                box-shadow: none;
                border: 1px solid #ddd;
            }
            
            blockquote {
                break-inside: avoid;
                page-break-inside: avoid;
                background: #f8f8f8 !important;
                box-shadow: none;
            }
            
            /* Avoid breaking after headings */
            h1, h2, h3, h4, h5, h6 {
                break-after: avoid;
                page-break-after: avoid;
            }
            
            /* Keep content together */
            p, li {
                orphans: 3;
                widows: 3;
            }
        }
        
        /* Utility Classes */
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .font-mono { font-family: 'JetBrains Mono', monospace; }
        .font-bold { font-weight: 600; }
        .text-sm { font-size: 0.875rem; }
        .text-lg { font-size: 1.125rem; }
        .mt-4 { margin-top: 1rem; }
        .mb-4 { margin-bottom: 1rem; }
        .p-4 { padding: 1rem; }
    </style>
</head>
<body>
    ${bodyContent}
    
    <script>
        // Load SVG files and embed them in placeholders
        document.addEventListener('DOMContentLoaded', function() {
            const placeholders = document.querySelectorAll('.svg-placeholder');
            
            placeholders.forEach(function(placeholder, index) {
                const svgPath = placeholder.getAttribute('data-svg-path');
                if (svgPath) {
                    // For server-side rendering, we'll embed the SVG content directly
                    // This will be handled by the PDF generator
                    placeholder.innerHTML = '<div>Loading SVG...</div>';
                }
            });
        });
    </script>
</body>
</html>`;
  }

  /**
   * Generate PDF from HTML content using Puppeteer
   */
  private async generatePdfFromHtml(
    htmlContent: string, 
    outputPath: string,
    options: {
      format: 'A4' | 'Letter' | 'A3';
      margin: { top?: string; right?: string; bottom?: string; left?: string; };
    }
  ): Promise<void> {
    const browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security',
        '--allow-running-insecure-content'
      ]
    });

    try {
      const page = await browser.newPage();
      
      // Set viewport for consistent rendering
      await page.setViewport({
        width: 1200,
        height: 800,
        deviceScaleFactor: 2 // Higher resolution for better quality
      });
      
      // Set content and wait for network to be idle (important for mermaid rendering)
      await page.setContent(htmlContent, { 
        waitUntil: ['networkidle0', 'domcontentloaded'] 
      });

      // Wait for fonts to load
      await page.evaluateHandle('document.fonts.ready');

      // Wait for embedded SVGs to load
      await page.waitForFunction(() => {
        const svgElements = document.querySelectorAll('.mermaid-container svg');
        if (svgElements.length === 0) return true;
        
        // Check if all SVGs have been rendered with actual content
        for (const svg of svgElements) {
          const rect = svg.getBoundingClientRect();
          if (rect.width === 0 || rect.height === 0) {
            return false;
          }
        }
        return true;
      }, { timeout: 30000 });

      // Additional wait to ensure all embedded SVGs are fully styled
      await page.waitForTimeout(1000);

      // Generate PDF with enhanced options
      await page.pdf({
        path: outputPath,
        format: options.format,
        margin: options.margin,
        printBackground: true,
        preferCSSPageSize: false,
        displayHeaderFooter: true,
        headerTemplate: '<div style="font-size: 10px; width: 100%; text-align: center; color: #64748b; margin-top: 10px;"></div>',
        footerTemplate: `
          <div style="font-size: 10px; width: 100%; text-align: center; color: #64748b; margin-bottom: 10px; font-family: 'Inter', sans-serif;">
            Page <span class="pageNumber"></span> of <span class="totalPages"></span>
          </div>
        `,
        // Enhanced PDF options for better quality
        scale: 0.8, // Slightly smaller scale for better fit
        tagged: true, // Generate tagged PDF for accessibility
        outline: true // Generate PDF outline/bookmarks
      });

    } finally {
      await browser.close();
    }
  }

  /**
   * Generate output path based on input markdown file
   */
  private generateOutputPath(markdownFilePath: string): string {
    const dir = path.dirname(markdownFilePath);
    const name = path.basename(markdownFilePath, path.extname(markdownFilePath));
    return path.join(dir, `${name}.pdf`);
  }

  /**
   * Validate and create output directory if needed
   */
  private async ensureOutputDirectory(outputPath: string): Promise<void> {
    const dir = path.dirname(outputPath);
    await fs.ensureDir(dir);
  }
}