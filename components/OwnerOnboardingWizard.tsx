import React, { useState } from 'react';
import { dockerService } from '../services/dockerService';

interface OwnerOnboardingWizardProps {
    onComplete: (token: string, user: { id: string; username: string; role: string; isApproved: boolean }) => void;
}

export const OwnerOnboardingWizard: React.FC<OwnerOnboardingWizardProps> = ({ onComplete }) => {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    
    // Form data
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [organizationName, setOrganizationName] = useState('');
    const [adminEmail, setAdminEmail] = useState('');

    const handleNextStep = () => {
        if (step === 1) {
            if (!username.trim() || !password || !confirmPassword) {
                setError('All fields are required');
                return;
            }
            if (password !== confirmPassword) {
                setError('Passwords do not match');
                return;
            }
            if (password.length < 6) {
                setError('Password must be at least 6 characters long');
                return;
            }
        }
        
        setError('');
        setStep(step + 1);
    };

    const handlePrevStep = () => {
        setError('');
        setStep(step - 1);
    };

    const handleComplete = async () => {
        setLoading(true);
        setError('');

        try {
            const response = await dockerService.register(username, password);
            onComplete(response.token!, response.user);
        } catch (err: any) {
            setError(err.message || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
            <div className="max-w-2xl w-full">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="mb-6">
                        <img src="/Dockety Logo.svg" alt="Dockety Logo" className="h-16 w-auto mx-auto mb-4" />
                    </div>
                    <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">Welcome to Dockety!</h1>
                    <p className="text-lg text-gray-600 dark:text-gray-400">
                        Let's set up your Docker management platform
                    </p>
                </div>

                {/* Progress indicator */}
                <div className="mb-8">
                    <div className="flex items-center justify-center space-x-4">
                        <div className={`flex items-center justify-center w-8 h-8 rounded-full ${step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'}`}>
                            1
                        </div>
                        <div className={`h-1 w-16 ${step >= 2 ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
                        <div className={`flex items-center justify-center w-8 h-8 rounded-full ${step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'}`}>
                            2
                        </div>
                        <div className={`h-1 w-16 ${step >= 3 ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
                        <div className={`flex items-center justify-center w-8 h-8 rounded-full ${step >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'}`}>
                            3
                        </div>
                    </div>
                    <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mt-2">
                        <span>Account</span>
                        <span>Organization</span>
                        <span>Complete</span>
                    </div>
                </div>

                {/* Step Content */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8">
                    {step === 1 && (
                        <div className="space-y-6">
                            <div className="text-center mb-6">
                                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Create Your Admin Account</h2>
                                <p className="text-gray-600 dark:text-gray-400 mt-2">
                                    As the first user, you'll automatically become the owner with full administrative privileges.
                                </p>
                            </div>

                            <div>
                                <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Username
                                </label>
                                <input
                                    id="username"
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                    placeholder="Enter your username"
                                    required
                                />
                            </div>

                            <div>
                                <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Password
                                </label>
                                <input
                                    id="password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                    placeholder="Enter your password (min 6 characters)"
                                    required
                                />
                            </div>

                            <div>
                                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Confirm Password
                                </label>
                                <input
                                    id="confirmPassword"
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                    placeholder="Confirm your password"
                                    required
                                />
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-6">
                            <div className="text-center mb-6">
                                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Organization Details</h2>
                                <p className="text-gray-600 dark:text-gray-400 mt-2">
                                    Help us personalize your Dockety experience (optional).
                                </p>
                            </div>

                            <div>
                                <label htmlFor="organizationName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Organization Name
                                </label>
                                <input
                                    id="organizationName"
                                    type="text"
                                    value={organizationName}
                                    onChange={(e) => setOrganizationName(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                    placeholder="e.g., Acme Corp, DevOps Team"
                                />
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                    This will help identify your Docker hosts and containers
                                </p>
                            </div>

                            <div>
                                <label htmlFor="adminEmail" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Admin Email
                                </label>
                                <input
                                    id="adminEmail"
                                    type="email"
                                    value={adminEmail}
                                    onChange={(e) => setAdminEmail(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                    placeholder="admin@example.com"
                                />
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                    For notifications and system alerts (future feature)
                                </p>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="text-center space-y-6">
                            <div className="mb-6">
                                <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">You're All Set!</h2>
                                <p className="text-gray-600 dark:text-gray-400 mt-2">
                                    Ready to start managing your Docker containers with Dockety.
                                </p>
                            </div>

                            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg text-left">
                                <h3 className="font-medium text-blue-900 dark:text-blue-300 mb-2">What happens next?</h3>
                                <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-400">
                                    <li className="flex items-start">
                                        <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                                        You'll be automatically logged in as the owner
                                    </li>
                                    <li className="flex items-start">
                                        <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                                        Your local Docker host will be automatically configured
                                    </li>
                                    <li className="flex items-start">
                                        <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                                        You can add additional users and Docker hosts anytime
                                    </li>
                                    <li className="flex items-start">
                                        <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                                        Explore the dashboard to manage containers, images, and more
                                    </li>
                                </ul>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                            <p className="text-red-800 dark:text-red-400 text-sm">{error}</p>
                        </div>
                    )}

                    {/* Navigation buttons */}
                    <div className="flex justify-between mt-8">
                        <button
                            onClick={handlePrevStep}
                            disabled={step === 1 || loading}
                            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {step > 1 ? 'Back' : ''}
                        </button>
                        
                        <button
                            onClick={step === 3 ? handleComplete : handleNextStep}
                            disabled={loading}
                            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Creating Account...' : step === 3 ? 'Complete Setup' : 'Next'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};