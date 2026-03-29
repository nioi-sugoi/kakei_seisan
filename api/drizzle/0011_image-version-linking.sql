-- entry_images: entry_id を originalId → 最新バージョンの entries.id に更新
UPDATE entry_images
SET entry_id = (
  SELECT e.id FROM entries e
  WHERE e.original_id = entry_images.entry_id
  AND e.latest = 1
)
WHERE EXISTS (
  SELECT 1 FROM entries e
  WHERE e.original_id = entry_images.entry_id
  AND e.latest = 1
);

-- settlement_images: settlement_id を originalId → 最新バージョンの settlements.id に更新
UPDATE settlement_images
SET settlement_id = (
  SELECT s.id FROM settlements s
  WHERE s.original_id = settlement_images.settlement_id
  AND s.latest = 1
)
WHERE EXISTS (
  SELECT 1 FROM settlements s
  WHERE s.original_id = settlement_images.settlement_id
  AND s.latest = 1
);
