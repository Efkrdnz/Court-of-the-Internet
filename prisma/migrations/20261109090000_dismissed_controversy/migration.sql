-- Dismissed (below-quorum) cases are not "controversial", however their few votes split.
UPDATE "Case" SET "controversy" = 0 WHERE "verdict" = 'DISMISSED';
