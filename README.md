# AI Researcher - Multi-Agent AI Research System

## Project Overview

AL - R<small>esearcher</small> is an intelligent academic research system based on a multi-agent architecture that can automatically perform literature retrieval, paper analysis, knowledge integration, and academic report generation. The system achieves full-process automation from research direction to complete academic paper reports through the collaborative work of multiple specialized agents.

## Core Features

### 1. Multi-Agent Collaboration
- **Coordinator**: Overall coordination of the research process, managing collaboration between agents
- **Searcher**: Parallel search of arXiv paper database using different keyword combinations
- **Analyzer**: Deep analysis of paper content, extracting key information
- **Synthesizer**: Integrating multiple analysis results to generate comprehensive knowledge
- **Evaluator**: Evaluating research quality, providing improvement suggestions
- **Report Generator**: Generating complete academic paper reports that meet academic standards

### 2. Intelligent Iterative Research
- **Min/Max Iteration Control**: Users can set 1-20 iteration rounds
- **Automatic Quality Assessment**: Automatically evaluates research quality after each iteration
- **Dynamic Paper Search**: Each iteration searches for new papers, continuously enriching research perspectives
- **Intelligent Supplement Mechanism**: Automatically supplements missing research content based on evaluation feedback

### 3. Knowledge Base Management
- **Categorized Storage**: Research overview, core methods, main findings, academic contributions, etc.
- **Paper Favorites**: Supports paper ratings (highly relevant/relevant/potentially useful)
- **Project Isolation**: Each research project has an independent knowledge base
- **Timeline Tracking**: Records all research activities with timestamps

### 4. Paper System
- **arXiv Integration**: Real-time search of arXiv paper database
- **Paper Download**: Supports PDF paper downloads
- **Favorites Management**: Personal paper collection
- **Category Management**: Custom paper categories
- **Notes Feature**: Add personal notes to papers

### 5. Academic Report Generation
- **Complete Format**: Includes title, authors, abstract, keywords, introduction, methods, results, discussion, conclusion, references
- **Chinese Abstract**: Mandatory requirement to write abstract in Chinese
- **Multi-author Support**: Supports main authors like zxcAsD01, Lrn, AL-X
- **PDF Export**: One-click download of standard format academic paper PDF
- **Citation Standards**: Automatically generates standardized academic citation formats

## Technical Architecture

### Frontend Tech Stack
- **HTML5**: Semantic tags, responsive design
- **CSS3**: Flexbox/Grid layout, CSS variable theme system
- **JavaScript (ES6+)**: Native JavaScript, no framework dependencies
- **Fetch API**: Asynchronous HTTP requests
- **Markdown**: Markdown rendering support

### Backend Tech Stack
- **Node.js**: JavaScript runtime
- **Express.js**: Web application framework
- **File System**: JSON data persistence
- **arXiv API**: Paper search interface
- **OpenAI API**: AI model invocation (supports multiple providers)

### Core Modules
- **Orchestrator**: Research process orchestrator
- **Agent**: AI Agent base class and specific implementations
- **KnowledgeBase**: Knowledge base management system
- **PaperService**: Paper service
- **Routes**: API route definitions

## Project Structure

```
ai-researcher/
├── public/                 # Frontend static files
│   └── index.html      # Single page application
├── services/              # Backend services
│   ├── orchestrator.js   # Research process orchestration
│   ├── agent.js         # Agent implementation
│   ├── knowledgeBase.js  # Knowledge base management
│   ├── paperService.js   # Paper service
│   └── routes.js        # API routes
├── data/                 # Data directory
│   ├── projects.json     # Project data
│   ├── knowledge.json    # Knowledge base data
│   ├── favorites.json    # Favorite papers
│   ├── categories.json   # Paper categories
│   ├── notes.json       # Paper notes
│   └── downloads/       # Downloaded PDFs
├── config.json           # Agent configuration
├── package.json         # Project dependencies
└── server.js            # Server entry point
```

## API Endpoints

### Project Management
- `GET /api/projects` - Get all projects
- `POST /api/projects` - Create new project
- `GET /api/projects/:id` - Get project details
- `POST /api/projects/:id/start` - Start research
- `POST /api/projects/:id/retry` - Retry research
- `POST /api/projects/:id/generate-report` - Generate report
- `GET /api/projects/:id/reports` - Get report list

