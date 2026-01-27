import { Client, estypes } from '@elastic/elasticsearch';

const ELASTICSEARCH_URL = process.env.ELASTICSEARCH_URL || 'http://localhost:9200';

export const esClient = new Client({
  node: ELASTICSEARCH_URL,
});

// Index names
export const INDICES = {
  COMPANIES: 'rcip_companies',
  PRODUCTS: 'rcip_products',
  ARTICLES: 'rcip_articles',
} as const;

// Korean/English analyzer settings
const analyzerSettings = {
  analysis: {
    analyzer: {
      korean_analyzer: {
        type: 'custom' as const,
        tokenizer: 'nori_tokenizer',
        filter: ['lowercase', 'nori_readingform'],
      },
      english_analyzer: {
        type: 'custom' as const,
        tokenizer: 'standard',
        filter: ['lowercase', 'porter_stem'],
      },
      multilingual_analyzer: {
        type: 'custom' as const,
        tokenizer: 'standard',
        filter: ['lowercase'],
      },
    },
  },
};

// Company index mapping
export const companyMapping = {
  settings: {
    number_of_shards: 1,
    number_of_replicas: 0,
    ...analyzerSettings,
  },
  mappings: {
    properties: {
      id: { type: 'keyword' },
      name: {
        type: 'text',
        analyzer: 'multilingual_analyzer',
        fields: {
          keyword: { type: 'keyword' },
        },
      },
      country: { type: 'keyword' },
      category: { type: 'keyword' },
      homepageUrl: { type: 'keyword' },
      description: {
        type: 'text',
        analyzer: 'multilingual_analyzer',
      },
      createdAt: { type: 'date' },
      updatedAt: { type: 'date' },
    } as Record<string, estypes.MappingProperty>,
  },
};

// Product index mapping
export const productMapping = {
  settings: {
    number_of_shards: 1,
    number_of_replicas: 0,
    ...analyzerSettings,
  },
  mappings: {
    properties: {
      id: { type: 'keyword' },
      companyId: { type: 'keyword' },
      companyName: {
        type: 'text',
        fields: { keyword: { type: 'keyword' } },
      },
      name: {
        type: 'text',
        analyzer: 'multilingual_analyzer',
        fields: { keyword: { type: 'keyword' } },
      },
      series: { type: 'keyword' },
      type: { type: 'keyword' },
      releaseDate: { type: 'date' },
      targetMarket: { type: 'text' },
      status: { type: 'keyword' },
      // Spec fields for filtering
      dof: { type: 'integer' },
      payloadKg: { type: 'float' },
      speedMps: { type: 'float' },
      batteryMinutes: { type: 'integer' },
      priceMin: { type: 'float' },
      priceMax: { type: 'float' },
      priceCurrency: { type: 'keyword' },
      // Keywords for search
      keywords: { type: 'keyword' },
      createdAt: { type: 'date' },
      updatedAt: { type: 'date' },
    } as Record<string, estypes.MappingProperty>,
  },
};

// Article index mapping
export const articleMapping = {
  settings: {
    number_of_shards: 1,
    number_of_replicas: 0,
    ...analyzerSettings,
  },
  mappings: {
    properties: {
      id: { type: 'keyword' },
      productId: { type: 'keyword' },
      companyId: { type: 'keyword' },
      companyName: {
        type: 'text',
        fields: { keyword: { type: 'keyword' } },
      },
      productName: {
        type: 'text',
        fields: { keyword: { type: 'keyword' } },
      },
      title: {
        type: 'text',
        analyzer: 'multilingual_analyzer',
        fields: { keyword: { type: 'keyword' } },
      },
      source: { type: 'keyword' },
      url: { type: 'keyword' },
      publishedAt: { type: 'date' },
      summary: {
        type: 'text',
        analyzer: 'multilingual_analyzer',
      },
      content: {
        type: 'text',
        analyzer: 'multilingual_analyzer',
      },
      language: { type: 'keyword' },
      keywords: { type: 'keyword' },
      collectedAt: { type: 'date' },
      createdAt: { type: 'date' },
    } as Record<string, estypes.MappingProperty>,
  },
};


