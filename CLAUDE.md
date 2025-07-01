# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Lemon AI is a full-stack, open-source, privacy-first AI agent framework that runs entirely on local hardware. It serves as a local alternative to platforms like Manus & Genspark AI, with integrated code execution capabilities and support for multiple LLM providers.

### Core Capabilities
- **Local-First Architecture**: Runs entirely on local hardware for complete privacy
- **VM Sandbox**: Integrated Code Interpreter with Docker-based sandbox for safe code execution
- **Multi-LLM Support**: Works with local models (DeepSeek, Qwen, Llama) via Ollama and cloud models (Claude, GPT, Gemini)
- **Agent Workflow**: Implements planning → action → reflection cycle with persistent memory
- **MCP Integration**: Extensible tool ecosystem via Model Context Protocol

## Key Commands

### Development
```bash
# Initialize project (install deps + setup DB)
make init

# Run both frontend and backend
make run

# Backend only (port 3000)
make start-backend
npm start          # Alternative: direct npm
npm run dev        # With hot reload

# Frontend only (port 5173)
make start-frontend
cd frontend && npm run dev

# Database operations
make init-tables   # Initialize database schema

# Docker runtime
make build-runtime-sandbox   # Build sandbox image
make build-app              # Build application image
```

### Testing
```bash
# Backend tests
npm test

# Run single test file
npm test -- test/specific-test.js
```

### Production
```bash
# Backend production mode
npm run prd   # Uses PM2

# Frontend production build
cd frontend && npm run build
```

## Architecture Overview

### Tech Stack
- **Backend**: Node.js, Koa.js, Sequelize ORM
- **Frontend**: Vue 3, Vite, Ant Design Vue, Pinia
- **Database**: SQLite/MySQL
- **Runtime**: Docker (sandbox) or Local
- **Browser Automation**: Python-based browser_server with Patchright

### Project Structure
```
src/                # Backend source
├── agent/         # AI agent core logic
├── completion/    # LLM provider integrations
├── mcp/          # Model Context Protocol
├── models/       # Database models
├── routers/      # API endpoints
├── runtime/      # Code execution (Docker/Local)
└── tools/        # Agent tools

frontend/          # Vue.js application
browser_server/    # Python browser automation
containers/        # Docker configurations
```

## MCP (Model Context Protocol) Integration

This project implements MCP for tool integration:
- Server directory: `src/mcp/`
- Tool definitions: `src/tools/`
- MCP servers are spawned as child processes
- Communication via stdio (JSON-RPC)

### Adding New MCP Tools
1. Create tool in `src/tools/`
2. Register in `src/mcp/mcpManager.js`
3. Follow the existing pattern for tool implementation

## Agent System Architecture

### Core Components
1. **AgenticAgent** (`src/agent/agent.js`): Main orchestrator
2. **Planner** (`src/agent/planner.js`): Task planning and decomposition
3. **Executor** (`src/agent/executor.js`): Action execution
4. **Memory** (`src/agent/memory.js`): Context retention

### Agent Workflow
1. User provides instruction
2. Planner breaks down into tasks
3. Executor performs actions using tools
4. Reflection updates plan based on results
5. Memory persists context across sessions

### Available Tools
- **terminal**: Execute shell commands
- **code_edit**: Modify code files
- **browser**: Web browsing and automation
- **search**: Web search capabilities
- **file operations**: Read/write files
- **mcp_tools**: Dynamic MCP server tools

## Browser Automation

The browser_server provides web automation:
```bash
cd browser_server
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
patchright install chromium --with-deps --no-shell
python src/server.py
```

API endpoints:
- `POST /screenshot` - Capture page screenshot
- `POST /action` - Perform browser action
- `POST /navigation` - Navigate to URL

## LLM Completion System

### Provider Support
- **Local**: Ollama, LM Studio, Xinference
- **Cloud**: OpenAI, Anthropic, Google, Groq, xAI

### Configuration
Models are configured in `frontend/src/store/model.js`
Provider-specific logic in `src/completion/`

### Adding New Providers
1. Create provider class in `src/completion/`
2. Implement `chatComplete()` method
3. Register in completion factory

## Database Schema

Key tables (Sequelize models):
- `tasks`: Agent task tracking
- `messages`: Conversation history
- `memory`: Persistent agent memory
- `sessions`: User sessions
- `files`: File management

## API Design

RESTful API with Swagger documentation:
- Base URL: `http://localhost:3000`
- API docs: `/swagger`
- Key endpoints:
  - `/api/v1/chat/send` - Send message to agent
  - `/api/v1/tasks/*` - Task management
  - `/api/v1/files/*` - File operations
  - `/api/v1/terminal/*` - Terminal access

## Frontend Architecture

Vue 3 application structure:
- **State**: Pinia stores with persistence
- **Components**: Modular Vue components
- **Services**: API communication layer
- **Views**: Page-level components
- **I18n**: Multi-language support

Key stores:
- `model.js`: LLM configuration
- `agent.js`: Agent state management
- `file.js`: File browser state

## Deployment

### Docker Deployment
```bash
# Build and run with docker-compose
docker-compose up

# Or build separately
make build-app
docker run -p 3000:3000 lemonai
```

### Environment Variables
```bash
# Backend
PORT=3000
RUNTIME_TYPE=docker  # or 'local'
WORKSPACE_DIR=/path/to/workspace
DOCKER_HOST_ADDR=host.docker.internal

# Frontend (configured in UI)
# Model settings configured via web interface
```

## Development Guidelines

### Code Style
- Backend: ES6+ with async/await
- Frontend: Vue 3 Composition API
- Follow existing patterns in codebase

### Error Handling
- Use try-catch blocks for async operations
- Return structured error responses
- Log errors with appropriate context

### Security Considerations
- Sandbox all code execution
- Validate user inputs
- Use parameterized database queries
- Never expose sensitive configuration

## Troubleshooting

### Common Issues
1. **Docker runtime errors**: Ensure Docker Desktop is running
2. **Port conflicts**: Check ports 3000, 5173 are available
3. **Database errors**: Run `make init-tables`
4. **Browser automation fails**: Check Python environment setup

### Debug Mode
- Backend: Set `DEBUG=*` environment variable
- Frontend: Vue DevTools for debugging
- Check logs in `logs/` directory