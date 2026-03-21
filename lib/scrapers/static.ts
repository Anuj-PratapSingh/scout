import type { Opportunity } from '../types'
import data from './static_data.json'

// Curated static database sourced from the Live Radar spreadsheet.
// These are upserted on every cron run (URL is unique key, so safe to re-run).
// 105 project ideas, 50 swag/freebies, 110 curated job listings.

export function scrapeStaticDB(): Opportunity[] {
  const projects = (data.projects as Opportunity[])
  const swag = (data.swag as Opportunity[])
  const jobs = (data.jobs as Opportunity[])
  return [...projects, ...swag, ...jobs]
}
