/**
 * ARIA Vision Functions - Phase 7: Photo & Visual Intelligence
 *
 * Photo and visual intelligence for roofing inspections.
 * Uses OpenAI Vision API to analyze roof photos, detect damage,
 * compare before/after, and generate estimates.
 */

import { ariaFunctionRegistry } from '../function-registry'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import {
  analyzeRoofPhoto,
  analyzePhotoSet,
  compareBeforeAfter,
  estimateFromPhoto,
} from '@/lib/ai/vision-analysis'

// -------------------------------------------------------------------
// analyze_roof_photos - Analyze photos for damage assessment
// -------------------------------------------------------------------

ariaFunctionRegistry.register({
  name: 'analyze_roof_photos',
  category: 'vision',
  description:
    'Analyze roof photos to identify damage types, severity, materials, and hazards. Can analyze single or multiple photos for comprehensive assessment.',
  riskLevel: 'low',
  enabledByDefault: true,
  voiceDefinition: {
    type: 'function',
    name: 'analyze_roof_photos',
    description:
      'Analyze roof photos for damage, materials, and hazards. Use when customer asks about photo analysis or damage assessment.',
    parameters: {
      type: 'object',
      properties: {
        contact_id: {
          type: 'string',
          description: 'Contact ID to get photos from',
        },
        project_id: {
          type: 'string',
          description: 'Project ID to get photos from',
        },
        photo_urls: {
          type: 'array',
          items: { type: 'string' },
          description: 'Direct URLs to analyze (optional)',
        },
        context: {
          type: 'string',
          description: 'Additional context about the inspection (e.g., "storm damage from 1/5/2025")',
        },
        limit: {
          type: 'number',
          description: 'Max photos to analyze (default 5, max 10)',
        },
      },
      required: [],
    },
  },
  execute: async (args, context) => {
    const tenantId = context.tenantId
    const contactId = args.contact_id as string | undefined
    const projectId = args.project_id as string | undefined
    const photoUrls = args.photo_urls as string[] | undefined
    const analysisContext = args.context as string | undefined
    const limit = Math.min((args.limit as number) || 5, 10)

    try {
      let urls: string[] = []

      // If direct URLs provided, use those
      if (photoUrls && photoUrls.length > 0) {
        urls = photoUrls.slice(0, limit)
      } else {
        // Otherwise fetch from database
        const supabase = await createClient()

        let query = supabase
          .from('photos')
          .select('id, file_url')
          .eq('tenant_id', tenantId)
          .eq('is_deleted', false)
          .order('created_at', { ascending: false })
          .limit(limit)

        if (projectId) {
          query = query.eq('project_id', projectId)
        } else if (contactId) {
          query = query.eq('contact_id', contactId)
        } else {
          return {
            success: false,
            message: 'Please provide contact_id, project_id, or photo_urls',
          }
        }

        const { data: photos, error } = await query

        if (error) {
          logger.error('Failed to fetch photos for analysis', { error })
          return {
            success: false,
            message: `Failed to fetch photos: ${error.message}`,
          }
        }

        if (!photos || photos.length === 0) {
          return {
            success: true,
            message: 'No photos found to analyze',
            analysis: null,
          }
        }

        urls = photos.map(p => p.file_url).filter(Boolean)
      }

      if (urls.length === 0) {
        return {
          success: true,
          message: 'No valid photo URLs to analyze',
          analysis: null,
        }
      }

      // Analyze the photos
      const result =
        urls.length === 1
          ? await analyzeRoofPhoto(urls[0], analysisContext)
          : await analyzePhotoSet(urls, {
              inspectionReason: analysisContext,
            })

      if (!result.success) {
        return {
          success: false,
          message: result.summary,
        }
      }

      // Build response message
      const lines: string[] = ['📸 **Photo Analysis Complete**', '']

      lines.push(`**Summary:** ${result.summary}`)
      lines.push(`**Confidence:** ${result.confidence}%`)
      lines.push('')

      if (result.damages.length > 0) {
        lines.push('**Damage Found:**')
        for (const damage of result.damages) {
          const icon = damage.severity === 'severe' ? '🔴' : damage.severity === 'moderate' ? '🟠' : '🟡'
          lines.push(`${icon} ${damage.damageType} (${damage.severity}) - ${damage.description}`)
          if (damage.insuranceRelevant) {
            lines.push('   ↳ Insurance relevant')
          }
        }
        lines.push('')
      }

      if (result.materials.length > 0) {
        lines.push('**Materials Identified:**')
        for (const mat of result.materials) {
          lines.push(`• ${mat.materialType} - ${mat.condition} condition`)
          if (mat.estimatedAge) {
            lines.push(`  Est. age: ${mat.estimatedAge}`)
          }
        }
        lines.push('')
      }

      if (result.hazards.length > 0) {
        lines.push('**⚠️ Hazards:**')
        for (const hazard of result.hazards) {
          lines.push(`• ${hazard.hazardType} (${hazard.severity}): ${hazard.description}`)
          lines.push(`  → ${hazard.recommendedAction}`)
        }
        lines.push('')
      }

      lines.push(`**Repair Scope:** ${result.estimatedRepairScope.replace('_', ' ')}`)
      lines.push(`**Insurance Claim Worthy:** ${result.insuranceClaimWorthy ? 'Yes' : 'No'}`)

      return {
        success: true,
        message: lines.join('\n'),
        analysis: result,
        photosAnalyzed: urls.length,
      }
    } catch (error) {
      logger.error('analyze_roof_photos failed', { error })
      return {
        success: false,
        message: `Analysis failed: ${(error as Error).message}`,
      }
    }
  },
})

