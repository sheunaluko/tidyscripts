import * as dev from "./dev/index";
import * as path from "path";

const args = process.argv.slice(2);

// Parse --tag flag
let tag: string | undefined;
const tagIdx = args.indexOf('--tag');
if (tagIdx !== -1) {
  tag = args[tagIdx + 1];
  args.splice(tagIdx, 2);
}

// Parse --last flag
let last = 1;
const lastIdx = args.indexOf('--last');
if (lastIdx !== -1) {
  last = parseInt(args[lastIdx + 1], 10) || 1;
  args.splice(lastIdx, 2);
}

const [app_name, output_file] = args;

if (!app_name) {
  console.error("Usage: export_last_session_for_app <app_name> [output_file] [--tag <tag1,tag2>] [--last <N>]");
  console.error("  app_name     - Name of the app (e.g. 'rai')");
  console.error("  output_file  - Optional output file path (default: auto-generated)");
  console.error("  --tag <tags> - Export sessions with these tags (comma-separated, e.g. 'simi,smoke')");
  console.error("  --last <N>   - Export the N most recent matching sessions (default: 1)");
  process.exit(1);
}

// Split comma-separated tags
const tags: string[] | undefined = tag ? tag.split(',').map(t => t.trim()).filter(Boolean) : undefined;

async function main() {
  try {
    if (tags && tags.length > 0) {
      const result = await dev.reflections.quick_export_by_tag(tags, output_file, app_name, last);
      if (Array.isArray(result)) {
        result.forEach(f => console.log(f));
      } else {
        console.log(result);
      }
    } else if (last > 1) {
      const output_dir = output_file ? path.dirname(output_file) : undefined;
      const filepaths = await dev.reflections.quick_export_latest_sessions(app_name, output_dir, last);
      filepaths.forEach(f => console.log(f));
    } else {
      const filepath = await dev.reflections.export_last_session_for_app(app_name, output_file);
      console.log(filepath);
    }
    process.exit(0);
  } catch (error: any) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

main();