// Initialize indices
export async function initializeIndices() {
  const indices = [
    { name: INDICES.COMPANIES, mapping: companyMapping },
    { name: INDICES.PRODUCTS, mapping: productMapping },
    { name: INDICES.ARTICLES, mapping: articleMapping },
  ];

  for (const { name, mapping } of indices) {
    const exists = await esClient.indices.exists({ index: name });
    if (!exists) {
      console.log(`Creating index: ${name}`);
      await esClient.indices.create({
        index: name,
        body: mapping,
      });
      console.log(`Index ${name} created successfully`);
    } else {
      console.log(`Index ${name} already exists`);
    }
  }
}

// Index a document
export async function indexDocument<T extends Record<string, unknown>>(
  index: string,
  id: string,
  document: T
) {
  await esClient.index({
    index,
    id,
    document,
    refresh: true,
  });
}

// Bulk index documents
export async function bulkIndex<T extends Record<string, unknown>>(
  index: string,
  documents: Array<{ id: string; doc: T }>
) {
  if (documents.length === 0) return;

  const operations = documents.flatMap(({ id, doc }) => [
    { index: { _index: index, _id: id } },
    doc,
  ]);

  await esClient.bulk({ operations, refresh: true });
}

// Delete a document
export async function deleteDocument(index: string, id: string) {
  await esClient.delete({
    index,
    id,
    refresh: true,
  });
}

// Search documents
export async function searchDocuments<T>(
  index: string,
  query: Record<string, unknown>,
  options: { from?: number; size?: number; sort?: unknown[] } = {}
) {
  const { from = 0, size = 20, sort } = options;

  const result = await esClient.search<T>({
    index,
    query,
    from,
    size,
    sort: sort as never,
    highlight: {
      fields: {
        title: {},
        content: {},
        summary: {},
        description: {},
        name: {},
      },
    },
  });

  return {
    hits: result.hits.hits.map((hit) => ({
      id: hit._id,
      score: hit._score,
      source: hit._source,
      highlights: hit.highlight,
    })),
    total:
      typeof result.hits.total === 'number'
        ? result.hits.total
        : result.hits.total?.value ?? 0,
  };
}

// Global search across all indices
export async function globalSearch(query: string, options: { limit?: number } = {}) {
  const { limit = 10 } = options;

  const searchQuery = {
    multi_match: {
      query,
      fields: ['name^3', 'title^2', 'content', 'summary', 'description'],
      type: 'best_fields',
      fuzziness: 'AUTO',
    },
  };

  const [companies, products, articles] = await Promise.all([
    searchDocuments(INDICES.COMPANIES, searchQuery, { size: limit }),
    searchDocuments(INDICES.PRODUCTS, searchQuery, { size: limit }),
    searchDocuments(INDICES.ARTICLES, searchQuery, { size: limit }),
  ]);

  return {
    companies,
    products,
    articles,
    totalHits: companies.total + products.total + articles.total,
  };
}

// Autocomplete suggestions
export async function getSuggestions(prefix: string, index?: string) {
  const indices = index ? [index] : [INDICES.COMPANIES, INDICES.PRODUCTS, INDICES.ARTICLES];

  const results = await Promise.all(
    indices.map((idx) =>
      esClient.search({
        index: idx,
        query: {
          bool: {
            should: [
              { prefix: { 'name.keyword': { value: prefix, boost: 2 } } },
              { prefix: { 'title.keyword': { value: prefix } } },
            ],
          },
        },
        size: 5,
        _source: ['name', 'title'],
      })
    )
  );

  const suggestions = results.flatMap((result) =>
    result.hits.hits.map((hit) => ({
      text: (hit._source as Record<string, string>).name || (hit._source as Record<string, string>).title,
      index: hit._index,
    }))
  );

  return suggestions.slice(0, 10);
}
