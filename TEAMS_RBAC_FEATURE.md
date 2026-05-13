# 🎯 TEAMS/EQUIPES & RBAC - Documentação da Feature

**Data:** Maio 2026  
**Status:** Em Design  
**Branch:** `feature/teams-rbac-management`

---

## 📋 Visão Geral

Sistema de gerenciamento de equipes com controle granular de acesso. Permite que o admin divida a plataforma em teams, cada um com seus próprios servidores/aplicações e hierarquia de permissões.

---

## 🎨 Arquitetura Conceitual

```
┌─────────────────────────────────────────────────────────────┐
│                    ADMIN SUPER USER                         │
│             (Cria teams e designa líderes)                  │
└────────────────┬────────────────────────────────────────────┘
                 │
        ┌────────┴────────┬───────────┐
        │                 │           │
   ┌────▼─────┐     ┌────▼────┐ ┌──▼─────┐
   │ TEAM A   │     │ TEAM B  │ │TEAM C  │
   │ (Dev)    │     │(Produção)│ │(QA)    │
   └────┬─────┘     └────┬────┘ └──┬─────┘
        │                │          │
   ┌────▼─────────┐ ┌──▼──────┐ ┌─▼──────┐
   │ Team Leader  │ │  Leader │ │ Leader │
   │  (João)      │ │ (Maria) │ │(Pedro) │
   └────┬─────────┘ └──┬──────┘ └─┬──────┘
        │              │          │
   ┌────▼────┬────▼─────┐      ┌─▼──────┐
   │ Dev 1   │  Dev 2   │      │  QA 1  │
   │(view)   │(deploy)  │      │(view)  │
   └─────────┴──────────┘      └────────┘
        │              │
   ┌────▼──────────────▼────┐
   │  Servidores/Apps       │
   │  Atribuídos ao Team    │
   │  ├─ Servidor 1         │
   │  ├─ Servidor 2         │
   │  └─ App: webrun        │
   └───────────────────────┘
```

---

## 📊 Modelos de Dados Novos

### **1. Team Model**

```python
# backend/app/models/team.py

class Team(Base):
    __tablename__ = "teams"
    
    id = Column(Integer, primary_key=True)
    name = Column(String(128), unique=True, nullable=False)           # "Team Dev", "Time Produção"
    description = Column(String(512))                                 # Descrição do time
    leader_id = Column(Integer, ForeignKey("users.id"), nullable=True) # Líder do time
    organization_id = Column(Integer, nullable=True)                  # Para multi-org no futuro
    status = Column(String(32), default="active")                     # active, archived
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    members = relationship("TeamMember", back_populates="team", cascade="all, delete-orphan")
    servers = relationship("TeamServer", back_populates="team", cascade="all, delete-orphan")
    applications = relationship("TeamApplication", back_populates="team", cascade="all, delete-orphan")
    leader = relationship("User", foreign_keys=[leader_id])
```

---

### **2. TeamMember Model**

```python
# backend/app/models/team_member.py

class TeamMemberRole(str, enum.Enum):
    LEADER = "leader"          # Gerencia o time
    MANAGER = "manager"        # Pode fazer deploy
    OPERATOR = "operator"      # Pode start/stop/restart
    VIEWER = "viewer"          # Apenas leitura

class TeamMember(Base):
    __tablename__ = "team_members"
    
    id = Column(Integer, primary_key=True)
    team_id = Column(Integer, ForeignKey("teams.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    role = Column(SQLEnum(TeamMemberRole), default=TeamMemberRole.VIEWER)  # Papel no time
    joined_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    team = relationship("Team", back_populates="members")
    user = relationship("User", back_populates="team_memberships")
    
    # Constraint: Um user por team
    __table_args__ = (UniqueConstraint('team_id', 'user_id'),)
```

---

### **3. TeamServer Model**

```python
# backend/app/models/team_server.py

class TeamServer(Base):
    __tablename__ = "team_servers"
    
    id = Column(Integer, primary_key=True)
    team_id = Column(Integer, ForeignKey("teams.id"), nullable=False)
    server_id = Column(Integer, ForeignKey("servers.id"), nullable=False)
    permissions = Column(JSON, default={})  # {"view": true, "deploy": true, "restart": true}
    assigned_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    team = relationship("Team", back_populates="servers")
    server = relationship("Server")
    
    # Constraint: Um servidor por time
    __table_args__ = (UniqueConstraint('team_id', 'server_id'),)
```