// -------------------------------------------------------------------
// compare_before_after - Compare before and after photos
// -------------------------------------------------------------------

ariaFunctionRegistry.register({
  name: 'compare_before_after',
  category: 'vision',
  description:
    'Compare before and after photos to document work quality and changes. Useful for verifying repairs and creating documentation.',
  riskLevel: 'low',
  enabledByDefault: true,
  voiceDefinition: {
    type: 'function',
    name: 'compare_before_after',
    description: 'Compare before and after photos to verify work quality',
    parameters: {
      type: 'object',
      properties: {
        before_url: {
          type: 'string',
          description: 'URL of before photo',
        },
        after_url: {
          type: 'string',
          description: 'URL of after photo',
        },
        before_photo_id: {
          type: 'string',
          description: 'ID of before photo (if not using URL)',
        },
        after_photo_id: {
          type: 'string',
          description: 'ID of after photo (if not using URL)',
        },
        work_description: {
          type: 'string',
          description: 'Description of work performed',
        },
      },
      required: [],
    },
  },
  execute: async (args, context) => {
    const tenantId = context.tenantId
    let beforeUrl = args.before_url as string | undefined
    let afterUrl = args.after_url as string | undefined
    const beforeId = args.before_photo_id as string | undefined
    const afterId = args.after_photo_id as string | undefined
    const workDescription = args.work_description as string | undefined

    try {
      // Fetch URLs from IDs if needed
      if ((!beforeUrl || !afterUrl) && (beforeId || afterId)) {
        const supabase = await createClient()
        const ids = [beforeId, afterId].filter(Boolean) as string[]

        const { data: photos, error } = await supabase
          .from('photos')
          .select('id, file_url')
          .eq('tenant_id', tenantId)
          .in('id', ids)

        if (error) {
          return {
            success: false,
            message: `Failed to fetch photos: ${error.message}`,
          }
        }

        if (photos) {
          if (beforeId && !beforeUrl) {
            const found = photos.find(p => p.id === beforeId)
            if (found) beforeUrl = found.file_url
          }
          if (afterId && !afterUrl) {
            const found = photos.find(p => p.id === afterId)
            if (found) afterUrl = found.file_url
          }
        }
      }

      if (!beforeUrl || !afterUrl) {
        return {
          success: false,
          message: 'Both before and after photos are required. Please provide URLs or photo IDs.',
        }
      }

      const result = await compareBeforeAfter(beforeUrl, afterUrl, workDescription)

      if (!result.success) {
        return {
          success: false,
          message: result.summary,
        }
      }

      const lines: string[] = ['📷 **Before/After Comparison**', '']

      lines.push(`**Summary:** ${result.summary}`)
      lines.push(`**Quality Assessment:** ${result.qualityAssessment}`)
      lines.push(`**Confidence:** ${result.confidence}%`)
      lines.push('')

      if (result.improvements.length > 0) {
        lines.push('**✅ Improvements:**')
        for (const imp of result.improvements) {
          lines.push(`• ${imp}`)
        }
        lines.push('')
      }

      if (result.remainingIssues.length > 0) {
        lines.push('**⚠️ Remaining Issues:**')
        for (const issue of result.remainingIssues) {
          lines.push(`• ${issue}`)
        }
      }

      return {
        success: true,
        message: lines.join('\n'),
        comparison: result,
      }
    } catch (error) {
      logger.error('compare_before_after failed', { error })
      return {
        success: false,
        message: `Comparison failed: ${(error as Error).message}`,
      }
    }
  },
})

