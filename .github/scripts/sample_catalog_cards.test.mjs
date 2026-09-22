import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { buildCatalogWithCards, PATTERNS, reconcileCardDefinitions, writeCatalogWithCards } from './sample_catalog_cards.mjs';

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

test('consolidated snapshot resolves every valid card selection', () => {
    const directory = new URL('../../samples/hosted-agent/', import.meta.url);
    const load = name => JSON.parse(readFileSync(new URL(name, directory), 'utf8').replace(/^\uFEFF/, ''));
    const source = load('sample-catalog.json');
    const output = buildCatalogWithCards(source, load('sample-cards.json'));
    assert.equal(output.commitSha, source.commitSha);
    assert.equal(output.templates.length, source.templates.length);

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
        for (const language of output.dimensions.language.options) {
            for (const framework of output.dimensions.framework.options) {
                for (const protocol of output.dimensions.protocol.options) {
                    const matches = variants.filter(variant => variant.language === language.id &&
                        variant.framework === framework.id && variant.protocol === protocol.id);
                    assert.ok(matches.length <= 1, `${card.id}: ambiguous ${language.id}/${framework.id}/${protocol.id}`);
                }
            }
        }
    }
    assert.equal(owners.size, output.templates.length);
});

test('published card order survives deletion of a cards first sample', () => {
    const { source, definitions } = fixture();
    const other = { ...source.templates[0], framework: 'langgraph', path: 'samples/python/hosted-agents/langgraph/other' };
    source.templates.splice(1, 0, other);
    definitions.cards.push({ ...structuredClone(definitions.cards[0]), id: 'other-card', templatePaths: [other.path] });
    const previous = buildCatalogWithCards(source, definitions);
    const deletedPath = source.templates[0].path;
    const current = { ...previous, templates: previous.templates.filter(template => template.path !== deletedPath) };
    definitions.cards[0].templatePaths = definitions.cards[0].templatePaths.filter(templatePath => templatePath !== deletedPath);
    assert.deepEqual(buildCatalogWithCards(current, definitions).cards.map(card => card.id), ['writing-workflow', 'other-card']);
});

test('incremental reconciliation preserves existing content and fills compatible cards', async () => {
    const { source: previous, definitions } = fixture();
    const before = structuredClone({ previous, definitions });
    const source = structuredClone(previous);
    source.commitSha = 'b'.repeat(40);
    source.templates.push(...previous.templates.map(template => ({
        ...template, framework: 'langgraph', path: template.path.replace('agent-framework', 'langgraph'),
    })));
    const seen = [];
    const result = await reconcileCardDefinitions(previous, source, definitions, async ({ template, candidates }) => {
        seen.push(template.path);
        assert.deepEqual(candidates.map(card => card.id), ['writing-workflow']);
        candidates[0].details.summary = 'This mutation must not affect the output';
        return { cardId: 'writing-workflow', reason: 'Same writing and review task with compatible Details.' };
    });
    assert.deepEqual(seen, source.templates.slice(2).map(template => template.path));
    assert.equal(result.sourceCommitSha, source.commitSha);
    assert.equal(result.cards.length, 1);
    assert.deepEqual(result.cards[0], {
        ...definitions.cards[0], templatePaths: [...definitions.cards[0].templatePaths, ...seen],
    });
    assert.deepEqual({ previous, definitions }, before);
});

test('incremental reconciliation removes deleted members and empty cards without AI', async () => {
    const { source: previous, definitions } = fixture();
    definitions.cards.push({
        ...structuredClone(definitions.cards[0]), id: 'removed-card', templatePaths: [previous.templates[1].path],
    });
    definitions.cards[0].templatePaths = [previous.templates[0].path];
    const source = { ...previous, templates: [previous.templates[0]] };
    const result = await reconcileCardDefinitions(previous, source, definitions, () => assert.fail('No new templates'));
    assert.deepEqual(result.cards, [definitions.cards[0]]);
    const unchanged = await reconcileCardDefinitions(previous, previous, definitions, () => assert.fail('No new templates'));
    assert.deepEqual(unchanged, definitions);
});

