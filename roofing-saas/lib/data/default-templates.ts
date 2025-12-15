import {
  ProjectTemplate,
  DefaultTemplateId,
  TemplateStage,
  TemplateTask,
  TemplateMilestone
} from '@/lib/types/project-template'
import { PipelineStage } from '@/lib/types/api'

// ============================================
// Default Roofing Project Templates
// ============================================

/**
 * Residential Roof Replacement Template
 * Complete roof replacement for single-family homes
 */
const residentialRoofReplacementTasks: TemplateTask[] = [
  {
    name: 'Initial Property Assessment',
    description: 'Conduct thorough roof inspection and property assessment',
    estimated_duration_hours: 2,
    category: 'inspection',
    required_tools: ['ladder', 'measuring tape', 'camera', 'inspection checklist'],
    assigned_role: 'Inspector',
    notes: 'Document all existing damage and measurements'
  },
  {
    name: 'Insurance Inspection Coordination',
    description: 'Schedule and coordinate insurance adjuster visit',
    estimated_duration_hours: 1,
    category: 'documentation',
    assigned_role: 'Project Manager',
    dependencies: ['Initial Property Assessment']
  },
  {
    name: 'Material Ordering',
    description: 'Order all required roofing materials and supplies',
    estimated_duration_hours: 2,
    category: 'planning',
    assigned_role: 'Project Manager',
    dependencies: ['Insurance Inspection Coordination']
  },
  {
    name: 'Permit Applications',
    description: 'Submit building permits and obtain approvals',
    estimated_duration_hours: 3,
    category: 'documentation',
    assigned_role: 'Project Manager'
  },
  {
    name: 'Property Protection Setup',
    description: 'Set up tarps and protection for landscaping and property',
    estimated_duration_hours: 2,
    category: 'planning',
    assigned_role: 'Crew Lead',
    required_tools: ['tarps', 'plywood', 'magnetic sweeper']
  },
  {
    name: 'Old Roof Removal',
    description: 'Strip existing roofing materials down to deck',
    estimated_duration_hours: 8,
    category: 'installation',
    assigned_role: 'Crew Lead',
    required_tools: ['tear-off tools', 'dumpster', 'safety equipment']
  },
  {
    name: 'Deck Inspection and Repair',
    description: 'Inspect roof deck and replace damaged sections',
    estimated_duration_hours: 4,
    category: 'installation',
    assigned_role: 'Crew Lead',
    dependencies: ['Old Roof Removal']
  },
  {
    name: 'Underlayment Installation',
    description: 'Install ice and water shield and synthetic underlayment',
    estimated_duration_hours: 4,
    category: 'installation',
    assigned_role: 'Crew Lead',
    dependencies: ['Deck Inspection and Repair']
  },
  {
    name: 'Shingle Installation',
    description: 'Install new shingles according to manufacturer specifications',
    estimated_duration_hours: 12,
    category: 'installation',
    assigned_role: 'Crew Lead',
    dependencies: ['Underlayment Installation']
  },
  {
    name: 'Ridge and Hip Installation',
    description: 'Install ridge cap and hip shingles',
    estimated_duration_hours: 3,
    category: 'installation',
    assigned_role: 'Crew Lead',
    dependencies: ['Shingle Installation']
  },
  {
    name: 'Flashing and Ventilation',
    description: 'Install or repair flashing and ventilation systems',
    estimated_duration_hours: 4,
    category: 'installation',
    assigned_role: 'Crew Lead'
  },
  {
    name: 'Gutter Installation/Repair',
    description: 'Install new or repair existing gutters and downspouts',
    estimated_duration_hours: 4,
    category: 'installation',
    assigned_role: 'Crew Lead'
  },
  {
    name: 'Quality Control Inspection',
    description: 'Final inspection of completed work',
    estimated_duration_hours: 1,
    category: 'inspection',
    assigned_role: 'Inspector',
    dependencies: ['Shingle Installation', 'Ridge and Hip Installation', 'Flashing and Ventilation']
  },
  {
    name: 'Site Cleanup',
    description: 'Complete cleanup of property and removal of debris',
    estimated_duration_hours: 3,
    category: 'cleanup',
    assigned_role: 'Crew Lead',
    required_tools: ['magnetic sweeper', 'cleanup equipment']
  },
  {
    name: 'Final Customer Walkthrough',
    description: 'Walk through completed project with customer',
    estimated_duration_hours: 1,
    category: 'follow_up',
    assigned_role: 'Project Manager',
    dependencies: ['Quality Control Inspection', 'Site Cleanup']
  }
]

