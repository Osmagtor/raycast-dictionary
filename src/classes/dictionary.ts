interface Sense {
    definition: string;
    tags: string[];
    examples: string[];
    quotes: {
        text: string;
        reference: string;
    }[];
    synonyms: string[];
    antonyms: string[];
    translations: string[];
    subsenses: Sense[];
}

interface DictionaryEntry {
    word: string;
    entries: {
        language: {
            code: string;
            name: string;
        },
        partOfSpeech: string;
        pronunciations: {
            type: string;
            text: string;
            tags: string[];
        }[];
        forms: {
            word: string;
            tags: string[];
        }[];
        senses: Sense[];
    }[],
    source: {
        url: string;
        license: {
            name: string;
            url: string;
        }
    }
}

class Dictionary {

    private url: string = "https://freedictionaryapi.com/api/v1/entries";
    private urlWord: string = '';

    private language: string;
    private word: string;

    public get getURL(): string { return this.urlWord; }

    constructor(language: string, word: string) {
        this.language = language;
        this.word = word;
    }

    /**
     * Fetches a dictionary entry for the current word and language from the API.
     * On success, parses the response as a `DictionaryEntry` and updates the markdown
     * representation using `renderMarkdown`. If no definitions are found or an error occurs,
     * sets the markdown to a message indicating no definitions were found.
     * 
     * @return {Promise<string>} A promise that resolves to the markdown representation of the dictionary entry.
     */
    public async fetchEntry(): Promise<string> {

        let md: string;
        const res: Response = await fetch(`${this.url}/${this.language}/${this.word}`);

        if (res.ok) {
            const entry: DictionaryEntry = await res.json() as DictionaryEntry;
            md = this.renderMarkdown(entry);
        } else {
            md = `**No definitions found for ${this.word}**`;
        }

        return md;
    }

    /**
     * Generates a Markdown-formatted string representing the details of a dictionary entry.
     *
     * @param {DictionaryEntry} entry The dictionary entry to render as Markdown.
     * @returns {string} A Markdown string representing the entry.
     */
    private renderMarkdown(entry: DictionaryEntry): string {

        let md = '';

        // Title and Source

        md += `# ${entry.word.slice(0, 1).toUpperCase() + entry.word.slice(1)}\n`;

        this.urlWord = entry.source.url.replaceAll(' ', '%20');

        md += `Source: [${this.urlWord}](${this.urlWord})\n\n`;

        // Parts of Speech

        // Group entries by part of speech

        const groupedEntries: Record<string, { language: { code: string; name: string }; partOfSpeech: string; pronunciations: { type: string; text: string; tags: string[] }[]; forms: { word: string; tags: string[] }[]; senses: Sense[] }> = {};

        entry.entries.forEach((e) => {
            if (!groupedEntries[e.partOfSpeech]) groupedEntries[e.partOfSpeech] = { language: e.language, partOfSpeech: e.partOfSpeech, pronunciations: [], forms: [], senses: [] };
            groupedEntries[e.partOfSpeech].pronunciations.push(...e.pronunciations);
            groupedEntries[e.partOfSpeech].forms.push(...e.forms);
            groupedEntries[e.partOfSpeech].senses.push(...e.senses);
        });

        Object.values(groupedEntries).forEach((e) => {
            md += `## ${e.partOfSpeech.slice(0, 1).toUpperCase() + e.partOfSpeech.slice(1)}\n`;
            md += this.renderPronunciations(e.pronunciations);
            md += this.renderSenses(e.senses);
            md += this.renderForms(e.forms);
        });

        return md.replaceAll("..", ".");
    }

