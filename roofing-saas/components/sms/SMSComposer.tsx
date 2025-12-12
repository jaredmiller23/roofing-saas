/**
 * SMS Composer Component
 * Send SMS messages with template support and variable replacement
 */

'use client';

import { useState, useEffect } from 'react';
import { Send, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface SMSTemplate {
  id: string;
  name: string;
  content: string;
  variables: string[];
  description: string;
}

interface SMSComposerProps {
  contactId: string;
  contactPhone?: string;
  contactName?: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export default function SMSComposer({
  contactId,
  contactPhone,
  contactName,
  onSuccess,
  onError,
}: SMSComposerProps) {
  const [templates, setTemplates] = useState<SMSTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [message, setMessage] = useState('');
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [isSending, setIsSending] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [charCount, setCharCount] = useState(0);
  const [canSend, setCanSend] = useState(false);

  // Load templates on mount
  useEffect(() => {
    loadTemplates();
    checkSMSCapability();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contactId]);

  // Update character count
  useEffect(() => {
    setCharCount(message.length);
  }, [message]);

  async function loadTemplates() {
    try {
      const response = await fetch('/api/templates?type=sms');
      if (!response.ok) throw new Error('Failed to load templates');

      const data = await response.json();
      setTemplates(data.templates || []);
    } catch (error) {
      console.error('Failed to load SMS templates:', error);
    }
  }

  async function checkSMSCapability() {
    try {
      const response = await fetch(`/api/sms/send?contactId=${contactId}`);
      if (!response.ok) {
        setCanSend(false);
        setStatus('error');
        setStatusMessage('Cannot send SMS to this contact');
        return;
      }

      const data = await response.json();
      setCanSend(data.canSendSMS);

      if (!data.canSendSMS) {
        if (!data.hasPhone) {
          setStatusMessage('No phone number on file');
        } else if (!data.hasOptIn) {
          setStatusMessage('Contact has not opted in to SMS communications (TCPA compliance)');
        }
        setStatus('error');
      }
    } catch (error) {
      console.error('Failed to check SMS capability:', error);
      setCanSend(false);
    }
  }

  function handleTemplateSelect(templateId: string) {
    setSelectedTemplate(templateId);

    if (!templateId) {
      setMessage('');
      setVariables({});
      return;
    }

    const template = templates.find(t => t.id === templateId);
    if (!template) return;

    setMessage(template.content);

    // Initialize variables with default values
    const defaultVars: Record<string, string> = {};
    template.variables.forEach(variable => {
      if (variable === 'first_name' && contactName) {
        defaultVars[variable] = contactName.split(' ')[0];
      } else if (variable === 'company_name') {
        defaultVars[variable] = 'Demo Company'; // TODO: Get from tenant settings
      } else if (variable === 'phone_number') {
        defaultVars[variable] = contactPhone || '';
      } else {
        defaultVars[variable] = '';
      }
    });
    setVariables(defaultVars);
  }

  function replaceVariables(text: string): string {
    let result = text;
    Object.entries(variables).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`;
      result = result.replace(new RegExp(placeholder, 'g'), value || `[${key}]`);
    });
    return result;
  }

  async function handleSend() {
    if (!message.trim() || isSending || !canSend) return;

    setIsSending(true);
    setStatus('idle');

    try {
      const finalMessage = selectedTemplate ? replaceVariables(message) : message;

      const response = await fetch('/api/sms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: contactPhone,
          body: finalMessage,
          contactId,
          templateId: selectedTemplate || undefined,
          templateVariables: Object.keys(variables).length > 0 ? variables : undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send SMS');
      }

      setStatus('success');
      setStatusMessage('SMS sent successfully!');
      setMessage('');
      setSelectedTemplate('');
      setVariables({});
      onSuccess?.();

      // Clear success message after 3 seconds
      setTimeout(() => {
        setStatus('idle');
        setStatusMessage('');
      }, 3000);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send SMS';
      setStatus('error');
      setStatusMessage(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsSending(false);
    }
  }

  const currentTemplate = templates.find(t => t.id === selectedTemplate);
  const previewMessage = selectedTemplate ? replaceVariables(message) : message;
  const segmentCount = Math.ceil(charCount / 160);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Send SMS</CardTitle>
        <CardDescription>
          {contactPhone ? `Send text message to ${contactPhone}` : 'No phone number available'}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Template Selector */}
        <div>
          <label htmlFor="template" className="block text-sm font-medium text-muted-foreground mb-1">
            Use Template (Optional)
          </label>
          <select
            id="template"
            value={selectedTemplate}
            onChange={(e) => handleTemplateSelect(e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-md focus:ring-2 focus:ring-primary focus:border-primary"
            disabled={!canSend}
          >
            <option value="">Custom message (no template)</option>
            {templates.map(template => (
              <option key={template.id} value={template.id}>
                {template.name}
              </option>
            ))}
          </select>
          {currentTemplate && (
            <p className="text-xs text-muted-foreground mt-1">{currentTemplate.description}</p>
          )}
        </div>

        {/* Variable Inputs */}
        {currentTemplate && currentTemplate.variables.length > 0 && (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-muted-foreground">
              Fill in template variables:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {currentTemplate.variables.map(variable => (
                <div key={variable}>
                  <label htmlFor={variable} className="block text-xs font-medium text-muted-foreground mb-1">
                    {variable.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </label>
                  <input
                    id={variable}
                    type="text"
                    value={variables[variable] || ''}
                    onChange={(e) => setVariables({ ...variables, [variable]: e.target.value })}
                    className="w-full px-2 py-1.5 text-sm border border-border rounded focus:ring-2 focus:ring-primary focus:border-primary"
                    placeholder={`Enter ${variable}`}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Message Input */}
        <div>
          <label htmlFor="message" className="block text-sm font-medium text-muted-foreground mb-1">
            Message
          </label>
          <textarea
            id="message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your message here..."
            rows={4}
            className="w-full px-3 py-2 border border-border rounded-md focus:ring-2 focus:ring-primary focus:border-primary font-mono text-sm"
            disabled={!canSend || isSending}
            maxLength={1600}
          />
          <div className="flex justify-between items-center mt-1 text-xs text-muted-foreground">
            <span>{charCount} / 1600 characters</span>
            <span className={segmentCount > 1 ? 'text-orange-600 font-medium' : ''}>
              {segmentCount} SMS segment{segmentCount !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Preview */}
        {selectedTemplate && previewMessage !== message && (
          <div className="bg-muted border border-border rounded-md p-3">
            <label className="block text-xs font-medium text-muted-foreground mb-2">Preview:</label>
            <p className="text-sm text-foreground whitespace-pre-wrap">{previewMessage}</p>
          </div>
        )}

        {/* Status Messages */}
        {status === 'success' && (
          <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-800 rounded-md p-3">
            <CheckCircle className="w-5 h-5" />
            <span className="text-sm font-medium">{statusMessage}</span>
          </div>
        )}

        {status === 'error' && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-800 rounded-md p-3">
            <AlertCircle className="w-5 h-5" />
            <span className="text-sm">{statusMessage}</span>
          </div>
        )}

        {/* Send Button */}
        <button
          onClick={handleSend}
          disabled={!canSend || !message.trim() || isSending}
          className="w-full bg-primary text-white px-4 py-2 rounded-md hover:bg-primary/90 disabled:bg-muted disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium transition-colors"
        >
          {isSending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              Send SMS
            </>
          )}
        </button>

        {/* TCPA Compliance Notice */}
        <p className="text-xs text-muted-foreground text-center">
          By sending, you confirm the recipient has opted in to receive SMS communications.
        </p>
      </CardContent>
    </Card>
  );
}