// -------------------------------------------------------------------
// estimate_from_photos - Generate rough estimate from photos
// -------------------------------------------------------------------

ariaFunctionRegistry.register({
  name: 'estimate_from_photos',
  category: 'vision',
  description:
    'Generate a rough repair/replacement estimate from roof photos. Provides scope assessment and urgency level.',
  riskLevel: 'low',
  enabledByDefault: true,
  voiceDefinition: {
    type: 'function',
    name: 'estimate_from_photos',
    description: 'Generate rough estimate from roof photos',
    parameters: {
      type: 'object',
      properties: {
        contact_id: {
          type: 'string',
          description: 'Contact ID to get photos and property info',
        },
        project_id: {
          type: 'string',
          description: 'Project ID to get photos from',
        },
        photo_url: {
          type: 'string',
          description: 'Direct photo URL to analyze',
        },
        address: {
          type: 'string',
          description: 'Property address for context',
        },
        roof_type: {
          type: 'string',
          description: 'Known roof type (e.g., "architectural shingle")',
        },
        square_footage: {
          type: 'number',
          description: 'Known roof square footage',
        },
      },
      required: [],
    },
  },
  execute: async (args, context) => {
    const tenantId = context.tenantId
    const contactId = args.contact_id as string | undefined
    const projectId = args.project_id as string | undefined
    let photoUrl = args.photo_url as string | undefined
    let address = args.address as string | undefined
    const roofType = args.roof_type as string | undefined
    const squareFootage = args.square_footage as number | undefined

    try {
      const supabase = await createClient()

      // Fetch photo URL and property info if needed
      if (!photoUrl) {
        let query = supabase
          .from('photos')
          .select('file_url')
          .eq('tenant_id', tenantId)
          .eq('is_deleted', false)
          .order('created_at', { ascending: false })
          .limit(1)

        if (projectId) {
          query = query.eq('project_id', projectId)
        } else if (contactId) {
          query = query.eq('contact_id', contactId)
        } else {
          return {
            success: false,
            message: 'Please provide contact_id, project_id, or photo_url',
          }
        }

        const { data: photos } = await query
        if (photos && photos.length > 0) {
          photoUrl = photos[0].file_url
        }
      }

      if (!photoUrl) {
        return {
          success: true,
          message: 'No photos found to generate estimate from',
          estimate: null,
        }
      }

      // Try to get address from contact if not provided
      if (!address && contactId) {
        const { data: contact } = await supabase
          .from('contacts')
          .select('address_street, address_city, address_state, address_zip')
          .eq('id', contactId)
          .eq('tenant_id', tenantId)
          .eq('is_deleted', false)
          .single()

        if (contact) {
          const parts = [contact.address_street, contact.address_city, contact.address_state, contact.address_zip].filter(Boolean)
          if (parts.length > 0) {
            address = parts.join(', ')
          }
        }
      }

      const result = await estimateFromPhoto(photoUrl, {
        address,
        roofType,
        knownSquareFootage: squareFootage,
      })

      if (!result.success) {
        return {
          success: false,
          message: result.summary,
        }
      }

      const lines: string[] = ['💰 **Photo-Based Estimate**', '']

      lines.push(`**Summary:** ${result.summary}`)
      lines.push('')

      if (result.estimatedSquares !== null) {
        lines.push(`**Estimated Size:** ~${result.estimatedSquares} squares`)
      }
      if (result.damagePercentage !== null) {
        lines.push(`**Damage Coverage:** ~${result.damagePercentage}%`)
      }

      const urgencyEmoji = {
        routine: '🟢',
        soon: '🟡',
        urgent: '🟠',
        emergency: '🔴',
      }
      lines.push(`**Urgency:** ${urgencyEmoji[result.urgency]} ${result.urgency}`)
      lines.push(`**Confidence:** ${result.confidence}%`)
      lines.push('')

      if (result.repairTypes.length > 0) {
        lines.push('**Recommended Work:**')
        for (const rt of result.repairTypes) {
          lines.push(`• ${rt}`)
        }
        lines.push('')
      }

      if (result.caveats.length > 0) {
        lines.push('**⚠️ Important Notes:**')
        for (const caveat of result.caveats) {
          lines.push(`• ${caveat}`)
        }
      }

      return {
        success: true,
        message: lines.join('\n'),
        estimate: result,
      }
    } catch (error) {
      logger.error('estimate_from_photos failed', { error })
      return {
        success: false,
        message: `Estimate failed: ${(error as Error).message}`,
      }
    }
  },
})

