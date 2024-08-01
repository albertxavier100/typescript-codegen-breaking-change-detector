import { detectBreakingChangesBetweenPackages } from './azure/detect-breaking-changes';
import { devConsolelog } from './utils/common-utils';
import { program } from 'commander';

program
  .requiredOption('--baseline-package-folder <string>', 'baseline package folder')
  .requiredOption('--current-package-folder <string>', 'current package folder')
  .requiredOption('--temp-folder <string>', 'folder to store temp files')
  .requiredOption('--cleanup-at-the-end', 'cleanup temp folder at the end')
  .parse();
const options = program.opts();

async function run() {
  const messages = await detectBreakingChangesBetweenPackages(
    options.baselinePackageFolder,
    options.currentPackageFolder,
    options.tempFolder,
    options.cleanUpAtTheEnd ?? true
  );
  devConsolelog('messages', messages);
}

run();
