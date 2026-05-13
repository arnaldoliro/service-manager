# TEAMS & RBAC IMPLEMENTATION PROMPT FOR CLAUDE CODE

## PHASE 1: DATABASE MODELS & MIGRATIONS

### Part 1: Create Team Models

Analyze the project structure and implement the following new models:

**File: `backend/app/models/team.py`**

Create Team model with:
- id (primary key)
- name (unique, string, max 128)
- description (text)
- leader_id (foreign key to users.id)
- status (active, archived)
- created_at, updated_at (timestamps)
- Relationships: members, servers, applications, leader

**File: `backend/app/models/team_member.py`**

Create TeamMemberRole enum with values:
- LEADER (team leader)
- MANAGER (can deploy)
- OPERATOR (can start/stop/restart)
- VIEWER (read-only)

Create TeamMember model with:
- id (primary key)
- team_id (foreign key)
- user_id (foreign key) - unique constraint with team_id
- role (enum TeamMemberRole, default VIEWER)
- joined_at (timestamp)
- Relationships: team, user

**File: `backend/app/models/team_server.py`**

Create TeamServer model with:
- id (primary key)
- team_id (foreign key) - unique constraint with server_id
- server_id (foreign key)
- permissions (JSON, default {}) - example: {"view": true, "deploy": true, "restart": true}
- assigned_at (timestamp)
- Relationships: team, server

**File: `backend/app/models/team_application.py`**

Create TeamApplication model with:
- id (primary key)
- team_id (foreign key) - unique constraint with application_id
- application_id (foreign key)
- permissions (JSON, default {}) - example: {"view": true, "deploy": true}
- assigned_at (timestamp)
- Relationships: team, application

### Part 2: Update Existing Models

**File: `backend/app/models/user.py`**

Add to User model:
- role (string, default "user") - values: "admin", "user"
- Relationship: team_memberships (one-to-many with TeamMember)
- Relationship: led_teams (one-to-many with Team)

**File: `backend/app/models/__init__.py`**

Export new models:
- Team, TeamMember, TeamMemberRole, TeamServer, TeamApplication

### Part 3: Database Migration

**File: `backend/scripts/migrate_teams.py`**

Create a migration script that:
- Creates all new tables (teams, team_members, team_servers, team_applications)
- Adds role column to users table
- Creates necessary indexes on foreign keys
- Handles existing data (optional)

---

## PHASE 2: BACKEND SERVICES & UTILITIES

### Part 4: RBAC Service

**File: `backend/app/services/rbac_service.py`**

Create RBACService class with methods:
- `check_permission(user_id, action, resource_type, resource_id)` → bool
- `get_user_team(user_id)` → Team or None
- `get_team_for_resource(resource_id, resource_type)` → Team
- `can_view_resource(user_id, resource_id, resource_type)` → bool
- `can_deploy(user_id, application_id)` → bool
- `can_manage_team(user_id, team_id)` → bool
- `get_filtered_servers(user_id)` → List[Server]
- `get_filtered_applications(user_id)` → List[Application]

Reference the permissions table from documentation.

### Part 5: Permission Decorators

**File: `backend/app/utils/permissions.py`**

Create FastAPI dependency decorators:
- `@require_permission(action, resource_type)` - Generic permission check
- `@require_admin` - Only admin users
- `@require_team_leader` - Only team leader
- `@require_team_membership` - User must be in a team
- `@require_resource_access(resource_type)` - Check if user has access to resource

Usage example:
```python
@router.post("/deploy")
@require_permission("deploy", "application")
async def deploy(app_id: int, current_user: User = Depends(get_current_user)):
    ...
```

### Part 6: Team Filters

**File: `backend/app/utils/team_filters.py`**

Create filtering functions:
- `filter_servers_by_team(servers, user_id)` → List[Server]
- `filter_applications_by_team(apps, user_id)` → List[Application]
- `get_team_members(team_id)` → List[User]
- `build_permission_matrix(team_id)` → Dict of permissions

---

## PHASE 3: BACKEND API ENDPOINTS

### Part 7: Teams API

**File: `backend/app/api/teams.py`**

Create router with endpoints:

**Admin Endpoints:**
- `GET /api/admin/teams` - List all teams (admin only)
  Returns: List of teams with member count, leader info
  