---

### **4. TeamApplication Model**

```python
# backend/app/models/team_application.py

class TeamApplication(Base):
    __tablename__ = "team_applications"
    
    id = Column(Integer, primary_key=True)
    team_id = Column(Integer, ForeignKey("teams.id"), nullable=False)
    application_id = Column(Integer, ForeignKey("applications.id"), nullable=False)
    permissions = Column(JSON, default={})  # {"view": true, "deploy": true, "restart": true}
    assigned_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    team = relationship("Team", back_populates="applications")
    application = relationship("Application")
    
    # Constraint: Uma app por time
    __table_args__ = (UniqueConstraint('team_id', 'application_id'),)
```

---

### **5. Atualizar User Model**

```python
# backend/app/models/user.py

class User(Base):
    # ... campos existentes ...
    
    # Novo campo
    role = Column(String(32), default="user")  # "admin", "user"
    
    # Relationships (ADICIONAR)
    team_memberships = relationship("TeamMember", back_populates="user")
    led_teams = relationship("Team", foreign_keys="Team.leader_id")
```

---

## 🔐 Hierarquia de Permissões

### **Níveis Globais (Admin)**

```
SUPER_ADMIN
├─ Criar/editar/deletar teams
├─ Designar leaders
├─ Atribuir servidores a teams
├─ Atribuir aplicações a teams
├─ Ver todos os times
└─ Auditar todas as ações
```

### **Níveis por Team (Leader)**

```
TEAM_LEADER
├─ Gerenciar membros do time (add/remove/change role)
├─ Definir permissões por membro
├─ Ver servidores/apps do time
├─ Aprovar/auditar deploys
└─ Gerar relatórios do time
```

### **Níveis por Team (Manager)**

```
TEAM_MANAGER
├─ Fazer deploy (se permissão)
├─ Executar start/stop/restart
├─ Ver histórico de ações
├─ Não pode adicionar membros
└─ Não pode alterar permissões
```

### **Níveis por Team (Operator)**

```
TEAM_OPERATOR
├─ Executar start/stop/restart
├─ Ver status
├─ Não pode fazer deploy
└─ Apenas leitura de histórico
```

### **Níveis por Team (Viewer)**

```
TEAM_VIEWER
├─ Ver status
├─ Ver histórico (read-only)
├─ Nenhuma ação (apenas leitura)
└─ Sem acesso a settings
```

---

## 📐 Tabela de Permissões (Por Ação)

```
┌──────────────┬─────────┬─────────┬──────────┬──────────┬────────┐
│    Ação      │ Leader  │ Manager │ Operator │  Viewer  │ Admin  │
├──────────────┼─────────┼─────────┼──────────┼──────────┼────────┤
│ View Teams   │   ✅    │   ✅    │    ✅    │    ✅    │   ✅   │
│ Create Team  │   ❌    │   ❌    │    ❌    │    ❌    │   ✅   │
│ Edit Team    │   ⚙️    │   ❌    │    ❌    │    ❌    │   ✅   │
│              │ (own)   │         │          │          │        │
├──────────────┼─────────┼─────────┼──────────┼──────────┼────────┤
│ Add Member   │   ✅    │   ❌    │    ❌    │    ❌    │   ✅   │
│ Remove Memb  │   ✅    │   ❌    │    ❌    │    ❌    │   ✅   │
│ Change Role  │   ✅    │   ❌    │    ❌    │    ❌    │   ✅   │
├──────────────┼─────────┼─────────┼──────────┼──────────┼────────┤
│ Deploy       │   ✅    │   ✅    │    ❌    │    ❌    │   ✅   │
│ Start Svc    │   ✅    │   ✅    │    ✅    │    ❌    │   ✅   │
│ Stop Svc     │   ✅    │   ✅    │    ✅    │    ❌    │   ✅   │
│ Restart Svc  │   ✅    │   ✅    │    ✅    │    ❌    │   ✅   │
├──────────────┼─────────┼─────────┼──────────┼──────────┼────────┤
│ View Logs    │   ✅    │   ✅    │    ✅    │    ✅    │   ✅   │
│ View History │   ✅    │   ✅    │    ✅    │    ✅    │   ✅   │
│ View Audit   │   ✅    │   ❌    │    ❌    │    ❌    │   ✅   │
├──────────────┼─────────┼─────────┼──────────┼──────────┼────────┤
│ Manage Perms │   ✅    │   ❌    │    ❌    │    ❌    │   ✅   │
│ Delete Team  │   ❌    │   ❌    │    ❌    │    ❌    │   ✅   │
└──────────────┴─────────┴─────────┴──────────┴──────────┴────────┘

Legenda:
✅ = Permissão total
❌ = Sem permissão
⚙️ = Permissão parcial (ex: editar seu próprio time)
```

