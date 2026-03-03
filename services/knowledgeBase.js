const fs = require('fs').promises;
const path = require('path');

class KnowledgeBase {
  constructor(knowledgeFile) {
    this.knowledgeFile = knowledgeFile;
    this.currentProjectId = null;
    this.data = {
      currentProjectId: null,
      projects: {}
    };
  }

  async load() {
    try {
      const content = await fs.readFile(this.knowledgeFile, 'utf8');
      const loaded = JSON.parse(content);
      this.data = { ...this.data, ...loaded };
      this.currentProjectId = this.data.currentProjectId;
    } catch {
      await this.save();
    }
  }

  async save() {
    this.data.currentProjectId = this.currentProjectId;
    await fs.writeFile(this.knowledgeFile, JSON.stringify(this.data, null, 2));
  }

  initProject(projectId, name, direction) {
    if (!this.data.projects[projectId]) {
      this.data.projects[projectId] = {
        meta: {
          name,
          direction,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        categories: {
          overview: {
            name: '研究概述',
            description: '研究领域的整体概述和背景',
            items: []
          },
          methods: {
            name: '核心方法',
            description: '论文中提出的关键方法和技术',
            items: []
          },
          findings: {
            name: '主要发现',
            description: '研究的主要发现和实验结果',
            items: []
          },
          contributions: {
            name: '学术贡献',
            description: '论文的学术贡献和创新点',
            items: []
          },
          trends: {
            name: '研究趋势',
            description: '领域发展趋势和未来方向',
            items: []
          },
          summary: {
            name: '综合总结',
            description: '研究综合总结报告',
            items: []
          }
        },
        papers: {
          highly_relevant: {
            name: '高度相关',
            description: '对研究非常有价值的论文',
            papers: []
          },
          relevant: {
            name: '相关',
            description: '与研究相关的论文',
            papers: []
          },
          potentially_useful: {
            name: '可能有用',
            description: '可能对研究有帮助的论文',
            papers: []
          }
        },
        timeline: []
      };
    } else {
      this.data.projects[projectId].meta.name = name;
      this.data.projects[projectId].meta.direction = direction;
      this.data.projects[projectId].meta.updatedAt = new Date().toISOString();
    }
    
    this.currentProjectId = projectId;
    return this.save();
  }

  setCurrentProject(projectId) {
    if (this.data.projects[projectId]) {
      this.currentProjectId = projectId;
      this.save();
      return true;
    }
    return false;
  }

  getCurrentProject() {
    if (!this.currentProjectId || !this.data.projects[this.currentProjectId]) {
      return null;
    }
    return {
      id: this.currentProjectId,
      ...this.data.projects[this.currentProjectId]
    };
  }

  getAllProjects() {
    return Object.entries(this.data.projects).map(([id, project]) => ({
      id,
      ...project
    }));
  }

  addKnowledge(category, title, content, source, metadata = {}) {
    const project = this.getCurrentProject();
    if (!project) {
      return { error: 'No active project' };
    }

    if (!project.categories[category]) {
      project.categories[category] = {
        name: category,
        description: '',
        items: []
      };
    }

    const item = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      title,
      content,
      source: source || null,
      metadata: {
        ...metadata,
        createdAt: new Date().toISOString()
      }
    };

    this.data.projects[this.currentProjectId].categories[category].items.push(item);
    
    this.data.projects[this.currentProjectId].timeline.push({
      type: 'knowledge_added',
      category,
      title,
      timestamp: new Date().toISOString()
    });

    this.data.projects[this.currentProjectId].meta.updatedAt = new Date().toISOString();
    this.save();
    return { success: true, item };
  }

