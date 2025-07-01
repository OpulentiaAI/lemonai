# Lemon AI Cloud Deployment

This is the cloud-native version of Lemon AI, optimized for Vercel deployment with premium cloud services.

## 🚀 Features

### Core AI Capabilities
- **Multi-LLM Support**: OpenAI GPT-4, Anthropic Claude, Google Gemini, Groq, DeepSeek, Perplexity
- **Intelligent Routing**: Automatic model selection based on task complexity
- **Streaming Responses**: Real-time AI responses with server-sent events

### Advanced Search
- **Tavily**: Advanced web search with AI-powered summaries
- **Perplexity**: Real-time knowledge with citations
- **Jina**: Content extraction and reader mode
- **Exa**: Neural search for finding similar content
- **SerpAPI**: Google search results with structured data

### Browser Automation
- **Browserbase**: Cloud browser sessions with full automation
- **Scrapybara**: Advanced web scraping with AI extraction
- **Firecrawl**: Convert any website to clean markdown

### Code Execution
- **E2B**: Secure sandboxed code execution
- **Multi-language**: Python, Node.js, Shell, and more
- **File System**: Persistent file storage across executions
- **Package Management**: Install any npm/pip packages

### Memory & Knowledge
- **Mem0**: Long-term memory with semantic search
- **Zep**: Conversation memory with summarization
- **Vector Storage**: Embedding-based knowledge retrieval

### Infrastructure
- **Vercel**: Edge functions with global CDN
- **Supabase**: PostgreSQL with real-time subscriptions
- **Upstash Redis**: Low-latency caching
- **GitHub Integration**: Direct repository access

## 🛠️ Quick Start

1. **Clone and Install**
```bash
git clone <repo>
cd lemonai
npm install
```

2. **Set Up Environment**
```bash
cp .env.production .env.local
# Edit .env.local with your API keys
```

3. **Deploy to Vercel**
```bash
./deploy-vercel.sh
```

## 📊 Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Vue.js    │────▶│ Vercel Edge  │────▶│  Supabase   │
│  Frontend   │     │  Functions   │     │  Database   │
└─────────────┘     └──────────────┘     └─────────────┘
                            │
                ┌───────────┴───────────┐
                │                       │
        ┌───────▼────────┐     ┌───────▼────────┐
        │  LLM Providers │     │ E2B Sandboxes  │
        │ (GPT-4, Claude)│     │ (Code Exec)    │
        └────────────────┘     └────────────────┘
                │                       │
        ┌───────▼────────┐     ┌───────▼────────┐
        │ Search APIs    │     │ Browser Cloud  │
        │ (Tavily, Exa)  │     │ (Browserbase)  │
        └────────────────┘     └────────────────┘
```

## 🔧 API Endpoints

### Chat & AI
- `POST /api/v1/chat/send` - Send message to AI
- `GET /api/v1/chat/stream` - Stream AI responses

### Code Execution
- `POST /api/v1/runtime/execute` - Execute code in sandbox
- `GET /api/v1/runtime/files` - List sandbox files

### Search
- `POST /api/v1/search/web` - Web search with AI
- `POST /api/v1/search/similar` - Find similar content

### Browser
- `POST /api/v1/browser/automate` - Browser automation
- `POST /api/v1/browser/scrape` - Smart web scraping

### Memory
- `POST /api/v1/memory/store` - Store memories
- `GET /api/v1/memory/recall` - Retrieve memories

## 💰 Cost Management

### Estimated Monthly Costs (1000 daily users)
- **Vercel**: $20 (Pro plan)
- **Supabase**: $25 (Pro plan)
- **E2B**: $50 (10k executions)
- **LLMs**: $100-500 (usage-based)
- **Search**: $50 (combined APIs)
- **Total**: ~$245-645/month

### Cost Optimization Tips
1. Use GPT-3.5/Claude Haiku for simple tasks
2. Cache frequent searches with Redis
3. Batch API requests when possible
4. Set spending limits on all services

## 🔒 Security

- All API keys stored in Vercel environment variables
- Supabase Row Level Security enabled
- E2B sandboxed code execution
- CORS properly configured
- Rate limiting on all endpoints

## 📈 Monitoring

- **Vercel Analytics**: Traffic and performance
- **Supabase Dashboard**: Database metrics
- **E2B Dashboard**: Code execution logs
- **Custom Logging**: Structured logs to Supabase

## 🤝 Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

## 🆘 Support

- Documentation: [docs.lemonai.dev](https://docs.lemonai.dev)
- Issues: [GitHub Issues](https://github.com/yourrepo/issues)
- Discord: [Join our community](https://discord.gg/lemonai)