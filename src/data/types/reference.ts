export interface GlossaryTerm {
  term: string;
  definition: string;
}

export interface ReferenceData {
  glossary: GlossaryTerm[];
}
