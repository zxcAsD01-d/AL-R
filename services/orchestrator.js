const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { Agent, TOOLS } = require('./agent');
const KnowledgeBase = require('./knowledgeBase');

const MAX_ITERATIONS = 5;
const QUALITY_THRESHOLD = 7;
const MAX_ISSUES_ALLOWED = 2;
const MAX_MISSING_TOPICS_ALLOWED = 3;

class Orchestrator {
  constructor(configFile, knowledgeFile, projectsFile, paperService) {
    this.configFile = configFile;
    this.knowledgeFile = knowledgeFile;
    this.projectsFile = projectsFile;
    this.paperService = paperService;
    this.agents = new Map();
    this.knowledgeBase = new KnowledgeBase(knowledgeFile);
    this.projects = new Map();
    this.config = null;
    this.generatedReports = new Map();
  }

  async initialize() {
    await this.knowledgeBase.load();
    
    const content = await fs.readFile(this.configFile, 'utf8');
    this.config = JSON.parse(content);
    
    for (const agentConfig of this.config.agents) {
      const agent = new Agent(agentConfig, this.knowledgeBase, this.paperService);
      this.agents.set(agent.id, agent);
    }

    try {
      const projectsContent = await fs.readFile(this.projectsFile, 'utf8');
      const projectsData = JSON.parse(projectsContent);
      for (const [id, project] of Object.entries(projectsData)) {
        this.projects.set(id, project);
      }
    } catch {
      await this.saveProjects();
    }
  }

  async saveConfig() {
    this.config.agents = Array.from(this.agents.values()).map(a => a.toConfig());
    await fs.writeFile(this.configFile, JSON.stringify(this.config, null, 2));
  }

  async saveProjects() {
    const data = Object.fromEntries(this.projects);
    await fs.writeFile(this.projectsFile, JSON.stringify(data, null, 2));
  }

  addAgent(config) {
    const id = config.id || uuidv4();
    const agent = new Agent({ ...config, id }, this.knowledgeBase, this.paperService);
    this.agents.set(id, agent);
    this.config.agents.push({ ...config, id });
    this.saveConfig();
    return agent;
  }

  updateAgent(id, updates) {
    const agent = this.agents.get(id);
    if (!agent) return null;
    
    Object.assign(agent, updates);
    this.saveConfig();
    return agent;
  }

  removeAgent(id) {
    this.agents.delete(id);
    this.config.agents = this.config.agents.filter(a => a.id !== id);
    this.saveConfig();
  }

  getAgent(id) {
    return this.agents.get(id);
  }

  getAllAgents() {
    return Array.from(this.agents.values());
  }

  createProject(name, description, direction, maxIterations = 5, minIterations = 1, language = 'zh') {
    const id = uuidv4();
    const project = {
      id,
      name,
      description,
      direction,
      minIterations,
      maxIterations,
      language,
      status: 'created',
      progress: 0,
      createdAt: new Date().toISOString(),
      tasks: [],
      knowledge: {},
      logs: [],
      evaluations: []
    };
    this.projects.set(id, project);
    this.saveProjects();
    return project;
  }

  getProject(id) {
    return this.projects.get(id);
  }

  getAllProjects() {
    return Array.from(this.projects.values());
  }

