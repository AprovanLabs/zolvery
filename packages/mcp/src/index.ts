type ServerVersion = string;
type ServerConfig = {
    version: ServerVersion,
    config?: unknown
}

export const connect = async (serverName: string, config?: ServerConfig) => Promise.resolve({
    serverName,
    config,
});
