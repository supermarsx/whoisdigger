export enum DomainStatus {
  Available = 'available',
  Unavailable = 'unavailable',
  Expired = 'expired',
  Error = 'error',
  ErrorNoContent = 'error:nocontent',
  ErrorUnauthorized = 'error:unauthorized',
  ErrorRateLimiting = 'error:ratelimiting',
  ErrorUnretrievable = 'error:unretrivable',
  ErrorForbidden = 'error:forbidden',
  ErrorReservedByRegulator = 'error:reservedbyregulator',
  ErrorUnregistrable = 'error:unregistrable',
  ErrorReplyError = 'error:replyerror',
  ErrorUnparsable = 'error:unparsable'
}

export default DomainStatus;
