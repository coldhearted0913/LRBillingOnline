export default function DemoPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full bg-white rounded-2xl shadow-2xl p-8 md:p-12">
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            🚛 LR Billing System
          </h1>
          <p className="text-xl text-gray-600 mb-2">
            Production-Ready Web Application for Transport Billing Management
          </p>
          <div className="flex flex-wrap justify-center gap-2 mt-4">
            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
              Next.js 14
            </span>
            <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
              TypeScript
            </span>
            <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">
              PostgreSQL
            </span>
            <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm font-medium">
              AWS S3
            </span>
            <span className="px-3 py-1 bg-pink-100 text-pink-800 rounded-full text-sm font-medium">
              React Query
            </span>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6 my-8">
          <div className="bg-blue-50 p-6 rounded-lg">
            <h3 className="text-lg font-semibold mb-3 text-blue-900">
              ✨ Key Features
            </h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <li>✓ JWT Authentication with Role-Based Access</li>
              <li>✓ Real-time Dashboard & Analytics</li>
              <li>✓ Automated Excel Bill Generation</li>
              <li>✓ Batch Operations & Bulk Actions</li>
              <li>✓ AWS S3 Cloud Storage Integration</li>
              <li>✓ Responsive Mobile-First Design</li>
            </ul>
          </div>

          <div className="bg-green-50 p-6 rounded-lg">
            <h3 className="text-lg font-semibold mb-3 text-green-900">
              🚀 Performance
            </h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <li>✓ &lt;800ms First Contentful Paint</li>
              <li>✓ &lt;200ms API Response Times</li>
              <li>✓ Handles 10,000+ Records Smoothly</li>
              <li>✓ Optimized Database Queries</li>
              <li>✓ Smart Caching with React Query</li>
              <li>✓ 99.5% Uptime on Railway</li>
            </ul>
          </div>
        </div>

        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 my-6">
          <div className="flex items-start">
            <span className="text-2xl mr-3">🎭</span>
            <div>
              <p className="font-semibold text-yellow-900">Demo Mode Active</p>
              <p className="text-sm text-yellow-800">
                This is a demonstration with sample data. Use the credentials below to explore all features.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gray-900 text-white p-6 rounded-lg my-6">
          <h3 className="text-lg font-semibold mb-4">🔑 Demo Login Credentials</h3>
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-gray-400 mb-2">Admin (CEO Role)</p>
              <p className="font-mono">demo@test.com</p>
              <p className="font-mono">demo123</p>
            </div>
            <div>
              <p className="text-gray-400 mb-2">Manager Role</p>
              <p className="font-mono">manager@test.com</p>
              <p className="font-mono">demo123</p>
            </div>
            <div>
              <p className="text-gray-400 mb-2">Worker Role</p>
              <p className="font-mono">worker@test.com</p>
              <p className="font-mono">demo123</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mt-8">
          <a
            href="/login"
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-6 rounded-lg text-center transition-colors"
          >
            🚀 Launch Demo Application
          </a>
          <a
            href="https://github.com/coldhearted0913/LRBillingOnline"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 bg-gray-800 hover:bg-gray-900 text-white font-semibold py-4 px-6 rounded-lg text-center transition-colors"
          >
            📂 View Source Code
          </a>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200 text-center text-sm text-gray-600">
          <p>Built by Sunmeet Joshi | System Engineer at TCS</p>
          <p className="mt-2">
            <a href="mailto:sunmeetjoshi9@gmail.com" className="text-blue-600 hover:underline">
              Contact Me
            </a>
            {' | '}
            <a href="https://linkedin.com/in/sunmeet-joshi-a4b07a14b" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
              LinkedIn
            </a>
            {' | '}
            <a href="https://github.com/coldhearted0913" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
              GitHub
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
