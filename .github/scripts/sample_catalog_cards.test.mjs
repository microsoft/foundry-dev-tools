import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { buildCatalogWithCards, PATTERNS, writeCatalogWithCards } from './sample_catalog_cards.mjs';

function fixture() {
    const source = {
        repo: 'https://github.com/microsoft-foundry/foundry-samples/',
        commitSha: 'a'.repeat(40),
        generatedAt: '2026-09-16T00:00:00Z',
        dimensions: Object.fromEntries([
            ['language', ['python', 'csharp']],
            ['framework', ['agent-framework', 'langgraph']],
            ['protocol', ['responses', 'invocations']],
        ].map(([dimension, values]) => [dimension, {
            title: dimension,
            placeholder: `Choose ${dimension}`,
            options: values.map(id => ({ id, displayName: id })),
        }])),
        templateSelection: { title: 'Template', placeholder: 'Choose a template' },
        templates: ['python', 'csharp'].map(language => ({
            path: `samples/${language}/hosted-agents/agent-framework/workflow`,
            displayName: 'Workflow',
            description: 'Draft and review text.',
            language,
            framework: 'agent-framework',
            protocol: 'responses',
            requiresModel: true,
        })),
    };
    const definitions = {
        sourceCommitSha: source.commitSha,
        cards: [{
            id: 'writing-workflow',
            title: 'Draft and review text',
            categoryId: 'multi-agent-orchestration',
            details: {
                summary: 'Draft and review text.',
                whatItDoes: 'Passes text through a writer and reviewer.',
                whyUseIt: 'Separate drafting from review.',
                exampleScenario: 'Review a product slogan.',
                bestFit: 'Content workflow prototypes.',
                capabilities: ['Drafts text', 'Reviews a draft'],
                whatItGenerates: 'Source code and hosting configuration.',
                requirements: ['Model access'],
            },
            templatePaths: source.templates.map(template => template.path).reverse(),
        }],
    };
    return { source, definitions };
}

test('builds a self-contained catalog without mutating source or curated content', () => {
    const { source, definitions } = fixture();
    const before = structuredClone({ source, definitions });
    const output = buildCatalogWithCards(source, definitions);
    assert.equal(output.schemaVersion, 2);
    assert.deepEqual(output.templates, source.templates);
    assert.deepEqual(output.dimensions, source.dimensions);
    assert.deepEqual(output.cards[0].templatePaths, source.templates.map(template => template.path));
    assert.deepEqual(output.cards[0].details, definitions.cards[0].details);
    assert.deepEqual(output, buildCatalogWithCards(source, definitions));
    assert.deepEqual({ source, definitions }, before);
    assert.equal(PATTERNS.length, 13);
    assert.equal(new Set(PATTERNS.map(pattern => pattern.id)).size, 13);
});

test('keeps identical selection tuples in separate cards and follows template ordering', () => {
    const { source, definitions } = fixture();
    source.templates[1] = { ...source.templates[0], path: 'samples/python/hosted-agents/agent-framework/other-workflow' };
    const card = definitions.cards[0];
    definitions.cards = [
        { ...card, id: 'second-workflow', templatePaths: [source.templates[1].path] },
        { ...card, templatePaths: [source.templates[0].path] },
    ];
    assert.deepEqual(buildCatalogWithCards(source, definitions).cards.map(value => value.id), ['writing-workflow', 'second-workflow']);
});

const invalidDefinitions = [
    ['commit mismatch', ({ definitions }) => { definitions.sourceCommitSha = 'b'.repeat(40); }, /same source commit/],
    ['missing cards', ({ definitions }) => { definitions.cards = []; }, /Card definitions/],
    ['duplicate card', ({ definitions }) => { definitions.cards.push(structuredClone(definitions.cards[0])); }, /Duplicate card ID/],
    ['unknown Pattern', ({ definitions }) => { definitions.cards[0].categoryId = 'not-a-pattern'; }, /Unknown Pattern/],
    ['empty detail', ({ definitions }) => { definitions.cards[0].details.whatItDoes = ''; }, /non-empty text/],
    ['empty capability list', ({ definitions }) => { definitions.cards[0].details.capabilities = []; }, /non-empty array/],
    ['HTML detail', ({ definitions }) => { definitions.cards[0].details.summary = '<b>Draft</b>'; }, /HTML/],
    ['unknown path', ({ definitions }) => { definitions.cards[0].templatePaths.push('samples/missing'); }, /Unknown template path/],
    ['duplicate assignment', ({ definitions }) => { definitions.cards[0].templatePaths.push(definitions.cards[0].templatePaths[0]); }, /more than once/],
    ['unassigned template', ({ definitions }) => { definitions.cards[0].templatePaths.pop(); }, /Templates without cards/],
    ['ambiguous selection', ({ source }) => { source.templates[1].language = 'python'; }, /Ambiguous selection/],
    ['unsafe source path', ({ source }) => { source.templates[0].path = 'samples/../outside'; }, /Unsafe template path/],
    ['duplicate source path', ({ source }) => { source.templates[1].path = source.templates[0].path; }, /Duplicate template path/],
    ['unknown dimension', ({ source }) => { source.templates[0].protocol = 'unknown'; }, /Unknown protocol/],
    ['empty source description', ({ source }) => { source.templates[0].description = ''; }, /non-empty text/],
];

