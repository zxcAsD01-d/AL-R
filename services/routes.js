const axios = require('axios');
const path = require('path');
const fs = require('fs');
const markdownPdf = require('markdown-pdf');

function getMessage(key, language = 'zh') {
  const messages = {
    zh: {
      providerNotFound: '提供商不存在',
      apiKeyNotConfigured: 'API Key未配置',
      apiConnectionNormal: 'API连接正常',
      apiKeyInvalid: 'API Key无效',
      apiConnectionNormalRateLimited: 'API连接正常(限流中)',
      apiError: 'API错误',
      connectionTimeout: '连接超时',
      projectNameRequired: '项目名称和研究方向为必填项',
      projectNameTooLong: '项目名称不能超过200个字符',
      directionTooLong: '研究方向不能超过500个字符',
      descriptionTooLong: '描述不能超过1000个字符',
      minIterationsInvalid: '最小迭代轮数必须在1-20之间',
      maxIterationsInvalid: '最大迭代轮数必须在1-20之间',
      minGreaterThanMax: '最小迭代轮数不能大于最大迭代轮数',
      restartResearch: '重新开始研究...',
      academicPaperReport: '学术论文报告'
    },
    en: {
      providerNotFound: 'Provider not found',
      apiKeyNotConfigured: 'API Key not configured',
      apiConnectionNormal: 'API connection normal',
      apiKeyInvalid: 'API Key invalid',
      apiConnectionNormalRateLimited: 'API connection normal (rate limited)',
      apiError: 'API error',
      connectionTimeout: 'Connection timeout',
      projectNameRequired: 'Project name and research direction are required',
      projectNameTooLong: 'Project name cannot exceed 200 characters',
      directionTooLong: 'Research direction cannot exceed 500 characters',
      descriptionTooLong: 'Description cannot exceed 1000 characters',
      minIterationsInvalid: 'Minimum iterations must be between 1-20',
      maxIterationsInvalid: 'Maximum iterations must be between 1-20',
      minGreaterThanMax: 'Minimum iterations cannot be greater than maximum iterations',
      restartResearch: 'Restarting research...',
      academicPaperReport: 'Academic Paper Report'
    }
  };
  return messages[language]?.[key] || messages.zh[key];
}

function generateMarkdownFromReport(report, language = 'zh') {
  const isZh = language === 'zh';
  let md = `# ${report.title || (isZh ? '学术论文报告' : 'Academic Paper Report')}\n\n`;
  md += `**${isZh ? '作者：' : 'Author: '}${report.author || 'AL-0-P'}**\n\n`;
  md += `---\n\n`;
  
  md += `## ${isZh ? '摘要' : 'Abstract'}\n\n`;
  md += `${report.abstract || ''}\n\n`;
  
  if (report.keywords && report.keywords.length > 0) {
    md += `**${isZh ? '关键词：' : 'Keywords: '}** ${report.keywords.map(k => `\`${k}\``).join(' ')}\n\n`;
  }
  
  md += `## ${isZh ? '1. 引言' : '1. Introduction'}\n\n`;
  md += `${report.introduction || ''}\n\n`;
  
  md += `## ${isZh ? '2. 文献综述' : '2. Literature Review'}\n\n`;
  md += `${report.literature_review || ''}\n\n`;
  
  md += `## ${isZh ? '3. 研究方法' : '3. Research Methodology'}\n\n`;
  md += `${report.methodology || ''}\n\n`;
  
  md += `## ${isZh ? '4. 研究结果' : '4. Research Results'}\n\n`;
  md += `${report.results || ''}\n\n`;
  
  md += `## ${isZh ? '5. 讨论' : '5. Discussion'}\n\n`;
  md += `${report.discussion || ''}\n\n`;
  
  md += `## ${isZh ? '6. 结论与展望' : '6. Conclusion & Outlook'}\n\n`;
  md += `${report.conclusion || ''}\n\n`;
  
  if (report.references && report.references.length > 0) {
    md += `## ${isZh ? '参考文献' : 'References'}\n\n`;
    report.references.forEach(ref => {
      md += `[${ref.id}] ${ref.authors}. ${ref.title}. ${ref.source}. ${ref.year}.\n\n`;
    });
  }
  
  md += `\n---\n\n`;
  md += `*${isZh ? '报告生成时间：' : 'Report generated at: '}${new Date(report.generatedAt).toLocaleString()}*\n`;
  
  return md;
}

