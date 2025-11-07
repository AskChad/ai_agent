'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent, Button, Input, Textarea, Select } from '@/components/ui';

const handlerTypes = [
  { value: 'internal', label: 'Internal - Built-in handler' },
  { value: 'webhook', label: 'Webhook - Trigger external webhook' },
  { value: 'api', label: 'API - Call external REST API' },
  { value: 'database', label: 'Database - Direct database query' },
];

export default function CreateFunctionPage() {
  const router = useRouter();
  const [handlerType, setHandlerType] = useState('internal');
  const [parameters, setParameters] = useState<Array<{ name: string; type: string; description: string; required: boolean }>>([]);

  const addParameter = () => {
    setParameters([...parameters, { name: '', type: 'string', description: '', required: false }]);
  };

  const removeParameter = (index: number) => {
    setParameters(parameters.filter((_, i) => i !== index));
  };

  const updateParameter = (index: number, field: string, value: any) => {
    const updated = [...parameters];
    updated[index] = { ...updated[index], [field]: value };
    setParameters(updated);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Create Function</h1>
          <p className="text-gray-600 mt-1">Define a new AI function for your agent</p>
        </div>
        <Button variant="ghost" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            label="Function Name"
            placeholder="e.g., get_contact_details"
            helperText="Use snake_case for function names"
            required
          />
          <Textarea
            label="Description"
            placeholder="Describe what this function does..."
            rows={3}
            helperText="This description helps the AI understand when to use this function"
            required
          />
          <Select
            label="Handler Type"
            options={handlerTypes}
            value={handlerType}
            onChange={(e) => setHandlerType(e.target.value)}
            helperText="Choose how this function will be executed"
            required
          />
        </CardContent>
      </Card>

      {/* Handler Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Handler Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {handlerType === 'internal' && (
            <Select
              label="Internal Handler"
              options={[
                { value: 'ghl.get_contact', label: 'GHL - Get Contact' },
                { value: 'ghl.create_opportunity', label: 'GHL - Create Opportunity' },
                { value: 'ghl.send_message', label: 'GHL - Send Message' },
                { value: 'ghl.update_tag', label: 'GHL - Update Tag' },
              ]}
              helperText="Select a pre-built internal handler"
              required
            />
          )}

          {handlerType === 'webhook' && (
            <>
              <Input
                label="Webhook URL"
                type="url"
                placeholder="https://api.example.com/webhook"
                helperText="The endpoint to POST function data to"
                required
              />
              <Select
                label="Authentication"
                options={[
                  { value: 'none', label: 'None' },
                  { value: 'bearer', label: 'Bearer Token' },
                  { value: 'api_key', label: 'API Key' },
                  { value: 'basic', label: 'Basic Auth' },
                ]}
              />
              <Input
                label="Timeout (ms)"
                type="number"
                placeholder="5000"
                helperText="Maximum time to wait for response"
              />
            </>
          )}

          {handlerType === 'api' && (
            <>
              <Input
                label="API Endpoint"
                type="url"
                placeholder="https://api.example.com/endpoint"
                required
              />
              <Select
                label="HTTP Method"
                options={[
                  { value: 'GET', label: 'GET' },
                  { value: 'POST', label: 'POST' },
                  { value: 'PUT', label: 'PUT' },
                  { value: 'DELETE', label: 'DELETE' },
                ]}
              />
              <Textarea
                label="Headers (JSON)"
                placeholder='{"Content-Type": "application/json"}'
                rows={4}
                helperText="Additional headers to send with the request"
              />
            </>
          )}

          {handlerType === 'database' && (
            <>
              <Textarea
                label="SQL Query"
                placeholder="SELECT * FROM orders WHERE customer_id = {{customer_id}}"
                rows={6}
                helperText="Use {{parameter_name}} for dynamic values"
                required
              />
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex">
                  <svg className="w-5 h-5 text-yellow-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-yellow-800">Security Warning</p>
                    <p className="text-sm text-yellow-700 mt-1">
                      Database functions execute with elevated privileges. Ensure your query is safe and only accesses allowed tables.
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Parameters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Parameters</CardTitle>
            <Button onClick={addParameter} size="sm">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Parameter
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {parameters.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No parameters defined yet.</p>
              <p className="text-sm mt-1">Click &quot;Add Parameter&quot; to define function inputs.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {parameters.map((param, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4 space-y-3">
                  <div className="flex items-start gap-4">
                    <div className="flex-1 grid grid-cols-2 gap-4">
                      <Input
                        label="Parameter Name"
                        value={param.name}
                        onChange={(e) => updateParameter(index, 'name', e.target.value)}
                        placeholder="e.g., contact_id"
                      />
                      <Select
                        label="Type"
                        value={param.type}
                        onChange={(e) => updateParameter(index, 'type', e.target.value)}
                        options={[
                          { value: 'string', label: 'String' },
                          { value: 'number', label: 'Number' },
                          { value: 'boolean', label: 'Boolean' },
                          { value: 'array', label: 'Array' },
                          { value: 'object', label: 'Object' },
                        ]}
                      />
                    </div>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => removeParameter(index)}
                      className="mt-7"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </Button>
                  </div>
                  <Textarea
                    label="Description"
                    value={param.description}
                    onChange={(e) => updateParameter(index, 'description', e.target.value)}
                    placeholder="Describe this parameter..."
                    rows={2}
                  />
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={param.required}
                      onChange={(e) => updateParameter(index, 'required', e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Required parameter</span>
                  </label>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-3 pb-8">
        <Button variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button variant="secondary">
          Save as Draft
        </Button>
        <Button>
          Create Function
        </Button>
      </div>
    </div>
  );
}