  addPaper(paper, rating = 'relevant', notes = '') {
    const project = this.getCurrentProject();
    if (!project) {
      return { error: 'No active project' };
    }

    const ratingMap = {
      'highly_relevant': 'highly_relevant',
      'relevant': 'relevant',
      'potentially_useful': 'potentially_useful',
      'high': 'highly_relevant',
      'medium': 'relevant',
      'low': 'potentially_useful'
    };

    const category = ratingMap[rating] || 'relevant';

    const existingPaper = this.findPaper(paper.id);
    if (existingPaper) {
      existingPaper.rating = category;
      existingPaper.notes = notes || existingPaper.notes;
      existingPaper.updatedAt = new Date().toISOString();
    } else {
      this.data.projects[this.currentProjectId].papers[category].papers.push({
        id: paper.id,
        title: paper.title,
        authors: paper.authors,
        summary: paper.summary,
        pdfUrl: paper.pdfUrl,
        arxivUrl: paper.arxivUrl,
        published: paper.published,
        rating: category,
        notes: notes,
        addedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }

    this.data.projects[this.currentProjectId].timeline.push({
      type: 'paper_added',
      paperId: paper.id,
      title: paper.title,
      rating: category,
      timestamp: new Date().toISOString()
    });

    this.data.projects[this.currentProjectId].meta.updatedAt = new Date().toISOString();
    this.save();
    return { success: true, rating: category };
  }

  findPaper(paperId) {
    const project = this.getCurrentProject();
    if (!project) return null;

    for (const category of Object.keys(project.papers)) {
      const paper = project.papers[category].papers.find(p => p.id === paperId);
      if (paper) return paper;
    }
    return null;
  }

  getKnowledge(category = null) {
    const project = this.getCurrentProject();
    if (!project) {
      return { error: 'No active project' };
    }

    if (category) {
      return project.categories[category] || { items: [] };
    }
    
    return {
      meta: project.meta,
      categories: project.categories,
      papers: project.papers,
      timeline: project.timeline
    };
  }

  getProjectKnowledge(projectId) {
    if (!this.data.projects[projectId]) {
      return null;
    }
    const project = this.data.projects[projectId];
    return {
      meta: project.meta,
      categories: project.categories,
      papers: project.papers,
      timeline: project.timeline
    };
  }

  getAllPapers() {
    const project = this.getCurrentProject();
    if (!project) return [];

    const allPapers = [];
    for (const [category, data] of Object.entries(project.papers)) {
      for (const paper of data.papers) {
        allPapers.push({ ...paper, category, categoryName: data.name });
      }
    }
    return allPapers.sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt));
  }

  getPapersByRating(rating) {
    const project = this.getCurrentProject();
    if (!project) return [];
    return project.papers[rating]?.papers || [];
  }

  getStatistics(projectId = null) {
    const targetProject = projectId 
      ? this.data.projects[projectId] 
      : this.getCurrentProject();
    
    if (!targetProject) {
      return { totalKnowledge: 0, totalPapers: 0, byCategory: {}, byRating: {} };
    }

    const stats = {
      totalKnowledge: 0,
      totalPapers: 0,
      byCategory: {},
      byRating: {}
    };

    for (const [key, category] of Object.entries(targetProject.categories)) {
      stats.byCategory[key] = category.items.length;
      stats.totalKnowledge += category.items.length;
    }

    for (const [key, rating] of Object.entries(targetProject.papers)) {
      stats.byRating[key] = rating.papers.length;
      stats.totalPapers += rating.papers.length;
    }

    return stats;
  }

  getTimeline(limit = 50) {
    const project = this.getCurrentProject();
    if (!project) return [];
    return project.timeline.slice(-limit).reverse();
  }

  clearProject(projectId) {
    if (this.data.projects[projectId]) {
      this.data.projects[projectId] = {
        meta: {
          name: '',
          direction: '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        categories: {
          overview: { name: '研究概述', description: '研究领域的整体概述和背景', items: [] },
          methods: { name: '核心方法', description: '论文中提出的关键方法和技术', items: [] },
          findings: { name: '主要发现', description: '研究的主要发现和实验结果', items: [] },
          contributions: { name: '学术贡献', description: '论文的学术贡献和创新点', items: [] },
          trends: { name: '研究趋势', description: '领域发展趋势和未来方向', items: [] },
          summary: { name: '综合总结', description: '研究综合总结报告', items: [] }
        },
        papers: {
          highly_relevant: { name: '高度相关', description: '对研究非常有价值的论文', papers: [] },
          relevant: { name: '相关', description: '与研究相关的论文', papers: [] },
          potentially_useful: { name: '可能有用', description: '可能对研究有帮助的论文', papers: [] }
        },
        timeline: []
      };
      return this.save();
    }
    return false;
  }

  clear() {
    this.data.projects = {};
    this.currentProjectId = null;
    return this.save();
  }
}

module.exports = KnowledgeBase;
