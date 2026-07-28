# Evidence pack does not ensure Source digests

Source digests are produced only during Source ingestion. Evidence pack consumes digests that are already ready when the Chat question is submitted; it must not generate or backfill digests mid-Chat. Missing digests fall through to coverage or chunk evidence. Chat-time ensure was rejected because it reopened Sources that were not digest-ready at submit time and duplicated ingestion lifecycle policy.
