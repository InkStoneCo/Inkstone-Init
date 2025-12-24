// MCP Server module
// Phase 3.1 實作
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema, } from '@modelcontextprotocol/sdk/types.js';
import { createMCPTools } from './tools/index.js';
/**
 * 定義 MCP 工具
 */
const TOOLS = [
    {
        name: 'expand_file',
        description: 'Expand all Code-Mind notes in a specific file. Returns the notes with their full content, properties, and backlink information.',
        inputSchema: {
            type: 'object',
            properties: {
                filePath: {
                    type: 'string',
                    description: 'The relative path to the source file',
                },
            },
            required: ['filePath'],
        },
    },
    {
        name: 'get_map',
        description: 'Get the project map showing all notes organized by file, with backlink counts. Useful for understanding project structure.',
        inputSchema: {
            type: 'object',
            properties: {},
        },
    },
    {
        name: 'get_note',
        description: 'Get detailed information about a specific note including content, properties, backlinks, and children.',
        inputSchema: {
            type: 'object',
            properties: {
                noteId: {
                    type: 'string',
                    description: 'The note ID (e.g., cm.abc123)',
                },
            },
            required: ['noteId'],
        },
    },
    {
        name: 'search_notes',
        description: 'Search notes by content, file path, or display path. Returns matching notes with relevance scores.',
        inputSchema: {
            type: 'object',
            properties: {
                query: {
                    type: 'string',
                    description: 'Search query (supports multiple terms)',
                },
                limit: {
                    type: 'number',
                    description: 'Maximum number of results (default: 20)',
                },
            },
            required: ['query'],
        },
    },
    {
        name: 'get_backlinks',
        description: 'Get all notes that reference a specific note (backlinks).',
        inputSchema: {
            type: 'object',
            properties: {
                noteId: {
                    type: 'string',
                    description: 'The note ID to get backlinks for',
                },
            },
            required: ['noteId'],
        },
    },
    {
        name: 'get_related',
        description: 'Get notes related to a specific note through forward and backward links, up to a specified depth.',
        inputSchema: {
            type: 'object',
            properties: {
                noteId: {
                    type: 'string',
                    description: 'The note ID to find related notes for',
                },
                depth: {
                    type: 'number',
                    description: 'How many link hops to follow (default: 1)',
                },
            },
            required: ['noteId'],
        },
    },
    {
        name: 'add_note',
        description: 'Add a new note to the Code-Mind system. Returns the generated note ID.',
        inputSchema: {
            type: 'object',
            properties: {
                filePath: {
                    type: 'string',
                    description: 'The source file this note is associated with',
                },
                content: {
                    type: 'string',
                    description: 'The note content',
                },
                parentId: {
                    type: 'string',
                    description: 'Optional parent note ID for creating a child note',
                },
            },
            required: ['filePath', 'content'],
        },
    },
    {
        name: 'get_project_context',
        description: 'Get comprehensive project context including project info, map, top referenced notes, and recent notes. Useful for initial context.',
        inputSchema: {
            type: 'object',
            properties: {},
        },
    },
];
/**
 * 建立 MCP Server
 */
export function createMCPServer(config) {
    const { codemindPath, name = 'codemind-mcp', version = '0.1.0' } = config;
    let server = null;
    let tools = null;
    return {
        async start() {
            // 初始化工具
            tools = createMCPTools(codemindPath);
            // 建立 MCP Server
            server = new Server({ name, version }, { capabilities: { tools: {} } });
            // 註冊工具列表處理器
            server.setRequestHandler(ListToolsRequestSchema, async () => ({
                tools: TOOLS,
            }));
            // 註冊工具呼叫處理器
            server.setRequestHandler(CallToolRequestSchema, async (request) => {
                const { name: toolName, arguments: args } = request.params;
                try {
                    let result;
                    switch (toolName) {
                        case 'expand_file':
                            result = await tools.expand_file(args?.filePath);
                            break;
                        case 'get_map':
                            result = await tools.get_map();
                            break;
                        case 'get_note':
                            result = await tools.get_note(args?.noteId);
                            break;
                        case 'search_notes':
                            result = await tools.search_notes(args?.query, args?.limit);
                            break;
                        case 'get_backlinks':
                            result = await tools.get_backlinks(args?.noteId);
                            break;
                        case 'get_related':
                            result = await tools.get_related(args?.noteId, args?.depth);
                            break;
                        case 'add_note':
                            result = await tools.add_note(args?.filePath, args?.content, args?.parentId);
                            break;
                        case 'get_project_context':
                            result = await tools.get_project_context();
                            break;
                        default:
                            throw new Error(`Unknown tool: ${toolName}`);
                    }
                    return {
                        content: [
                            {
                                type: 'text',
                                text: typeof result === 'string' ? result : JSON.stringify(result, null, 2),
                            },
                        ],
                    };
                }
                catch (error) {
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    return {
                        content: [
                            {
                                type: 'text',
                                text: `Error: ${errorMessage}`,
                            },
                        ],
                        isError: true,
                    };
                }
            });
            // 啟動 stdio transport
            const transport = new StdioServerTransport();
            await server.connect(transport);
        },
        async stop() {
            if (server) {
                await server.close();
                server = null;
            }
            tools = null;
        },
    };
}
//# sourceMappingURL=server.js.map