function setupRoutes(app, orchestrator, paperService) {
  app.get('/api/agents', (req, res) => {
    res.json(orchestrator.getAllAgents());
  });

  app.post('/api/agents', async (req, res) => {
    try {
      const agent = orchestrator.addAgent(req.body);
      res.json(agent);
    } catch (error) {
      console.error('[Agents API] Error creating agent:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.put('/api/agents/:id', async (req, res) => {
    const agent = orchestrator.updateAgent(req.params.id, req.body);
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    res.json(agent);
  });

  app.delete('/api/agents/:id', async (req, res) => {
    orchestrator.removeAgent(req.params.id);
    res.json({ success: true });
  });

  app.get('/api/providers', (req, res) => {
    res.json({
      providers: orchestrator.getProviders(),
      apiKeys: orchestrator.getApiKeysStatus()
    });
  });

  app.post('/api/providers/:provider/apikey', (req, res) => {
    const { apiKey } = req.body;
    orchestrator.setApiKey(req.params.provider, apiKey);
    res.json({ success: true });
  });

  app.post('/api/providers/:provider/test', async (req, res) => {
    const providerId = req.params.provider;
    const provider = orchestrator.config.providers.find(p => p.id === providerId);
    const apiKey = orchestrator.config.apiKeys[providerId];
    const language = req.query.language || 'zh';
    
    if (!provider) {
      return res.json({ success: false, error: getMessage('providerNotFound', language) });
    }
    
    if (!apiKey) {
      return res.json({ success: false, error: getMessage('apiKeyNotConfigured', language) });
    }
    
    try {
      const apiUrl = provider.apiUrl;
      const model = provider.defaultModel;
      
      if (providerId === 'anthropic') {
        await axios.post(apiUrl, {
          model,
          max_tokens: 10,
          messages: [{ role: 'user', content: 'Hi' }]
        }, {
          headers: {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json'
          },
          timeout: 10000
        });
      } else {
        await axios.post(apiUrl, {
          model,
          messages: [{ role: 'user', content: 'Hi' }],
          max_tokens: 10
        }, {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        });
      }
      res.json({ success: true, message: getMessage('apiConnectionNormal', language) });
    } catch (error) {
      if (error.response) {
        if (error.response.status === 401) {
          res.json({ success: false, error: getMessage('apiKeyInvalid', language) });
        } else if (error.response.status === 429) {
          res.json({ success: true, message: getMessage('apiConnectionNormalRateLimited', language) });
        } else {
          res.json({ success: false, error: `${getMessage('apiError', language)}: ${error.response.status}` });
        }
      } else if (error.code === 'ECONNABORTED') {
        res.json({ success: false, error: getMessage('connectionTimeout', language) });
      } else {
        res.json({ success: false, error: error.message });
      }
    }
  });

  app.get('/api/projects', (req, res) => {
    res.json(orchestrator.getAllProjects());
  });

  app.post('/api/projects', async (req, res) => {
    try {
      const { name, description, direction, maxIterations, minIterations, language } = req.body;
      
      if (!name || !direction) {
        return res.status(400).json({ error: getMessage('projectNameRequired', language) });
      }
      
      if (name.length > 200) {
        return res.status(400).json({ error: getMessage('projectNameTooLong', language) });
      }
      
      if (direction.length > 500) {
        return res.status(400).json({ error: getMessage('directionTooLong', language) });
      }
      
      if (description && description.length > 1000) {
        return res.status(400).json({ error: getMessage('descriptionTooLong', language) });
      }
      
      const minIter = minIterations ? parseInt(minIterations) : 1;
      const maxIter = maxIterations ? parseInt(maxIterations) : 5;
      
      if (minIter < 1 || minIter > 20) {
        return res.status(400).json({ error: getMessage('minIterationsInvalid', language) });
      }
      
      if (maxIter < 1 || maxIter > 20) {
        return res.status(400).json({ error: getMessage('maxIterationsInvalid', language) });
      }
      
      if (minIter > maxIter) {
        return res.status(400).json({ error: getMessage('minGreaterThanMax', language) });
      }
      
      console.log('[Projects API] Received:', { name, direction, minIterations: minIter, maxIterations: maxIter, language });
      const project = orchestrator.createProject(name, description, direction, maxIter, minIter, language);
      console.log('[Projects API] Created project:', project);
      res.json(project);
    } catch (error) {
      console.error('[Projects API] Error creating project:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/projects/:id', (req, res) => {
    const project = orchestrator.getProject(req.params.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.json(project);
  });

  app.post('/api/projects/:id/start', async (req, res) => {
    try {
      const project = await orchestrator.startResearch(req.params.id);
      res.json(project);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/projects/:id/retry', async (req, res) => {
    try {
      const project = orchestrator.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }
      
      project.status = 'created';
      project.progress = 0;
      project.logs.push({
        time: new Date().toISOString(),
        message: '重新开始研究...',
        type: 'info'
      });
      await orchestrator.saveProjects();
      
      const result = await orchestrator.startResearch(req.params.id);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/knowledge', (req, res) => {
    const data = orchestrator.knowledgeBase.getKnowledge();
    const statistics = orchestrator.knowledgeBase.getStatistics();
    res.json({ ...data, statistics });
  });

  app.get('/api/knowledge/projects', (req, res) => {
    const projects = orchestrator.knowledgeBase.getAllProjects();
    res.json(projects);
  });

  app.get('/api/knowledge/projects/:projectId', (req, res) => {
    const data = orchestrator.knowledgeBase.getProjectKnowledge(req.params.projectId);
    if (!data) {
      return res.status(404).json({ error: 'Project not found in knowledge base' });
    }
    const statistics = orchestrator.knowledgeBase.getStatistics(req.params.projectId);
    res.json({ ...data, statistics });
  });

  app.post('/api/knowledge/projects/:projectId/select', (req, res) => {
    const success = orchestrator.knowledgeBase.setCurrentProject(req.params.projectId);
    res.json({ success });
  });

  app.get('/api/knowledge/papers', (req, res) => {
    const papers = orchestrator.knowledgeBase.getAllPapers();
    res.json(papers);
  });

  app.get('/api/knowledge/timeline', (req, res) => {
    const timeline = orchestrator.knowledgeBase.getTimeline(100);
    res.json(timeline);
  });

  app.post('/api/knowledge/clear', async (req, res) => {
    await orchestrator.knowledgeBase.clear();
    res.json({ success: true });
  });

  app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'ai-researcher' });
  });

  app.get('/api/readme', async (req, res) => {
    try {
      const fs = require('fs').promises;
      const path = require('path');
      const language = req.query.language || 'zh';
      const readmeFile = language === 'en' ? 'README.md' : 'README_zh.md';
      const readmePath = path.join(__dirname, '..', readmeFile);
      const readmeContent = await fs.readFile(readmePath, 'utf8');
      res.json({ content: readmeContent, language });
    } catch (error) {
      console.error('[Readme API] Error reading README:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/status', (req, res) => {
    res.json({
      aiResearcher: 'ok',
      paperSystem: 'integrated'
    });
  });

  app.get('/api/papers', async (req, res) => {
    try {
      const favorites = await paperService.getFavorites();
      res.json(favorites);
    } catch (error) {
      res.json([]);
    }
  });

  app.get('/api/papers/search', async (req, res) => {
    try {
      const query = req.query.q || '';
      if (!query) {
        return res.json([]);
      }
      const result = await paperService.searchArxiv(query, 20);
      res.json(result.papers);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/papers/search', async (req, res) => {
    try {
      const { query, max_results } = req.body;
      const result = await paperService.searchArxiv(query, max_results || 10);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/papers/:id', async (req, res) => {
    try {
      const paper = await paperService.getPaperDetails(req.params.id);
      res.json(paper);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/papers/:id/favorite', async (req, res) => {
    try {
      const result = await paperService.toggleFavorite(req.params.id);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/categories', async (req, res) => {
    try {
      const categories = await paperService.getCategories();
      res.json(categories);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch categories' });
    }
  });

  app.post('/api/categories', async (req, res) => {
    try {
      const { name, icon } = req.body;
      const result = await paperService.addCategory(name, icon);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete('/api/categories/:id', async (req, res) => {
    try {
      const result = await paperService.deleteCategory(req.params.id);
      if (result.error) {
        return res.status(400).json(result);
      }
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/notes', async (req, res) => {
    try {
      const notes = await paperService.getNotes();
      res.json(notes);
    } catch (error) {
      res.json([]);
    }
  });

  app.get('/api/notes/:paperId', async (req, res) => {
    try {
      const notes = await paperService.getNotes(req.params.paperId);
      res.json(notes);
    } catch (error) {
      res.json([]);
    }
  });

  app.post('/api/notes', async (req, res) => {
    try {
      const { paperId, title, content, isAIGenerated } = req.body;
      const result = await paperService.addNote(paperId, title, content, isAIGenerated);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put('/api/notes/:id', async (req, res) => {
    try {
      const { title, content } = req.body;
      const result = await paperService.updateNote(req.params.id, title, content);
      if (result.error) {
        return res.status(404).json(result);
      }
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete('/api/notes/:id', async (req, res) => {
    try {
      await paperService.deleteNote(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/downloads', async (req, res) => {
    try {
      const downloads = await paperService.getDownloads();
      res.json(downloads);
    } catch (error) {
      res.json([]);
    }
  });

  app.get('/downloads/:filename', (req, res) => {
    const filepath = paperService.getDownloadPath(req.params.filename);
    res.download(filepath);
  });

  app.post('/api/download', async (req, res) => {
    try {
      const { pdfUrl, paperId, title } = req.body;
      const result = await paperService.downloadPaper(paperId, title, pdfUrl);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/projects/:id/generate-report', async (req, res) => {
    try {
      const result = await orchestrator.generateReport(req.params.id);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/reports/:reportId', (req, res) => {
    const report = orchestrator.getReport(req.params.reportId);
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }
    res.json(report);
  });

  app.get('/api/projects/:id/reports', (req, res) => {
    const reports = orchestrator.getProjectReports(req.params.id);
    res.json(reports);
  });

  app.post('/api/reports/generate-pdf', async (req, res) => {
    try {
      const { report, language } = req.body;
      
      if (!report) {
        return res.status(400).json({ error: 'Report data is required' });
      }

      const markdownContent = generateMarkdownFromReport(report, language);
      const pdfDir = path.join(__dirname, '..', 'downloads');
      
      if (!fs.existsSync(pdfDir)) {
        fs.mkdirSync(pdfDir, { recursive: true });
      }

      const filename = `report_${Date.now()}.pdf`;
      const pdfPath = path.join(pdfDir, filename);

      const pdfOptions = {
        remarkable: {
          html: true,
          breaks: true,
          typographer: true
        },
        cssPath: path.join(__dirname, '..', 'public', 'pdf-style.css')
      };

      const cssContent = `
        body { font-family: 'Times New Roman', Times, serif; line-height: 1.8; margin: 40px; }
        h1 { text-align: center; font-size: 24px; margin-bottom: 20px; }
        h2 { font-size: 18px; border-bottom: 1px solid #ccc; padding-bottom: 10px; margin-top: 30px; }
        h3 { font-size: 16px; margin-top: 20px; }
        p { text-align: justify; margin-bottom: 15px; }
        .abstract { background: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0; }
        .keywords { margin: 20px 0; }
        .keyword { background: #e0e0e0; padding: 5px 10px; border-radius: 3px; margin-right: 10px; }
        ol, ul { margin-left: 20px; margin-bottom: 15px; }
        li { margin-bottom: 5px; }
        .references { font-size: 14px; }
        .author { text-align: center; font-size: 14px; color: #666; margin-bottom: 30px; }
      `;
      const cssPath = path.join(pdfDir, 'temp_style.css');
      fs.writeFileSync(cssPath, cssContent);

      markdownPdf({ cssPath })
        .from.string(markdownContent)
        .to(pdfPath, function(err) {
          fs.unlinkSync(cssPath);
          
          if (err) {
            return res.status(500).json({ error: 'PDF generation failed' });
          }
          
          const isZh = language === 'zh';
          res.json({ 
            success: true, 
            downloadUrl: `/downloads/${filename}`,
            filename: `${report.title || (isZh ? '学术论文报告' : 'Academic Paper Report')}.pdf`
          });
        });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/downloads/:filename', (req, res) => {
    const filepath = path.join(__dirname, '..', 'downloads', req.params.filename);
    if (fs.existsSync(filepath)) {
      res.download(filepath);
    } else {
      res.status(404).json({ error: 'File not found' });
    }
  });
}

module.exports = setupRoutes;
