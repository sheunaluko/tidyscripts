import Surreal from 'surrealdb';

export interface surreal_connection_options {
    url: string;
    namespace?: string;
    database?: string;
    auth?: {
        username: string;
        password: string;
    };
}

export async function connect_to_surreal(options: surreal_connection_options): Promise<Surreal> {
    const db = new Surreal();
    
    const connection_config: any = {
        namespace: options.namespace || "default",
        database: options.database || "default",
    };
    
    if (options.auth) {
        connection_config.auth = {
            username: options.auth.username,
            password: options.auth.password,
        };
    }
    
    await db.connect(options.url, connection_config);
    
    return db;
}