- `POST /api/admin/teams` - Create new team (admin only)
  Body: {name, description, leader_id}
  Returns: Created team object
  
- `GET /api/admin/teams/{team_id}` - Get team details (admin only)
  Returns: Team with members, servers, applications
  
- `PUT /api/admin/teams/{team_id}` - Edit team (admin only)
  Body: {name, description, leader_id}
  Returns: Updated team
  
- `DELETE /api/admin/teams/{team_id}` - Delete team (admin only)
  Returns: {success: true}

**Team Leader Endpoints:**
- `GET /api/my-team` - Get my team info
  Returns: Current user's team details
  
- `GET /api/my-team/servers` - Get team's servers
  Returns: List of servers assigned to team with permissions
  
- `GET /api/my-team/applications` - Get team's applications
  Returns: List of applications assigned to team with permissions
  
- `GET /api/my-team/activity` - Get team activity log
  Returns: Audit log of team actions

### Part 8: Team Members API

**File: `backend/app/api/team_members.py`**

Create router with endpoints:

**Admin Endpoints:**
- `GET /api/admin/teams/{team_id}/members` - List team members
  Returns: List with user info, roles, join date
  
- `POST /api/admin/teams/{team_id}/members` - Add member to team
  Body: {user_id, role}
  Returns: Created team_member
  
- `PUT /api/admin/teams/{team_id}/members/{user_id}` - Change member role
  Body: {role}
  Returns: Updated member
  
- `DELETE /api/admin/teams/{team_id}/members/{user_id}` - Remove member
  Returns: {success: true}

**Team Leader Endpoints:**
- `GET /api/my-team/members` - List my team members
  
- `PUT /api/my-team/members/{user_id}` - Change role of team member (leader only)
  Body: {role}
  Validation: Can only change roles within his team
  
- `DELETE /api/my-team/members/{user_id}` - Remove member (leader only)

### Part 9: Team Permissions API

**File: `backend/app/api/team_permissions.py`**

Create router with endpoints:

**Admin Endpoints:**
- `POST /api/admin/teams/{team_id}/servers` - Assign server to team
  Body: {server_id, permissions: {view, deploy, restart, delete}}
  Returns: Created TeamServer
  
- `PUT /api/admin/teams/{team_id}/servers/{server_id}` - Update server permissions
  Body: {permissions}
  Returns: Updated TeamServer
  
- `DELETE /api/admin/teams/{team_id}/servers/{server_id}` - Remove server from team
  Returns: {success: true}

- `POST /api/admin/teams/{team_id}/applications` - Assign app to team
  Body: {application_id, permissions}
  Returns: Created TeamApplication
  
- `PUT /api/admin/teams/{team_id}/applications/{app_id}` - Update app permissions
  Body: {permissions}
  Returns: Updated TeamApplication
  
- `DELETE /api/admin/teams/{team_id}/applications/{app_id}` - Remove app from team
  Returns: {success: true}

### Part 10: Update Existing APIs

**File: `backend/app/api/applications.py` (MODIFY)**

Update the existing applications endpoints:
- `GET /api/applications` - Now filter by team
  Before: return all applications
  After: return only applications the user's team has access to
  
- `GET /api/servers` - Now filter by team
  Before: return all servers
  After: return only servers the user's team has access to

Add query parameter:
- `GET /api/my-team/applications` - Return user's team applications only
- `GET /api/my-team/servers` - Return user's team servers only

### Part 11: Register Routers

**File: `backend/app/main.py` (MODIFY)**

Add imports and register:
```python
from app.api import teams, team_members, team_permissions

app.include_router(teams.router)
app.include_router(team_members.router)
app.include_router(team_permissions.router)
```

---

## PHASE 4: AUTHENTICATION & MIDDLEWARE

### Part 12: Team Auth Middleware

**File: `backend/app/middleware/team_auth.py`**

Create middleware that:
- Checks if user has access to requested resource
- Validates team membership before accessing team data
- Enforces role-based permissions
- Returns 403 Forbidden if access denied
- Logs unauthorized access attempts

### Part 13: Update JWT Claims

**File: `backend/app/services/security.py` (MODIFY)**