const residentialRoofReplacementMilestones: TemplateMilestone[] = [
  {
    name: 'Inspection Complete',
    description: 'Initial assessment and insurance coordination finished',
    criteria: ['Property assessed', 'Insurance adjuster visit completed', 'Estimate approved'],
    stage_completion_percentage: 15,
    payment_percentage: 10
  },
  {
    name: 'Materials and Permits Ready',
    description: 'All materials delivered and permits obtained',
    criteria: ['Materials delivered', 'Permits approved', 'Work scheduled'],
    stage_completion_percentage: 25,
    payment_percentage: 20
  },
  {
    name: 'Tear-off Complete',
    description: 'Old roof removed and deck prepared',
    criteria: ['Old materials removed', 'Deck inspected and repaired', 'Ready for new installation'],
    stage_completion_percentage: 40,
    payment_percentage: 30
  },
  {
    name: 'Installation 50% Complete',
    description: 'Underlayment and half of shingles installed',
    criteria: ['Underlayment complete', '50% of shingles installed', 'Weather protection secured'],
    stage_completion_percentage: 70,
    payment_percentage: 50
  },
  {
    name: 'Installation Complete',
    description: 'All roofing work finished',
    criteria: ['Shingles complete', 'Ridge cap installed', 'Flashing and ventilation complete'],
    stage_completion_percentage: 90,
    payment_percentage: 80
  },
  {
    name: 'Project Complete',
    description: 'Final inspection passed and cleanup complete',
    criteria: ['Quality inspection passed', 'Site cleaned', 'Customer approval'],
    stage_completion_percentage: 100,
    payment_percentage: 100,
    required_approvals: ['Customer', 'Quality Inspector']
  }
]

const residentialRoofReplacementStages: TemplateStage[] = [
  {
    name: 'Assessment & Planning',
    description: 'Property assessment, insurance coordination, and project planning',
    estimated_duration_days: 3,
    required_documents: ['Insurance claim', 'Property photos', 'Measurement report'],
    checklist_items: ['Property inspected', 'Insurance contacted', 'Permits applied for']
  },
  {
    name: 'Material Procurement',
    description: 'Order materials and obtain necessary permits',
    estimated_duration_days: 2,
    required_documents: ['Material specifications', 'Building permits'],
    checklist_items: ['Materials ordered', 'Permits obtained', 'Delivery scheduled']
  },
  {
    name: 'Roof Removal',
    description: 'Remove existing roofing materials',
    estimated_duration_days: 1,
    required_documents: ['Tear-off completion report'],
    checklist_items: ['Property protected', 'Old materials removed', 'Deck inspected']
  },
  {
    name: 'Installation',
    description: 'Install new roofing system',
    estimated_duration_days: 2,
    required_documents: ['Installation progress reports'],
    checklist_items: ['Underlayment installed', 'Shingles installed', 'Flashing complete']
  },
  {
    name: 'Completion',
    description: 'Final inspection and cleanup',
    estimated_duration_days: 1,
    required_documents: ['Final inspection report', 'Completion certificate'],
    checklist_items: ['Quality inspection passed', 'Site cleaned', 'Customer satisfied']
  }
]

/**
 * Commercial Roof Installation Template
 * New roof installation for commercial buildings
 */
