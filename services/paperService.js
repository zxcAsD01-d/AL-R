const axios = require('axios');
const xml2js = require('xml2js');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');

const ARXIV_API_BASE = 'http://export.arxiv.org/api/query';

class PaperService {
  constructor(dataDir, downloadsDir) {
    this.dataDir = dataDir;
    this.downloadsDir = downloadsDir;
    this.favoritesFile = path.join(dataDir, 'favorites.json');
    this.categoriesFile = path.join(dataDir, 'categories.json');
    this.notesFile = path.join(dataDir, 'notes.json');
  }

  async init() {
    await fs.mkdir(this.dataDir, { recursive: true });
    await fs.mkdir(this.downloadsDir, { recursive: true });
    
    if (!fsSync.existsSync(this.favoritesFile)) {
      await fs.writeFile(this.favoritesFile, JSON.stringify([]));
    }
    if (!fsSync.existsSync(this.categoriesFile)) {
      await fs.writeFile(this.categoriesFile, JSON.stringify([
        { id: 'default', name: '默认分类', icon: 'folder' },
        { id: 'ml', name: '机器学习', icon: 'brain' },
        { id: 'nlp', name: '自然语言处理', icon: 'message' },
        { id: 'cv', name: '计算机视觉', icon: 'eye' }
      ]));
    }
    if (!fsSync.existsSync(this.notesFile)) {
      await fs.writeFile(this.notesFile, JSON.stringify([]));
    }
  }

  async searchArxiv(query, maxResults = 10) {
    const searchQuery = `search_query=all:${encodeURIComponent(query)}&start=0&max_results=${maxResults}`;
    const url = `${ARXIV_API_BASE}?${searchQuery}`;

    const response = await axios.get(url, {
      headers: { 'User-Agent': 'AI-Researcher/1.0' }
    });

    const parser = new xml2js.Parser();
    const result = await parser.parseStringPromise(response.data);

    if (!result.feed.entry) {
      return { papers: [], total: 0 };
    }

    const papers = result.feed.entry.map(entry => this.parseEntry(entry));
    return { success: true, papers, total: papers.length };
  }

  async getPaperDetails(paperId) {
    const searchQuery = `id_list=${encodeURIComponent(paperId)}`;
    const url = `${ARXIV_API_BASE}?${searchQuery}`;

    const response = await axios.get(url, {
      headers: { 'User-Agent': 'AI-Researcher/1.0' }
    });

    const parser = new xml2js.Parser();
    const result = await parser.parseStringPromise(response.data);

    if (!result.feed.entry || result.feed.entry.length === 0) {
      return { error: 'Paper not found' };
    }

    return this.parseEntry(result.feed.entry[0]);
  }

  parseEntry(entry) {
    const authors = entry.author ? entry.author.map(a => a.name[0]) : [];
    const categories = entry.category ? entry.category.map(c => c.$.term) : [];
    const arxivId = entry.id[0].split('/').pop();

    return {
      id: arxivId,
      title: entry.title[0].replace(/\s+/g, ' ').trim(),
      authors,
      summary: entry.summary[0].replace(/\s+/g, ' ').trim(),
      published: entry.published[0],
      updated: entry.updated[0],
      categories,
      pdfUrl: `https://arxiv.org/pdf/${arxivId}.pdf`,
      arxivUrl: `https://arxiv.org/abs/${arxivId}`
    };
  }

  async downloadPaper(paperId, title, pdfUrl) {
    try {
      const response = await axios({
        method: 'GET',
        url: pdfUrl || `https://arxiv.org/pdf/${paperId}.pdf`,
        responseType: 'stream'
      });
      
      const safeTitle = (title || paperId).replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_').substring(0, 100);
      const filename = `${paperId}_${safeTitle}.pdf`;
      const filepath = path.join(this.downloadsDir, filename);
      
      const writer = fsSync.createWriteStream(filepath);
      response.data.pipe(writer);
      
      return new Promise((resolve, reject) => {
        writer.on('finish', () => resolve({ success: true, filename, filepath }));
        writer.on('error', reject);
      });
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async getFavorites() {
    try {
      const data = await fs.readFile(this.favoritesFile, 'utf8');
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  async toggleFavorite(paperId) {
    const paper = await this.getPaperDetails(paperId);
    if (paper.error) return paper;

    const favorites = await this.getFavorites();
    const exists = favorites.find(f => f.id === paperId);
    
    if (exists) {
      favorites.splice(favorites.indexOf(exists), 1);
    } else {
      favorites.push({ ...paper, favorite: true, addedAt: new Date().toISOString() });
    }
    
    await fs.writeFile(this.favoritesFile, JSON.stringify(favorites, null, 2));
    return { success: true, favorites };
  }

  async getCategories() {
    try {
      const data = await fs.readFile(this.categoriesFile, 'utf8');
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  async addCategory(name, icon = 'folder') {
    const categories = await this.getCategories();
    const id = name.toLowerCase().replace(/\s+/g, '-');
    categories.push({ id, name, icon });
    await fs.writeFile(this.categoriesFile, JSON.stringify(categories, null, 2));
    return { success: true, categories };
  }

  async deleteCategory(id) {
    if (id === 'default') return { error: 'Cannot delete default category' };
    
    let categories = await this.getCategories();
    categories = categories.filter(c => c.id !== id);
    await fs.writeFile(this.categoriesFile, JSON.stringify(categories, null, 2));
    return { success: true, categories };
  }

  async getNotes(paperId = null) {
    try {
      const data = await fs.readFile(this.notesFile, 'utf8');
      const notes = JSON.parse(data);
      return paperId ? notes.filter(n => n.paperId === paperId) : notes;
    } catch {
      return [];
    }
  }

  async addNote(paperId, title, content, isAIGenerated = false) {
    const notes = await this.getNotes();
    const newNote = {
      id: Date.now().toString(),
      paperId: paperId || null,
      title: title || '未命名笔记',
      content,
      isAIGenerated,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    notes.push(newNote);
    await fs.writeFile(this.notesFile, JSON.stringify(notes, null, 2));
    return { success: true, note: newNote };
  }

  async updateNote(id, title, content) {
    const notes = await this.getNotes();
    const noteIndex = notes.findIndex(n => n.id === id);
    if (noteIndex === -1) return { error: 'Note not found' };
    
    notes[noteIndex] = {
      ...notes[noteIndex],
      title: title || notes[noteIndex].title,
      content: content || notes[noteIndex].content,
      updatedAt: new Date().toISOString()
    };
    
    await fs.writeFile(this.notesFile, JSON.stringify(notes, null, 2));
    return { success: true, note: notes[noteIndex] };
  }

  async deleteNote(id) {
    let notes = await this.getNotes();
    notes = notes.filter(n => n.id !== id);
    await fs.writeFile(this.notesFile, JSON.stringify(notes, null, 2));
    return { success: true };
  }

  async getDownloads() {
    try {
      const files = await fs.readdir(this.downloadsDir);
      const downloads = [];
      
      for (const file of files) {
        if (file.endsWith('.pdf')) {
          const filepath = path.join(this.downloadsDir, file);
          const stats = await fs.stat(filepath);
          downloads.push({ filename: file, size: stats.size, downloadedAt: stats.mtime });
        }
      }
      
      return downloads.sort((a, b) => b.downloadedAt - a.downloadedAt);
    } catch {
      return [];
    }
  }

  getDownloadPath(filename) {
    return path.join(this.downloadsDir, filename);
  }
}

module.exports = PaperService;
