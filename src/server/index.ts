import { Hono } from 'hono'
import { serveStatic } from 'hono/bun'
import { execSync } from 'child_process'
import { v4 as uuidv4 } from 'uuid'

const app = new Hono()

// Helper to run team-db commands
const db = (sql: string) => {
  try {
    const result = execSync(`team-db "${sql.replace(/"/g, '\\"')}"`).toString()
    return JSON.parse(result)
  } catch (e) {
    console.error('DB Error:', e)
    throw e
  }
}

// API Routes

// Get company config + pricing
app.get('/api/config/:slug', (c) => {
  const slug = c.req.param('slug')
  const companies = db(`SELECT * FROM companies WHERE slug = '${slug}'`)
  if (companies.length === 0) return c.json({ error: 'Company not found' }, 404)
  const company = companies[0]
  const pricing = db(`SELECT * FROM pricing_configs WHERE company_id = '${company.id}'`)
  return c.json({ company, pricing })
})

// Calculate price range for a given material and sqft
app.post('/api/pricing/calculate', async (c) => {
  const body = await c.req.json()
  const { company_id, material, footprint_sqft, pitch_label, stories } = body

  // Get pricing for this company and material
  const pricing = db(
    `SELECT * FROM pricing_configs WHERE company_id = '${company_id}' AND material = '${material}'`
  )
  
  if (pricing.length === 0) {
    // Default pricing if not configured
    const defaults: Record<string, { low: number; mid: number; high: number }> = {
      asphalt: { low: 350, mid: 450, high: 550 },
      metal: { low: 600, mid: 750, high: 900 },
      tile: { low: 700, mid: 900, high: 1100 },
      flat: { low: 400, mid: 525, high: 650 },
    }
    const p = defaults[material] || defaults.asphalt
    const pitchMultipliers: Record<string, number> = {
      flat: 1.05, low: 1.15, moderate: 1.25, steep: 1.45,
    }
    const multiplier = pitchMultipliers[pitch_label?.toLowerCase()] || 1.15
    const storiesMultiplier = 1 + (Number(stories) - 1) * 0.15
    const surfaceSqft = Number(footprint_sqft) * multiplier
    return c.json({
      price_low: Math.round(surfaceSqft / 100 * p.low * storiesMultiplier),
      price_mid: Math.round(surfaceSqft / 100 * p.mid * storiesMultiplier),
      price_high: Math.round(surfaceSqft / 100 * p.high * storiesMultiplier),
      roof_surface_sqft: Math.round(surfaceSqft),
      multiplier,
    })
  }

  const p = pricing[0]
  const pitchMultipliers: Record<string, number> = {
    flat: 1.05, low: 1.15, moderate: 1.25, steep: 1.45,
  }
  const multiplier = pitchMultipliers[pitch_label?.toLowerCase()] || 1.15
  const storiesMultiplier = 1 + (Number(stories) - 1) * 0.15
  const surfaceSqft = Number(footprint_sqft) * multiplier

  return c.json({
    price_low: Math.round(surfaceSqft / 100 * Number(p.price_low) * storiesMultiplier),
    price_mid: Math.round(surfaceSqft / 100 * Number(p.price_mid) * storiesMultiplier),
    price_high: Math.round(surfaceSqft / 100 * Number(p.price_high) * storiesMultiplier),
    roof_surface_sqft: Math.round(surfaceSqft),
    multiplier,
  })
})