Update JWT token generation to include:
- user_id
- role (global role: admin/user)
- team_id (primary team, if user is member)
- team_role (role within team: leader/manager/operator/viewer)

Example JWT payload:
```json
{
  "sub": "user_123",
  "role": "user",
  "team_id": 5,
  "team_role": "manager",
  "exp": 1234567890
}
```

---

## PHASE 5: FRONTEND COMPONENTS & PAGES

### Part 14: Admin Team Management

**File: `frontend/app/(dashboard)/admin/teams/page.tsx` (NEW)**

Create teams listing page with:
- Table of all teams
- Columns: Name, Leader, Members Count, Status
- Buttons: View, Edit, Delete, Add Member
- Create New Team button
- Search/filter by name

**File: `frontend/app/(dashboard)/admin/teams/create/page.tsx` (NEW)**

Create form to:
- Input team name (required)
- Input description (optional)
- Select leader (dropdown of users)
- Submit button

**File: `frontend/app/(dashboard)/admin/teams/[id]/page.tsx` (NEW)**

Team details page with:
- Team info (name, description, leader)
- Tabs: Members, Servers, Applications
- Edit team button
- Delete team button
- Status: Active/Archived

### Part 15: Team Members Management

**File: `frontend/app/(dashboard)/admin/teams/[id]/members/page.tsx` (NEW)**

Team members page with:
- Table of members
- Columns: User, Role, Joined Date
- Role selector dropdown (LEADER/MANAGER/OPERATOR/VIEWER)
- Add member button
- Remove member button

**File: `frontend/components/TeamMemberList.tsx` (NEW)**

Reusable component showing:
- List of team members with avatars
- Role badges
- Edit/remove buttons (if authorized)

### Part 16: Server & Application Assignment

**File: `frontend/app/(dashboard)/admin/teams/[id]/servers/page.tsx` (NEW)**

Assign servers page with:
- Table of available servers
- Columns: Hostname, IP, Status
- Multi-select checkboxes
- Permission toggles (View, Deploy, Restart, Delete)
- Assign button

**File: `frontend/app/(dashboard)/admin/teams/[id]/applications/page.tsx` (NEW)**

Assign applications page with:
- Table of available applications
- Columns: Name, Version, Status
- Multi-select checkboxes
- Permission toggles (View, Deploy, etc)
- Assign button

**File: `frontend/components/PermissionMatrix.tsx` (NEW)**

Reusable permission editor with:
- Checkboxes for each permission
- Visual grid layout
- Apply changes button

### Part 17: Team Leader Dashboard

**File: `frontend/app/(dashboard)/my-team/page.tsx` (NEW)**

Team leader dashboard showing:
- Team name and description
- Member count
- Server count
- Application count
- Recent activity
- Quick actions (add member, view logs)

**File: `frontend/app/(dashboard)/my-team/members/page.tsx` (NEW)**

Manage team members (leader only):
- List of members
- Change role dropdown
- Remove member button
- Cannot add/remove (only admin can add)
- Cannot change leader

**File: `frontend/app/(dashboard)/my-team/settings/page.tsx` (NEW)**

Team settings (leader):
- View team info (read-only)
- View team servers
- View team applications
- View audit log
- Export team data (optional)

### Part 18: Update Existing Pages

**File: `frontend/app/(dashboard)/applications/page.tsx` (MODIFY)**

Update applications page:
- Filter applications by user's team
- Show "Team" column
- Only show apps user has access to
- Hide admin functions from non-admin

**File: `frontend/app/(dashboard)/servers/page.tsx` (MODIFY)**

Update servers page:
- Filter servers by user's team
- Show "Team" column
- Only show servers user's team has access to

**File: `frontend/components/Navbar.tsx` (MODIFY)**

Update navbar:
- Show current team name for non-admin users
- Add "My Team" link if user is team leader
- Add "Admin" link if user is admin

---

## PHASE 6: FRONTEND UTILITIES & HOOKS

### Part 19: Custom Hooks

**File: `frontend/hooks/useTeam.ts` (NEW)**

Hook to manage team data:
- `const { team, loading, error } = useTeam()`
- Returns current user's team info
- Fetches from `/api/my-team`

**File: `frontend/hooks/useTeamPermissions.ts` (NEW)**

