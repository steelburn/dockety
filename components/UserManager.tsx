import React, { useState, useEffect, useCallback } from 'react';
import { dockerService } from '../services/dockerService';
import { User } from '../types';

interface UserManagerProps {
    currentUser: { id: string; username: string; role: string } | null;
    onPasswordChanged?: () => void;
}

export const UserManager: React.FC<UserManagerProps> = ({ currentUser, onPasswordChanged }) => {
    const [users, setUsers] = useState<User[]>([]);
    const [pendingUsers, setPendingUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showPasswordChange, setShowPasswordChange] = useState(false);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordError, setPasswordError] = useState<string | null>(null);
    const [changingPassword, setChangingPassword] = useState(false);
    const [showOwnershipTransfer, setShowOwnershipTransfer] = useState(false);
    const [selectedNewOwner, setSelectedNewOwner] = useState<string>('');

    const fetchUsers = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const [fetchedUsers, fetchedPendingUsers] = await Promise.all([
                dockerService.getUsers(),
                dockerService.getPendingUsers()
            ]);
            setUsers(fetchedUsers);
            setPendingUsers(fetchedPendingUsers);
        } catch (err: any) {
            setError(err.message || 'Failed to fetch users');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const handleDeleteUser = useCallback(async (userId: string, username: string) => {
        if (!window.confirm(`Are you sure you want to delete user "${username}"?`)) {
            return;
        }

        try {
            await dockerService.deleteUser(userId);
            setUsers(prev => prev.filter(u => u.id !== userId));
        } catch (err: any) {
            setError(err.message || 'Failed to delete user');
        }
    }, []);

    const handleApproveUser = useCallback(async (userId: string, username: string) => {
        try {
            await dockerService.approveUser(userId);
            setPendingUsers(prev => prev.filter(u => u.id !== userId));
            await fetchUsers(); // Refresh to get updated user list
        } catch (err: any) {
            setError(err.message || 'Failed to approve user');
        }
    }, [fetchUsers]);

    const handleRoleChange = useCallback(async (userId: string, newRole: 'admin' | 'user') => {
        try {
            await dockerService.updateUserRole(userId, newRole);
            await fetchUsers(); // Refresh to get updated roles
        } catch (err: any) {
            setError(err.message || 'Failed to update user role');
        }
    }, [fetchUsers]);

    const handleOwnershipTransfer = useCallback(async () => {
        if (!selectedNewOwner) {
            setError('Please select a new owner');
            return;
        }

        if (!window.confirm('Are you sure you want to transfer ownership? You will become an admin.')) {
            return;
        }

        try {
            await dockerService.transferOwnership(selectedNewOwner);
            setShowOwnershipTransfer(false);
            setSelectedNewOwner('');
            await fetchUsers(); // Refresh to get updated roles
            // Note: currentUser will be updated by parent component
        } catch (err: any) {
            setError(err.message || 'Failed to transfer ownership');
        }
    }, [selectedNewOwner, fetchUsers]);

    const handleChangePassword = useCallback(async () => {
        if (newPassword !== confirmPassword) {
            setPasswordError('New passwords do not match');
            return;
        }

        if (newPassword.length < 6) {
            setPasswordError('New password must be at least 6 characters long');
            return;
        }

        try {
            setChangingPassword(true);
            setPasswordError(null);
            await dockerService.changePassword(currentPassword, newPassword);
            setShowPasswordChange(false);
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            onPasswordChanged?.();
            alert('Password changed successfully');
        } catch (err: any) {
            setPasswordError(err.message || 'Failed to change password');
        } finally {
            setChangingPassword(false);
        }
    }, [currentPassword, newPassword, confirmPassword, onPasswordChanged]);

    if (loading) {
        return (
            <div className="flex justify-center items-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {error && (
                <div className="bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-400 px-4 py-3 rounded">
                    {error}
                </div>
            )}

            {/* Password Change Section */}
            <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">Change Password</h3>
                    <button
                        onClick={() => setShowPasswordChange(!showPasswordChange)}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm font-medium"
                    >
                        {showPasswordChange ? 'Cancel' : 'Change Password'}
                    </button>
                </div>

                {showPasswordChange && (
                    <div className="space-y-4">
                        {passwordError && (
                            <div className="text-red-600 dark:text-red-400 text-sm">{passwordError}</div>
                        )}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Current Password
                            </label>
                            <input
                                type="password"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                placeholder="Enter current password"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                New Password
                            </label>
                            <input
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                placeholder="Enter new password"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Confirm New Password
                            </label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                placeholder="Confirm new password"
                            />
                        </div>
                        <div className="flex space-x-2">
                            <button
                                onClick={handleChangePassword}
                                disabled={changingPassword}
                                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {changingPassword ? 'Changing...' : 'Change Password'}
                            </button>
                            <button
                                onClick={() => {
                                    setShowPasswordChange(false);
                                    setCurrentPassword('');
                                    setNewPassword('');
                                    setConfirmPassword('');
                                    setPasswordError(null);
                                }}
                                className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-400 dark:hover:bg-gray-500"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Ownership Transfer Section (Only for owner) */}
            {currentUser?.role === 'owner' && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white">Transfer Ownership</h3>
                        <button
                            onClick={() => setShowOwnershipTransfer(!showOwnershipTransfer)}
                            className="text-yellow-600 dark:text-yellow-400 hover:text-yellow-800 dark:hover:text-yellow-300 text-sm font-medium"
                        >
                            {showOwnershipTransfer ? 'Cancel' : 'Transfer Ownership'}
                        </button>
                    </div>

                    {showOwnershipTransfer && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Select New Owner
                                </label>
                                <select
                                    value={selectedNewOwner}
                                    onChange={(e) => setSelectedNewOwner(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-yellow-500 focus:border-yellow-500 dark:bg-gray-700 dark:text-white"
                                >
                                    <option value="">Choose a user...</option>
                                    {users
                                        .filter(u => u.id !== currentUser.id && u.isApproved)
                                        .map(user => (
                                            <option key={user.id} value={user.id}>
                                                {user.username} ({user.role})
                                            </option>
                                        ))}
                                </select>
                            </div>
                            <div className="flex space-x-2">
                                <button
                                    onClick={handleOwnershipTransfer}
                                    className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700"
                                >
                                    Transfer Ownership
                                </button>
                                <button
                                    onClick={() => {
                                        setShowOwnershipTransfer(false);
                                        setSelectedNewOwner('');
                                    }}
                                    className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-400 dark:hover:bg-gray-500"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Pending Users Section */}
            {pendingUsers.length > 0 && (
                <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Pending Approvals ({pendingUsers.length})</h3>
                    <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md">
                        <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                            {pendingUsers.map((user) => (
                                <li key={user.id} className="px-6 py-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center">
                                            <div>
                                                <p className="text-sm font-medium text-gray-900 dark:text-white">
                                                    {user.username}
                                                </p>
                                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                                    Created: {new Date(user.createdAt).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <button
                                                onClick={() => handleApproveUser(user.id, user.username)}
                                                className="px-3 py-1 text-sm text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 font-medium"
                                            >
                                                Approve
                                            </button>
                                            <button
                                                onClick={() => handleDeleteUser(user.id, user.username)}
                                                className="px-3 py-1 text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 font-medium"
                                            >
                                                Reject
                                            </button>
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}

            {/* Approved Users List */}
            <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Users ({users.length})</h3>
                <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md">
                    <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                        {users.map((user) => (
                            <li key={user.id} className="px-6 py-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center">
                                        <div>
                                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                                                {user.username}
                                                {currentUser && user.id === currentUser.id && (
                                                    <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                                                        You
                                                    </span>
                                                )}
                                            </p>
                                            <div className="flex items-center space-x-2">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                    user.role === 'owner' ? 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200' :
                                                    user.role === 'admin' ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' :
                                                    'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                                                }`}>
                                                    {user.role}
                                                </span>
                                                {!user.isApproved && (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200">
                                                        Pending
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                                Created: {new Date(user.createdAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        {/* Role management - only for admin/owner, not for themselves or owner */}
                                        {currentUser && currentUser.role !== 'user' && user.id !== currentUser.id && user.role !== 'owner' && (
                                            <select
                                                value={user.role}
                                                onChange={(e) => handleRoleChange(user.id, e.target.value as 'admin' | 'user')}
                                                className="text-xs px-2 py-1 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white"
                                                disabled={currentUser.role === 'admin' && user.role === 'admin'} // Admins can't change other admins
                                            >
                                                <option value="user">User</option>
                                                {currentUser.role === 'owner' && <option value="admin">Admin</option>}
                                            </select>
                                        )}
                                        {/* Delete button - only for admin/owner, not for themselves or owner */}
                                        {currentUser && currentUser.role !== 'user' && user.id !== currentUser.id && user.role !== 'owner' && (
                                            <button
                                                onClick={() => handleDeleteUser(user.id, user.username)}
                                                className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 text-sm font-medium"
                                            >
                                                Delete
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
};