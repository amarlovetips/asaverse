ALTER TABLE public.character_designs
DROP CONSTRAINT character_designs_design_type_check,
ADD CONSTRAINT character_designs_design_type_check
CHECK (design_type = ANY (ARRAY[
  'face',
  'hair',
  'body',
  'outfit',
  'facial-hair',
  'back-side',
  'clothing',
  'base-body'
]::text[]))
NOT VALID;

ALTER TABLE public.character_designs
VALIDATE CONSTRAINT character_designs_design_type_check;
