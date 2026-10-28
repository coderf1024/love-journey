const OSS_CONFIG = {
  region: 'oss-cn-beijing',
  bucket: 'love-config',
  ak: 'fG5XUXVnNF1ta1tlb1VZZlRRW1F0VVtSM1lXVkVVSVc=',
  sk: 'N0Q0Z3lFS1A2XEpSe1RYV0ZdWFBHWXBVXHM2VntnWFo0SHBZc2dvZQ==',
  // legacy monolith — kept as the source for scripts/migrate-storage.js only
  configPath: 'love-journey/config.json',
  // new document store root (production)
  dbRoot: 'love-journey/db',
  // local/private-host testing root; never selected on the public site
  testDbRoot: 'love-journey/db-test',
  testUploadsRoot: 'love-journey/uploads-test',
  adminPasscode: '0814'
};
