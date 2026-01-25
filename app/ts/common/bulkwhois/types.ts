export interface BulkWhoisResults {
  id: number[];
  domain: (string | null)[];
  status: (string | null)[];
  registrar: (string | null)[];
  company: (string | null)[];
  updatedate: (string | null)[];
  creationdate: (string | null)[];
  expirydate: (string | null)[];
  whoisreply: (string | null)[];
  whoisjson: (Record<string, unknown> | null)[];
  requesttime: (string | number | null)[];
}
