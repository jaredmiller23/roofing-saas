#!/usr/bin/env tsx

/**
 * Check Vercel project configuration and latest deployment status
 */

const VERCEL_TOKEN = '3UO6RQWMA0sl8M1aTRvtCdFm'
const TEAM_ID = 'team_YRgRNS4hbrj0sxtQg30Dhm6t'
const PROJECT_ID = 'prj_NJyZN95UgBSvgLKjA7kHFOLScsMY'

async function checkVercelConfig() {
  // Get project configuration
  const projectUrl = `https://api.vercel.com/v9/projects/${PROJECT_ID}?teamId=${TEAM_ID}`
  const projectResponse = await fetch(projectUrl, {
    headers: {
      'Authorization': `Bearer ${VERCEL_TOKEN}`,
      'Content-Type': 'application/json'
    }
  })

  if (!projectResponse.ok) {
    console.error('Failed to fetch project:', projectResponse.status, projectResponse.statusText)
    const error = await projectResponse.text()
    console.error('Error:', error)
    return
  }

  const project = await projectResponse.json()

  console.log('\n=== PROJECT CONFIGURATION ===')
  console.log('Name:', project.name)
  console.log('Root Directory:', project.rootDirectory || '(not set)')
  console.log('Framework:', project.framework)
  console.log('Build Command:', project.buildCommand || '(auto-detected)')
  console.log('Output Directory:', project.outputDirectory || '(auto-detected)')
  console.log('Install Command:', project.installCommand || '(auto-detected)')

  // Get latest deployments
  const deploymentsUrl = `https://api.vercel.com/v6/deployments?projectId=${PROJECT_ID}&teamId=${TEAM_ID}&limit=3`
  const deploymentsResponse = await fetch(deploymentsUrl, {
    headers: {
      'Authorization': `Bearer ${VERCEL_TOKEN}`
    }
  })

  if (!deploymentsResponse.ok) {
    console.error('Failed to fetch deployments:', deploymentsResponse.status)
    return
  }

  const deploymentsData = await deploymentsResponse.json()
  const deployments = deploymentsData.deployments || []

  console.log('\n=== LATEST DEPLOYMENTS ===')
  for (const deployment of deployments) {
    console.log(`\nDeployment: ${deployment.uid}`)
    console.log('Status:', deployment.readyState)
    console.log('Created:', new Date(deployment.createdAt).toLocaleString())
    console.log('URL:', deployment.url)

    // Get deployment details including build logs
    if (deployment.readyState === 'ERROR') {
      const detailsUrl = `https://api.vercel.com/v13/deployments/${deployment.uid}?teamId=${TEAM_ID}`
      const detailsResponse = await fetch(detailsUrl, {
        headers: {
          'Authorization': `Bearer ${VERCEL_TOKEN}`
        }
      })

      if (detailsResponse.ok) {
        const details = await detailsResponse.json()
        console.log('Error Message:', details.error?.message || 'No error message available')
      }

      // Try to fetch build logs
      const logsUrl = `https://api.vercel.com/v2/deployments/${deployment.uid}/events?teamId=${TEAM_ID}`
      const logsResponse = await fetch(logsUrl, {
        headers: {
          'Authorization': `Bearer ${VERCEL_TOKEN}`
        }
      })

      if (logsResponse.ok) {
        const logsText = await logsResponse.text()
        const logs = logsText.split('\n').filter(line => line.trim())
        console.log('\n--- Build Logs (last 20 lines) ---')
        logs.slice(-20).forEach(line => {
          try {
            const event = JSON.parse(line)
            if (event.type === 'stderr' || event.type === 'stdout' || event.type === 'command') {
              console.log(event.payload?.text || event.text || line)
            }
          } catch {
            console.log(line)
          }
        })
      }
    }
  }
}

checkVercelConfig().catch(console.error)