for (const [name, mutate, message] of invalidDefinitions) {
    test(`rejects ${name}`, () => {
        const input = fixture();
        mutate(input);
        assert.throws(() => buildCatalogWithCards(input.source, input.definitions), message);
    });
}

test('checked-in unified catalog serves both views from one reproducible snapshot', () => {
    const directory = new URL('../../samples/hosted-agent/', import.meta.url);
    const load = name => JSON.parse(readFileSync(new URL(name, directory), 'utf8').replace(/^\uFEFF/, ''));
    const source = load('sample-catalog.json');
    const definitions = load('sample-cards.json');

    assert.equal(definitions.sourceCommitSha, source.commitSha);
    const output = buildCatalogWithCards(source, definitions);
    for (const field of ['repo', 'commitSha', 'generatedAt', 'dimensions', 'templateSelection', 'templates']) {
        assert.deepEqual(output[field], source[field], `Legacy field changed: ${field}`);
    }
    assert.deepEqual(source, output);
});

test('consolidated snapshot resolves every card selection and preserves the five featured cards', () => {
    const directory = new URL('../../samples/hosted-agent/', import.meta.url);
    const load = name => JSON.parse(readFileSync(new URL(name, directory), 'utf8').replace(/^\uFEFF/, ''));
    const source = load('sample-catalog.json');
    const output = buildCatalogWithCards(source, load('sample-cards.json'));
    assert.equal(output.commitSha, '3b98218db7e9a92367dc3e4b6638fd97ac7c9502');
    assert.equal(output.templates.length, 89);
    assert.equal(output.cards.length, 44);

    const templatesByPath = new Map(output.templates.map(template => [template.path, template]));
    const owners = new Map();
    for (const card of output.cards) {
        assert.equal(card.details.requirements.length, 1, `${card.id}: Requirements must be one Quick facts value`);
        const requirement = card.details.requirements[0];
        assert.ok(requirement.trim().split(/\s+/).length <= 5, `${card.id}: Requirements must total at most five words: ${requirement}`);
        const variants = card.templatePaths.map(templatePath => templatesByPath.get(templatePath));
        for (const variant of variants) {
            const matches = variants.filter(candidate => ['language', 'framework', 'protocol'].every(
                dimension => candidate[dimension] === variant[dimension]
            ));
            assert.deepEqual(matches.map(candidate => candidate.path), [variant.path], card.id);
            assert.ok(!owners.has(variant.path), `Duplicate owner: ${variant.path}`);
            owners.set(variant.path, card.id);
        }
    }
    assert.equal(owners.size, output.templates.length);
    assert.deepEqual(output.templates.slice(0, 10).map(template => owners.get(template.path)), [
        'chat-agent-basics', 'chat-agent-basics', 'time-calculator-chat',
        'mcp-toolbox-integration', 'mcp-toolbox-integration',
        'content-review-workflow', 'content-review-workflow', 'azure-search-rag',
        'chat-agent-basics', 'chat-agent-basics',
    ]);
    assert.deepEqual(Object.fromEntries(PATTERNS.map(pattern => [
        pattern.id, output.cards.filter(card => card.categoryId === pattern.id).length,
    ])), {
        'just-the-basics': 3,
        'tools-mcp-skills': 8,
        'knowledge-rag-memory': 3,
        'files-documents': 2,
        'human-in-the-loop-async-events': 3,
        'multi-agent-orchestration': 5,
        'browser-computer-use': 1,
        'other-sdks-adapters': 1,
        'observability-tracing': 1,
        'security-governance-ops': 7,
        'agent-optimization': 3,
        'teams-m365-channel': 1,
        'voice-realtime': 6,
    });
});

function temporaryFixture(context) {
    const root = mkdtempSync(join(tmpdir(), 'catalog-unified-test-'));
    context.after(() => rmSync(root, { recursive: true, force: true }));
    const directory = join(root, 'samples', 'hosted-agent');
    mkdirSync(directory, { recursive: true });
    const input = fixture();
    const outputPath = join(directory, 'sample-catalog.json');
    writeFileSync(outputPath, JSON.stringify(input.source));
    writeFileSync(join(directory, 'sample-cards.json'), JSON.stringify(input.definitions));
    return { ...input, root, directory, outputPath };
}

