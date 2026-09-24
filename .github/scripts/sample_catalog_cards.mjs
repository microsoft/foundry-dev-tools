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
    if (definitions.patterns !== undefined) {
        assert.deepEqual(definitions.patterns, PATTERNS, 'Card patterns must match the supported registry');
    }
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
    const previousOrder = new Map((source.cards ?? definitions.cards).map((card, index) => [card.id, index]));
    const order = card => previousOrder.get(card.id) ?? previousOrder.size + byPath.get(card.templatePaths[0]).index;
    cards.sort((left, right) => order(left) - order(right));

    return {
        commitSha: source.commitSha,
        repo: source.repo,
        generatedAt: source.generatedAt,
        dimensions: structuredClone(source.dimensions),
        templateSelection: structuredClone(source.templateSelection),
        templates: structuredClone(source.templates),
        patterns: structuredClone(PATTERNS),
        cards,
    };
}

export async function reconcileCardDefinitions(previous, source, definitions, chooseCard, reviewNewCard) {
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
        ...structuredClone(definitions),
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
            assert.ok(card && typeof card === 'object', `New card is required for ${template.path}`);
            assert.match(card.id ?? '', /^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Invalid new card ID');
            const comparable = candidates.filter(candidate => candidate.categoryId === card.categoryId);
            if (comparable.length) {
                assert.equal(typeof reviewNewCard, 'function', `New card reuse review required for ${template.path}`);
                const review = await reviewNewCard({
                    template: structuredClone(template), card: structuredClone(card), candidates: structuredClone(comparable),
                });
                assert.ok(review?.candidateReviews && typeof review.candidateReviews === 'object', 'candidateReviews required');
                assert.deepEqual(Object.keys(review.candidateReviews).sort(), comparable.map(candidate => candidate.id).sort(), 'Review every compatible candidate');
                for (const candidate of comparable) {
                    const assessment = review.candidateReviews[candidate.id];
                    assert.equal(typeof assessment?.sameTask, 'boolean', 'Candidate sameTask must be boolean');
                    requireText(assessment.reason, `${candidate.id} reuse reason`);
                    assert.ok(Array.isArray(assessment.evidence), `${candidate.id} reuse evidence required`);
                    assert.ok(assessment.evidence.some(item => item.path === template.path), 'Reuse review must cite the new implementation');
                    assert.ok(assessment.evidence.some(item => candidate.templatePaths.includes(item.path)), 'Reuse review must cite the candidate');
                }
                console.log(`Card reuse review: ${JSON.stringify({ templatePath: template.path, ...review })}`);
                const target = comparable.find(candidate => review.candidateReviews[candidate.id].sameTask);
                if (target) {
                    target.templatePaths.push(template.path);
                    continue;
                }
            }
            assert.equal(card.details?.requirements?.length, 1, 'New card Requirements must be one value');
            requireText(card.details.requirements[0], 'New card Requirements');
            assert.ok(card.details.requirements[0].trim().split(/\s+/).length <= 5, 'New card Requirements must total at most five words');
            let cardId = card.id;
            for (let suffix = 2; reservedIds.has(cardId); suffix++) {
                cardId = `${card.id}-${suffix}`;
            }
            if (cardId !== card.id) {
                console.log(`Allocated new card ID ${cardId} instead of reserved ID ${card.id} for ${template.path}`);
            }
            result.cards.push({
                id: cardId,
                title: card.title,
                categoryId: card.categoryId,
                details: structuredClone(card.details),
                templatePaths: [template.path],
            });
            reservedIds.add(cardId);
        }
    }
    buildCatalogWithCards(source, result);
    return result;
}

