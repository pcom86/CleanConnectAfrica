"use client";

import { useEffect, useState } from "react";
import { listUsers, updateUserStatus, registerUser, updateUser } from "@/lib/api";
import type { User, PagedResult } from "@/lib/types";

const ROLE_OPTIONS = [
  { value: "", label: "All Roles" },
  { value: "Customer", label: "Customer" },
  { value: "BusinessCustomer", label: "Business Customer" },
  { value: "Cleaner", label: "Cleaner" },
  { value: "ProviderOwner", label: "Provider Owner" },
  { value: "Admin", label: "Admin" },
];

const STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "Active", label: "Active" },
  { value: "Inactive", label: "Inactive" },
  { value: "Suspended", label: "Suspended" },
  { value: "PendingActivation", label: "Pending Activation" },
];

const CREATE_ROLE_OPTIONS = [
  { value: "Customer", label: "Customer" },
  { value: "BusinessCustomer", label: "Business Customer" },
  { value: "Cleaner", label: "Cleaner" },
  { value: "ProviderOwner", label: "Provider Owner" },
  { value: "Admin", label: "Admin" },
];

const CREATE_STATUS_OPTIONS = [
  { value: "Active", label: "Active" },
  { value: "Inactive", label: "Inactive" },
  { value: "Suspended", label: "Suspended" },
  { value: "PendingActivation", label: "Pending Activation" },
];

