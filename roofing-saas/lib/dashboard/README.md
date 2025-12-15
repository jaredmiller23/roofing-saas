# Custom Dashboard Builder

A comprehensive dashboard builder system for creating customizable, drag-and-drop dashboards with role-based templates and widget libraries.

## Features

- **Drag-and-Drop Interface**: Intuitive grid-based layout with drag-and-drop widget placement
- **Widget Library**: 20+ pre-built widgets including metrics, charts, lists, maps, calendars, and more
- **Custom Sizing**: Flexible widget sizing with configurable minimum/maximum dimensions
- **Dashboard Templates**: Pre-configured templates for different roles (Sales, Executive, Operations, Field Rep)
- **Role-Based Defaults**: Automatically assign default dashboards based on user roles
- **Real-time Updates**: Support for real-time data updates via Supabase subscriptions
- **Data Sources**: Multiple data source types (query, API, realtime, computed)
- **Export**: Export dashboards to PDF, PNG, CSV, or JSON formats
- **Responsive**: Mobile-friendly responsive grid layout

## Architecture

### Core Components

1. **Types** (`dashboard-types.ts`): Comprehensive TypeScript type definitions
2. **Engine** (`dashboard-engine.ts`): Core business logic for CRUD operations and data fetching
3. **Widget Registry** (`widget-registry.ts`): Central registry for all available widgets
4. **Templates** (`dashboard-templates.ts`): Pre-built dashboard templates

### React Components

1. **DashboardEditor**: Main editing interface with toolbar and widget management
2. **DashboardGrid**: Grid layout system with drag-and-drop support
3. **WidgetLibrary**: Searchable widget catalog organized by category
4. **Widget Components**: Individual widget implementations (MetricCard, Charts, etc.)

## Usage

### Creating a New Dashboard

```typescript
import { createDashboard } from '@/lib/dashboard'

const dashboard = await createDashboard({
  name: 'My Dashboard',
  description: 'Custom sales dashboard',
  visibility: 'team',
  role_based: false,
  layout: {
    type: 'grid',
    columns: 12,
    rowHeight: 80,
    gap: 16,
    responsive: true,
  },
  widgets: [],
})
```

### Adding a Widget

```typescript
import { addWidget } from '@/lib/dashboard'

await addWidget(dashboardId, {
  type: 'metric_card',
  title: 'Total Revenue',
  position: { x: 0, y: 0 },
  size: { width: 3, height: 2, resizable: true },
  config: {
    type: 'metric_card',
    metric: 'total_revenue',
    format: 'currency',
    trend: {
      enabled: true,
      comparison_period: 'previous_month',
      show_percentage: true,
      show_arrow: true,
    },
  },
  enabled: true,
})
```

### Using the Dashboard Editor

```tsx
import { DashboardEditor } from '@/components/dashboard'

function MyPage() {
  return (
    <DashboardEditor
      dashboard={existingDashboard}
      onSave={(dashboard) => console.log('Saved:', dashboard)}
      onCancel={() => router.back()}
    />
  )
}
```

### Fetching Widget Data

```typescript
import { fetchWidgetData } from '@/lib/dashboard'

const widget = {
  id: 'widget_1',
  type: 'metric_card',
  data_source: {
    type: 'query',
    config: {
      type: 'query',
      entity: 'projects',
      fields: ['value'],
      aggregations: [
        {
          field: 'value',
          function: 'sum',
          alias: 'total_revenue',
        },
      ],
    },
  },
  // ... other widget properties
}

const data = await fetchWidgetData(widget)
```

## Available Widgets

### Metrics
- **Metric Card**: Single KPI with trend and goal tracking
- **Progress Bar**: Horizontal progress indicator
- **Progress Ring**: Circular progress indicator

### Charts
- **Bar Chart**: Vertical or horizontal bars
- **Line Chart**: Trend lines over time
- **Pie Chart**: Proportional data visualization
- **Area Chart**: Cumulative area graphs
- **Scatter Chart**: X/Y coordinate plotting

### Lists & Tables
- **Recent Items**: Latest records
- **Top Items**: Ranked/sorted lists
- **Data Table**: Full-featured sortable, filterable table

