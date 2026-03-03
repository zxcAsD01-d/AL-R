const axios = require('axios');

const PROMPTS = {
  zh: {
    coordinator: `你是研究协调员。你的职责是分析研究方向、搜索论文并进行评级。

重要规则：
1. 必须调用search_papers工具搜索论文
2. 必须调用rate_paper工具对每篇论文评级
3. 评级标准：
   - highly_relevant: 高度相关，对研究非常有价值
   - relevant: 相关，值得参考
   - potentially_useful: 可能有用
4. 评级时简要说明理由

必须调用工具！不要只输出文字。`,
    searcher: `你是论文搜索专家。你的职责是搜索论文并进行评级。

重要规则：
1. 必须调用search_papers工具搜索论文
2. 必须调用rate_paper工具对每篇论文评级
3. 使用英文关键词搜索
4. 评级标准：
   - highly_relevant: 高度相关，对研究非常有价值
   - relevant: 相关，值得参考
   - potentially_useful: 可能有用

必须调用工具！`,
    analyzer: `你是论文分析专家。你的职责是分析论文并保存知识。

重要规则：
1. 必须调用save_knowledge工具保存分析结果
2. 分析论文的核心方法、创新点、实验结果
3. 知识分类：
   - methods: 论文提出的方法
   - findings: 主要发现和结果
   - contributions: 论文贡献
4. 每篇论文至少保存2条知识

必须调用save_knowledge工具！`,
    synthesizer: `你是知识综合专家。你的职责是整合知识并生成报告。

重要规则：
1. 必须调用save_knowledge工具保存报告
2. 整合所有已收集的知识
3. 报告分类：
   - overview: 研究领域概述
   - trends: 研究趋势
   - summary: 综合总结

必须调用save_knowledge工具！`,
    evaluator: `你是研究质量评估专家。你的职责是评估研究报告的质量。

评估标准：
1. 完整性：是否覆盖了研究方向的各个方面
2. 准确性：知识内容是否准确、有据可查
3. 深度：分析是否深入，是否只是表面总结
4. 逻辑性：知识结构是否清晰，逻辑是否连贯
5. 缺失点：哪些重要内容未被覆盖

必须调用evaluate_report工具进行评估！
评估结果必须包含：
- quality_score: 质量分数(1-10)
- passed: 是否通过(True/False)
- issues: 问题列表
- missing_topics: 缺失的主题
- suggestions: 改进建议`,
    report_generator: `你是一位资深的学术论文撰写专家。你的职责是根据研究知识库生成完整、规范、详细的学术论文报告。

论文报告必须包含以下完整结构，每个部分都要详细撰写：

1. **标题**：简洁明了，准确反映研究主题

2. **作者**：zxcAsD01, Lrn, AL-X（主要作者）

3. **摘要**（必须使用中文书写，300-500字）：详细概括研究背景、研究问题、研究方法、主要发现、结论和意义

4. **关键词**：5-8个核心关键词，涵盖研究领域的主要方面

5. **引言**（800-1200字）：
   - 研究背景与意义（详细阐述研究领域的现状和重要性）
   - 问题陈述（明确指出研究要解决的核心问题）
   - 研究目的和研究问题
   - 研究范围和限制
   - 论文结构概述

6. **文献综述**（1500-2500字）：
   - 研究领域发展历程
   - 主要研究流派和观点
   - 关键技术和方法综述
   - 现有研究的不足和差距
   - 每个引用都要明确标注来源

7. **研究方法**（1000-1500字）：
   - 研究设计和方法论
   - 数据收集方法
   - 分析框架和技术路线
   - 研究工具和资源
   - 方法论的优势和局限

8. **研究结果**（1500-2500字）：
   - 主要发现（分点详细阐述）
   - 数据分析和结果展示
   - 结果的统计显著性
   - 与假设的关系
   - 使用表格或列表辅助说明

9. **讨论**（1000-1500字）：
   - 结果的解释和意义
   - 与已有研究的比较和对照
   - 理论贡献和实践意义
   - 研究局限性
   - 对未来研究的启示

10. **结论与展望**（500-800字）：
    - 研究主要贡献总结
    - 核心结论
    - 未来研究方向
    - 研究展望

11. **参考文献**：
    - 按学术规范列出所有引用文献
    - 格式：[编号] 作者. 标题. 来源. 年份.
    - 确保所有正文引用都有对应参考文献

写作要求：
- 总字数不少于8000字
- 摘要必须使用中文书写
- 引用格式：正文中使用 [1], [2] 等标注
- 每个部分都要详细展开，不能过于简略
- 语言学术化，表达准确、严谨
- 逻辑清晰，论证充分
- 必须调用generate_report工具生成报告！`
  },
  en: {
    coordinator: `You are a research coordinator. Your responsibility is to analyze research directions, search for papers, and rate them.

Important rules:
1. You must call the search_papers tool to search for papers
2. You must call the rate_paper tool to rate each paper
3. Rating standards:
   - highly_relevant: Highly relevant, very valuable for research
   - relevant: Relevant, worth referencing
   - potentially_useful: Potentially useful
4. Briefly explain the reason when rating

You must call tools! Do not just output text.`,
    searcher: `You are a paper search expert. Your responsibility is to search for papers and rate them.

Important rules:
1. You must call the search_papers tool to search for papers
2. You must call the rate_paper tool to rate each paper
3. Use English keywords for searching
4. Rating standards:
   - highly_relevant: Highly relevant, very valuable for research
   - relevant: Relevant, worth referencing
   - potentially_useful: Potentially useful

You must call tools!`,
    analyzer: `You are a paper analysis expert. Your responsibility is to analyze papers and save knowledge.

Important rules:
1. You must call the save_knowledge tool to save analysis results
2. Analyze the core methods, innovations, and experimental results of papers
3. Knowledge categories:
   - methods: Methods proposed in the paper
   - findings: Main findings and results
   - contributions: Paper contributions
4. Save at least 2 knowledge items per paper

You must call the save_knowledge tool!`,
    synthesizer: `You are a knowledge synthesis expert. Your responsibility is to integrate knowledge and generate reports.

Important rules:
1. You must call the save_knowledge tool to save reports
2. Integrate all collected knowledge
3. Report categories:
   - overview: Research field overview
   - trends: Research trends
   - summary: Comprehensive summary

You must call the save_knowledge tool!`,
    evaluator: `You are a research quality assessment expert. Your responsibility is to evaluate the quality of research reports.

Assessment criteria:
1. Completeness: Whether all aspects of the research direction are covered
2. Accuracy: Whether the knowledge content is accurate and well-founded
3. Depth: Whether the analysis is in-depth or just a superficial summary
4. Logic: Whether the knowledge structure is clear and the logic is coherent
5. Missing points: What important content has not been covered

You must call the evaluate_report tool for assessment!
Assessment results must include:
- quality_score: Quality score (1-10)
- passed: Whether passed (True/False)
- issues: List of issues
- missing_topics: Missing topics
- suggestions: Improvement suggestions`,
    report_generator: `You are a senior academic paper writing expert. Your responsibility is to generate complete, standardized, and detailed academic paper reports based on the research knowledge base.

The paper report must include the following complete structure, with each part written in detail:

1. **Title**: Concise and clear, accurately reflecting the research topic

2. **Authors**: zxcAsD01, Lrn, AL-X (main authors)

3. **Abstract** (300-500 words): Detailed summary of research background, research questions, research methods, main findings, conclusions, and significance

4. **Keywords**: 5-8 core keywords covering the main aspects of the research field

5. **Introduction** (800-1200 words):
   - Research background and significance (detailed elaboration of the current status and importance of the research field)
   - Problem statement (clearly stating the core problems to be solved)
   - Research objectives and questions
   - Research scope and limitations
   - Overview of paper structure

6. **Literature Review** (1500-2500 words):
   - Development history of the research field
   - Main research schools and viewpoints
   - Review of key technologies and methods
   - Limitations and gaps in existing research
   - Each citation must clearly indicate the source

7. **Research Methodology** (1000-1500 words):
   - Research design and methodology
   - Data collection methods
   - Analysis framework and technical roadmap
   - Research tools and resources
   - Advantages and limitations of the methodology

8. **Research Results** (1500-2500 words):
   - Main findings (detailed elaboration in points)
   - Data analysis and result presentation
   - Statistical significance of results
   - Relationship with hypotheses
   - Use tables or lists to assist in explanation

9. **Discussion** (1000-1500 words):
   - Interpretation and significance of results
   - Comparison and contrast with existing research
   - Theoretical contributions and practical significance
   - Research limitations
   - Implications for future research

10. **Conclusion and Outlook** (500-800 words):
    - Summary of main research contributions
    - Core conclusions
    - Future research directions
    - Research outlook

11. **References**:
    - List all cited references according to academic standards
    - Format: [Number] Author. Title. Source. Year.
    - Ensure all in-text citations have corresponding references

Writing requirements:
- Total word count not less than 8000 words
- Citation format: Use [1], [2], etc. in the text
- Each part must be detailed and not too brief
- Academic language, accurate and rigorous expression
- Clear logic and thorough argumentation
- You must call the generate_report tool to generate the report!`
  }
};