Hook to check permissions:
- `const { canDeploy, canStart, canDelete } = useTeamPermissions(resourceId, resourceType)`
- Returns boolean for each permission
- Cached for performance

**File: `frontend/hooks/useTeamFilter.ts` (NEW)**

Hook to filter data by team:
- `const { filteredServers, filteredApps } = useTeamFilter()`
- Auto-filters based on user's team
- Re-runs on data/team change

### Part 20: RBAC Utilities

**File: `frontend/lib/rbac.ts` (NEW)**

Utility functions:
- `hasPermission(permission, resourceType)` → bool
- `isTeamLeader()` → bool
- `isAdmin()` → bool
- `canAccess(resourceId, resourceType)` → bool
- `getRoleLabel(role)` → string (display-friendly)

---

## PHASE 7: INTEGRATION & TESTING

### Part 21: Update API Client

**File: `frontend/lib/api.ts` (MODIFY)**

Add team-related endpoints:
- GET `/api/admin/teams`
- POST `/api/admin/teams`
- GET `/api/my-team`
- GET `/api/my-team/members`
- POST `/api/my-team/members/{id}`
- etc.

### Part 22: E2E Tests

**File: `frontend/__tests__/teams.e2e.ts` (NEW)**

Test scenarios:
1. Admin creates team
2. Admin adds members to team
3. Admin assigns servers to team
4. Team leader edits member roles
5. User sees only team data
6. Manager can deploy
7. Viewer cannot deploy
8. Cross-team access denied

### Part 23: Unit Tests

**File: `backend/tests/test_rbac.py` (NEW)**

Test RBAC service:
- Test permission checking
- Test team filtering
- Test role-based access
- Test cascading permissions

---

## PHASE 8: AUDIT & SECURITY

### Part 24: Team Audit Logging

**File: `backend/app/models/audit_log.py` (MODIFY)**

Update audit log to include:
- team_id (which team action was on)
- team_action (team-specific actions: member_added, permission_changed, etc)

Example: "João added Maria to Time Dev with role MANAGER"

### Part 25: Team-Based Audit

Add audit logging for:
- Team creation/deletion
- Member addition/removal/role change
- Server/app assignment/removal
- Permission changes

---

## IMPLEMENTATION NOTES

### Security Considerations

1. **Backend filtering is mandatory**
   - Never trust frontend to filter data
   - Always check permissions on backend
   - Return 403 Forbidden if unauthorized

2. **Team isolation**
   - User cannot see data from other teams
   - User cannot access resources not assigned to team
   - Admin can see everything

3. **Role validation**
   - Always validate JWT includes team_role
   - Check role before allowing action
   - Fail closed (deny by default)

### Database Indexes

Create indexes on:
- team_members.team_id
- team_members.user_id
- team_servers.team_id
- team_applications.team_id
- For performance on filtering

### Testing Strategy

1. Unit test RBAC logic independently
2. Integration test with database
3. E2E test full user flows
4. Security test role enforcement

### Performance Considerations

- Cache user's team info (JWT includes it)
- Cache permissions for 1 minute
- Use eager loading for team relationships
- Index foreign keys

---

## SUCCESS CRITERIA

Implementation is successful when:

✅ Admin can create teams
✅ Admin can add members to teams
✅ Admin can assign servers to teams
✅ Admin can assign apps to teams
✅ Team leader can edit member roles (within team)
✅ MANAGER role can deploy
✅ OPERATOR role can start/stop/restart
✅ VIEWER role can only view
✅ User sees only team data
✅ User from Team A cannot see Team B data
✅ Cross-team access returns 403
✅ All actions logged to audit
✅ Permissions matrix works correctly
✅ Team can have multiple servers
✅ Team can have multiple applications
✅ User can change teams (via admin)
✅ Performance is acceptable with 100+ teams

---

## ESTIMATED EFFORT

- Phase 1 (Database): 2 hours
- Phase 2 (Services): 3 hours
- Phase 3 (Endpoints): 4 hours
- Phase 4 (Middleware): 2 hours
- Phase 5 (Frontend): 6 hours
- Phase 6 (Hooks): 2 hours
- Phase 7 (Tests): 3 hours
- Phase 8 (Audit): 1 hour

**Total: ~23 hours**

Can be split across sprints.

---

**Ready to start implementation!**