### Maps
- **Map with Pins**: Location markers
- **Heatmap**: Density visualization

### Calendar & Activity
- **Calendar**: Event scheduling view
- **Activity Feed**: Recent activity timeline
- **Task Summary**: Task overview by status/priority

### Performance
- **Leaderboard**: User/team rankings
- **Revenue Forecast**: Predictive analytics
- **Pipeline Funnel**: Conversion visualization
- **Team Performance**: Multi-metric comparison

### Custom
- **Weather Widget**: Weather and storm tracking
- **Custom iframe**: External content embed
- **Custom HTML**: Custom HTML/CSS content

## Widget Configuration

Each widget type has its own configuration schema. Example for Metric Card:

```typescript
{
  type: 'metric_card',
  metric: 'total_revenue',      // Field to display
  format: 'currency',            // number | currency | percentage | duration
  prefix: '$',                   // Optional prefix
  suffix: '',                    // Optional suffix
  trend: {
    enabled: true,
    comparison_period: 'previous_month',
    show_percentage: true,
    show_arrow: true,
  },
  icon: 'DollarSign',
  color: '#10b981',
  goal: {
    enabled: true,
    target: 100000,
    show_progress: true,
  }
}
```

## Dashboard Templates

### Sales Dashboard
- Revenue metrics
- Pipeline funnel
- Recent deals
- Sales leaderboard

### Executive Dashboard
- High-level KPIs
- Revenue forecast
- Team performance
- Strategic metrics

### Operations Dashboard
- Active jobs
- Job calendar
- Location map
- Task summary

### Field Rep Dashboard
- Daily tasks
- Territory map
- Activity feed
- Weather widget

## Data Sources

### Query Data Source
Fetch data from Supabase tables:

```typescript
{
  type: 'query',
  config: {
    type: 'query',
    entity: 'contacts',
    fields: ['id', 'name', 'status'],
    filters: [
      { field: 'status', operator: 'equals', value: 'active' }
    ],
    order_by: [{ field: 'created_at', order: 'desc' }],
    limit: 10
  }
}
```

### API Data Source
Fetch from external APIs:

```typescript
{
  type: 'api',
  config: {
    type: 'api',
    endpoint: 'https://api.example.com/data',
    method: 'GET',
    headers: { 'Authorization': 'Bearer token' },
    transform: 'data => data.results'
  }
}
```

### Realtime Data Source
Subscribe to real-time updates:

```typescript
{
  type: 'realtime',
  config: {
    type: 'realtime',
    channel: 'projects',
    event: 'INSERT'
  }
}
```

## Permissions

Dashboard permissions are role-based:

- **can_view**: View dashboard
- **can_edit**: Modify widgets and layout
- **can_delete**: Remove dashboard
- **can_share**: Share with others
- **can_export**: Export data
- **can_create_template**: Save as template

## Database Schema

Required Supabase table:

```sql
CREATE TABLE dashboards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  visibility TEXT NOT NULL DEFAULT 'private',
  owner_id UUID NOT NULL REFERENCES users(id),
  role_based BOOLEAN DEFAULT FALSE,
  target_roles TEXT[],
  is_default BOOLEAN DEFAULT FALSE,
  is_template BOOLEAN DEFAULT FALSE,
  template_category TEXT,
  layout JSONB NOT NULL,
  widgets JSONB NOT NULL DEFAULT '[]',
  settings JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  last_modified_by UUID REFERENCES users(id)
);
```

## Future Enhancements

- [ ] Widget marketplace for custom widgets
- [ ] Advanced filtering and drill-down
- [ ] Scheduled email reports
- [ ] Mobile app support
- [ ] AI-powered widget recommendations
- [ ] Dashboard versioning
- [ ] Collaborative editing
- [ ] Advanced analytics and insights

## Contributing

To add a new widget:

1. Define the widget configuration type in `dashboard-types.ts`
2. Register the widget in `widget-registry.ts`
3. Create the widget component in `components/dashboard/widgets/`
4. Add the renderer to `components/dashboard/widgets/index.tsx`

## License

Proprietary - Roofing SaaS Platform