test('incremental reconciliation excludes conflicting cards and reuses a newly created card', async () => {
    const { source: previous, definitions } = fixture();
    const source = structuredClone(previous);
    source.templates.push(...previous.templates.map(template => ({ ...template, path: `${template.path}-new` })));
    let calls = 0;
    const result = await reconcileCardDefinitions(previous, source, definitions, async ({ candidates }) => {
        calls++;
        if (calls === 1) {
            assert.deepEqual(candidates, []);
            return { card: { ...definitions.cards[0], id: 'new-workflow' }, reason: 'Existing card has the same tuple.' };
        }
        assert.deepEqual(candidates.map(card => card.id), ['new-workflow']);
        return { cardId: 'new-workflow', reason: 'Language counterpart of the newly added workflow.' };
    });
    assert.equal(calls, 2);
    assert.equal(result.cards.length, 2);
    assert.deepEqual(result.cards[0], definitions.cards[0]);
    assert.deepEqual(result.cards[1].templatePaths, source.templates.slice(2).map(template => template.path));
    await assert.rejects(reconcileCardDefinitions(previous, source, definitions, async () => ({
        cardId: 'writing-workflow', reason: 'Ignore the duplicate tuple',
    })), /Unknown or conflicting card/);
    await assert.rejects(reconcileCardDefinitions(previous, source, definitions, async () => null), /Missing AI card decision/);
});

test('incremental reconciliation rejects edits to surviving templates', async () => {
    const { source: previous, definitions } = fixture();
    const source = structuredClone(previous);
    source.templates[0].description = 'Unexpected refresh';
    await assert.rejects(reconcileCardDefinitions(previous, source, definitions, () => assert.fail('No AI needed')),
        /Existing template changed/);
});

