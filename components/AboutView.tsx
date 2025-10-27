import React from 'react';

export const AboutView: React.FC = () => {
    return (
        <div className="p-4 md:p-6 space-y-6">
            <div className="text-center">
                <img src="/logo.svg" alt="Dockety Logo" className="h-16 w-auto mx-auto mb-4" />
                <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">Dockety</h1>
                <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">Docker Container Management Made Easy</p>
            </div>

            <div className="max-w-4xl mx-auto space-y-8">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
                    <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">What is Dockety?</h2>
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                        Dockety is a modern, user-friendly web interface for managing Docker containers, images, volumes, networks, and hosts.
                        Built with React and Node.js, it provides a clean and intuitive way to interact with Docker daemons locally or remotely,
                        making container management accessible to developers and system administrators alike.
                    </p>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
                    <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">Key Features</h2>
                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-3">
                            <div className="flex items-start space-x-3">
                                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                                <div>
                                    <h3 className="font-medium text-gray-900 dark:text-white">Multi-Host Support</h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">Connect to multiple Docker hosts simultaneously</p>
                                </div>
                            </div>
                            <div className="flex items-start space-x-3">
                                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                                <div>
                                    <h3 className="font-medium text-gray-900 dark:text-white">Container Management</h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">Start, stop, restart, and monitor containers</p>
                                </div>
                            </div>
                            <div className="flex items-start space-x-3">
                                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                                <div>
                                    <h3 className="font-medium text-gray-900 dark:text-white">Image Management</h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">Pull, inspect, and manage Docker images</p>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-3">
                            <div className="flex items-start space-x-3">
                                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                                <div>
                                    <h3 className="font-medium text-gray-900 dark:text-white">Volume & Network Management</h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">Manage volumes and networks with ease</p>
                                </div>
                            </div>
                            <div className="flex items-start space-x-3">
                                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                                <div>
                                    <h3 className="font-medium text-gray-900 dark:text-white">Docker Compose Support</h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">Work with Docker Compose projects</p>
                                </div>
                            </div>
                            <div className="flex items-start space-x-3">
                                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                                <div>
                                    <h3 className="font-medium text-gray-900 dark:text-white">System Monitoring</h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">Monitor Docker system resources and statistics</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
                    <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">Technology Stack</h2>
                    <div className="grid md:grid-cols-2 gap-6">
                        <div>
                            <h3 className="font-medium text-gray-900 dark:text-white mb-2">Frontend</h3>
                            <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                                <li>• React 19 with TypeScript</li>
                                <li>• Vite build system</li>
                                <li>• Tailwind CSS for styling</li>
                                <li>• Dockerode client library</li>
                            </ul>
                        </div>
                        <div>
                            <h3 className="font-medium text-gray-900 dark:text-white mb-2">Backend</h3>
                            <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                                <li>• Node.js with Express</li>
                                <li>• SQLite database</li>
                                <li>• JWT authentication</li>
                                <li>• Docker Socket Proxy support</li>
                            </ul>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
                    <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">Links & Resources</h2>
                    <div className="grid md:grid-cols-2 gap-4">
                        <a
                            href="https://github.com/steelburn/dockety"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                        >
                            <svg className="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                            </svg>
                            <div>
                                <div className="font-medium text-gray-900 dark:text-white">GitHub Repository</div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">View source code and contribute</div>
                            </div>
                        </a>
                        <a
                            href="https://docs.docker.com/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                        >
                            <svg className="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M13.983 9.152h-.68c-.229 0-.413.183-.413.408v1.278c0 .228.184.414.413.414h.68c.226 0 .41-.186.41-.414V9.56c0-.225-.184-.408-.41-.408zm-2.047 0h-.68c-.229 0-.413.183-.413.408v1.278c0 .228.184.414.413.414h.68c.226 0 .41-.186.41-.414V9.56c0-.225-.184-.408-.41-.408zm-2.046 0h-.68c-.229 0-.413.183-.413.408v1.278c0 .228.184.414.413.414h.68c.226 0 .41-.186.41-.414V9.56c0-.225-.184-.408-.41-.408z" />
                                <path d="M23.991 12.004c0-6.617-5.383-11.999-12-11.999S-.009 5.387-.009 12.004c0 5.322 3.46 9.802 8.208 11.306.599.111.82-.261.82-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386z" />
                            </svg>
                            <div>
                                <div className="font-medium text-gray-900 dark:text-white">Docker Documentation</div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">Learn more about Docker</div>
                            </div>
                        </a>
                    </div>
                </div>

                <div className="text-center text-gray-500 dark:text-gray-400 text-sm">
                    <p>Dockety is an open-source project. Built with ❤️ for the Docker community.</p>
                </div>
            </div>
        </div>
    );
};