---

## 🎯 Fluxo de Casos de Uso

### **Caso 1: Admin Cria Time**

```
1. Admin acessa Dashboard
2. Vai em "Admin" → "Teams"
3. Clica em "+ Novo Time"
4. Preenche:
   - Nome: "Time Desenvolvimento"
   - Descrição: "Responsável por dev"
   - Líder: Seleciona "João"
5. Clica em "Criar"
6. Sistema cria Team com João como leader
7. Audit Log: "Admin criou team 'Time Dev' com líder João"
```

### **Caso 2: Admin Atribui Servidores ao Time**

```
1. Admin em "Teams" → "Time Dev" → "Servidores"
2. Clica em "+ Adicionar Servidor"
3. Seleciona: "Servidor 1" (192.168.1.100)
4. Define permissões:
   - [ ] View
   - [x] Deploy
   - [x] Restart
5. Clica "Confirmar"
6. Agora todo membro de "Time Dev" vê "Servidor 1"
7. Com permissões: view + deploy + restart
```

### **Caso 3: Admin Atribui Aplicações ao Time**

```
1. Admin em "Teams" → "Time Dev" → "Aplicações"
2. Clica em "+ Adicionar Aplicação"
3. Seleciona: "webrun" (application_id: 1)
4. Define permissões:
   - [x] View
   - [x] Deploy
   - [x] Restart
5. Clica "Confirmar"
6. Agora Time Dev só vê aplicação "webrun"
```

### **Caso 4: Admin Adiciona Membro ao Time**

```
1. Admin em "Teams" → "Time Dev" → "Membros"
2. Clica em "+ Adicionar Membro"
3. Seleciona usuário: "Maria" (user_id: 5)
4. Define role: "MANAGER" (pode fazer deploy)
5. Clica "Adicionar"
6. Maria agora faz parte do "Time Dev" como MANAGER
7. Ela vê: Servidor 1 + webrun app
8. Ela pode: view, deploy, restart (conforme permissões)
```

### **Caso 5: Team Leader Gerencia Seu Time**

```
1. João (leader do Time Dev) faz login
2. Vê Dashboard com apenas Time Dev
3. Vai em "Membros do Time"
4. Vê: Maria (MANAGER), Pedro (OPERATOR)
5. Clica em Maria → muda role para OPERATOR
6. Maria perde permissão de deploy
7. Audit Log: "João alterou role de Maria para OPERATOR"
```

### **Caso 6: Developer Faz Deploy (Com Restrições)**

```
1. Carlos (role: MANAGER, team: Time Dev) faz login
2. Vê apenas: "webrun" app (atribuída ao time)
3. Clica em "Deploy"
4. Faz upload de novo webrun.jar
5. Sistema executa deployment
6. Mas Carlos NÃO vê:
   - Apps de outros times
   - Servidores que não pertencem ao time
   - Configurações de segurança
7. Audit Log: "Carlos fez deploy de webrun"
```

---

## 🏗️ Arquitetura de Implementação

### **Backend - Novos Arquivos**

```
backend/app/
├── models/
│   ├── team.py                 # Team model
│   ├── team_member.py          # TeamMember model
│   ├── team_server.py          # TeamServer model
│   ├── team_application.py     # TeamApplication model
│   └── __init__.py             # Exportar novos models
│
├── api/
│   ├── teams.py                # Endpoints de teams (CRUD)
│   ├── team_members.py         # Endpoints de membros
│   └── team_permissions.py     # Endpoints de permissões
│
├── services/
│   └── rbac_service.py         # Lógica de RBAC/autorização
│
├── middleware/
│   └── team_auth.py            # Middleware de validação de time
│
└── utils/
    ├── permissions.py          # Decoradores de permissão
    └── team_filters.py         # Filtros de dados por time
```