// Create a new lead
app.post('/api/leads', async (c) => {
  const body = await c.req.json()
  const id = uuidv4()
  // Basic escaping for strings
  const esc = (s: any) => typeof s === 'string' ? s.replace(/'/g, "''") : s

  const {
    company_id, name, phone, email, address, lat, lng,
    polygons_json, footprint_sqft, roof_surface_sqft,
    pitch_label, pitch_degrees, stories, material,
    condition, price_range_low, price_range_high
  } = body

  db(`INSERT INTO leads (
    id, company_id, name, phone, email, address, lat, lng,
    polygons_json, footprint_sqft, roof_surface_sqft,
    pitch_label, pitch_degrees, stories, material,
    condition, price_range_low, price_range_high, status
  ) VALUES (
    '${esc(id)}', '${esc(company_id)}', '${esc(name)}', '${esc(phone)}', '${esc(email)}', '${esc(address)}', ${Number(lat)}, ${Number(lng)},
    '${esc(polygons_json)}', ${Number(footprint_sqft)}, ${Number(roof_surface_sqft)},
    '${esc(pitch_label)}', ${Number(pitch_degrees)}, ${Number(stories)}, '${esc(material)}',
    '${esc(condition)}', ${Number(price_range_low)}, ${Number(price_range_high)}, 'new'
  )`)

  return c.json({ success: true, lead_id: id })
})

// Get all leads for a company (simple auth in query param for now)
app.get('/api/leads/:company_id', (c) => {
  const companyId = c.req.param('company_id')
  const token = c.req.query('token')
  
  // Simple shared secret check
  if (token !== 'roofrange-admin-2026') {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  
  const leads = db(`SELECT * FROM leads WHERE company_id = '${companyId}' ORDER BY created_at DESC`)
  return c.json({ leads })
})

// Update lead status
app.patch('/api/leads/:id', async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json()
  const { status } = body
  
  const validStatuses = ['new', 'contacted', 'quoted', 'won', 'lost']
  if (!validStatuses.includes(status)) {
    return c.json({ error: 'Invalid status' }, 400)
  }
  
  db(`UPDATE leads SET status = '${status}' WHERE id = '${id}'`)
  return c.json({ success: true })
})

// ─── Admin API Routes ───

const ADMIN_TOKEN = 'roofrange-admin-2026'

function requireAdmin(c: any): boolean {
  const token = c.req.query('token') || c.req.json().token
  return token === ADMIN_TOKEN
}

// Admin login
app.post('/api/admin/login', async (c) => {
  const { password } = await c.req.json()
  if (password === 'admin123') {
    return c.json({ success: true, token: ADMIN_TOKEN })
  }
  return c.json({ error: 'Invalid password' }, 401)
})

// Update pricing configs
app.put('/api/admin/pricing', async (c) => {
  const body = await c.req.json()
  if (body.token !== ADMIN_TOKEN) return c.json({ error: 'Unauthorized' }, 401)

  const { pricing } = body
  const companyId = 'demo-company-id'

  for (const p of pricing) {
    const existing = db(`SELECT id FROM pricing_configs WHERE company_id = '${companyId}' AND material = '${p.material}'`)
    if (existing.length > 0) {
      db(`UPDATE pricing_configs SET price_low = ${Number(p.price_low)}, price_mid = ${Number(p.price_mid)}, price_high = ${Number(p.price_high)} WHERE company_id = '${companyId}' AND material = '${p.material}'`)
    } else {
      db(`INSERT INTO pricing_configs (id, company_id, material, price_low, price_mid, price_high) VALUES ('${uuidv4()}', '${companyId}', '${p.material}', ${Number(p.price_low)}, ${Number(p.price_mid)}, ${Number(p.price_high)})`)
    }
  }
  return c.json({ success: true })
})

// Update company branding
app.put('/api/admin/company', async (c) => {
  const body = await c.req.json()
  if (body.token !== ADMIN_TOKEN) return c.json({ error: 'Unauthorized' }, 401)

  const { name, primary_color, phone, disclaimer_text } = body
  const esc = (s: any) => typeof s === 'string' ? s.replace(/'/g, "''") : s

  db(`UPDATE companies SET name = '${esc(name)}', primary_color = '${esc(primary_color)}', phone = '${esc(phone)}', disclaimer_text = '${esc(disclaimer_text)}' WHERE slug = 'demo'`)

  return c.json({ success: true })
})

// Serve static assets from Vite build
app.use('/assets/*', serveStatic({ root: './dist/client' }))

// Serve index.html for all non-API routes (SPA)
app.get('*', (c) => {
  if (c.req.path.startsWith('/api')) return c.json({ error: 'Not found' }, 404)
  return serveStatic({ path: './dist/client/index.html' })(c)
})

if (import.meta.main) {
  const port = process.env.PORT || 3001
  console.log(`Server running on port ${port}`)
  Bun.serve({
    port,
    fetch: app.fetch
  })
}

export default app