#!/usr/bin/env node
/**
 * Extract database schema graph data from migrations and types.
 * Outputs JSON with all tables, relationships, and domain groupings.
 *
 * This script only reads files and writes JSON - no shell execution.
 */

const fs = require('fs');
const path = require('path');

const MIGRATIONS_DIR = path.join(__dirname, '..', 'supabase', 'migrations');
const TYPES_FILE = path.join(__dirname, '..', 'lib', 'types', 'database.types.ts');
const API_DIR = path.join(__dirname, '..', 'app', 'api');

// Domain groupings for visual categorization
const DOMAIN_RULES = [
  { pattern: /^(tenants|tenant_users|tenant_settings|users|user_roles|user_role_assignments|user_sessions|login_activity|user_notification_preferences|user_ui_preferences)$/, domain: 'Core & Auth' },
  { pattern: /^(contacts|organizations)$/, domain: 'Contacts' },
  { pattern: /^(projects|jobs|project_files|project_profit_loss|quote_proposals|quote_options|quote_line_items)$/, domain: 'Projects' },
  { pattern: /^(tasks|task_activity|task_attachments|task_comments)$/, domain: 'Tasks' },
  { pattern: /^(activities|events|surveys)$/, domain: 'Activities' },
  { pattern: /^(call_logs|call_compliance_log|call_opt_out_queue|email_templates|email_drafts|sms_templates|sms_approval_queue|recording_consent_states)$/, domain: 'Communication' },
  { pattern: /^(campaigns|campaign_triggers|campaign_steps|campaign_enrollments|campaign_step_executions|campaign_analytics)$/, domain: 'Campaigns' },
  { pattern: /^(automations|workflows|workflow_steps|workflow_executions|workflow_step_executions)$/, domain: 'Automations' },
  { pattern: /^(claims|claim_communications|claim_documents|claim_outcomes|claim_supplements|claim_weather_data|insurance_carriers|insurance_personnel|carrier_patterns|carrier_standards|adjuster_patterns|court_cases|policy_provisions)$/, domain: 'Insurance & Claims' },
  { pattern: /^(storm_events|storm_alerts|storm_response_mode|storm_targeting_areas|extracted_addresses|bulk_import_jobs|property_enrichment_cache)$/, domain: 'Storm Ops' },
  { pattern: /^(knocks|territories|rep_locations|high_priority_pins|pins_pending_sync)$/, domain: 'Field Ops' },
  { pattern: /^(voice_sessions|voice_function_calls|ai_conversations|ai_messages|aria_conversations|aria_function_logs|voicemail_messages|callback_requests)$/, domain: 'Voice & AI' },
  { pattern: /^(commission_plans|commission_records|commission_rules|commission_summary_by_user|commissions|user_commission_assignments|financial_configs|revenue_forecast|subscriptions|subscription_events|invoices)$/, domain: 'Financial' },
  { pattern: /^(crew_members|timesheets|job_expenses|material_purchases)$/, domain: 'Crew & Costs' },
  { pattern: /^(achievements|achievement_configs|challenges|challenge_configs|challenge_progress|user_achievements|user_challenges|user_points|user_streaks|gamification_activities|gamification_scores|leaderboard|point_rules|point_rule_configs|reward_configs|reward_claims|kpi_definitions|kpi_values|kpi_snapshots|performance_metrics)$/, domain: 'Gamification' },
  { pattern: /^(signatures|signature_documents|document_templates|documents|templates|packets)$/, domain: 'Documents' },
  { pattern: /^(roofing_knowledge|knowledge_search_queries|shingle_products|manufacturer_specs|manufacturer_directory|discontin_shingles|building_codes|industry_organizations|industry_standards)$/, domain: 'Knowledge Base' },
  { pattern: /^(digital_business_cards|business_card_interactions)$/, domain: 'Digital Cards' },
  { pattern: /^(photos|n8n_chat_histories|win_loss_reasons|discontinued_shingles)$/, domain: 'Other' },
  { pattern: /^(quickbooks_tokens|quickbooks_connections|quickbooks_sync_logs|quickbooks_mappings|google_calendar_tokens)$/, domain: 'Integrations' },
  { pattern: /^(ar_sessions|ar_measurements|ar_damage_markers)$/, domain: 'AR Assessment' },
  { pattern: /^(dnc_imports|dnc_registry|dnc_sync_jobs)$/, domain: 'Compliance' },
  { pattern: /^(filter_configs|filter_usage_logs|saved_filters|status_substatus_configs|pipeline_stages|pipeline_metrics|lead_scoring_configs|dashboards|query_history|report_schedules|audit_log|impersonation_logs|admin_alerts)$/, domain: 'Settings & Admin' },
  { pattern: /^(_encryption_keys)$/, domain: 'Security' },
];

function getDomain(tableName) {
  for (const rule of DOMAIN_RULES) {
    if (rule.pattern.test(tableName)) return rule.domain;
  }
  return 'Other';
}

