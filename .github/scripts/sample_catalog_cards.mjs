import assert from 'node:assert/strict';
import { mkdirSync, renameSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

export const PATTERNS = [
    { id: 'just-the-basics', displayName: 'Just the basics' },
    { id: 'tools-mcp-skills', displayName: 'Tools, MCP & Skills' },
    { id: 'knowledge-rag-memory', displayName: 'Knowledge, RAG & Memory' },
    { id: 'files-documents', displayName: 'Files & Documents' },
    { id: 'human-in-the-loop-async-events', displayName: 'Human-in-the-Loop, Async & Events' },
    { id: 'multi-agent-orchestration', displayName: 'Multi-Agent & Orchestration' },
    { id: 'browser-computer-use', displayName: 'Browser & Computer Use' },
    { id: 'other-sdks-adapters', displayName: 'Other SDKs & Adapters' },
    { id: 'observability-tracing', displayName: 'Observability & Tracing' },
    { id: 'security-governance-ops', displayName: 'Security, Governance & Ops' },
    { id: 'agent-optimization', displayName: 'Agent Optimization' },
    { id: 'teams-m365-channel', displayName: 'Teams / M365 Channel' },
    { id: 'voice-realtime', displayName: 'Voice & Realtime' },
];

const DIMENSION_IDS = ['language', 'framework', 'protocol'];
const DETAIL_TEXT_FIELDS = [
    'summary', 'whatItDoes', 'whyUseIt', 'exampleScenario', 'bestFit', 'whatItGenerates',
];
const DETAIL_LIST_FIELDS = ['capabilities', 'requirements'];

function requireText(value, label) {
    assert.ok(typeof value === 'string' && value.trim().length > 0, `${label} must be non-empty text`);
    assert.ok(!/<\/?[a-z][^>]*>/i.test(value), `${label} must not contain HTML`);
}

function validateSource(source) {
    assert.ok(source && typeof source === 'object', 'Source catalog is required');
    assert.match(source.commitSha ?? '', /^[a-f0-9]{40}$/i, 'Use a full, pinned upstream commit SHA');
    assert.match(source.repo ?? '', /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/?$/, 'Invalid source repository');
    assert.ok(typeof source.generatedAt === 'string' && Number.isFinite(Date.parse(source.generatedAt)), 'Invalid generation time');
    assert.ok(Array.isArray(source.templates) && source.templates.length > 0, 'Source templates are required');
    requireText(source.templateSelection?.title, 'templateSelection.title');
    requireText(source.templateSelection?.placeholder, 'templateSelection.placeholder');

    const dimensionValues = new Map();
    for (const dimensionId of DIMENSION_IDS) {
        const dimension = source.dimensions?.[dimensionId];
        requireText(dimension?.title, `${dimensionId}.title`);
        requireText(dimension?.placeholder, `${dimensionId}.placeholder`);
        assert.ok(Array.isArray(dimension?.options) && dimension.options.length > 0, `Missing ${dimensionId} options`);
        const values = new Set();
        for (const option of dimension.options) {
            requireText(option.id, `${dimensionId} option ID`);
            requireText(option.displayName, `${dimensionId} option name`);
            assert.ok(!values.has(option.id), `Duplicate ${dimensionId} option: ${option.id}`);
            values.add(option.id);
        }
        dimensionValues.set(dimensionId, values);
    }

    const byPath = new Map();
    source.templates.forEach((template, index) => {
        requireText(template.path, 'template.path');
        assert.ok(template.path.startsWith('samples/') && template.path.split('/').every(
            segment => /^[a-zA-Z0-9_][a-zA-Z0-9_.-]*$/.test(segment)
        ), `Unsafe template path: ${template.path}`);
        assert.ok(!byPath.has(template.path), `Duplicate template path: ${template.path}`);
        requireText(template.displayName, `${template.path}.displayName`);
        requireText(template.description, `${template.path}.description`);
        assert.equal(typeof template.requiresModel, 'boolean', `${template.path}.requiresModel must be boolean`);
        for (const dimensionId of DIMENSION_IDS) {
            assert.ok(dimensionValues.get(dimensionId).has(template[dimensionId]), `Unknown ${dimensionId} in ${template.path}`);
        }
        byPath.set(template.path, { template, index });
    });
    return byPath;
}

export function buildCatalogWithCards(source, definitions) {
    const byPath = validateSource(source);
    assert.equal(definitions?.sourceCommitSha, source.commitSha, 'Card definitions must target the same source commit');
    assert.ok(Array.isArray(definitions.cards) && definitions.cards.length > 0, 'Card definitions are required');
    const patternIds = new Set(PATTERNS.map(pattern => pattern.id));
    const cardIds = new Set();
    const assignedPaths = new Set();

    const cards = definitions.cards.map(card => {
        assert.match(card.id ?? '', /^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Invalid card ID');
        assert.ok(!cardIds.has(card.id), `Duplicate card ID: ${card.id}`);
        cardIds.add(card.id);
        requireText(card.title, `${card.id}.title`);
        assert.ok(patternIds.has(card.categoryId), `Unknown Pattern: ${card.categoryId}`);
        assert.ok(card.details && typeof card.details === 'object', `${card.id}.details is required`);
        for (const field of DETAIL_TEXT_FIELDS) {
            requireText(card.details[field], `${card.id}.${field}`);
        }
        for (const field of DETAIL_LIST_FIELDS) {
            assert.ok(Array.isArray(card.details[field]) && card.details[field].length > 0, `${card.id}.${field} must be a non-empty array`);
            card.details[field].forEach(value => requireText(value, `${card.id}.${field}`));
        }
        assert.ok(Array.isArray(card.templatePaths) && card.templatePaths.length > 0, `${card.id}.templatePaths is required`);
        const tuples = new Set();
        for (const templatePath of card.templatePaths) {
            assert.ok(byPath.has(templatePath), `Unknown template path in ${card.id}: ${templatePath}`);
            assert.ok(!assignedPaths.has(templatePath), `Template assigned more than once: ${templatePath}`);
            assignedPaths.add(templatePath);
            const { template } = byPath.get(templatePath);
            const tuple = JSON.stringify(DIMENSION_IDS.map(dimensionId => template[dimensionId]));
            assert.ok(!tuples.has(tuple), `Ambiguous selection in ${card.id}: ${tuple}`);
            tuples.add(tuple);
        }
        return {
            id: card.id,
            title: card.title,
            categoryId: card.categoryId,
            details: structuredClone(card.details),
            templatePaths: [...card.templatePaths].sort((left, right) => byPath.get(left).index - byPath.get(right).index),
        };
    });

    const unassigned = source.templates.filter(template => !assignedPaths.has(template.path));
    assert.equal(unassigned.length, 0, `Templates without cards:\n${unassigned.map(template => template.path).join('\n')}`);
    cards.sort((left, right) => byPath.get(left.templatePaths[0]).index - byPath.get(right.templatePaths[0]).index);

    return {
        commitSha: source.commitSha,
        repo: source.repo,
        generatedAt: source.generatedAt,
        dimensions: structuredClone(source.dimensions),
        templateSelection: structuredClone(source.templateSelection),
        templates: structuredClone(source.templates),
        schemaVersion: 2,
        patterns: structuredClone(PATTERNS),
        cards,
    };
}

export function writeCatalogWithCards(source, definitions, outputPath) {
    const catalog = buildCatalogWithCards(source, definitions);
    mkdirSync(dirname(outputPath), { recursive: true });
    const temporaryPath = `${outputPath}.${process.pid}.tmp`;
    writeFileSync(temporaryPath, `${JSON.stringify(catalog, null, 4)}\n`, 'utf8');
    renameSync(temporaryPath, outputPath);
    return catalog;
}