const commercialRoofInstallationTasks: TemplateTask[] = [
  {
    name: 'Building Assessment',
    description: 'Comprehensive commercial building roof assessment',
    estimated_duration_hours: 4,
    category: 'inspection',
    assigned_role: 'Commercial Inspector',
    required_tools: ['structural assessment tools', 'commercial measurement equipment']
  },
  {
    name: 'Engineering Review',
    description: 'Structural engineering review and calculations',
    estimated_duration_hours: 8,
    category: 'planning',
    assigned_role: 'Engineer',
    dependencies: ['Building Assessment']
  },
  {
    name: 'Commercial Permits',
    description: 'Obtain commercial building permits and approvals',
    estimated_duration_hours: 6,
    category: 'documentation',
    assigned_role: 'Project Manager'
  },
  {
    name: 'Material Specification',
    description: 'Specify commercial-grade materials and systems',
    estimated_duration_hours: 4,
    category: 'planning',
    assigned_role: 'Project Manager',
    dependencies: ['Engineering Review']
  },
  {
    name: 'Safety Planning',
    description: 'Develop comprehensive safety plan for commercial work',
    estimated_duration_hours: 3,
    category: 'planning',
    assigned_role: 'Safety Manager'
  },
  {
    name: 'Roof System Installation',
    description: 'Install commercial roofing system',
    estimated_duration_hours: 40,
    category: 'installation',
    assigned_role: 'Commercial Crew Lead',
    dependencies: ['Engineering Review', 'Commercial Permits', 'Safety Planning']
  },
  {
    name: 'Membrane Installation',
    description: 'Install roofing membrane system',
    estimated_duration_hours: 24,
    category: 'installation',
    assigned_role: 'Membrane Specialist',
    dependencies: ['Roof System Installation']
  },
  {
    name: 'Insulation Installation',
    description: 'Install commercial roof insulation',
    estimated_duration_hours: 16,
    category: 'installation',
    assigned_role: 'Insulation Specialist'
  },
  {
    name: 'Third-Party Inspection',
    description: 'Independent quality assurance inspection',
    estimated_duration_hours: 2,
    category: 'inspection',
    assigned_role: 'Third-Party Inspector',
    dependencies: ['Membrane Installation', 'Insulation Installation']
  }
]

/**
 * Storm Damage Repair Template
 * Emergency repairs for storm-damaged roofs
 */
const stormDamageRepairTasks: TemplateTask[] = [
  {
    name: 'Emergency Assessment',
    description: 'Rapid assessment of storm damage',
    estimated_duration_hours: 1,
    category: 'inspection',
    assigned_role: 'Emergency Inspector',
    required_tools: ['emergency kit', 'camera', 'measurement tools']
  },
  {
    name: 'Temporary Repairs',
    description: 'Install temporary protective measures',
    estimated_duration_hours: 3,
    category: 'installation',
    assigned_role: 'Emergency Crew',
    dependencies: ['Emergency Assessment'],
    required_tools: ['tarps', 'emergency repair materials']
  },
  {
    name: 'Insurance Documentation',
    description: 'Document damage for insurance claim',
    estimated_duration_hours: 2,
    category: 'documentation',
    assigned_role: 'Claims Specialist',
    dependencies: ['Emergency Assessment']
  },
  {
    name: 'Permanent Repairs',
    description: 'Complete permanent storm damage repairs',
    estimated_duration_hours: 12,
    category: 'installation',
    assigned_role: 'Repair Specialist',
    dependencies: ['Temporary Repairs', 'Insurance Documentation']
  }
]

/**
 * Roof Inspection Template
 * Comprehensive roof inspection service
 */
const roofInspectionTasks: TemplateTask[] = [
  {
    name: 'Exterior Inspection',
    description: 'Comprehensive exterior roof inspection',
    estimated_duration_hours: 2,
    category: 'inspection',
    assigned_role: 'Certified Inspector',
    required_tools: ['inspection checklist', 'camera', 'measuring tools', 'ladder']
  },
  {
    name: 'Interior Inspection',
    description: 'Inspect interior for signs of damage or leaks',
    estimated_duration_hours: 1,
    category: 'inspection',
    assigned_role: 'Certified Inspector',
    dependencies: ['Exterior Inspection']
  },
  {
    name: 'Detailed Report Creation',
    description: 'Compile comprehensive inspection report',
    estimated_duration_hours: 2,
    category: 'documentation',
    assigned_role: 'Certified Inspector',
    dependencies: ['Exterior Inspection', 'Interior Inspection']
  },
  {
    name: 'Customer Presentation',
    description: 'Present findings and recommendations to customer',
    estimated_duration_hours: 1,
    category: 'follow_up',
    assigned_role: 'Certified Inspector',
    dependencies: ['Detailed Report Creation']
  }
]

