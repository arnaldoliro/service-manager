# Claude.md — Tomcat Manager

Documentação completa do projeto para uso com Claude Code.
**Stack:** FastAPI · Next.js 14 · PostgreSQL · WinRM · JWT

---

## Índice

1. [Visão Geral](#1-visão-geral)
2. [Arquitetura](#2-arquitetura)
3. [Setup Rápido](#3-setup-rápido)
4. [Estrutura de Arquivos](#4-estrutura-de-arquivos)
5. [Backend — FastAPI](#5-backend--fastapi)
6. [Frontend — Next.js](#6-frontend--nextjs)
7. [API Reference Completa](#7-api-reference-completa)
8. [Banco de Dados](#8-banco-de-dados)
9. [Autenticação e Segurança](#9-autenticação-e-segurança)
10. [Integração WinRM / Tomcat](#10-integração-winrm--tomcat)
11. [Variáveis de Ambiente](#11-variáveis-de-ambiente)
12. [Docker e Deploy](#12-docker-e-deploy)
13. [Troubleshooting](#13-troubleshooting)
14. [Guia de Desenvolvimento com Claude Code](#14-guia-de-desenvolvimento-com-claude-code)

---

## 1. Visão Geral

**Tomcat Manager** é uma aplicação web para gerenciar remotamente serviços Apache Tomcat em servidores Windows via WinRM. Permite:

- Monitorar e controlar serviços Tomcat (start / stop / restart)
- Fazer deploy de arquivos `.war` remotamente
- Visualizar logs do Tomcat em tempo real
- Registrar auditoria de todas as ações por usuário
- Gerenciar múltiplos servidores Windows em um único painel

---

## 2. Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│  Navegador                                                  │
│  Next.js 14 (App Router · TypeScript · Tailwind CSS)        │
│  http://localhost:3000                                      │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP + Bearer JWT
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  FastAPI  (Python 3.11+)                                    │
│  http://localhost:8000                                      │
│  Swagger: http://localhost:8000/docs                        │
└────────┬──────────────────────────┬────────────────────────┘
         │ SQLAlchemy ORM           │ pywinrm (NTLM)
         ▼                         ▼
┌─────────────────┐    ┌──────────────────────────────────────┐
│  PostgreSQL 15  │    │  Windows Server (alvo)               │
│  porta 5432     │    │  WinRM porta 5985 (HTTP)             │
│  tomcat_manager │    │  PowerShell remoto                   │
└─────────────────┘    └──────────────────────────────────────┘
```

**Fluxo de comunicação com servidor Windows:**
1. Frontend envia requisição → FastAPI
2. FastAPI conecta via WinRM com autenticação NTLM
3. Executa comandos PowerShell remotamente (`Get-Service`, `Start-Service`, etc.)
4. Retorna resultado ao Frontend

---

## 3. Setup Rápido

### Pré-requisitos

| Ferramenta | Versão mínima |
|---|---|
| Python | 3.11+ |
| Node.js | 18+ (testado com v22) |
| Docker + Docker Compose | qualquer recente |
| nvm (opcional) | recomendado |

### Modo desenvolvimento (3 terminais)

```bash
# Terminal 1 — Banco de dados
docker-compose up db

# Terminal 2 — Backend
cd backend
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env              # edite as variáveis
python -m uvicorn app.main:app --reload --port 8000

# Terminal 3 — Frontend
cd frontend
npm install
cp .env.example .env.local        # já configurado para localhost
npm run dev
```

### Acessos

| Serviço | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8000 |
| Swagger UI | http://localhost:8000/docs |
| ReDoc | http://localhost:8000/redoc |

### Modo Docker (tudo de uma vez)

```bash
# Na raiz do projeto
SECRET_KEY="minha-chave-segura-longa" docker-compose up --build
```

> **Atenção:** o `docker-compose.yml` atual sobe o frontend como Vite (`porta 5173`). Atualize o serviço `frontend` para Next.js se for usar Docker para o frontend.

---

## 4. Estrutura de Arquivos

```
service-manager/
├── backend/
│   ├── app/
│   │   ├── main.py                  # Entrypoint FastAPI, CORS, routers
│   │   ├── config.py                # Pydantic Settings (lê .env)
│   │   ├── database.py              # Engine SQLAlchemy + get_db
│   │   ├── models/
│   │   │   ├── user.py              # Tabela users
│   │   │   ├── server.py            # Tabela servers
│   │   │   ├── service.py           # Tabela services
│   │   │   ├── deployment.py        # Tabela deployments
│   │   │   └── audit_log.py         # Tabela audit_logs
│   │   ├── api/
│   │   │   ├── auth.py              # /api/auth/*
│   │   │   ├── servers.py           # /api/servers/*  (CRUD)
│   │   │   ├── services.py          # /api/servers/{id}/services/*
│   │   │   ├── deploy.py            # /api/deploy/*
│   │   │   └── logs.py              # /api/servers/{id}/logs, /audit
│   │   └── services/
│   │       ├── security.py          # JWT, bcrypt, get_current_user
│   │       ├── winrm_service.py     # Conexão WinRM + execução PowerShell
│   │       └── tomcat_service.py    # Operações Tomcat via WinRM
│   ├── requirements.txt
│   ├── .env.example
│   └── Dockerfile
│
├── frontend/
│   ├── app/
│   │   ├── layout.tsx               # Root layout + Providers + Toaster
│   │   ├── page.tsx                 # Redirect → /dashboard
│   │   ├── globals.css              # Tailwind directives
│   │   ├── (auth)/
│   │   │   ├── layout.tsx           # Layout centralizado sem sidebar
│   │   │   ├── login/page.tsx       # Formulário de login
│   │   │   └── register/page.tsx    # Formulário de registro
│   │   └── (dashboard)/
│   │       ├── layout.tsx           # Layout com Sidebar + Navbar
│   │       ├── page.tsx             # Dashboard (stats, servidores, audit)
│   │       ├── servers/
│   │       │   ├── page.tsx         # Listagem + CRUD de servidores
│   │       │   └── [id]/page.tsx    # Detalhes: serviços, deploys, logs
│   │       ├── deploy/page.tsx      # Upload WAR + histórico
│   │       ├── logs/page.tsx        # Visualizador de logs com auto-refresh
│   │       ├── audit/page.tsx       # Tabela de auditoria com filtros
│   │       └── settings/page.tsx    # Perfil + troca de senha
│   ├── components/
│   │   ├── Providers.tsx            # QueryClientProvider
│   │   ├── Navbar.tsx               # Header responsivo com dropdown
│   │   ├── Sidebar.tsx              # Menu lateral (mobile overlay)
│   │   ├── ServerCard.tsx           # Card resumido de servidor
│   │   ├── ServerTable.tsx          # Tabela com ações edit/delete/view
│   │   ├── ServerForm.tsx           # Formulário add/edit servidor
│   │   ├── ServiceStatus.tsx        # Badge colorido de status
│   │   ├── ServiceActions.tsx       # Botões Start/Stop/Restart
│   │   ├── DeployForm.tsx           # Drag & drop + upload WAR
│   │   ├── LogViewer.tsx            # Viewer com filtro, auto-scroll, download
│   │   ├── Modal.tsx                # Modal reutilizável (ESC fecha)
│   │   ├── Alert.tsx                # Alerta error/success/info/warning
│   │   ├── LoadingSpinner.tsx       # Spinner animado (sm/md/lg)
│   │   └── ProtectedRoute.tsx       # Guard client-side
│   ├── hooks/
│   │   ├── useAuth.ts               # login/register/logout/fetchMe
│   │   ├── useApi.ts                # Wrapper get/post/put/del + estado
│   │   └── useLocalStorage.ts       # get/set/remove type-safe
│   ├── lib/
│   │   ├── api.ts                   # Axios + interceptor JWT + auto-logout 401
│   │   ├── auth.ts                  # saveToken/clearToken (localStorage + cookie)
│   │   ├── constants.ts             # ENDPOINTS, TOKEN_KEY, STATUS_COLORS
│   │   └── utils.ts                 # cn(), formatDate(), getStatusBadgeClass()
│   ├── types/
│   │   ├── index.ts                 # User, Server, Service, Deployment, AuditLog
│   │   └── api.ts                   # LoginRequest, RegisterRequest, TokenResponse…
│   ├── middleware.ts                 # Proteção de rotas via cookie JWT
│   ├── .env.example
│   ├── .env.local                   # (git-ignored) variáveis locais
│   ├── next.config.js
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   └── package.json
│
├── docker-compose.yml
├── claude.md                        # Este arquivo
└── README.md
```

---

## 5. Backend — FastAPI

### Dependências principais (`requirements.txt`)

| Pacote | Versão | Função |
|---|---|---|
| fastapi | 0.115.5 | Framework web |
| uvicorn[standard] | 0.32.1 | ASGI server |
| sqlalchemy | 2.0.36 | ORM |
| psycopg2-binary | 2.9.10 | Driver PostgreSQL |
| pydantic | 2.10.3 | Validação / schemas |
| pydantic-settings | 2.6.1 | Leitura do `.env` |
| python-jose[cryptography] | 3.3.0 | JWT |
| passlib[bcrypt] | 1.7.4 | Hash de senhas |
| python-multipart | 0.0.18 | Upload de arquivos |
| pywinrm | 0.4.3 | Conexão WinRM |
| requests-ntlm | 1.3.0 | Autenticação NTLM |
| alembic | 1.14.0 | Migrações de banco |

### Camadas da aplicação

```
Requisição HTTP
     ↓
main.py (CORS Middleware)
     ↓
api/*.py (Router + validação Pydantic)
     ↓
services/ (lógica de negócio: WinRM, JWT, bcrypt)
     ↓
models/ + database.py (SQLAlchemy ORM)
     ↓
PostgreSQL
```

### Ciclo de vida (`main.py`)

O evento `lifespan` executa `Base.metadata.create_all()` na inicialização — cria todas as tabelas automaticamente se não existirem. **Não é necessário rodar migrations manualmente em desenvolvimento.**

### CORS

Origens permitidas configuradas em `ALLOWED_ORIGINS` no `.env`. Padrão:
```
http://localhost:5173,http://localhost:3000
```

---

## 6. Frontend — Next.js

### Dependências principais (`package.json`)

| Pacote | Função |
|---|---|
| next 14.2.5 | Framework (App Router) |
| @tanstack/react-query ^5 | Cache e estado de requisições |
| axios ^1.7 | HTTP client com interceptors |
| lucide-react ^0.400 | Ícones SVG |
| react-hot-toast ^2.4 | Notificações toast |
| date-fns ^3.6 | Formatação de datas |
| clsx + tailwind-merge | Merge de classes CSS |
| @tailwindcss/forms ^0.5 | Reset de estilos de formulários |

### Roteamento (App Router)

| Rota | Proteção | Componente |
|---|---|---|
| `/` | — | Redirect → `/dashboard` |
| `/login` | público | `(auth)/login/page.tsx` |
| `/register` | público | `(auth)/register/page.tsx` |
| `/dashboard` | JWT | `(dashboard)/page.tsx` |
| `/servers` | JWT | `(dashboard)/servers/page.tsx` |
| `/servers/[id]` | JWT | `(dashboard)/servers/[id]/page.tsx` |
| `/deploy` | JWT | `(dashboard)/deploy/page.tsx` |
| `/logs` | JWT | `(dashboard)/logs/page.tsx` |
| `/audit` | JWT | `(dashboard)/audit/page.tsx` |
| `/settings` | JWT | `(dashboard)/settings/page.tsx` |

### Fluxo de autenticação no Frontend

```
1. Login → POST /api/auth/login (form-urlencoded)
2. Recebe { access_token, username, is_admin }
3. saveToken():
   - localStorage.setItem("tmgr_token", token)
   - document.cookie = "tmgr_token=<token>; path=/"
4. middleware.ts lê o cookie a cada navegação server-side
5. Interceptor Axios lê o localStorage e injeta Authorization: Bearer <token>
6. Em erro 401 → clearToken() + redirect para /login
```

### Estado global

**Sem Zustand** — o estado de autenticação vive em `useAuth()` (hook com `useState`). O cache de dados da API fica no `QueryClient` do TanStack Query com `staleTime: 30s`.

---

## 7. API Reference Completa

> **Base URL:** `http://localhost:8000`
> **Auth:** `Authorization: Bearer <jwt_token>` (exceto rotas de auth)

### Autenticação (`/api/auth`)

#### `POST /api/auth/register`
Cria novo usuário.

```json
// Request body (JSON)
{
  "username": "string",
  "email": "user@example.com",
  "password": "string"
}

// Response 201
{
  "id": 1,
  "username": "joao",
  "email": "joao@email.com"
}

// Erros
// 400: "Username já em uso"
// 400: "E-mail já em uso"
```

#### `POST /api/auth/login`
Autentica usuário e retorna JWT.

> **Importante:** usa `application/x-www-form-urlencoded` (OAuth2PasswordRequestForm), não JSON.

```
// Request body (form-urlencoded)
username=joao&password=minhasenha

// Response 200
{
  "access_token": "eyJ...",
  "token_type": "bearer",
  "username": "joao",
  "is_admin": false
}

// Erro 401: "Credenciais inválidas"
```

#### `GET /api/auth/me`
Retorna dados do usuário autenticado.

```json
// Response 200
{
  "id": 1,
  "username": "joao",
  "email": "joao@email.com",
  "is_admin": false
}
```

---

### Servidores (`/api/servers`)

Todas as rotas requerem JWT.

#### `GET /api/servers/`
Lista todos os servidores cadastrados.

```json
// Response 200
[
  {
    "id": 1,
    "hostname": "192.168.1.100",
    "username": "Administrador",
    "port": 8080,
    "winrm_port": 5985,
    "description": "Servidor de produção"
  }
]
```

#### `POST /api/servers/`
Cadastra novo servidor.

```json
// Request body
{
  "hostname": "192.168.1.100",
  "username": "Administrador",
  "password": "senha123",
  "port": 8080,
  "winrm_port": 5985,
  "description": "Opcional"
}

// Response 201 → ServerResponse (sem password)
```

#### `GET /api/servers/{server_id}`
Retorna detalhes de um servidor.

```json
// Response 200 → ServerResponse
// 404: "Servidor não encontrado"
```

#### `PUT /api/servers/{server_id}`
Atualiza campos do servidor (todos opcionais).

```json
// Request body (campos opcionais)
{
  "hostname": "novo-host",
  "password": "nova-senha"
}
// Response 200 → ServerResponse
```

#### `DELETE /api/servers/{server_id}`
Remove servidor e seus dados em cascata (services, deployments, audit_logs).

```
// Response 204 No Content
// 404: "Servidor não encontrado"
```

---

### Serviços Tomcat (`/api/servers/{server_id}/services`)

#### `GET /api/servers/{server_id}/services`
Lista serviços sincronizados do servidor (dados do banco, não consulta remota).

```json
// Response 200
[
  {
    "id": 1,
    "server_id": 1,
    "service_name": "Tomcat9",
    "status": "running"
  }
]
```

#### `POST /api/servers/{server_id}/services/sync`
Conecta ao servidor via WinRM, busca serviços com `*tomcat*` ou `*catalina*` no nome, e sincroniza o banco.

```json
// Response 200
{ "synced": 3 }
```

#### `POST /api/servers/{server_id}/services/{service_name}/start`
Executa `Start-Service -Name '{service_name}'` via PowerShell remoto.

```json
// Response 200
{ "status": "started", "output": "" }
// 500 se o comando falhar (retorna stderr)
```

#### `POST /api/servers/{server_id}/services/{service_name}/stop`
Executa `Stop-Service`.

#### `POST /api/servers/{server_id}/services/{service_name}/restart`
Executa `Restart-Service`.

---

### Deploy (`/api/deploy`)

#### `POST /api/deploy/`
Realiza upload de arquivo `.war` e deploy no servidor Windows.

```
// Request: multipart/form-data
server_id: 1           (campo de formulário)
app_name: minha-app    (campo de formulário)
war_file: arquivo.war  (arquivo)

// Response 200
{
  "deployment_id": 42,
  "status": "success",   // "success" | "failed"
  "output": "..."
}

// 400: "Apenas arquivos .war são aceitos"
// 404: "Servidor não encontrado"
```

**Mecanismo de deploy:** O arquivo WAR é lido, convertido para Base64 e transferido via PowerShell: `[Convert]::FromBase64String(...)` → `[IO.File]::WriteAllBytes('C:\tomcat\webapps\app.war', ...)`.

#### `GET /api/deploy/history/{server_id}`
Retorna os últimos 50 deploys do servidor (ordenados por data desc).

```json
// Response 200
[
  {
    "id": 42,
    "server_id": 1,
    "app_name": "minha-app",
    "war_file": "minha-app-1.0.war",
    "status": "success",
    "output": "...",
    "timestamp": "2026-05-11T14:30:00Z"
  }
]
```

---

### Logs e Auditoria

#### `GET /api/servers/{server_id}/logs?lines=200`
Lê as últimas N linhas do `catalina.out` via `Get-Content -Tail N`.

| Parâmetro | Tipo | Padrão | Limites |
|---|---|---|---|
| `lines` | int | 200 | 10 – 2000 |

```json
// Response 200
{
  "server_id": 1,
  "lines": 200,
  "content": "2026-05-11 INFO org.apache.catalina..."
}
```

#### `GET /api/servers/{server_id}/audit`
Retorna as últimas 100 ações do servidor, ordenadas por data desc.

```json
// Response 200
[
  {
    "id": 10,
    "action": "service_start:Tomcat9",
    "details": null,
    "timestamp": "2026-05-11T14:00:00Z",
    "user_id": 1
  }
]
```

**Ações registradas automaticamente:**
- `login` — ao autenticar
- `server_created`, `server_updated`, `server_deleted`
- `service_start:<nome>`, `service_stop:<nome>`, `service_restart:<nome>`
- `deploy:<app_name>`

---

## 8. Banco de Dados

### Tabelas e relacionamentos

```
users (1) ─────────────────────────────────────────────── (N) audit_logs
  id, username, email, hashed_password                          user_id FK
  is_active, is_admin, created_at

servers (1) ──────── (N) services
  id, hostname          id, server_id FK
  username, password    service_name, status
  port, winrm_port
  description           
  created_at, updated_at

servers (1) ──────── (N) deployments
                        id, server_id FK
                        app_name, war_file
                        status, output, timestamp

servers (1) ──────── (N) audit_logs
                        id, user_id FK, server_id FK
                        action, details
                        ip_address, timestamp
```

### Status possíveis

**Service.status:**
- `running` — serviço ativo
- `stopped` — serviço parado
- `unknown` — falha ao consultar

**Deployment.status:**
- `pending` — criado, aguardando
- `in_progress` — em execução
- `success` — concluído com êxito
- `failed` — falhou

### Criação automática das tabelas

As tabelas são criadas pelo SQLAlchemy via `Base.metadata.create_all(bind=engine)` no evento `lifespan` do FastAPI. **Não é necessário rodar Alembic em desenvolvimento.** Alembic está disponível para migrações em produção.

```bash
# Gerar nova migration (quando alterar um model)
alembic revision --autogenerate -m "descricao"
alembic upgrade head
```

---

## 9. Autenticação e Segurança

### JWT

- **Algoritmo:** HS256
- **Payload:** `{ "sub": "<user_id>", "exp": <timestamp> }`
- **Expiração:** 60 minutos (configurável via `ACCESS_TOKEN_EXPIRE_MINUTES`)
- **Biblioteca:** `python-jose[cryptography]`

### Senhas

- Hash com **bcrypt** via `passlib`
- Nunca armazenadas em texto plano

### Proteção de rotas no Backend

Todas as rotas (exceto `/api/auth/register` e `/api/auth/login`) exigem:
```
Authorization: Bearer <token>
```
O `get_current_user` dependency valida o token, busca o usuário no banco e verifica `is_active`.

### Proteção de rotas no Frontend

**Duas camadas:**

1. **`middleware.ts`** (server-side, executa no Edge):
   - Lê o cookie `tmgr_token`
   - Verifica expiração do JWT (decode do payload Base64)
   - Redireciona para `/login` se inválido

2. **`ProtectedRoute`** (client-side):
   - Guard adicional para rotas individuais
   - Chama `isAuthenticated()` que verifica localStorage

### Armazenamento do Token

| Local | Por quê |
|---|---|
| `localStorage["tmgr_token"]` | Lido pelo Axios interceptor a cada request |
| `document.cookie["tmgr_token"]` | Lido pelo middleware Next.js (server-side) |

> **Nota de segurança:** o cookie não é HttpOnly (definido via JavaScript). Em produção, considere usar Next.js API Routes para fazer proxy das chamadas e definir cookies HttpOnly via `Set-Cookie` do servidor.

---

## 10. Integração WinRM / Tomcat

### WinRMService (`backend/app/services/winrm_service.py`)

Conexão via NTLM sobre HTTP:
```python
winrm.Session(
    "http://{hostname}:{port}/wsman",
    auth=(username, password),
    transport="ntlm"
)
```

Métodos disponíveis:
- `execute_powershell(script)` → `CommandResult`
- `execute_cmd(command, args)` → `CommandResult`

`CommandResult`:
```python
@dataclass
class CommandResult:
    stdout: str
    stderr: str
    status_code: int

    @property
    def success(self) -> bool:  # status_code == 0
```

### TomcatService (`backend/app/services/tomcat_service.py`)

Padrão de uso:
```python
winrm = WinRMService(server.hostname, server.username, server.password, server.winrm_port)
tomcat = TomcatService(winrm)   # tomcat_home padrão: "C:\tomcat"
```

| Método | PowerShell executado |
|---|---|
| `get_status(name)` | `(Get-Service -Name '{name}').Status` |
| `start(name)` | `Start-Service -Name '{name}'` |
| `stop(name)` | `Stop-Service -Name '{name}'` |
| `restart(name)` | `Restart-Service -Name '{name}'` |
| `list_services()` | `Get-Service \| Where-Object {$_.Name -like '*tomcat*'...} \| ConvertTo-Json` |
| `deploy_war(path, app)` | Base64 encode + `[IO.File]::WriteAllBytes(...)` |
| `get_logs(lines)` | `Get-Content 'C:\tomcat\logs\catalina.out' -Tail {lines}` |

### Configurar WinRM no Windows Server (alvo)

```powershell
# Executar como Administrador no servidor Windows:
winrm quickconfig
winrm set winrm/config/client/auth '@{Basic="true"}'
winrm set winrm/config/service/auth '@{Basic="true"}'
winrm set winrm/config/service '@{AllowUnencrypted="true"}'

# Verificar status
winrm enumerate winrm/config/listener
```

---

## 11. Variáveis de Ambiente

### Backend (`backend/.env`)

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/tomcat_manager
SECRET_KEY=troque-por-uma-string-longa-e-aleatoria
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
DEBUG=false
```

| Variável | Obrigatória | Descrição |
|---|---|---|
| `DATABASE_URL` | sim | Connection string PostgreSQL |
| `SECRET_KEY` | sim | Chave para assinar JWT (mín. 32 chars em produção) |
| `ALGORITHM` | não | Padrão: `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | não | Padrão: `60` |
| `ALLOWED_ORIGINS` | não | Lista separada por vírgula |
| `DEBUG` | não | Padrão: `false` |

### Frontend (`frontend/.env.local`)

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_APP_NAME=Tomcat Manager
```

| Variável | Descrição |
|---|---|
| `NEXT_PUBLIC_API_URL` | URL base do backend FastAPI |
| `NEXT_PUBLIC_APP_NAME` | Nome exibido na UI |

---

## 12. Docker e Deploy

### Serviços no `docker-compose.yml`

| Serviço | Imagem | Porta | Descrição |
|---|---|---|---|
| `db` | postgres:15-alpine | 5432 | Banco de dados com healthcheck |
| `backend` | build ./backend | 8000 | FastAPI |
| `frontend` | build ./frontend | 5173 | *(atualizar para Next.js)* |

### Volume persistente

```yaml
volumes:
  pgdata:   # dados do PostgreSQL sobrevivem ao restart
```

### Atualizar docker-compose para Next.js

O `docker-compose.yml` atual tem o frontend configurado para Vite (porta 5173). Para usar Next.js:

```yaml
frontend:
  build:
    context: ./frontend
    dockerfile: Dockerfile
  container_name: tomcat_manager_frontend
  depends_on:
    - backend
  environment:
    NEXT_PUBLIC_API_URL: http://backend:8000
  ports:
    - "3000:3000"
```

E criar `frontend/Dockerfile`:
```dockerfile
FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
EXPOSE 3000
CMD ["node", "server.js"]
```

### Backend Dockerfile

```dockerfile
# backend/Dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

---

## 13. Troubleshooting

### "WinRM connection refused" / timeout

```powershell
# No servidor Windows (Administrador):
winrm quickconfig -q
netsh advfirewall firewall add rule name="WinRM HTTP" dir=in action=allow protocol=TCP localport=5985

# Verificar listener ativo:
winrm enumerate winrm/config/listener
```

### "PostgreSQL connection failed"

```bash
docker-compose up db           # garantir que está rodando
docker ps                      # verificar status
docker logs tomcat_manager_db  # ver erros do banco
```

### "CORS error" no browser

Verificar se `ALLOWED_ORIGINS` no backend inclui a origem do frontend (`http://localhost:3000`).

### JWT expirado — loop de redirect

O token expira em 60 minutos por padrão. Sintomas: redirect infinito para `/login`. Solução: limpar o localStorage e o cookie manualmente, ou aumentar `ACCESS_TOKEN_EXPIRE_MINUTES`.

### "Apenas arquivos .war são aceitos" (deploy)

O backend verifica `war_file.filename.endswith(".war")`. O arquivo enviado deve ter extensão `.war`.

### Tabelas não criadas no banco

O `create_all` só executa quando a aplicação FastAPI inicia. Verificar se o backend está conectando ao banco antes de iniciar:

```bash
# Backend deve logar: INFO: Application startup complete
python -m uvicorn app.main:app --reload
```

### Deploy falha silenciosamente

1. Verificar se `C:\tomcat\webapps\` existe no servidor Windows
2. Verificar permissões do usuário WinRM para escrita neste diretório
3. Ver o campo `output` no response — contém o stderr do PowerShell

---

## 14. Guia de Desenvolvimento com Claude Code

### Adicionar novo endpoint no backend

```
"Crie um endpoint GET /api/servers/{id}/services/status
 que consulta o status de todos os serviços via WinRM
 e atualiza o banco antes de retornar"
```

### Criar novo componente React

```
"Crie um componente frontend/components/ServerStatusChart.tsx
 usando apenas Tailwind CSS (sem biblioteca de gráficos)
 que exibe um gráfico de barras com a contagem de serviços
 por status (running/stopped/unknown)"
```

### Adicionar filtro em uma API existente

```
"No endpoint GET /api/servers/{id}/audit (arquivo backend/app/api/logs.py),
 adicione query params opcionais: action (string) e date_from (ISO date)
 para filtrar o resultado"
```

### Corrigir integração WinRM

```
"Em backend/app/services/winrm_service.py, adicione timeout de 30 segundos
 na conexão e retry de até 2 tentativas com delay de 2s entre elas"
```

### Adicionar migration de banco

```
"Adicione o campo 'ip_address' (String 45, nullable) na tabela servers
 (backend/app/models/server.py) e gere a migration Alembic"
```

### Fluxo de desenvolvimento recomendado

```
1. Definir o requisito em linguagem natural
2. Implementar o endpoint FastAPI (validar no Swagger)
3. Adicionar a constante do endpoint em frontend/lib/constants.ts
4. Consumir no componente/página com useQuery ou useMutation (TanStack)
5. Testar com o backend rodando localmente
```

### Convenções do projeto

| Aspecto | Convenção |
|---|---|
| Nomes de arquivos frontend | PascalCase para componentes, camelCase para hooks/lib |
| Nomes de arquivos backend | snake_case |
| Datas no banco | `DateTime(timezone=True)` — sempre UTC |
| Erros de API | FastAPI retorna `{ "detail": "mensagem" }` — lido por `getErrorMessage()` |
| Toast de feedback | `toast.success()` / `toast.error()` via react-hot-toast |
| Classes CSS | `cn()` de `lib/utils.ts` (clsx + tailwind-merge) |
| Queries | `useQuery({ queryKey: ["entidade", id], queryFn: ... })` |

---

*Última atualização: Maio 2026 — Frontend Next.js 14 + Backend FastAPI concluídos*