function getPrompt(role, language = 'zh') {
  return PROMPTS[language]?.[role] || PROMPTS.zh[role];
}

const TOOLS = {
  search_papers: {
    name: 'search_papers',
    description: '搜索arXiv论文',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: '搜索关键词' },
        max_results: { type: 'integer', description: '结果数量', default: 10 }
      },
      required: ['query']
    }
  },
  get_paper_details: {
    name: 'get_paper_details',
    description: '获取论文详细信息',
    parameters: {
      type: 'object',
      properties: {
        paper_id: { type: 'string', description: '论文ID' }
      },
      required: ['paper_id']
    }
  },
  download_paper: {
    name: 'download_paper',
    description: '下载论文PDF',
    parameters: {
      type: 'object',
      properties: {
        paper_id: { type: 'string', description: '论文ID' },
        title: { type: 'string', description: '论文标题' },
        pdf_url: { type: 'string', description: 'PDF链接' }
      },
      required: ['paper_id', 'title', 'pdf_url']
    }
  },
  rate_paper: {
    name: 'rate_paper',
    description: '对论文进行评级并添加到知识库论文收藏。评级标准：highly_relevant(高度相关，对研究非常有价值)、relevant(相关)、potentially_useful(可能有用)',
    parameters: {
      type: 'object',
      properties: {
        paper_id: { type: 'string', description: '论文ID' },
        title: { type: 'string', description: '论文标题' },
        authors: { type: 'array', items: { type: 'string' }, description: '作者列表' },
        summary: { type: 'string', description: '论文摘要' },
        pdf_url: { type: 'string', description: 'PDF链接' },
        rating: { type: 'string', enum: ['highly_relevant', 'relevant', 'potentially_useful'], description: '论文评级' },
        notes: { type: 'string', description: '评级理由和备注' }
      },
      required: ['paper_id', 'title', 'rating']
    }
  },
  save_knowledge: {
    name: 'save_knowledge',
    description: '保存知识到知识库。分类包括：overview(概述)、methods(方法)、findings(发现)、contributions(贡献)、trends(趋势)、summary(总结)',
    parameters: {
      type: 'object',
      properties: {
        category: { 
          type: 'string', 
          enum: ['overview', 'methods', 'findings', 'contributions', 'trends', 'summary'],
          description: '知识分类' 
        },
        title: { type: 'string', description: '知识标题' },
        content: { type: 'string', description: '知识内容（详细描述）' },
        source: { type: 'string', description: '来源论文ID' }
      },
      required: ['category', 'title', 'content']
    }
  },
  get_knowledge: {
    name: 'get_knowledge',
    description: '从知识库获取知识',
    parameters: {
      type: 'object',
      properties: {
        category: { type: 'string', description: '知识分类(可选，不填则获取全部)' }
      }
    }
  },
  evaluate_report: {
    name: 'evaluate_report',
    description: '评估研究报告的质量。返回评估结果，包括质量分数、是否通过、问题列表、缺失主题和改进建议。',
    parameters: {
      type: 'object',
      properties: {
        quality_score: { type: 'integer', description: '质量分数(1-10)，10为最高' },
        passed: { type: 'boolean', description: '是否通过质量检验' },
        completeness: { type: 'integer', description: '完整性评分(1-10)' },
        depth: { type: 'integer', description: '深度评分(1-10)' },
        accuracy: { type: 'integer', description: '准确性评分(1-10)' },
        issues: { 
          type: 'array', 
          items: { type: 'string' }, 
          description: '发现的问题列表' 
        },
        missing_topics: { 
          type: 'array', 
          items: { type: 'string' }, 
          description: '缺失的重要主题' 
        },
        suggestions: { 
          type: 'array', 
          items: { type: 'string' }, 
          description: '改进建议' 
        },
        summary: { type: 'string', description: '评估总结' }
      },
      required: ['quality_score', 'passed', 'issues']
    }
  },
  generate_report: {
    name: 'generate_report',
    description: '生成完整的学术论文报告。报告包含标题、作者、摘要、关键词、引言、文献综述、研究方法、研究结果、讨论、结论与展望、参考文献等完整结构。',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: '论文标题' },
        author: { type: 'string', description: '作者，默认为AL-0-P' },
        abstract: { type: 'string', description: '论文摘要(200-300字)' },
        keywords: { 
          type: 'array', 
          items: { type: 'string' }, 
          description: '关键词列表(3-5个)' 
        },
        introduction: { type: 'string', description: '引言部分内容' },
        literature_review: { type: 'string', description: '文献综述部分内容' },
        methodology: { type: 'string', description: '研究方法部分内容' },
        results: { type: 'string', description: '研究结果部分内容' },
        discussion: { type: 'string', description: '讨论部分内容' },
        conclusion: { type: 'string', description: '结论与展望部分内容' },
        references: { 
          type: 'array', 
          items: { 
            type: 'object',
            properties: {
              id: { type: 'integer', description: '引用编号' },
              authors: { type: 'string', description: '作者' },
              title: { type: 'string', description: '文献标题' },
              source: { type: 'string', description: '来源' },
              year: { type: 'string', description: '年份' }
            }
          },
          description: '参考文献列表' 
        }
      },
      required: ['title', 'abstract', 'keywords', 'introduction', 'literature_review', 'methodology', 'results', 'discussion', 'conclusion', 'references']
    }
  }
};