// Create the default templates
export const DEFAULT_TEMPLATES: Record<DefaultTemplateId, Omit<ProjectTemplate, 'id' | 'tenant_id' | 'created_at' | 'updated_at' | 'usage_count' | 'last_used_at'>> = {
  'residential-roof-replacement': {
    name: 'Residential Roof Replacement',
    description: 'Complete roof replacement for single-family homes including tear-off, installation, and cleanup',
    template_type: 'system',
    default_template_id: 'residential-roof-replacement',
    is_active: true,
    is_default: true,
    version: 1,
    default_pipeline_stage: 'qualified' as PipelineStage,
    default_priority: 'normal',
    estimated_duration_days: 5,
    estimated_budget_range: {
      min: 8000,
      max: 25000
    },
    stages: residentialRoofReplacementStages,
    tasks: residentialRoofReplacementTasks,
    milestones: residentialRoofReplacementMilestones,
    default_fields: {
      name_pattern: '{customer_name} - Roof Replacement',
      description: 'Complete residential roof replacement project',
      notes: 'Standard residential roof replacement following industry best practices'
    },
    document_checklist: [
      'Insurance claim documentation',
      'Building permits',
      'Material specifications',
      'Safety plan',
      'Before photos',
      'Progress photos',
      'Completion photos',
      'Final inspection report',
      'Warranty documentation'
    ],
    required_photos: [
      'Front elevation',
      'Rear elevation',
      'Left side elevation',
      'Right side elevation',
      'Existing damage areas',
      'Roof details',
      'Gutters and downspouts'
    ],
    default_assignments: {
      project_manager: 'auto_assign',
      sales_rep: 'originating_user',
      crew_lead: 'auto_assign'
    }
  },

  'commercial-roof-installation': {
    name: 'Commercial Roof Installation',
    description: 'New commercial roof installation with engineering review and commercial-grade materials',
    template_type: 'system',
    default_template_id: 'commercial-roof-installation',
    is_active: true,
    is_default: false,
    version: 1,
    default_pipeline_stage: 'qualified' as PipelineStage,
    default_priority: 'high',
    estimated_duration_days: 10,
    estimated_budget_range: {
      min: 25000,
      max: 150000
    },
    stages: [
      {
        name: 'Engineering & Planning',
        description: 'Engineering review, permits, and detailed planning',
        estimated_duration_days: 4,
        required_documents: ['Engineering report', 'Commercial permits', 'Safety plan'],
        checklist_items: ['Building assessed', 'Engineering approved', 'Permits obtained']
      },
      {
        name: 'Installation',
        description: 'Commercial roof system installation',
        estimated_duration_days: 5,
        required_documents: ['Installation reports', 'Quality control checklists'],
        checklist_items: ['Safety protocols active', 'Materials installed', 'Systems operational']
      },
      {
        name: 'Quality Assurance',
        description: 'Third-party inspection and final approval',
        estimated_duration_days: 1,
        required_documents: ['Third-party inspection report', 'Warranty certificates'],
        checklist_items: ['Third-party inspection passed', 'Warranties issued', 'Customer approved']
      }
    ],
    tasks: commercialRoofInstallationTasks,
    milestones: [
      {
        name: 'Engineering Complete',
        description: 'Engineering review and permits obtained',
        criteria: ['Engineering approved', 'Permits obtained', 'Safety plan approved'],
        stage_completion_percentage: 30,
        payment_percentage: 25
      },
      {
        name: 'Installation 50% Complete',
        description: 'Half of installation work finished',
        criteria: ['50% of roof installed', 'Safety protocols maintained'],
        stage_completion_percentage: 60,
        payment_percentage: 50
      },
      {
        name: 'Project Complete',
        description: 'Installation complete with third-party approval',
        criteria: ['Installation complete', 'Third-party inspection passed', 'Warranties issued'],
        stage_completion_percentage: 100,
        payment_percentage: 100,
        required_approvals: ['Third-Party Inspector', 'Customer']
      }
    ],
    default_fields: {
      name_pattern: '{customer_name} - Commercial Roof Installation',
      description: 'Commercial roof installation project',
      notes: 'Commercial project requiring engineering oversight and specialized materials'
    },
    document_checklist: [
      'Engineering review',
      'Commercial permits',
      'Safety plan',
      'Material specifications',
      'Installation procedures',
      'Quality control checklists',
      'Third-party inspection reports',
      'Warranty documentation',
      'Completion certificates'
    ],
    required_photos: [
      'Building overview',
      'Existing roof condition',
      'Installation progress',
      'Completed installation',
      'Quality control points'
    ]
  },

  'storm-damage-repair': {
    name: 'Storm Damage Repair',
    description: 'Emergency storm damage assessment and repair services',
    template_type: 'system',
    default_template_id: 'storm-damage-repair',
    is_active: true,
    is_default: false,
    version: 1,
    default_pipeline_stage: 'prospect' as PipelineStage,
    default_priority: 'urgent',
    estimated_duration_days: 3,
    estimated_budget_range: {
      min: 2000,
      max: 15000
    },
    stages: [
      {
        name: 'Emergency Response',
        description: 'Rapid assessment and temporary protection',
        estimated_duration_days: 1,
        required_documents: ['Emergency assessment report', 'Temporary repair documentation'],
        checklist_items: ['Property secured', 'Damage documented', 'Insurance contacted']
      },
      {
        name: 'Permanent Repairs',
        description: 'Complete permanent storm damage repairs',
        estimated_duration_days: 2,
        required_documents: ['Repair documentation', 'Final inspection report'],
        checklist_items: ['Repairs complete', 'Quality verified', 'Customer approved']
      }
    ],
    tasks: stormDamageRepairTasks,
    milestones: [
      {
        name: 'Emergency Secured',
        description: 'Property protected from further damage',
        criteria: ['Damage assessed', 'Temporary repairs complete', 'Property secured'],
        stage_completion_percentage: 40,
        payment_percentage: 30
      },
      {
        name: 'Repairs Complete',
        description: 'All storm damage permanently repaired',
        criteria: ['Permanent repairs complete', 'Quality inspection passed'],
        stage_completion_percentage: 100,
        payment_percentage: 100
      }
    ],
    default_fields: {
      name_pattern: '{customer_name} - Storm Damage Repair',
      description: 'Emergency storm damage repair project',
      notes: 'Priority emergency repair - expedited processing required'
    },
    document_checklist: [
      'Emergency assessment report',
      'Storm damage photos',
      'Insurance claim documentation',
      'Temporary repair documentation',
      'Permanent repair specifications',
      'Completion documentation'
    ],
    required_photos: [
      'Storm damage overview',
      'Specific damage areas',
      'Temporary repairs',
      'Completed permanent repairs'
    ]
  },

  'roof-inspection': {
    name: 'Roof Inspection',
    description: 'Comprehensive roof inspection and reporting service',
    template_type: 'system',
    default_template_id: 'roof-inspection',
    is_active: true,
    is_default: false,
    version: 1,
    default_pipeline_stage: 'prospect' as PipelineStage,
    default_priority: 'normal',
    estimated_duration_days: 1,
    estimated_budget_range: {
      min: 200,
      max: 500
    },
    stages: [
      {
        name: 'Inspection',
        description: 'Complete roof inspection process',
        estimated_duration_days: 1,
        required_documents: ['Inspection report', 'Photo documentation'],
        checklist_items: ['Exterior inspected', 'Interior checked', 'Report completed']
      }
    ],
    tasks: roofInspectionTasks,
    milestones: [
      {
        name: 'Inspection Complete',
        description: 'Roof inspection completed and reported',
        criteria: ['Inspection performed', 'Report generated', 'Customer presented'],
        stage_completion_percentage: 100,
        payment_percentage: 100
      }
    ],
    default_fields: {
      name_pattern: '{customer_name} - Roof Inspection',
      description: 'Comprehensive roof inspection service',
      notes: 'Detailed inspection to assess roof condition and identify issues'
    },
    document_checklist: [
      'Inspection checklist',
      'Detailed inspection report',
      'Photo documentation',
      'Recommendations report'
    ],
    required_photos: [
      'Roof overview',
      'Problem areas',
      'Flashing details',
      'Gutter condition',
      'Ventilation systems'
    ]
  },

  'insurance-claim-project': {
    name: 'Insurance Claim Project',
    description: 'Insurance claim-driven roof project with adjuster coordination',
    template_type: 'system',
    default_template_id: 'insurance-claim-project',
    is_active: true,
    is_default: false,
    version: 1,
    default_pipeline_stage: 'prospect' as PipelineStage,
    default_priority: 'high',
    estimated_duration_days: 7,
    estimated_budget_range: {
      min: 8000,
      max: 30000
    },
    stages: [
      {
        name: 'Claims Processing',
        description: 'Insurance adjuster coordination and claim processing',
        estimated_duration_days: 3,
        required_documents: ['Insurance claim', 'Adjuster report', 'Approved estimate'],
        checklist_items: ['Adjuster met', 'Claim approved', 'Scope agreed']
      },
      {
        name: 'Project Execution',
        description: 'Complete approved roofing work',
        estimated_duration_days: 4,
        required_documents: ['Progress reports', 'Completion documentation'],
        checklist_items: ['Work completed per scope', 'Quality verified', 'Insurance satisfied']
      }
    ],
    tasks: [
      ...residentialRoofReplacementTasks.slice(0, 3), // Include first few tasks
      {
        name: 'Adjuster Coordination',
        description: 'Coordinate with insurance adjuster throughout project',
        estimated_duration_hours: 4,
        category: 'documentation',
        assigned_role: 'Claims Specialist'
      },
      ...residentialRoofReplacementTasks.slice(3) // Include remaining tasks
    ],
    milestones: [
      {
        name: 'Claim Approved',
        description: 'Insurance claim approved and project authorized',
        criteria: ['Adjuster inspection complete', 'Claim approved', 'Project authorized'],
        stage_completion_percentage: 30,
        payment_percentage: 0
      },
      ...residentialRoofReplacementMilestones.slice(1) // Include other milestones
    ],
    default_fields: {
      name_pattern: '{customer_name} - Insurance Claim Project',
      description: 'Insurance claim roofing project',
      notes: 'Project proceeding under insurance claim - follow claim requirements'
    },
    document_checklist: [
      'Insurance claim documentation',
      'Adjuster inspection report',
      'Approved estimate',
      'Claim settlement documentation',
      'Progress reports to insurance',
      'Completion documentation for claim closure'
    ]
  },

  'emergency-repair': {
    name: 'Emergency Repair',
    description: 'Immediate emergency roof repairs for active leaks or damage',
    template_type: 'system',
    default_template_id: 'emergency-repair',
    is_active: true,
    is_default: false,
    version: 1,
    default_pipeline_stage: 'prospect' as PipelineStage,
    default_priority: 'urgent',
    estimated_duration_days: 1,
    estimated_budget_range: {
      min: 500,
      max: 3000
    },
    stages: [
      {
        name: 'Emergency Response',
        description: 'Immediate emergency repair response',
        estimated_duration_days: 1,
        required_documents: ['Emergency repair documentation'],
        checklist_items: ['Emergency contained', 'Temporary fix applied', 'Follow-up scheduled']
      }
    ],
    tasks: [
      {
        name: 'Emergency Response Call',
        description: 'Immediate response to emergency roof leak or damage',
        estimated_duration_hours: 0.5,
        category: 'inspection',
        assigned_role: 'Emergency Technician'
      },
      {
        name: 'Emergency Assessment',
        description: 'Quick assessment of emergency situation',
        estimated_duration_hours: 0.5,
        category: 'inspection',
        assigned_role: 'Emergency Technician',
        dependencies: ['Emergency Response Call']
      },
      {
        name: 'Immediate Repair',
        description: 'Apply immediate fix to stop damage',
        estimated_duration_hours: 2,
        category: 'installation',
        assigned_role: 'Emergency Technician',
        dependencies: ['Emergency Assessment'],
        required_tools: ['emergency repair kit', 'tarps', 'sealants']
      },
      {
        name: 'Follow-up Scheduling',
        description: 'Schedule permanent repair solution',
        estimated_duration_hours: 0.5,
        category: 'follow_up',
        assigned_role: 'Emergency Technician',
        dependencies: ['Immediate Repair']
      }
    ],
    milestones: [
      {
        name: 'Emergency Contained',
        description: 'Emergency situation stabilized',
        criteria: ['Immediate damage stopped', 'Property protected', 'Follow-up arranged'],
        stage_completion_percentage: 100,
        payment_percentage: 100
      }
    ],
    default_fields: {
      name_pattern: '{customer_name} - Emergency Repair',
      description: 'Emergency roof repair service',
      notes: 'PRIORITY EMERGENCY - Immediate response required'
    },
    document_checklist: [
      'Emergency call log',
      'Emergency assessment photos',
      'Temporary repair documentation',
      'Follow-up recommendations'
    ],
    required_photos: [
      'Emergency damage',
      'Immediate repair applied',
      'Protected areas'
    ]
  }
}

/**
 * Helper function to create a project template from defaults
 */
export function createTemplateFromDefault(
  templateId: DefaultTemplateId,
  tenantId: string,
  userId?: string
): Omit<ProjectTemplate, 'usage_count' | 'last_used_at'> {
  const defaultTemplate = DEFAULT_TEMPLATES[templateId]

  return {
    id: `template_${templateId}_${Date.now()}`,
    tenant_id: tenantId,
    created_by: userId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...defaultTemplate
  }
}

/**
 * Get all available default templates
 */
export function getDefaultTemplates(): DefaultTemplateId[] {
  return Object.keys(DEFAULT_TEMPLATES) as DefaultTemplateId[]
}

/**
 * Get template by default ID
 */
export function getDefaultTemplate(templateId: DefaultTemplateId) {
  return DEFAULT_TEMPLATES[templateId]
}