test('incremental reconciliation allocates unique new IDs without reusing retired or published IDs', async () => {
    const { source: previous, definitions } = fixture();
    const published = definitions.cards[0];
    definitions.cards.push({ ...structuredClone(published), id: 'writing-workflow-2', templatePaths: [previous.templates[1].path] });
    published.templatePaths = [previous.templates[0].path];
    const source = structuredClone(previous);
    source.templates = [previous.templates[0], ...['first', 'second'].map(suffix => ({
        ...previous.templates[0], path: `${previous.templates[0].path}-${suffix}`,
    }))];
    const before = structuredClone({ previous, source, definitions });
    const proposed = { ...structuredClone(published), title: 'Another workflow' };
    const chooseCard = async ({ candidates }) => {
        assert.deepEqual(candidates, []);
        return { card: proposed, reason: 'Same tuple requires a separate card.' };
    };
    const result = await reconcileCardDefinitions(previous, source, definitions, chooseCard);
    assert.deepEqual(result.cards.map(card => card.id), ['writing-workflow', 'writing-workflow-3', 'writing-workflow-4']);
    assert.deepEqual(result.cards[0], published);
    assert.deepEqual(result.cards.slice(1).map(card => card.templatePaths), source.templates.slice(1).map(template => [template.path]));
    assert.deepEqual(result, await reconcileCardDefinitions(previous, source, definitions, chooseCard));
    assert.deepEqual({ previous, source, definitions }, before);
    assert.equal(proposed.id, 'writing-workflow');
    assert.equal(buildCatalogWithCards(source, result).cards.length, 3);
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

function runIncremental(root, previous, discoveredPaths, scenario = {}) {
    const generator = new URL('./generate_sample_catalog.mjs', import.meta.url);
    const targetSha = 'b'.repeat(40);
    const tree = discoveredPaths.map(templatePath => ({ path: `${templatePath}/azure.yaml`, type: 'blob' }));
    const addedPaths = discoveredPaths.filter(templatePath => !previous.templates.some(template => template.path === templatePath));
    const code = `
        import assert from 'node:assert/strict';
        const scenario = ${JSON.stringify(scenario)};
        const addedPaths = ${JSON.stringify(addedPaths)};
        const sourceRequests = [];
        const aiRequests = [];
        process.on('exit', () => console.log('SOURCE_REQUESTS=' + JSON.stringify(sourceRequests)));
        process.on('exit', () => console.log('AI_REQUESTS=' + JSON.stringify(aiRequests)));
        process.argv = [process.execPath, ${JSON.stringify(fileURLToPath(generator))}, '--sync', ${JSON.stringify(targetSha)}];
        globalThis.fetch = async (resource, options) => {
            const url = String(resource);
            if (url.startsWith('https://catalog-ai.invalid/')) {
                const request = JSON.parse(options.body);
                const stage = request.messages[0].content.startsWith('You generate') ? 'metadata' : 'placement';
                aiRequests.push({ stage, budget: request.max_completion_tokens, reasoningEffort: request.reasoning_effort });
                if (scenario.aiFailure) return new Response('AI unavailable', { status: 400 });
                if (scenario.emptyFinish) return Response.json({ choices: [{ finish_reason: scenario.emptyFinish, message: { content: '' } }] });
                if (scenario.lengthStage === stage && (!scenario.recoverAt || request.max_completion_tokens < scenario.recoverAt)) {
                    return Response.json({
                        choices: [{ finish_reason: 'length', message: { content: scenario.lengthContent ?? '' } }],
                        usage: { completion_tokens_details: { reasoning_tokens: request.max_completion_tokens } },
                    });
                }
                let content;
                if (request.messages[0].content.startsWith('You generate')) {
                    content = { displayName: 'Generated Workflow', description: 'Draft and review a document.' };
                } else {
                    const input = JSON.parse(request.messages[1].content);
                    assert.ok(addedPaths.includes(input.template.path));
                    if (scenario.candidates) assert.deepEqual(input.candidates.map(card => card.id), scenario.candidates);
                    content = scenario.decision ?? { cardId: input.candidates[0]?.id, reason: 'Same task and unchanged Details apply.' };
                }
                return Response.json({ choices: [{ message: { content: JSON.stringify(content) } }] });
            }
            sourceRequests.push(url);
            assert.ok(url.includes(${JSON.stringify(targetSha)}), 'All source requests must be pinned');
            if (url.includes('/git/trees/')) return Response.json({ tree: ${JSON.stringify(tree)}, truncated: !!scenario.truncated });
            assert.ok(addedPaths.some(templatePath => url.includes('/' + templatePath + '/')), 'Do not fetch metadata for existing samples');
            if (url.endsWith('/azure.yaml')) return new Response('services:\\n  agent:\\n    protocols:\\n      - protocol: responses\\n    environmentVariables:\\n      - name: AZURE_AI_MODEL_DEPLOYMENT_NAME\\n');
            if (url.endsWith('/README.md')) return scenario.missingReadme ? new Response('', { status: 404 }) : new Response('Draft and review a document with the writing workflow.');
            throw new Error('Unexpected request: ' + url);
        };
        await import(${JSON.stringify(generator.href)});
    `;
    const env = {
        ...process.env, REPO_ROOT: root, GITHUB_TOKEN: '', AZURE_OPENAI_ENDPOINT: 'https://catalog-ai.invalid',
        AZURE_OPENAI_API_KEY: scenario.noAI ? '' : 'test-only', SAMPLES_REPO_URL: scenario.repositoryUrl ?? previous.repo,
        AI_REFINE: 'false', IGNORE_EXISTING: 'false', LLM_MAX_ATTEMPTS: String(scenario.maxAttempts ?? 1),
        AZURE_OPENAI_MAX_COMPLETION_TOKENS: String(scenario.initialBudget ?? 2000),
        AZURE_OPENAI_REASONING_EFFORT: scenario.reasoningEffort ?? '',
    };
    delete env.GITHUB_STEP_SUMMARY;
    return spawnSync(process.execPath, ['--input-type=module', '-e', code], { encoding: 'utf8', env, timeout: 10000 });
}

for (const stage of ['metadata', 'placement']) {
    test(`incremental CLI retries token-exhausted ${stage} with a larger budget`, context => {
        const { root, source, outputPath, directory } = temporaryFixture(context);
        const paths = [source.templates[0].path, `${source.templates[1].path}-new`];
        const result = runIncremental(root, source, paths, { lengthStage: stage, recoverAt: 4000, maxAttempts: 5 });
        assert.equal(result.status, 0, result.stderr);
        const requests = JSON.parse(result.stdout.split(/\r?\n/).find(line => line.startsWith('AI_REQUESTS=')).slice('AI_REQUESTS='.length));
        assert.deepEqual(requests.filter(request => request.stage === stage).map(request => request.budget), [2000, 4000]);
        assert.ok(requests.every(request => request.reasoningEffort === undefined));
        const output = JSON.parse(readFileSync(outputPath, 'utf8'));
        const cards = JSON.parse(readFileSync(join(directory, 'sample-cards.json'), 'utf8'));
        assert.deepEqual(output.templates[0], source.templates[0]);
        assert.deepEqual(output.templates.map(template => template.path), paths);
        assert.equal(output.templates[1].displayName, 'Generated Workflow');
        assert.deepEqual(output, buildCatalogWithCards(output, cards));
    });
}

test('incremental CLI rejects truncated JSON and preserves explicit AI settings on retries', context => {
    const { root, source, outputPath } = temporaryFixture(context);
    const paths = [source.templates[0].path, `${source.templates[1].path}-new`];
    const result = runIncremental(root, source, paths, {
        lengthStage: 'metadata', lengthContent: JSON.stringify({ displayName: 'Truncated', description: 'Do not use.' }),
        initialBudget: 3000, recoverAt: 12000, maxAttempts: 5, reasoningEffort: 'low',
    });
    assert.equal(result.status, 0, result.stderr);
    const requests = JSON.parse(result.stdout.split(/\r?\n/).find(line => line.startsWith('AI_REQUESTS=')).slice('AI_REQUESTS='.length));
    assert.deepEqual(requests.filter(request => request.stage === 'metadata').map(request => request.budget), [3000, 6000, 12000]);
    assert.deepEqual(requests.filter(request => request.stage === 'placement').map(request => request.budget), [3000]);
    assert.ok(requests.every(request => request.reasoningEffort === 'low'));
    assert.equal(JSON.parse(readFileSync(outputPath, 'utf8')).templates[1].displayName, 'Generated Workflow');
});

for (const [name, scenario, budgets] of [
    ['token cap', { lengthStage: 'placement', maxAttempts: 5 }, [2000, 4000, 8000, 16000]],
    ['attempt limit', { lengthStage: 'metadata', maxAttempts: 2 }, [2000, 4000]],
    ['non-power-of-two budget cap', { lengthStage: 'metadata', initialBudget: 9000, maxAttempts: 5 }, [9000, 16000]],
    ['explicit budget above automatic cap', { lengthStage: 'metadata', initialBudget: 32000, maxAttempts: 5 }, [32000]],
    ['empty stop response', { emptyFinish: 'stop', maxAttempts: 5 }, [2000]],
    ['content filter', { emptyFinish: 'content_filter', maxAttempts: 5 }, [2000]],
    ['non-retryable API error', { aiFailure: true, maxAttempts: 5 }, [2000]],
]) {
    test(`incremental CLI stops at ${name} without changing either catalog file`, context => {
        const { root, source, outputPath, directory } = temporaryFixture(context);
        const cardsPath = join(directory, 'sample-cards.json');
        const before = [readFileSync(outputPath), readFileSync(cardsPath)];
        const paths = [source.templates[0].path, `${source.templates[1].path}-new`];
        const result = runIncremental(root, source, paths, scenario);
        assert.equal(result.status, 1, result.stderr);
        const requests = JSON.parse(result.stdout.split(/\r?\n/).find(line => line.startsWith('AI_REQUESTS=')).slice('AI_REQUESTS='.length));
        assert.deepEqual(requests.filter(request => request.stage === (scenario.lengthStage ?? 'metadata')).map(request => request.budget), budgets);
        if (scenario.lengthStage) assert.match(result.stderr, /token growth or attempt limit reached/);
        assert.deepEqual([readFileSync(outputPath), readFileSync(cardsPath)], before);
        assert.ok(!readdirSync(directory).some(file => file.endsWith('.tmp')));
    });
}

test('incremental CLI leaves both files untouched when only the upstream SHA changes', context => {
    const { root, source, outputPath, directory } = temporaryFixture(context);
    const cardsPath = join(directory, 'sample-cards.json');
    const before = [readFileSync(outputPath), readFileSync(cardsPath)];
    const result = runIncremental(root, source, source.templates.map(template => template.path), { noAI: true });
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual([readFileSync(outputPath), readFileSync(cardsPath)], before);
});

test('incremental CLI updates both files, preserves survivors, and uses AI only for additions', context => {
    const { root, source, definitions, outputPath, directory } = temporaryFixture(context);
    const cardsPath = join(directory, 'sample-cards.json');
    const paths = [source.templates[0].path, `${source.templates[1].path}-new`];
    source.dimensions.language.title = 'Curated language title';
    source.templates[0].requiresModel = false;
    writeFileSync(outputPath, JSON.stringify(source));
    const result = runIncremental(root, source, paths, { candidates: ['writing-workflow'] });
    assert.equal(result.status, 0, result.stderr);
    const output = JSON.parse(readFileSync(outputPath, 'utf8'));
    const cards = JSON.parse(readFileSync(cardsPath, 'utf8'));
    assert.equal(output.commitSha, 'b'.repeat(40));
    assert.equal(cards.sourceCommitSha, output.commitSha);
    assert.deepEqual(output.templates[0], source.templates[0]);
    assert.deepEqual(output.templates.map(template => template.path), paths);
    assert.equal(output.templates[1].displayName, 'Generated Workflow');
    for (const [id, dimension] of Object.entries(source.dimensions)) {
        assert.deepEqual(output.dimensions[id], {
            ...dimension, options: dimension.options.filter(option => output.templates.some(template => template[id] === option.id)),
        });
    }
    assert.deepEqual(cards.cards[0], { ...definitions.cards[0], templatePaths: paths });
    assert.deepEqual(output, buildCatalogWithCards(output, cards));
    const before = [readFileSync(outputPath), readFileSync(cardsPath)];
    const repeated = runIncremental(root, output, paths, { noAI: true });
    assert.equal(repeated.status, 0, repeated.stderr);
    assert.deepEqual([readFileSync(outputPath), readFileSync(cardsPath)], before);
});

test('incremental CLI scans the configured repository for tree, manifest, and README', context => {
    const { root, source, outputPath } = temporaryFixture(context);
    source.repo = 'https://github.com/catalog-owner/sample-fork/';
    writeFileSync(outputPath, JSON.stringify(source));
    const newPath = `${source.templates[1].path}-new`;
    const result = runIncremental(root, source, [source.templates[0].path, newPath]);
    assert.equal(result.status, 0, result.stderr);
    const requests = JSON.parse(result.stdout.split(/\r?\n/).find(line => line.startsWith('SOURCE_REQUESTS=')).slice('SOURCE_REQUESTS='.length));
    const sha = 'b'.repeat(40);
    assert.deepEqual(requests, [
        `https://api.github.com/repos/catalog-owner/sample-fork/git/trees/${sha}?recursive=1`,
        `https://raw.githubusercontent.com/catalog-owner/sample-fork/${sha}/${newPath}/azure.yaml`,
        `https://raw.githubusercontent.com/catalog-owner/sample-fork/${sha}/${newPath}/README.md`,
    ]);
    assert.equal(JSON.parse(readFileSync(outputPath, 'utf8')).repo, source.repo);
});

test('incremental CLI rejects invalid repository URLs before fetching or writing', context => {
    const { root, source, outputPath, directory } = temporaryFixture(context);
    const cardsPath = join(directory, 'sample-cards.json');
    const before = [readFileSync(outputPath), readFileSync(cardsPath)];
    for (const repositoryUrl of [
        'https://example.com/owner/repo', 'http://github.com/owner/repo',
        'https://user@github.com/owner/repo', 'https://github.com/owner/repo?branch=main',
        'https://github.com/owner/repo#main', 'https://github.com/owner',
    ]) {
        const result = runIncremental(root, source, source.templates.map(template => template.path), { repositoryUrl });
        assert.equal(result.status, 1, repositoryUrl);
        assert.match(result.stderr, /SAMPLES_REPO_URL must be an HTTPS GitHub repository URL/);
        assert.match(result.stdout, /SOURCE_REQUESTS=\[\]/);
        assert.deepEqual([readFileSync(outputPath), readFileSync(cardsPath)], before);
    }
});

test('incremental CLI applies only new overrides and warns for deleted or unknown paths', context => {
    const { root, source, outputPath, directory } = temporaryFixture(context);
    const survivingPath = source.templates[0].path;
    const deletedPath = source.templates[1].path;
    const newPath = `${deletedPath}-new`;
    const unknownPath = 'samples/python/hosted-agents/agent-framework/unknown';
    source.templates[0].requiresModel = false;
    writeFileSync(outputPath, JSON.stringify(source));
    writeFileSync(join(directory, 'sample-overrides.json'), JSON.stringify({ byPath: {
        [survivingPath]: { requiresModel: true },
        [deletedPath]: { requiresModel: true },
        [newPath]: { requiresModel: false },
        [unknownPath]: { requiresModel: true },
    } }));
    const result = runIncremental(root, source, [survivingPath, newPath]);
    assert.equal(result.status, 0, result.stderr);
    assert.ok(!result.stderr.includes(`Override for "${survivingPath}"`), 'Surviving overrides must not emit false warnings');
    assert.ok(!result.stderr.includes(`Override for "${newPath}"`), 'New overrides must be applied');
    for (const templatePath of [deletedPath, unknownPath]) {
        assert.ok(result.stderr.includes(`Override for "${templatePath}" did not match`), templatePath);
    }
    const output = JSON.parse(readFileSync(outputPath, 'utf8'));
    assert.deepEqual(output.templates[0], source.templates[0]);
    assert.equal(output.templates[1].requiresModel, false);
});

test('incremental CLI creates a new card when the tuple is already occupied', context => {
    const { root, source, definitions, outputPath, directory } = temporaryFixture(context);
    const paths = [...source.templates.map(template => template.path), `${source.templates[0].path}-new`];
    const result = runIncremental(root, source, paths, {
        candidates: [], decision: { card: { ...definitions.cards[0], id: 'new-workflow' }, reason: 'Existing tuple is occupied.' },
    });
    assert.equal(result.status, 0, result.stderr);
    const output = JSON.parse(readFileSync(outputPath, 'utf8'));
    const cards = JSON.parse(readFileSync(join(directory, 'sample-cards.json'), 'utf8'));
    assert.equal(cards.cards.length, 2);
    assert.deepEqual(cards.cards[0], definitions.cards[0]);
    assert.deepEqual(cards.cards[1].templatePaths, [paths[2]]);
    assert.deepEqual(output, buildCatalogWithCards(output, cards));
});

test('incremental CLI supports deletion-only updates without AI', context => {
    const { root, source, outputPath, directory } = temporaryFixture(context);
    const result = runIncremental(root, source, [source.templates[0].path], { noAI: true });
    assert.equal(result.status, 0, result.stderr);
    const output = JSON.parse(readFileSync(outputPath, 'utf8'));
    const cards = JSON.parse(readFileSync(join(directory, 'sample-cards.json'), 'utf8'));
    assert.deepEqual(output.templates, [source.templates[0]]);
    assert.deepEqual(cards.cards[0].templatePaths, [source.templates[0].path]);
    assert.deepEqual(output, buildCatalogWithCards(output, cards));
});

test('incremental CLI writes distinct cards when AI proposes the same occupied ID', context => {
    const { root, source, definitions, outputPath, directory } = temporaryFixture(context);
    const newPaths = ['first', 'second'].map(suffix => `${source.templates[0].path}-${suffix}`);
    const result = runIncremental(root, source, [...source.templates.map(template => template.path), ...newPaths], {
        candidates: [], decision: { card: definitions.cards[0], reason: 'Same tuple requires a separate card.' },
    });
    assert.equal(result.status, 0, result.stderr);
    const output = JSON.parse(readFileSync(outputPath, 'utf8'));
    const cards = JSON.parse(readFileSync(join(directory, 'sample-cards.json'), 'utf8'));
    assert.deepEqual(cards.cards.map(card => card.id), ['writing-workflow', 'writing-workflow-2', 'writing-workflow-3']);
    assert.deepEqual(cards.cards[0], definitions.cards[0]);
    assert.deepEqual(cards.cards.slice(1).map(card => card.templatePaths), newPaths.map(templatePath => [templatePath]));
    assert.deepEqual(output, buildCatalogWithCards(output, cards));
    const before = [readFileSync(outputPath), readFileSync(join(directory, 'sample-cards.json'))];
    const repeated = runIncremental(root, output, output.templates.map(template => template.path), { noAI: true });
    assert.equal(repeated.status, 0, repeated.stderr);
    assert.deepEqual([readFileSync(outputPath), readFileSync(join(directory, 'sample-cards.json'))], before);
});

test('incremental CLI failures leave both files unchanged', context => {
    const { root, source, definitions, outputPath, directory } = temporaryFixture(context);
    const cardsPath = join(directory, 'sample-cards.json');
    const before = [readFileSync(outputPath), readFileSync(cardsPath)];
    const paths = [...source.templates.map(template => template.path), `${source.templates[0].path}-new`];
    for (const scenario of [
        { truncated: true }, { noAI: true }, { aiFailure: true }, { missingReadme: true },
        { decision: { cardId: 'writing-workflow', reason: 'Try to merge a conflicting tuple' } },
        { decision: { card: { ...definitions.cards[0], id: 'not/a-valid-id' }, reason: 'Invalid new ID' } },
    ]) {
        const result = runIncremental(root, source, paths, scenario);
        assert.equal(result.status, 1, JSON.stringify(scenario));
        assert.deepEqual([readFileSync(outputPath), readFileSync(cardsPath)], before);
        assert.ok(!readdirSync(directory).some(name => name.endsWith('.tmp')));
    }
});

test('writer rejects invalid cards without changing the existing catalog', context => {
    const { source, definitions, outputPath, directory } = temporaryFixture(context);
    const before = readFileSync(outputPath);
    definitions.cards[0].templatePaths.pop();
    assert.throws(() => writeCatalogWithCards(source, definitions, outputPath), /Templates without cards/);
    assert.deepEqual(readFileSync(outputPath), before);
    assert.ok(!readdirSync(directory).some(name => name.endsWith('.tmp')));
});

test('writer keeps new timestamps when source, template, or card content changes', context => {
    const { source, definitions, outputPath } = temporaryFixture(context);
    const original = writeCatalogWithCards(source, definitions, outputPath);
    for (const change of ['source', 'template', 'card']) {
        writeFileSync(outputPath, JSON.stringify(original));
        const changedSource = structuredClone(source);
        const changedDefinitions = structuredClone(definitions);
        changedSource.generatedAt = '2026-09-18T10:00:00Z';
        if (change === 'source') {
            changedSource.commitSha = 'b'.repeat(40);
            changedDefinitions.sourceCommitSha = changedSource.commitSha;
        } else if (change === 'template') {
            changedSource.templates[0].description = 'Updated template description.';
        } else {
            changedDefinitions.cards[0].details.summary = 'Updated card summary.';
        }
        const output = writeCatalogWithCards(changedSource, changedDefinitions, outputPath);
        assert.deepEqual(output, buildCatalogWithCards(changedSource, changedDefinitions), change);
        assert.deepEqual(JSON.parse(readFileSync(outputPath, 'utf8')), output, change);
    }
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
        globalThis.Date = class extends Date {
            constructor(...args) {
                super(...(args.length ? args : [process.env.CATALOG_TEST_NOW]));
            }
        };
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
        CATALOG_TEST_NOW: '2026-09-17T10:00:00Z',
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
    const before = readFileSync(outputPath);
    env.CATALOG_TEST_NOW = '2026-09-18T10:00:00Z';
    const repeated = spawnSync(process.execPath, ['--input-type=module', '-e', code], {
        encoding: 'utf8', env, timeout: 10000,
    });
    assert.equal(repeated.status, 0, repeated.stderr || repeated.error?.message);
    assert.deepEqual(readFileSync(outputPath), before, 'Unchanged scans must not refresh generatedAt');
});