function runGenerator(root, argument) {
    const env = { ...process.env, REPO_ROOT: root, GITHUB_TOKEN: '', AZURE_OPENAI_ENDPOINT: '', AZURE_OPENAI_API_KEY: '' };
    delete env.GITHUB_STEP_SUMMARY;
    return spawnSync(process.execPath, [fileURLToPath(new URL('./generate_sample_catalog.mjs', import.meta.url)), argument], {
        encoding: 'utf8', env, timeout: 10000,
    });
}

test('writer rejects invalid cards without changing the existing catalog', context => {
    const { source, definitions, outputPath, directory } = temporaryFixture(context);
    const before = readFileSync(outputPath);
    definitions.cards[0].templatePaths.pop();
    assert.throws(() => writeCatalogWithCards(source, definitions, outputPath), /Templates without cards/);
    assert.deepEqual(readFileSync(outputPath), before);
    assert.ok(!readdirSync(directory).some(name => name.endsWith('.tmp')));
});

test('CLI rebuilds existing snapshot offline and only writes the unified catalog', context => {
    const { root, source, definitions, outputPath, directory } = temporaryFixture(context);
    const expected = buildCatalogWithCards(source, definitions);
    const result = runGenerator(root, '--from-existing');
    assert.equal(result.status, 0, result.stderr || result.error?.message);
    assert.deepEqual(JSON.parse(readFileSync(outputPath, 'utf8')), expected);
    assert.deepEqual(readdirSync(directory).sort(), ['sample-cards.json', 'sample-catalog.json']);
    const before = readFileSync(outputPath);
    const second = runGenerator(root, '--from-existing');
    assert.equal(second.status, 0, second.stderr);
    assert.deepEqual(readFileSync(outputPath), before);
});

test('CLI refuses a different upstream commit before fetching or overwriting', context => {
    const { root, outputPath } = temporaryFixture(context);
    const before = readFileSync(outputPath);
    const result = runGenerator(root, 'b'.repeat(40));
    assert.equal(result.status, 1, result.error?.message);
    assert.match(result.stderr, /Requested commit must match/);
    assert.deepEqual(readFileSync(outputPath), before);
});

test('CLI rejects stale definitions and leaves existing snapshot unchanged', context => {
    const { root, definitions, directory, outputPath } = temporaryFixture(context);
    definitions.sourceCommitSha = 'b'.repeat(40);
    writeFileSync(join(directory, 'sample-cards.json'), JSON.stringify(definitions));
    const before = readFileSync(outputPath);
    const result = runGenerator(root, '--from-existing');
    assert.equal(result.status, 1, result.error?.message);
    assert.match(result.stderr, /same source commit/);
    assert.deepEqual(readFileSync(outputPath), before);
});

test('normal scanning writes templates and cards together using pinned source data', context => {
    const { root, source, definitions, outputPath, directory } = temporaryFixture(context);
    const generator = new URL('./generate_sample_catalog.mjs', import.meta.url);
    const tree = source.templates.map(template => ({ path: `${template.path}/azure.yaml`, type: 'blob' }));
    const manifest = 'services:\n  agent:\n    protocols:\n      - protocol: responses\n    environmentVariables:\n      - name: AZURE_AI_MODEL_DEPLOYMENT_NAME\n';
    const code = `
        process.argv = [process.execPath, ${JSON.stringify(fileURLToPath(generator))}, ${JSON.stringify(source.commitSha)}];
        globalThis.fetch = async resource => {
            const url = String(resource);
            if (!url.includes(${JSON.stringify(source.commitSha)})) throw new Error('Unpinned request: ' + url);
            if (url.includes('/git/trees/')) return Response.json({ tree: ${JSON.stringify(tree)}, truncated: false });
            if (url.endsWith('/azure.yaml')) return new Response(${JSON.stringify(manifest)});
            throw new Error('Unexpected request: ' + url);
        };
        await import(${JSON.stringify(generator.href)});
    `;
    const env = {
        ...process.env, REPO_ROOT: root, GITHUB_TOKEN: '', AZURE_OPENAI_ENDPOINT: '', AZURE_OPENAI_API_KEY: '',
        AI_REFINE: 'false', IGNORE_EXISTING: 'false',
    };
    delete env.GITHUB_STEP_SUMMARY;
    const result = spawnSync(process.execPath, ['--input-type=module', '-e', code], {
        encoding: 'utf8', env, timeout: 10000,
    });
    assert.equal(result.status, 0, result.stderr || result.error?.message);
    const output = JSON.parse(readFileSync(outputPath, 'utf8'));
    assert.equal(output.commitSha, source.commitSha);
    assert.deepEqual(output.templates.slice().sort((left, right) => left.path.localeCompare(right.path)),
        source.templates.slice().sort((left, right) => left.path.localeCompare(right.path)));
    assert.deepEqual(output, buildCatalogWithCards(output, definitions));
    assert.deepEqual(readdirSync(directory).sort(), ['sample-cards.json', 'sample-catalog.json']);
});