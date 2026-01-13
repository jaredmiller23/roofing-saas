/**
 * Vision Analysis Module
 *
 * Provides roofing-specific image analysis using OpenAI Vision API.
 * Identifies damage types, severity, materials, and generates reports.
 */

import OpenAI from 'openai'
import { createOpenAIClient } from './openai-client'
import { logger } from '@/lib/logger'
import type {
  DamageCause,
  SeverityLevel,
  RoofSection,
} from '@/lib/types/photo-labels'

// -------------------------------------------------------------------
// Types
// -------------------------------------------------------------------

export interface DamageAssessment {
  damageType: DamageCause
  severity: SeverityLevel
  confidence: number // 0-100
  description: string
  location?: string
  insuranceRelevant: boolean
}

export interface MaterialIdentification {
  materialType: string
  condition: 'good' | 'fair' | 'poor' | 'critical'
  estimatedAge?: string
  manufacturer?: string
  colorDescription?: string
}

export interface HazardDetection {
  hazardType: string
  severity: 'low' | 'medium' | 'high'
  description: string
  recommendedAction: string
}

export interface PhotoAnalysisResult {
  success: boolean
  summary: string
  damages: DamageAssessment[]
  materials: MaterialIdentification[]
  hazards: HazardDetection[]
  roofSections: RoofSection[]
  insuranceClaimWorthy: boolean
  estimatedRepairScope: 'minor' | 'moderate' | 'major' | 'full_replacement'
  confidence: number
  rawAnalysis?: string
}

export interface BeforeAfterComparison {
  success: boolean
  summary: string
  changeDetected: boolean
  improvements: string[]
  remainingIssues: string[]
  qualityAssessment: 'excellent' | 'good' | 'acceptable' | 'needs_work'
  confidence: number
}

export interface PhotoEstimate {
  success: boolean
  summary: string
  estimatedSquares: number | null
  damagePercentage: number | null
  repairTypes: string[]
  urgency: 'routine' | 'soon' | 'urgent' | 'emergency'
  confidence: number
  caveats: string[]
}

// -------------------------------------------------------------------
// Prompts
// -------------------------------------------------------------------

const DAMAGE_ANALYSIS_PROMPT = `You are an expert roofing inspector analyzing roof photos for damage assessment.

Analyze this roof photo and provide a detailed assessment in JSON format:

{
  "summary": "Brief overall summary of what you see",
  "damages": [
    {
      "damageType": "hail" | "wind" | "wear" | "water" | "impact" | "other",
      "severity": "minor" | "moderate" | "severe",
      "confidence": 0-100,
      "description": "Specific description of the damage",
      "location": "Where on the roof (if visible)",
      "insuranceRelevant": true/false
    }
  ],
  "materials": [
    {
      "materialType": "e.g., 3-tab asphalt shingle, architectural shingle, metal, tile",
      "condition": "good" | "fair" | "poor" | "critical",
      "estimatedAge": "e.g., 5-10 years",
      "colorDescription": "Color/pattern description"
    }
  ],
  "hazards": [
    {
      "hazardType": "e.g., loose material, structural concern, moss growth",
      "severity": "low" | "medium" | "high",
      "description": "Description of the hazard",
      "recommendedAction": "What should be done"
    }
  ],
  "roofSections": ["shingles", "ridge_cap", "flashing", etc.],
  "insuranceClaimWorthy": true/false,
  "estimatedRepairScope": "minor" | "moderate" | "major" | "full_replacement",
  "confidence": 0-100
}

Focus on:
- Hail damage: Look for circular dents, bruising, granule loss
- Wind damage: Missing shingles, lifted edges, creasing
- Water damage: Staining, moss, algae, ponding signs
- Wear: Curling, cracking, granule loss from age
- Structural issues: Sagging, improper installation

Be specific and objective. If you cannot determine something clearly, say so and lower confidence.`

const BEFORE_AFTER_PROMPT = `You are comparing before and after photos of a roof repair/replacement.

Analyze both images and provide a comparison in JSON format:

{
  "summary": "Overall summary of the work completed",
  "changeDetected": true/false,
  "improvements": ["List of visible improvements"],
  "remainingIssues": ["Any issues still visible or new concerns"],
  "qualityAssessment": "excellent" | "good" | "acceptable" | "needs_work",
  "confidence": 0-100
}

Focus on:
- Material quality and proper installation
- Alignment and uniformity
- Flashing and edge work
- Overall workmanship
- Any visible defects or concerns

Be objective and note both positives and concerns.`