export async function reviewChangedCardDetails(previous, source, definitions, reviewDetails) {
    buildCatalogWithCards(source, definitions);
    const result = structuredClone(definitions);
    const previousCards = new Map(previous.cards.map(card => [card.id, card]));
    const fields = new Set([...DETAIL_TEXT_FIELDS, ...DETAIL_LIST_FIELDS]);
    for (const card of result.cards) {
        const previousCard = previousCards.get(card.id);
        const addedPaths = card.templatePaths.filter(templatePath => !previousCard?.templatePaths.includes(templatePath));
        const removedPaths = previousCard?.templatePaths.filter(templatePath => !card.templatePaths.includes(templatePath)) ?? [];
        if (previousCard ? !addedPaths.length && !removedPaths.length : card.templatePaths.length === 1) continue;
        const decision = await reviewDetails({
            card: structuredClone(card), previousCard: structuredClone(previousCard), addedPaths, removedPaths,
        });
        assert.ok(decision && typeof decision === 'object' && !Array.isArray(decision), `Missing Details review for ${card.id}`);
        assert.ok(Object.keys(decision).every(key => ['detailsPatch', 'fieldReviews', 'reason'].includes(key)), `Unexpected Details review property for ${card.id}`);
        requireText(decision.reason, `${card.id} Details review reason`);
        const patch = decision.detailsPatch;
        assert.ok(patch && typeof patch === 'object' && !Array.isArray(patch), `Details patch must be an object for ${card.id}`);
        const reviews = decision.fieldReviews;
        assert.ok(reviews && typeof reviews === 'object' && !Array.isArray(reviews), `fieldReviews required for ${card.id}`);
        assert.deepEqual(Object.keys(reviews).sort(), [...fields].sort(), `fieldReviews must cover every Details field for ${card.id}`);
        for (const field of fields) {
            const review = reviews[field];
            const changed = Object.hasOwn(patch, field) && !isDeepStrictEqual(card.details[field], patch[field]);
            assert.equal(review?.action, changed ? 'change' : 'keep', `${card.id}.${field} review and patch disagree`);
            requireText(review.reason, `${card.id}.${field} review reason`);
            assert.ok(Array.isArray(review.evidence) && review.evidence.length > 0, `${card.id}.${field} requires README evidence`);
            for (const evidence of review.evidence) {
                assert.ok(card.templatePaths.includes(evidence?.path), `${card.id}.${field} evidence must reference a final member`);
                assert.ok(typeof evidence.quote === 'string' && evidence.quote.trim(), `${card.id}.${field} evidence quote required`);
            }
        }
        const changedFields = [];
        for (const [field, value] of Object.entries(patch)) {
            assert.ok(fields.has(field), `Unknown Details field: ${field}`);
            if (DETAIL_LIST_FIELDS.includes(field)) {
                assert.ok(Array.isArray(value) && value.length > 0, `${card.id}.${field} must be a non-empty array`);
                value.forEach(text => requireText(text, `${card.id}.${field}`));
            } else {
                requireText(value, `${card.id}.${field}`);
            }
            if (field === 'requirements') {
                assert.equal(value.length, 1, 'Requirements must be one value');
                assert.ok(value[0].trim().split(/\s+/).length <= 5, 'Requirements must total at most five words');
            }
            if (!isDeepStrictEqual(card.details[field], value)) {
                card.details[field] = structuredClone(value);
                changedFields.push(field);
            }
        }
        console.log(`Card Details review: ${JSON.stringify({ cardId: card.id, addedPaths, removedPaths, changedFields, reason: decision.reason, fieldReviews: reviews })}`);
    }
    buildCatalogWithCards(source, result);
    return result;
}

export function writeCatalogWithCards(source, definitions, outputPath) {
    const catalog = buildCatalogWithCards(source, definitions);
    let previous;
    try {
        previous = JSON.parse(readFileSync(outputPath, 'utf8').replace(/^\uFEFF/, ''));
    } catch (error) {
        if (error.code !== 'ENOENT' && !(error instanceof SyntaxError)) throw error;
    }
    if (previous && typeof previous.generatedAt === 'string' && Number.isFinite(Date.parse(previous.generatedAt)) &&
        isDeepStrictEqual({ ...previous, generatedAt: catalog.generatedAt }, catalog)) {
        catalog.generatedAt = previous.generatedAt;
        return catalog;
    }
    const temporaryPath = `${outputPath}.${process.pid}.tmp`;
    try {
        mkdirSync(dirname(outputPath), { recursive: true });
        writeFileSync(temporaryPath, `${JSON.stringify(catalog, null, 4)}\n`, 'utf8');
        renameSync(temporaryPath, outputPath);
    } finally {
        rmSync(temporaryPath, { force: true });
    }
    return catalog;
}