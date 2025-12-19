import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    env: process.env.VERCEL ? 'vercel' : 'local',
    timestamp: new Date().toISOString()
  })
}