// -------------------------------------------------------------------
// identify_materials - Identify roofing materials in photo
// -------------------------------------------------------------------

ariaFunctionRegistry.register({
  name: 'identify_materials',
  category: 'vision',
  description:
    'Identify roofing materials, their condition, and estimated age from photos. Useful for matching existing materials.',
  riskLevel: 'low',
  enabledByDefault: true,
  voiceDefinition: {
    type: 'function',
    name: 'identify_materials',
    description: 'Identify roofing materials from a photo',
    parameters: {
      type: 'object',
      properties: {
        photo_url: {
          type: 'string',
          description: 'URL of photo to analyze',
        },
        photo_id: {
          type: 'string',
          description: 'Photo ID to analyze',
        },
      },
      required: [],
    },
  },
  execute: async (args, context) => {
    const tenantId = context.tenantId
    let photoUrl = args.photo_url as string | undefined
    const photoId = args.photo_id as string | undefined

    try {
      // Get URL from ID if needed
      if (!photoUrl && photoId) {
        const supabase = await createClient()
        const { data: photo } = await supabase
          .from('photos')
          .select('file_url')
          .eq('id', photoId)
          .eq('tenant_id', tenantId)
          .single()

        if (photo) {
          photoUrl = photo.file_url
        }
      }

      if (!photoUrl) {
        return {
          success: false,
          message: 'Please provide photo_url or photo_id',
        }
      }

      // Use the analysis function focused on materials
      const result = await analyzeRoofPhoto(photoUrl, 'Focus on identifying materials, their type, manufacturer if visible, color, and condition.')

      if (!result.success) {
        return {
          success: false,
          message: result.summary,
        }
      }

      const lines: string[] = ['🔍 **Material Identification**', '']

      if (result.materials.length === 0) {
        lines.push('No materials could be clearly identified in this photo.')
      } else {
        for (const mat of result.materials) {
          lines.push(`**${mat.materialType}**`)
          lines.push(`• Condition: ${mat.condition}`)
          if (mat.estimatedAge) {
            lines.push(`• Estimated Age: ${mat.estimatedAge}`)
          }
          if (mat.colorDescription) {
            lines.push(`• Color: ${mat.colorDescription}`)
          }
          if (mat.manufacturer) {
            lines.push(`• Manufacturer: ${mat.manufacturer}`)
          }
          lines.push('')
        }
      }

      lines.push(`**Confidence:** ${result.confidence}%`)

      return {
        success: true,
        message: lines.join('\n'),
        materials: result.materials,
        confidence: result.confidence,
      }
    } catch (error) {
      logger.error('identify_materials failed', { error })
      return {
        success: false,
        message: `Identification failed: ${(error as Error).message}`,
      }
    }
  },
})

