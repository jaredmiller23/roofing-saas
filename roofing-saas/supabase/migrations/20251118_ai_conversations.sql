-- AI Conversations and Messages
-- Persistent storage for AI assistant chat history

-- Create ai_conversations table
CREATE TABLE IF NOT EXISTS ai_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB DEFAULT '{}'::jsonb,

  CONSTRAINT ai_conversations_tenant_user_fk FOREIGN KEY (tenant_id, user_id)
    REFERENCES user_tenants(tenant_id, user_id) ON DELETE CASCADE
);

-- Create ai_messages table
CREATE TABLE IF NOT EXISTS ai_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'function')),
  content TEXT NOT NULL,
  function_call JSONB,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_conversations_tenant_user
  ON ai_conversations(tenant_id, user_id, is_active);

CREATE INDEX IF NOT EXISTS idx_ai_conversations_updated_at
  ON ai_conversations(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_messages_conversation
  ON ai_messages(conversation_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_messages_created_at
  ON ai_messages(created_at DESC);

-- Update trigger for conversations
CREATE OR REPLACE FUNCTION update_ai_conversation_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_ai_conversation_updated_at
  BEFORE UPDATE ON ai_conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_conversation_updated_at();

-- Trigger to update conversation updated_at when message is added
CREATE OR REPLACE FUNCTION update_conversation_on_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE ai_conversations
  SET updated_at = NOW()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_conversation_on_message
  AFTER INSERT ON ai_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_on_message();

-- RLS Policies
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_messages ENABLE ROW LEVEL SECURITY;

-- ai_conversations policies
CREATE POLICY "Users can view own conversations"
  ON ai_conversations FOR SELECT
  USING (
    user_id = auth.uid() AND
    tenant_id IN (
      SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create own conversations"
  ON ai_conversations FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    tenant_id IN (
      SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own conversations"
  ON ai_conversations FOR UPDATE
  USING (
    user_id = auth.uid() AND
    tenant_id IN (
      SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own conversations"
  ON ai_conversations FOR DELETE
  USING (
    user_id = auth.uid() AND
    tenant_id IN (
      SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
    )
  );

-- ai_messages policies
CREATE POLICY "Users can view messages in own conversations"
  ON ai_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM ai_conversations
      WHERE id = ai_messages.conversation_id
        AND user_id = auth.uid()
        AND tenant_id IN (
          SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
        )
    )
  );

CREATE POLICY "Users can create messages in own conversations"
  ON ai_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM ai_conversations
      WHERE id = ai_messages.conversation_id
        AND user_id = auth.uid()
        AND tenant_id IN (
          SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
        )
    )
  );

CREATE POLICY "Users can update messages in own conversations"
  ON ai_messages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM ai_conversations
      WHERE id = ai_messages.conversation_id
        AND user_id = auth.uid()
        AND tenant_id IN (
          SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
        )
    )
  );

CREATE POLICY "Users can delete messages in own conversations"
  ON ai_messages FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM ai_conversations
      WHERE id = ai_messages.conversation_id
        AND user_id = auth.uid()
        AND tenant_id IN (
          SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
        )
    )
  );

-- Comments for documentation
COMMENT ON TABLE ai_conversations IS 'AI assistant conversation threads for persistent chat history';
COMMENT ON TABLE ai_messages IS 'Individual messages within AI conversations';

COMMENT ON COLUMN ai_conversations.title IS 'Auto-generated from first message or user-defined';
COMMENT ON COLUMN ai_conversations.is_active IS 'Whether conversation is active (false = archived)';
COMMENT ON COLUMN ai_conversations.metadata IS 'Additional data: { last_context: {...}, message_count: 0 }';

COMMENT ON COLUMN ai_messages.role IS 'Message sender: user, assistant, system, or function';
COMMENT ON COLUMN ai_messages.content IS 'Message text content';
COMMENT ON COLUMN ai_messages.function_call IS 'Function call details: { name, parameters, result }';
COMMENT ON COLUMN ai_messages.metadata IS 'Additional data: { voice: boolean, provider: string, context: {...} }';