    /**
     * Generates a Markdown table representing pronunciations grouped by region and phonetic system.
     *
     * @param {Array<{ type: string; text: string; tags: string[] }>} pronunciations An array of pronunciation objects, each containing a type, text, and tags indicating regions.
     * @returns {string} A Markdown string containing a table of pronunciations grouped by region and phonetic system, or an empty string if no pronunciations are provided.
     */
    private renderPronunciations(pronunciations: { type: string; text: string; tags: string[] }[]): string {

        if (!pronunciations || !pronunciations.length) return "";

        // Group pronunciations by region (tags) and type

        const grouped: Record<string, { type: string, text: string[] }> = {};
        pronunciations.forEach(p => {
            if (p.tags.length) {
                p.tags.forEach((tag: string) => {
                    if (!grouped[tag]) grouped[tag] = { type: p.type, text: [] };
                    grouped[tag].text.push(p.text);
                });
            } else {
                if (!grouped["-"]) grouped["-"] = { type: p.type, text: [] };
                grouped["-"].text.push(p.text);
            }
        });

        if (!Object.entries(grouped).length) return "";

        // Render table of pronunciations

        let md = `| Dialect | Pronunciation | Phonetic System | \n|---|---|---|\n`;

        Object.entries(grouped).forEach(([region, group]) => {
            md += `| ${region} | ${group.text.join(", ")} | ${group.type} |\n`;
        });

        md += `\n\n`;

        return md;
    }

    /**
     * Renders the grammatical forms of a word as a Markdown string.
     *
     * For languages with complex conjugation systems, forms are grouped and displayed in tables by mood, tense, number, and person.
     * For other languages, forms are listed as bullet points.
     *
     * Invalid forms (those containing certain tags or keywords) are skipped.
     *
     * @param {Array<{ word: string; tags: string[] }>} forms An array of objects representing word forms, each with a `word` and an array of `tags` describing grammatical features.
     * @returns {string} A Markdown-formatted string representing the forms.
     */
    private renderForms(forms: { word: string; tags: string[] }[]): string {

        if (!forms || !forms.length) return "";

        let md = `### Forms\n`;

        const invalidTags: string[] = ['inflection-template', 'table-tags', 'class'];
        const complexConjugationsLanguages: string[] = ['ca', 'cs', 'fr', 'de', 'el', 'hu', 'it', 'la', 'pt', 'ro', 'ru', 'sh', 'es', 'nl'];
        const rows: string[] = [];

        // Languages with complex conjugation systems will have their forms grouped by mood, tense, number, and person in tables

        if (complexConjugationsLanguages.includes(this.language)) {

            const nonfiniteMoods: string[] = ['gerund', 'participle', 'infinitive'];
            const moods: string[] = ['indicative', 'subjunctive-i', 'subjunctive-ii', 'subjunctive', 'imperative'];
            const tenses: string[] = ['future-i', 'future-ii', 'present', 'imperfect', 'preterite', 'future', 'conditional', 'perfect', 'pluperfect', 'past perfect', 'future perfect', 'conditional perfect'];
            const numbers: string[] = ['singular', 'plural'];
            const persons: string[] = ['first-person', 'second-person', 'third-person'];

            const grouped: Record<string, Record<string, Record<string, Record<string, { word: string; tags: string[] }[]>>>> = {};

            forms.forEach(f => {

                // If the form has no tags, skip it

                if (!f.tags.length) return;

                // If the tags contain any invalid tags, skip this form

                if (f.tags.some(tag => invalidTags.includes(tag))) return;

                // If the word contains any tense, number, or person keywords, skip this form

                for (const t of tenses) {
                    if (f.word.includes(t.toLowerCase())) return;
                }

                for (const n of numbers) {
                    if (f.word.includes(n.toLowerCase())) return;
                }

                for (const p of persons) {
                    if (f.word.includes(p.toLowerCase())) return;
                }

                // Group the form by mood, tense, number, and person

                const mood: string = moods.find(m => f.tags.includes(m)) || (nonfiniteMoods.find(nm => f.tags.includes(nm)) ? "non-finite" : "indicative");
                const tense: string = tenses.find(t => f.tags.includes(t)) || "";
                const number: string = numbers.find(n => f.tags.includes(n)) || "";
                const person: string = persons.find(p => f.tags.includes(p)) || "";

                if (!grouped[mood]) grouped[mood] = {};
                if (!grouped[mood][tense]) grouped[mood][tense] = {};
                if (!grouped[mood][tense][number]) grouped[mood][tense][number] = {};
                if (!grouped[mood][tense][number][person]) grouped[mood][tense][number][person] = [];

                grouped[mood][tense][number][person].push(f);
            });

            Object.entries(grouped).forEach(([mood, tensesObj]) => {

                const nonFinite: boolean = mood === 'non-finite';

                md += `#### ${nonFinite ? "Non-finite forms" : `Mood: ${mood}`}\n`;
                if (nonFinite) md += `| Name | Form |\n|---|---|\n`;

                Object.entries(tensesObj).forEach(([tense, numbersObj]) => {

                    // Non-finite forms don't have tense, number, or person, so they are rendered in a single table

                    if (nonFinite) {

                        if (tense && mood !== 'imperative') return;

                        Object.entries(numbersObj).forEach(([_, personsObj]) => {
                            Object.entries(personsObj).forEach(([_, formsArr]) => {
                                formsArr.forEach(f => {

                                    const row: string = `| ${f.tags.join(", ")} | ${f.word} |\n`;

                                    if (!rows.includes(row)) {
                                        md += row;
                                        rows.push(row);
                                    }
                                });
                            });
                        });

                        rows.length = 0;

                    } else {

                        if (!tense && mood !== 'imperative') return;

                        md += `##### Tense: ${tense || mood === 'imperative' ? "present" : ""}\n`;
                        md += `| Person & Number | Form |\n|---|---|\n`;

                        Object.entries(numbersObj).forEach(([number, personsObj]) => {
                            Object.entries(personsObj).forEach(([person, formsArr]) => {
                                formsArr.forEach(f => {

                                    const row: string = `| ${person} ${number} | ${f.word} |\n`;

                                    if (!rows.includes(row)) {
                                        md += row;
                                        rows.push(row);
                                    }
                                });
                            });
                        });

                        rows.length = 0;
                    }
                });

                md += `\n`;
            });

        } else {
            forms.forEach(f => {
                if (!f.tags.some(tag => invalidTags.includes(tag))) {
                    md += `- ${f.word} (${f.tags.join(", ")})\n`;
                }
            });
        }

        md += `\n\n`;

        return md;
    }

