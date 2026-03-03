const express = require('express');
const cors = require('cors');
const path = require('path');

const PaperService = require('./services/paperService');
const Orchestrator = require('./services/orchestrator');
const setupRoutes = require('./services/routes');

const app = express();
const PORT = 3002;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const CONFIG_FILE = path.join(__dirname, 'config.json');
const KNOWLEDGE_FILE = path.join(__dirname, 'knowledge.json');
const PROJECTS_FILE = path.join(__dirname, 'projects.json');
const DATA_DIR = path.join(__dirname, 'data');
const DOWNLOADS_DIR = path.join(__dirname, 'downloads');

const paperService = new PaperService(DATA_DIR, DOWNLOADS_DIR);
const orchestrator = new Orchestrator(CONFIG_FILE, KNOWLEDGE_FILE, PROJECTS_FILE, paperService);

setupRoutes(app, orchestrator, paperService);

async function startServer() {
  await paperService.init();
  await orchestrator.initialize();
  
  app.listen(PORT, () => {
    console.log(`AI Researcher running at http://localhost:${PORT}`);
  });
}

startServer().catch(console.error);
