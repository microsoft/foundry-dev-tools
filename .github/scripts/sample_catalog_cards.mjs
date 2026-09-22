import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { isDeepStrictEqual } from 'node:util';

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
    const previousOrder = new Map((source.cards ?? []).map((card, index) => [card.id, index]));
    const order = card => previousOrder.get(card.id) ?? previousOrder.size + byPath.get(card.templatePaths[0]).index;
    cards.sort((left, right) => order(left) - order(right));

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

export async function reconcileCardDefinitions(previous, source, definitions, chooseCard) {
    buildCatalogWithCards(previous, definitions);
    const byPath = validateSource(source);
    assert.equal(source.repo, previous.repo, 'Incremental sync must use the same source repository');
    const previousPaths = new Set(previous.templates.map(template => template.path));
    for (const template of previous.templates) {
        if (byPath.has(template.path)) {
            assert.deepEqual(byPath.get(template.path).template, template, `Existing template changed: ${template.path}`);
        }
    }
    const result = {
        sourceCommitSha: source.commitSha,
        cards: definitions.cards.map(card => ({
            ...structuredClone(card),
            templatePaths: card.templatePaths.filter(templatePath => byPath.has(templatePath)),
        })).filter(card => card.templatePaths.length > 0),
    };
    const reservedIds = new Set(definitions.cards.map(card => card.id));
    for (const template of source.templates.filter(template => !previousPaths.has(template.path))) {
        const candidates = result.cards.filter(card => !card.templatePaths.some(templatePath =>
            DIMENSION_IDS.every(dimension => byPath.get(templatePath).template[dimension] === template[dimension])
        ));
        const decision = await chooseCard({
            template: structuredClone(template),
            candidates: structuredClone(candidates),
            patterns: structuredClone(PATTERNS),
        });
        assert.ok(decision && typeof decision === 'object', `Missing AI card decision for ${template.path}`);
        requireText(decision.reason, `${template.path} placement reason`);
        if (decision.cardId !== undefined) {
            assert.equal(decision.card, undefined, 'Choose an existing card or create one, not both');
            const target = candidates.find(card => card.id === decision.cardId);
            assert.ok(target, `Unknown or conflicting card for ${template.path}: ${decision.cardId}`);
            target.templatePaths.push(template.path);
        } else {
            const card = decision.card;
            assert.ok(card && !reservedIds.has(card.id), `New card must have an unused ID for ${template.path}`);
            assert.equal(card.details?.requirements?.length, 1, 'New card Requirements must be one value');
            requireText(card.details.requirements[0], 'New card Requirements');
            assert.ok(card.details.requirements[0].trim().split(/\s+/).length <= 5, 'New card Requirements must total at most five words');
            result.cards.push({
                id: card.id,
                title: card.title,
                categoryId: card.categoryId,
                details: structuredClone(card.details),
                templatePaths: [template.path],
            });
            reservedIds.add(card.id);
        }
    }
    buildCatalogWithCards(source, result);
    return result;
}

export function writeCatalogWithCards(source, definitions, outputPath, definitionsPath) {
    const catalog = buildCatalogWithCards(source, definitions);
    let previous;
    try {
        previous = JSON.parse(readFileSync(outputPath, 'utf8').replace(/^\uFEFF/, ''));
    } catch (error) {
        if (error.code !== 'ENOENT' && !(error instanceof SyntaxError)) throw error;
    }
    if (typeof previous?.generatedAt === 'string' && Number.isFinite(Date.parse(previous.generatedAt)) &&
        isDeepStrictEqual({ ...previous, generatedAt: catalog.generatedAt }, catalog)) {
        catalog.generatedAt = previous.generatedAt;
    }
    const outputs = [[outputPath, catalog]];
    if (definitionsPath) outputs.push([definitionsPath, definitions]);
    try {
        for (const [filePath, content] of outputs) {
            mkdirSync(dirname(filePath), { recursive: true });
            writeFileSync(`${filePath}.${process.pid}.tmp`, `${JSON.stringify(content, null, 4)}\n`, 'utf8');
        }
        for (const [filePath] of outputs) renameSync(`${filePath}.${process.pid}.tmp`, filePath);
    } finally {
        for (const [filePath] of outputs) rmSync(`${filePath}.${process.pid}.tmp`, { force: true });
    }
    return catalog;
}