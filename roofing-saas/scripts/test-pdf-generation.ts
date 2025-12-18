import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://wfifizczqvogbcqamnmw.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndmaWZpemN6cXZvZ2JjcWFtbm13Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgxMDMwOTMsImV4cCI6MjA3MzY3OTA5M30.UaMCkJmypS4T5DopA6efaZs_3YvvLluG0MK-4s7gTBI"
);

async function test() {
  console.log("🔐 Signing in...");

  // Sign in
  const { data: auth, error: authError } = await supabase.auth.signInWithPassword({
    email: "claude-test@roofingsaas.com",
    password: "ClaudeTest2025!Secure"
  });

  if (authError) {
    console.error("Auth error:", authError);
    return;
  }

  console.log("✅ Logged in as:", auth.user?.email);

  // Get a template with HTML content
  console.log("\n📄 Fetching template with HTML content...");
  const { data: templates, error: tplError } = await supabase
    .from("document_templates")
    .select("id, name, html_content")
    .not("html_content", "is", null)
    .limit(1);

  if (tplError) {
    console.error("Template error:", tplError);
    return;
  }

  if (!templates || templates.length === 0) {
    console.error("No templates with HTML content found");
    return;
  }

  const template = templates[0];
  console.log("✅ Template found:", template.name);
  console.log("   ID:", template.id);
  console.log("   Has HTML:", template.html_content ? `Yes (${template.html_content.length} chars)` : "No");

  // Create signature document with template_id
  console.log("\n📝 Creating signature document with template_id...");

  const response = await fetch("https://roofing-saas.vercel.app/api/signature-documents", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + auth.session?.access_token
    },
    body: JSON.stringify({
      title: "Test PDF Generation " + Date.now(),
      description: "Testing PDF generation from template",
      document_type: "contract",
      template_id: template.id,
      requires_customer_signature: true,
      requires_company_signature: true
    })
  });

  const result = await response.json();

  console.log("\n📊 Results:");
  console.log("   HTTP Status:", response.status);

  if (response.status !== 201) {
    console.log("❌ Error:", result.error || result.message || JSON.stringify(result));
    return;
  }

  console.log("   Document ID:", result.document?.id);
  console.log("   Document Title:", result.document?.title);
  console.log("   Template ID:", result.document?.template_id);
  console.log("   File URL:", result.document?.file_url || "NULL");

  if (result.document?.file_url) {
    console.log("\n✅ SUCCESS: PDF was generated!");
    console.log("   PDF URL:", result.document.file_url);
  } else {
    console.log("\n⚠️ Document created but file_url is null");
    console.log("   This means PDF generation may have failed silently");
    console.log("   Check Vercel function logs for errors");
  }
}

test().catch(console.error);
