const fs = require('fs').promises;
const path = require('path');

const knowledgeFile = path.join(__dirname, 'knowledge.json');
const favoritesFile = path.join(__dirname, 'data', 'favorites.json');

async function syncPapersToLibrary() {
  try {
    console.log('开始同步论文到论文库...');
    
    const knowledgeData = JSON.parse(await fs.readFile(knowledgeFile, 'utf8'));
    let favorites = [];
    
    try {
      favorites = JSON.parse(await fs.readFile(favoritesFile, 'utf8'));
    } catch {
      favorites = [];
    }
    
    const existingIds = new Set(favorites.map(f => f.id));
    let addedCount = 0;
    
    for (const projectId in knowledgeData.projects) {
      const project = knowledgeData.projects[projectId];
      if (!project.papers) continue;
      
      for (const category of ['highly_relevant', 'relevant', 'potentially_useful']) {
        const categoryData = project.papers[category];
        if (!categoryData || !categoryData.papers) continue;
        
        for (const paper of categoryData.papers) {
          if (!existingIds.has(paper.id)) {
            const favoritePaper = {
              id: paper.id,
              title: paper.title,
              authors: paper.authors || [],
              summary: paper.summary || '',
              pdfUrl: paper.pdfUrl || `https://arxiv.org/pdf/${paper.id}.pdf`,
              arxivUrl: paper.arxivUrl || `https://arxiv.org/abs/${paper.id}`,
              favorite: true,
              addedAt: new Date().toISOString(),
              category: category,
              projectName: project.meta?.name || 'Unknown Project'
            };
            favorites.push(favoritePaper);
            existingIds.add(paper.id);
            addedCount++;
            console.log(`添加论文: ${paper.title}`);
          }
        }
      }
    }
    
    await fs.writeFile(favoritesFile, JSON.stringify(favorites, null, 2));
    console.log(`同步完成！共添加 ${addedCount} 篇新论文到论文库`);
    console.log(`论文库现有 ${favorites.length} 篇论文`);
    
  } catch (error) {
    console.error('同步失败:', error);
    process.exit(1);
  }
}

syncPapersToLibrary();