export default function AdminUsersPage() {
  const [users, setUsers] = useState<PagedResult<User> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
    password: "",
    role: "Customer",
    status: "Active",
  });
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [editUser, setEditUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
    role: "Customer",
    status: "Active",
  });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  async function load(page = 1) {
    setLoading(true);
    setError(null);
    try {
      const result = await listUsers({
        role: roleFilter || undefined,
        status: statusFilter || undefined,
        page,
        pageSize: 10,
      });
      if (result.succeeded && result.data) {
        setUsers(result.data);
      } else {
        setError(result.error ?? "Failed to load users.");
      }
    } catch {
      setError("Unable to reach the server.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(1);
  }, [roleFilter, statusFilter]);

  function openEdit(user: User) {
    setEditUser(user);
    setEditForm({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phoneNumber: user.phoneNumber,
      role: user.role,
      status: user.status,
    });
    setEditError(null);
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editUser) return;
    setEditError(null);
    setEditLoading(true);
    try {
      const result = await updateUser(editUser.id, {
        firstName: editForm.firstName,
        lastName: editForm.lastName,
        email: editForm.email,
        phoneNumber: editForm.phoneNumber,
        role: editForm.role,
        status: editForm.status,
      });
      if (result.succeeded && result.data) {
        setEditUser(null);
        await load(users?.page ?? 1);
      } else {
        setEditError(result.error ?? "Failed to update user.");
      }
    } catch {
      setEditError("Server error during update.");
    } finally {
      setEditLoading(false);
    }
  }

  async function handleSetStatus(user: User, nextStatus: string) {
    setActionLoading(user.id);
    try {
      const result = await updateUserStatus(user.id, nextStatus);
      if (result.succeeded) {
        await load(users?.page ?? 1);
      } else {
        setError(result.error ?? "Update failed.");
      }
    } catch {
      setError("Server error during update.");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleCreateSubmit(e: React.FormEvent) {
    e.preventDefault();
    setCreateError(null);
    setCreateLoading(true);
    try {
      const result = await registerUser({
        firstName: createForm.firstName,
        lastName: createForm.lastName,
        email: createForm.email,
        phoneNumber: createForm.phoneNumber,
        passwordHash: createForm.password,
        role: createForm.role,
        status: createForm.status,
        customerProfile: createForm.role === "Customer" ? { customerType: "Residential" } : null,
      });
      if (result.succeeded && result.data) {
        setShowCreate(false);
        setCreateForm({ firstName: "", lastName: "", email: "", phoneNumber: "", password: "", role: "Customer", status: "Active" });
        await load(1);
      } else {
        setCreateError(result.error ?? "Failed to create user.");
      }
    } catch {
      setCreateError("Server error during creation.");
    } finally {
      setCreateLoading(false);
    }
  }

  function statusBadge(status: string) {
    const map: Record<string, string> = {
      Active: "bg-green-50 text-green-700 border-green-200",
      Inactive: "bg-gray-50 text-gray-600 border-gray-200",
      Suspended: "bg-red-50 text-red-700 border-red-200",
      PendingActivation: "bg-amber-50 text-amber-700 border-amber-200",
    };
    return map[status] ?? "bg-gray-50 text-gray-600 border-gray-200";
  }

  function roleBadge(role: string) {
    const map: Record<string, string> = {
      Customer: "bg-blue-50 text-blue-700",
      BusinessCustomer: "bg-indigo-50 text-indigo-700",
      Cleaner: "bg-purple-50 text-purple-700",
      ProviderOwner: "bg-orange-50 text-orange-700",
      Admin: "bg-red-50 text-red-700",
    };
    return map[role] ?? "bg-gray-50 text-gray-600";
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Users</h1>
      <p className="text-gray-500 text-sm mb-6">Manage user accounts, roles and statuses.</p>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>
      )}

      {/* Header actions */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-green"
          >
            {ROLE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-green"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <button
          onClick={() => { setShowCreate(true); setCreateError(null); }}
          className="px-4 py-2 bg-brand-green text-white text-sm font-medium rounded-lg hover:bg-brand-green-dark transition-colors"
        >
          + Create User
        </button>
      </div>

      {/* Create User Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Create User</h2>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4">
              {createError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{createError}</div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First name</label>
                  <input required value={createForm.firstName} onChange={(e) => setCreateForm({ ...createForm, firstName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-green text-gray-900" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last name</label>
                  <input required value={createForm.lastName} onChange={(e) => setCreateForm({ ...createForm, lastName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-green text-gray-900" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" required value={createForm.email} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-green text-gray-900" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone number</label>
                <input required value={createForm.phoneNumber} onChange={(e) => setCreateForm({ ...createForm, phoneNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-green text-gray-900" placeholder="+27821234567" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input type="password" required minLength={6} value={createForm.password} onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-green text-gray-900" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <select value={createForm.role} onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-green text-gray-900">
                    {CREATE_ROLE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select value={createForm.status} onChange={(e) => setCreateForm({ ...createForm, status: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-green text-gray-900">
                    {CREATE_STATUS_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <button type="button" onClick={() => setShowCreate(false)}
                  className="flex-1 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={createLoading}
                  className="flex-1 py-2.5 bg-brand-green text-white font-medium rounded-lg hover:bg-brand-green-dark disabled:opacity-60 transition-colors">
                  {createLoading ? "Creating…" : "Create User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Edit User</h2>
              <button onClick={() => setEditUser(null)} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              {editError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{editError}</div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First name</label>
                  <input required value={editForm.firstName} onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-green text-gray-900" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last name</label>
                  <input required value={editForm.lastName} onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-green text-gray-900" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" required value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-green text-gray-900" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone number</label>
                <input required value={editForm.phoneNumber} onChange={(e) => setEditForm({ ...editForm, phoneNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-green text-gray-900" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <select value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-green text-gray-900">
                    {CREATE_ROLE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-green text-gray-900">
                    {CREATE_STATUS_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <button type="button" onClick={() => setEditUser(null)}
                  className="flex-1 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={editLoading}
                  className="flex-1 py-2.5 bg-brand-green text-white font-medium rounded-lg hover:bg-brand-green-dark disabled:opacity-60 transition-colors">
                  {editLoading ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-500 font-medium">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded w-20 animate-pulse"></div></td>
                    ))}
                  </tr>
                ))
              ) : users && users.items.length > 0 ? (
                users.items.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{u.firstName} {u.lastName}</p>
                      <p className="text-xs text-gray-400">{u.id.slice(0, 8)}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{u.email}</td>
                    <td className="px-4 py-3 text-gray-600">{u.phoneNumber}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${roleBadge(u.role)}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusBadge(u.status)}`}>
                        {u.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEdit(u)}
                          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                        >
                          Edit
                        </button>
                        {u.status !== "Active" && (
                          <button
                            onClick={() => handleSetStatus(u, "Active")}
                            disabled={actionLoading === u.id}
                            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-green-50 text-green-700 hover:bg-green-100 disabled:opacity-50 transition-colors"
                          >
                            {actionLoading === u.id ? "…" : "Activate"}
                          </button>
                        )}
                        {u.status === "Active" && (
                          <>
                            <button
                              onClick={() => handleSetStatus(u, "Inactive")}
                              disabled={actionLoading === u.id}
                              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-50 text-gray-600 hover:bg-gray-100 disabled:opacity-50 transition-colors"
                            >
                              {actionLoading === u.id ? "…" : "Deactivate"}
                            </button>
                            <button
                              onClick={() => handleSetStatus(u, "Suspended")}
                              disabled={actionLoading === u.id}
                              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-50 transition-colors"
                            >
                              {actionLoading === u.id ? "…" : "Suspend"}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-400 text-sm">
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {users && users.totalCount > users.pageSize && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 text-sm">
            <p className="text-gray-500">
              Showing {((users.page - 1) * users.pageSize) + 1}–
              {Math.min(users.page * users.pageSize, users.totalCount)} of {users.totalCount}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => load(users.page - 1)}
                disabled={users.page <= 1}
                className="px-3 py-1 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                ← Prev
              </button>
              <button
                onClick={() => load(users.page + 1)}
                disabled={users.page * users.pageSize >= users.totalCount}
                className="px-3 py-1 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
