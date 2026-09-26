-- Before TEMPLATE existed both modes shared WORK photos; a company already
-- in SITE_TEMPLATE mode uploaded its current ones for the template.
UPDATE "CompanyPhoto" p
SET "type" = 'TEMPLATE'
FROM "Company" c
WHERE p."companyId" = c."id"
  AND c."detailPageMode" = 'SITE_TEMPLATE'
  AND p."type" = 'WORK';
