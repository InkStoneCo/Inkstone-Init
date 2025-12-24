/**
 * MCP Server 設定
 */
export interface MCPServerConfig {
    codemindPath: string;
    name?: string;
    version?: string;
}
/**
 * MCP Server 介面
 */
export interface MCPServer {
    start(): Promise<void>;
    stop(): Promise<void>;
}
/**
 * 建立 MCP Server
 */
export declare function createMCPServer(config: MCPServerConfig): MCPServer;
//# sourceMappingURL=server.d.ts.map