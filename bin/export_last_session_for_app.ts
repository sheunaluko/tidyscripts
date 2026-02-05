import * as dev from "./dev/index";

const [app_name, output_file] = process.argv.slice(2);

if (!app_name) {
  console.error("Usage: export_last_session_for_app <app_name> [output_file]");
  console.error("  app_name     - Name of the app (e.g. 'cortex')");
  console.error("  output_file  - Optional output file path (default: auto-generated)");
  process.exit(1);
}

async function main() {
  try {
    const filepath = await dev.reflections.export_last_session_for_app(app_name, output_file);
    console.log(filepath);
    process.exit(0);
  } catch (error: any) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

main();