### **Frontend - Novos Componentes**

```
frontend/
├── app/(dashboard)/
│   ├── admin/
│   │   ├── teams/
│   │   │   ├── page.tsx              # Listagem de times
│   │   │   ├── [id]/
│   │   │   │   ├── page.tsx          # Detalhes do time
│   │   │   │   ├── members/
│   │   │   │   │   └── page.tsx      # Gerenciar membros
│   │   │   │   ├── servers/
│   │   │   │   │   └── page.tsx      # Atribuir servidores
│   │   │   │   └── applications/
│   │   │   │       └── page.tsx      # Atribuir apps
│   │   │   └── create/
│   │   │       └── page.tsx          # Criar novo time
│   │   └── users/
│   │       └── page.tsx              # Gerenciar usuários globais
│   │
│   ├── my-team/
│   │   ├── page.tsx                  # Dashboard do time (leader view)
│   │   ├── members/
│   │   │   └── page.tsx              # Gerenciar membros (leader only)
│   │   └── settings/
│   │       └── page.tsx              # Configurações do time
│   │
│   └── applications/
│       └── page.tsx                  # MODIFICADO: filtrar por time
│
├── components/
│   ├── TeamCard.tsx                  # Card de time
│   ├── TeamMemberList.tsx            # Lista de membros
│   ├── PermissionMatrix.tsx          # Matriz de permissões
│   ├── RoleSelector.tsx              # Seletor de roles
│   └── ServerAssignment.tsx          # Atribuir servidores
│
├── hooks/
│   ├── useTeam.ts                    # Hook para info do time
│   ├── useTeamPermissions.ts         # Hook para permissões
│   └── useTeamFilter.ts              # Hook para filtrar por time
│
└── lib/
    └── rbac.ts                       # Utilitários de RBAC
```

---

## 📡 API Endpoints Novos

### **Teams (Admin)**

```
GET    /api/admin/teams              # Listar todos os times
POST   /api/admin/teams              # Criar novo time
GET    /api/admin/teams/{id}         # Detalhes do time
PUT    /api/admin/teams/{id}         # Editar time
DELETE /api/admin/teams/{id}         # Deletar time
```

### **Team Members**

```
GET    /api/admin/teams/{id}/members           # Listar membros
POST   /api/admin/teams/{id}/members           # Adicionar membro
PUT    /api/admin/teams/{id}/members/{user_id} # Alterar role
DELETE /api/admin/teams/{id}/members/{user_id} # Remover membro

GET    /api/my-team/members          # Ver membros do meu time (leader)
PUT    /api/my-team/members/{id}     # Editar membro (leader)
DELETE /api/my-team/members/{id}     # Remover (leader)
```

### **Team Servers**

```
GET    /api/admin/teams/{id}/servers           # Listar servidores
POST   /api/admin/teams/{id}/servers           # Adicionar servidor
PUT    /api/admin/teams/{id}/servers/{server_id} # Editar permissões
DELETE /api/admin/teams/{id}/servers/{server_id} # Remover servidor
```

### **Team Applications**

```
GET    /api/admin/teams/{id}/applications           # Listar apps
POST   /api/admin/teams/{id}/applications           # Adicionar app
PUT    /api/admin/teams/{id}/applications/{app_id}  # Editar permissões
DELETE /api/admin/teams/{id}/applications/{app_id}  # Remover app
```

### **My Team (Leader/Member)**

```
GET    /api/my-team                  # Info do meu time
GET    /api/my-team/servers          # Servidores do time
GET    /api/my-team/applications     # Apps do time
GET    /api/my-team/activity         # Auditoria do time
```

---

## 🔒 Middleware de Autorização

```python
# Decorator para proteger endpoints

@require_admin
def create_team():
    # Apenas admin pode criar times
    pass

@require_team_leader(team_id)
def manage_team_members():
    # Apenas líder do time pode gerenciar membros
    pass

@require_permission("deploy", resource_type="application")
def deploy_application():
    # User precisa ter permissão "deploy" na app
    pass

@require_team_access(server_id)
def view_server_details():
    # User só vê se time dele tem acesso ao servidor
    pass
```

---