// Extract table names from database.types.ts (Tables section only)
function extractTables() {
  const content = fs.readFileSync(TYPES_FILE, 'utf-8');
  const lines = content.split('\n');
  const tables = [];
  let inTables = false;
  let braceDepth = 0;

  for (const line of lines) {
    // Detect start of Tables block (4-space indent)
    if (/^\s{4}Tables:\s*\{/.test(line)) {
      inTables = true;
      braceDepth = 1;
      continue;
    }

    if (!inTables) continue;

    // Track brace depth to know when Tables block ends
    const opens = (line.match(/\{/g) || []).length;
    const closes = (line.match(/\}/g) || []).length;
    braceDepth += opens - closes;

    if (braceDepth <= 0) {
      inTables = false;
      break;
    }

    // Match table names at 6-space indent (direct children of Tables)
    const tableMatch = line.match(/^\s{6}(\w+):\s*\{$/);
    if (tableMatch) {
      const name = tableMatch[1];
      if (!['Row', 'Insert', 'Update', 'Relationships'].includes(name)) {
        tables.push(name);
      }
    }
  }

  return [...new Set(tables)];
}

// Extract FK relationships from migration SQL files
function extractRelationships(tableSet) {
  const relationships = [];
  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const content = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf-8');

    // Pattern 1: REFERENCES in CREATE TABLE (inline)
    const inlineRefRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?(\w+)\s*\(([\s\S]*?)\);/gi;
    let createMatch;
    while ((createMatch = inlineRefRegex.exec(content)) !== null) {
      const sourceTable = createMatch[1];
      const body = createMatch[2];

      const refRegex = /(\w+)\s+\w+.*?REFERENCES\s+(?:public\.)?(\w+)\s*\(/gi;
      let refMatch;
      while ((refMatch = refRegex.exec(body)) !== null) {
        const targetTable = refMatch[2];
        if (tableSet.has(targetTable) && tableSet.has(sourceTable)) {
          relationships.push({
            source: sourceTable,
            target: targetTable,
            column: refMatch[1]
          });
        }
      }

      const fkRegex = /FOREIGN\s+KEY\s*\((\w+)\)\s*REFERENCES\s+(?:public\.)?(\w+)\s*\(/gi;
      let fkMatch;
      while ((fkMatch = fkRegex.exec(body)) !== null) {
        const targetTable = fkMatch[2];
        if (tableSet.has(targetTable) && tableSet.has(sourceTable)) {
          relationships.push({
            source: sourceTable,
            target: targetTable,
            column: fkMatch[1]
          });
        }
      }
    }

    // Pattern 2: ALTER TABLE ADD FOREIGN KEY / ADD CONSTRAINT ... REFERENCES
    const alterFkRegex = /ALTER\s+TABLE\s+(?:(?:ONLY\s+)?public\.)?(\w+)\s+ADD\s+(?:CONSTRAINT\s+\w+\s+)?FOREIGN\s+KEY\s*\((\w+)\)\s*REFERENCES\s+(?:public\.)?(\w+)\s*\(/gi;
    let alterMatch;
    while ((alterMatch = alterFkRegex.exec(content)) !== null) {
      const sourceTable = alterMatch[1];
      const targetTable = alterMatch[3];
      if (tableSet.has(targetTable) && tableSet.has(sourceTable)) {
        relationships.push({
          source: sourceTable,
          target: targetTable,
          column: alterMatch[2]
        });
      }
    }
  }

  // Deduplicate
  const seen = new Set();
  return relationships.filter(r => {
    const key = `${r.source}->${r.target}:${r.column}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// Count API routes that touch each table
function extractApiRoutesByTable() {
  const tableTouches = {};

  function walkDir(dir) {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walkDir(fullPath);
      } else if (entry.name === 'route.ts' || entry.name === 'route.tsx') {
        const content = fs.readFileSync(fullPath, 'utf-8');
        const fromRegex = /\.from\(['"](\w+)['"]\)/g;
        let match;
        while ((match = fromRegex.exec(content)) !== null) {
          const table = match[1];
          if (!tableTouches[table]) tableTouches[table] = 0;
          tableTouches[table]++;
        }
      }
    }
  }

  walkDir(API_DIR);
  return tableTouches;
}

// Main
const tables = extractTables();
const tableSet = new Set(tables);
const relationships = extractRelationships(tableSet);
const apiTouches = extractApiRoutesByTable();

// Build nodes with connection counts
const connectionCount = {};
for (const r of relationships) {
  connectionCount[r.source] = (connectionCount[r.source] || 0) + 1;
  connectionCount[r.target] = (connectionCount[r.target] || 0) + 1;
}

const nodes = tables.map(name => ({
  id: name,
  domain: getDomain(name),
  connections: connectionCount[name] || 0,
  apiRoutes: apiTouches[name] || 0,
}));

const links = relationships.map(r => ({
  source: r.source,
  target: r.target,
  column: r.column,
}));

// Domain stats
const domainStats = {};
for (const node of nodes) {
  if (!domainStats[node.domain]) domainStats[node.domain] = { tables: 0, connections: 0 };
  domainStats[node.domain].tables++;
  domainStats[node.domain].connections += node.connections;
}

const output = {
  generated: new Date().toISOString(),
  stats: {
    tables: nodes.length,
    relationships: links.length,
    domains: Object.keys(domainStats).length,
  },
  domainStats,
  nodes,
  links,
};

// Write output
const outPath = path.join(__dirname, '..', 'visualizations', 'schema-data.json');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(output, null, 2));

console.log('Extracted ' + nodes.length + ' tables, ' + links.length + ' relationships, ' + Object.keys(domainStats).length + ' domains');
console.log('Written to: ' + outPath);
console.log('\nDomain breakdown:');
for (const [domain, stats] of Object.entries(domainStats).sort((a, b) => b[1].tables - a[1].tables)) {
  console.log('  ' + domain + ': ' + stats.tables + ' tables, ' + stats.connections + ' connections');
}
