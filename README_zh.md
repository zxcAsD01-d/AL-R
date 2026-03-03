# AI Researcher - 多Agent AI研究系统

## 项目简介

AL - R<small>esearcher</small>是一个基于多Agent架构的智能学术研究系统，能够自动进行文献检索、论文分析、知识整合和学术报告生成。系统通过多个专业Agent协同工作，实现从研究方向到完整学术论文报告的全流程自动化。

## 核心功能

### 1. 多Agent协同工作
- **Coordinator（协调器）**：整体协调研究流程，管理各Agent之间的协作
- **Searcher（搜索器）**：并行搜索arXiv论文库，使用不同关键词组合
- **Analyzer（分析器）**：深度分析论文内容，提取关键信息
- **Synthesizer（综合器）**：整合多个分析结果，生成综合知识
- **Evaluator（评估器）**：评估研究质量，提供改进建议
- **Report Generator（报告生成器）**：生成符合学术规范的完整论文报告

### 2. 智能迭代研究
- **最小/最大迭代轮数控制**：用户可设置1-20轮的迭代范围
- **自动质量评估**：每轮迭代后自动评估研究质量
- **动态论文搜索**：每轮都会搜索新论文，不断丰富研究视角
- **智能补充机制**：根据评估反馈自动补充缺失的研究内容

### 3. 知识库管理
- **分类存储**：研究概述、核心方法、主要发现、学术贡献等分类管理
- **论文收藏**：支持论文评级（高度相关/相关/可能有用）
- **项目隔离**：每个研究项目独立的知识库
- **时间线追踪**：记录所有研究活动的时间线

### 4. 论文系统
- **arXiv集成**：实时搜索arXiv论文库
- **论文下载**：支持PDF论文下载
- **收藏管理**：个人论文收藏夹
- **分类管理**：自定义论文分类
- **笔记功能**：为论文添加个人笔记

### 5. 学术报告生成
- **完整格式**：包含标题、作者、摘要、关键词、引言、方法、结果、讨论、结论、参考文献
- **中文摘要**：强制要求使用中文撰写摘要
- **多作者支持**：支持zxcAsD01、Lrn、AL-X等主要作者
- **PDF导出**：一键下载标准格式的学术论文PDF
- **引用规范**：自动生成规范的学术引用格式

## 技术架构

### 前端技术栈
- **HTML5**：语义化标签，响应式设计
- **CSS3**：Flexbox/Grid布局，CSS变量主题系统
- **JavaScript (ES6+)**：原生JavaScript，无框架依赖
- **Fetch API**：异步HTTP请求
- **Markdown**：Markdown渲染支持

### 后端技术栈
- **Node.js**：JavaScript运行时
- **Express.js**：Web应用框架
- **文件系统**：JSON数据持久化
- **arXiv API**：论文搜索接口
- **OpenAI API**：AI模型调用（支持多提供商）

### 核心模块
- **Orchestrator**：研究流程编排器
- **Agent**：AI Agent基类和具体实现
- **KnowledgeBase**：知识库管理系统
- **PaperService**：论文服务
- **Routes**：API路由定义

## 项目结构

```
ai-researcher/
├── public/                 # 前端静态文件
│   └── index.html      # 单页应用
├── services/              # 后端服务
│   ├── orchestrator.js   # 研究流程编排
│   ├── agent.js         # Agent实现
│   ├── knowledgeBase.js  # 知识库管理
│   ├── paperService.js   # 论文服务
│   └── routes.js        # API路由
├── data/                 # 数据目录
│   ├── projects.json     # 项目数据
│   ├── knowledge.json    # 知识库数据
│   ├── favorites.json    # 收藏论文
│   ├── categories.json   # 论文分类
│   ├── notes.json       # 论文笔记
│   └── downloads/       # 下载的PDF
├── config.json           # Agent配置
├── package.json         # 项目依赖
└── server.js            # 服务器入口
```

## API接口

### 项目管理
- `GET /api/projects` - 获取所有项目
- `POST /api/projects` - 创建新项目
- `GET /api/projects/:id` - 获取项目详情
- `POST /api/projects/:id/start` - 开始研究
- `POST /api/projects/:id/retry` - 重试研究
- `POST /api/projects/:id/generate-report` - 生成报告
- `GET /api/projects/:id/reports` - 获取报告列表

### Agent管理
- `GET /api/agents` - 获取所有Agent
- `POST /api/agents` - 创建新Agent
- `PUT /api/agents/:id` - 更新Agent
- `DELETE /api/agents/:id` - 删除Agent