const ESTIMATE_PROMPT = `You are a roofing estimator analyzing a roof photo to provide a rough scope estimate.

Analyze this photo and provide an estimate in JSON format:

{
  "summary": "Brief description of what you see and the scope",
  "estimatedSquares": number or null if cannot determine,
  "damagePercentage": 0-100 or null if cannot determine,
  "repairTypes": ["e.g., shingle replacement", "flashing repair", "full replacement"],
  "urgency": "routine" | "soon" | "urgent" | "emergency",
  "confidence": 0-100,
  "caveats": ["List of factors that could change this estimate"]
}

Note: 1 square = 100 sq ft of roofing.

Be conservative with estimates and clearly state limitations. If you cannot determine something, use null and explain in caveats.`

// -------------------------------------------------------------------
// Core Analysis Functions
// -------------------------------------------------------------------

/**
 * Analyze a roof photo for damage assessment
 */
export async function analyzeRoofPhoto(
  imageUrl: string,
  additionalContext?: string
): Promise<PhotoAnalysisResult> {
  const openai = createOpenAIClient()

  try {
    const prompt = additionalContext
      ? `${DAMAGE_ANALYSIS_PROMPT}\n\nAdditional context: ${additionalContext}`
      : DAMAGE_ANALYSIS_PROMPT

    const response = await openai.chat.completions.create({
      model: 'gpt-4o', // Vision requires gpt-4o or gpt-4-vision-preview
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            {
              type: 'image_url',
              image_url: {
                url: imageUrl,
                detail: 'high',
              },
            },
          ],
        },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 2000,
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      return {
        success: false,
        summary: 'Failed to analyze photo - no response from AI',
        damages: [],
        materials: [],
        hazards: [],
        roofSections: [],
        insuranceClaimWorthy: false,
        estimatedRepairScope: 'minor',
        confidence: 0,
      }
    }

    const analysis = JSON.parse(content) as Omit<PhotoAnalysisResult, 'success' | 'rawAnalysis'>

    logger.info('Roof photo analyzed successfully', {
      damageCount: analysis.damages?.length || 0,
      confidence: analysis.confidence,
      insuranceRelevant: analysis.insuranceClaimWorthy,
    })

    return {
      success: true,
      ...analysis,
      rawAnalysis: content,
    }
  } catch (error) {
    logger.error('Failed to analyze roof photo', { error, imageUrl })
    return {
      success: false,
      summary: `Analysis failed: ${(error as Error).message}`,
      damages: [],
      materials: [],
      hazards: [],
      roofSections: [],
      insuranceClaimWorthy: false,
      estimatedRepairScope: 'minor',
      confidence: 0,
    }
  }
}

/**
 * Compare before and after photos
 */
export async function compareBeforeAfter(
  beforeUrl: string,
  afterUrl: string,
  workDescription?: string
): Promise<BeforeAfterComparison> {
  const openai = createOpenAIClient()

  try {
    const prompt = workDescription
      ? `${BEFORE_AFTER_PROMPT}\n\nWork performed: ${workDescription}`
      : BEFORE_AFTER_PROMPT

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            {
              type: 'image_url',
              image_url: { url: beforeUrl, detail: 'high' },
            },
            {
              type: 'image_url',
              image_url: { url: afterUrl, detail: 'high' },
            },
          ],
        },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 1500,
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      return {
        success: false,
        summary: 'Failed to compare photos - no response from AI',
        changeDetected: false,
        improvements: [],
        remainingIssues: [],
        qualityAssessment: 'needs_work',
        confidence: 0,
      }
    }

    const comparison = JSON.parse(content) as Omit<BeforeAfterComparison, 'success'>

    logger.info('Before/after comparison complete', {
      changeDetected: comparison.changeDetected,
      quality: comparison.qualityAssessment,
    })

    return {
      success: true,
      ...comparison,
    }
  } catch (error) {
    logger.error('Failed to compare photos', { error })
    return {
      success: false,
      summary: `Comparison failed: ${(error as Error).message}`,
      changeDetected: false,
      improvements: [],
      remainingIssues: [],
      qualityAssessment: 'needs_work',
      confidence: 0,
    }
  }
}

/**
 * Generate a rough estimate from photo
 */
