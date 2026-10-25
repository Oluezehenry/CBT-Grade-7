import { CURRICULUM_PART_1 } from './curriculum/curriculumPart1';
import { CURRICULUM_PART_2 } from './curriculum/curriculumPart2';
import { CURRICULUM_PART_3 } from './curriculum/curriculumPart3';

export interface SeedCurriculumDoc {
  id: string;
  title: string;
  subject: string;
  classTerm: string;
  description: string;
  originalFilename: string;
  fileType?: 'PDF' | 'DOCX' | 'TXT' | 'MD';
  storagePath?: string;
  rawText: string;
}

export const GRADE_7_CURRICULUM_DOCUMENTS: SeedCurriculumDoc[] = [
  ...CURRICULUM_PART_1,
  ...CURRICULUM_PART_2,
  ...CURRICULUM_PART_3,
];