### 知识库
- `GET /api/knowledge` - 获取知识库概览
- `GET /api/knowledge/projects` - 获取所有项目
- `GET /api/knowledge/projects/:projectId` - 获取项目知识
- `POST /api/knowledge/projects/:projectId/select` - 选择当前项目
- `GET /api/knowledge/papers` - 获取所有论文
- `GET /api/knowledge/timeline` - 获取时间线

### 论文系统
- `GET /api/papers` - 获取收藏论文
- `GET /api/papers/search` - 搜索论文
- `POST /api/papers/search` - 高级搜索
- `GET /api/papers/:id` - 获取论文详情
- `POST /api/papers/:id/favorite` - 切换收藏状态
- `GET /api/categories` - 获取分类
- `POST /api/categories` - 创建分类
- `DELETE /api/categories/:id` - 删除分类
- `GET /api/notes` - 获取笔记
- `POST /api/notes` - 创建笔记
- `PUT /api/notes/:id` - 更新笔记
- `DELETE /api/notes/:id` - 删除笔记
- `POST /api/papers/:id/download` - 下载论文

### 系统管理
- `GET /api/providers` - 获取AI提供商
- `POST /api/providers/:provider/apikey` - 设置API密钥
- `POST /api/providers/:provider/test` - 测试连接
- `GET /health` - 健康检查

## 使用指南

### 快速开始

1. **安装依赖**
```bash
npm install
```

2. **启动服务器**
```bash
npm start
```

3. **访问应用**
打开浏览器访问 `http://localhost:3002`

### 创建研究项目

1. 点击"创建项目"按钮
2. 填写项目信息：
   - 项目名称（必填，最多200字符）
   - 研究方向（必填，最多500字符）
   - 项目描述（可选，最多1000字符）
   - 最小迭代轮数（1-20）
   - 最大迭代轮数（1-20）
3. 点击"创建"按钮开始研究

### 研究流程

1. **第1轮**：使用研究方向搜索论文
2. **第2轮及以后**：
   - 如果评估未通过或有missing_topics：根据反馈补充搜索
   - 否则：使用新关键词"alternative perspective"搜索更多论文
3. **每轮迭代**：
   - 并行搜索论文（2个搜索器）
   - 并行分析论文（3个分析器）
   - 综合生成知识
   - 评估研究质量
4. **自动生成报告**：当评估通过且达到最小迭代轮数时

### 导出学术论文

1. 进入项目详情
2. 点击"生成学术报告"按钮
3. 等待报告生成完成
4. 点击"下载PDF"按钮

## 配置说明

### Agent配置

在`config.json`中配置Agent参数：

```json
{
  "agents": [
    {
      "id": "coordinator",
      "name": "协调器",
      "role": "研究流程协调",
      "systemPrompt": "...",
      "provider": "openai",
      "model": "gpt-4",
      "maxTokens": 4000
    }
  ]
}
```

### API密钥配置

支持多个AI提供商：
- OpenAI
- Anthropic
- 其他兼容OpenAI API的提供商

## 数据验证规则

### 前端验证
- 项目名称：必填，最多200字符
- 研究方向：必填，最多500字符
- 项目描述：可选，最多1000字符
- 最小迭代：1-20
- 最大迭代：1-20，且≥最小迭代

### 后端验证
- 所有POST请求都有数据验证
- 返回适当的HTTP状态码（400/404/500）
- 详细的错误消息

## 错误处理

### 前端错误处理
- 所有异步操作都有try-catch
- 友好的错误提示
- 控制台错误日志

### 后端错误处理
- API端点错误捕获
- 研究过程异常处理
- Agent调用失败处理
- 详细的错误日志

## 性能优化

### 并行处理
- 多个搜索器并行搜索论文
- 多个分析器并行分析论文
- Promise.all优化异步操作

### 数据缓存
- 知识库数据缓存
- 项目数据内存缓存
- 减少文件I/O操作

### 用户体验
- 实时进度更新
- 加载状态提示
- 响应式设计

## 安全性

### 输入验证
- 前后端双重验证
- 防止SQL注入
- 防止XSS攻击

### API密钥保护
- 不在日志中输出完整密钥
- 密钥加密存储（建议）

## 作者信息

主要作者：zxcAsD01

## 许可证

本项目由zxcAsD01提供

## 技术支持

如有问题或建议，请联系项目维护者。