  async startResearch(projectId) {
    const project = this.projects.get(projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    const language = project.language || 'zh';

    project.status = 'running';
    project.logs = [];
    project.progress = 0;
    project.evaluations = [];
    
    const logMessage = language === 'en' ? 'Research started' : '研究开始';
    project.logs.push({
      time: new Date().toISOString(),
      message: logMessage,
      type: 'info'
    });
    await this.saveProjects();

    this.knowledgeBase.initProject(projectId, project.name, project.direction);

    this.runResearch(projectId, language);
    return project;
  }

  async runResearch(projectId, language = 'zh') {
    const project = this.projects.get(projectId);
    const coordinator = this.agents.get('coordinator');
    const searcher = this.agents.get('searcher');
    const searcher2 = this.agents.get('searcher_2');
    const analyzer = this.agents.get('analyzer');
    const analyzer2 = this.agents.get('analyzer_2');
    const analyzer3 = this.agents.get('analyzer_3');
    const synthesizer = this.agents.get('synthesizer');
    const evaluator = this.agents.get('evaluator');
    const reportGenerator = this.agents.get('report_generator');

    const analyzers = [analyzer, analyzer2, analyzer3].filter(a => a);
    const searchers = [searcher, searcher2].filter(s => s);

    let iteration = 0;
    let evaluationResult = null;
    const minIterations = project.minIterations || 1;
    const maxIterations = project.maxIterations || MAX_ITERATIONS;

    try {
      while (iteration < maxIterations) {
        iteration++;
        this.addLog(project, 'system', `开始第 ${iteration} 轮研究 (最小 ${minIterations} 轮，最大 ${maxIterations} 轮)`, 'info');
        await this.saveProjects();

        if (iteration === 1 || iteration > 1) {
          let searchKeywords = project.direction;
          if (evaluationResult && evaluationResult.missing_topics?.length > 0) {
            searchKeywords = evaluationResult.missing_topics.join(', ');
            this.addLog(project, 'coordinator', `根据评估反馈，补充搜索: ${searchKeywords}`, 'progress');
          } else if (iteration > 1) {
            searchKeywords = `${project.direction} alternative perspective`;
            this.addLog(project, 'coordinator', `第 ${iteration} 轮：使用新关键词搜索更多论文来丰富视角`, 'progress');
          }

          this.addLog(project, 'coordinator', '正在并行搜索论文...', 'progress');
          await this.saveProjects();

          const searchPromises = searchers.map((searcherAgent, index) => {
            const keywords = index === 0 ? searchKeywords : `${searchKeywords} review survey`;
            return this.runAgentWithTools(
              searcherAgent,
              [
                { role: 'system', content: searcherAgent.systemPrompt },
                { role: 'user', content: `研究方向: ${keywords}\n\n请搜索论文并评级。使用不同的关键词组合。` }
              ],
              { search_papers: TOOLS.search_papers, rate_paper: TOOLS.rate_paper },
              10
            );
          });

          await Promise.all(searchPromises);

          const papersInKB = this.knowledgeBase.getAllPapers();
          if (papersInKB.length < 5) {
            this.addLog(project, 'searcher', '论文数量不足，继续补充搜索...', 'progress');
            await this.saveProjects();

            await this.runAgentWithTools(
              coordinator,
              [
                { role: 'system', content: coordinator.systemPrompt },
                { role: 'user', content: `研究方向: ${searchKeywords}\n\n请搜索更多论文并评级。` }
              ],
              { search_papers: TOOLS.search_papers, rate_paper: TOOLS.rate_paper },
              10
            );
          }

          const updatedPapers = this.knowledgeBase.getAllPapers();
          this.addLog(project, 'searcher', `已收藏 ${updatedPapers.length} 篇论文`, 'result');
          project.progress = 20;
          await this.saveProjects();

          const highlyRelevantPapers = this.knowledgeBase.getPapersByRating('highly_relevant');
          const relevantPapers = this.knowledgeBase.getPapersByRating('relevant');
          let papersToAnalyze = [...highlyRelevantPapers, ...relevantPapers];

          if (papersToAnalyze.length === 0 && updatedPapers.length > 0) {
            papersToAnalyze.push(...updatedPapers);
          }

          if (papersToAnalyze.length > 0) {
            this.addLog(project, 'analyzer', `并行分析 ${papersToAnalyze.length} 篇论文...`, 'progress');
            await this.saveProjects();

            const papersPerAnalyzer = Math.ceil(papersToAnalyze.length / analyzers.length);
            const analyzePromises = [];

            for (let i = 0; i < analyzers.length; i++) {
              const startIndex = i * papersPerAnalyzer;
              const endIndex = Math.min(startIndex + papersPerAnalyzer, papersToAnalyze.length);
              const papersForThisAnalyzer = papersToAnalyze.slice(startIndex, endIndex);

              if (papersForThisAnalyzer.length > 0) {
                this.addLog(project, `analyzer_${i + 1}`, `分析 ${papersForThisAnalyzer.length} 篇论文`, 'progress');
                
                const analyzePapersSequentially = async (papers, analyzerAgent) => {
                  for (const paper of papers) {
                    await this.runAgentWithTools(
                      analyzerAgent,
                      [
                        { role: 'system', content: analyzerAgent.systemPrompt },
                        { role: 'user', content: `请分析以下论文并保存知识:\n\n标题: ${paper.title}\n摘要: ${paper.summary}\n\n必须调用save_knowledge工具！每篇论文保存3-5条详细知识！` }
                      ],
                      { save_knowledge: TOOLS.save_knowledge },
                      5
                    );
                  }
                };

                analyzePromises.push(analyzePapersSequentially(papersForThisAnalyzer, analyzers[i]));
              }
            }

            await Promise.all(analyzePromises);
            project.progress = 50;
            await this.saveProjects();
          }
        }

        this.addLog(project, 'synthesizer', '正在生成报告...', 'progress');
        project.progress = 60;
        await this.saveProjects();

        const knowledge = this.knowledgeBase.getKnowledge();
        
        await this.runAgentWithTools(
          synthesizer,
          [
            { role: 'system', content: synthesizer.systemPrompt },
            { role: 'user', content: `研究方向: ${project.direction}\n\n请基于以下知识生成综合研究报告:\n\n${JSON.stringify(knowledge, null, 2)}\n\n必须调用save_knowledge工具！` }
          ],
          { save_knowledge: TOOLS.save_knowledge },
          5
        );

        this.addLog(project, 'evaluator', '正在评估报告质量...', 'progress');
        project.progress = 80;
        await this.saveProjects();

        const updatedKnowledge = this.knowledgeBase.getKnowledge();
        
        const evalResult = await this.runAgentWithTools(
          evaluator,
          [
            { role: 'system', content: evaluator.systemPrompt },
            { role: 'user', content: `研究方向: ${project.direction}\n\n请评估以下研究报告的质量:\n\n${JSON.stringify(updatedKnowledge, null, 2)}\n\n必须调用evaluate_report工具进行评估！评估标准：\n1. 完整性：是否覆盖了研究方向的各个方面\n2. 深度：分析是否深入\n3. 准确性：内容是否准确\n4. 缺失点：哪些重要内容未被覆盖\n\n质量分数 >= ${QUALITY_THRESHOLD} 才能通过。` }
          ],
          { evaluate_report: TOOLS.evaluate_report },
          3
        );

        evaluationResult = evalResult.evaluation;
        
        if (evaluationResult) {
          project.evaluations.push({
            iteration,
            ...evaluationResult
          });
          
          this.addLog(project, 'evaluator', 
            `评估结果: ${evaluationResult.passed ? '通过' : '未通过'} - 质量分数 ${evaluationResult.quality_score}/10`, 
            evaluationResult.passed ? 'success' : 'warning'
          );
          
          if (evaluationResult.issues) {
            const issuesArray = Array.isArray(evaluationResult.issues) 
              ? evaluationResult.issues 
              : (() => {
                  try {
                    const parsed = JSON.parse(evaluationResult.issues);
                    return Array.isArray(parsed) ? parsed : [evaluationResult.issues];
                  } catch {
                    return [evaluationResult.issues];
                  }
                })();
            if (issuesArray.length > 0) {
              this.addLog(project, 'evaluator', `问题: ${issuesArray.join('; ')}`, 'info');
            }
          }
          
          await this.saveProjects();
        }

        if (evaluationResult && evaluationResult.passed && iteration >= minIterations) {
          break;
        }

        if (iteration < maxIterations && evaluationResult && !evaluationResult.passed) {
          this.addLog(project, 'system', '评估未通过，将进行补充研究...', 'info');
          if (evaluationResult.suggestions) {
            const suggestionsArray = Array.isArray(evaluationResult.suggestions)
              ? evaluationResult.suggestions
              : (() => {
                  try {
                    const parsed = JSON.parse(evaluationResult.suggestions);
                    return Array.isArray(parsed) ? parsed : [evaluationResult.suggestions];
                  } catch {
                    return [evaluationResult.suggestions];
                  }
                })();
            if (suggestionsArray.length > 0) {
              this.addLog(project, 'evaluator', `建议: ${suggestionsArray.join('; ')}`, 'info');
            }
          }
          await this.saveProjects();
        }
      }

      if (evaluationResult && evaluationResult.passed) {
        this.addLog(project, 'report_generator', '评估通过，正在自动生成学术论文报告...', 'progress');
        await this.saveProjects();
        
        const reportResult = await this.generateReport(projectId);
        
        if (reportResult.success) {
          this.addLog(project, 'report_generator', '学术论文报告已生成并保存到知识库', 'success');
          
          if (reportResult.report) {
            this.knowledgeBase.addKnowledge(
              'summary',
              `学术论文报告: ${reportResult.report.title}`,
              JSON.stringify(reportResult.report, null, 2),
              'report_generator'
            );
          }
        } else {
          this.addLog(project, 'report_generator', `报告生成失败: ${reportResult.error}`, 'warning');
        }
      }

      project.status = 'completed';
      project.progress = 100;
      
      if (evaluationResult && evaluationResult.passed) {
        this.addLog(project, 'system', `研究完成！经过 ${iteration} 轮迭代，报告质量达标`, 'success');
      } else {
        this.addLog(project, 'system', `研究完成！经过 ${iteration} 轮迭代，报告质量分数: ${evaluationResult?.quality_score || 'N/A'}`, 'warning');
      }
      
      await this.saveProjects();

    } catch (error) {
      project.status = 'failed';
      this.addLog(project, 'system', `错误: ${error.message}`, 'error');
      await this.saveProjects();
      
      [coordinator, ...searchers, ...analyzers, synthesizer, evaluator, reportGenerator].forEach(a => a?.setStatus('idle'));
    }
  }

  addLog(project, agent, message, type) {
    project.logs.push({
      time: new Date().toISOString(),
      agent,
      message,
      type
    });
  }

  async runAgentWithTools(agent, messages, tools, maxIterations = 5) {
    agent.setStatus('running');
    const result = {
      papers: [],
      ratedPapers: [],
      knowledgeSaved: false,
      evaluation: null,
      report: null,
      response: null
    };

    let currentMessages = [...messages];
    let iterations = 0;

    while (iterations < maxIterations) {
      const response = await agent.callAPI(currentMessages, tools, this.config.apiKeys, this.config.providers);
      result.response = response;
      iterations++;

      if (response.choices) {
        const message = response.choices[0].message;
        
        if (message.tool_calls && message.tool_calls.length > 0) {
          currentMessages.push(message);
          
          for (const toolCall of message.tool_calls) {
            const toolName = toolCall.function.name;
            const args = JSON.parse(toolCall.function.arguments);
            
            const toolResult = await agent.executeToolCall(toolName, args);
            
            if (toolName === 'search_papers' && toolResult.papers) {
              result.papers.push(...toolResult.papers);
            }
            if (toolName === 'rate_paper') {
              result.ratedPapers.push({
                paperId: args.paper_id,
                rating: args.rating
              });
            }
            if (toolName === 'save_knowledge') {
              result.knowledgeSaved = true;
            }
            if (toolName === 'evaluate_report') {
              result.evaluation = toolResult.evaluation;
            }
            if (toolName === 'generate_report') {
              result.report = toolResult.report;
            }
            
            currentMessages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: JSON.stringify(toolResult)
            });
          }
        } else {
          break;
        }
      } else if (response.content) {
        const content = response.content[0];
        
        if (content.type === 'tool_use') {
          const toolName = content.name;
          const args = content.input;
          
          const toolResult = await agent.executeToolCall(toolName, args);
          
          if (toolName === 'search_papers' && toolResult.papers) {
            result.papers.push(...toolResult.papers);
          }
          if (toolName === 'rate_paper') {
            result.ratedPapers.push({
              paperId: args.paper_id,
              rating: args.rating
            });
          }
          if (toolName === 'save_knowledge') {
            result.knowledgeSaved = true;
          }
          if (toolName === 'evaluate_report') {
            result.evaluation = toolResult.evaluation;
          }
          if (toolName === 'generate_report') {
            result.report = toolResult.report;
          }
          
          currentMessages.push({
            role: 'assistant',
            content: response.content
          });
          currentMessages.push({
            role: 'user',
            content: [{
              type: 'tool_result',
              tool_use_id: content.id,
              content: JSON.stringify(toolResult)
            }]
          });
        } else {
          break;
        }
      } else {
        break;
      }
    }