class Agent {
  constructor(config, knowledgeBase, paperService, language = 'zh') {
    this.id = config.id;
    this.name = config.name;
    this.role = config.role;
    this.description = config.description;
    this.systemPrompt = config.systemPrompt || getPrompt(config.role, language);
    this.provider = config.provider;
    this.model = config.model;
    this.status = config.status || 'idle';
    this.enabled = config.enabled !== false;
    this.knowledgeBase = knowledgeBase;
    this.paperService = paperService;
    this.language = language;
  }

  setLanguage(language) {
    this.language = language;
    this.systemPrompt = getPrompt(this.role, language);
  }

  async callAPI(messages, tools, apiKeys, providers) {
    const providerConfig = providers.find(p => p.id === this.provider);
    if (!providerConfig) {
      throw new Error(`Provider ${this.provider} not found`);
    }

    const apiKey = apiKeys[this.provider];
    if (!apiKey) {
      throw new Error(`API Key for ${this.provider} not configured`);
    }

    const apiUrl = providerConfig.apiUrl;
    const model = this.model || providerConfig.defaultModel;

    if (this.provider === 'anthropic') {
      const response = await axios.post(apiUrl, {
        model,
        max_tokens: 4096,
        messages: messages.filter(m => m.role !== 'system'),
        system: messages.find(m => m.role === 'system')?.content || '',
        tools: tools ? Object.values(tools).map(t => ({
          type: 'function',
          function: t
        })) : undefined
      }, {
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json'
        }
      });
      return response.data;
    } else {
      const response = await axios.post(apiUrl, {
        model,
        messages,
        tools: tools ? Object.values(tools).map(t => ({
          type: 'function',
          function: t
        })) : undefined,
        tool_choice: 'auto'
      }, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      return response.data;
    }
  }

