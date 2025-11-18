'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button, Input } from '@/components/ui';

interface KnowledgeDocument {
  id: string;
  title: string;
  content: string;
  document_type: string;
  metadata?: Record<string, any>;
  agent_id?: string;
  created_at: string;
  updated_at: string;
}

interface Agent {
  id: string;
  name: string;
}

interface GoogleDoc {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  webViewLink: string;
}

interface GoogleStatus {
  connected: boolean;
  google_email?: string;
}

export default function KnowledgeBasePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<KnowledgeDocument | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Google Docs integration state
  const [googleStatus, setGoogleStatus] = useState<GoogleStatus>({ connected: false });
  const [showGoogleDocsModal, setShowGoogleDocsModal] = useState(false);
  const [googleDocs, setGoogleDocs] = useState<GoogleDoc[]>([]);
  const [loadingGoogleDocs, setLoadingGoogleDocs] = useState(false);
  const [importingDocId, setImportingDocId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    document_type: 'text',
    agent_id: '',
    metadata: {}
  });

  // Fetch documents and agents
  useEffect(() => {
    fetchDocuments();
    fetchAgents();
    checkGoogleStatus();

    // Check for OAuth success/error in URL
    const params = new URLSearchParams(window.location.search);
    if (params.get('google_connected') === 'true') {
      setSuccess('Google account connected successfully!');
      checkGoogleStatus();
      window.history.replaceState({}, '', window.location.pathname);
    } else if (params.get('error')) {
      setError(`Google connection error: ${params.get('error')}`);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/knowledge');
      const data = await response.json();

      if (data.success) {
        setDocuments(data.documents || []);
      } else {
        setError('Failed to fetch documents');
      }
    } catch (err) {
      setError('Error loading documents');
      console.error('Fetch documents error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAgents = async () => {
    try {
      const response = await fetch('/api/agents');
      const data = await response.json();

      if (data.success) {
        setAgents(data.agents || []);
      }
    } catch (err) {
      console.error('Fetch agents error:', err);
    }
  };

  const checkGoogleStatus = async () => {
    try {
      const response = await fetch('/api/google/oauth/status');
      const data = await response.json();

      if (data.success) {
        setGoogleStatus({
          connected: data.connected,
          google_email: data.google_email
        });
      }
    } catch (err) {
      console.error('Check Google status error:', err);
    }
  };

  const handleConnectGoogle = () => {
    window.location.href = '/api/google/oauth/authorize';
  };

  const handleDisconnectGoogle = async () => {
    if (!confirm('Are you sure you want to disconnect your Google account?')) {
      return;
    }

    try {
      const response = await fetch('/api/google/oauth/disconnect', {
        method: 'POST'
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Google account disconnected successfully');
        setGoogleStatus({ connected: false });
      } else {
        setError(data.error || 'Failed to disconnect Google account');
      }
    } catch (err) {
      setError('Error disconnecting Google account');
      console.error('Disconnect Google error:', err);
    }
  };

  const fetchGoogleDocs = async () => {
    try {
      setLoadingGoogleDocs(true);
      const response = await fetch('/api/google/docs');
      const data = await response.json();

      if (data.success) {
        setGoogleDocs(data.files || []);
      } else {
        setError(data.error || 'Failed to fetch Google Docs');
      }
    } catch (err) {
      setError('Error fetching Google Docs');
      console.error('Fetch Google Docs error:', err);
    } finally {
      setLoadingGoogleDocs(false);
    }
  };

  const handleImportGoogleDoc = async (docId: string, docName: string) => {
    try {
      setImportingDocId(docId);
      const response = await fetch('/api/google/docs/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document_id: docId,
          agent_id: formData.agent_id || undefined
        })
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(`Document "${docName}" imported successfully!`);
        setShowGoogleDocsModal(false);
        fetchDocuments();
      } else {
        setError(data.error || 'Failed to import document');
      }
    } catch (err) {
      setError('Error importing document');
      console.error('Import Google Doc error:', err);
    } finally {
      setImportingDocId(null);
    }
  };

  const openGoogleDocsModal = () => {
    if (!googleStatus.connected) {
      setError('Please connect your Google account first');
      return;
    }
    setShowGoogleDocsModal(true);
    fetchGoogleDocs();
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/knowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          agent_id: formData.agent_id || undefined
        })
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Document uploaded successfully!');
        setShowUploadModal(false);
        setFormData({ title: '', content: '', document_type: 'text', agent_id: '', metadata: {} });
        fetchDocuments();
      } else {
        setError(data.error || 'Failed to upload document');
      }
    } catch (err) {
      setError('Error uploading document');
      console.error('Upload error:', err);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDocument) return;

    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/knowledge/${selectedDocument.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          agent_id: formData.agent_id || null
        })
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Document updated successfully!');
        setShowEditModal(false);
        setSelectedDocument(null);
        fetchDocuments();
      } else {
        setError(data.error || 'Failed to update document');
      }
    } catch (err) {
      setError('Error updating document');
      console.error('Update error:', err);
    }
  };

  const handleDelete = async () => {
    if (!selectedDocument) return;

    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/knowledge/${selectedDocument.id}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Document deleted successfully!');
        setShowDeleteModal(false);
        setSelectedDocument(null);
        fetchDocuments();
      } else {
        setError(data.error || 'Failed to delete document');
      }
    } catch (err) {
      setError('Error deleting document');
      console.error('Delete error:', err);
    }
  };

  const openEditModal = (doc: KnowledgeDocument) => {
    setSelectedDocument(doc);
    setFormData({
      title: doc.title,
      content: doc.content,
      document_type: doc.document_type,
      agent_id: doc.agent_id || '',
      metadata: doc.metadata || {}
    });
    setShowEditModal(true);
  };

  const openDeleteModal = (doc: KnowledgeDocument) => {
    setSelectedDocument(doc);
    setShowDeleteModal(true);
  };

  const filteredDocuments = documents.filter((doc) =>
    doc.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Error/Success Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-900 px-4 py-3 rounded-lg flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-900 hover:text-red-700">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-900 px-4 py-3 rounded-lg flex items-center justify-between">
          <span>{success}</span>
          <button onClick={() => setSuccess(null)} className="text-green-900 hover:text-green-700">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Knowledge Base</h1>
          <p className="text-gray-900 mt-1">Manage documents and resources for your AI agent</p>
          {googleStatus.connected && (
            <p className="text-sm text-green-900 mt-1">
              <svg className="w-4 h-4 inline mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Connected to Google: {googleStatus.google_email}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {googleStatus.connected ? (
            <>
              <Button variant="outline" onClick={openGoogleDocsModal}>
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                Import from Google Docs
              </Button>
              <Button variant="outline" onClick={handleDisconnectGoogle}>
                Disconnect Google
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={handleConnectGoogle}>
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" />
              </svg>
              Connect Google
            </Button>
          )}
          <Button onClick={() => setShowUploadModal(true)}>
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Upload Document
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-900">Total Documents</p>
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900">{documents.length}</p>
            <p className="text-sm text-gray-900 mt-1">Across all categories</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-900">Document Types</p>
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-green-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900">{new Set(documents.map(d => d.document_type)).size}</p>
            <p className="text-sm text-gray-900 mt-1">Different formats</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-900">With Agents</p>
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900">{documents.filter(d => d.agent_id).length}</p>
            <p className="text-sm text-gray-900 mt-1">Assigned to agents</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-900">Last Updated</p>
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-orange-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900">
              {documents.length > 0 ? new Date(documents[0].updated_at).toLocaleDateString() : 'N/A'}
            </p>
            <p className="text-sm text-gray-900 mt-1">Most recent document</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <Card>
        <CardContent className="p-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button variant="outline">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              Filter
            </Button>
            <Button variant="outline">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
              </svg>
              Sort
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Documents List */}
      <Card>
        <CardHeader>
          <CardTitle>Documents</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-900">Document</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-900">Type</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-900">Agent</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-900">Last Modified</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-900">Status</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-gray-900">
                      Loading documents...
                    </td>
                  </tr>
                ) : filteredDocuments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-gray-900">
                      No documents found
                    </td>
                  </tr>
                ) : (
                  filteredDocuments.map((doc) => (
                    <tr key={doc.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center mr-3">
                            <svg className="w-4 h-4 text-blue-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                          <span className="text-sm font-medium text-gray-900">{doc.title}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-900">{doc.document_type}</td>
                      <td className="py-3 px-4 text-sm text-gray-900">
                        {doc.agent_id ? agents.find(a => a.id === doc.agent_id)?.name || 'Unknown' : 'All Agents'}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-900">
                        {new Date(doc.updated_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-900">
                          Active
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => {
                              setSelectedDocument(doc);
                              alert(`Title: ${doc.title}\n\nContent:\n${doc.content}`);
                            }}
                            className="text-blue-900 hover:text-blue-700 text-sm font-medium"
                          >
                            View
                          </button>
                          <button
                            onClick={() => openEditModal(doc)}
                            className="text-gray-900 hover:text-gray-900 text-sm font-medium"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => openDeleteModal(doc)}
                            className="text-red-900 hover:text-red-700 text-sm font-medium"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Upload Document</CardTitle>
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="text-gray-900 hover:text-gray-700"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpload} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Title *
                  </label>
                  <Input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                    placeholder="Enter document title"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Content *
                  </label>
                  <textarea
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    required
                    placeholder="Enter document content"
                    rows={10}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Document Type *
                  </label>
                  <select
                    value={formData.document_type}
                    onChange={(e) => setFormData({ ...formData, document_type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="text">Text</option>
                    <option value="pdf">PDF</option>
                    <option value="doc">Document</option>
                    <option value="url">URL</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Assign to Agent (Optional)
                  </label>
                  <select
                    value={formData.agent_id}
                    onChange={(e) => setFormData({ ...formData, agent_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">All Agents</option>
                    {agents.map((agent) => (
                      <option key={agent.id} value={agent.id}>
                        {agent.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button type="submit" className="flex-1">
                    Upload Document
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowUploadModal(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedDocument && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Edit Document</CardTitle>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="text-gray-900 hover:text-gray-700"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleEdit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Title *
                  </label>
                  <Input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                    placeholder="Enter document title"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Content *
                  </label>
                  <textarea
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    required
                    placeholder="Enter document content"
                    rows={10}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Document Type *
                  </label>
                  <select
                    value={formData.document_type}
                    onChange={(e) => setFormData({ ...formData, document_type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="text">Text</option>
                    <option value="pdf">PDF</option>
                    <option value="doc">Document</option>
                    <option value="url">URL</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Assign to Agent (Optional)
                  </label>
                  <select
                    value={formData.agent_id}
                    onChange={(e) => setFormData({ ...formData, agent_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">All Agents</option>
                    {agents.map((agent) => (
                      <option key={agent.id} value={agent.id}>
                        {agent.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button type="submit" className="flex-1">
                    Save Changes
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowEditModal(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedDocument && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Delete Document</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-900 mb-6">
                Are you sure you want to delete &quot;{selectedDocument.title}&quot;? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <Button
                  onClick={handleDelete}
                  className="flex-1 bg-red-600 hover:bg-red-700"
                >
                  Delete
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Google Docs Import Modal */}
      {showGoogleDocsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-4xl max-h-[80vh] flex flex-col">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Import from Google Docs</CardTitle>
                <button
                  onClick={() => setShowGoogleDocsModal(false)}
                  className="text-gray-900 hover:text-gray-700"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto">
              {loadingGoogleDocs ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
              ) : googleDocs.length === 0 ? (
                <div className="text-center py-12">
                  <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-gray-900 text-lg">No Google Docs found</p>
                  <p className="text-gray-900 mt-2">Create some docs in Google Drive to import them here</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {googleDocs.map((doc) => (
                    <div
                      key={doc.id}
                      className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                            </svg>
                            <h3 className="text-lg font-medium text-gray-900">{doc.name}</h3>
                          </div>
                          <p className="text-sm text-gray-900 mt-1">
                            Last modified: {new Date(doc.modifiedTime).toLocaleDateString()}
                          </p>
                          <a
                            href={doc.webViewLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:underline mt-1 inline-block"
                          >
                            View in Google Docs
                          </a>
                        </div>
                        <Button
                          onClick={() => handleImportGoogleDoc(doc.id, doc.name)}
                          disabled={importingDocId === doc.id}
                          className="ml-4"
                        >
                          {importingDocId === doc.id ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              Importing...
                            </>
                          ) : (
                            <>
                              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                              </svg>
                              Import
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