    /**
     * Generates a Markdown-formatted string representing the senses of a word.
     *
     * @param {Sense[]} senses An array of `Sense` objects, each representing a sense of the word.
     * @returns {string} A Markdown string containing the definitions, examples, quotes, synonyms, and antonyms for each sense.
     */
    private renderSenses(senses: Sense[]): string {

        if (!senses || !senses.length) return "";

        let md = `### Senses\n`;

        const renderSubsenses = (subsenses: Sense[], indent: number = 1): string => {

            let subMd = "";

            subsenses.forEach((s, idx, arr) => {

                const prefix = "    ".repeat(indent);
                subMd += `${prefix}${idx + 1}. ${s.definition}\n`;

                if (s.synonyms && s.synonyms.length) subMd += `${prefix}    - **Synonyms:** ${s.synonyms.join(", ")}\n`;
                if (s.antonyms && s.antonyms.length) subMd += `${prefix}    - **Antonyms:** ${s.antonyms.join(", ")}\n`;
                if (s.examples && s.examples.length) subMd += `${prefix}    - **Examples:** ${s.examples.join("; ")}\n`;
                if (s.quotes && s.quotes.length) {
                    s.quotes.forEach((q, i) => {
                        subMd += `${prefix}    - **Quote ${i + 1}:** ${q.text} - _${q.reference}_\n`;
                    });
                }
                if (s.subsenses && s.subsenses.length) {
                    subMd += renderSubsenses(s.subsenses, indent + 1);
                }

                if (idx + 1 === arr.length) subMd += `\n`;
            });

            return subMd;
        };

        senses.forEach((t, j, arr) => {
            md += `${j + 1}. ${t.definition}\n`;
            if (t.examples && t.examples.length) md += `    - **Examples:** ${t.examples.join("; ")}\n`;
            if (t.quotes && t.quotes.length) {
                t.quotes.forEach((q, i) => {
                    md += `    - **Quote ${i + 1}:** ${q.text} - _${q.reference}_\n`;
                });
            }
            if (t.synonyms && t.synonyms.length) md += `    - **Synonyms:** ${t.synonyms.join(", ")}\n`;
            if (t.antonyms && t.antonyms.length) md += `    - **Antonyms:** ${t.antonyms.join(", ")}\n`;
            if (t.subsenses && t.subsenses.length) {
                md += renderSubsenses(t.subsenses, 2);
            }
            if (j + 1 === arr.length) md += `\n\n`;
        });

        return md;
    }
}

export default Dictionary;