export async function estimateFromPhoto(
  imageUrl: string,
  propertyInfo?: {
    address?: string
    roofType?: string
    knownSquareFootage?: number
  }
): Promise<PhotoEstimate> {
  const openai = createOpenAIClient()

  try {
    let contextInfo = ''
    if (propertyInfo) {
      const parts: string[] = []
      if (propertyInfo.address) parts.push(`Address: ${propertyInfo.address}`)
      if (propertyInfo.roofType) parts.push(`Roof type: ${propertyInfo.roofType}`)
      if (propertyInfo.knownSquareFootage) {
        parts.push(`Known square footage: ${propertyInfo.knownSquareFootage} sq ft`)
      }
      if (parts.length > 0) {
        contextInfo = `\n\nProperty information:\n${parts.join('\n')}`
      }
    }

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: ESTIMATE_PROMPT + contextInfo },
            {
              type: 'image_url',
              image_url: { url: imageUrl, detail: 'high' },
            },
          ],
        },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 1500,
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      return {
        success: false,
        summary: 'Failed to generate estimate - no response from AI',
        estimatedSquares: null,
        damagePercentage: null,
        repairTypes: [],
        urgency: 'routine',
        confidence: 0,
        caveats: ['AI analysis failed'],
      }
    }

    const estimate = JSON.parse(content) as Omit<PhotoEstimate, 'success'>

    logger.info('Photo estimate generated', {
      squares: estimate.estimatedSquares,
      urgency: estimate.urgency,
      confidence: estimate.confidence,
    })

    return {
      success: true,
      ...estimate,
    }
  } catch (error) {
    logger.error('Failed to generate estimate from photo', { error })
    return {
      success: false,
      summary: `Estimate failed: ${(error as Error).message}`,
      estimatedSquares: null,
      damagePercentage: null,
      repairTypes: [],
      urgency: 'routine',
      confidence: 0,
      caveats: ['Analysis encountered an error'],
    }
  }
}

/**
 * Analyze multiple photos together for a comprehensive assessment
 */
export async function analyzePhotoSet(
  imageUrls: string[],
  context?: {
    projectType?: string
    inspectionReason?: string
  }
): Promise<PhotoAnalysisResult> {
  const openai = createOpenAIClient()

  if (imageUrls.length === 0) {
    return {
      success: false,
      summary: 'No photos provided for analysis',
      damages: [],
      materials: [],
      hazards: [],
      roofSections: [],
      insuranceClaimWorthy: false,
      estimatedRepairScope: 'minor',
      confidence: 0,
    }
  }

  // Limit to 5 photos to stay within token limits
  const photosToAnalyze = imageUrls.slice(0, 5)

  try {
    let contextInfo = ''
    if (context) {
      const parts: string[] = []
      if (context.projectType) parts.push(`Project type: ${context.projectType}`)
      if (context.inspectionReason) parts.push(`Inspection reason: ${context.inspectionReason}`)
      if (parts.length > 0) {
        contextInfo = `\n\nContext:\n${parts.join('\n')}`
      }
    }

    const imageContents: OpenAI.Chat.ChatCompletionContentPart[] = photosToAnalyze.map(url => ({
      type: 'image_url' as const,
      image_url: { url, detail: 'high' as const },
    }))

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `${DAMAGE_ANALYSIS_PROMPT}${contextInfo}\n\nAnalyze all ${photosToAnalyze.length} photos together and provide a comprehensive assessment.`,
            },
            ...imageContents,
          ],
        },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 3000,
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      return {
        success: false,
        summary: 'Failed to analyze photos - no response from AI',
        damages: [],
        materials: [],
        hazards: [],
        roofSections: [],
        insuranceClaimWorthy: false,
        estimatedRepairScope: 'minor',
        confidence: 0,
      }
    }

    const analysis = JSON.parse(content) as Omit<PhotoAnalysisResult, 'success' | 'rawAnalysis'>

    logger.info('Photo set analyzed', {
      photoCount: photosToAnalyze.length,
      damageCount: analysis.damages?.length || 0,
      confidence: analysis.confidence,
    })

    return {
      success: true,
      ...analysis,
      rawAnalysis: content,
    }
  } catch (error) {
    logger.error('Failed to analyze photo set', { error, photoCount: imageUrls.length })
    return {
      success: false,
      summary: `Analysis failed: ${(error as Error).message}`,
      damages: [],
      materials: [],
      hazards: [],
      roofSections: [],
      insuranceClaimWorthy: false,
      estimatedRepairScope: 'minor',
      confidence: 0,
    }
  }
}
