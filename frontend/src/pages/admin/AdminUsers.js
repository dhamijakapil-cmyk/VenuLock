import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { api } from '@/context/AuthContext';
import { toast } from 'sonner';
import { formatDate } from '@/lib/utils';
import { Search, MoreVertical, UserCheck, UserX, Shield, UserPlus, X, ChevronDown } from 'lucide-react';

const EMPLOYEE_ROLES = [
  { value: 'rm', label: 'Relationship Manager' },
  { value: 'hr', label: 'Human Resources' },
  { value: 'venue_specialist', label: 'Venue Specialist' },
  { value: 'vam', label: 'Venue Acquisition Manager' },
  { value: 'venue_owner', label: 'Venue Owner' },
  { value: 'event_planner', label: 'Event Planner' },
  { value: 'finance', label: 'Finance' },
  { value: 'operations', label: 'Operations' },
  { value: 'marketing', label: 'Marketing' },
];

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [total, setTotal] = useState(0);
  const [showCreateEmployee, setShowCreateEmployee] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', email: '', password: '', role: 'rm' });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, [roleFilter, statusFilter]);

  const fetchUsers = async () => {
    try {
      const params = new URLSearchParams();
      if (roleFilter) params.set('role', roleFilter);
      if (statusFilter) params.set('status', statusFilter);
      
      const response = await api.get(`/admin/users?${params.toString()}`);
      setUsers(response.data.users || []);
      setTotal(response.data.total || 0);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const updateUserStatus = async (userId, status) => {
    try {
      await api.put(`/admin/users/${userId}`, { status });
      setUsers((prev) =>
        prev.map((u) => (u.user_id === userId ? { ...u, status } : u))
      );
      toast.success(`User ${status === 'active' ? 'activated' : 'deactivated'}`);
    } catch (error) {
      toast.error('Failed to update user');
    }
  };

  const updateUserRole = async (userId, role) => {
    try {
      await api.put(`/admin/users/${userId}`, { role });
      setUsers((prev) =>
        prev.map((u) => (u.user_id === userId ? { ...u, role } : u))
      );
      toast.success('Role updated');
    } catch (error) {
      toast.error('Failed to update role');
    }
  };

  const filteredUsers = users.filter((user) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      user.name?.toLowerCase().includes(query) ||
      user.email?.toLowerCase().includes(query)
    );
  });

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'admin': return 'bg-purple-500';
      case 'rm': return 'bg-blue-500';
      case 'hr': return 'bg-teal-500';
      case 'venue_specialist': return 'bg-amber-500';
      case 'vam': return 'bg-yellow-600';
      case 'venue_owner': return 'bg-green-500';
      case 'event_planner': return 'bg-pink-500';
      default: return 'bg-slate-500';
    }
  };

  const getRoleLabel = (role) => {
    switch (role) {
      case 'admin': return 'Admin';
      case 'rm': return 'RM';
      case 'hr': return 'HR';
      case 'venue_specialist': return 'Specialist';
      case 'vam': return 'VAM';
      case 'venue_owner': return 'Venue Owner';
      case 'event_planner': return 'Event Planner';
      case 'customer': return 'Customer';
      default: return role;
    }
  };

  const handleCreateRM = async (e) => {
    e.preventDefault();
    if (!createForm.name.trim() || !createForm.email.trim() || !createForm.password.trim()) {
      toast.error('All fields are required');
      return;
    }
    if (createForm.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setCreating(true);
    try {
      const res = await api.post('/admin/create-employee', createForm);
      toast.success(res.data.message);
      setShowCreateEmployee(false);
      setCreateForm({ name: '', email: '', password: '', role: 'rm' });
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create employee');
    } finally {
      setCreating(false);
    }
  };

  return (
    <DashboardLayout
      title="User Management"
      breadcrumbs={[{ label: 'Dashboard', href: '/admin/dashboard' }, { label: 'Users' }]}
    >
      {/* Filters */}
      <div className="bg-white border border-slate-200 p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#64748B]" />
            <Input
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="search-users"
            />
          </div>
          <Select value={roleFilter || "__all__"} onValueChange={(v) => setRoleFilter(v === "__all__" ? "" : v)}>
            <SelectTrigger className="w-full sm:w-[180px]" data-testid="filter-role">
              <SelectValue placeholder="All Roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All Roles</SelectItem>
              <SelectItem value="customer">Customer</SelectItem>
              <SelectItem value="rm">RM</SelectItem>
              <SelectItem value="hr">HR</SelectItem>
              <SelectItem value="venue_specialist">Venue Specialist</SelectItem>
              <SelectItem value="vam">Acquisition Manager</SelectItem>
              <SelectItem value="venue_owner">Venue Owner</SelectItem>
              <SelectItem value="event_planner">Event Planner</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter || "__all__"} onValueChange={(v) => setStatusFilter(v === "__all__" ? "" : v)}>
            <SelectTrigger className="w-full sm:w-[150px]" data-testid="filter-status">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="pending_verification">Pending</SelectItem>
            </SelectContent>
          </Select>
          <Button
            onClick={() => setShowCreateEmployee(true)}
            className="bg-[#111111] hover:bg-[#222] text-white"
            data-testid="create-employee-btn"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Create Employee
          </Button>
        </div>
      </div>

      {/* Create Employee Modal */}
      {showCreateEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowCreateEmployee(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6" onClick={(e) => e.stopPropagation()} data-testid="create-employee-modal">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-[#111111]">Create New Employee</h3>
              <button onClick={() => setShowCreateEmployee(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateRM} className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Role</label>
                <div className="relative">
                  <select
                    value={createForm.role}
                    onChange={(e) => setCreateForm(p => ({ ...p, role: e.target.value }))}
                    className="w-full h-10 bg-white border border-slate-200 rounded-md px-3 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-[#111111]/20"
                    data-testid="create-employee-role"
                  >
                    {EMPLOYEE_ROLES.map(r => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Full Name</label>
                <Input
                  value={createForm.name}
                  onChange={(e) => setCreateForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Rahul Sharma"
                  required
                  data-testid="create-employee-name"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Email</label>
                <Input
                  type="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm(p => ({ ...p, email: e.target.value }))}
                  placeholder="e.g. rahul@venuloq.in"
                  required
                  data-testid="create-employee-email"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Temporary Password</label>
                <Input
                  value={createForm.password}
                  onChange={(e) => setCreateForm(p => ({ ...p, password: e.target.value }))}
                  placeholder="Min 6 characters"
                  required
                  data-testid="create-employee-password"
                />
                <p className="text-[10px] text-slate-400 mt-1">Employee will be asked to change this on first login</p>
              </div>
              <div className="flex gap-2 pt-2">
                <Button type="submit" disabled={creating} className="flex-1 bg-[#111111] hover:bg-[#222] text-white" data-testid="create-employee-submit">
                  {creating ? 'Creating...' : 'Create Account'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowCreateEmployee(false)}>Cancel</Button>
              </div>
            </form>
            <div className="mt-3 bg-slate-50 rounded-lg p-3 text-[11px] text-slate-500">
              <p className="font-medium text-[#111111] mb-1">What happens next?</p>
              <p>Employee logs in with temp password, changes password, fills profile. HR then uploads documents and verifies.</p>
            </div>
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white border border-slate-200">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Status</th>
                <th>Joined</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" className="text-center py-8">
                    <div className="w-8 h-8 border-4 border-[#111111] border-t-transparent rounded-full animate-spin mx-auto" />
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center py-8 text-[#64748B]">
                    No users found
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.user_id} data-testid={`user-row-${user.user_id}`}>
                    <td>
                      <div className="flex items-center gap-3">
                        {user.picture ? (
                          <img
                            src={user.picture}
                            alt={user.name}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-[#111111] flex items-center justify-center text-white font-medium">
                            {user.name?.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-[#111111]">{user.name}</p>
                          <p className="text-sm text-[#64748B]">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <Badge className={`${getRoleBadgeColor(user.role)} text-white`}>
                        {getRoleLabel(user.role)}
                      </Badge>
                    </td>
                    <td>
                      <Badge
                        variant="outline"
                        className={user.status === 'active' ? 'text-green-600 border-green-600' : 'text-red-600 border-red-600'}
                      >
                        {user.status}
                      </Badge>
                    </td>
                    <td className="text-[#64748B]">{formatDate(user.created_at)}</td>
                    <td>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" data-testid={`user-actions-${user.user_id}`}>
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {user.status === 'active' ? (
                            <DropdownMenuItem
                              onClick={() => updateUserStatus(user.user_id, 'inactive')}
                              className="text-red-600"
                            >
                              <UserX className="w-4 h-4 mr-2" />
                              Deactivate
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={() => updateUserStatus(user.user_id, 'active')}
                              className="text-green-600"
                            >
                              <UserCheck className="w-4 h-4 mr-2" />
                              Activate
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => updateUserRole(user.user_id, 'rm')}
                          >
                            <Shield className="w-4 h-4 mr-2" />
                            Make RM
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => updateUserRole(user.user_id, 'admin')}
                          >
                            <Shield className="w-4 h-4 mr-2" />
                            Make Admin
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="mt-4 text-sm text-[#64748B]">
        Showing {filteredUsers.length} of {total} users
      </p>
    </DashboardLayout>
  );
};

export default AdminUsers;
