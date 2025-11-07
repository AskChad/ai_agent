import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">AI Chat Agent</h1>
            </div>
            <nav className="flex items-center gap-4">
              <Link
                href="/auth/login"
                className="text-gray-900 hover:text-gray-900 font-medium"
              >
                Login
              </Link>
              <Link
                href="/auth/register"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
              >
                Get Started
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-5xl font-bold text-gray-900 mb-6">
            Intelligent AI Chat Agent for
            <span className="text-blue-900"> GoHighLevel</span>
          </h2>
          <p className="text-xl text-gray-900 mb-8 max-w-3xl mx-auto">
            Automate conversations across SMS, Email, WhatsApp, Facebook, Instagram, and Google Business.
            Powered by OpenAI and Anthropic AI with smart function calling.
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              href="/auth/register"
              className="px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold text-lg transition-colors shadow-lg hover:shadow-xl"
            >
              Start Free Trial
            </Link>
            <Link
              href="/dashboard"
              className="px-8 py-4 bg-white text-gray-900 rounded-lg hover:bg-gray-50 font-semibold text-lg transition-colors border-2 border-gray-200"
            >
              View Dashboard
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <h3 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Everything you need for AI-powered conversations
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="p-6 rounded-xl border border-gray-200 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <span className="text-2xl">💬</span>
              </div>
              <h4 className="text-xl font-semibold text-gray-900 mb-2">
                Multi-Channel Messaging
              </h4>
              <p className="text-gray-900">
                Send and receive messages across SMS, Email, WhatsApp, Facebook, Instagram, and Google Business.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-6 rounded-xl border border-gray-200 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <span className="text-2xl">🤖</span>
              </div>
              <h4 className="text-xl font-semibold text-gray-900 mb-2">
                Advanced AI Models
              </h4>
              <p className="text-gray-900">
                Powered by GPT-4 and Claude 3.5 with intelligent context management and natural conversations.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-6 rounded-xl border border-gray-200 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <span className="text-2xl">⚡</span>
              </div>
              <h4 className="text-xl font-semibold text-gray-900 mb-2">
                Function Calling
              </h4>
              <p className="text-gray-900">
                AI can execute custom functions, call APIs, query databases, and trigger webhooks automatically.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="p-6 rounded-xl border border-gray-200 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mb-4">
                <span className="text-2xl">📚</span>
              </div>
              <h4 className="text-xl font-semibold text-gray-900 mb-2">
                RAG Knowledge Base
              </h4>
              <p className="text-gray-900">
                Upload documents and let AI search and reference your knowledge base with semantic search.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="p-6 rounded-xl border border-gray-200 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-4">
                <span className="text-2xl">🔗</span>
              </div>
              <h4 className="text-xl font-semibold text-gray-900 mb-2">
                GoHighLevel Integration
              </h4>
              <p className="text-gray-900">
                Seamless OAuth integration with GHL marketplace for bi-directional message sync.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="p-6 rounded-xl border border-gray-200 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
                <span className="text-2xl">📊</span>
              </div>
              <h4 className="text-xl font-semibold text-gray-900 mb-2">
                Analytics & Insights
              </h4>
              <p className="text-gray-900">
                Track conversation metrics, function performance, and AI usage with detailed analytics.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Channel Support Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <h3 className="text-3xl font-bold text-gray-900 mb-8">
            Connect to all your channels
          </h3>
          <div className="flex flex-wrap justify-center gap-6 mb-12">
            <div className="px-6 py-4 bg-white rounded-lg shadow-md">
              <span className="text-3xl mr-2">💬</span>
              <span className="font-semibold">SMS</span>
            </div>
            <div className="px-6 py-4 bg-white rounded-lg shadow-md">
              <span className="text-3xl mr-2">📧</span>
              <span className="font-semibold">Email</span>
            </div>
            <div className="px-6 py-4 bg-white rounded-lg shadow-md">
              <span className="text-3xl mr-2">📱</span>
              <span className="font-semibold">WhatsApp</span>
            </div>
            <div className="px-6 py-4 bg-white rounded-lg shadow-md">
              <span className="text-3xl mr-2">👥</span>
              <span className="font-semibold">Facebook</span>
            </div>
            <div className="px-6 py-4 bg-white rounded-lg shadow-md">
              <span className="text-3xl mr-2">📷</span>
              <span className="font-semibold">Instagram</span>
            </div>
            <div className="px-6 py-4 bg-white rounded-lg shadow-md">
              <span className="text-3xl mr-2">🏢</span>
              <span className="font-semibold">Google Business</span>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h3 className="text-4xl font-bold mb-6">
            Ready to automate your conversations?
          </h3>
          <p className="text-xl mb-8 text-blue-100">
            Join businesses using AI to handle customer conversations intelligently.
          </p>
          <Link
            href="/auth/register"
            className="inline-block px-8 py-4 bg-white text-blue-900 rounded-lg hover:bg-gray-100 font-semibold text-lg transition-colors shadow-lg hover:shadow-xl"
          >
            Get Started Now
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-gray-900 mb-4">
            AI Chat Agent - Intelligent conversational AI for GoHighLevel
          </p>
          <div className="flex justify-center gap-6 text-sm text-gray-900">
            <Link href="/dashboard" className="hover:text-gray-300">Dashboard</Link>
            <Link href="/auth/login" className="hover:text-gray-300">Login</Link>
            <a href="https://github.com/AskChad/AI_Agent" target="_blank" rel="noopener noreferrer" className="hover:text-gray-300">GitHub</a>
          </div>
        </div>
      </footer>
    </main>
  );
}
