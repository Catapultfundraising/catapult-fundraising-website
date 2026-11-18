// Paired runtime now uses v3 mixed snapshots, not predecessor v2 presentation
// pages. The unchanged v2 foundation has its own focused test entrypoint.
// V3 composition retains history/detail/export/offgate coverage and adds
// actual edit/Void/public-command uncertainty recovery.
require("./test-pvas-native-v3-consumer.cjs");
