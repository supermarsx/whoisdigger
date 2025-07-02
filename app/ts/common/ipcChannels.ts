export enum IpcChannel {
  BwLookup = 'bw:lookup',
  BwLookupPause = 'bw:lookup.pause',
  BwLookupContinue = 'bw:lookup.continue',
  BwLookupStop = 'bw:lookup.stop',
  BwInputFile = 'bw:input.file',
  BwInputWordlist = 'bw:input.wordlist',
  BwaInputFile = 'bwa:input.file',
  BwaAnalyserStart = 'bwa:analyser.start',
  ToInputFile = 'to:input.file',
  ToProcess = 'to:process',
  SingleWhoisLookup = 'singlewhois:lookup',
  ParseCsv = 'csv:parse',
  AvailabilityCheck = 'availability:check',
  DomainParameters = 'availability:params'
}