### Agent Management
- `GET /api/agents` - Get all agents
- `POST /api/agents` - Create new agent
- `PUT /api/agents/:id` - Update agent
- `DELETE /api/agents/:id` - Delete agent

### Knowledge Base
- `GET /api/knowledge` - Get knowledge base overview
- `GET /api/knowledge/projects` - Get all projects
- `GET /api/knowledge/projects/:projectId` - Get project knowledge
- `POST /api/knowledge/projects/:projectId/select` - Select current project
- `GET /api/knowledge/papers` - Get all papers
- `GET /api/knowledge/timeline` - Get timeline

### Paper System
- `GET /api/papers` - Get favorite papers
- `GET /api/papers/search` - Search papers
- `POST /api/papers/search` - Advanced search
- `GET /api/papers/:id` - Get paper details
- `POST /api/papers/:id/favorite` - Toggle favorite status
- `GET /api/categories` - Get categories
- `POST /api/categories` - Create category
- `DELETE /api/categories/:id` - Delete category
- `GET /api/notes` - Get notes
- `POST /api/notes` - Create note
- `PUT /api/notes/:id` - Update note
- `DELETE /api/notes/:id` - Delete note
- `POST /api/papers/:id/download` - Download paper

### System Management
- `GET /api/providers` - Get AI providers
- `POST /api/providers/:provider/apikey` - Set API key
- `POST /api/providers/:provider/test` - Test connection
- `GET /health` - Health check

## Usage Guide

### Quick Start

1. **Install Dependencies**
```bash
npm install
```

2. **Start Server**
```bash
npm start
```

3. **Access Application**
Open browser and visit `http://localhost:3002`

### Create Research Project

1. Click "Create Project" button
2. Fill in project information:
   - Project Name (required, max 200 characters)
   - Research Direction (required, max 500 characters)
   - Project Description (optional, max 1000 characters)
   - Minimum Iteration Rounds (1-20)
   - Maximum Iteration Rounds (1-20)
3. Click "Create" button to start research

### Research Process

1. **Round 1**: Search papers using research direction
2. **Round 2 and beyond**:
   - If evaluation fails or has missing_topics: Supplement search based on feedback
   - Otherwise: Use new keyword "alternative perspective" to search for more papers
3. **Each Iteration**:
   - Parallel paper search (2 searchers)
   - Parallel paper analysis (3 analyzers)
   - Synthesize and generate knowledge
   - Evaluate research quality
4. **Automatic Report Generation**: When evaluation passes and minimum iteration rounds are reached

### Export Academic Paper

1. Enter project details
2. Click "Generate Academic Report" button
3. Wait for report generation to complete
4. Click "Download PDF" button

## Configuration

### Agent Configuration

Configure agent parameters in `config.json`:

```json
{
  "agents": [
    {
      "id": "coordinator",
      "name": "Coordinator",
      "role": "Research process coordination",
      "systemPrompt": "...",
      "provider": "openai",
      "model": "gpt-4",
      "maxTokens": 4000
    }
  ]
}
```

### API Key Configuration

Supports multiple AI providers:
- OpenAI
- Anthropic
- Other OpenAI API-compatible providers

## Data Validation Rules

### Frontend Validation
- Project Name: Required, max 200 characters
- Research Direction: Required, max 500 characters
- Project Description: Optional, max 1000 characters
- Minimum Iterations: 1-20
- Maximum Iterations: 1-20, and ≥ minimum iterations

### Backend Validation
- All POST requests have data validation
- Returns appropriate HTTP status codes (400/404/500)
- Detailed error messages

## Error Handling

### Frontend Error Handling
- All async operations have try-catch
- Friendly error prompts
- Console error logging

### Backend Error Handling
- API endpoint error catching
- Research process exception handling
- Agent invocation failure handling
- Detailed error logging

## Performance Optimization

### Parallel Processing
- Multiple searchers search papers in parallel
- Multiple analyzers analyze papers in parallel
- Promise.all optimizes async operations

### Data Caching
- Knowledge base data caching
- Project data in-memory caching
- Reduce file I/O operations

### User Experience
- Real-time progress updates
- Loading state indicators
- Responsive design

## Security

### Input Validation
- Frontend and backend dual validation
- Prevent SQL injection
- Prevent XSS attacks

### API Key Protection
- No complete key output in logs
- Encrypted key storage (recommended)

## Author Information

Main Author: zxcAsD01

## License

This project is provided by zxcAsD01

## Technical Support

For questions or suggestions, please contact the project maintainer.
