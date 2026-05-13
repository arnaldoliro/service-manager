# 🌿 Branch Management - Teams/RBAC Feature

## Status Atual da Branch

```
Branch: feature/teams-rbac-management
Origem: develop
Status: Criada e pronta para desenvolvimento
```

---

## 📝 Comandos Git Úteis

### Verificar Status da Branch

```bash
# Ver branch atual
git branch

# Ver branches remotas
git branch -a

# Ver histórico da branch
git log --oneline
```

### Trabalhar com a Branch

```bash
# Clonar projeto (se novo)
git clone <repo-url>

# Entrar na branch
git checkout feature/teams-rbac-management

# Ou criar e entrar (se não existir)
git checkout -b feature/teams-rbac-management origin/develop

# Atualizar com main/develop
git pull origin develop
git merge develop
```

### Commits Nessa Branch

```bash
# Ver mudanças antes de commitar
git status
git diff

# Commitar mudanças
git add .
git commit -m "feat: add team models and migrations"
git commit -m "feat: implement RBAC service"
git commit -m "feat: add team management endpoints"

# Ver logs dos commits
git log --oneline -n 10
```

### Push & Pull Request

```bash
# Enviar branch para repositório
git push origin feature/teams-rbac-management

# Criar Pull Request no GitHub/GitLab/Bitbucket
# (Interface web)

# Atualizar branch com mudanças de develop (se necessário)
git fetch origin
git rebase origin/develop

# Se tiver conflitos
git rebase --abort  # Desfazer rebase
git rebase --continue  # Continuar após resolver conflitos
```

### Manter Sincronizado

```bash
# Manter atualizado com develop enquanto desenvolve
git fetch origin
git rebase origin/develop

# Ou fazer merge (mais seguro)
git merge origin/develop
```

---

## 🛠️ Workflow Recomendado

### Dia 1: Começar a Feature

```bash
# 1. Entrar na branch
git checkout feature/teams-rbac-management

# 2. Verificar se está atualizada
git pull origin develop

# 3. Criar arquivos do banco de dados
# (Phase 1 do TEAMS_RBAC_IMPLEMENTATION_PROMPT.md)

# 4. Commitar
git add backend/app/models/*.py
git commit -m "feat: create team, team_member, team_server models"

# 5. Enviar
git push origin feature/teams-rbac-management
```

### Dia 2-3: API Backend

```bash
# 1. Atualizar com mudanças de develop (se houve)
git fetch origin
git rebase origin/develop

# 2. Trabalhar em serviços
# (Phase 2-3 do prompt)

# 3. Commitar frequentemente
git commit -m "feat: add RBAC service with permission checking"
git commit -m "feat: add team management endpoints"

# 4. Enviar regularmente
git push origin feature/teams-rbac-management
```

### Dia 4-5: Frontend

```bash
# 1. Atualizar
git pull origin develop

# 2. Adicionar componentes React
# (Phase 5-6 do prompt)

# 3. Commitar
git commit -m "feat: add team admin panel and management pages"
git commit -m "feat: add team member and permission components"

# 4. Enviar
git push origin feature/teams-rbac-management
```

### Dia 6: Testes e Finalização

```bash
# 1. Verificar status
git status

# 2. Adicionar testes
git add backend/tests/*.py frontend/__tests__/*.ts
git commit -m "test: add unit tests for RBAC"
git commit -m "test: add E2E tests for team workflows"

# 3. Limpar e revisar
git log --oneline -n 20  # Ver últimos commits

# 4. Preparar para merge
git push origin feature/teams-rbac-management
```

---

## 📋 Checklist de Cada Commit

Antes de fazer commit, verifique:

```
[ ] Código está funcionando localmente?
[ ] Tests passam?
[ ] Não há console.errors ou warnings?
[ ] Commit message é descritivo?
[ ] Não estou commitando node_modules ou .env?
[ ] Código está formatado?
[ ] Arquivo é relevante para a feature?
```

---

## 🔀 Merge para Develop

Quando feature estiver pronta:

```bash
# 1. Garantir que está atualizado
git fetch origin
git rebase origin/develop

# 2. Resolver conflitos se houver
git status  # Ver conflitos
# (editar arquivos conflitantes manualmente)
git add .
git rebase --continue

# 3. Enviar atualizado
git push origin feature/teams-rbac-management

# 4. Criar Pull Request
# (Interface do GitHub/GitLab/Bitbucket)

# 5. Após aprovação, fazer merge
# (Preferível via interface web)

# 6. Deletar branch local
git branch -d feature/teams-rbac-management

# 7. Deletar branch remota
git push origin --delete feature/teams-rbac-management
```

---

## ⚠️ Situações Comuns

### Acidentalmente commitei em develop

```bash
git log --oneline  # Ver últimos commits
git reset --soft HEAD~1  # Desfazer último commit (mantém mudanças)
git checkout feature/teams-rbac-management
git commit -m "seu-commit"
```

### Preciso de mudança de outra branch

```bash
git cherry-pick <commit-hash>  # Trazer um commit específico
```

### Minha branch ficou desatualizada

```bash
git fetch origin
git rebase origin/develop  # Rebaser e trazer mudanças
```

### Tenho mudanças não commitadas

```bash
git stash  # Guardar temporariamente
git checkout develop
# ... fazer algo ...
git checkout feature/teams-rbac-management
git stash pop  # Recuperar mudanças
```

---

## 📚 Boas Práticas de Commit

### Mensagens Descritivas

```
✅ BOM:
git commit -m "feat: add team model with leader relationship"
git commit -m "feat: implement team filtering in applications API"
git commit -m "fix: resolve permission check in team endpoints"
git commit -m "test: add unit tests for RBAC service"
git commit -m "docs: update API documentation for teams"

❌ RUIM:
git commit -m "update"
git commit -m "fix bug"
git commit -m "working on teams"
git commit -m "WIP"
```

### Commits Pequenos vs Grandes

```
✅ Preferir vários commits pequenos:
git commit -m "feat: create team models"
git commit -m "feat: add team relationships"
git commit -m "feat: create team migrations"

❌ Em vez de um grande:
git commit -m "feat: everything about teams"
```

---

## 🎯 Status da Feature

Após criar a branch, você tem:

✅ Branch `feature/teams-rbac-management` criada  
✅ 2 documentos descritivos:
   - TEAMS_RBAC_FEATURE.md (O que é a feature)
   - TEAMS_RBAC_IMPLEMENTATION_PROMPT.md (Como implementar)
✅ Prompt pronto para Claude Code  
✅ Tudo organizado e pronto para começar  

---

## 🚀 Próximos Passos

1. **Revisar documentação**
   ```bash
   cat TEAMS_RBAC_FEATURE.md  # Entender o design
   cat TEAMS_RBAC_IMPLEMENTATION_PROMPT.md  # Entender a implementação
   ```

2. **Começar com Claude Code**
   ```bash
   claude-code
   # Cole o prompt: TEAMS_RBAC_IMPLEMENTATION_PROMPT.md
   ```

3. **Fazer commits**
   ```bash
   git add .
   git commit -m "feat: implement Phase 1 - Team models"
   git push origin feature/teams-rbac-management
   ```

4. **Monitorar progresso**
   ```bash
   git log --oneline | head -20  # Ver commits mais recentes
   ```

---

## 📞 Dúvidas Comuns

**P: Posso fazer push enquanto estou desenvolvendo?**  
R: Sim! `git push origin feature/teams-rbac-management` regularmente é bom.

**P: E se develop receber mudanças enquanto trabalho?**  
R: Fazer `git rebase origin/develop` para trazer mudanças.

**P: Como faço merge com develop?**  
R: Via Pull Request na interface web (mais seguro).

**P: Posso deletar a branch antes de terminar?**  
R: Não! Mantenha até fazer merge com develop.

**P: E se der conflito?**  
R: Edite manualmente, `git add`, `git rebase --continue` ou peça ajuda.

---

**Sua feature está pronta para começar! 🚀**
