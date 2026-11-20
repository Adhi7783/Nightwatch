/** Own-property lookup: prototype names are never executable actions or integrations. */
export function lookupOwn<T>(table: Record<string, T>, key: string): T | undefined {
  return Object.prototype.hasOwnProperty.call(table, key) ? table[key] : undefined
}

/** Fixed integration URL shape; never forwards arbitrary paths with an owner token. */
export function splitIntegrationEndpoint(endpoint: string) {
  const match = /^([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_-]+)$/.exec(endpoint)
  return match ? {name:match[1],endpoint:match[2],path:'/api/integrations/'+match[1]+'/'+match[2]} : null
}

export function integrationPath(name: string, endpoint: string) {
  const target = splitIntegrationEndpoint(name+'/'+endpoint)
  return target?.path ?? null
}
