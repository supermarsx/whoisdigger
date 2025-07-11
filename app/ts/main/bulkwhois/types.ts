export interface BulkWhoisInput {
  domains: string[];
  domainsPending: string[];
  tlds: string[];
  tldSeparator: string;
}

export interface BulkWhoisStats {
  domains: {
    processed: number;
    sent: number;
    waiting: number;
    total: number;
  };
  time: {
    current: string | null;
    remaining: string | null;
    counter: NodeJS.Timeout | null;
    currentcounter: number;
    remainingcounter: number;
  };
  reqtimes: {
    minimum: number;
    average: number | null;
    maximum: number | null;
    last: number | null;
  };
  status: {
    available: number;
    unavailable: number;
    error: number;
    percentavailable: string | null;
    percentunavailable: string | null;
    percenterror: string | null;
  };
  laststatus: {
    available: string | null;
    unavailable: string | null;
    error: string | null;
  };
}

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

export interface ProcessedResult {
  id: number;
  domain: string | null;
  status: string | null;
  registrar: string | null;
  company: string | null;
  updatedate: string | null;
  creationdate: string | null;
  expirydate: string | null;
  whoisreply: string | null;
  whoisjson: Record<string, unknown> | null;
  requesttime: string | number | null;
}

export interface BulkWhois {
  input: BulkWhoisInput;
  stats: BulkWhoisStats;
  results: BulkWhoisResults;
  processingIDs: NodeJS.Timeout[];
  domains: string[];
  default: {
    numericstart: number | null;
    others: string;
  };
}

export interface DomainSetup {
  domain?: string;
  index?: number;
  timebetween: number;
  follow: number;
  timeout: number;
}