    agent.setStatus('idle');
    return result;
  }

  setApiKey(provider, apiKey) {
    this.config.apiKeys[provider] = apiKey;
    this.saveConfig();
  }

  getProviders() {
    return this.config.providers;
  }

  getApiKeysStatus() {
    return Object.keys(this.config.apiKeys).reduce((acc, key) => {
      acc[key] = !!this.config.apiKeys[key];
      return acc;
    }, {});
  }

  async generateReport(projectId) {
    const project = this.projects.get(projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    const reportGenerator = this.agents.get('report_generator');
    if (!reportGenerator) {
      throw new Error('Report generator agent not found');
    }

    this.knowledgeBase.setCurrentProject(projectId);
    const knowledge = this.knowledgeBase.getKnowledge();
    const papers = this.knowledgeBase.getAllPapers();

    this.addLog(project, 'report_generator', '正在生成学术论文报告...', 'progress');
    await this.saveProjects();

    const papersInfo = papers.map(p => ({
      title: p.title,
      authors: p.authors?.join(', ') || 'Unknown',
      source: p.arxivUrl || 'arXiv',
      year: p.published?.split('-')[0] || new Date().getFullYear().toString()
    }));

    const result = await this.runAgentWithTools(
      reportGenerator,
      [
        { role: 'system', content: reportGenerator.systemPrompt },
        { role: 'user', content: `研究方向: ${project.direction}

请基于以下研究知识生成一篇完整的学术论文报告。

## 研究知识库内容

${JSON.stringify(knowledge, null, 2)}

## 已收集论文信息

${JSON.stringify(papersInfo, null, 2)}

要求：
1. 必须调用generate_report工具生成报告
2. 报告必须包含完整的学术论文结构
3. 引用必须明确标注来源
4. 作者统一为：AL-0-P
5. 参考文献必须包含已收集的论文信息

必须调用generate_report工具！` }
      ],
      { generate_report: TOOLS.generate_report },
      3
    );

    if (result.report) {
      const reportId = Date.now().toString();
      this.generatedReports.set(reportId, {
        id: reportId,
        projectId,
        ...result.report
      });

      this.addLog(project, 'report_generator', '学术论文报告生成完成！', 'success');
      await this.saveProjects();

      return {
        success: true,
        reportId,
        report: result.report
      };
    }

    this.addLog(project, 'report_generator', '报告生成失败', 'error');
    await this.saveProjects();
    return { success: false, error: 'Failed to generate report' };
  }

  getReport(reportId) {
    return this.generatedReports.get(reportId);
  }

  getProjectReports(projectId) {
    return Array.from(this.generatedReports.values())
      .filter(r => r.projectId === projectId);
  }
}

module.exports = Orchestrator;
