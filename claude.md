# Claude.md - Tomcat Manager

## 📋 Overview
Documentação para desenvolvimento com Claude Code no projeto Tomcat Manager.
Stack: FastAPI (Backend) + Next.js 14 (Frontend) + PostgreSQL + WinRM

## 🚀 Setup Inicial

### Pré-requisitos
- Node.js 18+
- Python 3.9+
- Docker + Docker Compose
- Git

### Instalação Rápida
```bash
# Clone/crie o projeto
mkdir tomcat-manager && cd tomcat-manager

# Backend
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Frontend
cd ../frontend
npm install

# Database (na raiz)
cd ..
docker-compose up -d
```

## 🏃 Rodar em Desenvolvimento

### Terminal 1: Backend
```bash
cd backend
source venv/bin/activate
python -m uvicorn app.main:app --reload --port 8000
```

### Terminal 2: Frontend
```bash
cd frontend
npm run dev
```

### Terminal 3: Database
```bash
docker-compose up -d
```

### Acessar
- Frontend: http://localhost:3000
- Backend: http://localhost:8000
- Swagger Docs: http://localhost:8000/docs

## 📁 Estrutura do Projeto

### Backend (FastAPI)
```
backend/
├── app/
│   ├── main.py           # Aplicação principal
│   ├── config.py         # Variáveis de ambiente
│   ├── database.py       # Conexão PostgreSQL
│   ├── models/           # ORM (Server, Service, Deployment, AuditLog)
│   ├── api/              # Endpoints (auth, servers, services, deploy, logs)
│   ├── services/         # Lógica de negócio (WinRM, Tomcat, Security)
│   └── utils/            # Exceções e helpers
├── requirements.txt
├── .env.example
└── docker-compose.yml    # PostgreSQL + Redis
```

### Frontend (Next.js)
```
frontend/
├── app/
│   ├── (auth)/           # Rotas de autenticação
│   ├── (dashboard)/      # Rotas protegidas
│   ├── api/              # API routes (opcional)
│   └── globals.css       # Tailwind CSS
├── components/           # Componentes React
├── hooks/                # Custom hooks
├── lib/                  # Utilitários (API client, auth, etc)
├── types/                # TypeScript types
├── middleware.ts         # Middleware de autenticação
└── package.json
```

## 🔧 Usando Claude Code para Desenvolvimento

### Gerar Nova Funcionalidade
```
claude-code
# Digite: "Crie um novo endpoint POST /api/servers/{id}/services/{name}/stop"
```

### Melhorar um Arquivo
```
"Refatore app/services/winrm_service.py para adicionar retry logic e timeout"
```

### Criar Novo Componente
```
"Crie um componente React em frontend/components/ServiceAction.tsx com botões Start/Stop/Restart"
```

### Corrigir Bug
```
"Corrija o erro 'CORS blocked' no frontend. Verifique app/main.py"
```

### Adicionar Testes
```
"Crie testes unitários para app/services/security.py usando pytest"
```

## 📌 Fluxo de Desenvolvimento Recomendado

1. **Definir requisito** (ex: "Quero deploy automático")
2. **Pedir ao Claude Code** para criar backend primeiro
3. **Testar no Swagger** (http://localhost:8000/docs)
4. **Criar frontend** para consumir endpoint
5. **Testar integração** (frontend + backend)

## 🔐 Variáveis de Ambiente

### Backend (.env)
```
DATABASE_URL=postgresql://user:password@localhost/tomcat_manager
SECRET_KEY=seu_secret_key_aqui
DEBUG=True
WinRM_PORT=5985
```

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_APP_NAME=Tomcat Manager
```

## 📚 Documentação das APIs

### Autenticação
- POST /api/auth/login - Login com email/senha
- POST /api/auth/register - Registrar novo usuário

### Servidores
- GET /api/servers - Listar todos servidores
- POST /api/servers - Criar novo servidor
- GET /api/servers/{id} - Obter detalhes
- PUT /api/servers/{id} - Editar servidor
- DELETE /api/servers/{id} - Deletar servidor

### Serviços
- GET /api/servers/{id}/services - Listar serviços do servidor
- POST /api/servers/{id}/services/{name}/start - Iniciar serviço
- POST /api/servers/{id}/services/{name}/stop - Parar serviço
- POST /api/servers/{id}/services/{name}/restart - Reiniciar serviço

### Deploy
- POST /api/deploy - Upload e deploy de WAR

### Logs
- GET /api/servers/{id}/logs - Obter logs do servidor

### Audit
- GET /api/audit - Histórico de todas as ações

Veja Swagger em: http://localhost:8000/docs

## 🐛 Troubleshooting

### "Connection refused" ao conectar WinRM
- Verificar se Windows Server tem WinRM habilitado
- Testar: `winrm quickconfig` no Windows

### "PostgreSQL connection failed"
- Rodar: `docker-compose up -d`
- Verificar: `docker ps`

### "CORS error" no frontend
- Backend tem CORS habilitado em app/main.py
- Verificar NEXT_PUBLIC_API_URL em frontend/.env.local

### Frontend não encontra backend
- Backend rodando em http://localhost:8000?
- Frontend rodando em http://localhost:3000?
- Verificar .env.local do frontend

## 🚀 Deploy (Futuro)

- Backend: Docker + Kubernetes ou AWS ECS
- Frontend: Vercel, Netlify ou seu próprio servidor
- Database: AWS RDS PostgreSQL ou gerenciado

## 📞 Suporte Claude Code

Para mais info sobre Claude Code:
```bash
claude-code --help
```

## 📝 Notas Importantes

- Nunca commitar .env com dados sensíveis
- Usar .env.example como template
- JWT token armazenado em HttpOnly cookie
- WinRM requer credenciais encriptadas em produção
- Logs sensíveis devem ser protegidos

---
**Última atualização**: Maio 2026
**Mantido por**: Seu Time Dev
