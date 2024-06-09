import repl from 'repl';
import * as node from '../packages/ts_node/dist/index';
import * as common from '../packages/ts_common/dist/index';
import * as dev from './dev/index';

declare var global: any;
declare var Date :  any; 

const modules = [
    { name: 'node', path: '../packages/ts_node/dist/index', mod: node },
    { name: 'common', path: '../packages/ts_common/dist/index', mod: common },
    { name: 'dev', path: './dev/index', mod: dev }
];

const log = common.logger.get_logger({ id: 'repl' });

log("Loading repl") 

const welcome_msg = `
Welcome to the Tidyscripts REPL (Read Eval Print Loop)
What exciting journey awaits you??
`;

async function init_repl() {
    try {
        await load(); // Load modules
        log(welcome_msg);

        const replServer = repl.start({
            prompt: ':: ',
        });

        // Add reload function to the REPL context
        replServer.context.reload = reload;
    } catch (error) {
        log(`Error during REPL initialization: ${error.message}`);
    }
}

async function load() {
    for (const module of modules) {
        try {
            log(`Loading module: ${module.name}`);
            const mod = await import(module.path + `?update=${Date.now()}`); // Dynamically import the module with a cache-busting query parameter
            global[module.name] = mod;
        } catch (error) {
            log(`Failed to load module: ${module.name}, Error: ${error.message}`);
        }
    }
}

async function reload() {
    try {
        log('Reloading modules...');
        await load(); // Reload modules
    } catch (error) {
        log(`Error during reload: ${error.message}`);
    }
}

export {
    node,
    common,
    init_repl,
    dev,
    reload,
};