// -------------------------------------------------------------------
// detect_hazards - Detect safety hazards in photos
// -------------------------------------------------------------------

ariaFunctionRegistry.register({
  name: 'detect_hazards',
  category: 'vision',
  description:
    'Detect safety hazards in roof photos such as loose materials, structural concerns, electrical hazards, or biological growth.',
  riskLevel: 'low',
  enabledByDefault: true,
  voiceDefinition: {
    type: 'function',
    name: 'detect_hazards',
    description: 'Detect safety hazards in roof photos',
    parameters: {
      type: 'object',
      properties: {
        photo_url: {
          type: 'string',
          description: 'URL of photo to analyze',
        },
        photo_id: {
          type: 'string',
          description: 'Photo ID to analyze',
        },
        project_id: {
          type: 'string',
          description: 'Project ID to check all photos',
        },
      },
      required: [],
    },
  },
  execute: async (args, context) => {
    const tenantId = context.tenantId
    const photoUrl = args.photo_url as string | undefined
    const photoId = args.photo_id as string | undefined
    const projectId = args.project_id as string | undefined

    try {
      const supabase = await createClient()

      // Get URL(s)
      let urls: string[] = []

      if (photoUrl) {
        urls = [photoUrl]
      } else if (photoId) {
        const { data: photo } = await supabase
          .from('photos')
          .select('file_url')
          .eq('id', photoId)
          .eq('tenant_id', tenantId)
          .single()

        if (photo) {
          urls = [photo.file_url]
        }
      } else if (projectId) {
        const { data: photos } = await supabase
          .from('photos')
          .select('file_url')
          .eq('project_id', projectId)
          .eq('tenant_id', tenantId)
          .eq('is_deleted', false)
          .order('created_at', { ascending: false })
          .limit(5)

        if (photos) {
          urls = photos.map(p => p.file_url).filter(Boolean)
        }
      }

      if (urls.length === 0) {
        return {
          success: false,
          message: 'No photos found to analyze. Please provide photo_url, photo_id, or project_id.',
        }
      }

      // Analyze with hazard focus
      const result =
        urls.length === 1
          ? await analyzeRoofPhoto(
              urls[0],
              'Focus on identifying safety hazards: loose materials, structural concerns, electrical hazards, trip hazards, biological growth (moss, mold), or any other safety concerns for workers or occupants.'
            )
          : await analyzePhotoSet(urls, {
              inspectionReason:
                'Safety hazard detection - focus on loose materials, structural concerns, electrical hazards, biological growth',
            })

      if (!result.success) {
        return {
          success: false,
          message: result.summary,
        }
      }

      const lines: string[] = ['⚠️ **Hazard Detection Report**', '']

      if (result.hazards.length === 0) {
        lines.push('✅ No significant hazards detected in the analyzed photos.')
        lines.push('')
        lines.push('Note: This is an AI-based assessment. Always conduct proper on-site safety inspections.')
      } else {
        lines.push(`Found ${result.hazards.length} potential hazard(s):`)
        lines.push('')

        for (const hazard of result.hazards) {
          const icon = hazard.severity === 'high' ? '🔴' : hazard.severity === 'medium' ? '🟠' : '🟡'
          lines.push(`${icon} **${hazard.hazardType}** (${hazard.severity})`)
          lines.push(`   ${hazard.description}`)
          lines.push(`   → Action: ${hazard.recommendedAction}`)
          lines.push('')
        }
      }

      lines.push(`**Photos Analyzed:** ${urls.length}`)
      lines.push(`**Confidence:** ${result.confidence}%`)

      return {
        success: true,
        message: lines.join('\n'),
        hazards: result.hazards,
        photosAnalyzed: urls.length,
        confidence: result.confidence,
      }
    } catch (error) {
      logger.error('detect_hazards failed', { error })
      return {
        success: false,
        message: `Hazard detection failed: ${(error as Error).message}`,
      }
    }
  },
})
