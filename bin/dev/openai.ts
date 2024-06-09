import node from "../../packages/ts_node/dist/index";
import common from "../../packages/ts_common/dist/index";

const openai    = node.apis.openai
const dir       = "/home/oluwa/dev/tidyscripts"
const ignore    = "/home/oluwa/dev/tidyscripts/.gitignore"
const query     = "What can you tell me about this code and directory structure?" 

const also_ignore = [
    'apps/ts_next_app/public/resources/radiopaedia_cases.json',
    'apps/ts_next_app/public/tidyscripts_web_umd.js',
    //'apps/ts_next_app/src/sg_sus_data.json',
    //'apps/ts_next_app/src/sg_info.json',
    '**/*.json',
    '**/*.png',
    '**/*.svg',
    '**/*.html',
    '**/*.csv',
    '**/*.md',                 
]


export function dev0() {
    return openai.directory_analyzer.get_repository_json(dir,ignore,also_ignore)
}

export function dev1() {
    return openai.directory_analyzer.get_repository_context(dir,ignore, also_ignore)
}

export function dev2() {
    return openai.directory_analyzer
		 .summarize_token_information(dir, query, ignore, also_ignore)
}

export function dev3() {
    return openai.directory_analyzer
		 .query_gpt4o_with_repository_context(dir, query, ignore, also_ignore) 
}