## 📊 Fluxo de Dados - Isolamento por Time

Quando um user faz login:

```
1. Sistema verifica: Qual time ele pertence?
2. Se pertence a 1 time:
   - Retorna apenas servidores desse time
   - Retorna apenas apps desse time
   - Retorna apenas membros desse time
   
3. Se é admin:
   - Retorna TUDO
   - Acesso a painel de admin
   
4. Se é leader:
   - Retorna dados do seu time
   - Pode editar membros do seu time
   - Vê auditoria do seu time
```

---

## 🧪 Testes Recomendados

```
Unit Tests:
✅ Test: Admin cria time
✅ Test: Admin atribui servidor a time
✅ Test: User vê apenas seu time
✅ Test: Leader pode editar membros
✅ Test: Manager pode fazer deploy
✅ Test: Viewer não pode fazer deploy
✅ Test: User de outro time não vê dados

Integration Tests:
✅ Test: Fluxo completo: criar team → adicionar membros → deploy
✅ Test: Permissões em cascata
✅ Test: Audit logging de ações

E2E Tests:
✅ Test: Admin cria team via UI
✅ Test: Leader gerencia team via UI
✅ Test: Member faz deploy com restrições
```

---

## 📈 Escalabilidade Futura

```
Phase 2:
├─ Multi-organizações (suporte a múltiplas empresas)
├─ Teams dentro de teams (subequipes)
└─ Aprovações de deploy (team leader aprova antes)

Phase 3:
├─ Custom permissions (criar roles custom)
├─ Permission templates (templates de permissão)
└─ Delegação de autoridade (leader delega a manager)

Phase 4:
├─ SSO/LDAP (integração com Active Directory)
├─ 2FA por time
└─ Conformidade (RBAC auditing para compliance)
```

---

## 📝 Checklist de Implementação

```
Phase 1: Database & Models
[ ] Criar Team model
[ ] Criar TeamMember model
[ ] Criar TeamServer model
[ ] Criar TeamApplication model
[ ] Atualizar User model
[ ] Migração de banco de dados

Phase 2: Backend API
[ ] Endpoints de CRUD de times
[ ] Endpoints de gerenciamento de membros
[ ] Endpoints de atribuição de servidores
[ ] Endpoints de atribuição de apps
[ ] Middleware de RBAC
[ ] Filtros de dados por time
[ ] Testes unitários

Phase 3: Frontend
[ ] Página admin de times
[ ] Página de detalhes do time
[ ] Gerenciador de membros
[ ] Atribuidor de servidores/apps
[ ] Dashboard de leader
[ ] Filtros em applications page
[ ] Testes E2E

Phase 4: Segurança & Auditoria
[ ] Audit log de ações de time
[ ] Rate limiting por time
[ ] Permissões em cascata
[ ] Testes de segurança

Phase 5: Produção
[ ] Documentação de usuário
[ ] Treinamento de admins
[ ] Monitoramento
[ ] Backup/disaster recovery
```

---

## 💡 Decisões Arquiteturais

### **Por que não colocar tudo em um só model?**
- Teams é uma entidade separada que pode crescer
- Permite reutilização (um servidor em múltiplos times no futuro)
- Mais fácil manter lógica de autorização

### **Por que JSON para permissions?**
- Flexibilidade para adicionar permissões customizadas
- Fácil de expandir sem migração de banco
- Exemplos: `{"view": true, "deploy": true, "restart": false, "delete": false}`

### **Por que roles em vez de permissões granulares?**
- Mais simples para começar
- 80/20: roles cobrem 80% dos casos
- Pode evoluir para permissions customizadas depois

### **Por que filtrar no backend e não no frontend?**
- Segurança (user não consegue forçar acesso)
- Consistência (sempre retorna dados corretos)
- Auditoria (fácil de logar)

---

## 🎯 Sucesso da Feature

Você saberá que está funcionando quando:

✅ Admin cria team de Dev e atribui 3 servidores  
✅ Leader do time vê APENAS aqueles 3 servidores  
✅ Manager do time consegue fazer deploy  
✅ Viewer do time vê tudo mas não consegue fazer nada  
✅ User de outro time não consegue acessar  
✅ Todas as ações aparecem no audit log  
✅ Escala para 100+ times sem problema  

---

**Pronto para começar a implementação?**
