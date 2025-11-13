'use client';

import { useState, useEffect } from 'react';
import { X, Users, Lock, Plus, Trash2, Key } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ProfileSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userRole?: string;
  userName?: string;
  userEmail?: string;
}

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  phone?: string;
}

export default function ProfileSettingsModal({
  isOpen,
  onClose,
  userRole,
  userName,
  userEmail,
}: ProfileSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'profile' | 'password' | 'users'>('profile');
  const [users, setUsers] = useState<User[]>([]);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState('WORKER');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  
  // Profile update state
  const [userPhone, setUserPhone] = useState('');
  
  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState('');

  // Only CEO can manage users
  const isAdmin = userRole === 'CEO';

  // Fetch all users
  useEffect(() => {
    if (isAdmin && activeTab === 'users') {
      fetchUsers();
    }
  }, [activeTab, isAdmin]);

  // Load current user's phone number when Profile tab opens
  useEffect(() => {
    if (activeTab === 'profile' && userEmail) {
      fetchCurrentUserPhone();
    }
  }, [activeTab, userEmail]);

  const fetchCurrentUserPhone = async () => {
    try {
      // Fetch current user's phone from the update-phone endpoint (GET)
      const response = await fetch('/api/auth/update-phone');
      if (response.ok) {
        const data = await response.json();
        if (data.user && data.user.phone) {
          setUserPhone(data.user.phone);
        }
      }
    } catch (error) {
      console.error('Error fetching current user phone:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/auth/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  // Helper function to format phone number with +91 prefix
  const formatPhoneNumber = (phone: string): string => {
    // Remove all non-digit characters
    const digits = phone.replace(/\D/g, '');
    
    // If empty, return as is
    if (!digits) return '';
    
    // If already starts with 91 and has 12 digits, return as +91...
    if (digits.startsWith('91') && digits.length === 12) {
      return `+${digits}`;
    }
    
    // If starts with 0 and has 11 digits, remove leading 0 and add +91
    if (digits.startsWith('0') && digits.length === 11) {
      return `+91${digits.substring(1)}`;
    }
    
    // If has 10 digits (typical Indian mobile number), add +91 prefix
    if (digits.length === 10) {
      return `+91${digits}`;
    }
    
    // If already has +91 or starts with other country code, return as is
    if (phone.startsWith('+')) {
      return phone;
    }
    
    // Default: assume it's a 10-digit Indian number and add +91
    return digits.length === 10 ? `+91${digits}` : phone;
  };

  const handleUpdatePhone = async () => {
    const formattedPhone = formatPhoneNumber(userPhone);
    console.log('[ProfileSettings] Saving phone number:', formattedPhone, '(original:', userPhone, ')');
    
    try {
      const response = await fetch('/api/auth/update-phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: formattedPhone }),
      });

      const data = await response.json();
      console.log('[ProfileSettings] Update phone response:', data);

      if (response.ok) {
        setMessage('Phone number updated successfully');
        // Update the displayed phone number to show the formatted version
        setUserPhone(formattedPhone);
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage(data.error || 'Failed to update phone number');
      }
    } catch (error) {
      console.error('[ProfileSettings] Update phone error:', error);
      setMessage('Error updating phone number');
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserEmail || !newUserPassword) {
      setMessage('Email and password are required');
      return;
    }

    setLoading(true);
    try {
      const formattedPhone = newUserPhone ? formatPhoneNumber(newUserPhone) : undefined;
      
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newUserEmail,
          password: newUserPassword,
          role: newUserRole,
          name: newUserEmail.split('@')[0],
          phone: formattedPhone,
        }),
      });

      if (response.ok) {
        setMessage('User created successfully');
        setNewUserEmail('');
        setNewUserPassword('');
        setNewUserRole('WORKER');
        setNewUserPhone('');
        fetchUsers();
        setTimeout(() => setMessage(''), 3000);
      } else {
        const error = await response.json();
        setMessage(error.error || 'Failed to create user');
      }
    } catch (error) {
      setMessage('Error creating user');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;

    try {
      const response = await fetch(`/api/auth/users/${userId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setMessage('User deleted successfully');
        fetchUsers();
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage('Failed to delete user');
      }
    } catch (error) {
      setMessage('Error deleting user');
    }
  };

  const handleUpdateRole = async (userId: string, newRole: string) => {
    try {
      const response = await fetch(`/api/auth/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });

      if (response.ok) {
        setMessage('Role updated successfully');
        fetchUsers();
        setTimeout(() => setMessage(''), 3000);
      } else {
        const error = await response.json();
        setMessage(error.error || 'Failed to update role');
      }
    } catch (error) {
      setMessage('Error updating role');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordMessage('All fields are required');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordMessage('New passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordMessage('New password must be at least 6 characters');
      return;
    }

    if (newPassword === currentPassword) {
      setPasswordMessage('New password must be different from current password');
      return;
    }

    setPasswordLoading(true);
    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      if (response.ok) {
        setPasswordMessage('Password changed successfully');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => setPasswordMessage(''), 3000);
      } else {
        const error = await response.json();
        setPasswordMessage(error.error || 'Failed to change password');
      }
    } catch (error) {
      setPasswordMessage('Error changing password');
    } finally {
      setPasswordLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between bg-gradient-to-r from-blue-600 to-blue-800 text-white px-4 sm:px-6 py-3 sm:py-4">
          <h2 className="text-xl sm:text-2xl font-bold">Settings</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/20 rounded transition-colors"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 overflow-x-auto">
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-3 sm:px-6 py-3 sm:py-4 font-medium transition-colors whitespace-nowrap text-sm sm:text-base ${
              activeTab === 'profile'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Lock className="w-3 h-3 sm:w-4 sm:h-4" />
              <span>Profile</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('password')}
            className={`px-3 sm:px-6 py-3 sm:py-4 font-medium transition-colors whitespace-nowrap text-sm sm:text-base ${
              activeTab === 'password'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Key className="w-3 h-3 sm:w-4 sm:h-4" />
              <span>Change Password</span>
            </div>
          </button>
          {isAdmin && (
            <button
              onClick={() => setActiveTab('users')}
              className={`px-3 sm:px-6 py-3 sm:py-4 font-medium transition-colors whitespace-nowrap text-sm sm:text-base ${
                activeTab === 'users'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Users className="w-3 h-3 sm:w-4 sm:h-4" />
                <span>User Management</span>
              </div>
            </button>
          )}
        </div>

        {/* Content */}
        <div className="overflow-y-auto" style={{ maxHeight: 'calc(90vh - 140px)' }}>
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
              {message && (
                <div className={`p-4 rounded-lg text-sm ${
                  message.includes('successfully')
                    ? 'bg-green-50 border border-green-200 text-green-800'
                    : 'bg-red-50 border border-red-200 text-red-800'
                }`}>
                  {message}
                </div>
              )}
              <div>
                <Label className="text-gray-700 font-semibold">Name</Label>
                <p className="mt-2 text-gray-900">{userName}</p>
              </div>
              <div>
                <Label className="text-gray-700 font-semibold">Email</Label>
                <p className="mt-2 text-gray-900">{userEmail}</p>
              </div>
              <div>
                <Label className="text-gray-700 font-semibold">Role</Label>
                <p className="mt-2 text-gray-900 font-medium">
                  <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                    {userRole}
                  </span>
                </p>
              </div>
              <div>
                <Label htmlFor="phone" className="text-gray-700 font-semibold">
                  Phone Number
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  value={userPhone}
                  onChange={(e) => setUserPhone(e.target.value)}
                  placeholder="9853012345 or +919853012345"
                  className="mt-2 text-gray-900 bg-white"
                />
                <p className="mt-2 text-xs text-gray-600">
                  Used for login and account security (prefix +91 will be added automatically)
                </p>
                <div className="flex gap-2 mt-3">
                  <Button
                    onClick={handleUpdatePhone}
                    size="sm"
                  >
                    Save Phone Number
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Change Password Tab */}
          {activeTab === 'password' && (
            <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
              {passwordMessage && (
                <div className={`p-4 rounded-lg text-sm ${
                  passwordMessage.includes('successfully')
                    ? 'bg-green-50 border border-green-200 text-green-800'
                    : 'bg-red-50 border border-red-200 text-red-800'
                }`}>
                  {passwordMessage}
                </div>
              )}
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <Label htmlFor="currentPassword" className="text-gray-700">
                    Current Password
                  </Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter your current password"
                    className="mt-1 text-gray-900 bg-white"
                  />
                </div>
                <div>
                  <Label htmlFor="newPassword" className="text-gray-700">
                    New Password
                  </Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter your new password (min 6 characters)"
                    className="mt-1 text-gray-900 bg-white"
                  />
                </div>
                <div>
                  <Label htmlFor="confirmPassword" className="text-gray-700">
                    Confirm New Password
                  </Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm your new password"
                    className="mt-1 text-gray-900 bg-white"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={passwordLoading}
                  className="w-full bg-blue-600 text-white hover:bg-blue-700"
                >
                  {passwordLoading ? 'Changing...' : 'Change Password'}
                </Button>
              </form>
            </div>
          )}

          {/* User Management Tab */}
          {activeTab === 'users' && isAdmin && (
            <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
              {/* Message */}
              {message && (
                <div className={`p-4 rounded-lg text-sm ${
                  message.includes('successfully')
                    ? 'bg-green-50 border border-green-200 text-green-800'
                    : 'bg-red-50 border border-red-200 text-red-800'
                }`}>
                  {message}
                </div>
              )}

              {/* Create User Form */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Plus className="w-5 h-5 text-blue-600" />
                  Create New User
                </h3>
                <form onSubmit={handleCreateUser} className="space-y-4">
                  <div>
                    <Label htmlFor="email" className="text-gray-700">
                      Email Address
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                      placeholder="user@example.com"
                      className="mt-1 text-gray-900 bg-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="password" className="text-gray-700">
                      Password
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      value={newUserPassword}
                      onChange={(e) => setNewUserPassword(e.target.value)}
                      placeholder="Password"
                      className="mt-1 text-gray-900 bg-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="role" className="text-gray-700">
                      Role
                    </Label>
                    <select
                      id="role"
                      value={newUserRole}
                      onChange={(e) => setNewUserRole(e.target.value)}
                      className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-gray-900 font-medium bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="WORKER">Worker</option>
                      <option value="MANAGER">Manager</option>
                    </select>
                  </div>
                                     <div>
                     <Label htmlFor="phone" className="text-gray-700">
                       Phone Number (Optional)
                     </Label>
                     <Input
                       id="phone"
                       type="tel"
                       value={newUserPhone}
                       onChange={(e) => setNewUserPhone(e.target.value)}
                       placeholder="9853012345 or +919853012345"
                       className="mt-1 text-gray-900 bg-white"
                     />
                     <p className="mt-1 text-xs text-gray-500">
                       10-digit number (+91 will be added automatically)
                     </p>
                   </div>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-600 text-white hover:bg-blue-700"
                  >
                    {loading ? 'Creating...' : 'Create User'}
                  </Button>
                </form>
              </div>

              {/* Users List */}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                  <h3 className="font-semibold text-gray-900">All Users</h3>
                </div>
                <div className="divide-y divide-gray-200">
                  {users.length === 0 ? (
                    <div className="px-4 py-6 text-center text-gray-500">
                      No users found
                    </div>
                  ) : (
                    users.map((user) => (
                      <div
                        key={user.id}
                        className="px-4 py-4 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 truncate">{user.name}</p>
                            <p className="text-sm text-gray-600 truncate">{user.email}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <select
                              value={user.role}
                              onChange={(e) => handleUpdateRole(user.id, e.target.value)}
                              disabled={user.email === userEmail || user.role === 'CEO'}
                              className="px-2 sm:px-3 py-1 border border-gray-300 rounded text-xs sm:text-sm text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:opacity-50 disabled:cursor-not-allowed flex-1 sm:flex-none min-w-[100px] sm:min-w-0"
                              title={user.email === userEmail ? "Cannot change your own role" : user.role === 'CEO' ? "Cannot change CEO role" : ""}
                            >
                              <option value="CEO" disabled>CEO</option>
                              <option value="MANAGER">Manager</option>
                              <option value="WORKER">Worker</option>
                            </select>
                            <button
                              onClick={() => handleDeleteUser(user.id)}
                              disabled={user.email === userEmail || user.role === 'CEO'}
                              className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                              title={user.email === userEmail ? "Cannot delete your own account" : user.role === 'CEO' ? "Cannot delete CEO account" : "Delete user"}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