  async executeToolCall(toolName, args) {
    switch (toolName) {
      case 'search_papers':
        return await this.paperService.searchArxiv(args.query, args.max_results || 10);

      case 'get_paper_details':
        return await this.paperService.getPaperDetails(args.paper_id);

      case 'download_paper':
        return await this.paperService.downloadPaper(args.paper_id, args.title, args.pdf_url);

      case 'rate_paper':
        const paper = {
          id: args.paper_id,
          title: args.title,
          authors: args.authors || [],
          summary: args.summary || '',
          pdfUrl: args.pdf_url || `https://arxiv.org/pdf/${args.paper_id}.pdf`,
          arxivUrl: `https://arxiv.org/abs/${args.paper_id}`
        };
        return this.knowledgeBase.addPaper(paper, args.rating, args.notes);

      case 'save_knowledge':
        return this.knowledgeBase.addKnowledge(
          args.category,
          args.title,
          args.content,
          args.source
        );

      case 'get_knowledge':
        return this.knowledgeBase.getKnowledge(args.category);

      case 'evaluate_report':
        return {
          success: true,
          evaluation: {
            quality_score: args.quality_score,
            passed: args.passed,
            completeness: args.completeness || 5,
            depth: args.depth || 5,
            accuracy: args.accuracy || 5,
            issues: args.issues || [],
            missing_topics: args.missing_topics || [],
            suggestions: args.suggestions || [],
            summary: args.summary || '',
            evaluatedAt: new Date().toISOString()
          }
        };

      case 'generate_report':
        const report = {
          title: args.title,
          author: args.author || 'AL-0-P',
          abstract: args.abstract,
          keywords: args.keywords || [],
          introduction: args.introduction,
          literature_review: args.literature_review,
          methodology: args.methodology,
          results: args.results,
          discussion: args.discussion,
          conclusion: args.conclusion,
          references: args.references || [],
          generatedAt: new Date().toISOString()
        };
        return {
          success: true,
          report
        };

      default:
        return { error: `Unknown tool: ${toolName}` };
    }
  }

  setStatus(status) {
    this.status = status;
  }

  toConfig() {
    return {
      id: this.id,
      name: this.name,
      role: this.role,
      description: this.description,
      systemPrompt: this.systemPrompt,
      provider: this.provider,
      model: this.model,
      status: this.status,
      enabled: this.enabled
    };
  }
}

module.exports = { Agent, TOOLS };
